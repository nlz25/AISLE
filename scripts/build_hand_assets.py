"""Export the generated hand painting, SVG layers and an offline preview.

Optional authoring tool: needs Pillow from requirements-dev.txt. The generated
alpha is preserved; only delivery-format conversion runs on the raster source.
SVG viewports and masks expose individual parts without resampling their pixels.
"""

import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))
from sitegen.components.hand import HAND_ATLAS, HAND_ATLAS_SIZE, HAND_PARTS, articulated_hand, hand_part_mask


def main():
    target = ROOT / "public/assets/hand-rig"
    target.mkdir(parents=True, exist_ok=True)
    parts_target = ROOT / "design/generated/hand-rig"
    parts_target.mkdir(parents=True, exist_ok=True)
    with Image.open(ROOT / "design/originals/hand-rig" / Path(HAND_ATLAS).with_suffix(".png")) as atlas:
        if atlas.mode != "RGBA" or atlas.size != HAND_ATLAS_SIZE:
            raise ValueError(f"The rig expects the preserved {HAND_ATLAS_SIZE} RGBA painting")
        atlas.save(target / HAND_ATLAS, "WEBP", quality=95, method=6)
    width, height = HAND_ATLAS_SIZE
    for name, (bounds, _) in HAND_PARTS.items():
        viewbox = " ".join(str(value) for value in bounds)
        definition, reference = hand_part_mask(name, "part")
        (parts_target / f"{name}.svg").write_text(
            f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{viewbox}">'
            f'<defs>{definition}</defs>'
            f'<image href="../../../public/assets/hand-rig/{HAND_ATLAS}" width="{width}" height="{height}" {reference}/></svg>\n'
        )

    # Embed the real joint controller so this preview also works over file://.
    controller = (ROOT / "src/scripts/portal-hand.js").read_text().replace("export ", "")
    markup = articulated_hand().replace("assets/", "../public/assets/")
    cards = []
    for name, (bounds, _) in HAND_PARTS.items():
        definition, reference = hand_part_mask(name, "preview")
        cards.append(
            f'<a href="generated/hand-rig/{name}.svg">'
            f'<svg viewBox="{" ".join(map(str, bounds))}" role="img" aria-label="{name}">'
            f'<defs>{definition}</defs>'
            f'<image href="../public/assets/hand-rig/{HAND_ATLAS}" width="{width}" height="{height}" {reference}/></svg>'
            f'<span>{name}</span></a>'
        )
    cards = "".join(cards)
    preview = PREVIEW.replace("{{HAND}}", markup).replace("{{PARTS}}", cards).replace("{{CONTROLLER}}", controller).replace("{{ATLAS}}", HAND_ATLAS)
    (ROOT / "design/hand-rig-preview.html").write_text(preview)
    print(f"Hand assets: 8 SVG parts, {(target / HAND_ATLAS).stat().st_size:,} byte atlas, offline preview.")


PREVIEW = """<!doctype html>
<html lang="zh-CN">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>机械手 · 拆件与关节预览</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; background: #10151e; color: #e7edf7; font: 16px/1.6 system-ui,sans-serif; }
  main { max-width: 1300px; margin: auto; padding: 28px; }
  h1 { font-size: 24px; margin-bottom: 8px; }
  p { color: #a7b5c8; }
  .stage { border: 1px solid #ffffff18; border-radius: 18px; background: radial-gradient(ellipse at 80% 30%,#1b2b41,transparent 60%); overflow: hidden; }
  .portal-hand-art { position: relative; aspect-ratio: 1672/941; }
  .portal-hand-fallback { display: none; }
  .portal-hand-rig { display: block; width: 100%; overflow: visible; }
  .show-source .portal-hand-fallback { display: block; width: 100%; height: auto; }
  .show-source .portal-hand-rig { display: none; }
  label { display: flex; gap: 16px; align-items: center; margin-top: 20px; }
  input { flex: 1; min-width: 40px; accent-color: #7ec7fa; }
  button, a { color: #c1e5ff; }
  button { font: inherit; background: #1e2e44; border: 1px solid #ffffff22; border-radius: 6px; padding: 6px 14px; cursor: pointer; }
  button:focus-visible, input:focus-visible, a:focus-visible { outline: 2px solid #7ec7fa; outline-offset: 4px; }
  .atlas { width: 100%; background: #111822; border-radius: 14px; }
  details { margin-top: 24px; }
  summary { cursor: pointer; padding: 15px 0; }
  .parts { display: grid; grid-template-columns: repeat(4,minmax(0,1fr)); gap: 12px; }
  .parts a { display: grid; gap: 8px; padding: 16px; border: 1px solid #ffffff18; border-radius: 12px; text-decoration: none; }
  .parts svg { width: 100%; height: 150px; }
  .parts span { font-size: 13px; }
  @media(max-width:600px) { main { padding: 16px; } .parts { grid-template-columns: repeat(2,minmax(0,1fr)); } label { gap: 8px; } }
</style>
<main>
  <h1>机械手 · 拆件与关节试作</h1>
  <p>拖动滑块，观察手腕、食指三节、拇指和其余手指的联动。触碰姿态保留原图中食指微弯的弧线。</p>
  <div class="stage" id="rig">{{HAND}}</div>
  <label>放松 <input aria-label="伸指进度" type="range" min="0" max="1" step="0.001" value="1"> 触碰 <button type="button">播放</button></label>
  <p><button type="button" data-compare aria-pressed="false">对照原图姿态</button></p>
  <p>二维刚性关节试作；无名指与小指暂为一组。原画使用冷色环境光，接近触碰时，指尖与指节会逐渐出现暖色反光。开启减少动态效果时，播放会直接显示触碰姿态，滑块仍可手动使用。</p>
  <details><summary>查看八件独立素材（SVG 引用共享图集）</summary><div class="parts">{{PARTS}}</div></details>
  <details><summary>查看共享分层原画</summary><img class="atlas" src="../public/assets/hand-rig/{{ATLAS}}" alt="用于拆分八个可动层的完整机械手原画"></details>
</main>
<script>
{{CONTROLLER}}
const rig = document.getElementById('rig');
rig.querySelector('#hand-atlas').setAttribute('href', rig.querySelector('svg').dataset.atlas);
const pose = createHandRig(rig);
const slider = document.querySelector('input');
let playback = 0;
const stop = () => { cancelAnimationFrame(playback); playback = 0; };
const compare = document.querySelector('[data-compare]');
const hideSource = () => { rig.classList.remove('show-source'); compare.setAttribute('aria-pressed', 'false'); compare.textContent = '对照原图姿态'; };
slider.addEventListener('input', () => { stop(); hideSource(); pose(Number(slider.value)); });
compare.addEventListener('click', () => {
  stop(); slider.value = 1; pose(1);
  const showing = rig.classList.toggle('show-source');
  compare.setAttribute('aria-pressed', String(showing));
  compare.textContent = showing ? '返回可动机械手' : '对照原图姿态';
});
pose(1);
document.querySelector('button').addEventListener('click', () => {
  stop();
  hideSource();
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { slider.value = 1; pose(1); return; }
  const start = performance.now();
  const tick = time => {
    const t = Math.min(1, (time - start) / 3600);
    const progress = (1 + Math.cos(t * Math.PI * 2)) / 2;
    slider.value = progress;
    pose(progress);
    if (t < 1) playback = requestAnimationFrame(tick);
  };
  playback = requestAnimationFrame(tick);
});
document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
</script>
</html>
"""


if __name__ == "__main__":
    main()
