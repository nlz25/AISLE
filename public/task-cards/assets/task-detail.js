(() => {
  const main = document.querySelector('.task-detail-main');
  if (!main) return;
  main.id = 'task-detail-content';
  document.body.insertAdjacentHTML('afterbegin', `
    <a class="task-skip" href="#task-detail-content">Skip to content</a>
    <header class="task-site-header">
      <a href="../index.html" aria-label="AISLE home">
        <img src="../assets/brand/aisle-logo-white.svg" alt="AISLE logo" width="1226" height="222">
      </a>
      <nav aria-label="Main navigation">
        <a href="../index.html">Home</a>
        <a href="../leaderboard.html">Leaderboard</a>
        <a href="../tasks.html" aria-current="true">Tasks</a>
        <a href="../index.html#team">Team</a>
        <a href="../index.html#join">Join us</a>
      </nav>
    </header>`);
})();
