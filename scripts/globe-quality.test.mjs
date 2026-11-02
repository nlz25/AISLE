import assert from 'node:assert/strict';
import test from 'node:test';
import { globeClippingPlanes, globePixelRatio, selectGlobeQuality } from '../src/scripts/globe-quality.js';
import { earthGeometry } from '../src/scripts/portal-scene.js';

test('limited hardware uses a bounded live scene without optional GPU features', () => {
  for (const hints of [{ cores: 2 }, { memory: 4 }, { saveData: true }, { effectiveType: '2g' }]) {
    const quality = selectGlobeQuality({ width: 1440, ...hints });
    assert.equal(quality.name, 'low');
    assert.equal(quality.detail || quality.tiles || quality.flare, false);
    assert.ok(quality.fps <= 15);
  }
});

test('mobile and 3G keep lighter budgets when hardware hints are unavailable', () => {
  for (const hints of [{ width: 390 }, { width: 820 }, { width: 1440, effectiveType: '3g' }]) {
    const quality = selectGlobeQuality(hints);
    assert.equal(quality.name, 'balanced');
    assert.equal(quality.detail, false);
  }
  assert.equal(selectGlobeQuality({ width: 1440, cores: 8, memory: 8 }).name, 'high');
});

test('retina, tablet and ultrawide viewports stay within each pixel budget', () => {
  for (const hints of [{ width: 390 }, { width: 1440 }, { width: 1440, cores: 2 }]) {
    const quality = selectGlobeQuality(hints);
    for (const [width, height] of [[390, 844], [820, 1180], [1440, 900], [5120, 2160]]) {
      for (const dpr of [1, 2, 3]) {
        const ratio = globePixelRatio(quality, width, height, dpr);
        assert.ok(ratio <= dpr && ratio <= quality.dpr);
        assert.ok(width * height * ratio ** 2 <= quality.pixels + 1e-6);
      }
    }
  }
});

test('surface and clouds remain distinct even with a 16-bit depth buffer', () => {
  const radius = 100;
  for (const [width, height] of [[390, 773], [500, 1000], [820, 1180], [1440, 821], [2560, 1080]]) {
    const projected = earthGeometry(width, height).radius;
    const focal = height / (2 * Math.tan(14 * Math.PI / 360));
    const distance = radius * Math.sqrt(1 + (focal / projected) ** 2);
    const { near, far } = globeClippingPlanes(distance, radius);
    assert.ok(near < distance - radius * 1.06, 'Atmosphere must not be clipped');
    assert.ok(far > distance + radius * 1.06, 'Far shell must not be clipped');
    const depth = z => far / (far - near) - far * near / ((far - near) * z);
    // Sample front-facing points, including the approach to the horizon.
    for (const cosine of [1, .5, 0]) {
      const surface = depth(distance - radius * cosine);
      const cloud = depth(distance - Math.sqrt((radius * 1.002) ** 2 - radius ** 2 * (1 - cosine ** 2)));
      assert.ok((surface - cloud) * 65535 > 16, `Insufficient cloud separation at ${width}x${height}`);
    }
  }
});
