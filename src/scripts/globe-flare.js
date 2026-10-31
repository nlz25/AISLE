/* Three.js's official optical sprites share the globe's render loop. */
import {
  CanvasTexture, Color, Lensflare, LensflareElement, TextureLoader
} from '../vendor/globe.gl.js?v=__ASSET_VERSION__';

// The example textures have black RGB backgrounds. Recover their additive
// colour as RGB * alpha so they also composite onto our transparent canvas.
function transparentTexture(source) {
  const canvas = document.createElement('canvas');
  canvas.width = source.image.width;
  canvas.height = source.image.height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(source.image, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < pixels.data.length; i += 4) {
    const peak = Math.max(pixels.data[i], pixels.data[i + 1], pixels.data[i + 2]);
    if (peak) for (let channel = 0; channel < 3; channel++) {
      pixels.data[i + channel] = Math.round(pixels.data[i + channel] * 255 / peak);
    }
    pixels.data[i + 3] = peak;
  }
  context.putImageData(pixels, 0, 0);
  return new CanvasTexture(canvas);
}

export function createSunriseFlare({ scene, renderer, radius, onChange, onState }) {
  const flare = new Lensflare();
  flare.material.depthWrite = false;
  flare.visible = false;
  scene.add(flare);
  let ready = false;
  const elements = [];
  onState('loading');

  const loader = new TextureLoader();
  Promise.allSettled(['glare', 'ghost'].map(name => loader.loadAsync(
    new URL(`../globe/lensflare-${name}.png?v=__ASSET_VERSION__`, import.meta.url).href
  ))).then(results => {
    const sources = results.filter(result => result.status === 'fulfilled').map(result => result.value);
    const maps = [];
    try {
      if (sources.length !== 2) throw new Error('Optional lens textures unavailable');
      for (const source of sources) maps.push(transparentTexture(source));
      // Size, position along the optical axis, tint and relative energy.
      const optics = [
        [0, 210, 0, [1, .96, .86], .85],
        [1, 160, .32, [.64, .86, 1], 1.15],
        [1, 76, .62, [1, .76, .46], .9],
        [1, 230, .88, [.58, .8, .65], .48]
      ];
      for (const [map, size, distance, rgb, energy] of optics) {
        const tint = new Color().setRGB(...rgb);
        const element = new LensflareElement(maps[map], size, distance, tint.clone());
        flare.addElement(element);
        elements.push({ element, tint, size, energy });
      }
      ready = true;
      onState('ready');
      onChange();
    } catch {
      maps.forEach(texture => texture.dispose());
      onState('fallback');
    } finally {
      sources.forEach(texture => texture.dispose());
    }
  });

  return {
    update(direction, geometry, strength) {
      // Idle frames retain the three Earth draws. Only a lit source submits
      // the addon's small occlusion probe and four optical sprite draws.
      flare.visible = ready && strength > .01;
      if (!flare.visible) return;
      // Four projected pixels above the limb keeps the source within the
      // shallow sunrise cap, and lets Earth's depth buffer occlude its base.
      flare.position.copy(direction).multiplyScalar(radius * (1 + 4 / geometry.radius));
      const scale = Math.max(.6, Math.min(1, geometry.width / 1100));
      const pixels = scale * renderer.getPixelRatio() * (.85 + strength * .15);
      for (const { element, tint, size, energy } of elements) {
        element.size = size * pixels;
        element.color.copy(tint).multiplyScalar(strength * strength * energy);
      }
    }
  };
}
