"""Check static links, interactive bindings and scientific score invariants."""
import json
import re
import subprocess
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
errors = []


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__(convert_charrefs=True)
        self.path, self.ids, self.refs, self.controls, self.profiles = path, set(), [], [], []
        self.html_lang = None
        self.feed(path.read_text())

    def handle_starttag(self, tag, values):
        a = dict(values)
        if tag == 'html': self.html_lang = a.get('lang')
        if 'id' in a:
            if a['id'] in self.ids: errors.append(f'{self.path}: duplicate id {a["id"]}')
            self.ids.add(a['id'])
        for key in ['href', 'src', 'poster', 'data-src']:
            if a.get(key): self.refs.append(a[key])
        for key in ['aria-controls','data-sort-board','data-status']:
            if a.get(key): self.controls.append(a[key])
        if a.get('data-profile'): self.profiles.append((a['data-profile'],a['data-cohort']))
        if tag == 'img' and not a.get('alt'): errors.append(f'{self.path}: image missing alt')


pages = {p.resolve(): Page(p) for p in list(ROOT.glob('*.html'))+list((ROOT/'zh').glob('*.html'))}
tracked = set(subprocess.check_output(['git','ls-files'],cwd=ROOT,text=True).splitlines())
data = json.loads((ROOT/'data/results.json').read_text())
models = {m['id']: m for m in data['models']}

for path, page in pages.items():
    if page.html_lang not in {'en','zh-CN'}: errors.append(f'{path}: invalid language')
    for ref in page.refs:
        u = urlsplit(ref)
        if u.scheme or u.netloc: continue
        target = (path.parent/unquote(u.path)).resolve() if u.path else path
        if target.is_dir(): target /= 'index.html'
        relative = str(target.relative_to(ROOT)) if target.is_relative_to(ROOT) else str(target)
        if not target.exists() and relative not in tracked:
            errors.append(f'{path.name}: missing resource {ref}')
        if u.fragment and target in pages and unquote(u.fragment) not in pages[target].ids:
            errors.append(f'{path.name}: missing anchor {ref}')
        if '.csv' in ref.lower(): errors.append(f'{path.name}: CSV link is outside requested scope')
    for control in page.controls:
        if control not in page.ids: errors.append(f'{path.name}: missing interactive target {control}')
    for model_id, cohort in page.profiles:
        if model_id not in models or models[model_id].get(cohort) is None:
            errors.append(f'{path.name}: invalid model profile {model_id}/{cohort}')
    if path.name == 'leaderboard.html' and len(set(page.profiles)) != 12:
        errors.append(f'{path}: expected 7 shared + 5 full interactive rows')

if len(models) != 7: errors.append('Shared cohort must have seven models')
if sum(m['full'] is not None for m in models.values()) != 5: errors.append('Full cohort must have five models')
for m in models.values():
    for key in ['optimization','safety','robustness','multimodal','shared','full']:
        if m[key] is not None and not 0 <= m[key] <= 100: errors.append(f'Invalid score: {m["id"]}/{key}')
    if (m['multimodal'] is None) != (m['full'] is None): errors.append(f'Coverage mismatch: {m["id"]}')
    for cohort, keys in [('shared',['optimization','safety','robustness']),('full',['optimization','safety','robustness','multimodal'])]:
        if m[cohort] is None: continue
        expected = sum(m[k] for k in keys)/len(keys)
        if abs(m[cohort]-expected)>0.011: errors.append(f'Aggregate/rounding mismatch: {m["id"]}/{cohort}')

for path in [*ROOT.glob('*.html'),*(ROOT/'zh').glob('*.html'),ROOT/'assets/site.js']:
    source=path.read_text()
    if re.search(r'(app\.notion\.com|/Users/|gh[op]_[A-Za-z0-9]{20})', source):
        errors.append(f'{path}: internal source detail in public page')

if errors:
    raise SystemExit('\n'.join(errors))
print(f'PASS: {len(pages)} pages; internal links, anchors, interactive bindings, cohort coverage and rounded scores.')
