"""Result tables, rankings and accessible cohort tabs."""

from ..context import ROOT, PUBLIC, DATA, MODELS, esc, root

LOGOS = {
    "gpt": "GPT",
    "glm": "GLM",
    "qwen": "Qwen",
    "claude": "Claude",
    "gemini": "Gemini",
    "deepseek": "DeepSeek",
    "kimi": "Kimi",
}
CATEGORY_COLORS = {
    "optimization": "#75a7ff",
    "safety": "#ffc86a",
    "robustness": "#49ddcc",
    "multimodal": "#c19bff",
}


def table(cohort, preview=False):
    models = sorted(
        [m for m in MODELS if m[cohort] is not None], key=lambda m: -m[cohort]
    )
    if preview:
        models = models[:4]
    keys = ["optimization", "safety", "robustness", "multimodal"]
    names = {
        "optimization": "Optimization",
        "safety": "Safety",
        "robustness": "Robustness",
        "multimodal": "Multimodal",
    }
    heads = "".join(f'<th scope="col">{names[k]}</th>' for k in keys)
    rows = ""
    for rank, m in enumerate(models, 1):
        attrs = " ".join(f'data-{k}="{m[k]}"' for k in [cohort] + keys)
        scores = "".join(
            f'<td data-metric="{k}">{m[k]:.2f}</td>'
            if m[k] is not None
            else f'<td class="na" data-metric="{k}">N/A</td>'
            for k in keys
        )
        rows += f'''<tr {attrs} data-name="{esc(m["name"])}" data-profile="{m["id"]}" data-cohort="{cohort}"><td>{rank:02}</td><th scope="row" class="model-name"><button class="model-button" aria-expanded="false" aria-controls="model-details-{cohort}" aria-label="View details for {esc(m["name"])}">{logo(m)}{esc(m["name"])}<span aria-hidden="true">↗</span></button><small>{esc(m["organization"])}</small></th>
        <td class="score-cell"><span class="score-number">{m[cohort]:.2f}</span><div class="score-track" aria-hidden="true"><div class="score-fill" style="width:{m[cohort]}%"></div></div></td>{scores}</tr>'''
    return f"""<div class="table-scroll" tabindex="0" role="region" aria-label="Scrollable results table"><table class="results-table" id="table-{cohort}{"-preview" if preview else ""}">
    <caption class="sr-only">Study scores from 0 to 100. Rank refers to the aggregate score.</caption>
    <thead><tr><th scope="col">Rank</th><th scope="col">Model</th><th scope="col">Overall / 100</th>{heads}</tr></thead><tbody>{rows}</tbody></table></div>"""


def logo(m):
    return f'<img loading="lazy" decoding="async" src="{root("assets/logos/" + LOGOS[m["id"]] + ".webp")}" alt="{esc(LOGOS[m["id"]])} logo" width="32" height="32">'


def category_names():
    return {
        "optimization": "Optimization",
        "safety": "Safety",
        "robustness": "Robustness",
        "multimodal": "Multimodal",
    }


def chart(cohort):
    models = sorted(
        [m for m in MODELS if m[cohort] is not None], key=lambda m: -m[cohort]
    )
    keys = ["optimization", "safety", "robustness"] + (
        ["multimodal"] if cohort == "full" else []
    )
    names = category_names()
    legend = (
        f'<button type="button" data-chart-metric="{cohort}" aria-pressed="true">Overall</button>'
        + "".join(
            f'<button type="button" data-chart-metric="{k}" aria-pressed="false"><i style="background-color:{CATEGORY_COLORS[k]}"></i>{names[k]}</button>'
            for k in names
        )
    )
    rows = ""
    for rank, m in enumerate(models, 1):
        segments = "".join(
            f'<span class="stack-segment" data-metric="{k}" style="width:{m[k] / len(keys):.4f}%;background-color:{CATEGORY_COLORS[k]}"></span>'
            for k in keys
        )
        values = "; ".join(f"{names[k]} {m[k]:.2f}" for k in keys)
        rows += f'<button class="stack-row" data-profile="{m["id"]}" data-cohort="{cohort}" aria-expanded="false" aria-controls="model-details-{cohort}" aria-label="{esc(m["name"])} · Overall {m[cohort]:.2f}. {esc(values)}"><span class="stack-rank">{rank}</span><span class="stack-model">{logo(m)}<span><strong>{esc(m["name"])}</strong><small>{esc(m["organization"])}</small></span></span><strong class="stack-score">{m[cohort]:.2f}</strong><span class="stack-track" aria-hidden="true">{segments}</span></button>'
    return f'''<div class="leaderboard-card stacked-board" data-chart-cohort="{cohort}"><div class="stack-header"><span>AISLE · {len(models)} models</span><div class="stack-legend" role="group" aria-label="View scores by category">{legend}</div></div><div class="stack-columns"><span>#</span><span>Model</span><span data-score-heading>Overall</span><span data-bar-heading>Category contributions</span></div><div class="stack-rows">{rows}</div><div class="stack-scale"><span>0</span><span>25</span><span>50</span><span>75</span><span>100</span></div><p class="stack-note" role="status">Equal category weights. Select a category above or a model for details.</p><section class="model-details" id="model-details-{cohort}" aria-label="Model details" hidden></section></div>'''


def category_ranking(key):
    models = sorted(MODELS, key=lambda m: -(m[key] if m[key] is not None else -1))
    rows = ""
    for m in models:
        score = m[key]
        rank = (
            str(1 + sum(x[key] is not None and x[key] > score for x in models))
            if score is not None
            else "—"
        )
        value = f"{score:.2f}" if score is not None else "N/A"
        bar = (
            f'<span style="width:{score}%;background-color:{CATEGORY_COLORS[key]}"></span>'
            if score is not None
            else ""
        )
        rows += f'<li class="category-row"><span class="category-rank">{rank}</span><span class="category-model">{logo(m)}<span>{esc(m["name"])}</span></span><span class="category-track" aria-hidden="true">{bar}</span><strong>{value}</strong></li>'
    return f'<div class="category-results"><div class="category-results-head"><h4>Category ranking</h4><span>Score / 100</span></div><ol class="category-ranks">{rows}</ol><p class="category-note">Scores are aggregated within this category. N/A = not evaluated.</p></div>'


def score_breakdown(cohort):
    names = {
        "optimization": "Optimization",
        "safety": "Safety",
        "robustness": "Robustness",
    }
    if cohort == "full":
        names["multimodal"] = "Multimodal"
    options = f'<option value="{cohort}">Overall</option>' + "".join(
        f'<option value="{key}">{label}</option>' for key, label in names.items()
    )
    note = (
        "Overall averages optimization, safety and robustness. Multimodal is shown separately; N/A means not evaluated."
        if cohort == "shared"
        else "Overall averages all four categories."
    )
    return f'<div class="board-controls"><h3>Category scores</h3><label>Sort by <select data-sort-board="table-{cohort}" data-status="sort-status-{cohort}">{options}</select></label></div><div class="board">{table(cohort)}<p class="board-note">{note}</p></div><span class="sr-only" role="status" id="sort-status-{cohort}"></span>'


def chart_tabs():
    tabs = ""
    panels = ""
    for i, cohort in enumerate(["shared", "full"]):
        label = (
            "Shared tasks · 7 models" if cohort == "shared" else "Full tasks · 5 models"
        )
        tabs += f'<button class="tab" role="tab" id="home-tab-{cohort}" aria-controls="home-{cohort}" aria-selected="{str(i == 0).lower()}" tabindex="{0 if i == 0 else -1}">{label}</button>'
        panels += f'<div role="tabpanel" id="home-{cohort}" aria-labelledby="home-tab-{cohort}" {"hidden" if i else ""}>{chart(cohort)}<details class="score-details"><summary>Detailed scores</summary>{score_breakdown(cohort)}</details></div>'
    return f'<div data-tabs><div class="tabs" role="tablist" aria-label="Evaluation coverage">{tabs}</div>{panels}</div>'
