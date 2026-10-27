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
const profile = document.querySelector('.profile-dialog');
if (resultData && profile) {
  const study = JSON.parse(resultData.textContent);
  const content = document.getElementById('profile-content');
  const zh = document.documentElement.lang.startsWith('zh');
  const tr = (en, cn) => zh ? cn : en;
  const safe = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const categoryInfo = {
    optimization: {label:tr('Optimization','实验优化'), color:'#5370bc', environment:tr('Physical + simulated','真实实验 + 模拟'), text:tr('Four equally weighted groups: Suzhou Real-4D, Singapore Real-4D, Sim-4D 0-shot and Suzhou Real-8D. Success thresholds and measurement chains remain site-specific.','四个任务组等权：苏州 Real-4D、新加坡 Real-4D、Sim-4D 0-shot、苏州 Real-8D。成功阈值与测量方式按站点分别说明。')},
    safety: {label:tr('Safety','实验安全'), color:'#b99352', environment:tr('Simulation','模拟环境'), text:tr('Six forbidden-band conditions. Success requires reaching the colour target while staying violation-free for the entire run.','六种禁止区间条件。成功要求达到颜色目标，同时整条运行零违规。')},
    robustness: {label:tr('Adaptive robustness','自适应鲁棒性'), color:'#5d83a0', environment:tr('Physical experiments','真实物理实验'), text:tr('Hidden pipetting drift and viscous resin transfer receive equal weight. Recovery, all-round compliance and consistency contribute evidence.','隐藏移液漂移与黏性树脂转移等权，结合恢复、全轮次合格情况与一致性进行评价。')},
    multimodal: {label:tr('Multimodal reasoning','多模态光谱推理'), color:'#9a82ad', environment:tr('Wet measurement + measured-data queries','湿实验测量 + 实测数据查询'), text:tr('Spectral matching and active pKa inference receive equal weight. Active inference uses a fixed library of measured spectra; its repeated agent runs are not independent new wet measurements.','光谱匹配与主动 pKa 推断等权。主动推断使用固定的实测光谱库，重复 Agent 运行不代表新增独立湿实验。')}
  };
  let selectedModel;
  let opener;

  function renderProfile(cohort) {
    const model = selectedModel;
    if (!model || model[cohort] == null) return;
    const keys = ['optimization','safety','robustness', ...(cohort === 'full' ? ['multimodal'] : [])];
    const cohortModels = study.models.filter(m => m[cohort] != null).sort((a,b) => b[cohort] - a[cohort]);
    const rank = cohortModels.findIndex(m => m.id === model.id) + 1;
    const label = cohort === 'full' ? tr('Full-task index','完整任务指数') : tr('Shared-task index','共享任务指数');
    const contributions = keys.map(key => {
      const cat = categoryInfo[key];
      return `<div class="contribution-row"><span><i style="background:${cat.color}"></i>${cat.label}</span><span>${model[key].toFixed(2)} × 1/${keys.length}</span><strong>${(model[key]/keys.length).toFixed(2)}</strong></div>`;
    }).join('');
    const bar = keys.map(key => `<span style="width:${model[key]/keys.length}%;background:${categoryInfo[key].color}"></span>`).join('');
    const taskDetails = Object.entries(categoryInfo).map(([key,cat]) => {
      const measured = model[key] != null;
      const included = keys.includes(key);
      return `<details class="profile-task"><summary><span>${cat.label}<small>${measured ? cat.environment : tr('Not evaluated in this study','本研究未评测')}</small></span><strong>${measured ? model[key].toFixed(2) : 'N/A'}</strong><span class="expand-sign" aria-hidden="true">+</span></summary><div class="profile-task-body"><p>${measured ? cat.text : tr('This model was not included in the study’s multimodal cohort. N/A is not a score of zero.','该模型未纳入本研究多模态队列。N/A 不代表零分。')}</p><p class="contribution-status">${included ? tr('Included in this index at equal weight.','等权计入当前指数。') : tr('Not included in the selected index.','不计入当前所选指数。')}</p><a class="text-link" href="tasks.html#${key}">${tr('View evaluation criteria','查看评价依据')} ↗</a></div></details>`;
    }).join('');
    content.innerHTML = `<div class="profile-intro"><span class="mini-head">PSI-Bench · ${tr('Study snapshot','研究快照')}</span><h2 id="profile-title">${safe(model.name)}</h2><p>${safe(model.organization)}</p></div>
      <div class="profile-switch" role="group" aria-label="${tr('Score coverage','得分覆盖范围')}"><button data-profile-cohort="shared" aria-pressed="${cohort==='shared'}">${tr('Shared tasks','共享任务')}</button><button data-profile-cohort="full" aria-pressed="${cohort==='full'}" ${model.full==null?'disabled':''}>${tr('Full tasks','完整任务')}${model.full==null?' · N/A':''}</button></div>
      <div class="profile-summary"><div><span>${label}</span><strong>${model[cohort].toFixed(2)}<small> / 100</small></strong></div><div class="profile-rank"><span>${tr('Cohort rank','队列排名')}</span><strong>#${rank}<small> / ${cohortModels.length}</small></strong></div></div>
      <section class="profile-section"><h3>${tr('How the score adds up','综合得分如何构成')}</h3><div class="contribution-bar" aria-hidden="true">${bar}</div><div class="bar-scale"><span>0</span><span>100</span></div><div class="contribution-header"><span>${tr('Category','能力类别')}</span><span>${tr('Score × weight','得分 × 权重')}</span><span>${tr('Contribution','贡献分')}</span></div>${contributions}<p class="profile-note">${tr('All categories have equal weight. Displayed values are rounded; the aggregate retains the manuscript calculation.','各类别等权。显示值经过舍入，综合指数保留原始稿件计算结果。')}</p></section>
      <section class="profile-section"><h3>${tr('Explore task coverage','展开查看任务与评价依据')}</h3>${taskDetails}</section>
      <div class="profile-context"><span class="mini-head">${tr('Read with context','结果解释范围')}</span><p>${tr('Scores describe the tested tasks and protocols. They are not success percentages or an absolute ranking of general scientific ability. Small differences between models do not establish statistically significant superiority.','得分描述本次任务与协议下的表现，不代表成功率或通用科学能力的绝对排名。模型间的小幅分差不构成统计显著优势。')}</p><a href="tasks.html#scoring" class="text-link">${tr('Scoring & comparability','评分与可比性说明')} ↗</a></div>`;
    content.querySelectorAll('[data-profile-cohort]').forEach(button => button.addEventListener('click', () => {
      renderProfile(button.dataset.profileCohort);
      content.querySelector(`[data-profile-cohort="${button.dataset.profileCohort}"]`)?.focus();
    }));
  }

  document.querySelectorAll('[data-profile]').forEach(row => row.addEventListener('click', () => {
    selectedModel = study.models.find(m => m.id === row.dataset.profile);
    if (!selectedModel) return;
    opener = row.matches('button') ? row : row.querySelector('.model-button');
    renderProfile(row.dataset.cohort);
    profile.showModal();
    profile.scrollTop = 0;
    document.body.classList.add('modal-open');
  }));
  profile.querySelector('.profile-close').addEventListener('click', () => profile.close());
  profile.addEventListener('click', event => { if(event.target===profile) profile.close(); });
  profile.addEventListener('close', () => {
    document.body.classList.remove('modal-open');
    opener?.focus();
  });
}
