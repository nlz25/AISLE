/* Location groups expose research directions and films on the map. */
(() => {
  const source = document.getElementById('network-data');
  if (!source) return;
  const network = JSON.parse(source.textContent);
  const asset = path => 'assets/' + path;
  const countries = new Map(network.countries.map(c => [c.id, c]));
  const institutions = new Map(network.institutions.map(i => [i.id, i]));
  const inspector = document.getElementById('network-inspector');
  const plane = inspector.closest('.network-map-plane');
  const stage = plane.closest('.network-stage');
  const cardLink = plane.querySelector('.network-card-link path');
  const selectionStatus = plane.querySelector('.network-selection');
  const options = inspector.querySelector('.research-options');
  const film = document.getElementById('network-film');
  const pending = document.getElementById('network-pending');
  const preview = film.querySelector('.film-preview');
  const filmOpen = film.querySelector('.film-open');
  const dialog = document.querySelector('.experiment-dialog');
  const video = document.getElementById('experiment-video');
  const error = document.getElementById('experiment-error');
  let selected = network.institutions.find(item => item.country === 'asia' && item.video) || network.institutions[0],
    opener = null,
    placementFrame = 0,
    revealSelection = false;

  function placeInspector() {
    placementFrame = 0;
    const bounds = plane.getBoundingClientRect();
    const selectedPin = plane.querySelector('.map-pin[aria-pressed="true"]');
    if (!bounds.width || !selectedPin || inspector.hidden) return;
    const width = inspector.offsetWidth, height = inspector.offsetHeight;
    const localBox = node => {
      const rect = node.getBoundingClientRect();
      return { left: rect.left - bounds.left, top: rect.top - bounds.top, right: rect.right - bounds.left, bottom: rect.bottom - bounds.top };
    };
    const pin = localBox(selectedPin);
    const labelNode = selectedPin.querySelector('.pin-label');
    const label = labelNode?.getClientRects().length ? localBox(labelNode) : pin;
    const point = { x: (pin.left + pin.right) / 2, y: (pin.top + pin.bottom) / 2 };
    const obstacles = [...plane.querySelectorAll('.map-pin, .pin-label')].filter(node => node.getClientRects().length).map(node => {
      const rect = localBox(node);
      const padding = node.classList.contains('map-pin') ? 8 : 6;
      return { left: rect.left - padding, right: rect.right + padding, top: rect.top - padding, bottom: rect.bottom + padding };
    });
    const margin = 12, gap = 44;
    const clamp = (value, min, max) => Math.max(min, Math.min(value, max));
    const leftGap = label.right <= point.x ? Math.max(gap, point.x - label.left + 12) : gap;
    const rightGap = label.left >= point.x ? Math.max(gap, label.right - point.x + 12) : gap;
    const preferRight = ['asia', 'oceania'].includes(selectedPin.dataset.country);
    const candidates = [];
    const add = (x, y) => candidates.push({ x: clamp(x, margin, bounds.width - width - margin), y: Math.max(margin, y) });
    const xs = [point.x - width / 2, point.x - width + 20, point.x - 20, margin, bounds.width - width - margin];
    for (const x of xs) {
      add(x, point.y + gap);
      add(x, point.y + gap + 24);
      add(x, point.y - height - gap);
    }
    for (const y of [point.y - height / 2, point.y - height + 36, point.y + gap, point.y + gap + 24, bounds.height - height - margin, margin]) {
      add(point.x - leftGap - width, y);
      add(point.x + rightGap, y);
    }
    // Try the free space immediately beside neighbouring markers before
    // sending a card to a distant edge or below the entire map.
    for (const obstacle of obstacles) {
      for (const x of [obstacle.left - width - margin, obstacle.right + margin]) {
        for (const y of [point.y - height / 2, point.y - height + 36, point.y + gap]) add(x, y);
      }
    }
    // Small screens may need space below the geography. Always offer a
    // collision-free position and reserve that space without stretching it.
    const belowAllPins = Math.max(...obstacles.map(rect => rect.bottom)) + 16;
    for (const x of xs) add(x, belowAllPins);
    const score = ({ x, y }) => {
      const collisions = obstacles.reduce((sum, rect) => sum +
        Math.max(0, Math.min(x + width, rect.right) - Math.max(x, rect.left)) *
        Math.max(0, Math.min(y + height, rect.bottom) - Math.max(y, rect.top)), 0);
      const dx = Math.max(x - point.x, point.x - x - width, 0);
      const dy = Math.max(y - point.y, point.y - y - height, 0);
      const distance = Math.hypot(dx, dy);
      return collisions * 10000 + Math.max(0, y + height - bounds.height) * (preferRight ? 8 : 2) +
        distance + Math.max(0, gap - distance) * 20 + y * .002 +
        (preferRight ? Math.max(0, bounds.width - margin - x - width) * .15 : 0);
    };
    const position = candidates.reduce((best, candidate) => score(candidate) < score(best) ? candidate : best);
    inspector.style.setProperty('--inspector-x', `${position.x.toFixed(1)}px`);
    inspector.style.setProperty('--inspector-y', `${position.y.toFixed(1)}px`);
    stage.style.setProperty('--card-overflow', `${Math.ceil(Math.max(0, position.y + height - bounds.height))}px`);

    const anchor = {
      x: clamp(point.x, position.x, position.x + width),
      y: clamp(point.y, position.y, position.y + height)
    };
    const labelBetweenCardAndPin = (position.x + width < point.x && label.right < point.x) ||
      (position.x > point.x && label.left > point.x);
    if (label.top > point.y && position.y > point.y) {
      // A label below the pin needs a sideways lead before reaching the card.
      const bendX = Math.min(point.x - 34, label.left - 12);
      anchor.x = clamp(bendX, position.x + 8, position.x + width - 8);
      anchor.y = position.y;
      cardLink.setAttribute('d', `M${(point.x - 24).toFixed(1)} ${point.y.toFixed(1)} L${bendX.toFixed(1)} ${point.y.toFixed(1)} L${anchor.x.toFixed(1)} ${anchor.y.toFixed(1)}`);
    } else if (labelBetweenCardAndPin) {
      // Lead below a side label instead of drawing the connector through it.
      const bendY = Math.max(point.y + 34, label.bottom + 12);
      anchor.y = clamp(bendY, position.y + 8, position.y + height - 8);
      cardLink.setAttribute('d', `M${point.x.toFixed(1)} ${(point.y + 24).toFixed(1)} L${point.x.toFixed(1)} ${bendY.toFixed(1)} L${anchor.x.toFixed(1)} ${anchor.y.toFixed(1)}`);
    } else {
      const distance = Math.hypot(anchor.x - point.x, anchor.y - point.y);
      const start = distance > 24 ? { x: point.x + (anchor.x - point.x) / distance * 24, y: point.y + (anchor.y - point.y) / distance * 24 } : point;
      cardLink.setAttribute('d', distance > 24 ? `M${start.x.toFixed(1)} ${start.y.toFixed(1)} L${anchor.x.toFixed(1)} ${anchor.y.toFixed(1)}` : '');
    }
    plane.dataset.cardPositioned = 'true';
    if (revealSelection) {
      revealSelection = false;
      const card = inspector.getBoundingClientRect();
      if (card.top < 90 || card.bottom > window.innerHeight - 20) {
        inspector.scrollIntoView({ block: 'nearest', behavior: 'instant' });
      }
    }
  }

  function schedulePlacement() {
    if (!placementFrame) placementFrame = requestAnimationFrame(placeInspector);
  }

  function selectInstitution(id, announce = true) {
    const item = institutions.get(id);
    if (!item) return;
    selected = item;
    pending.hidden = true;
    const country = countries.get(item.country);
    options.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.institution === id)));
    film.hidden = !item.video;
    if (item.video) {
      const poster = document.getElementById('network-poster');
      poster.src = asset('experiments/' + item.video + '.webp');
      poster.alt = (item.topic);
      film.querySelector('.film-duration').textContent = item.duration;
      document.getElementById('network-topic').textContent = item.topic;
      document.getElementById('network-description').textContent = item.description;
      preview.setAttribute('aria-label', 'Watch experiment film: ' + item.topic);
      filmOpen.setAttribute('aria-label', 'Watch experiment film: ' + item.topic);
    }
    if (announce) selectionStatus.textContent = `${country.en}. ${item.topic}. Experiment film available.`;
    schedulePlacement();
  }

  function selectCountry(id, announce = true) {
    const country = countries.get(id);
    if (!country) return;
    revealSelection = announce;
    inspector.hidden = false;
    plane.dataset.activeCountry = id;
    plane.style.setProperty('--selection-x', `${(country.lon + 180) / 360 * 100}%`);
    plane.style.setProperty('--selection-y', `${(85 - country.lat) / 145 * 100}%`);
    document.querySelectorAll('[data-country]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.country === id)));
    options.replaceChildren();
    options.hidden = country.institutions.length < 2;
    if (!country.institutions.length) {
      selected = null;
      film.hidden = true;
      pending.hidden = false;
      document.getElementById('network-pending-location').textContent = country.en;
      if (announce) selectionStatus.textContent = `${country.en}. Video coming soon.`;
      schedulePlacement();
      return;
    }
    country.institutions.forEach(institutionId => {
      const item = institutions.get(institutionId),
        button = document.createElement('button');
      button.type = 'button';
      button.dataset.institution = item.id;
      button.textContent = item.topic;
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', () => selectInstitution(item.id));
      options.append(button);
    });
    selectInstitution(country.institutions[0], announce);
  }
  document.querySelectorAll('[data-country]').forEach(b => b.addEventListener('click', () => selectCountry(b.dataset.country)));
  document.getElementById('network').addEventListener('click', event => {
    if (!(event.target instanceof Element) || event.target.closest('button, a, .network-inspector, .experiment-dialog')) return;
    selected = null;
    revealSelection = false;
    inspector.hidden = true;
    cardLink.setAttribute('d', '');
    stage.style.setProperty('--card-overflow', '0px');
    delete plane.dataset.activeCountry;
    delete plane.dataset.cardPositioned;
    document.querySelectorAll('[data-country]').forEach(button => button.setAttribute('aria-pressed', 'false'));
    selectionStatus.textContent = 'Selection cleared.';
  });
  function openFilm(event) {
    if (!selected?.video) return;
    opener = event.currentTarget;
    error.hidden = true;
    document.getElementById('experiment-title').textContent = (selected.topic);
    document.getElementById('experiment-description').textContent = (selected.description);
    video.poster = asset('experiments/' + selected.video + '.webp');
    video.src = asset('experiments/' + selected.video + '.mp4');
    dialog.showModal();
    video.play().catch(() => {});
  }
  preview.addEventListener('click', openFilm);
  filmOpen.addEventListener('click', openFilm);
  dialog.querySelector('.experiment-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target === dialog) {
      const r = dialog.getBoundingClientRect();
      if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
    }
  });
  dialog.addEventListener('close', () => {
    video.pause();
    video.removeAttribute('src');
    video.load();
    opener?.focus({
      preventScroll: true
    });
  });
  video.addEventListener('error', () => {
    if (video.hasAttribute('src')) error.hidden = false;
  });
  const layoutObserver = new ResizeObserver(schedulePlacement);
  layoutObserver.observe(plane);
  layoutObserver.observe(inspector);
  document.addEventListener('aisle:viewchange', schedulePlacement);
  document.fonts.ready.then(schedulePlacement);
  selectCountry(selected.country, false);

  // Decorative peer-to-peer transfers, not live experimental traffic. A faint
  // link accompanies each meteor and disappears with it; idle regions have no links.
  const svg = document.querySelector('.network-arcs');
  const particles = svg.querySelector('.network-flow-particles');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const { width, height } = svg.viewBox.baseVal;
  const locations = network.countries.map(country => ({
    id: country.id,
    x: (country.lon + 180) / 360 * width,
    y: (85 - country.lat) / 145 * height
  }));
  const maxMeteors = Math.min(5, locations.length, locations.length * (locations.length - 1) / 2);
  const meteors = [];
  let visible = false,
    frame = 0,
    lastTime = 0,
    elapsed = 0,
    nextLaunch = 120,
    meteorId = 0;
  const canAnimate = () => maxMeteors > 0 && visible && !document.hidden && !reduced.matches && !document.getElementById('research-content')?.hidden;
  const element = (tag, attributes = {}) => {
    const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attributes).forEach(([name, value]) => node.setAttribute(name, value));
    return node;
  };

  function pointAt({ start, control, end }, t) {
    const u = 1 - t;
    return {
      x: u * u * start.x + 2 * u * t * control.x + t * t * end.x,
      y: u * u * start.y + 2 * u * t * control.y + t * t * end.y
    };
  }

  function chooseEndpoints() {
    // Sample peer regions uniformly, retrying occupied pairs so frequent
    // launches don't stack the same link or favour the selected film.
    for (let attempt = 0; attempt < 12; attempt++) {
      const from = Math.floor(Math.random() * locations.length);
      const to = (from + 1 + Math.floor(Math.random() * (locations.length - 1))) % locations.length;
      const start = locations[from], end = locations[to];
      if (!meteors.some(meteor =>
        (meteor.start === start && meteor.end === end) ||
        (meteor.start === end && meteor.end === start))) return { start, end };
    }
    return null;
  }

  function launchMeteor(delay) {
    const endpoints = chooseEndpoints();
    if (!endpoints) return;
    const { start, end } = endpoints;

    const distance = Math.hypot(end.x - start.x, end.y - start.y);
    const control = {
      x: (start.x + end.x) / 2,
      y: Math.max(8, Math.min(start.y, end.y) - Math.min(110, distance * .13))
    };
    const gradientId = `network-meteor-${++meteorId}`;
    const group = element('g', {
      'data-route-from': start.id,
      'data-route-to': end.id
    });
    group.style.opacity = '0';
    const defs = element('defs');
    const gradient = element('linearGradient', {
      id: gradientId,
      class: 'network-flow-gradient',
      gradientUnits: 'userSpaceOnUse'
    });
    [[0, 0], [.55, .6], [1, 1]].forEach(([offset, opacity]) => {
      gradient.append(element('stop', { offset, 'stop-opacity': opacity }));
    });
    defs.append(gradient);
    const link = element('path', {
      class: 'network-flow-link',
      d: `M${start.x} ${start.y} Q${control.x} ${control.y} ${end.x} ${end.y}`
    });
    const tail = element('path', {
      class: 'network-flow-tail',
      stroke: `url(#${gradientId})`
    });
    const head = element('g');
    head.append(
      element('circle', { r: 11, class: 'network-flow-halo' }),
      element('circle', { r: 4.2, class: 'network-flow' })
    );
    group.append(defs, link, tail, head);
    particles.append(group);
    meteors.push({
      start, control, end, group, gradient, tail, head,
      started: elapsed + delay,
      duration: 1600 + distance * .8 + Math.random() * 500,
      tailSpan: Math.min(.22, 50 / Math.max(1, distance))
    });
  }

  function paintMeteor(meteor, progress) {
    const { start, control, end, group, gradient, tail, head, tailSpan } = meteor;
    const t0 = Math.max(0, progress - tailSpan), t1 = Math.min(1, progress);
    const a = pointAt(meteor, t0), b = pointAt(meteor, t1);
    // The visible tail is a short subcurve, never the complete transfer path.
    const cx = a.x + (t1 - t0) * ((1 - t0) * (control.x - start.x) + t0 * (end.x - control.x));
    const cy = a.y + (t1 - t0) * ((1 - t0) * (control.y - start.y) + t0 * (end.y - control.y));
    tail.setAttribute('d', `M${a.x.toFixed(2)} ${a.y.toFixed(2)} Q${cx.toFixed(2)} ${cy.toFixed(2)} ${b.x.toFixed(2)} ${b.y.toFixed(2)}`);
    gradient.setAttribute('x1', a.x);
    gradient.setAttribute('y1', a.y);
    gradient.setAttribute('x2', b.x);
    gradient.setAttribute('y2', b.y);
    head.setAttribute('transform', `translate(${b.x} ${b.y})`);
    group.style.opacity = String(Math.min(1, progress / .045, (1 + tailSpan - progress) / tailSpan));
  }

  function draw(time) {
    if (!canAnimate()) {
      syncMotion();
      return;
    }
    if (!lastTime) lastTime = time - 34;
    if (time - lastTime >= 32) {
      elapsed += Math.min(time - lastTime, 100);
      lastTime = time;
      meteors.slice().forEach(meteor => {
        const progress = (elapsed - meteor.started) / meteor.duration;
        if (progress < 0) return;
        if (progress >= 1 + meteor.tailSpan) {
          meteor.group.remove();
          meteors.splice(meteors.indexOf(meteor), 1);
        } else paintMeteor(meteor, progress);
      });
      // Refill at independent random times instead of waiting for a whole
      // burst to finish, keeping transfers staggered and the map active.
      if (elapsed >= nextLaunch) {
        const count = Math.min(maxMeteors - meteors.length, 1 + Math.floor(Math.random() * 2));
        for (let i = 0; i < count; i++) launchMeteor(i * (80 + Math.random() * 140));
        nextLaunch = elapsed + 320 + Math.random() * 500;
      }
    }
    frame = requestAnimationFrame(draw);
  }

  function syncMotion() {
    const moving = canAnimate();
    particles.classList.toggle('is-moving', moving);
    if (moving && !frame) frame = requestAnimationFrame(draw);
    else if (!moving) {
      cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
      elapsed = 0;
      nextLaunch = 120;
      meteors.forEach(meteor => meteor.group.remove());
      meteors.length = 0;
    }
  }
  new IntersectionObserver(entries => {
    visible = entries[0].isIntersecting;
    syncMotion();
  }, {
    threshold: .05
  }).observe(svg);
  document.addEventListener('visibilitychange', syncMotion);
  document.addEventListener('aisle:viewchange', syncMotion);
  reduced.addEventListener('change', syncMotion);
})();
