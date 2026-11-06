"""Featured team grouped around the corresponding research leads."""

import json
from ..context import ROOT, esc


def team():
    data = json.loads((ROOT / "data/team.json").read_text())
    groups = []
    for group in data["groups"]:
        members = "".join(
            f'<li><h3>{esc(person["name"])}</h3><p>{esc(person["affiliation"])}</p></li>'
            for person in group["members"]
        )
        leader = group["leader"]
        groups.append(
            '<li class="team-cluster">'
            + (f'<ul class="team-members">{members}</ul>' if members else '')
            + f'<div class="team-lead"><h3>{esc(leader["name"])}</h3>'
            + f'<p>{esc(leader["affiliation"])}</p></div></li>'
        )
    return (
        '<section class="section team" id="team" aria-labelledby="team-title">'
        '<div class="section-head"><h2 id="team-title">Team</h2></div>'
        '<ul class="team-grid">' + "".join(groups) + '</ul></section>'
    )
