"""Featured authors, with roles and display order maintained in data/team.json."""

import json

from ..context import ROOT, esc


def team():
    data = json.loads((ROOT / "data/team.json").read_text())
    groups = []
    for key, title in [
        ("leaders", "Leaders"),
        ("contributors", "Core Contributors"),
    ]:
        people = "".join(
            f'<li class="team-person"><h4>{esc(person["name"])}</h4>'
            f'<p>{esc(person["affiliation"])}</p></li>'
            for person in data[key]
        )
        groups.append(
            f'<div class="team-group team-{key}">'
            f'<div class="team-group-heading"><h3 id="team-{key}">{title}</h3>'
            '</div>'
            f'<ul class="team-grid" aria-labelledby="team-{key}">{people}</ul></div>'
        )
    return (
        '<section class="section team" id="team" aria-labelledby="team-title">'
        '<div class="section-head"><h2 id="team-title">Team</h2></div>'
        + "".join(groups)
        + '</section>'
    )
