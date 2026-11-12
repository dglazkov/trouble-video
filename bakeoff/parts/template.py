"""Draw the layout template the parts sheet is painted over: grey shapes on magenta, one per body part,
with known joint positions. Writes the template PNG and layout.json (boxes + pivots in sheet pixels).
  .venv/bin/python bakeoff/parts/template.py"""
import json, os
from PIL import Image, ImageDraw

S = 2048
U = 820  # px per rig unit
img = Image.new("RGB", (S, S), (255, 0, 255))
d = ImageDraw.Draw(img)
G, K = (150, 150, 150), (40, 40, 40)
layout = {}


def capsule(name, cx, top, length, r1, r2, extra=None):
    """vertical limb: joint a at (cx, top), joint b at (cx, top+length)"""
    a, b = (cx, top), (cx, top + length)
    d.polygon([(cx - r1, a[1]), (cx + r1, a[1]), (cx + r2, b[1]), (cx - r2, b[1])], fill=G)
    d.ellipse([cx - r1, a[1] - r1, cx + r1, a[1] + r1], fill=G)
    d.ellipse([cx - r2, b[1] - r2, cx + r2, b[1] + r2], fill=G)
    layout[name] = {"a": a, "b": b, "r": max(r1, r2)}
    if extra: extra(a, b)


# row 1: head, torso, pelvis
hx, hy = 330, 300
d.ellipse([hx - 190, hy - 200, hx + 190, hy + 180], fill=G)
d.rectangle([hx - 10, hy + 150, hx + 80, hy + 300], fill=G)
layout["head"] = {"a": (hx + 35, hy + 135 + 0.165 * U * 0 + 150), "b": (hx, hy), "r": 200}
tx, ty = 900, 130  # torso: neck at top, hips at bottom
tl = int(0.50 * U)
d.rounded_rectangle([tx - 150, ty, tx + 150, ty + tl + 20], radius=110, fill=G)
layout["torso"] = {"a": (tx, ty + tl), "b": (tx, ty + 40), "r": 150}
px, py = 1500, 200
d.rounded_rectangle([px - 140, py, px + 140, py + 300], radius=100, fill=G)
layout["pelvis"] = {"a": (px, py + 170), "b": (px, py + 30), "r": 140}

# row 2: arms and shoe
y2 = 760
capsule("uarm", 260, y2, int(0.27 * U), 95, 80)
capsule("farm", 640, y2, int(0.26 * U), 78, 60,
        lambda a, b: d.ellipse([b[0] - 75, b[1] - 20, b[0] + 75, b[1] + 150], fill=G))
# shoe: ankle at top, sole below, toe to the left
sx, sy = 1300, 900
d.rounded_rectangle([sx - 300, sy + 60, sx + 110, sy + 200], radius=60, fill=G)
d.rounded_rectangle([sx - 90, sy - 110, sx + 110, sy + 150], radius=60, fill=G)
layout["shoe"] = {"a": (sx + 10, sy), "b": (sx - 220, sy + 130), "r": 100}

# row 3: legs
y3 = 1400
ll = int(0.43 * U)
capsule("thighN", 260, y3, ll, 125, 105)
capsule("shinN", 700, y3, ll, 105, 90)
capsule("thighF", 1180, y3, ll, 125, 105)
capsule("shinF", 1620, y3, ll, 105, 90)

os.makedirs("out/bakeoff/parts/gen", exist_ok=True)
img.save("out/bakeoff/parts/gen/template.png")
json.dump(layout, open("bakeoff/parts/layout.json", "w"), indent=1)
print("ok")
