/* One geometry model joins the hand, atmospheric contact and sunrise. */
// Shared directly with the Earth materials; no additional render loop is needed.
export const contactLight = { value: 0 };

export function earthGeometry(width, height, poster = false) {
  const mobile = width <= 500;
  if (poster) {
    const reference = mobile ? [390, 773] : [1440, 821];
    const scale = Math.max(width / reference[0], height / reference[1]);
    return {
      width, height,
      radius: reference[0] * (mobile ? 1.1 : .69) * scale,
      center: [
        reference[0] * (mobile ? 1.58 : 1.2) * scale + (width - reference[0] * scale) / 2,
        reference[1] * (mobile ? .92 : 1.18) * scale + (height - reference[1] * scale) / 2
      ]
    };
  }
  return {
    width, height,
    radius: width * (mobile ? 1.1 : .69),
    center: [width * (mobile ? 1.58 : 1.2), height * (mobile ? .92 : 1.18)]
  };
}

export function layoutEntrance(portal, live = false) {
  const globe = portal.querySelector('.portal-globe');
  const scene = portal.querySelector('.portal-scene');
  const bounds = globe.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;
  const stage = scene.getBoundingClientRect();
  const poster = !live && ['fallback', 'static'].includes(globe.dataset.globeState);
  const geometry = earthGeometry(bounds.width, bounds.height, poster);
  const y = stage.top - bounds.top + stage.height / 2;
  const dy = Math.max(-geometry.radius * .96, Math.min(geometry.radius * .96, y - geometry.center[1]));
  const x = geometry.center[0] - Math.sqrt(geometry.radius ** 2 - dy ** 2);
  const angle = Math.atan2(dy, x - geometry.center[0]) * 180 / Math.PI + 180;
  scene.style.setProperty('--enter-x', `${x}px`);
  scene.style.setProperty('--touch-x', `${x}px`);
  // The supplied hand's fingertip is at 94.38% of its source width.
  scene.style.setProperty('--arm-width', `${(x + 10) / .9438}px`);
  scene.style.setProperty('--contact-angle', `${angle}deg`);
  return { ...geometry, contact: { x, y, angle } };
}
