/* Globe.gl scene, served locally and rendered on a bounded, visibility-aware loop. */
import {
  Globe, AmbientLight, BackSide, DirectionalLight, Mesh, MeshPhongMaterial,
  MeshStandardMaterial, ShaderMaterial, SphereGeometry,
  SRGBColorSpace, Texture, TextureLoader, Vector3
} from '../vendor/globe.gl.js?v=__ASSET_VERSION__';
import { createNightTiles } from './globe-tiles.js?v=__ASSET_VERSION__';

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
  const useHD = innerWidth > 900 && (!connection?.effectiveType || connection.effectiveType === '4g');
  // The first complete scene needs only small, global images. Larger surface
  // and cloud detail are optional upgrades after the entrance has been visible.
  let [surface, cloudMap, night] = await Promise.all([
    loader.loadAsync(globe.dataset.texture), loader.loadAsync(globe.dataset.clouds),
    loader.loadAsync(`${globe.dataset.night}?v=__ASSET_VERSION__`)
  ]);
  globe.dataset.textureResolution = String(surface.image.width);
  surface.colorSpace = night.colorSpace = SRGBColorSpace;

  let world;
  try {
    world = new Globe(host, {
      animateIn: false, waitForGlobeReady: false,
      rendererConfig: { alpha: true, antialias: true, powerPreference: 'low-power' }
    })
      .backgroundColor('rgba(0,0,0,0)')
      .enablePointerInteraction(false)
      .showPointerCursor(false)
      .globeCurvatureResolution(1)
      .showAtmosphere(false);
  } catch (error) {
    [surface, cloudMap, night].forEach(texture => texture.dispose());
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
  world.lights([new AmbientLight(0x7395bb, .025), sun]);
  const material = new MeshStandardMaterial({
    map: surface, roughness: .85, metalness: 0,
    bumpScale: .004,
    emissive: 0xffffff, emissiveMap: night, emissiveIntensity: .85
  });
  const nightTiles = createNightTiles({
    renderer, camera, radius: world.getGlobeRadius(), url: globe.dataset.nightTiles,
    reduced, onChange: requestDraw,
    onStats: stats => {
      globe.dataset.nightTilesResident = String(stats.resident);
      globe.dataset.nightTilesRequests = String(stats.requests);
      globe.dataset.nightTilesBytes = String(stats.bytes);
      globe.dataset.nightTilesPending = String(stats.pending);
    }
  });
  // Extend the standard PBR material with night-side emission and atmospheric
  // limb scattering, following the lighting model in Three.js's Earth example.
  let surfaceCompiled = false;
  material.onBeforeCompile = shader => {
    shader.uniforms.uSunDirection = { value: sunDirection };
    shader.uniforms.uSunriseDirection = { value: sunriseDirection };
    shader.vertexShader = 'varying vec3 vEarthNormal;\nvarying vec3 vEarthPosition;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>',
      '#include <beginnormal_vertex>\nvEarthNormal = mat3(modelMatrix) * objectNormal;\nvEarthPosition = (modelMatrix * vec4(position, 1.0)).xyz;');
    shader.fragmentShader = 'uniform vec3 uSunDirection;\nuniform vec3 uSunriseDirection;\nvarying vec3 vEarthNormal;\nvarying vec3 vEarthPosition;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>',
      '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor, 0.42, 0.9);');
    shader.fragmentShader = shader.fragmentShader.replace('#include <lights_fragment_end>',
      '#include <lights_fragment_end>\nreflectedLight.directSpecular *= 0.16;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `
      #include <emissivemap_fragment>
      float sunOrientation = dot(normalize(vEarthNormal), uSunDirection);
      totalEmissiveRadiance *= 1.0 - smoothstep(-0.2, 0.18, sunOrientation);
    `);
    nightTiles.patch(shader);
    shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
      float facing = max(0.0, dot(normalize(vEarthNormal), normalize(cameraPosition - vEarthPosition)));
      float limb = pow(1.0 - facing, 5.0);
      float scatteredLight = 0.16 + 0.84 * smoothstep(-0.45, 0.65, sunOrientation);
      float sunrise = exp((dot(normalize(vEarthNormal), uSunriseDirection) - 1.0) * 95.0);
      vec3 airglow = mix(vec3(0.025, 0.16, 0.52), vec3(0.16, 0.52, 1.0), scatteredLight);
      outgoingLight += airglow * limb * scatteredLight * 0.7;
      outgoingLight += vec3(1.0, 0.54, 0.19) * sunrise * pow(1.0 - facing, 7.0) * 1.2;
      #include <opaque_fragment>
    `);
    surfaceCompiled = true;
  };
  world.globeMaterial(material);

  const radius = world.getGlobeRadius();
  globe.dataset.nightRenderer = 'tiles';
  const cloudPacked = { value: 0 };
  const cloudMaterial = new MeshPhongMaterial({
    color: 0xdceaff, alphaMap: cloudMap, transparent: true,
    opacity: .82, depthWrite: false, shininess: 0
  });
  cloudMaterial.onBeforeCompile = shader => {
    shader.uniforms.uCloudPacked = cloudPacked;
    shader.fragmentShader = 'uniform float uCloudPacked;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <alphamap_fragment>',
      'vec4 cloudSample = texture2D(alphaMap, vAlphaMapUv);\ndiffuseColor.a *= mix(cloudSample.g, smoothstep(0.2, 0.95, cloudSample.b), uCloudPacked);');
  };
  const clouds = new Mesh(new SphereGeometry(radius * 1.002, 192, 96), cloudMaterial);
  clouds.rotation.y = -Math.PI / 2;
  clouds.renderOrder = 2;
  scene.add(clouds);
  const atmosphere = new Mesh(new SphereGeometry(radius * 1.028, 192, 96), new ShaderMaterial({
    side: BackSide, transparent: true, depthWrite: false,
    uniforms: {
      uSunDirection: { value: sunDirection },
      uSunriseDirection: { value: sunriseDirection },
      uRadius: { value: radius }
    },
    vertexShader: `varying vec3 vNormalWorld; varying vec3 vPositionWorld;
      void main() {
        vNormalWorld = normalize(mat3(modelMatrix) * normal);
        vPositionWorld = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `uniform vec3 uSunDirection; uniform vec3 uSunriseDirection; uniform float uRadius;
      varying vec3 vNormalWorld; varying vec3 vPositionWorld;
      void main() {
        vec3 viewDirection = normalize(cameraPosition - vPositionWorld);
        // Distance of the viewing ray from Earth's centre gives a smooth
        // optical falloff, including with this off-axis, close orbital crop.
        vec3 closest = vPositionWorld - viewDirection * dot(vPositionWorld, viewDirection);
        vec3 horizonNormal = normalize(closest);
        float height = clamp((length(closest) / uRadius - 1.0) / 0.028, 0.0, 1.0);
        float density = exp(-height * 4.5) * (1.0 - smoothstep(0.65, 1.0, height));
        float lit = 0.18 + 0.82 * smoothstep(-0.45, 0.65, dot(horizonNormal, uSunDirection));
        float sunrise = exp((dot(horizonNormal, uSunriseDirection) - 1.0) * 95.0);
        vec3 blue = mix(vec3(0.08, 0.28, 0.8), vec3(0.28, 0.66, 1.0), lit);
        vec3 color = mix(blue, vec3(1.0, 0.68, 0.32), sunrise * exp(-height * 2.0));
        gl_FragColor = vec4(color, density * min(0.9, lit * 0.82 + sunrise * 0.2));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`
  }));
  atmosphere.renderOrder = 3;
  scene.add(atmosphere);
  const anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());
  [surface, cloudMap, night].forEach(texture => { texture.anisotropy = anisotropy; });

  let ready = false, presented = false, inView = true, paused = false, dragging = false;
  let frame = 0, last = 0, inputFrame = 0, resumeAt = 0;
  let fadeTimer = 0, detailTimer = 0, detailDone = false, detailRequest;
  let geometry;
  world.pointOfView({ lat: 14, lng: 175 });
  const visible = () => ready && inView && !portal.hidden && !document.hidden && !renderer.getContext().isContextLost();
  const canAnimate = () => visible() && !reduced.matches && !paused;

  function draw() {
    if (!visible() || !geometry) return;
    // Lighting stays in the same part of the composition as the camera orbits.
    sunDirection.set(-.8, .4, -.95).normalize().applyQuaternion(camera.quaternion);
    sunriseDirection.copy(sunriseLocal).applyQuaternion(camera.quaternion);
    sun.position.copy(sunDirection).multiplyScalar(1000);
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
    clearTimeout(fadeTimer);
    if (nightTiles.fading && !canAnimate()) fadeTimer = setTimeout(requestDraw, 50);
  }

  function requestDraw() {
    if (inputFrame || !visible()) return;
    inputFrame = requestAnimationFrame(() => { inputFrame = 0; draw(); });
  }

  function resize() {
    if (portal.hidden) return;
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    const mobile = width <= 500;
    // Native resolution on ordinary screens, with a pixel budget on large/retina displays.
    const ratio = Math.min(devicePixelRatio || 1, mobile ? 1.5 : 2, Math.sqrt(4_500_000 / (width * height)));
    renderer.setPixelRatio(ratio);
    world.width(width).height(height);
    const projectedRadius = width * (mobile ? 1.1 : .69);
    const center = [width * (mobile ? 1.58 : 1.2), height * (mobile ? .92 : 1.18)];
    world.globeOffset([center[0] - width / 2, center[1] - height / 2]);
    // Kapsule batches the setters above. Apply the same projection now so a
    // first frame or a resize cannot expose its default centred blue sphere.
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.setViewOffset(width, height, width / 2 - center[0], height / 2 - center[1], width, height);
    const focalLength = height / (2 * Math.tan(camera.fov * Math.PI / 360));
    const distance = radius * Math.sqrt(1 + (focalLength / projectedRadius) ** 2);
    world.pointOfView({ altitude: distance / radius - 1 });
    camera.updateProjectionMatrix();
    controls.update();
    camera.updateMatrixWorld();
    geometry = { width, height, center, radius: projectedRadius };
    nightTiles.dirty = true;
    const enter = portal.querySelector('.portal-enter').getBoundingClientRect();
    const sunY = Math.max(height * .36, enter.top + enter.height / 2 - host.getBoundingClientRect().top - Math.min(92, width * .065));
    const dy = Math.max(-projectedRadius * .96, Math.min(projectedRadius * .96, sunY - center[1]));
    const sunX = center[0] - Math.sqrt(projectedRadius ** 2 - dy ** 2);
    globe.style.setProperty('--sun-x', `${sunX}px`);
    globe.style.setProperty('--sun-y', `${center[1] + dy}px`);
    globe.style.setProperty('--sun-angle', `${Math.atan2(dy, sunX - center[0]) * 180 / Math.PI + 90}deg`);
    viewRay.set(sunX / width * 2 - 1, 1 - (center[1] + dy) / height * 2, .5)
      .unproject(camera).sub(camera.position).normalize();
    sunriseDirection.copy(camera.position).addScaledVector(viewRay, -camera.position.dot(viewRay)).normalize();
    sunriseLocal.copy(sunriseDirection).applyQuaternion(camera.quaternion.clone().invert());
    // Kapsule applies size changes asynchronously; draw after its update has flushed.
    requestAnimationFrame(() => { if (ready) draw(); });
  }

  function tick(now) {
    frame = 0;
    if (!canAnimate()) return;
    if (now - last >= 1000 / (dragging ? 30 : 20)) {
      const dt = last ? Math.min((now - last) / 1000, .1) : 0;
      if (!dragging && now >= resumeAt) {
        const { lat, lng } = world.pointOfView();
        world.pointOfView({ lat, lng: lng + dt * 1.3 });
        controls.update();
        clouds.rotation.y += dt * .0003;
      }
      draw();
      last = now;
    }
    frame = requestAnimationFrame(tick);
  }

  function syncAnimation() {
    cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
    clearTimeout(fadeTimer);
    nightTiles.setActive(visible());
    if (!visible()) {
      clearTimeout(detailTimer);
      detailTimer = 0;
      detailRequest?.abort();
    } else if (useHD && !detailDone && !detailTimer && !detailRequest) {
      detailTimer = setTimeout(upgradeDetail, 3000);
    }
    controls.enabled = visible();
    globe.dataset.rotating = String(canAnimate() && !dragging);
    if (canAnimate()) frame = requestAnimationFrame(tick);
    else requestDraw();
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
    if (!visible() || dragging || detailDone || detailRequest) return;
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
    if (!visible() || request.signal.aborted || dragging) {
      for (const result of results) if (result.status === 'fulfilled') {
        result.value.dispose(); result.value.image.close();
      }
      if (visible() && !dragging && !detailTimer) detailTimer = setTimeout(upgradeDetail, 3000);
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
      material.bumpMap = material.roughnessMap = detail;
      material.needsUpdate = true;
      cloudMap.dispose();
      cloudMap = cloudMaterial.alphaMap = detail;
      cloudPacked.value = 1;
    }
    requestDraw();
  }

  await new Promise(resolve => setTimeout(resolve, 0));
  ready = true;
  resize();
  await new Promise(requestAnimationFrame);
  draw();
  syncAnimation();
}
