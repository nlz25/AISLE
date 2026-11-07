"""Shared page chrome and metadata."""

import json
from ..context import DATA, esc
from .hand import HAND_ATLAS

CONTRIBUTE_PAGES = {"contribute.html", "contributor.html", "contribute-admin.html"}


def header(page, site_prefix=""):
    items = [
        ("index.html", "Home"),
        ("leaderboard.html", "Leaderboard"),
        ("tasks.html", "Tasks"),
        ("contribute.html", "Contribute"),
        ("#team" if page == "index.html" else "index.html#team", "Team"),
        ("#join" if page == "index.html" else "index.html#join", "Join us"),
    ]
    nav = "".join(
        f'<a href="{site_prefix}{url}"{chr(32) + "aria-current=page" if url == page else ""}>{label}</a>'
        for url, label in items
    )
    return f'''<a class="skip" href="#main">Skip to content</a>
    <header class="site-header"><div class="wrap header-inner">
      <a class="brand" href="{site_prefix}index.html" aria-label="AISLE home"><img class="brand-logo" src="assets/brand/aisle-logo-white.svg" alt="AISLE logo" width="1226" height="222"></a>
      <nav class="nav-links" id="main-navigation" aria-label="Main navigation">{nav}</nav>
      <div class="nav-side">
      <button class="menu-toggle" aria-controls="main-navigation" aria-expanded="false">Menu +</button></div>
    </div></header>'''


def footer(site_prefix=""):
    return f"""<footer class="site-footer"><div class="wrap footer-top">
      <a href="{site_prefix}index.html" class="wordmark">© 2026 AISLE</a>
      <div class="footer-links"><a href="{site_prefix}leaderboard.html">Leaderboard</a><a href="{site_prefix}tasks.html">Tasks</a></div>
    </div></footer>"""


def results_data():
    payload = json.dumps(DATA, ensure_ascii=False).replace("<", "\\u003c")
    return f'<script type="application/json" id="results-data">{payload}</script>'


def shell(page, title, description, body, version, *, site_prefix="", origin="https://aisle.science"):
    url = f"{origin}/{page}"
    portal = page == "index.html"
    contribute_page = page in CONTRIBUTE_PAGES
    workspace = contribute_page and page != "contribute.html"
    site_script = "navigation.js" if workspace else "main.js"
    body_class = ' class="contribute-page"' if contribute_page else (
        ' class="tasks-page"' if page == "tasks.html" else ""
    )
    contribute_style = f'<link rel="stylesheet" href="assets/css/contribute.css?v={version}">' if contribute_page else ""
    workspace_head = (
        '<meta name="robots" content="noindex,nofollow">'
        '<meta name="referrer" content="no-referrer">'
        '<meta http-equiv="Content-Security-Policy" content="default-src \'self\'; '
        "script-src 'self'; frame-src 'none'; connect-src 'self'; "
        "style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'none'; form-action 'none'\">"
        f'<script type="module" src="assets/js/contribute.js?v={version}"></script>'
        if workspace else ""
    )
    portal_style = (
        f'<link rel="stylesheet" href="assets/css/portal.css?v={version}"><link rel="stylesheet" href="assets/css/network.css?v={version}">'
        if portal
        else ""
    )
    preload = '<link rel="preload" href="assets/fonts/source-serif-4-latin-variable.woff2" as="font" type="font/woff2" crossorigin>'
    if portal:
        preload = f'<link rel="preload" href="assets/hand-rig/{HAND_ATLAS}" as="image" type="image/webp" fetchpriority="high">\n  ' + preload
    return f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  {workspace_head}
  <title>{esc(title)} · AISLE</title>
  <meta name="description" content="{esc(description)}">
  <meta name="theme-color" content="#10131a">
  <meta property="og:type" content="website">
  <meta property="og:title" content="{esc(title)} · AISLE">
  <meta property="og:description" content="{esc(description)}">
  <meta property="og:url" content="{url}">
  <meta name="twitter:card" content="summary">
  <link rel="icon" type="image/png" sizes="64x64" href="favicon.png">
  <link rel="apple-touch-icon" href="apple-touch-icon.png">
  <link rel="canonical" href="{url}">
  {preload}
  <link rel="stylesheet" href="assets/css/site.css?v={version}">
  {portal_style}
  {contribute_style}
  <script type="module" src="assets/js/{site_script}?v={version}"></script>
</head>
<body{body_class}>{header(page, site_prefix)}{body}{results_data() if page in {"index.html", "leaderboard.html"} else ""}{footer(site_prefix)}</body>
</html>'''
