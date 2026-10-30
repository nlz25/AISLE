/* A bounded night-imagery cache. Selection runs at 5 Hz; sampling stays in the
   existing globe material, so refinement adds no geometry or draw calls. */
import {
  DataTexture, LinearFilter, LinearMipmapLinearFilter, NearestFilter, RGBAFormat,
  SRGBColorSpace, Texture, UnsignedByteType, Vector2, Vector3
} from '../vendor/globe.gl.js?v=__ASSET_VERSION__';

const TILE = 512, GUTTER = 8, SLOT = TILE + 2 * GUTTER;
const COLUMNS = 4, CAPACITY = 16, ATLAS_SIZE = SLOT * COLUMNS;
const PAGE_WIDTH = 16, PAGE_HEIGHT = 8;

const sampling = `
  uniform sampler2D uNightAtlas, uNightPages;
  uniform float uNightFade[16];
  vec3 sampleNightTiles(vec2 uv) {
    vec2 imageUv = clamp(vec2(fract(uv.x), 1.0 - uv.y), vec2(0.000001), vec2(0.999999));
    vec2 cell = floor(imageUv * vec2(16.0, 8.0));
    vec2 dx = dFdx(vec2(uv.x, -uv.y)), dy = dFdy(vec2(uv.x, -uv.y));
    vec3 result = vec3(0.0);
    float remaining = 1.0;
    for (int level = 3; level >= 1; level--) {
      vec2 pageUv = (cell + vec2(0.5, 0.5 + float(level - 1) * 8.0)) / vec2(16.0, 24.0);
      float entry = texture2D(uNightPages, pageUv).r * 255.0;
      if (entry < 0.5) continue;
      int slot = int(floor(entry + 0.5)) - 1;
      vec2 grid = vec2(exp2(float(level + 1)), exp2(float(level)));
      vec2 footprintX = dx * grid * 512.0, footprintY = dy * grid * 512.0;
      float footprint = max(length(footprintX), length(footprintY));
      float weight = uNightFade[slot] * (1.0 - smoothstep(4.0, 8.0, footprint));
      if (weight < 0.001) continue;
      vec2 local = fract(imageUv * grid);
      vec2 origin = vec2(mod(float(slot), 4.0), floor(float(slot) / 4.0)) * 528.0;
      vec2 atlasUv = (origin + 8.0 + vec2(local.x, 1.0 - local.y) * 512.0) / 2112.0;
      // Explicit derivatives avoid a false mip-level jump at fract()/tile edges.
      vec2 atlasDx = footprintX / 2112.0 * vec2(1.0, -1.0);
      vec2 atlasDy = footprintY / 2112.0 * vec2(1.0, -1.0);
      vec3 color = textureGrad(uNightAtlas, atlasUv, atlasDx, atlasDy).rgb;
      result += remaining * weight * color;
      remaining *= 1.0 - weight;
      if (remaining < 0.001) return result;
    }
    return result + remaining * texture2D(emissiveMap, uv).rgb;
  }
`;

export function createNightTiles(options) {
  return new NightTiles(options);
}

class NightTiles {
  constructor({ renderer, camera, radius, url, reduced, onChange, onStats }) {
    Object.assign(this, { renderer, camera, radius, reduced, onChange, onStats });
    this.url = new URL(url, document.baseURI);
    this.url.searchParams.set('v', '__ASSET_VERSION__');
    const connection = navigator.connection;
    this.enabled = renderer.capabilities.maxTextureSize >= ATLAS_SIZE &&
      typeof createImageBitmap === 'function' && !connection?.saveData &&
      !['slow-2g', '2g'].includes(connection?.effectiveType);
    this.maxLevel = innerWidth > 900 && connection?.effectiveType !== '3g' ? 3 : 2;
    this.placeholder = new DataTexture(new Uint8Array(4), 1, 1);
    this.placeholder.colorSpace = SRGBColorSpace;
    this.placeholder.needsUpdate = true;
    this.pages = new Uint8Array(PAGE_WIDTH * PAGE_HEIGHT * 3 * 4);
    this.pageTexture = new DataTexture(this.pages, PAGE_WIDTH, PAGE_HEIGHT * 3);
    this.pageTexture.minFilter = this.pageTexture.magFilter = NearestFilter;
    this.pageTexture.needsUpdate = true;
    this.fades = new Float32Array(CAPACITY);
    this.uniforms = {
      uNightAtlas: { value: this.placeholder }, uNightPages: { value: this.pageTexture },
      uNightFade: { value: this.fades }
    };
    this.entries = new Map();
    this.pending = new Map();
    this.failed = new Map();
    this.wanted = new Map();
    this.ray = new Vector3();
    this.position = new Vector3();
    this.active = false;
    this.moving = false;
    this.dirty = true;
    this.lastSelection = -Infinity;
    this.stats = { requests: 0, bytes: 0, resident: 0, pending: 0 };
  }

  patch(shader) {
    Object.assign(shader.uniforms, this.uniforms);
    shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_pars_fragment>',
      '#include <emissivemap_pars_fragment>\n' + sampling);
    shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>',
      'totalEmissiveRadiance *= sampleNightTiles(vEmissiveMapUv);');
  }

  setActive(active) {
    if (this.active === active) return;
    this.active = active;
    if (!active) {
      clearTimeout(this.selectionTimer);
      this.selectionTimer = 0;
      this.manifestRequest?.abort();
      for (const request of this.pending.values()) request.abort();
    } else {
      this.dirty = true;
      this.lastSelection = -Infinity;
      this.loadManifest();
    }
  }

  setMoving(moving) {
    this.moving = moving;
    this.dirty = true;
    if (moving) {
      for (const request of this.pending.values()) request.abort();
    } else {
      this.lastSelection = -Infinity;
      this.onChange();
    }
  }

  async loadManifest() {
    if (!this.enabled || !this.active || this.manifest || this.manifestRequest || performance.now() < (this.retryAt || 0)) return;
    const request = this.manifestRequest = new AbortController();
    try {
      const response = await fetch(this.url, { signal: request.signal });
      if (!response.ok) throw new Error('Night tile manifest unavailable');
      const manifest = await response.json();
      if (manifest.tileSize !== TILE || manifest.gutter !== GUTTER || !/^[a-f0-9]{12}$/.test(manifest.version)) throw new Error('Unsupported night tile manifest');
      this.manifest = manifest;
      this.dirty = true;
      this.onChange();
    } catch (error) {
      if (error.name !== 'AbortError') this.retryAt = performance.now() + 30_000;
    } finally {
      this.manifestRequest = null;
    }
  }

  sample(x, y, width, height, sun) {
    const origin = this.camera.position;
    const ray = this.ray.set(x / width * 2 - 1, 1 - y / height * 2, .5).unproject(this.camera).sub(origin).normalize();
    const b = origin.dot(ray);
    const discriminant = b * b - (origin.lengthSq() - this.radius * this.radius);
    if (discriminant <= 0) return null;
    const distance = -b - Math.sqrt(discriminant);
    if (distance <= 0) return null;
    const normal = this.position.copy(ray).multiplyScalar(distance).add(origin).divideScalar(this.radius);
    return {
      u: (Math.atan2(normal.x, normal.z) / (2 * Math.PI) + .5 + 1) % 1,
      v: .5 - Math.asin(Math.max(-1, Math.min(1, normal.y))) / Math.PI,
      day: normal.dot(sun)
    };
  }

  select(sun, now) {
    const width = this.renderer.domElement.clientWidth, height = this.renderer.domElement.clientHeight;
    if (!width || !height) return;
    this.camera.updateMatrixWorld();
    const candidates = new Map();
    const ratio = this.renderer.domElement.width / width;
    const delta = 4;
    const wrap = value => value - Math.round(value);
    const add = (level, u, v) => {
      const columns = 2 ** (level + 1), rows = 2 ** level;
      const x = Math.min(columns - 1, Math.floor(u * columns));
      const y = Math.min(rows - 1, Math.floor(v * rows));
      const key = `${level}/${x}/${y}`;
      const tile = candidates.get(key) || { key, level, x, y, score: 0 };
      tile.score += 1 / level;
      candidates.set(key, tile);
    };
    for (let row = 0; row < 24; row++) for (let col = 0; col < 32; col++) {
      const x = (col + .5) / 32 * width, y = (row + .5) / 24 * height;
      const p = this.sample(x, y, width, height, sun);
      if (!p || p.day > .22) continue;
      const px = this.sample(x + delta, y, width, height, sun);
      const py = this.sample(x, y + delta, width, height, sun);
      let level = 1;
      if (px && py) {
        const a = wrap(px.u - p.u) * 1024 / delta, b = wrap(py.u - p.u) * 1024 / delta;
        const c = (px.v - p.v) * 512 / delta, d = (py.v - p.v) * 512 / delta;
        const trace = a*a + b*b + c*c + d*d, determinant = (a*d - b*c) ** 2;
        const density = Math.sqrt(Math.max(0, (trace - Math.sqrt(Math.max(0, trace*trace - 4*determinant))) / 2));
        level = Math.max(1, Math.min(this.maxLevel, Math.ceil(Math.log2(ratio / Math.max(.02, density)))));
      }
      for (let ancestor = 1; ancestor <= level; ancestor++) add(ancestor, p.u, p.v);
    }
    const desired = [...candidates.values()].sort((a, b) => b.score - a.score || a.level - b.level).slice(0, CAPACITY);
    this.wanted = new Map(desired.map(tile => [tile.key, tile]));
    for (const [key, request] of this.pending) if (!this.wanted.has(key)) request.abort();
    for (const [key, entry] of this.entries) if (this.wanted.has(key)) entry.used = now;
  }

  update(now, sun) {
    this.fading = false;
    for (const entry of this.entries.values()) {
      const fade = this.reduced.matches ? 1 : Math.min(1, (now - entry.added) / 450);
      this.fades[entry.slot] = fade;
      this.fading ||= fade < 1;
    }
    if (!this.active || !this.enabled) return;
    if (!this.manifest) { this.loadManifest(); return; }
    if (this.dirty && now - this.lastSelection >= 200) {
      clearTimeout(this.selectionTimer);
      this.selectionTimer = 0;
      this.select(sun, now);
      this.lastSelection = now;
      this.dirty = false;
    } else if (this.dirty && !this.selectionTimer) {
      this.selectionTimer = setTimeout(() => {
        this.selectionTimer = 0;
        if (this.active) this.onChange();
      }, Math.max(1, 200 - (now - this.lastSelection)));
    }
    this.pump();
  }

  pump() {
    if (!this.active || this.moving || !this.manifest) return;
    for (const tile of this.wanted.values()) {
      if (this.pending.size >= 2) break;
      if (this.entries.has(tile.key) || this.pending.has(tile.key) || (this.failed.get(tile.key) || 0) > performance.now()) continue;
      this.load(tile);
    }
  }

  allocateAtlas() {
    if (this.atlas) return;
    this.atlas = new DataTexture(new Uint8Array(ATLAS_SIZE * ATLAS_SIZE * 4), ATLAS_SIZE, ATLAS_SIZE, RGBAFormat, UnsignedByteType);
    this.atlas.colorSpace = SRGBColorSpace;
    this.atlas.minFilter = LinearMipmapLinearFilter;
    this.atlas.magFilter = LinearFilter;
    this.atlas.generateMipmaps = true;
    this.atlas.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    this.atlas.needsUpdate = true;
    this.renderer.initTexture(this.atlas);
    this.uniforms.uNightAtlas.value = this.atlas;
  }

  async load(tile) {
    const request = new AbortController();
    this.pending.set(tile.key, request);
    this.stats.requests++;
    this.stats.pending = this.pending.size;
    this.onStats(this.stats);
    let bitmap;
    try {
      const url = new URL(`${this.manifest.version}/${tile.key}.webp`, this.url);
      const response = await fetch(url, { signal: request.signal, cache: 'force-cache' });
      if (!response.ok) throw new Error('Night tile unavailable');
      const blob = await response.blob();
      this.stats.bytes += blob.size;
      bitmap = await createImageBitmap(blob, { imageOrientation: 'flipY', premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
      if (request.signal.aborted || !this.active || this.moving || !this.wanted.has(tile.key)) return;
      if (bitmap.width !== SLOT || bitmap.height !== SLOT) throw new Error('Invalid night tile dimensions');
      let slot;
      if (this.entries.size < CAPACITY) {
        const used = new Set([...this.entries.values()].map(entry => entry.slot));
        slot = Array.from({ length: CAPACITY }, (_, i) => i).find(i => !used.has(i));
      } else {
        const old = [...this.entries.values()].filter(entry => !this.wanted.has(entry.key)).sort((a, b) => a.used - b.used)[0];
        if (!old) return;
        slot = old.slot;
        this.entries.delete(old.key);
      }
      this.allocateAtlas();
      const source = new Texture(bitmap);
      source.flipY = false; // ImageBitmap was explicitly flipped before upload.
      this.renderer.copyTextureToTexture(source, this.atlas, null, new Vector2(slot % COLUMNS * SLOT, Math.floor(slot / COLUMNS) * SLOT));
      source.dispose();
      this.entries.set(tile.key, { ...tile, slot, used: performance.now(), added: performance.now() });
      this.fades[slot] = 0;
      this.rebuildPages();
      this.onChange();
    } catch (error) {
      if (error.name !== 'AbortError') this.failed.set(tile.key, performance.now() + 30_000);
    } finally {
      bitmap?.close();
      this.pending.delete(tile.key);
      this.stats.pending = this.pending.size;
      this.stats.resident = this.entries.size;
      this.onStats(this.stats);
      this.pump();
    }
  }

  rebuildPages() {
    this.pages.fill(0);
    for (const entry of this.entries.values()) {
      const step = 2 ** (3 - entry.level);
      for (let y = entry.y * step; y < (entry.y + 1) * step; y++) for (let x = entry.x * step; x < (entry.x + 1) * step; x++) {
        this.pages[((entry.level - 1) * PAGE_HEIGHT * PAGE_WIDTH + y * PAGE_WIDTH + x) * 4] = entry.slot + 1;
      }
    }
    this.pageTexture.needsUpdate = true;
  }

  invalidate() {
    for (const request of this.pending.values()) request.abort();
    this.entries.clear();
    this.wanted.clear();
    this.failed.clear();
    this.pages.fill(0);
    this.fades.fill(0);
    this.pageTexture.needsUpdate = true;
    this.atlas?.dispose();
    this.atlas = null;
    this.uniforms.uNightAtlas.value = this.placeholder;
    this.dirty = true;
    this.lastSelection = -Infinity;
    this.stats.resident = 0;
    this.onStats(this.stats);
  }
}
