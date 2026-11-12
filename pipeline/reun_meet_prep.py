"""The reunion's meet (shots/reun_meet.js): its plates made ready from the painted takes, by hand and the same way
every time: .venv/bin/python pipeline/reun_meet_prep.py
  kits/tane/closeup/reun_faces_{a,b,c}.png   the four seeing each other (a: before the laugh, take 4; b: the laugh,
        take 1; c: Tane and Ife look up, take 2), the edits graded and registered to take 1 (pipeline/match.py), and in
        all three: the second triangle on Juno's near sleeve painted out (the design has one a sleeve), the two brass
        buttons on Tane's cuff painted out (his coat has four down the front and nothing else), and the part of Ife's
        lens that hangs past her cheek, painted pink by the backdrop behind it, made the pale glass of the rest;
        and the eyes put on model (EYES below): Tane's, drawn as round cartoon circles in takes 4 and 2, are his own
        narrow angular ones (edit passes reun_faces_4e, reun_faces_2e), and Juno's irises, brown in take 4, are her teal
        (edit pass reun_faces_4j). Of each edit only the eye is taken, inside a feathered outline: outside those
        outlines the plates are the takes as they were. Take 1 (the laugh) has both pairs of eyes shut: nothing to do
  kits/tane/closeup/reun_skid_a.png          Tane and Ife pulling up: the ground line drawn under them taken out
  kits/juno/closeup/reun_skid_juno.png       Juno alone from reun_skid_b_1 (the Noor painted with her walks the wrong way)
"""
import subprocess, sys, os
import numpy as np, cv2
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
T = os.path.join(ROOT, "kits/tane/closeup/")
MAG = (255, 0, 255)  # BGR

# the eyes taken from the edit passes: plate -> (the edit, the outline of one eye in the plate's pixels)
EYES = {
    "a": [("reun_faces_4e", [(450, 348), (500, 342), (545, 346), (568, 362), (570, 400), (562, 416), (500, 416), (458, 408)]),     # Tane's left of picture
          ("reun_faces_4e", [(606, 362), (625, 354), (650, 358), (661, 372), (661, 410), (650, 422), (628, 422), (610, 412)]),     # Tane's right of picture
          ("reun_faces_4j", [(1722, 553), (1740, 546), (1762, 552), (1766, 575), (1764, 598), (1750, 608), (1732, 604), (1724, 590)]),   # Juno's
          ("reun_faces_4j", [(1806, 558), (1822, 544), (1860, 544), (1886, 560), (1884, 580), (1870, 598), (1840, 604), (1812, 594)])],
    "c": [("reun_faces_2e", [(462, 344), (474, 337), (500, 338), (545, 346), (566, 362), (566, 400), (556, 410), (500, 412), (472, 404)]),
          ("reun_faces_2e", [(606, 372), (622, 358), (650, 358), (661, 372), (661, 405), (650, 416), (628, 418), (610, 408)])],
}
EYE_EDITS = {"reun_faces_4.png": ["reun_faces_4e.jpg", "reun_faces_4j.jpg"], "reun_faces_2.png": ["reun_faces_2e.jpg"]}   # each graded and registered to its base

def eye_in(base, edit, poly, feather=1.6, reach=4):
    """The edit's eye set into the base, inside the outline only (feathered a few pixels): the edit first moved by the
    shift (half pixels, at most `reach`) that fits it best to the base in a band round the outline, and levelled to the
    base there, so the skin meets. Outside the outline grown by the feather the base is untouched."""
    h, w = base.shape[:2]; m = np.zeros((h, w), np.uint8); cv2.fillPoly(m, [np.int32(poly)], 255)
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (11, 11)); band = (cv2.dilate(m, k) > 0) & (cv2.erode(m, k) == 0)
    x0, y0, bw, bh = cv2.boundingRect(np.int32(poly)); p = reach + 12; X0, Y0, X1, Y1 = x0 - p, y0 - p, x0 + bw + p, y0 + bh + p
    b = base[Y0:Y1, X0:X1].astype(np.float32); e = edit[Y0:Y1, X0:X1].astype(np.float32); bd = band[Y0:Y1, X0:X1]; best = None
    for dy in np.arange(-reach, reach + .01, .5):
        for dx in np.arange(-reach, reach + .01, .5):
            s = cv2.warpAffine(e, np.float32([[1, 0, dx], [0, 1, dy]]), (e.shape[1], e.shape[0]), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
            c = float(np.abs(s - b).max(2)[bd].mean())
            if best is None or c < best[0]: best = (c, dx, dy, s)
    c, dx, dy, s = best; d = (b - s)[bd]; ok = np.abs(d).max(1) < 25
    if ok.sum() > 50: s = np.clip(s + np.median(d[ok], axis=0), 0, 255)
    a = cv2.GaussianBlur(m, (0, 0), feather).astype(np.float32) / 255; a[a < 0.02] = 0; a = a[Y0:Y1, X0:X1, None]
    out = base.copy(); out[Y0:Y1, X0:X1] = np.round(b * (1 - a) + s * a).astype(np.uint8)
    return out, (float(dx), float(dy))

def fix_eyes(im, name):
    for edit, poly in EYES.get(name, []):
        im, shift = eye_in(im, cv2.imread(T + edit + ".png"), poly); print(f"reun_faces_{name}: eye from {edit}, moved {shift}, box", cv2.boundingRect(np.int32(poly)))
    return im

def fix_faces(im):
    im = im.copy()
    def paint_out(box, pick, grow):
        x0, y0, x1, y1 = box; r = im[y0:y1, x0:x1].astype(np.int32); m = pick(r[..., 2], r[..., 1], r[..., 0]).astype(np.uint8) * 255
        m = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (grow, grow)))
        full = np.zeros(im.shape[:2], np.uint8); full[y0:y1, x0:x1] = m
        return cv2.inpaint(im, full, 7, cv2.INPAINT_TELEA)
    # Juno's second triangle: the sleeve's own flat orange over it and its outline (inpainting drags the coat's black in from beside it)
    x0, y0, x1, y1 = 2082, 950, 2180, 1052; r = im[y0:y1, x0:x1].astype(np.float32); R, G, B = r[..., 2], r[..., 1], r[..., 0]
    yel = ((R > 200) & (G > 160) & (B < 130)).astype(np.uint8); m = cv2.dilate(yel, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15)))
    orange = (R > 190) & (G > 80) & (G < 150) & (B < 90) & (m == 0); fill = np.median(r[orange], axis=0)
    w = cv2.GaussianBlur(m.astype(np.float32), (0, 0), 1.2)[..., None]; im[y0:y1, x0:x1] = (r * (1 - w) + fill * w).astype(np.uint8)
    im = paint_out((40, 1120, 140, 1210), lambda R, G, B: ((G > 100) & (R > 150) & (R - B > 50)), 23)      # Tane's cuff buttons
    x0, y0, x1, y1 = 1212, 672, 1266, 770; r = im[y0:y1, x0:x1].astype(np.int32); R, G, B = r[..., 2], r[..., 1], r[..., 0]
    pink = (G > 120) & (np.minimum(R, B) - G > 14)
    r[pink] = (238, 226, 222)                                                                             # the lens beyond her cheek
    im[y0:y1, x0:x1] = r.astype(np.uint8)
    return im

def main():
    py = sys.executable
    subprocess.run([py, os.path.join(ROOT, "pipeline/match.py"), "--register", T + "reun_faces_1.jpg", T + "reun_faces_4.jpg", T + "reun_faces_2.jpg"], check=True, stdout=subprocess.DEVNULL)
    for base, edits in EYE_EDITS.items():
        subprocess.run([py, os.path.join(ROOT, "pipeline/match.py"), "--register", T + base] + [T + e for e in edits], check=True, stdout=subprocess.DEVNULL)
    for name, src in (("a", "reun_faces_4.png"), ("b", "reun_faces_1.jpg"), ("c", "reun_faces_2.png")):
        cv2.imwrite(T + f"reun_faces_{name}.png", fix_faces(fix_eyes(cv2.imread(T + src), name)))
    # the ground line: dark pixels in its rows with the backdrop right above them
    a = cv2.imread(T + "reun_skid_a_1.jpg"); dark = a.max(2) < 90; rows = np.where(dark[:, 500:2400].mean(1) > 0.85)[0]
    if len(rows):
        y0, y1 = rows.min() - 3, rows.max() + 4; above = a[y0 - 6].astype(np.int32); clear = (np.minimum(above[:, 0], above[:, 2]) - above[:, 1]) > 120
        clear = cv2.erode(clear.astype(np.uint8)[None, :], np.ones((1, 9), np.uint8))[0] > 0
        a[y0:y1, clear] = a[5, 5]; a[y1:, :] = a[5, 5]
    cv2.imwrite(T + "reun_skid_a.png", a)
    j = cv2.imread(os.path.join(ROOT, "kits/juno/closeup/reun_skid_b_1.jpg")); j[:, 1700:] = j[5, 5]
    # the thrusters' blue flames against the backdrop: where the two mixed (pink, no ink line between them) is given to the backdrop, or the key leaves a pink line round each flame
    r = j[1150:, :1700]; B, G, R = (r[..., k].astype(np.int32) for k in range(3)); pink = (B > 150) & (R > 110) & (R > G + 20) & (G < 190); r[pink] = j[5, 5]
    cv2.imwrite(os.path.join(ROOT, "kits/juno/closeup/reun_skid_juno.png"), j)
    print("rows of the ground line:", (int(rows.min()), int(rows.max())) if len(rows) else None)
    # where each figure stands in its plate: the box of what is not backdrop
    for f in (T + "reun_skid_a.png", os.path.join(ROOT, "kits/juno/closeup/reun_skid_juno.png"), os.path.join(ROOT, "kits/noor/closeup/reun_stop_noor_1.jpg")):
        im = cv2.imread(f).astype(np.int32); fg = (np.minimum(im[..., 0], im[..., 2]) - im[..., 1]) < 100; ys, xs = np.where(fg); print(os.path.basename(f), "box", xs.min(), ys.min(), xs.max(), ys.max())

if __name__ == "__main__": main()
