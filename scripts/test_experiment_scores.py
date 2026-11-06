"""Scientific coverage and aggregation checks for the experiment explorer."""
import sys
import unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'src'))
from sitegen.components.experiment_board import ranking, SCORES, CATEGORIES, leaderboard_explorer
from sitegen.context import MODELS


class Scores(unittest.TestCase):
    def test_existing_overall_is_preserved(self):
        for coverage in ['full', 'shared']:
            _, rows = ranking('all', coverage=coverage)
            for row in rows:
                self.assertAlmostEqual(row['score'], row['model'][coverage], delta=.0051)

    def test_missing_multimodal_never_becomes_zero(self):
        for mode in ['all', 'wet']:
            self.assertEqual(len(ranking(mode)[1]), 5)
            self.assertEqual(len(ranking(mode, coverage='shared')[1]), 7)
            self.assertEqual(len(ranking(mode, 'multimodal')[1]), 5)
        self.assertEqual(len(ranking('dry')[1]), 7)

    def test_new_aggregate_weights(self):
        for mode, keys in [('dry', ['optimization_dry', 'safety']), ('wet', ['optimization_wet', 'robustness', 'multimodal'])]:
            for row in ranking(mode)[1]:
                source = SCORES[row['model']['id']]
                self.assertAlmostEqual(row['score'], sum(source[key] for key in keys) / len(keys))
        for row in ranking('wet', coverage='shared')[1]:
            source = SCORES[row['model']['id']]
            self.assertAlmostEqual(row['score'], (source['optimization_wet'] + source['robustness']) / 2)

    def test_all_optimization_retains_condition_weights(self):
        for source in SCORES.values():
            self.assertAlmostEqual(source['optimization_all'], (3 * source['optimization_wet'] + source['optimization_dry']) / 4)
            self.assertAlmostEqual(source['multimodal'], (source['pka'] + source['spectrum']) / 2) if source['multimodal'] is not None else None

    def test_ties_and_sorting(self):
        for mode, categories in CATEGORIES.items():
            for category in ['overall'] + categories:
                _, rows = ranking(mode, category)
                values = [row['score'] for row in rows]
                self.assertEqual(values, sorted(values, reverse=True))
                for row in rows:
                    self.assertEqual(row['rank'], 1 + sum(value > row['score'] for value in values))
        rows = ranking('dry', 'safety')[1]
        self.assertEqual(len({row['rank'] for row in rows if row['score'] == 0}), 1)

    def test_default_and_views(self):
        html = leaderboard_explorer()
        self.assertEqual(html.count('data-ranking-panel '), 14)
        self.assertEqual(html.count('data-coverage="full" aria-label="All experiments · Overall · full" >'), 1)


if __name__ == '__main__':
    unittest.main()
