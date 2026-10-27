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
