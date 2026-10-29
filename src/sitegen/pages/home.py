"""English home page."""

from ..context import ROOT, PUBLIC, DATA, MODELS, esc, root
from ..components.ui import link, specs
from ..components.results import (
    chart,
    chart_tabs,
    category_ranking,
    category_names,
    table,
)
from ..components.portal import entrance
from ..components.network import network_hero
from ..components.institutions import institutions
from ..components.quotation import experiment_quotation


def home():
    categories = [
        (
            "optimization",
            "Optimization",
            "Colour matching",
            "Optimize formulations using experimental feedback.",
            "Physical + simulated",
            [
                ("Tasks", "4-component and 8-component colour matching"),
                ("Decisions", "Formulation volumes; use of prior observations"),
                ("Budget", "12 scored experiments per run"),
                (
                    "Evidence",
                    "Colour error, attainment, efficiency and repeat stability",
                ),
            ],
        ),
        (
            "safety",
            "Safety",
            "Constrained colour matching",
            "Reach the colour target while avoiding forbidden regions.",
            "Simulated constraint task",
            [
                ("Tasks", "Colour matching with six forbidden-band conditions"),
                ("Decisions", "Balance target improvement with constraint adherence"),
                ("Coverage", "126 runs across seven models"),
                ("Evidence", "Safe completion and consistency across repeats"),
            ],
        ),
        (
            "robustness",
            "Robustness",
            "Drift recovery & resin transfer",
            "Correct pipetting errors using measurement feedback.",
            "Physical experiments",
            [
                ("Tasks", "Hidden drift; resin transfer at three viscosities"),
                (
                    "Decisions",
                    "Update formulations or aspiration volumes from feedback",
                ),
                ("Target", "Drift recovery; transferred volume of 500 ± 10 μL"),
                ("Evidence", "Recovery, all-round compliance and repeat consistency"),
            ],
        ),
        (
            "multimodal",
            "Multimodal",
            "Spectral matching & pKa inference",
            "Use measured spectra to adjust formulations and estimate pKa.",
            "Wet measurements + measured-data queries",
            [
                ("Tasks", "Spectral matching; active pKa inference"),
                ("Feedback", "Spectrum images or queries to measured spectra"),
                ("Coverage", "Five evaluated image-input models"),
                ("Evidence", "Spectral error, inference accuracy and query efficiency"),
            ],
        ),
    ]
    tabs = "".join(
        f'<button class="tab" role="tab" id="tab-{k}" aria-controls="panel-{k}" aria-selected="{str(i == 0).lower()}" tabindex="{0 if i == 0 else -1}">{name}</button>'
        for i, (k, name, *_) in enumerate(categories)
    )
    panels = "".join(
        f'<div class="task-panel task-breakdown" id="panel-{k}" role="tabpanel" aria-labelledby="tab-{k}" {"hidden" if i else ""}><div class="task-brief"><span class="badge">{badge}</span><h3>{heading}</h3><p class="task-summary">{summary}</p>{specs(rows)}{link("Task details", "tasks.html#" + k)}</div>{category_ranking(k)}</div>'
        for i, (k, name, heading, summary, badge, rows) in enumerate(categories)
    )
    return f"""<main id="main">
    {entrance()}
    <noscript><style>#research-content[hidden]{{display:block!important}}</style></noscript>
    <div id="research-content" hidden>
    {network_hero()}
    <div class="wrap">
      <div class="stats"><div class="stat"><strong><span data-count="4079" data-count-digits="1" aria-hidden="true">4,079</span><span class="sr-only">4,079</span></strong><span>Physical experiments</span></div><div class="stat"><strong><span data-count="2" data-count-digits="2" aria-hidden="true">02</span><span class="sr-only">02</span></strong><span>Laboratories</span></div><div class="stat"><strong><span data-count="7" data-count-digits="2" aria-hidden="true">07</span><span class="sr-only">07</span></strong><span>Models evaluated</span></div><div class="stat"><strong><span data-count="4" data-count-digits="2" aria-hidden="true">04</span><span class="sr-only">04</span></strong><span>Task categories</span></div></div>
      <p class="scope-note">AISLE includes physical experiments and simulated tasks.</p>
      {experiment_quotation()}
      <section class="section home-leaderboard" id="results"><div class="section-head"><h2>Leaderboard</h2>{link("Full leaderboard", "leaderboard.html")}</div>{chart_tabs()}</section>
      <section class="section" id="experiments"><div class="section-head"><div><h2>Task Breakdown</h2></div></div><div data-tabs><div class="tabs" role="tablist" aria-label="Task categories">{tabs}</div>{panels}</div></section>
      {institutions()}
</div></div>
    </main>"""
