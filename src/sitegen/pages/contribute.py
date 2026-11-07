"""Public contribution entry and the two authenticated workspaces."""


def contribute(workspace_prefix=""):
    return f'''
<main id="main" class="wrap contribute">
  <section class="contribute-hero">
    <p class="contribute-kicker">AISLE · Contribute</p>
    <h1>Contribute an experiment</h1>
    <p>Help us test scientific reasoning against reproducible experiments. Share a computational task or submit the complete package from a physical experiment.</p>
    <a class="contribute-button" href="#paths">Choose a contribution path</a>
  </section>
  <section id="paths" aria-labelledby="paths-title">
    <h2 id="paths-title">Choose a contribution path</h2>
    <div class="contribute-grid">
      <article class="contribute-card">
        <p class="contribute-kicker">01 · Computational</p>
        <h3>Dry Lab</h3>
        <p>Create an AISLE task, include its ID in your GitHub pull request, and link the PR in your workspace.</p>
        <a class="contribute-button secondary" href="{workspace_prefix}contributor.html?kind=dry">Start a Dry Lab task</a>
      </article>
      <article class="contribute-card">
        <p class="contribute-kicker">02 · Physical</p>
        <h3>Wet Lab</h3>
        <p>Upload your entire experiment package as one ZIP. Track review and update the lab availability and notices for each task.</p>
        <a class="contribute-button secondary" href="{workspace_prefix}contributor.html?kind=wet">Start a Wet Lab task</a>
      </article>
    </div>
  </section>
  <p class="contribute-links"><a href="{workspace_prefix}contributor.html">Open your workspace</a><a href="tasks.html">Explore existing tasks</a><a href="mailto:gan@greendynamics.com.au">Contact the AISLE team</a></p>
</main>'''


def workspace_moved(url):
    return f'''
<main id="main" class="wrap contribute contribute-workspace">
  <a href="contribute.html">← Contribute</a>
  <p class="contribute-kicker">AISLE · Contribute</p>
  <h1>Open the contribution workspace</h1>
  <p>The workspace has a new address.</p>
  <a class="contribute-button" href="{url}">Continue to workspace</a>
</main>'''


def contributor(site_prefix=""):
    return f'''
<main id="main" class="wrap contribute contribute-workspace" data-contribute-view="workspace">
  <a href="{site_prefix}contribute.html">← Contribute</a>
  <p class="contribute-kicker">AISLE · Contributor</p>
  <h1>Your workspace</h1>
  <p id="workspace-message" class="contribute-message" role="status">Checking your session…</p>
  <noscript><p>Enable JavaScript to sign in and manage tasks.</p></noscript>
  <section id="login-panel" class="contribute-card contribute-form-panel" aria-labelledby="login-title" hidden>
    <h2 id="login-title">Sign in or register</h2>
    <p>Use your GitHub account to sign in. First-time contributors also provide their name and organization.</p>
    <button id="github-sign-in" type="button" disabled>Continue with GitHub</button>
  </section>
  <section id="workspace-panel" hidden aria-label="Contributor workspace">
    <div class="contribute-toolbar">
      <p id="account-summary"></p>
      <a id="admin-link" href="contribute-admin.html" hidden>Admin review</a>
      <button id="sign-out" class="secondary" type="button">Sign out</button>
    </div>
    <section id="profile-panel" class="contribute-card contribute-form-panel" aria-labelledby="profile-title" hidden>
      <h2 id="profile-title">Complete your contributor profile</h2>
      <form id="profile-form" method="post" class="contribute-form">
        <label>Verified contact email <input name="email" type="email" readonly></label>
        <label>Full name <input name="name" autocomplete="name" maxlength="120" required></label>
        <label>Organization <input name="organization" autocomplete="organization" maxlength="200" required></label>
        <button type="submit">Save profile</button>
      </form>
    </section>
    <div id="task-area" hidden>
    <details class="contribute-card contribute-form-panel" id="new-task-panel">
      <summary>Create a task</summary>
      <form id="new-task" method="post" class="contribute-form">
        <label>Track <select name="kind"><option value="dry">Dry Lab</option><option value="wet">Wet Lab</option></select></label>
        <label>Task title <input name="title" maxlength="160" required></label>
        <label>Experiment description <textarea name="description" rows="4" maxlength="5000" required></textarea></label>
        <button type="submit">Create draft</button>
      </form>
    </details>
    <section aria-labelledby="my-tasks-title">
      <h2 id="my-tasks-title">Your tasks</h2>
      <div id="my-tasks" class="contribute-task-list"></div>
    </section>
    </div>
  </section>
</main>'''


def contribute_admin():
    return '''
<main id="main" class="wrap contribute contribute-workspace" data-contribute-view="admin">
  <a href="contributor.html">← Contributor workspace</a>
  <p class="contribute-kicker">AISLE · Administration</p>
  <h1>Contribution review</h1>
  <p id="workspace-message" class="contribute-message" role="status">Verifying administrator access…</p>
  <noscript><p>Enable JavaScript to review contributions.</p></noscript>
  <section id="admin-mfa" class="contribute-card contribute-form-panel" aria-labelledby="admin-mfa-title" hidden>
    <h2 id="admin-mfa-title">Verify administrator access</h2>
    <p>Use an authenticator app to verify your GitHub sign-in before reviewing submissions.</p>
    <button id="mfa-enroll" type="button" hidden>Set up authenticator</button>
    <p id="mfa-setup" hidden>Add an account in your authenticator app and enter this setup key <code id="mfa-secret"></code>.</p>
    <form id="mfa-form" method="post" class="contribute-form" hidden>
      <label>Six-digit code <input name="code" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6" required></label>
      <button type="submit">Verify code</button>
    </form>
  </section>
  <section id="admin-panel" hidden aria-label="Administration">
    <div class="contribute-toolbar" role="group" aria-label="Management views">
      <button type="button" data-admin-view="tasks" aria-pressed="true">Submissions</button>
      <button type="button" data-admin-view="users" aria-pressed="false">Users</button>
    </div>
    <h2 id="admin-view-title">Submissions</h2>
    <div id="admin-items" class="contribute-task-list" aria-labelledby="admin-view-title"></div>
    <div class="contribute-toolbar" aria-label="Pagination">
      <button id="admin-previous" class="secondary" type="button" disabled>Previous page</button>
      <span id="admin-page"></span>
      <button id="admin-next" class="secondary" type="button" disabled>Next page</button>
    </div>
  </section>
</main>'''
