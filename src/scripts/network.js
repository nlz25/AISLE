/* Country groups keep nearby institutions selectable without overlapping map pins. */
(() => {
  const source = document.getElementById('network-data');
  if (!source) return;
  const network = JSON.parse(source.textContent);
  const asset = path => 'assets/' + path;
  const countries = new Map(network.countries.map(c => [c.id, c]));
  const institutions = new Map(network.institutions.map(i => [i.id, i]));
  const inspector = document.getElementById('network-inspector');
  const options = inspector.querySelector('.institution-options');
  const film = document.getElementById('network-film');
  const preview = film.querySelector('.film-preview');
  const dialog = document.querySelector('.experiment-dialog');
  const video = document.getElementById('experiment-video');
  const error = document.getElementById('experiment-error');
  const shortLabels = {
    suzhou: 'Suzhou Lab',
    csu: 'CSU',
    ustc: 'USTC',
    szu: 'SZU',
    bears: 'BEARS',
    ntu: 'NTU',
    greendynamics: 'GreenDynamics'
  };
  let selected = institutions.get('suzhou'),
    opener = null;

  function selectInstitution(id, announce = true) {
    const item = institutions.get(id);
    if (!item) return;
    selected = item;
    const country = countries.get(item.country);
    options.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.institution === id)));
    const place = item.city === country.en ? country.en : `${item.city}, ${country.en}`;
    document.getElementById('network-location').textContent = place;
    const logo = document.getElementById('network-logo');
    logo.src = asset('institutions/' + item.logo);
    logo.alt = item.name;
    document.getElementById('network-institution').textContent = item.short;
    const fullname = document.getElementById('network-full-name');
    fullname.textContent = item.name;
    fullname.hidden = !!item.video || item.name === item.short;
    film.hidden = !item.video;
    if (item.video) {
      const poster = document.getElementById('network-poster');
      poster.src = asset('experiments/' + item.video + '.webp');
      poster.alt = (item.topic);
      film.querySelector('.film-duration').textContent = item.duration;
      document.getElementById('network-topic').textContent = (item.topic);
      preview.setAttribute('aria-label', ('Watch experiment film: ') + (item.short));
    }
    if (announce) inspector.querySelector('.network-selection').textContent = `${item.name}. ${place}. ${item.video?('Experiment film available.'):''}`;
  }

  function selectCountry(id, announce = true) {
    const country = countries.get(id);
    if (!country) return;
    document.querySelectorAll('[data-country]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.country === id)));
    options.replaceChildren();
    options.hidden = country.institutions.length < 2;
    country.institutions.forEach(institutionId => {
      const item = institutions.get(institutionId),
        button = document.createElement('button');
      button.type = 'button';
      button.dataset.institution = item.id;
      button.textContent = (shortLabels[item.id] || item.short);
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', () => selectInstitution(item.id));
      options.append(button);
    });
    selectInstitution(country.institutions[0], announce);
  }
  document.querySelectorAll('[data-country]').forEach(b => b.addEventListener('click', () => selectCountry(b.dataset.country)));
  preview.addEventListener('click', () => {
    if (!selected.video) return;
    opener = preview;
    error.hidden = true;
    document.getElementById('experiment-title').textContent = (selected.topic);
    document.getElementById('experiment-location').textContent = selected.name;
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
  selectCountry('cn', false);

  // Decorative traveling lights, not live experimental traffic. Geometry is sampled
  // once, then only transforms/opacity change at 30 fps while the map is visible.
  const svg = document.querySelector('.network-arcs');
  const particles = svg.querySelector('.network-flow-particles');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const routes = [...svg.querySelectorAll('.network-route')].map((path, index) => {
    const length = path.getTotalLength();
    const samples = Array.from({
      length: 301
    }, (_, i) => path.getPointAtLength(length * i / 300));
    const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const dots = Array.from({
      length: 8
    }, (_, i) => {
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('r', i === 0 ? '7' : i === 1 ? '2.4' : String(2.1 - (i - 2) * .22));
      dot.setAttribute('class', i === 0 ? 'network-flow-halo' : i === 1 ? 'network-flow' : 'network-flow-tail');
      if (index === 3) dot.classList.add('network-flow-warm');
      group.append(dot);
      return dot;
    });
    particles.append(group);
    return {
      samples,
      dots,
      duration: 9000 + index * 1200,
      offset: index * .21
    };
  });
  let visible = false,
    frame = 0,
    lastTime = 0,
    elapsed = 0;
  const canAnimate = () => visible && !document.hidden && !reduced.matches && !document.getElementById('research-content')?.hidden;

  function draw(time) {
    if (!canAnimate()) {
      frame = 0;
      lastTime = 0;
      return;
    }
    if (!lastTime) lastTime = time - 34;
    if (time - lastTime >= 32) {
      elapsed += Math.min(time - lastTime, 100);
      lastTime = time;
      routes.forEach(route => {
        const progress = (elapsed / route.duration + route.offset) % 1;
        route.dots.forEach((dot, index) => {
          const p = (progress - Math.max(0, index - 1) * .009 + 1) % 1;
          const position = p * 300,
            from = Math.floor(position),
            mix = position - from;
          const a = route.samples[from],
            b = route.samples[Math.min(300, from + 1)];
          dot.setAttribute('transform', `translate(${a.x+(b.x-a.x)*mix} ${a.y+(b.y-a.y)*mix})`);
          dot.style.opacity = String(Math.min(1, p * 16, (1 - p) * 16) * (index > 1 ? (8 - index) / 7 : 1));
        });
      });
    }
    frame = requestAnimationFrame(draw);
  }

  function syncMotion() {
    const moving = canAnimate();
    particles.classList.toggle('is-moving', moving);
    if (moving && !frame) frame = requestAnimationFrame(draw);
    else if (!moving && frame) {
      cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
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
