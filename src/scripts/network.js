/* Location groups expose research directions and films on the map. */
(() => {
  const source = document.getElementById('network-data');
  if (!source) return;
  const network = JSON.parse(source.textContent);
  const asset = path => 'assets/' + path;
  const countries = new Map(network.countries.map(c => [c.id, c]));
  const institutions = new Map(network.institutions.map(i => [i.id, i]));
  const inspector = document.getElementById('network-inspector');
  const options = inspector.querySelector('.research-options');
  const film = document.getElementById('network-film');
  const pending = document.getElementById('network-pending');
  const preview = film.querySelector('.film-preview');
  const dialog = document.querySelector('.experiment-dialog');
  const video = document.getElementById('experiment-video');
  const error = document.getElementById('experiment-error');
  let selected = network.institutions[0],
    opener = null;

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
    }
    if (announce) inspector.querySelector('.network-selection').textContent = `${country.en}. ${item.topic}. Experiment film available.`;
  }

  function selectCountry(id, announce = true) {
    const country = countries.get(id);
    if (!country) return;
    document.querySelectorAll('[data-country]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.country === id)));
    options.replaceChildren();
    options.hidden = country.institutions.length < 2;
    if (!country.institutions.length) {
      selected = null;
      film.hidden = true;
      pending.hidden = false;
      document.getElementById('network-pending-location').textContent = country.en;
      if (announce) inspector.querySelector('.network-selection').textContent = `${country.en}. Video coming soon.`;
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
  preview.addEventListener('click', () => {
    if (!selected?.video) return;
    opener = preview;
    error.hidden = true;
    document.getElementById('experiment-title').textContent = (selected.topic);
    document.getElementById('experiment-description').textContent = (selected.description);
    video.poster = asset('experiments/' + selected.video + '.webp');
    video.src = asset('experiments/' + selected.video + '.mp4');
    dialog.showModal();
    video.play().catch(() => {});
  });
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
    [[0, 0], [.55, .35], [1, .95]].forEach(([offset, opacity]) => {
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
      element('circle', { r: 7, class: 'network-flow-halo' }),
      element('circle', { r: 2.3, class: 'network-flow' })
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
