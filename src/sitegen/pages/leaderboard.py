"""The same experiment explorer used on the homepage."""
from ..components.experiment_board import leaderboard_explorer


def leaderboard():
    return f'''<main id="main" class="wrap"><section class="page-hero"><h1>Leaderboard</h1></section><section class="section" style="padding-top:22px">{leaderboard_explorer()}<p class="board-help">Fixed study cohort. Compare models within the same experiment type and coverage. Missing evaluations are not scored as zero. <a href="tasks.html#scoring">Scoring details ↗</a></p></section></main>'''
