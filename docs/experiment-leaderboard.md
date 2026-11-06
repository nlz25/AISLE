# Experiment leaderboard

Homepage and leaderboard page share `experiment_board.py`. Defaults: All experiments / Overall / Full coverage (five models). Task categories rank all eligible models, independently of the overall coverage selector. Unsupported environment/category combinations are hidden. Switching to an unsupported category returns to Overall. No missing result is zero-imputed. Equal full-precision scores receive equal competition ranks.

Approved 2026-11-06: category-equal aggregation applies separately to each environment.

| Environment | Full coverage | Shared categories |
| --- | --- | --- |
| All | optimization, safety, robustness, multimodal (1/4 each) | optimization, safety, robustness (1/3 each) |
| Wet | real optimization, robustness, multimodal (1/3 each) | real optimization, robustness (1/2 each) |
| Dry | simulated optimization, safety (1/2 each) | Same coverage; selector hidden |

pKa is classified as wet based on the user's confirmed data-source convention. All optimization retains the original four-condition equal weighting (three real conditions and one simulation), not a 50/50 real/simulation mean. Wet optimization averages three real conditions. Dry optimization uses Sim-4D 0-shot only. Existing category scoring is unchanged.

`data/experiment-scores.json` contains full-precision component scores, imported with `scripts/import_experiment_scores.py /path/to/PSI-Bench-v2` in the paper's Python environment. The importer reads the archived optimization CSV and safety run records, and calls calculation functions in the robustness/multimodal scripts without rendering figures. It checks every category against the existing website snapshot. The source paths are recorded in JSON. Normal website builds need only the committed JSON and Python's standard library.

The source for original cross-category weights is `Figure_1_system/ranking_panels/plot_figure_1_rankings.py` in PSI-Bench-v2. The Notion page and some older package README files still describe the overall weights as unfrozen; they must not override that implementation. New wet/dry weighting was explicitly approved in this chat.

`make check` validates full-precision aggregation, coverage, ties, original totals and all 14 views. Score data and harness identity must come from actual evaluation records; no new harness entries are invented.
