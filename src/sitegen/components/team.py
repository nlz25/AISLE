"""Institution rows with inline team members and highlighted leads."""
import json
from ..context import ROOT, esc


def team():
    data = json.loads((ROOT / "data/team.json").read_text())
    rows = []
    for group in data["groups"]:
        leader = group["leader"]
        names = "".join(f'<li>{esc(p["name"])}</li>' for p in group["members"])
        names += f'<li class="team-lead">{esc(leader["name"])}</li>'
        rows.append(
            '<li class="team-cluster">'
            f'<div class="team-logo"><img src="assets/institutions/{esc(group["logo"])}" alt="{esc(leader["affiliation"])}" loading="lazy" decoding="async" width="160" height="84"></div>'
            f'<div class="team-details"><ul class="team-names">{names}</ul>'
            f'<p>{esc(leader["affiliation"])}</p></div></li>'
        )
    return '<section class="section team" id="team" aria-labelledby="team-title"><div class="section-head"><h2 id="team-title">Key Contributors</h2></div><ul class="team-grid">' + "".join(rows) + '</ul></section>'
