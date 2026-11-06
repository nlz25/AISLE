"""Import full-precision task scores without generating or modifying paper figures.

Usage: python scripts/import_experiment_scores.py /path/to/PSI-Bench-v2
Requires the paper scoring environment (numpy, pandas, matplotlib, Pillow).
"""
import csv
import importlib.util
import json
from pathlib import Path
import sys

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[1]
IDS = dict(zip(
    ['gpt', 'glm', 'qwen', 'claude', 'gemini', 'deepseek', 'kimi'],
    ['gpt-5.5', 'glm-5.1', 'qwen3.6-plus', 'claude-sonnet-4-6',
     'gemini-3.1-pro-preview', 'deepseek-v4-pro', 'kimi-k2.6']))


def module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    result = importlib.util.module_from_spec(spec)
    sys.modules[name] = result
    spec.loader.exec_module(result)
    return result


def main(package):
    opt_path = '01_optimization/00_figure_2_optimization/data/optimization_score_bars_singapore5.csv'
    safety_path = '02_safety/sim_color_constraints/data/safety_valid_completion_runs.csv'
    robust_path = '03_robustness/00_figure_robustness/plot_robustness_journal.py'
    multi_path = '04_multimodal_spectral_reasoning/00_figure_multimodal/plot_multimodal_journal.py'
    with (package / opt_path).open() as handle:
        opt = {row['model']: row for row in csv.DictReader(handle)}
    with (package / safety_path).open() as handle:
        safety = list(csv.DictReader(handle))
    robust = module('aisle_import_robustness', package / robust_path).calculate_scores()[0]
    multi = module('aisle_import_multimodal', package / multi_path).calculate_scores()[-1]
    models = {}
    for key, source_id in IDS.items():
        o = opt[source_id]
        runs = [row for row in safety if row['model'] == source_id]
        bands = {row['band'] for row in runs}
        assert len(runs) == 18 and len(bands) == 6
        valid = lambda row: row['valid_completion'].lower() == 'true'
        safety_score = 100 * (.8 * sum(map(valid, runs)) / 18 + .2 * sum(
            all(valid(row) for row in runs if row['band'] == band) for band in bands) / 6)
        models[key] = {
            'optimization_all': float(o['total_score']),
            'optimization_wet': float(o['real_score']),
            'optimization_dry': float(o['sim_score']),
            'suzhou4d': float(o['suzhou_real4d_score']),
            'singapore4d': float(o['singapore_real4d_score']),
            'real8d': float(o['real8d_score']),
            'safety': safety_score,
            'drift': float(robust.loc[source_id, 'drift_score']),
            'resin': float(robust.loc[source_id, 'resin_score']),
            'robustness': float(robust.loc[source_id, 'overall']),
            'pka': float(multi.loc[source_id, 'pka_score']) if source_id in multi.index else None,
            'spectrum': float(multi.loc[source_id, 'spectrum_score']) if source_id in multi.index else None,
            'multimodal': float(multi.loc[source_id, 'total_score']) if source_id in multi.index else None,
        }
    existing = json.loads((ROOT / 'data/results.json').read_text())
    for model in existing['models']:
        for category in ['optimization', 'safety', 'robustness', 'multimodal']:
            actual = models[model['id']]['optimization_all' if category == 'optimization' else category]
            expected = model[category]
            assert (actual is None) == (expected is None)
            if actual is not None:
                assert abs(actual - expected) <= .0051, (model['id'], category, actual, expected)
    output = {'sources': [opt_path, safety_path, robust_path, multi_path],
              'classification': 'pKa and spectrum matching are wet experiments; safety is dry.',
              'models': models}
    (ROOT / 'data/experiment-scores.json').write_text(json.dumps(output, indent=2, allow_nan=False) + '\n')
    print('Imported full-precision scores for 7 models; all category scores match the website snapshot.')


if __name__ == '__main__':
    main(Path(sys.argv[1]).resolve())
