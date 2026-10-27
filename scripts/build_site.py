"""Render AISLE's bilingual, static GitHub Pages site. Python standard library only."""
import html
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / 'data/results.json').read_text())
MODELS = DATA['models']
REPO = 'https://github.com/nlz25/AISLE'
lang = 'en'


def t(en, zh):
    return zh if lang == 'zh' else en


def root(path):
    return ('../' if lang == 'zh' else '') + path


def esc(value):
    return html.escape(str(value), quote=True)


def arrow():
    return '<span class="arrow" aria-hidden="true">↗</span>'


def link(label, href, cls='text-link'):
    return f'<a class="{cls}" href="{href}">{label}{arrow()}</a>'


def header(page):
    items = [('index.html#experiments', t('Experiments', '实验任务')),
             ('leaderboard.html', t('Results', '评测结果')),
             ('methodology.html', t('Methodology', '评测方法')),
             ('index.html#collaborate', t('Collaborate', '参与合作'))]
    nav = ''.join(f'<a href="{url}"{chr(32) + "aria-current=page" if url == page else ""}>{label}</a>' for url, label in items)
    language_url = '../' + page if lang == 'zh' else 'zh/' + page
    return f'''<a class="skip" href="#main">{t('Skip to content', '跳转到正文')}</a>
    <header class="site-header"><div class="wrap header-inner">
      <a class="brand" href="index.html" aria-label="AISLE home"><span class="wordmark">AISLE</span><span class="brand-caption">AI Scientists’<br>Last Exam</span></a>
      <nav class="nav-links" id="main-navigation" aria-label="{t('Main navigation', '主导航')}">{nav}</nav>
      <div class="nav-side"><a class="repo-link" href="{REPO}">GitHub ↗</a><a class="language" href="{language_url}" lang="{t('zh-CN','en')}">{t('中文','EN')}</a>
      <button class="menu-toggle" aria-controls="main-navigation" aria-expanded="false">{t('Menu +','菜单 +')}</button></div>
    </div></header>'''


def footer():
    return f'''<footer class="site-footer"><div class="wrap"><div class="footer-top">
      <div><a href="index.html" class="wordmark">AISLE</a><p>AI Scientists’ Last Exam<br>{t('Scientific decisions. Experimental evidence.', '科学决策，实验验证。')}</p></div>
      <div class="footer-links"><a href="leaderboard.html">{t('Results','评测结果')}</a><a href="methodology.html">{t('Methodology','评测方法')}</a><a href="{REPO}">GitHub ↗</a><a href="{root('docs/roadmap.md')}">{t('Roadmap','建设路线')}</a></div>
      </div><div class="footer-bottom"><span>© 2026 AISLE · AI Scientists’ Last Exam</span><span>{t('First-stage study: PSI-Bench · Website snapshot: 27 Oct 2026','第一阶段研究：PSI-Bench · 网站快照：2026 年 10 月 27 日')}</span></div></div></footer>'''


def model_dialog():
    payload = json.dumps(DATA, ensure_ascii=False).replace('<', '\\u003c')
    return f'''<script type="application/json" id="results-data">{payload}</script>
    <dialog class="profile-dialog" aria-labelledby="profile-title"><div class="profile-header"><span class="eyebrow">{t('Inside the result','深入查看结果')}</span><button class="profile-close" aria-label="{t('Close model details','关闭模型详情')}">{t('Close ×','关闭 ×')}</button></div><div id="profile-content"></div></dialog>'''


def shell(page, title, description, body):
    url = f'https://nlz25.github.io/AISLE/{"zh/" if lang == "zh" else ""}{page}'
    return f'''<!doctype html>
<html lang="{t('en','zh-CN')}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(title)} · AISLE</title><meta name="description" content="{esc(description)}">
<meta name="theme-color" content="#1c3029"><meta property="og:type" content="website"><meta property="og:title" content="{esc(title)} · AISLE"><meta property="og:description" content="{esc(description)}"><meta property="og:url" content="{url}">
<meta property="og:image" content="https://nlz25.github.io/AISLE/assets/lab-poster.jpg"><meta name="twitter:card" content="summary_large_image">
<link rel="canonical" href="{url}"><link rel="alternate" hreflang="en" href="https://nlz25.github.io/AISLE/{page}"><link rel="alternate" hreflang="zh-CN" href="https://nlz25.github.io/AISLE/zh/{page}">
<link rel="stylesheet" href="{root('assets/style.css')}"><script defer src="{root('assets/site.js')}"></script></head>
<body class="{lang}">{header(page)}{body}{model_dialog() if page != 'methodology.html' else ''}{footer()}</body></html>'''


def specs(items):
    return '<dl class="specs">' + ''.join(f'<div><dt>{k}</dt><dd>{v}</dd></div>' for k, v in items) + '</dl>'


def table(cohort, preview=False):
    models = sorted([m for m in MODELS if m[cohort] is not None], key=lambda m: -m[cohort])
    if preview:
        models = models[:4]
    keys = ['optimization', 'safety', 'robustness'] + (['multimodal'] if cohort == 'full' else [])
    names = {'optimization': t('Optimization','优化'), 'safety': t('Safety','安全'), 'robustness': t('Robustness','鲁棒性'), 'multimodal': t('Multimodal','多模态')}
    heads = ''.join(f'<th scope="col">{names[k]}</th>' for k in keys)
    rows = ''
    for rank, m in enumerate(models, 1):
        attrs = ' '.join(f'data-{k}="{m[k]}"' for k in [cohort] + keys)
        scores = ''.join(f'<td>{m[k]:.2f}</td>' for k in keys)
        rows += f'''<tr {attrs} data-name="{esc(m['name'])}" data-profile="{m['id']}" data-cohort="{cohort}"><td>{rank:02}</td><th scope="row" class="model-name"><button class="model-button" aria-haspopup="dialog" aria-label="{t('View details for','查看模型详情：')} {esc(m['name'])}">{esc(m['name'])}<span aria-hidden="true">↗</span></button><small>{esc(m['organization'])}</small></th>
        <td class="score-cell"><span class="score-number">{m[cohort]:.2f}</span><div class="score-track" aria-hidden="true"><div class="score-fill" style="width:{m[cohort]}%"></div></div></td>{scores}</tr>'''
    return f'''<div class="table-scroll" tabindex="0" role="region" aria-label="{t('Scrollable results table','可横向滚动的成绩表')}"><table class="results-table" id="table-{cohort}{'-preview' if preview else ''}">
    <caption class="sr-only">{t('Study scores from 0 to 100. Rank refers to the aggregate score.','研究得分范围 0–100；排名依据综合得分。')}</caption>
    <thead><tr><th scope="col">{t('Rank','排名')}</th><th scope="col">{t('Model','模型')}</th><th scope="col">{t('Overall / 100','综合 / 100')}</th>{heads}</tr></thead><tbody>{rows}</tbody></table></div>'''


def home():
    loop_items = [
        (t('Propose','提出方案'),t('Choose an experimental action within the task’s rules and budget.','在任务规则与预算内，选择下一次实验操作。')),
        (t('Execute','执行实验'),t('The laboratory prepares samples and executes the proposed operation.','实验室制备样品，设备执行提出的操作。')),
        (t('Measure','读取测量'),t('Instruments return measurements, execution status and errors.','仪器返回真实测量、执行状态与误差。')),
        (t('Adapt','调整决策'),t('The next decision is informed by the accumulated experimental feedback.','模型依据积累的实验反馈，调整下一轮决策。'))]
    loop_html = ''.join(f'<div class="loop-step"><div class="step-label"><span>0{i+1}</span><span aria-hidden="true">→</span></div><h3>{h}</h3><p>{p}</p></div>' for i,(h,p) in enumerate(loop_items))
    categories = [
      ('optimization',t('Optimization','实验优化'),t('Can it improve the experiment?','能否持续改进实验结果？'),t('Colour-matching tasks test how models use measurements and historical observations to search for better formulations.','通过颜色匹配，检验模型能否利用测量与历史观测，逐步找到更好的配方。'),t('Physical + simulated','真实实验 + 模拟'),[
          (t('Tasks','任务'),t('4-component and 8-component colour matching','四组分与八组分颜色匹配')),
          (t('Decisions','决策'),t('Formulation volumes; use of prior observations','配方体积；对已有实验信息的利用')),
          (t('Budget','预算'),t('12 scored experiments per run','每次运行 12 轮计分实验')),
          (t('Evidence','证据'),t('Colour error, attainment, efficiency and repeat stability','色差、达标情况、效率与重复稳定性'))]),
      ('safety',t('Safety','实验安全'),t('Can it succeed within constraints?','能否在约束内完成目标？'),t('Constrained colour mixing tests whether progress is maintained without entering a forbidden outcome region.','受约束的调色任务，检验模型能否在避免结果落入禁区的同时推进目标。'),t('Simulated constraint task','模拟约束任务'),[
          (t('Tasks','任务'),t('Colour matching with six forbidden-band conditions','六种禁止区间条件下的颜色匹配')),
          (t('Decisions','决策'),t('Balance target improvement with constraint adherence','平衡接近目标与遵守约束')),
          (t('Coverage','范围'),t('126 runs across seven models','七个模型，共 126 条运行')),
          (t('Evidence','证据'),t('Safe completion and consistency across repeats','全程安全达标与跨重复一致性'))]),
      ('robustness',t('Robustness','自适应鲁棒性'),t('Can it recover when conditions change?','条件变化后，能否恢复表现？'),t('Hidden pipetting drift and viscous resin transfer expose the gap between noticing an error and correcting it.','隐藏移液漂移与黏性树脂转移，检验模型发现偏差后能否采取有效补偿。'),t('Physical experiments','真实物理实验'),[
          (t('Tasks','任务'),t('Hidden drift; resin transfer at three viscosities','隐藏移液漂移；三种黏度的树脂转移')),
          (t('Decisions','决策'),t('Update formulations or aspiration volumes from feedback','根据反馈调整配方或吸液体积')),
          (t('Target','目标'),t('Drift recovery; transferred volume of 500 ± 10 μL','漂移后恢复；实际转移体积 500 ± 10 μL')),
          (t('Evidence','证据'),t('Recovery, all-round compliance and repeat consistency','恢复、全轮次合格率与重复一致性'))]),
      ('multimodal',t('Multimodal','多模态光谱推理'),t('Can it turn spectra into decisions?','能否从光谱走向有效决策？'),t('Spectral matching and active pKa inference test the use of measurement information to choose actions and infer scientific properties.','光谱匹配与主动 pKa 推断，检验模型如何解读测量信息、选择后续操作并推断科学参数。'),t('Wet measurements + measured-data queries','湿实验测量 + 实测数据查询'),[
          (t('Tasks','任务'),t('Spectral matching; active pKa inference','光谱匹配；主动 pKa 推断')),
          (t('Feedback','反馈'),t('Spectrum images or queries to measured spectra','光谱图像或对实测光谱库的查询')),
          (t('Coverage','范围'),t('Five evaluated image-input models','五个参与评测的图像输入模型')),
          (t('Evidence','证据'),t('Spectral error, inference accuracy and query efficiency','光谱误差、参数推断精度与查询效率'))])]
    tabs = ''.join(f'<button class="tab" role="tab" id="tab-{k}" aria-controls="panel-{k}" aria-selected="{str(i==0).lower()}" tabindex="{0 if i==0 else -1}">{name}</button>' for i,(k,name,*_) in enumerate(categories))
    panels = ''.join(f'<div class="task-panel" id="panel-{k}" role="tabpanel" aria-labelledby="tab-{k}" {"hidden" if i else ""}><div><span class="badge">{badge}</span><h3>{heading}</h3><p class="task-summary">{summary}</p>{link(t("Read the task protocol","查看任务协议"),"methodology.html#"+k)}</div>{specs(rows)}</div>' for i,(k,name,heading,summary,badge,rows) in enumerate(categories))
    directions = [
      (t('Colour & formulation','颜色与配方'),t('Closed-loop formulation decisions under measurement feedback.','通过实测反馈开展闭环配方决策。'),t('First-stage results','已有阶段结果'),True),
      (t('Solid electrolytes','固态电解质'),t('Explore formulation choices and material performance.','探索配方选择与材料性能。'),t('Task development','任务建设中'),False),
      (t('Coloured photovoltaics','彩色光伏'),t('Investigate colour and energy-performance trade-offs.','探索颜色与发电性能之间的平衡。'),t('Task development','任务建设中'),False),
      (t('Quantum dots','量子点'),t('Extend experimental evaluation to quantum-dot systems.','将实验评测拓展到量子点体系。'),t('In collaboration','合作对接中'),False),
      (t('Fluorescent probes','荧光探针'),t('Select candidates and evaluate their fluorescence response.','选择候选分子，评价荧光响应。'),t('Data & protocol preparation','数据与协议整理中'),False),
      (t('Copper-based alloys','铜基合金'),t('Investigate composition and processing choices.','探索合金成分与处理条件。'),t('In collaboration','合作对接中'),False)]
    directions_html = ''.join(f'<article class="direction"><div class="direction-top"><span class="direction-number">0{i+1}</span><span class="badge {"" if done else "planned"}">{status}</span></div><h3>{name}</h3><p>{desc}</p></article>' for i,(name,desc,status,done) in enumerate(directions))
    findings = [
      (t('SIMULATED SAFETY · 126 RUNS','模拟安全任务 · 126 条运行'),'46.8% <small>→</small> 7.9%',t('Reaching a target is only part of the task.','到达目标，只完成了一部分。'),t('59 runs reached the target at least once. Only 10 also remained violation-free throughout.','59 条运行曾到达目标，只有 10 条同时做到全程零违规。'),'safety'),
      (t('PHYSICAL RESIN TRANSFER','真实树脂转移实验'),'86.9% <small>→</small> 32.9%',t('Performance changes with the material.','材料变化，表现随之改变。'),t('Across seven models, all-round transfer compliance fell as viscosity increased.','七个模型的逐轮转移合格率随黏度升高而降低。'),'robustness'),
      (t('PHYSICAL 8-COMPONENT OPTIMIZATION','真实八组分优化实验'),'0 <small>/ 54</small>',t('Progress can coexist with failure.','取得进展，仍可能未能达标。'),t('No run met the strict colour target. Continuous errors still distinguish how close each method came.','没有运行达到严格色差目标，但连续误差揭示了各方法接近目标的程度。'),'optimization')]
    findings_html = ''.join(f'<article class="insight"><span class="kicker">{k}</span><div class="finding-number">{n}</div><h3>{h}</h3><p>{p}</p><a href="methodology.html#{a}">{t("View evaluation context","查看评测口径")} ↗</a></article>' for k,n,h,p,a in findings)
    return f'''<main id="main">
    <div class="wrap"><section class="hero"><div><div class="eyebrow">{t('Scientific intelligence, put to the test','让科学智能接受实验检验')}</div>
      <h1>{t('The next exam<br>is <em>in the lab.</em>','把 AI 科学家的考场，<br>搬进<em>真实实验室。</em>')}</h1>
      <p class="full-name">AI Scientists’ Last Exam</p><p class="intro">{t('Evaluating how AI scientists act, learn from measurements, and adapt — through experimental feedback and a growing laboratory network.','通过真实实验反馈与不断拓展的实验室网络，检验 AI 科学家如何行动、利用测量，并在变化中调整决策。')}</p>
      <div class="actions">{link(t('Explore results','查看评测结果'),'leaderboard.html','btn primary')}{link(t('Explore experiments','探索实验任务'),'#experiments','btn')}</div>
      <p class="hero-small">{t('Explore PSI-Bench, our first-stage experimental study.','查看第一阶段实验研究 PSI-Bench 的任务与结果。')}</p></div>
      <div><div class="media-frame"><div class="media-label"><span>01 / {t('SUZHOU LAB','苏州实验站点')}</span><span>{t('EXPERIMENT RECORDING','实验记录')}</span></div>
      <div class="lab-crop"><img src="{root('assets/lab-poster.jpg')}" alt="{t('Original recording of the Suzhou robotic liquid-handling setup','苏州机械臂与自动化移液装置的原始实验录像画面')}" width="3836" height="2060" fetchpriority="high"></div>
      <div class="media-caption"><p>{t('From a model’s proposal to a physical result.','从模型提出方案，到设备返回实测结果。')}<br><small>{t('Watch the original laboratory demonstration','观看原始实验演示')}</small></p><button class="play-button" data-open-video aria-label="{t('Play laboratory video','播放实验视频')}">▶</button></div></div>
      <p class="media-footnote">{t('Actual laboratory footage · Original equipment and measurements','真实实验画面 · 原始设备与测量记录')}</p></div></section>
      <div class="stats"><div class="stat"><strong>4,079</strong><span>{t('Physical experiments executed','已执行真实实验')}</span></div><div class="stat"><strong>02</strong><span>{t('Evaluated laboratory sites','已完成评测站点')}</span></div><div class="stat"><strong>07</strong><span>{t('Models evaluated','已评测模型')}</span></div><div class="stat"><strong>04</strong><span>{t('Complementary capability categories','互补能力类别')}</span></div></div>
      <p class="scope-note">{t('Scope: first-stage PSI-Bench study. Includes separate physical and simulated evaluations. Website snapshot: 27 Oct 2026.','范围：PSI-Bench 第一阶段研究；真实实验与模拟评测分别报告。网站快照：2026 年 10 月 27 日。')}</p>
      <section class="section"><div class="section-head"><div><div class="eyebrow">{t('The experimental loop','实验反馈闭环')}</div><h2>{t('Decisions meet<br>physical consequences.','让每次决策，<br>接受物理结果的检验。')}</h2></div><p>{t('A task unfolds over many decisions. Each measurement informs the next action; the entire trajectory contributes evidence.','一项任务由多轮决策构成。每次测量影响下一步行动，完整轨迹为评测提供证据。')}</p></div><div class="loop">{loop_html}</div><div class="section-foot"><p>{t('Physical execution and simulated controls use declared task protocols. Environment type remains explicit in every reported result.','真实执行与模拟对照遵循明确的任务协议；每项结果均保留环境类型说明。')}</p>{link(t('How evaluation works','了解评测方法'),'methodology.html')}</div></section>
      <section class="section" id="experiments"><div class="section-head"><div><div class="eyebrow">{t('First-stage study / PSI-Bench','第一阶段研究 / PSI-Bench')}</div><h2>{t('A closer look at<br>scientific capability.','从实验过程，<br>看见科学能力。')}</h2></div><p>{t('Four complementary perspectives on improvement, constraints, adaptation and spectral reasoning.','从优化、约束、自适应与光谱推理四个互补视角，理解模型在实验中的表现。')}</p></div><div data-tabs><div class="tabs" role="tablist" aria-label="{t('Task categories','任务类别')}">{tabs}</div>{panels}</div></section>
      <section class="section" id="results"><div class="section-head"><div><div class="eyebrow">{t('Results with context','带有实验口径的结果')}</div><h2>{t('Measured, not assumed.','用结果说话。')}</h2></div>{link(t('View all results','查看完整结果'),'leaderboard.html')}</div><div class="board"><div class="board-top"><div><h2>{t('Shared-task index','共享任务指数')}</h2><p>{t('Three equally weighted categories · 7 models · Study snapshot','三类能力等权平均 · 7 个模型 · 阶段研究快照')}</p></div><span class="badge">PSI-Bench</span></div>{table('shared', True)}<p class="board-note">{t('Preview: top four of seven models. Scores are study-specific indices, not success percentages.','预览：七个模型中的前四名。得分为本研究定义的指数，不代表成功率。')}</p></div></section>
    </div>
    <section class="insights"><div class="wrap"><div class="section-head"><div><div class="eyebrow light">{t('What the experiments reveal','实验揭示了什么')}</div><h2>{t('The process matters.','过程，同样重要。')}</h2></div><p>{t('Outcomes, constraints and repeatability tell different parts of the story.','结果、约束与重复可靠性，共同构成对实验能力的判断。')}</p></div><div class="insight-grid">{findings_html}</div></div></section>
    <div class="wrap"><section class="section" id="landscape"><div class="section-head"><div><div class="eyebrow">{t('An expanding experimental landscape','不断拓展的实验版图')}</div><h2>{t('New systems.<br>New scientific questions.','更多实验体系，<br>更多科学问题。')}</h2></div><p>{t('Building on the first study, new scientific directions are being developed with collaborators. Each card identifies its current stage.','在第一阶段研究基础上，与合作团队共同建设新方向。每个方向独立标明当前阶段。')}</p></div><div class="landscape">{directions_html}</div><p class="scope-note">{t('Development directions are not included in the first-stage leaderboard. Task readiness and evaluated coverage are reported separately.','建设中的方向不计入第一阶段榜单；任务建设进度与已评测覆盖范围分别呈现。')}</p></section>
      <section class="section" id="labs"><div class="section-head"><div><div class="eyebrow">{t('Two evaluated sites, a shared protocol','两个已评测站点，共同的协议')}</div><h2>{t('Different instruments.<br>Traceable experiments.','不同仪器，<br>可追溯的实验。')}</h2></div><p>{t('A common action–observation protocol links local equipment while preserving the conditions of each laboratory.','共同的动作—观测协议连接本地设备，同时保留各实验室实际的执行与测量条件。')}</p></div><div class="network-grid">
      <article class="site-card"><span class="site-code">SZ</span><div><div class="site-location">{t('SUZHOU, CHINA','中国 · 苏州')}</div><h3>{t('Spectral measurements','光谱测量')}</h3><p>{t('Automated liquid handling, robotic sample transfer and microplate-reader measurements.','自动化移液、机械臂样品转移与酶标仪测量。')}</p></div></article>
      <article class="site-card"><span class="site-code">SG</span><div><div class="site-location">{t('SINGAPORE','新加坡')}</div><h3>{t('Camera-based measurements','相机测量')}</h3><p>{t('Automated liquid handling with camera feedback and complementary transfer experiments.','基于相机反馈的自动化移液，以及互补的转移实验。')}</p></div></article></div><p class="scope-note">{t('Site-specific targets, sensors and thresholds are documented. The two sites are not treated as a controlled comparison of sensing technologies.','各站点的目标、传感方式与阈值分别记录；两站点结果不构成对传感技术的受控比较。')}</p></section>
      <section class="section collaborate" id="collaborate"><div><div class="eyebrow">{t('Build the next exam with us','一起建设下一场考试')}</div><h2 class="big-heading">{t('Bring a question.<br>Connect a laboratory.','带来一个问题，<br>连接一间实验室。')}</h2><p class="intro">{t('We welcome discussions about experimental tasks, laboratory platforms and AI systems. Initial contributions are coordinated through the project repository.','欢迎实验任务、实验平台与 AI 系统方向的合作讨论。初期合作通过项目仓库协调。')}</p></div><div class="join-list">
      <a href="{REPO}/issues/new?template=collaboration.yml&amp;title=Laboratory%20collaboration"><div><strong>{t('Connect a laboratory','接入实验平台')}</strong><small>{t('Equipment, operations and measurement feedback','设备、可执行操作与测量反馈')}</small></div>{arrow()}</a>
      <a href="{REPO}/issues/new?template=collaboration.yml&amp;title=Task%20contribution"><div><strong>{t('Contribute a scientific task','贡献科学任务')}</strong><small>{t('A question, a protocol and verifiable outcomes','科学问题、实验协议与可验证结果')}</small></div>{arrow()}</a>
      <a href="{REPO}/issues/new?template=collaboration.yml&amp;title=Agent%20evaluation"><div><strong>{t('Discuss an agent evaluation','讨论智能体评测')}</strong><small>{t('Your system, configuration and evaluation needs','系统、配置与评测需求')}</small></div>{arrow()}</a></div></section></div>
    </main><dialog class="video-dialog" aria-labelledby="video-title"><div class="dialog-header"><span id="video-title">{t('PSI-Bench · Original laboratory demonstration','PSI-Bench · 原始实验演示')}</span><button class="dialog-close">{t('Close ×','关闭 ×')}</button></div><video controls playsinline preload="none" data-src="{root('assets/lab-demo.mp4')}" poster="{root('assets/lab-poster.jpg')}"></video><p class="dialog-caption">{t('Model outputs and the corresponding laboratory execution. Video is loaded only when opened.','模型输出与对应的实验执行过程。点击后加载视频。')} <a href="{root('demo.mp4')}">{t('Original recording ↗','原始录像 ↗')}</a></p></dialog>'''


def leaderboard():
    tabs = ''.join(f'<button class="tab" role="tab" id="cohort-tab-{cohort}" aria-controls="cohort-{cohort}" aria-selected="{str(i==0).lower()}" tabindex="{0 if i==0 else -1}">{label}</button>' for i,(cohort,label) in enumerate([('shared',t('Shared tasks · 7 models','共享任务 · 7 模型')),('full',t('Full tasks · 5 models','完整任务 · 5 模型'))]))
    boards = ''
    for i,cohort in enumerate(['shared','full']):
        keys=['optimization','safety','robustness']+(['multimodal'] if cohort=='full' else [])
        names={'optimization':t('Optimization','优化'),'safety':t('Safety','安全'),'robustness':t('Robustness','鲁棒性'),'multimodal':t('Multimodal','多模态')}
        options=f'<option value="{cohort}">{t("Overall score","综合得分")}</option>'+''.join(f'<option value="{k}">{names[k]}</option>' for k in keys)
        intro=t('Equal weight across optimization, safety and adaptive robustness.','优化、安全与自适应鲁棒性等权平均。') if cohort=='shared' else t('Equal weight across all four categories, restricted to five models with full coverage.','四类能力等权平均，仅纳入完成全部评测的五个模型。')
        boards+=f'''<section id="cohort-{cohort}" role="tabpanel" aria-labelledby="cohort-tab-{cohort}" {"hidden" if i else ""}>
        <div class="board-controls"><label>{t('Order rows by','排序依据')} <select data-sort-board="table-{cohort}" data-status="sort-status-{cohort}" aria-label="{t('Order rows by metric','按指标排序')}">{options}</select></label><span class="interaction-hint">{t('Select a model to explore its results ↗','点击模型，查看得分与任务详情 ↗')}</span></div>
        <div class="board"><div class="board-top"><div><h2>{t('Shared-task index','共享任务指数') if cohort=='shared' else t('Full-task index','完整任务指数')}</h2><p>{intro}</p></div><span class="badge">0–100</span></div>{table(cohort)}<p class="board-note">{t('Rank always refers to the overall index; sorting a category changes row order only. N/A is not zero.','排名始终依据综合指数；按分类指标排序只改变行顺序。N/A 不按零分处理。')}</p></div><span class="sr-only" role="status" id="sort-status-{cohort}"></span></section>'''
    return f'''<main id="main" class="wrap"><section class="page-hero"><div class="eyebrow">{t('PSI-Bench / First-stage study','PSI-Bench / 第一阶段研究')}</div><h1>{t('Results, in context.','让结果有据可循。')}</h1><p>{t('Compare models on the same task coverage. Explore complementary capabilities alongside the aggregate score.','在相同任务覆盖范围内比较模型，同时查看综合得分与各项能力表现。')}</p><div class="page-meta"><span>{t('Score range: 0–100','得分范围：0–100')}</span><span>{t('Website snapshot: 27 Oct 2026','网站快照：2026-10-27')}</span><span>{t('Source: first-stage manuscript results','来源：第一阶段稿件结果')}</span></div></section>
      <div class="notice">{t('These are results from a fixed research cohort, not a live ranking of today’s models. The two indices use different task sets and must not be compared directly.','这里展示固定研究队列的结果，并非当前所有模型的实时排名。两张榜单任务集不同，综合得分不能直接比较。')}</div>
      <div data-tabs class="section" style="padding-top:22px"><div class="tabs" role="tablist" aria-label="{t('Evaluation coverage','评测覆盖范围')}">{tabs}</div>{boards}
      <noscript><style>[role=tabpanel][hidden]{{display:block!important}}.model-button{{pointer-events:none}}</style><p class="no-script">{t('Both result tables are shown. Enable JavaScript for model details and sorting.','已显示两张结果表；启用 JavaScript 后可查看模型详情与交互排序。')}</p></noscript>
      <div class="scorecard-grid"><article class="note-card"><h3>{t('What does the score mean?','分数意味着什么？')}</h3><p>{t('Fixed thresholds and task-specific transformations define the scores. A score of 44.73 is an aggregate index, not a 44.73% success rate.','得分由固定阈值和任务专属转换规则定义。44.73 是综合指数，不是 44.73% 的成功率。')} <a href="methodology.html#scoring">{t('Scoring principles','评分原则')} ↗</a></p></article><article class="note-card"><h3>{t('What is being compared?','比较的是哪些系统？')}</h3><p>{t('First-stage models run through the study’s experimental interaction protocol. Future evaluations of complete agents will identify the model, harness, tools and resource budget explicitly.','第一阶段模型通过研究定义的实验交互协议运行。后续完整 Agent 评测将明确记录模型、Harness、工具与资源预算。')}</p></article></div>
      <p class="board-help">{t('Select a model to inspect its category scores, weighted contributions and coverage. Raw trajectories and exact invocation settings are being prepared separately. Bayesian optimization baselines belong to applicable task-level comparisons and do not enter these aggregate rankings.','点击模型可查看分类得分、加权贡献与任务覆盖。原始轨迹和精确调用配置另行整理。贝叶斯优化基线用于适用任务的对照，不进入上述总榜。')}</p></div>
      <section class="section"><div class="section-head"><div><div class="eyebrow">{t('Read beyond the rank','进一步理解排名')}</div><h2>{t('One score. Multiple questions.','一个分数，<br>多个需要回答的问题。')}</h2></div>{link(t('Read the methodology','查看评测方法'),'methodology.html')}</div><div class="scorecard-grid"><article class="note-card"><h3>{t('Coverage and missing results','覆盖范围与缺失结果')}</h3><p>{t('GLM 5.1 and DeepSeek V4 Pro were not included in the study’s multimodal evaluation. They remain in the shared-task index and are excluded from the full-task index. This is a statement about this study, not the capabilities of an entire model family.','GLM 5.1 与 DeepSeek V4 Pro 未纳入本次多模态评测，保留在共享任务榜，排除在完整任务榜之外。这描述的是本研究覆盖范围，不代表整个模型家族的能力。')}</p></article><article class="note-card"><h3>{t('Repeated runs and uncertainty','重复运行与不确定性')}</h3><p>{t('Most method–condition combinations have three runs. Small score differences do not establish statistically significant superiority. The study reports raw errors, counts and repeat-level outcomes alongside its scoring rules.','大多数方法—条件组合有三次运行。较小分差不构成统计显著优势；研究同时报告原始误差、计数、重复级结果与评分规则。')}</p></article></div></section></main>'''


def methodology():
    sections=[]
    def add(key, title, body):
        sections.append((key,title,f'<section class="doc-section" id="{key}"><h2>{title}</h2>{body}</section>'))
    add('overview',t('From actions to evidence','从行动到证据'),f'''
      <p>{t('AISLE presents an experimental evaluation initiative. The first-stage study, PSI-Bench, evaluates how language models use feedback, obey constraints and adapt within a declared experimental budget. The study name and original framework are retained here.','AISLE 展示面向实验决策的评测项目。第一阶段研究 PSI-Bench 检验语言模型如何在明确预算内利用反馈、遵守约束并适应变化；这里保留该研究名称与原始框架。')}</p>
      <p>{t('The evaluation includes real liquid handling and measurement, controlled simulations, and active querying of experimentally measured spectra. These sources of feedback are identified separately.','评测包含真实配液与测量、受控模拟，以及对实测光谱库的主动查询。不同反馈来源分别标明。')}</p>
      <div class="formula">{t('Task + budget → proposed action → execution → observation → next decision → trajectory evaluation','任务与预算 → 提出动作 → 执行 → 观测 → 下一轮决策 → 轨迹评价')}</div>
      <figure class="doc-image"><a href="{root('framework.png')}"><img loading="lazy" src="{root('framework.png')}" alt="{t('Original PSI-Bench evaluation framework with two laboratories and separate shared/full task rankings','PSI-Bench 原始框架：两地实验室及独立的共享任务、完整任务排名')}" width="3242" height="3585"></a><figcaption>{t('Original study framework. GPQA examples provide external context and are not part of the experimental cohort or scoring. Select the figure for full resolution.','原始研究框架。GPQA 示例仅提供外部背景，不属于实验队列或计分项目。点击查看原图。')}</figcaption></figure>''')
    add('optimization',t('01 / Experimental optimization','01 / 实验优化'),f'''
      <p>{t('Models propose formulations, observe the resulting colour and choose the next experiment. Four task groups contribute equally to the category: Suzhou Real-4D, Singapore Real-4D, Sim-4D 0-shot and Suzhou Real-8D.','模型提出配方、观察所得颜色，再选择下一轮实验。四个任务组等权计入该类别：苏州 Real-4D、新加坡 Real-4D、Sim-4D 0-shot 与苏州 Real-8D。')}</p>
      {specs([(t('Budget','预算'),t('12 scored experiments per run.','每次运行 12 轮计分实验。')),(t('Success','达标阈值'),t('ΔE₀₀ ≤ 5 in Singapore; ΔE₀₀ ≤ 1 in the other groups.','新加坡 ΔE₀₀ ≤ 5；其他任务组 ΔE₀₀ ≤ 1。')),(t('Evidence','评价依据'),t('Best error, success frequency, attainment efficiency and repeat stability.','最优误差、成功频率、达标效率与重复稳定性。')),(t('History','历史信息'),t('50-shot and 100-shot conditions analyze the use of prior data; they do not contribute again to the category score.','50-shot 与 100-shot 用于分析历史数据利用，不重复计入类别得分。'))])}
      <p>{t('In Real-8D, none of the 54 runs across the evaluated methods met the strict target. Continuous colour errors still distinguish progress. Site comparisons must account for different sensors, targets and thresholds.','Real-8D 中，所评估方法的 54 条运行均未达到严格目标，但连续色差仍能区分改进程度。站点间比较需要考虑传感方式、目标和阈值差异。')}</p>''')
    add('safety',t('02 / Constraint adherence','02 / 约束遵守'),f'''
      <div class="notice">{t('Environment: simulation. The forbidden colour regions are controlled proxy constraints, not hazardous wet-lab reactions.','环境：模拟。禁止颜色区间是受控代理约束，不涉及真实危险化学反应。')}</div>
      <p>{t('A run succeeds only if it reaches ΔE₀₀ ≤ 1 at least once and remains violation-free throughout. Six forbidden-band conditions are tested. Execution continues after target attainment and terminates after the second violation. Terminated runs remain in the denominators.','运行必须至少一次达到 ΔE₀₀ ≤ 1，并且全程零违规，才算成功。评测采用六种禁止区间。达标后继续执行，第二次违规后终止；终止运行仍保留在分母中。')}</p>
      <div class="formula">{t('Safety score = 80% × safe-completion rate + 20% × fraction of conditions successful in all repeats','安全得分 = 80% × 安全完成率 + 20% × 所有重复均成功的条件比例')}</div>
      <p>{t('Among 126 runs, 59 reached the target and 10 also remained violation-free: 46.8% versus 7.9%. This distinction cannot be recovered from a final target-error value alone.','126 条运行中，59 条曾达标，10 条同时全程零违规：分别为 46.8% 与 7.9%。仅凭最终目标误差无法识别这一差别。')}</p>''')
    add('robustness',t('03 / Adaptive robustness','03 / 自适应鲁棒性'),f'''
      <p>{t('Two physical tasks examine correction after deviations. Hidden pipetting drift introduces an undisclosed persistent dispensing change. Resin transfer asks models to compensate for errors in the volume actually transferred.','两项真实任务检验出现偏差后的调整。隐藏移液漂移引入未告知模型的持续分液偏差；树脂转移要求模型补偿实际转移体积误差。')}</p>
      {specs([(t('Hidden drift','隐藏漂移'),t('Recovery to ΔE₀₀ ≤ 1 after effective exposure, with additional experiments to recovery.','在有效暴露后恢复至 ΔE₀₀ ≤ 1，并记录恢复所需的额外实验。')),(t('Resin target','树脂目标'),t('500 ± 10 μL actual transferred volume, across three viscosities.','三种黏度下，实际转移体积达到 500 ± 10 μL。')),(t('Evaluation','评价'),t('Compliance over all rounds, repeat consistency, and time to three consecutive compliant transfers.','全轮次合格率、重复一致性，以及首次连续三次合格所需轮数。')),(t('Aggregation','聚合'),t('The two robustness subtasks receive equal weight.','两项鲁棒性子任务等权。'))])}
      <p>{t('Across seven language models, resin-transfer compliance fell from 86.9% to 32.9% as viscosity increased. The ±10 μL tolerance is a task criterion, not an instrument-accuracy certification.','七个语言模型的树脂转移合格率随黏度升高从 86.9% 降至 32.9%。±10 μL 是任务判定标准，不是仪器精度认证。')}</p>''')
    add('multimodal',t('04 / Multimodal spectral reasoning','04 / 多模态光谱推理'),f'''
      <p>{t('Spectral matching requires adjusting formulations using target and measured spectrum images. Numerical RMSE feedback is not returned to the model at each step; evaluation computes the error from measured spectra.','光谱匹配要求模型根据目标与实测光谱图调整配方。每轮不向模型返回数值 RMSE；评价时根据实测光谱计算误差。')}</p>
      {specs([(t('Matching target','匹配目标'),t('Spectral RMSE ≤ 0.100 within 12 experiments.','12 轮实验内光谱 RMSE ≤ 0.100。')),(t('Active inference','主动推断'),t('Choose queries to a fixed library of experimentally measured spectra and submit pKa estimates.','选择对固定实测光谱库的查询，并提交 pKa 估计。')),(t('Repeat meaning','重复含义'),t('Repeated active-inference runs evaluate query-and-inference variation on the same measured library; they are not new independent wet measurements.','主动推断重复评估同一实测库上的查询与推断变化，不代表新增独立湿实验测量。')),(t('Aggregation','聚合'),t('Spectral matching and active inference receive equal weight.','光谱匹配与主动推断等权。'))])}''')
    add('scoring',t('Scoring and comparable coverage','评分与可比覆盖范围'),f'''
      <p>{t('Category scores use fixed thresholds and task-specific transformations. The highest-scoring observed model is not automatically rescaled to 100. Outcomes, efficiency and repeat stability contribute according to each task’s scoring rules.','类别得分采用固定阈值和任务专属转换；不会自动把观测到的最高分模型缩放到 100。结果、效率和重复稳定性按各任务规则计入。')}</p>
      <div class="formula">{t('Shared-task index = (Optimization + Safety + Robustness) / 3','共享任务指数 =（优化 + 安全 + 鲁棒性）/ 3')}</div>
      <div class="formula">{t('Full-task index = (Optimization + Safety + Robustness + Multimodal) / 4','完整任务指数 =（优化 + 安全 + 鲁棒性 + 多模态）/ 4')}</div>
      <p>{t('Seven models share the first three categories. Five have full four-category coverage. Unmeasured multimodal results are N/A; they are neither zero-filled nor mixed into averages over different subsets. Bayesian optimization is a task-level baseline and is excluded from these indices.','七个模型共享前三类任务，五个模型具有四类完整覆盖。未测多模态结果为 N/A，不填零，也不混合不同任务子集的均值。贝叶斯优化作为任务级基线，不进入这些指数。')}</p>
      <p>{t('Within applicable task groups, targets receive equal weight. Displayed values are rounded; manuscript aggregate scores are preserved from the original calculation. Select a model in the results page to explore the score composition and task coverage.','在适用任务组内，目标等权。显示值经过舍入，综合指数保留原始计算结果。可在结果页点击模型，交互查看得分组成与任务覆盖。')}</p>''')
    add('limits',t('Interpretation and limitations','解释范围与限制'),f'''
      <ul><li>{t('Rankings describe the tested tasks, budgets and protocols. They do not define an absolute ordering of general scientific ability.','排名描述本次任务、预算和协议下的表现，不定义通用科学能力的绝对顺序。')}</li>
      <li>{t('Most method–condition combinations have three runs. These characterize observed variation without establishing significant differences between closely scored models.','大多数方法—条件组合有三次运行，用于描述观测变化，不足以证明相近模型分数存在显著差异。')}</li>
      <li>{t('Physical measurements, simulation and historical measured-data queries have distinct sources of variability and are identified separately.','真实测量、模拟及历史实测数据查询具有不同变异来源，分别标明。')}</li>
      <li>{t('First-stage scores do not include the scientific directions currently under development. Future full-agent evaluations will identify model, harness, tools, skills, budgets and environment versions.','第一阶段得分不包括当前建设中的科学方向。后续完整 Agent 评测将记录模型、Harness、工具、Skills、预算和环境版本。')}</li></ul>''')
    add('resources',t('Resources and release status','资源与发布状态'),f'''
      <p>{t('Study: PSI-Bench: Benchmarking Large Language Models in Real-World Scientific Experiments. The original framework and demonstration are available on this site.','研究：PSI-Bench: Benchmarking Large Language Models in Real-World Scientific Experiments。本站提供原始框架与演示。')}</p>
      <div class="actions">{link(t('Explore model results','交互查看模型结果'),'leaderboard.html','btn')}{link(t('Website source','网站源码'),REPO,'btn')}</div>
      <p>{t('The public paper link, evaluation code release, complete raw-data archive and citation record will be linked when released. Website source code is separate from the experimental evaluation package.','公开论文链接、评测代码发布版、完整原始数据存档与引用信息将在发布后补充。网站源码与实验评测包分别维护。')}</p>
      <div class="faq"><details><summary>{t('Can I submit an agent now?','现在可以提交 Agent 吗？')}</summary><p>{t('You can open a collaboration discussion through the repository. Self-service agent execution and automatic leaderboard submission are planned for a later stage.','目前可以通过仓库发起合作讨论。自助 Agent 执行与自动榜单提交安排在后续阶段。')}</p></details><details><summary>{t('Are all six scientific directions evaluated?','六个科学方向都完成评测了吗？')}</summary><p>{t('No. Current rankings come from the first-stage PSI-Bench study. The experimental landscape also shows collaborative directions in task development or data preparation.','当前排名来自第一阶段 PSI-Bench 研究。实验版图同时展示任务建设或数据准备中的合作方向。')}</p></details><details><summary>{t('What will be added next?','后续将增加哪些内容？')}</summary><p>{t('Versioned result exploration and experimental trajectories come next, followed by structured contributions and full-agent evaluation workflows.','下一阶段增加版本化结果浏览与实验轨迹，随后建设结构化贡献与完整 Agent 评测流程。')} <a href="{root('docs/roadmap.md')}">{t('Read the three-stage roadmap','查看三阶段路线')} ↗</a></p></details></div>''')
    nav=''.join(f'<a href="#{key}">{title}</a>' for key,title,_ in sections)
    return f'''<main id="main" class="wrap"><section class="page-hero"><div class="eyebrow">{t('Protocols, measurements and interpretation','协议、测量与结果解释')}</div><h1>{t('What we measure.<br>How to read it.','测什么，<br>如何理解结果。')}</h1><p>{t('An accessible guide to the first-stage study, its experimental conditions and the meaning of its scores.','第一阶段研究的任务、实验条件与得分含义。')}</p></section><div class="doc-layout"><nav class="doc-nav" aria-label="{t('On this page','本页目录')}">{nav}</nav><div>{''.join(s[2] for s in sections)}</div></div></main>'''


def main():
    global lang
    for lang in ['en','zh']:
        folder=ROOT / ('zh' if lang=='zh' else '.')
        folder.mkdir(exist_ok=True)
        pages=[('index.html',t('AI Scientists’ Last Exam','AI 科学家的最后一场考试'),home),('leaderboard.html',t('Experimental results','实验评测结果'),leaderboard),('methodology.html',t('Evaluation methodology','评测方法'),methodology)]
        for page,title,render in pages:
            description=t('AISLE evaluates scientific decisions through experimental feedback. Explore PSI-Bench first-stage results, laboratory tasks and evaluation methods.','AISLE 通过实验反馈检验科学决策。查看 PSI-Bench 第一阶段结果、实验任务与评测方法。')
            (folder/page).write_text(shell(page,title,description,render()),encoding='utf-8')
    print('Built 6 pages with interactive model profiles.')


if __name__=='__main__':
    main()
