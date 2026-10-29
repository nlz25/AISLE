"""Institution credits from data/institutions.json."""

import json
from ..context import ROOT, PUBLIC, DATA, MODELS, esc, root


def institutions():
    data = json.loads((ROOT / "data/institutions.json").read_text())
    groups = ""
    for key, en in [("academic", "Academic Institutions"), ("industry", "Industry")]:
        cards = "".join(
            f'<li class="institution {esc(item["shape"])}"><div class="institution-logo"><img src="{root("assets/institutions/" + item["logo"])}" alt="{esc(item["en"])}" loading="lazy" decoding="async"></div><span>{esc(item["en"])}</span></li>'
            for item in data[key]
        )
        single = len(data[key]) == 1
        duplicate = (
            ""
            if single
            else f'<ul class="institution-grid {key}" aria-hidden="true">{cards}</ul>'
        )
        groups += f'<div class="institution-group"><h3>{en}</h3><div class="institution-window"><div class="institution-track {"single" if single else "loop"}"><ul class="institution-grid {key}">{cards}</ul>{duplicate}</div></div></div>'
    return f'<section class="section institutions" id="institutions"><div class="section-head"><h2>Institutions</h2></div>{groups}</section>'
