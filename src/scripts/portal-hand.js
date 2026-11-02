/* Rotations are offsets from the PNG's gently bent contact pose. They share
 * the entrance's existing, sleeping response loop. */

const clamp = value => Math.max(0, Math.min(1, value));
const smooth = value => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};

export function handPose(progress) {
  const p = clamp(progress);
  const release = (delay, angle) => angle * (1 - smooth((p - delay) / (1 - delay)));
  return {
    wrist: release(0, -2.5),
    'index-root': release(.04, 8),
    'index-middle': release(.14, 20),
    'index-tip': release(.24, 10),
    thumb: release(.18, -1.2),
    middle: release(.12, -1),
    rear: release(.2, -.7)
  };
}

export function createHandRig(portal) {
  const joints = Array.from(portal.querySelectorAll('[data-hand-joint]'));
  const reflection = portal.querySelector('.portal-hand-warm');
  return (progress, illumination = progress) => {
    const pose = handPose(progress);
    for (const joint of joints) {
      const transform = `rotate(${pose[joint.dataset.handJoint].toFixed(3)})`;
      if (joint.getAttribute('transform') !== transform) joint.setAttribute('transform', transform);
    }
    if (reflection) {
      // Share the scene's light strength, including when reduced motion fixes
      // the pose independently. The filter keeps the hand's alpha unchanged;
      // duplicating a translucent edge would mask the light behind the tip.
      const strength = (.65 * smooth(illumination)).toFixed(4);
      if (reflection.getAttribute('slope') !== strength) reflection.setAttribute('slope', strength);
    }
  };
}

export async function loadHandRig(portal) {
  const rig = portal.querySelector('.portal-hand-rig');
  if (!rig) return false;
  const atlas = new Image();
  atlas.decoding = 'async';
  atlas.src = rig.dataset.atlas;
  try {
    await atlas.decode();
    rig.querySelector('#hand-atlas').setAttribute('href', atlas.src);
    portal.classList.add('has-hand-rig');
    return true;
  } catch {
    // The supplied, complete hand stays visible if the optional atlas fails.
    return false;
  }
}
