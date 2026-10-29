"""Small shared HTML components."""


def arrow():
    return '<span class="arrow" aria-hidden="true">↗</span>'


def link(label, href, cls="text-link"):
    return f'<a class="{cls}" href="{href}">{label}{arrow()}</a>'


def specs(items):
    return (
        '<dl class="specs">'
        + "".join(f"<div><dt>{k}</dt><dd>{v}</dd></div>" for k, v in items)
        + "</dl>"
    )
