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

  // One compact tooltip for model rows, category segments and detailed score cells.
  const tooltip = document.createElement('div');
  tooltip.id='score-tooltip';tooltip.className='score-tooltip';tooltip.role='tooltip';tooltip.hidden=true;
  document.body.append(tooltip);
  let tipRow=null, tipTimer;
  const hideTip = () => {
    clearTimeout(tipTimer);tooltip.hidden=true;
    tipRow?.querySelector('.is-inspected')?.classList.remove('is-inspected');
    tipRow?.removeAttribute('aria-describedby');tipRow=null;
  };
  const scheduleHideTip = () => {clearTimeout(tipTimer);tipTimer=setTimeout(hideTip,120);};
  const showTip = (row,target) => {
    clearTimeout(tipTimer);
    const model=study.models.find(m=>m.id===row.dataset.profile);
    if(!model) return;
    const cohort=row.dataset.cohort;
    const metric=target.closest('[data-metric]')?.dataset.metric;
    const board=row.closest('[data-chart-cohort]');
    const active=board?.querySelector('[data-chart-metric][aria-pressed=true]')?.dataset.chartMetric;
    const inOverall=active===cohort;
    tipRow?.querySelector('.is-inspected')?.classList.remove('is-inspected');
    tipRow?.removeAttribute('aria-describedby');tipRow=row;
    row.setAttribute('aria-describedby',tooltip.id);
    target.closest('.stack-segment')?.classList.add('is-inspected');
    let body;
    if(metric) {
      const label=categories.find(([key])=>key===metric)?.[1];
      const value=model[metric];
      const n=cohort==='full'?4:3;
      body=`<div class="tip-primary"><span>${label}</span><strong>${value==null?'N/A':value.toFixed(2)}<small>${value==null?'':' / 100'}</small></strong></div><p>${value==null?tr('Not evaluated','未评测'):inOverall?`${tr('Overall contribution','综合分贡献')}: <b>${(value/n).toFixed(2)}</b> · ${tr('Weight','权重')} 1/${n}`:tr('Category score','类别汇总分')}</p>`;
    } else {
      body=`<div class="tip-primary"><span>${tr('Overall','综合分')}</span><strong>${model[cohort].toFixed(2)}<small> / 100</small></strong></div><dl>${categories.map(([key,label])=>`<div><dt>${label}</dt><dd>${model[key]==null?'N/A':model[key].toFixed(2)}</dd></div>`).join('')}</dl>`;
    }
    tooltip.innerHTML=`<strong class="tip-model">${safe(model.name)}</strong><span class="tip-org">${safe(model.organization)}</span>${body}<span class="tip-hint">${tr('Click the model for details','点击模型查看详情')}</span>`;
    tooltip.hidden=false;
    const anchor=(metric?target:row).getBoundingClientRect();
    const rect=tooltip.getBoundingClientRect();
    tooltip.style.left=`${Math.max(12,Math.min(anchor.left+anchor.width/2-rect.width/2,window.innerWidth-rect.width-12))}px`;
    const top=anchor.top-rect.height-10;
    tooltip.style.top=`${Math.max(12,Math.min(top>=96?top:anchor.bottom+10,window.innerHeight-rect.height-12))}px`;
  };
  document.querySelectorAll('.stack-row,tr[data-profile]').forEach(row=>{
    row.addEventListener('pointerover',event=>{if(event.pointerType!=='touch')showTip(row,event.target);});
    row.addEventListener('pointerleave',scheduleHideTip);
    row.addEventListener('focusin',()=>showTip(row,row));
    row.addEventListener('focusout',scheduleHideTip);
    row.addEventListener('click',hideTip);
  });
  tooltip.addEventListener('pointerenter',()=>clearTimeout(tipTimer));
  tooltip.addEventListener('pointerleave',scheduleHideTip);
  document.addEventListener('keydown',event=>{if(event.key==='Escape')hideTip();});
  window.addEventListener('scroll',hideTip,{passive:true,capture:true});
  window.addEventListener('resize',hideTip);

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
      hideTip();
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
        row.querySelector('.stack-track').innerHTML = overall ? originals.get(row).bar : score == null ? '' : `<span class="stack-segment" data-metric="${key}" style="width:${score}%;background:${colors[key]}"></span>`;
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

// Logo strips pause on hover, via their control, or under reduced-motion preferences.
const institutionsSection = document.querySelector('.institutions');
if (institutionsSection) {
  const control=institutionsSection.querySelector('.institutions-motion');
  const zh=document.documentElement.lang.startsWith('zh');
  control.hidden=false;
  control.addEventListener('click',() => {
    const paused=control.getAttribute('aria-pressed')!=='true';
    control.setAttribute('aria-pressed',String(paused));
    institutionsSection.dataset.paused=String(paused);
    control.textContent=paused?(zh?'播放 ▷':'Play ▷'):(zh?'暂停 Ⅱ':'Pause Ⅱ');
  });
}

// Count once on first entry; the final values remain in HTML and accessible text.
const statistics=document.querySelector('.stats');
if(statistics && window.requestAnimationFrame && window.matchMedia) {
  const numbers=[...statistics.querySelectorAll('[data-count]')];
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  let started=false, animation=0;
  const format=(node,value)=>value.toLocaleString('en-US',{minimumIntegerDigits:Number(node.dataset.countDigits)||1});
  const finish=()=>{cancelAnimationFrame(animation);numbers.forEach(node=>node.textContent=format(node,Number(node.dataset.count)));};
  const start=()=>{
    if(started)return;started=true;
    if(reduced.matches){finish();return;}
    numbers.forEach(node=>node.textContent=format(node,0));
    const beginning=performance.now();
    const tick=now=>{
      const progress=Math.min(1,(now-beginning)/1100);
      const eased=1-Math.pow(1-progress,3);
      numbers.forEach(node=>node.textContent=format(node,Math.floor(Number(node.dataset.count)*eased)));
      if(progress<1)animation=requestAnimationFrame(tick);else finish();
    };
    animation=requestAnimationFrame(tick);
  };
  reduced.addEventListener('change',()=>{if(reduced.matches)finish();});
  if(window.IntersectionObserver){
    const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){start();observer.disconnect();}},{threshold:.2});
    observer.observe(statistics);
  }else start();
}
