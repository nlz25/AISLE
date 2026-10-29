"""Progressively enhanced entrance; all research content stays server-rendered."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def entrance(lang):
    zh = lang == 'zh'
    prefix = '../' if zh else ''
    data = json.loads((ROOT / 'data/network.json').read_text())
    return f'''<section class="portal" id="entrance" aria-labelledby="portal-title">
      <div class="portal-atmosphere" aria-hidden="true"></div>
      <div class="portal-stars" aria-hidden="true"></div>
      <div class="portal-grain network-grain" aria-hidden="true"></div>
      <div class="portal-heading wrap">
        <h1 id="portal-title"><span>AI Scientists'</span> <span>Last Exam</span></h1>
        <p>Nature as the Verifier</p>
      </div>
      <div class="portal-scene">
        <div class="portal-art" aria-hidden="true"><img src="{prefix}assets/portal/robot-earth.png" width="1672" height="941" alt="" fetchpriority="high" decoding="async"></div>
        <div class="portal-contact" aria-hidden="true"></div>
        <a class="portal-enter" href="#network" aria-label="{'进入全球科研网络' if zh else 'Enter the global research network'}"><span class="portal-enter-ring" aria-hidden="true"></span><span class="portal-enter-core"><span>ENTER</span><span class="portal-enter-arrow" aria-hidden="true">↗</span></span></a>
        <span class="portal-enter-caption" aria-hidden="true">{'探索全球科研网络' if zh else 'Explore the research network'}</span>
      </div>
      <div class="portal-footer wrap"><span class="portal-signature">AISLE<span class="portal-footer-rule"></span>{'科研网络' if zh else 'Research network'}</span><span class="portal-network-count"><b>{len(data['countries']):02}</b> {'个国家' if zh else 'countries'}<i> / </i><b>{len(data['institutions']):02}</b> {'个机构' if zh else 'institutions'}</span></div>
    </section>'''
