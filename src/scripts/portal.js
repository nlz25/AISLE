/* The hash is the view state; pointer distance guides the hand and atmosphere. */
import { contactLight, layoutEntrance } from './portal-scene.js?v=__ASSET_VERSION__';

(() => {
  const portal = document.getElementById('entrance');
  const content = document.getElementById('research-content');
  if (!portal || !content) return;
  const enter = portal.querySelector('.portal-enter');
  const globe = portal.querySelector('.portal-globe');
  const heading = document.getElementById('network-title');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = { known: false, x: 0, y: 0 };
  let center, strength = 0, target = 0, frame = 0, lastTime = 0, lastNotified = -1;
  let keyboardFocus = false, pressing = false, transitionTimer, viewTransition;

  function paint(value) {
    strength = value;
    portal.style.setProperty('--proximity', value.toFixed(4));
    portal.style.setProperty('--hand-progress', reduced.matches ? '1' : value.toFixed(4));
    contactLight.value = value;
    if (Math.abs(value - lastNotified) >= .025 || value === target) {
      lastNotified = value;
      document.dispatchEvent(new Event('aisle:proximitychange'));
    }
  }

  function follow(time) {
    frame = 0;
    if (document.hidden || portal.hidden) { lastTime = 0; return; }
    const dt = lastTime ? Math.min(64, time - lastTime) : 16;
    lastTime = time;
    const ease = 1 - Math.exp(-dt / (target > strength ? 80 : 150));
    const next = strength + (target - strength) * ease;
    paint(Math.abs(target - next) < .001 ? target : next);
    if (strength !== target) frame = requestAnimationFrame(follow);
    else lastTime = 0;
  }

  function approach(value, instant = false) {
    target = Math.max(0, Math.min(1, value));
    if (reduced.matches || instant) {
      cancelAnimationFrame(frame);
      frame = lastTime = 0;
      paint(target);
    } else if (!frame && target !== strength) frame = requestAnimationFrame(follow);
  }

  function updateProximity() {
    if (portal.hidden || portal.classList.contains('is-leaving')) return;
    if (keyboardFocus || pressing) { approach(1); return; }
    if (!pointer.known || !center) { approach(0); return; }
    const distance = Math.hypot(pointer.x - center.x, pointer.y - center.y);
    const radius = Math.min(620, Math.max(240, innerWidth * .4));
    const near = Math.max(0, Math.min(1, 1 - (distance - 28) / (radius - 28)));
    approach(near * near * (3 - 2 * near));
  }

  function layout() {
    const geometry = layoutEntrance(portal);
    if (!geometry) return;
    const bounds = globe.getBoundingClientRect();
    center = { x: bounds.left + geometry.contact.x, y: bounds.top + geometry.contact.y };
    updateProximity();
  }

  const resize = new ResizeObserver(layout);
  resize.observe(portal.querySelector('.portal-scene'));
  resize.observe(portal);
  new MutationObserver(layout).observe(globe, {
    attributes: true,
    attributeFilter: ['data-globe-state']
  });
  window.addEventListener('scroll', () => { if (!portal.hidden) layout(); }, { passive: true });
  window.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
    pointer.known = true;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    keyboardFocus = false;
    updateProximity();
  }, { passive: true });
  document.addEventListener('pointerout', event => {
    if (event.relatedTarget || event.pointerType !== 'mouse') return;
    pointer.known = false;
    updateProximity();
  });
  enter.addEventListener('focus', () => {
    keyboardFocus = enter.matches(':focus-visible');
    updateProximity();
  });
  enter.addEventListener('blur', () => {
    keyboardFocus = pressing = false;
    updateProximity();
  });
  enter.addEventListener('pointerdown', event => {
    if (event.button > 0) return;
    pressing = true;
    approach(1);
  });
  window.addEventListener('pointerup', () => { pressing = false; updateProximity(); });
  enter.addEventListener('pointercancel', () => { pressing = false; updateProximity(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = lastTime = 0;
    } else updateProximity();
  });

  const isEntrance = () => !location.hash || ['#entrance', '#main', '#experimental-principle'].includes(location.hash);

  function renderView({ focus = false, animate = false } = {}) {
    clearTimeout(transitionTimer);
    portal.classList.remove('is-leaving', 'has-view-transition');
    const opening = isEntrance();
    portal.hidden = !opening;
    portal.inert = !opening;
    content.hidden = opening;
    content.inert = opening;
    document.body.classList.toggle('portal-open', opening);
    content.classList.toggle('is-arriving', animate && !opening && !reduced.matches);
    document.dispatchEvent(new Event('aisle:viewchange'));
    if (opening) {
      window.scrollTo({ top: 0, behavior: 'instant' });
      layout();
      if (focus) enter.focus({ preventScroll: true });
    } else {
      approach(0, true);
      let id;
      try { id = decodeURIComponent(location.hash.slice(1)); }
      catch { id = 'network'; }
      const destination = document.getElementById(id) || heading;
      if (focus || id !== 'network') destination.scrollIntoView({ block: 'start', behavior: 'instant' });
      if (focus && id === 'network') heading.focus({ preventScroll: true });
    }
  }

  function reveal(animate = true) {
    history.pushState(null, '', '#network');
    renderView({ focus: true, animate });
  }

  enter.addEventListener('click', event => {
    if (event.defaultPrevented || event.button > 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (portal.classList.contains('is-leaving')) return;
    if (reduced.matches) { reveal(); return; }
    approach(1);
    portal.classList.add('is-leaving');
    if (typeof document.startViewTransition === 'function') {
      portal.classList.add('has-view-transition');
      transitionTimer = setTimeout(() => {
        approach(1, true);
        const root = document.documentElement;
        root.classList.add('portal-view-transition');
        try {
          viewTransition = document.startViewTransition(() => reveal(false));
          const cleanup = () => {
            viewTransition = null;
            root.classList.remove('portal-view-transition');
          };
          viewTransition.ready.catch(() => {});
          viewTransition.finished.then(cleanup, cleanup);
        } catch {
          root.classList.remove('portal-view-transition');
          reveal();
        }
      }, 260);
    } else transitionTimer = setTimeout(reveal, 520);
  });
  window.addEventListener('hashchange', () => {
    viewTransition?.skipTransition();
    renderView({ focus: true });
  });
  reduced.addEventListener('change', () => {
    approach(target, true);
    if (!reduced.matches) { updateProximity(); return; }
    viewTransition?.skipTransition();
    if (portal.classList.contains('is-leaving')) reveal(false);
  });
  window.addEventListener('pageshow', event => { if (event.persisted) renderView(); });
  document.body.classList.add('portal-ready');
  paint(0);
  renderView();
})();
