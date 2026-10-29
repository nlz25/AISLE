"""Shared page chrome and metadata."""

import json
from ..context import ROOT, PUBLIC, DATA, MODELS, esc, root


def header(page):
    items = [
        ("index.html", "Home"),
        ("leaderboard.html", "Leaderboard"),
        ("tasks.html", "Tasks"),
    ]
    nav = "".join(
        f'<a href="{url}"{chr(32) + "aria-current=page" if url == page else ""}>{label}</a>'
        for url, label in items
    )
    return f'''<a class="skip" href="#main">Skip to content</a>
    <header class="site-header"><div class="wrap header-inner">
      <a class="brand" href="index.html" aria-label="AISLE home"><img class="brand-logo" src="{root("assets/brand/aisle-a-pivot-symmetric.webp")}" alt="AISLE logo" width="48" height="48"><span class="brand-full">AI Scientists' Last Exam</span></a>
      <nav class="nav-links" id="main-navigation" aria-label="Main navigation">{nav}</nav>
      <div class="nav-side">
      <button class="menu-toggle" aria-controls="main-navigation" aria-expanded="false">Menu +</button></div>
    </div></header>'''


def footer():
    return f"""<footer class="site-footer"><div class="wrap"><div class="footer-top">
      <div><a href="index.html" class="wordmark">AISLE</a><p>AI Scientists’ Last Exam</p></div>
      <div class="footer-links"><a href="leaderboard.html">Leaderboard</a><a href="tasks.html">Tasks</a></div>
      </div><div class="footer-bottom"><span>© 2026 AISLE · AI Scientists’ Last Exam</span></div></div></footer>"""


def results_data():
    payload = json.dumps(DATA, ensure_ascii=False).replace("<", "\\u003c")
    return f'<script type="application/json" id="results-data">{payload}</script>'


def shell(page, title, description, body, version):
    url = f"https://aisle.science/{page}"
    portal = page == "index.html"
    portal_style = (
        f'<link rel="stylesheet" href="assets/css/portal.css?v={version}">'
        if portal
        else ""
    )
    preload = (
        '<link rel="preload" href="assets/fonts/space-grotesk.woff2" as="font" type="font/woff2" crossorigin>'
        if portal
        else ""
    )
    return f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
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
  <script type="module" src="assets/js/main.js?v={version}"></script>
</head>
<body>{header(page)}{body}{results_data() if page != "tasks.html" else ""}{footer()}</body>
</html>'''
