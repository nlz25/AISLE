/* Conservative startup budgets; sustained slow frames can lower them further. */
const profiles = {
  high: { name: 'high', pixels: 3_000_000, dpr: 1.75, fps: 20, dragFps: 30, curvature: 1, atmosphereSegments: 96, anisotropy: 8, detail: true, tiles: true, flare: true },
  balanced: { name: 'balanced', pixels: 1_200_000, dpr: 1.25, fps: 20, dragFps: 30, curvature: 1.5, atmosphereSegments: 96, anisotropy: 4, detail: false, tiles: true, flare: true },
  low: { name: 'low', pixels: 750_000, dpr: 1, fps: 15, dragFps: 24, curvature: 2, atmosphereSegments: 64, anisotropy: 2, detail: false, tiles: false, flare: false }
};

export function selectGlobeQuality({ width, cores, memory, saveData, effectiveType }) {
  if (saveData || (cores > 0 && cores <= 4) || (memory > 0 && memory <= 4) ||
      ['slow-2g', '2g'].includes(effectiveType)) return profiles.low;
  return width <= 900 || effectiveType === '3g' ? profiles.balanced : profiles.high;
}

export function globePixelRatio(quality, width, height, dpr) {
  return Math.min(dpr || 1, quality.dpr, Math.sqrt(quality.pixels / (width * height)));
}

export function globeClippingPlanes(distance, radius) {
  // Include the atmosphere and optical sprites, with room outside both shells.
  // A tiny default near plane wastes virtually all depth precision at Earth.
  const extent = radius * 1.1;
  return { near: Math.max(radius * .01, distance - extent), far: distance + extent };
}
