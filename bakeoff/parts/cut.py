"""Cut a generated parts sheet into keyed RGBA parts.
  .venv/bin/python bakeoff/parts/cut.py SHEET.png name:x0,y0,x1,y1[:flip] ...
Boxes are in sheet pixels and only need to enclose one part loosely: the largest connected blob inside wins.
Writes out/bakeoff/parts/kit/<name>.png (colour, straight alpha), <name>_in.png (same colour, alpha eroded past the
ink outline: used to hide outlines where two parts of one limb overlap) and merges boxes into kit/kit.json."""
import json, os, sys
import numpy as np, cv2

sheet = cv2.imread(sys.argv[1], cv2.IMREAD_COLOR).astype(np.float32)
out = "out/bakeoff/parts/kit"; os.makedirs(out, exist_ok=True)
B, G, R = sheet[..., 0], sheet[..., 1], sheet[..., 2]
m = np.minimum(R, B) - G                       # magenta-ness: 255 on the ground, ~0 on ink
alpha = 1 - np.clip((m - 70) / 110, 0, 1)
# unmix the magenta from soft edge pixels
a3 = np.maximum(alpha, 0.05)[..., None]
col = np.clip((sheet - (1 - alpha[..., None]) * np.array([255, 0, 255], np.float32)) / a3, 0, 255)
kj = os.path.join(out, "kit.json")
kit = json.load(open(kj)) if os.path.exists(kj) else {}
for spec in sys.argv[2:]:
    bits = spec.split(":"); name = bits[0]; x0, y0, x1, y1 = map(int, bits[1].split(",")); flip = len(bits) > 2
    a = alpha[y0:y1, x0:x1].copy()
    n, lab, st, _ = cv2.connectedComponentsWithStats((a > 0.5).astype(np.uint8), 8)
    k = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
    keep = cv2.dilate((lab == k).astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
    a = a * keep
    ys, xs = np.nonzero(a > 0.02); bx0, bx1, by0, by1 = xs.min() - 4, xs.max() + 5, ys.min() - 4, ys.max() + 5
    bx0, by0 = max(bx0, 0), max(by0, 0)
    a = a[by0:by1, bx0:bx1]; c = col[y0:y1, x0:x1][by0:by1, bx0:bx1]
    # bleed colour outward so bilinear sampling at the edge never picks up keyed-out ground
    solid = (a > 0.6).astype(np.uint8)
    c8 = c.astype(np.uint8)
    c8 = cv2.inpaint(c8, ((1 - solid) * 255).astype(np.uint8), 3, cv2.INPAINT_TELEA) if solid.mean() < 0.999 else c8
    inner = cv2.erode((a > 0.9).astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (19, 19)))
    inner = cv2.GaussianBlur(inner.astype(np.float32), (0, 0), 1.2)
    rgba = np.dstack([c8, (a * 255).astype(np.uint8)]); rin = np.dstack([c8, (inner * 255).astype(np.uint8)])
    if flip: rgba, rin = rgba[:, ::-1], rin[:, ::-1]
    cv2.imwrite(f"{out}/{name}.png", rgba); cv2.imwrite(f"{out}/{name}_in.png", rin)
    kit[name] = {"x": x0 + int(bx0), "y": y0 + int(by0), "w": int(a.shape[1]), "h": int(a.shape[0]), "flip": flip}
    print(name, kit[name])
json.dump(kit, open(kj, "w"), indent=1)
