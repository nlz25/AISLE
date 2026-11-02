/* Globe.gl scene, served locally and rendered on a bounded, visibility-aware loop. */
import {
  Globe, AmbientLight, BackSide, DirectionalLight, Mesh, MeshPhongMaterial,
  MeshStandardMaterial, ShaderMaterial, SphereGeometry,
  SRGBColorSpace, Texture, TextureLoader, Vector3
} from '../vendor/globe.gl.js?v=__ASSET_VERSION__';
import { createNightTiles } from './globe-tiles.js?v=__ASSET_VERSION__';
import { createSunriseFlare } from './globe-flare.js?v=__ASSET_VERSION__';
import { contactLight, earthGeometry, layoutEntrance } from './portal-scene.js?v=__ASSET_VERSION__';
import { globeClippingPlanes, globePixelRatio, selectGlobeQuality } from './globe-quality.js?v=__ASSET_VERSION__';

const globe = document.querySelector('.portal-globe');
const host = globe?.querySelector('.portal-globe-view');
const portal = document.getElementById('entrance');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');

if (host && portal) initialize().catch(error => {
  globe.dataset.globeState = 'fallback';
  host.hidden = true;
  console.warn('Using static Earth artwork', error);
});

async function initialize() {
  const loader = new TextureLoader();
  const connection = navigator.connection;
  let quality = selectGlobeQuality({
    width: innerWidth, cores: navigator.hardwareConcurrency, memory: navigator.deviceMemory,
    saveData: connection?.saveData, effectiveType: connection?.effectiveType
  });
  globe.dataset.quality = quality.name;
  // The first complete scene needs only small, global images. Larger surface
  // and cloud detail are optional upgrades after the entrance has been visible.
  let [surface, cloudMap, night, landMask] = await Promise.all([
    loader.loadAsync(`${globe.dataset.texture}?v=__ASSET_VERSION__`),
    loader.loadAsync(`${globe.dataset.detailBase}?v=__ASSET_VERSION__`),
    loader.loadAsync(`${globe.dataset.night}?v=__ASSET_VERSION__`),
    loader.loadAsync(`${globe.dataset.landMask}?v=__ASSET_VERSION__`)
  ]);
  globe.dataset.textureResolution = String(surface.image.width);
  surface.colorSpace = night.colorSpace = SRGBColorSpace;

  let world;
  try {
    world = new Globe(host, {
      animateIn: false, waitForGlobeReady: false,
      rendererConfig: { alpha: true, antialias: quality.name !== 'low', powerPreference: 'low-power' }
    })
      .backgroundColor('rgba(0,0,0,0)')
      .enablePointerInteraction(false)
      .showPointerCursor(false)
      .globeCurvatureResolution(quality.curvature)
      .showAtmosphere(false);
  } catch (error) {
    [surface, cloudMap, night, landMask].forEach(texture => texture.dispose());
    throw error;
  }

  // Stop both library animation loops. Only this scene's loop submits frames.
  world.pauseAnimation();
  const renderer = world.renderer();
  const camera = world.camera();
  // A longer lens keeps the orbital crop without magnifying a tiny patch of terrain.
  camera.fov = 14;
  const controls = world.controls();
  const scene = world.scene();
  const canvas = renderer.domElement;
  canvas.className = 'portal-globe-canvas';
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Interactive Earth. Drag or use arrow keys to rotate. Press Space to pause or resume rotation.');
  controls.enableZoom = controls.enablePan = false;
  controls.enableDamping = false;
  controls.autoRotate = false;
  canvas.style.touchAction = 'pan-y';

  const sunDirection = new Vector3();
  const sunriseDirection = new Vector3();
  const sunriseLocal = new Vector3();
  const viewRay = new Vector3();
  const sun = new DirectionalLight(0xfff4e6, 3.2);
  world.lights([new AmbientLight(0x89a9ce, .025), sun]);
  globe.dataset.lightingModel = 'cinematic';
  const material = new MeshStandardMaterial({
    map: surface, roughnessMap: landMask, roughness: 1, metalness: 0,
    bumpMap: cloudMap, bumpScale: .004,
    emissive: 0xffffff, emissiveMap: night, emissiveIntensity: .85
  });
  const nightTiles = createNightTiles({
    renderer, camera, radius: world.getGlobeRadius(), url: globe.dataset.nightTiles,
    enabled: quality.tiles, maxLevel: quality.name === 'high' ? 3 : 2,
    anisotropy: quality.anisotropy,
    reduced, onChange: requestDraw,
    onStats: stats => {
      globe.dataset.nightTilesResident = String(stats.resident);
      globe.dataset.nightTilesRequests = String(stats.requests);
      globe.dataset.nightTilesBytes = String(stats.bytes);
      globe.dataset.nightTilesPending = String(stats.pending);
    }
  });
  material.customProgramCacheKey = () => `earth-tiles-${nightTiles.enabled}`;
  // Use an illustrative orbital exposure: readable terrain, selective water
  // reflections, a soft dusk transition and a warm contact on the limb.
  let surfaceCompiled = false;
  material.onBeforeCompile = shader => {
    shader.uniforms.uSunDirection = { value: sunDirection };
    shader.uniforms.uSunriseDirection = { value: sunriseDirection };
    shader.uniforms.uContactStrength = contactLight;
    shader.vertexShader = 'varying vec3 vEarthNormal;\nvarying vec3 vEarthPosition;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>',
      '#include <beginnormal_vertex>\nvEarthNormal = mat3(modelMatrix) * objectNormal;\nvEarthPosition = (modelMatrix * vec4(position, 1.0)).xyz;');
    shader.fragmentShader = 'uniform vec3 uSunDirection;\nuniform vec3 uSunriseDirection;\nuniform float uContactStrength;\nvarying vec3 vEarthNormal;\nvarying vec3 vEarthPosition;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', `
      #include <roughnessmap_fragment>
      float earthOcean = 0.0;
      #ifdef USE_ROUGHNESSMAP
        earthOcean = 1.0 - smoothstep(0.15, 0.85, texelRoughness.g);
      #endif
      // Stable sea/land materials at both image resolutions; wind-roughened
      // water keeps a soft reflection rather than a broad metallic sheen.
      roughnessFactor = mix(0.9, 0.5, earthOcean);
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_maps>', `
      #include <normal_fragment_maps>
      normal = normalize(mix(normal, nonPerturbedNormal, earthOcean));
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <lights_physical_fragment>', `
      #include <lights_physical_fragment>
      material.specularColor = mix(vec3(0.04), vec3(0.0204), earthOcean);
      material.specularColorBlended = material.specularColor;
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <lights_fragment_end>', `
      #include <lights_fragment_end>
      // Art-directed reflections belong near the warm contact. Attenuate the
      // off-source lobe instead of clipping it into a flat grey sea-shaped patch.
      float contactReflection = exp((dot(normalize(vEarthNormal), uSunriseDirection) - 1.0) * 80.0);
      reflectedLight.directSpecular *= mix(0.035, 0.06 * (0.12 + 0.88 * contactReflection), earthOcean);
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `
      #include <emissivemap_fragment>
      float sunOrientation = dot(normalize(vEarthNormal), uSunDirection);
      totalEmissiveRadiance *= 1.0 - smoothstep(-0.12, 0.08, sunOrientation);
    `);
    nightTiles.patch(shader);
    shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
      vec3 earthNormal = normalize(vEarthNormal);
      float facing = clamp(dot(earthNormal, normalize(cameraPosition - vEarthPosition)), 0.0, 1.0);
      float scatteredLight = 0.06 + 0.94 * smoothstep(-0.15, 0.55, sunOrientation);
      vec3 horizonTangent = normalize(cross(uSunriseDirection, normalize(cameraPosition)));
      float poolWidth = mix(0.055, 0.12, uContactStrength);
      float alongPool = dot(earthNormal, horizonTangent) / poolWidth;
      float sunrise = exp(-alongPool * alongPool)
        * smoothstep(0.85, 0.98, dot(earthNormal, uSunriseDirection));
      vec3 airglow = mix(vec3(0.025, 0.16, 0.52), vec3(0.16, 0.52, 1.0), scatteredLight);
      // Blue air scatters across a wider part of the limb; the warm contact
      // light stays thin. Both respect the terrain's remaining colour headroom.
      float blueRim = pow(1.0 - facing, 5.0);
      float surfaceRim = pow(1.0 - facing, 12.0);
      vec3 scattering = airglow * blueRim * scatteredLight * 0.7;
      scattering += vec3(1.0, 0.57, 0.23) * sunrise * surfaceRim * (0.2 + uContactStrength * 0.65);
      // The warm reflection remains on the surface. Ocean colour and texture
      // break it up naturally instead of painting a white spot over the terrain.
      float seaDetail = 0.65 + 0.35 * smoothstep(0.015, 0.12, diffuseColor.g);
      scattering += vec3(1.0, 0.76, 0.4) * sunrise * pow(1.0 - facing, 18.0)
        * earthOcean * seaDetail * (0.06 + uContactStrength * 0.24);
      // A restrained twilight fill reveals the terrain through the transition.
      // It follows the albedo, so clouds/coasts retain their own shape and colour.
      float twilightAngle = sunOrientation / 0.14;
      float twilight = exp(-twilightAngle * twilightAngle);
      vec3 twilightColor = mix(vec3(0.025, 0.065, 0.13), vec3(0.2, 0.1, 0.035), sunrise);
      outgoingLight += diffuseColor.rgb * twilightColor * twilight * 0.45;
      vec3 headroom = max(vec3(0.9) - outgoingLight, vec3(0.0));
      outgoingLight += min(scattering, vec3(0.65)) * headroom;
      #include <opaque_fragment>
    `);
    surfaceCompiled = true;
  };
  world.globeMaterial(material);

  const radius = world.getGlobeRadius();
  globe.dataset.nightRenderer = nightTiles.enabled ? 'tiles' : 'base';
  const cloudMaterial = new MeshPhongMaterial({
    color: 0xdceaff, alphaMap: cloudMap, transparent: true,
    opacity: .76, depthWrite: false, shininess: 0,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1
  });
  cloudMaterial.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <alphamap_fragment>',
      'float cloudDensity = texture2D(alphaMap, vAlphaMapUv).b;\ndiffuseColor.a *= smoothstep(0.2, 0.95, cloudDensity);');
  };
  const clouds = new Mesh(new SphereGeometry(radius * 1.002, 192, 96), cloudMaterial);
  clouds.rotation.y = -Math.PI / 2;
  clouds.renderOrder = 2;
  scene.add(clouds);
  // The mesh extends well beyond the visible scattering tail. Its silhouette
  // must never be visible as the edge of a translucent shell.
  const atmosphere = new Mesh(new SphereGeometry(radius * 1.06, quality.atmosphereSegments, quality.atmosphereSegments / 2), new ShaderMaterial({
    side: BackSide, transparent: true, depthWrite: false,
    uniforms: {
      uSunDirection: { value: sunDirection },
      uSunriseDirection: { value: sunriseDirection },
      uContactStrength: contactLight,
      uRadius: { value: radius }
    },
    vertexShader: `varying vec3 vNormalWorld; varying vec3 vPositionWorld;
      void main() {
        vNormalWorld = normalize(mat3(modelMatrix) * normal);
        vPositionWorld = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `uniform vec3 uSunDirection; uniform vec3 uSunriseDirection; uniform float uRadius; uniform float uContactStrength;
      varying vec3 vNormalWorld; varying vec3 vPositionWorld;
      void main() {
        vec3 viewDirection = normalize(cameraPosition - vPositionWorld);
        // Distance of the viewing ray from Earth's centre gives a smooth
        // optical falloff, including with this off-axis, close orbital crop.
        vec3 closest = vPositionWorld - viewDirection * dot(vPositionWorld, viewDirection);
        vec3 horizonNormal = normalize(closest);
        float altitude = max(length(closest) / uRadius - 1.0, 0.0);
        float density = exp(-altitude / 0.0085);
        float outerTail = 1.0 - smoothstep(0.04, 0.06, altitude);
        float lit = 0.08 + 0.92 * smoothstep(-0.25, 0.55, dot(horizonNormal, uSunDirection));
        float sunrise = exp((dot(horizonNormal, uSunriseDirection) - 1.0) * mix(240.0, 95.0, uContactStrength));
        float response = uContactStrength * sunrise;
        vec3 blue = mix(vec3(0.08, 0.28, 0.8), vec3(0.28, 0.66, 1.0), lit);
        float warmth = sunrise * exp(-altitude / 0.006) * (0.5 + uContactStrength * 0.5);
        vec3 color = mix(blue, vec3(1.0, 0.72, 0.38), warmth);
        float horizonLight = sunrise * exp(-altitude / 0.0025) * uContactStrength;
        color = mix(color, vec3(1.0, 0.88, 0.64), horizonLight * 0.7);
        // Bounded optical depth retains colour instead of turning the limb white.
        float opticalDepth = density * (0.45 + lit * 0.9 + sunrise * 0.4 + response * 0.4);
        float opacity = (1.0 - exp(-opticalDepth)) * outerTail;
        gl_FragColor = vec4(color, opacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  }));
  atmosphere.renderOrder = 3;
  scene.add(atmosphere);
  const sunriseFlare = quality.flare ? createSunriseFlare({
    scene, renderer, radius, onChange: requestDraw,
    onState: state => { globe.dataset.lensflareState = state; }
  }) : { update() {} };
  if (!quality.flare) globe.dataset.lensflareState = 'fallback';
  let anisotropy = Math.min(quality.anisotropy, renderer.capabilities.getMaxAnisotropy());
  [surface, cloudMap, night, landMask].forEach(texture => { texture.anisotropy = anisotropy; });

  let ready = false, presented = false, inView = true, paused = false, dragging = false;
  let frame = 0, last = 0, resumeAt = 0, needsDraw = false;
  let detailTimer = 0, detailDone = false, detailRequest;
  let sampleStart = 0, sampleFrames = 0;
  let geometry;
  world.pointOfView({ lat: 14, lng: 175 });
  const visible = () => ready && inView && !portal.hidden && !document.hidden && !renderer.getContext().isContextLost();
  const canAnimate = () => visible() && !reduced.matches && !paused;

  function draw() {
    if (!visible() || !geometry) return;
    // Globe.gl's deferred sky setup can reset far after resize. Keep the
    // actual submitted projection tight, including after context recovery.
    const clipping = globeClippingPlanes(camera.position.length(), radius);
    if (camera.near !== clipping.near || camera.far !== clipping.far) {
      Object.assign(camera, clipping);
      camera.updateProjectionMatrix();
    }
    // Globe.gl's initial bumpImageUrl update clears a custom material's map.
    // Restore our shared terrain/cloud map before the first visible frame so
    // HD loading changes texels, not the shader's feature set.
    if (material.bumpMap !== cloudMap) {
      const missingBump = !material.bumpMap;
      material.bumpMap = cloudMap;
      if (missingBump) material.needsUpdate = true;
    }
    // Lighting stays in the same part of the composition as the camera orbits.
    sunDirection.set(-.8, .4, -.95).normalize().applyQuaternion(camera.quaternion);
    sunriseDirection.copy(sunriseLocal).applyQuaternion(camera.quaternion);
    sun.position.copy(sunDirection).multiplyScalar(1000);
    sunriseFlare.update(sunriseDirection, geometry, quality.flare ? contactLight.value : 0);
    nightTiles.update(performance.now(), sunDirection);
    renderer.render(scene, camera);
    if (!surfaceCompiled) {
      requestDraw();
      return;
    }
    // The host stays hidden through Globe.gl's default frame, shader setup,
    // camera placement and the first complete, correctly cropped render.
    if (!presented) {
      presented = true;
      globe.dataset.globeState = 'ready';
      globe.dataset.globeRenderer = 'globe.gl';
    }
  }

  function requestDraw() {
    if (!visible()) return;
    needsDraw = true;
    if (!frame) frame = requestAnimationFrame(tick);
  }

  function resize() {
    if (portal.hidden) return;
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    const ratio = globePixelRatio(quality, width, height, devicePixelRatio);
    renderer.setPixelRatio(ratio);
    world.width(width).height(height);
    const { radius: projectedRadius, center } = earthGeometry(width, height);
    world.globeOffset([center[0] - width / 2, center[1] - height / 2]);
    // Kapsule batches the setters above. Apply the same projection now so a
    // first frame or a resize cannot expose its default centred blue sphere.
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.setViewOffset(width, height, width / 2 - center[0], height / 2 - center[1], width, height);
    const focalLength = height / (2 * Math.tan(camera.fov * Math.PI / 360));
    const distance = radius * Math.sqrt(1 + (focalLength / projectedRadius) ** 2);
    world.pointOfView({ altitude: distance / radius - 1 });
    Object.assign(camera, globeClippingPlanes(distance, radius));
    camera.updateProjectionMatrix();
    controls.update();
    camera.updateMatrixWorld();
    geometry = { width, height, center, radius: projectedRadius };
    nightTiles.dirty = true;
    const { contact } = layoutEntrance(portal, true);
    viewRay.set(contact.x / width * 2 - 1, 1 - contact.y / height * 2, .5)
      .unproject(camera).sub(camera.position).normalize();
    sunriseDirection.copy(camera.position).addScaledVector(viewRay, -camera.position.dot(viewRay)).normalize();
    sunriseLocal.copy(sunriseDirection).applyQuaternion(camera.quaternion.clone().invert());
    // Kapsule's batched setters flush before the next scene frame.
    requestDraw();
  }

  function tick(now) {
    frame = 0;
    if (!visible()) return;
    const animate = canAnimate();
    const interval = 1000 / (dragging ? quality.dragFps : quality.fps);
    if (!last || now - last >= interval) {
      const dt = last ? Math.min((now - last) / 1000, .1) : 0;
      if (animate && !dragging && now >= resumeAt) {
        const { lat, lng } = world.pointOfView();
        world.pointOfView({ lat, lng: lng + dt * 1.3 });
        controls.update();
        clouds.rotation.y += dt * .0003;
      }
      needsDraw = false;
      draw();
      // Measure sustained delivery, including GPU stalls. Ignore first-frame
      // compilation, visibility changes and manual interaction when sampling.
      if (animate && !dragging && now >= resumeAt && quality.name !== 'low') {
        if (!sampleStart) sampleStart = now;
        sampleFrames++;
        if (now - sampleStart >= 4000) {
          if ((now - sampleStart) / Math.max(1, sampleFrames - 1) > 100) lowerQuality();
          sampleStart = sampleFrames = 0;
        }
      } else sampleStart = sampleFrames = 0;
      last = now;
    }
    if (!frame && (canAnimate() || needsDraw || nightTiles.fading)) frame = requestAnimationFrame(tick);
  }

  function lowerQuality() {
    quality = selectGlobeQuality({ cores: 2 });
    globe.dataset.quality = quality.name;
    clearTimeout(detailTimer);
    detailTimer = 0;
    detailRequest?.abort();
    nightTiles.setEnabled(false);
    globe.dataset.nightRenderer = 'base';
    // Recompile once to remove tile lookups from every subsequent pixel.
    material.needsUpdate = true;
    anisotropy = Math.min(quality.anisotropy, renderer.capabilities.getMaxAnisotropy());
    [surface, cloudMap, night, landMask].forEach(texture => {
      texture.anisotropy = anisotropy;
      texture.needsUpdate = true;
    });
    globe.dataset.lensflareState = 'fallback';
    world.globeCurvatureResolution(quality.curvature);
    atmosphere.geometry.dispose();
    atmosphere.geometry = new SphereGeometry(radius * 1.06, quality.atmosphereSegments, quality.atmosphereSegments / 2);
    resize();
  }

  function syncAnimation() {
    cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
    sampleStart = sampleFrames = 0;
    nightTiles.setActive(visible());
    if (!visible()) {
      clearTimeout(detailTimer);
      detailTimer = 0;
      detailRequest?.abort();
    } else if (quality.detail && !detailDone && !detailTimer && !detailRequest) {
      detailTimer = setTimeout(upgradeDetail, 3000);
    }
    controls.enabled = visible();
    globe.dataset.rotating = String(canAnimate() && !dragging);
    requestDraw();
  }

  controls.addEventListener('change', () => {
    const { lng, lat } = world.pointOfView();
    globe.dataset.longitude = lng.toFixed(1);
    globe.dataset.latitude = lat.toFixed(1);
    nightTiles.dirty = true;
    if (!canAnimate()) requestDraw();
  });
  controls.addEventListener('start', () => {
    dragging = true;
    nightTiles.setMoving(true);
    globe.dataset.rotating = 'false';
  });
  controls.addEventListener('end', () => {
    dragging = false;
    nightTiles.setMoving(false);
    resumeAt = performance.now() + 1800;
    syncAnimation();
  });
  // Ignore drags in the empty space around the cropped globe.
  canvas.addEventListener('pointerdown', event => {
    if (!geometry) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left - geometry.center[0];
    const y = event.clientY - rect.top - geometry.center[1];
    if (Math.hypot(x, y) > geometry.radius + 18) event.stopImmediatePropagation();
  }, { capture: true });
  canvas.addEventListener('keydown', event => {
    const keys = { ArrowLeft: [8, 0], ArrowRight: [-8, 0], ArrowUp: [0, 6], ArrowDown: [0, -6] };
    if (keys[event.key]) {
      event.preventDefault();
      const { lat, lng } = world.pointOfView();
      world.pointOfView({ lng: lng + keys[event.key][0], lat: Math.max(-65, Math.min(65, lat + keys[event.key][1])) });
      controls.update();
      resumeAt = performance.now() + 1800;
      requestDraw();
    } else if (event.code === 'Space') {
      event.preventDefault();
      paused = !paused;
      syncAnimation();
    }
  });

  new ResizeObserver(resize).observe(host);
  new IntersectionObserver(entries => {
    inView = entries[0].isIntersecting;
    syncAnimation();
  }, { threshold: .05 }).observe(globe);
  document.addEventListener('visibilitychange', syncAnimation);
  document.addEventListener('aisle:proximitychange', () => {
    if (!canAnimate()) requestDraw();
  });
  document.addEventListener('aisle:viewchange', () => { resize(); syncAnimation(); });
  reduced.addEventListener('change', syncAnimation);
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    presented = false;
    globe.dataset.globeState = 'fallback';
    syncAnimation();
  });
  canvas.addEventListener('webglcontextrestored', () => {
    nightTiles.invalidate();
    resize();
    syncAnimation();
  });

  async function upgradeDetail() {
    detailTimer = 0;
    if (!visible() || !quality.detail || dragging || detailDone || detailRequest) return;
    const request = detailRequest = new AbortController();
    const load = async (url, colorSpace) => {
      const response = await fetch(url, { signal: request.signal });
      if (!response.ok) throw new Error('Optional Earth detail unavailable');
      const bitmap = await createImageBitmap(await response.blob(), { imageOrientation: 'flipY', premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
      const texture = new Texture(bitmap);
      texture.flipY = false;
      if (colorSpace) texture.colorSpace = colorSpace;
      texture.anisotropy = anisotropy;
      texture.needsUpdate = true;
      return texture;
    };
    const results = await Promise.allSettled([
      load(globe.dataset.textureHd, SRGBColorSpace), load(globe.dataset.detail)
    ]);
    detailRequest = null;
    if (!visible() || !quality.detail || request.signal.aborted || dragging) {
      for (const result of results) if (result.status === 'fulfilled') {
        result.value.dispose(); result.value.image.close();
      }
      if (visible() && quality.detail && !dragging && !detailTimer) detailTimer = setTimeout(upgradeDetail, 3000);
      return;
    }
    detailDone = true;
    if (results[0].status === 'fulfilled') {
      surface.dispose();
      surface = material.map = results[0].value;
      globe.dataset.textureResolution = String(surface.image.width);
    }
    if (results[1].status === 'fulfilled') {
      const detail = results[1].value;
      material.bumpMap = detail;
      cloudMap.dispose();
      cloudMap = cloudMaterial.alphaMap = detail;
    }
    requestDraw();
  }

  await new Promise(resolve => setTimeout(resolve, 0));
  ready = true;
  resize();
  syncAnimation();
}
