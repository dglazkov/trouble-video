"""Cut the crowd's sheets into cels: .venv/bin/python kits/crowd/cut.py [--qc]

The crowd is background people for a set (sets/market.js): each is two whole-figure drawings that register to each
other, going about their business (0) and startled (1). They are painted in sheets (kits/crowd/source/SHEET.jpg, made
with art/gen.py): two rows on flat magenta, the calm drawings on top and the same people startled beneath, one scale,
each row's feet on one baseline (a ground line ruled under a row is taken out). cast.json says who is on each sheet, left to right:
  { "SHEET": { "people": [{ "name", "role": "shopper" | "keeper" | "special", "front": -1 | 1 (which way the calm
      drawing faces on the sheet: left or right), "height": metres to the top of the calm drawing (optional),
      "skip": true (not used), "drop": [[x0, y0, x1, y1], ...] (sheet pixels to erase: a stray mark) }] } }
Every sheet is keyed off its ground the way the cast's are (pipeline/cels.py key), its figures found as the ten
largest pieces with what was painted loose beside each (a dropped tool, a flying hat) given to the nearest, and each
drawing is registered by its row's baseline (the ground) and the middle of its feet ("feet": how wide it stands, for
keeping it off a kerb); the sheet's scale is the median
of its people's stated heights over their painted ones, so two drawings of a person share a scale and a ground point.
Writes kits/crowd/NAME/0.webp and 1.webp and the whole of kits/crowd/kit.json; refuses a sheet whose figures do not
count to what cast.json lists. --qc also writes out/qc/crowd_SHEET.png, every cel at full size on the market's dusk,
and lists each sheet's loose pieces and where they are (what a "drop" is written from).
"""
import json, os, sys
import numpy as np, cv2
from scipy import ndimage

sys.dont_write_bytecode = True
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "pipeline"))
from cels import key  # noqa: E402

K = 640            # pixels per metre the cels are stored at (a figure is seen at 1:1 from about two metres)
LOOSE = 0.09       # how far (of the sheet's height) a loose piece may be from the figure it belongs to
SPECK = 0.00002    # pieces smaller than this share of the sheet are dirt


def cut_sheet(sheet, spec, qc):
    img = cv2.imread(os.path.join(HERE, "source", sheet + ".jpg"))
    if img is None: sys.exit(f"{sheet}: no kits/crowd/source/{sheet}.jpg")
    H, W = img.shape[:2]; people = spec["people"]; n = len(people)
    for p in people:
        for x0, y0, x1, y1 in p.get("drop", []): img[y0:y1, x0:x1] = img[2, 2]
    alpha, col = key(img)
    # a ground line ruled under a row's feet is not part of anyone: thin, level, and most of the sheet long
    solid = (alpha > 0.5).astype(np.uint8); thin = solid & ~cv2.morphologyEx(solid, cv2.MORPH_OPEN, np.ones((25, 1), np.uint8))
    line = cv2.morphologyEx(thin, cv2.MORPH_OPEN, np.ones((1, 121), np.uint8)); band = np.convolve(line.sum(1), np.ones(31), "same") > 0.25 * W
    line[~band] = 0; alpha[cv2.dilate(line, np.ones((7, 7), np.uint8)) > 0] = 0
    lab, cnt = ndimage.label(alpha > 0.5)
    area = ndimage.sum(np.ones_like(lab), lab, range(1, cnt + 1)); box = ndimage.find_objects(lab)
    order = np.argsort(-area); big = [int(i) for i in order[:2 * n] if area[i] > 0.2 * area[order[0]]]
    if len(big) != 2 * n: sys.exit(f"{sheet}: {len(big)} figures found, cast.json lists {n} people in two rows")
    cy = lambda i: (box[i][0].start + box[i][0].stop) / 2; cx = lambda i: (box[i][1].start + box[i][1].stop) / 2
    rows = sorted(big, key=cy); rows = [sorted(rows[:n], key=cx), sorted(rows[n:], key=cx)]
    # loose pieces go to the nearest figure
    owner = {i: i for i in big}
    for i in order[len(big):]:
        i = int(i)
        if area[i] < SPECK * H * W: break
        def gap(b):
            dy = max(box[b][0].start - box[i][0].stop, box[i][0].start - box[b][0].stop, 0); dx = max(box[b][1].start - box[i][1].stop, box[i][1].start - box[b][1].stop, 0)
            return np.hypot(dx, dy)
        b = min(big, key=gap)
        if gap(b) < LOOSE * H: owner[i] = b
        if qc: print(f"  {sheet}: loose piece at {box[i][1].start},{box[i][0].start},{box[i][1].stop},{box[i][0].stop} {'kept' if i in owner else 'left out'}")
    base = [float(np.median([box[i][0].stop for i in r])) for r in rows]
    stated = [(base[0] - box[rows[0][j]][0].start) / p["height"] for j, p in enumerate(people) if p.get("height")]
    if not stated: sys.exit(f"{sheet}: no person has a height")
    k = float(np.median(stated)); s = K / k; out = []; tiles = []
    for j, p in enumerate(people):
        if p.get("skip"): continue
        cels = []
        for r in (0, 1):
            b = rows[r][j]; ids = [i + 1 for i, o in owner.items() if o == b]; m = np.isin(lab, ids)
            ys, xs = np.where(m); y0, y1, x0, x1 = max(ys.min() - 6, 0), min(ys.max() + 7, H), max(xs.min() - 6, 0), min(xs.max() + 7, W)
            # soft edges of this figure's pieces only: its mask grown a little, so a neighbour's edge is not taken with it
            a = alpha[y0:y1, x0:x1] * cv2.dilate(m[y0:y1, x0:x1].astype(np.uint8), np.ones((9, 9), np.uint8))
            # the middle of the feet: of the body's lowest twentieth
            bs = box[b]; low = lab[bs[0].stop - max(4, (bs[0].stop - bs[0].start) // 20):bs[0].stop, bs[1]] == b + 1; fx = bs[1].start + float(np.where(low)[1].mean())
            stood = np.where(lab[bs[0].stop - (bs[0].stop - bs[0].start) // 8:bs[0].stop, bs[1]] == b + 1)[1]      # how wide it stands: its lowest eighth
            ground = min(base[r], bs[0].stop) if r == 0 else base[r]      # a startled figure off the ground is left in the air
            rgba = np.dstack([col[y0:y1, x0:x1], a * 255]).clip(0, 255).astype(np.uint8)
            rgba = cv2.resize(rgba, (max(1, round(rgba.shape[1] * s)), max(1, round(rgba.shape[0] * s))), interpolation=cv2.INTER_AREA)
            d = os.path.join(HERE, p["name"]); os.makedirs(d, exist_ok=True)
            cv2.imwrite(os.path.join(d, f"{r}.webp"), rgba, [cv2.IMWRITE_WEBP_QUALITY, 94])
            cels.append({"img": f"{p['name']}/{r}.webp", "w": rgba.shape[1], "h": rgba.shape[0], "ground": [round((fx - x0) * s, 1), round((ground - y0) * s, 1)], "feet": [round((bs[1].start + int(stood.min()) - x0) * s, 1), round((bs[1].start + int(stood.max()) - x0) * s, 1)]})
            if qc: tiles.append(rgba)
        out.append({"name": p["name"], "role": p["role"], "front": p["front"], "sheet": sheet, "k": K, "cels": cels})
    if qc:
        h = max(t.shape[0] for t in tiles) + 20; strip = []
        for t in tiles:
            bg = np.full((h, t.shape[1] + 20, 3), (58, 52, 86), np.float32); a = t[..., 3:4] / 255.0
            bg[h - 10 - t.shape[0]:h - 10, 10:10 + t.shape[1]] = bg[h - 10 - t.shape[0]:h - 10, 10:10 + t.shape[1]] * (1 - a) + t[..., :3] * a; strip.append(bg.astype(np.uint8))
        os.makedirs(os.path.join(ROOT, "out", "qc"), exist_ok=True); q = os.path.join(ROOT, "out", "qc", f"crowd_{sheet}.png"); cv2.imwrite(q, np.hstack(strip)); print("qc", os.path.relpath(q, ROOT))
    return out


def main():
    if "--help" in sys.argv: sys.exit(__doc__)
    cast = json.load(open(os.path.join(HERE, "cast.json"))); people = []
    for sheet, spec in cast.items(): people += cut_sheet(sheet, spec, "--qc" in sys.argv)
    names = [p["name"] for p in people]
    if len(set(names)) != len(names): sys.exit("two people share a name: " + ", ".join(sorted(n for n in set(names) if names.count(n) > 1)))
    json.dump({"name": "crowd", "people": people}, open(os.path.join(HERE, "kit.json"), "w"), indent=1)
    print(json.dumps({"people": len(people), "drawings": 2 * len(people), "kit": "kits/crowd/kit.json"}))


if __name__ == "__main__": main()
