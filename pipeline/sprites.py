"""Cut a plate and its edits into drawings a shot can lay in and swap on one another:

  sprites.py OUT_DIR NAME BASE.jpg [EDIT.jpg ...] [--split N] [--names a,b,c,d] [--pad 12] [--scale 1.0] [--erode 9]
      -> OUT_DIR/NAME_0.webp, NAME_1.webp ... (BASE first, then each EDIT), or with --split
         OUT_DIR/NAME_<who>_0.webp ... one set per figure, and OUT_DIR/NAME.json saying where each was in the picture

Each EDIT is first graded and registered to BASE (pipeline/match.py --register), so that drawings swapped on twos
differ only in what was changed; every picture is lifted off its magenta (pipeline/key.py); and all the drawings of
one figure are cropped to ONE box (the union of that figure in every picture), so they hang at the same place.
--split N: the plate holds N separate figures (painted in one image so that they are alike, never touching): the N
largest connected shapes of BASE each become their own set, in reading order (top row first, left to right) unless
--names gives the order they are in; smaller loose shapes (a sandal off a foot) go to the figure they are nearest.
--scale: store them smaller (a 4K plate that is never shown above half size).
"""
import sys, os, json, subprocess
sys.dont_write_bytecode = True
import numpy as np, cv2
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))


def index(files):
    """sprites.py index kits/*/fall/*.json -> a JS module on stdout: every sprite, its files and its size as stored."""
    out = {}
    for f in sorted(files):
        m = json.load(open(f)); d = os.path.dirname(f); kit = os.path.basename(os.path.dirname(d))
        for k, v in m["sprites"].items():
            w, h = Image.open(os.path.join(d, v["files"][0])).size
            out[f"{kit}.{k if k != os.path.basename(f)[:-5] else k}" if "_" not in v["files"][0][len(os.path.basename(f)[:-5]) + 1:] else f"{kit}.{os.path.basename(f)[:-5]}_{k}"] = {
                "files": ["/" + os.path.relpath(os.path.join(d, x), os.path.join(HERE, "..")) for x in v["files"]], "w": w, "h": h, "box": v["box"], "of": m["size"], "k": m["scale"]}
    print("// The fall's drawings as a shot hangs them: made by `pipeline/sprites.py index kits/*/fall/*.json` (do not edit by hand).\n"
          "// files: one per drawing of the set (the first is the plate, the rest its edits); w, h: their size as stored;\n"
          "// box: where the set sat in the picture it was cut from (pixels of `of`); k: stored size over painted size.")
    print("export const SPRITES = " + json.dumps(out, indent=1) + ";")


def main():
    a = sys.argv[1:]
    if a and a[0] == "index": return index(a[1:])
    if len(a) < 3 or a[0] in ("-h", "--help"): sys.exit(__doc__)
    opt = lambda k, d=None: (a.pop(a.index(k) + 1), a.remove(k))[0] if k in a else d
    split, names, pad, scale = int(opt("--split", 0)), opt("--names"), int(opt("--pad", 12)), float(opt("--scale", 1)); opt_erode = opt("--erode", 9)
    out, name, base, edits = a[0], a[1], a[2], a[3:]
    os.makedirs(out, exist_ok=True)
    files = [base]
    if edits:
        r = subprocess.run([sys.executable, os.path.join(HERE, "match.py"), "--register", base, *edits], capture_output=True, text=True)
        if r.returncode: sys.exit(r.stderr)
        report = json.loads(r.stdout); files += [x["wrote"] for x in report]
    else: report = []
    r = subprocess.run([sys.executable, os.path.join(HERE, "key.py"), *files], capture_output=True, text=True)
    if r.returncode: sys.exit(r.stderr or r.stdout)
    keyed = [x["wrote"] for x in json.loads(r.stdout)]
    ims = [cv2.imread(k, cv2.IMREAD_UNCHANGED) for k in keyed]
    H, W = ims[0].shape[:2]
    # the image model signs its pictures with a small pale mark in the bottom right corner, and leaves specks: neither is drawing
    for im in ims:
        n, lab, st, _ = cv2.connectedComponentsWithStats((im[..., 3] > 24).astype(np.uint8))
        for i in range(1, n):
            x, y, w, h, area = st[i]
            if area < 30 or (area < 0.0008 * W * H and x > 0.9 * W and y > 0.86 * H): im[lab == i] = 0
    solid = [(im[..., 3] > 24).astype(np.uint8) for im in ims]
    groups = [("", np.ones((H, W), bool))]
    if split:
        n, lab, st, cen = cv2.connectedComponentsWithStats(cv2.erode(solid[0], np.ones((int(opt_erode), int(opt_erode)), np.uint8)))      # eroded: two figures whose hair tips meet are still two
        order = sorted(range(1, n), key=lambda i: -st[i, cv2.CC_STAT_AREA]); big = order[:split]
        if len(big) < split: sys.exit(f"{base}: {len(big)} separate figures, not {split}")
        rows = sorted(big, key=lambda i: cen[i][1]); half = (split + 1) // 2 if split > 2 else split
        big = [i for row in (rows[:half], rows[half:]) for i in sorted(row, key=lambda i: cen[i][0])]
        who = names.split(",") if names else [str(i) for i in range(split)]
        # every other shape goes with the figure whose middle is nearest
        owner = {i: i for i in big}
        for i in order[split:]:
            if st[i, cv2.CC_STAT_AREA] < 40: continue
            owner[i] = min(big, key=lambda b: np.hypot(*(cen[b] - cen[i])))
        # the whole picture is shared out by which figure of BASE is nearest (an edit's hair may reach further than BASE's)
        seeds = np.zeros((H, W), np.int32)
        for i, b in owner.items(): seeds[lab == i] = big.index(b) + 1
        dist, near = cv2.distanceTransformWithLabels((seeds == 0).astype(np.uint8), cv2.DIST_L2, 3, labelType=cv2.DIST_LABEL_PIXEL)
        ys, xs = np.nonzero(seeds); lut = np.zeros(near.max() + 1, np.int32); lut[near[ys, xs]] = seeds[ys, xs]
        region = lut[near]
        groups = [(f"_{who[k]}", region == k + 1) for k in range(split)]
    manifest = {"source": os.path.relpath(base, os.path.join(HERE, "..")), "size": [W, H], "scale": scale, "match": report, "sprites": {}}
    for suffix, mask in groups:
        union = np.zeros((H, W), bool)
        for s in solid: union |= (s > 0) & mask
        ys, xs = np.nonzero(union)
        x0, x1, y0, y1 = max(0, xs.min() - pad), min(W, xs.max() + 1 + pad), max(0, ys.min() - pad), min(H, ys.max() + 1 + pad)
        made = []
        for j, im in enumerate(ims):
            c = im.copy(); c[~mask] = 0; c = c[y0:y1, x0:x1]
            rgba = Image.fromarray(cv2.cvtColor(c, cv2.COLOR_BGRA2RGBA))
            if scale != 1: rgba = rgba.resize((round(rgba.width * scale), round(rgba.height * scale)), Image.LANCZOS)
            f = os.path.join(out, f"{name}{suffix}_{j}.webp"); rgba.save(f, quality=95, method=4, exact=True); made.append(os.path.basename(f))
        manifest["sprites"][(suffix[1:] or name)] = {"box": [int(x0), int(y0), int(x1), int(y1)], "files": made}
    for k in keyed: os.remove(k)
    json.dump(manifest, open(os.path.join(out, name + ".json"), "w"), indent=1)
    print(json.dumps(manifest, indent=1))


if __name__ == "__main__": main()
