"""English leaderboard page."""

from ..context import ROOT, PUBLIC, DATA, MODELS, esc, root
from ..components.ui import link, specs
from ..components.results import (
    chart,
    chart_tabs,
    category_ranking,
    category_names,
    table,
)


def leaderboard():
    tabs = "".join(
        f'<button class="tab" role="tab" id="cohort-tab-{cohort}" aria-controls="cohort-{cohort}" aria-selected="{str(i == 0).lower()}" tabindex="{0 if i == 0 else -1}">{label}</button>'
        for i, (cohort, label) in enumerate(
            [("shared", "Shared tasks · 7 models"), ("full", "Full tasks · 5 models")]
        )
    )
    boards = ""
    for i, cohort in enumerate(["shared", "full"]):
        keys = ["optimization", "safety", "robustness"] + (
            ["multimodal"] if cohort == "full" else []
        )
        names = {
            "optimization": "Optimization",
            "safety": "Safety",
            "robustness": "Robustness",
            "multimodal": "Multimodal",
        }
        options = f'<option value="{cohort}">Overall score</option>' + "".join(
            f'<option value="{k}">{names[k]}</option>' for k in keys
        )
        intro = (
            "Equal weight across optimization, safety and adaptive robustness."
            if cohort == "shared"
            else "Equal weight across all four categories, restricted to five models with full coverage."
        )
        boards += f"""<section id="cohort-{cohort}" role="tabpanel" aria-labelledby="cohort-tab-{cohort}" {"hidden" if i else ""}>
        {chart(cohort)}<details class="score-details"><summary>Detailed scores</summary><div class="board-controls"><label>Order rows by <select data-sort-board="table-{cohort}" data-status="sort-status-{cohort}" aria-label="Order rows by metric">{options}</select></label><span class="interaction-hint">Select a model to view category scores.</span></div>
        <div class="board"><div class="board-top"><div><h2>{"Shared-task index" if cohort == "shared" else "Full-task index"}</h2><p>{intro}</p></div><span class="badge">0–100</span></div>{table(cohort)}<p class="board-note">Rank uses the overall score. In shared tasks, multimodal is displayed but excluded from the overall score. N/A means not evaluated.</p></div><span class="sr-only" role="status" id="sort-status-{cohort}"></span></details></section>"""
    return f"""<main id="main" class="wrap"><section class="page-hero"><div class="eyebrow">AISLE</div><h1>Leaderboard</h1><p>Overall and category scores for the AISLE evaluation.</p><div class="page-meta"><span>Score range: 0–100</span><span>Website snapshot: 27 Oct 2026</span></div></section>
      <div class="notice">These are results from a fixed research cohort, not a live ranking of today’s models. The two indices use different task sets and must not be compared directly.</div>
      <div data-tabs class="section" style="padding-top:22px"><div class="tabs" role="tablist" aria-label="Evaluation coverage">{tabs}</div>{boards}
      <noscript><style>[role=tabpanel][hidden]{{display:block!important}}.model-button{{pointer-events:none}}</style><p class="no-script">Both result tables are shown. Enable JavaScript for model details and sorting.</p></noscript>
      <p class="board-help">Scores are equally weighted category indices, not success rates. Shared tasks compare seven models across three categories; full tasks compare five models across four categories. N/A results are excluded, not scored as zero. <a class="text-link" href="tasks.html#scoring">Scoring details ↗</a></p></div></main>"""
