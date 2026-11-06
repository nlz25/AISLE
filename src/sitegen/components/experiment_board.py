"""One leaderboard, with explicit environment and comparable coverage views."""
import json
from ..context import ROOT, MODELS, esc
from .results import CATEGORY_COLORS, category_names, logo

SCORES = json.loads((ROOT / 'data/experiment-scores.json').read_text())['models']
MODES = {'all': 'All experiments', 'wet': 'Wet experiments', 'dry': 'Dry experiments'}
CATEGORIES = {'all': ['optimization', 'safety', 'robustness', 'multimodal'],
              'wet': ['optimization', 'robustness', 'multimodal'],
              'dry': ['optimization', 'safety']}
LABELS = {**category_names(), 'suzhou4d': 'Platform A 4D', 'singapore4d': 'Platform B 4D',
          'real8d': 'Platform A 8D', 'optimization_dry': 'Sim-4D',
          'drift': 'Hidden drift', 'resin': 'Resin transfer', 'pka': 'pKa', 'spectrum': 'Spectrum matching'}


def category_score(model_id, mode, category):
    key = f'optimization_{mode}' if category == 'optimization' else category
    return SCORES[model_id][key]


def ranking(mode, category='overall', coverage='full'):
    keys = CATEGORIES[mode] if category == 'overall' else [category]
    if category == 'overall' and coverage == 'shared':
        keys = [key for key in keys if key != 'multimodal']
    rows = []
    for model in MODELS:
        values = [category_score(model['id'], mode, key) for key in keys]
        if any(value is None for value in values):
            continue
        rows.append({'model': model, 'values': values, 'score': sum(values) / len(values)})
    rows.sort(key=lambda row: -row['score'])
    for row in rows:
        row['rank'] = 1 + sum(other['score'] > row['score'] for other in rows)
    return keys, rows


def breakdown(mode, category):
    if category == 'optimization':
        return (['suzhou4d', 'singapore4d', 'real8d'] if mode != 'dry' else []) + (['optimization_dry'] if mode != 'wet' else [])
    return {'robustness': ['drift', 'resin'], 'multimodal': ['pka', 'spectrum']}.get(category, [])


def panel(mode, category, coverage):
    keys, rows = ranking(mode, category, coverage)
    overall = category == 'overall'
    details = keys if overall else breakdown(mode, category)
    label = 'Overall' if overall else LABELS[category]
    body = ''
    for row in rows:
        model, score = row['model'], row['score']
        segments = ''.join(f'<span tabindex="0" data-module-score="{esc(LABELS[key])}: {value:.2f} / 100" aria-label="{esc(LABELS[key])}: {value:.2f} out of 100" style="width:{value / len(keys):.8f}%;background:{CATEGORY_COLORS[key]}"></span>' for key, value in zip(keys, row['values']))
        cells = ''.join(f'<td>{(category_score(model["id"], mode, key) if overall else SCORES[model["id"]][key]):.2f}</td>' for key in details)
        body += f'<tr data-ranked-model="{model["id"]}" data-score="{score}"><td>{row["rank"]}</td><th scope="row"><span class="experiment-model">{logo(model)}<span>{esc(model["name"])}<small>{esc(model["organization"])}</small></span></span></th><td><strong>{score:.2f}</strong></td><td class="experiment-bar-cell"><span class="experiment-bar" aria-label="{esc(label)}: {score:.2f} out of 100">{segments}</span></td>{cells}</tr>'
    heads = ''.join(f'<th scope="col">{esc(LABELS[key])}</th>' for key in details)
    note = '' if overall else {
        'optimization': {'all': 'Four conditions, equal weights.', 'wet': 'Three physical conditions, equal weights.', 'dry': 'Sim-4D, 0-shot; few-shot controls excluded.'}[mode],
        'safety': 'Safe completion 80% · All-repeat success 20%.',
        'robustness': 'Hidden drift 50% · Resin transfer 50%.',
        'multimodal': 'pKa 50% · Spectrum matching 50%.'}[category]
    note_html = f'<p class="experiment-note">{note}</p>' if note else ''
    bar_head = f'<th scope="col">{"Contributions" if overall else "Score / 100"}</th>'
    ident = f'experiment-{mode}-{category}-{coverage}'
    visible = mode == 'all' and overall and coverage == 'full'
    return f'''<section id="{ident}" data-ranking-panel data-mode="{mode}" data-category="{category}" data-coverage="{coverage}" aria-label="{MODES[mode]} · {label} · {coverage}" {'' if visible else 'hidden'}>
    <div class="table-scroll experiment-table-scroll" role="region" tabindex="0" aria-label="{MODES[mode]} {label} scores"><table class="results-table experiment-table"><caption class="sr-only">{MODES[mode]} · {label}. Scores 0–100; equal scores share a rank.</caption><thead><tr><th scope="col">Rank</th><th scope="col">Model</th><th scope="col">Score</th>{bar_head}{heads}</tr></thead><tbody>{body}</tbody></table></div>{note_html}</section>'''


def leaderboard_explorer():
    modes = ''.join(f'<button type="button" class="tab" data-experiment-mode="{key}" aria-pressed="{str(key == "all").lower()}">{label}</button>' for key, label in MODES.items())
    categories = ''.join(f'<button type="button" data-experiment-category="{key}" aria-pressed="{str(key == "overall").lower()}">{label}</button>' for key, label in {'overall': 'Overall', **category_names()}.items())
    panels = ''
    for mode in MODES:
        for category in ['overall'] + CATEGORIES[mode]:
            coverages = ['full', 'shared'] if category == 'overall' and mode != 'dry' else ['full']
            for coverage in coverages:
                panels += panel(mode, category, coverage)
    return f'''<div class="experiment-explorer" data-experiment-explorer><div class="tabs" role="group" aria-label="Experiment type">{modes}</div><div class="experiment-toolbar"><div class="stack-legend" role="group" aria-label="Task category">{categories}</div><label class="experiment-coverage">Coverage <select data-experiment-coverage aria-label="Comparable evaluation coverage"><option value="full">Full coverage · 5 models</option><option value="shared">Shared categories · 7 models</option></select></label></div><p class="sr-only" role="status" data-ranking-status></p>{panels}<noscript><style>[data-ranking-panel][hidden]{{display:block!important}}</style><p>All score tables are shown. Enable JavaScript to filter.</p></noscript></div>'''
