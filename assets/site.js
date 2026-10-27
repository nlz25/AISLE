/* AISLE: small, dependency-free enhancements; the default results remain in HTML. */
const menu = document.querySelector('.menu-toggle');
const nav = document.querySelector('.nav-links');
menu?.addEventListener('click', () => {
  const expanded = menu.getAttribute('aria-expanded') !== 'true';
  menu.setAttribute('aria-expanded', String(expanded));
  nav?.classList.toggle('open', expanded);
});
nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
  menu?.setAttribute('aria-expanded', 'false');
  nav.classList.remove('open');
}));

document.querySelectorAll('[data-tabs]').forEach(group => {
  const tabs = [...group.querySelectorAll('[role=tab]')];
  const activate = tab => {
    tabs.forEach(t => {
      const active = t === tab;
      t.setAttribute('aria-selected', String(active));
      t.tabIndex = active ? 0 : -1;
      const panel = document.getElementById(t.getAttribute('aria-controls'));
      if (panel) panel.hidden = !active;
    });
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activate(tab));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = tabs[(index + 1) % tabs.length];
      if (event.key === 'ArrowLeft') next = tabs[(index - 1 + tabs.length) % tabs.length];
      if (event.key === 'Home') next = tabs[0];
      if (event.key === 'End') next = tabs.at(-1);
      if (next) { event.preventDefault(); activate(next); next.focus(); }
    });
  });
});

document.querySelectorAll('[data-sort-board]').forEach(select => select.addEventListener('change', () => {
  const table = document.getElementById(select.dataset.sortBoard);
  const rows = [...table.tBodies[0].rows];
  const key = select.value;
  rows.sort((a, b) => Number(b.dataset[key]) - Number(a.dataset[key]) || a.dataset.name.localeCompare(b.dataset.name));
  rows.forEach(row => table.tBodies[0].append(row));
  const note = document.getElementById(select.dataset.status);
  if (note) note.textContent = select.options[select.selectedIndex].text;
}));

const resultData = document.getElementById('results-data');
if (resultData) {
  const study = JSON.parse(resultData.textContent);
  const zh = document.documentElement.lang.startsWith('zh');
  const tr = (en, cn) => zh ? cn : en;
  const safe = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const categories = [
    ['optimization', tr('Optimization','优化')],
    ['safety', tr('Safety','安全')],
    ['robustness', tr('Robustness','鲁棒性')],
    ['multimodal', tr('Multimodal','多模态')]
  ];
  const buttons = [...document.querySelectorAll('button[data-profile], tr[data-profile] .model-button')];
  const source = button => button.closest('[data-profile]');
  const panels = [...document.querySelectorAll('.model-details')];
  const openers = new Map();

  // Keep the cohort fixed while changing the score and ranking being inspected.
  const colors = {optimization:'#6485c6',safety:'#d2a45b',robustness:'#57a7a3',multimodal:'#a18ac6'};
  document.querySelectorAll('[data-chart-cohort]').forEach(board => {
    const cohort = board.dataset.chartCohort;
    const rows = [...board.querySelectorAll('.stack-row')];
    const originals = new Map(rows.map(row => [row, {
      bar:row.querySelector('.stack-track').innerHTML,
      label:row.getAttribute('aria-label')
    }]));
    const controls = [...board.querySelectorAll('[data-chart-metric]')];
    const note = board.querySelector('.stack-note');
    const initialNote = note.textContent;
    controls.forEach(control => control.addEventListener('click', () => {
      const key = control.dataset.chartMetric;
      const overall = key === cohort;
      const label = overall ? tr('Overall','综合分') : categories.find(([k]) => k === key)[1];
      const scores = rows.map(row => ({row,model:study.models.find(m => m.id === row.dataset.profile)}));
      scores.sort((a,b) => (b.model[key] ?? -1) - (a.model[key] ?? -1) || b.model[cohort] - a.model[cohort]);
      controls.forEach(c => c.setAttribute('aria-pressed',String(c === control)));
      board.querySelector('[data-score-heading]').textContent = overall ? label : tr('Score','得分');
      board.querySelector('[data-bar-heading]').innerHTML = overall
        ? tr('Category contributions','各类别得分贡献')
        : `<a href="tasks.html#${key}">${label} · ${tr('Task details','任务详情')} ↗</a>`;
      scores.forEach(({row,model}) => {
        const score = model[key];
        const value = score == null ? 'N/A' : score.toFixed(2);
        row.querySelector('.stack-rank').textContent = score == null ? '—' : 1 + scores.filter(s => s.model[key] != null && s.model[key] > score).length;
        row.querySelector('.stack-score').textContent = value;
        row.querySelector('.stack-track').innerHTML = overall ? originals.get(row).bar : score == null ? '' : `<span class="stack-segment" style="width:${score}%;background:${colors[key]}" title="${label}: ${value} / 100"></span>`;
        row.setAttribute('aria-label',overall ? originals.get(row).label : `${model.name} · ${label} ${value} / 100`);
        board.querySelector('.stack-rows').append(row);
      });
      note.textContent = overall ? initialNote : `${label} · ${tr('Category score / 100. N/A = not evaluated. Select a model for all scores.','类别汇总分 / 100。N/A = 未评测。点击模型查看全部得分。')}`;
      const panel = document.getElementById(`model-details-${cohort}`);
      if (panel) collapse(panel);
    }));
  });

  function collapse(panel, restoreFocus = false) {
    panel.hidden = true;
    panel.dataset.model = '';
    buttons.filter(button => button.getAttribute('aria-controls') === panel.id).forEach(button => button.setAttribute('aria-expanded','false'));
    if (restoreFocus) openers.get(panel)?.focus({preventScroll:true});
  }

  function select(button) {
    const entry = source(button);
    const model = study.models.find(m => m.id === entry.dataset.profile);
    const cohort = entry.dataset.cohort;
    const panel = document.getElementById(`model-details-${cohort}`);
    if (!model || !panel || model[cohort] == null) return;
    const destination = entry.matches('tr') ? entry.closest('.board') : entry.closest('.leaderboard-card');
    if (!panel.hidden && panel.dataset.model === model.id && panel.parentElement === destination) { collapse(panel); return; }
    destination.append(panel);
    const peers = study.models.filter(m => m[cohort] != null).sort((a,b) => b[cohort] - a[cohort]);
    const rank = peers.findIndex(m => m.id === model.id) + 1;
    const metrics = categories.map(([key,label]) => {
      const measured = model[key] != null;
      const included = key !== 'multimodal' || cohort === 'full';
      return `<div class="model-metric${included ? '' : ' excluded'}"><a href="tasks.html#${key}">${label} ↗</a><strong>${measured ? model[key].toFixed(2) : 'N/A'}</strong><span>${!measured ? tr('Not evaluated','未评测') : !included ? tr('Not in this index','不计入当前指数') : tr('Included','计入指数')}</span></div>`;
    }).join('');
    panel.innerHTML = `<div class="model-details-heading"><div><h3>${safe(model.name)}</h3><p>${safe(model.organization)} · #${rank} / ${peers.length} · ${tr('Overall','综合')} <strong>${model[cohort].toFixed(2)}</strong></p></div><button class="model-details-close" aria-label="${tr('Collapse model details','收起模型详情')}">${tr('Collapse','收起')} ×</button></div><div class="model-metrics">${metrics}</div><div class="model-details-foot"><span>${tr('Equal category weights · Scores 0–100','类别等权 · 得分 0–100')}</span><a href="tasks.html#scoring">${tr('Scoring details','评分说明')} ↗</a></div>`;
    panel.dataset.model = model.id;
    panel.hidden = false;
    openers.set(panel,button);
    buttons.filter(b => b.getAttribute('aria-controls') === panel.id).forEach(b => b.setAttribute('aria-expanded',String(source(b).dataset.profile === model.id)));
    panel.querySelector('.model-details-close').addEventListener('click', () => collapse(panel,true));
    // Expand in page flow; preserve focus and avoid any automatic page jump.
  }
  buttons.forEach(button => button.addEventListener('click', () => select(button)));
  // Retain the table's row-wide pointer target without handling a button click twice.
  document.querySelectorAll('tr[data-profile]').forEach(row => row.addEventListener('click', event => {
    if (!event.target.closest('button')) select(row.querySelector('.model-button'));
  }));
  panels.forEach(panel => panel.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.preventDefault(); collapse(panel,true); }
  }));
}

// A small, original orbital field, rendered only while the hero is visible.
// Decorative: all content and navigation remain available without canvas or JS.
const field = document.querySelector('.hero-field');
if (field && window.matchMedia && window.IntersectionObserver) {
  const context = field.getContext('2d');
  if (context) {
    const hero = field.parentElement;
    const toggle = hero.querySelector('.motion-toggle');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const zh = document.documentElement.lang.startsWith('zh');
    let width=0, height=0, frame=0, phase=0, visible=false, paused=reduced.matches;
    let pointer=0, target=0, last=0;
    const render = () => {
      context.clearRect(0,0,width,height);
      const radius=Math.min(width*.43,490);
      context.save();
      context.translate(width/2+pointer*12,height*.52);
      context.rotate(-.14+pointer*.025);
      for(let ring=0;ring<18;ring++) {
        const r=radius+ring*4;
        context.beginPath();
        context.ellipse(0,0,r,76+ring*3,0,0,Math.PI*2);
        context.strokeStyle=ring%3===0?'rgba(190,144,76,.14)':'rgba(92,124,166,.10)';
        context.lineWidth=.65;
        context.stroke();
        for(let dot=0;dot<3;dot++) {
          const a=phase*(.16+ring*.003)+ring*1.7+dot*Math.PI*2/3;
          context.beginPath();
          context.arc(Math.cos(a)*r,Math.sin(a)*(76+ring*3),ring%4===0?1.8:1,0,Math.PI*2);
          context.fillStyle=ring%3===0?'rgba(180,133,64,.55)':'rgba(85,116,162,.40)';
          context.fill();
        }
      }
      context.restore();
    };
    const loop = now => {
      if(!visible || paused || document.hidden) { frame=0; return; }
      if(now-last>32) { phase+=.025; pointer+=(target-pointer)*.04; render(); last=now; }
      frame=requestAnimationFrame(loop);
    };
    const start = () => { if(!frame && visible && !paused && !document.hidden) frame=requestAnimationFrame(loop); };
    const resize = () => {
      const bounds=hero.getBoundingClientRect();
      width=bounds.width; height=bounds.height;
      const ratio=Math.min(window.devicePixelRatio||1,2);
      field.width=width*ratio;field.height=height*ratio;
      context.setTransform(ratio,0,0,ratio,0,0);render();
    };
    const syncToggle = () => {
      toggle.hidden=false;toggle.setAttribute('aria-pressed',String(paused));
      toggle.setAttribute('aria-label',paused ? (zh?'播放背景动画':'Play background animation') : (zh?'暂停背景动画':'Pause background animation'));
      toggle.textContent=paused?'▷':'Ⅱ';
    };
    toggle.addEventListener('click',() => {paused=!paused;syncToggle();start();});
    reduced.addEventListener('change',() => {paused=reduced.matches;syncToggle();render();start();});
    hero.addEventListener('pointermove',event => {target=(event.clientX-hero.getBoundingClientRect().left)/width-.5;},{passive:true});
    hero.addEventListener('pointerleave',() => {target=0;});
    document.addEventListener('visibilitychange',start);
    new IntersectionObserver(entries => {visible=entries[0].isIntersecting;start();}).observe(hero);
    if(window.ResizeObserver) new ResizeObserver(resize).observe(hero);
    else window.addEventListener('resize',resize);
    resize();syncToggle();
  }
}
