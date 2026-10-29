"""Server-rendered, keyboard-accessible research map and experiment films."""
import html,json,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def network_hero(lang):
    data=json.loads((ROOT/'data/network.json').read_text())
    zh=lang=='zh'
    def t(a,b):return b if zh else a
    def asset(path):return ('../' if zh else '')+'assets/'+path
    def esc(s):return html.escape(str(s),quote=True)
    pins=[];countries=[]
    for c in data['countries']:
        label=c['zh'] if zh else c['en'];n=len(c['institutions'])
        x=(c['lon']+180)/360*100;y=(85-c['lat'])/145*100
        active=c['id']=='cn'
        count_label=t('institution' if n==1 else 'institutions','个机构')
        pins.append(f'<button class="map-pin pin-{c["id"]}" style="--x:{x:.3f}%;--y:{y:.3f}%" data-country="{c["id"]}" aria-pressed="{str(active).lower()}" aria-controls="network-inspector" aria-label="{esc(label)} · {n} {count_label}"><span class="pin-core"></span><span class="pin-label">{esc(label)}<small>{n} {count_label}</small></span></button>')
        countries.append(f'<button class="country-option" data-country="{c["id"]}" aria-pressed="{str(active).lower()}" aria-controls="network-inspector">{esc(label)}<span>{n:02}</span></button>')
    first=data['institutions'][0]
    map_version=hashlib.sha256((ROOT/'assets/map/world.svg').read_bytes()).hexdigest()[:10]
    payload=json.dumps(data,ensure_ascii=False).replace('<','\\u003c')
    return f'''<section class="network-hero" aria-labelledby="network-title">
      <div class="network-aurora" aria-hidden="true"></div><div class="network-grain" aria-hidden="true"></div>
      <div class="network-heading wrap"><h1 id="network-title"><span class="network-title-line">AI Scientists'</span> <span class="network-title-line network-title-emphasis">Last Exam</span></h1><p class="intro">Nature as the Verifier</p></div>
      <div class="network-shell wrap">
        <div class="network-stage">
          <div class="map-caption"><span class="status-dot"></span>{t('Global research network','全球科研网络')}<span class="map-caption-rule"></span><span>{t('Select a location to explore','选择地点，探索实验')}</span></div>
          <div class="world-map" aria-hidden="true"><div class="map-glow"></div><img src="{asset('map/world.svg')}?v={map_version}" alt="" width="1200" height="560" fetchpriority="high"><svg class="network-arcs" viewBox="0 0 1200 560" preserveAspectRatio="none"><path d="M192 182 Q330 48 335 160 M335 160 Q475 40 622 148 M622 148 Q810 60 1002 207 M1002 207 Q1030 265 946 323 M946 323 Q1050 310 1104 459"/><path class="arc-light" d="M622 148 Q810 60 1002 207 M1002 207 Q1030 265 946 323"/></svg><div class="map-equator"></div></div>
          <div class="map-markers">{''.join(pins)}</div>
          <aside id="network-inspector" class="network-inspector" aria-label="{t('Selected institution','已选机构')}">
            <div class="inspector-topline"><span id="network-location">{t('Suzhou, China','中国 · 苏州')}</span><span class="inspector-number" aria-hidden="true">01 / 04</span></div>
            <div class="institution-options" role="group" aria-label="{t('Choose an institution','选择机构')}"></div>
            <div class="inspector-identity"><span class="inspector-logo"><img id="network-logo" src="{asset('institutions/'+first['logo'])}" alt="{esc(first['name'])}" width="54" height="40"></span><div><h2 id="network-institution">{esc(t(first['short'],first['zh']))}</h2><p id="network-full-name" hidden></p></div></div>
            <div id="network-film"><button type="button" class="film-preview" aria-label="{t('Watch Suzhou National Laboratory experiment film','播放苏州国家实验室实验视频')}"><img id="network-poster" src="{asset('experiments/suzhou.jpg')}" alt="{t('Colour-matching experiment at Suzhou National Laboratory','苏州国家实验室颜色匹配实验')}" width="960" height="516"><span class="film-play" aria-hidden="true">▶</span><span class="film-duration">00:19</span><span class="film-caption">{t('Watch experiment','观看实验')}</span></button><p id="network-topic">{t(first['topic'],first['topicZh'])}</p></div>
            <p id="network-description" hidden></p>
            <p class="network-selection sr-only" role="status" aria-live="polite"></p>
          </aside>
          <div class="map-footnote"><span>{len(data['countries']):02}</span>{t('countries','个国家')}<i></i><span>{len(data['institutions']):02}</span>{t('institutions','个机构')}<i></i><span>{sum(bool(i.get('video')) for i in data['institutions']):02}</span>{t('experiment films','个实验视频')}</div>
        </div>
        <div class="network-country-nav" role="group" aria-label="{t('Browse research locations','浏览科研地点')}">{''.join(countries)}</div>
      </div>
      <dialog class="experiment-dialog" aria-labelledby="experiment-title"><div class="experiment-dialog-head"><div><p id="experiment-location"></p><h2 id="experiment-title"></h2></div><button type="button" class="experiment-close" aria-label="{t('Close video','关闭视频')}">×</button></div><video id="experiment-video" controls playsinline preload="none"></video><p id="experiment-description"></p><p id="experiment-error" role="status" hidden>{t('The video could not load. Please try again.','视频未能加载，请重试。')}</p></dialog>
      <script id="network-data" type="application/json">{payload}</script>
      <noscript><p class="wrap network-noscript">{t('Enable JavaScript to explore institutions and play experiment films.','启用 JavaScript 后可浏览机构与播放实验视频。')}</p></noscript>
    </section>'''
