"""Cut step of a kit: key the painted sheets, cut each part out by its layout, and write the kit.

  cut.py NAME [VIEW ...]     (default: every view named in kits/NAME/source/chosen.json)

chosen.json says which takes the kit is made of:
  { "front": { "sheet": "sheet_7", "parts": { "neck": "sheet_4", "shoe_R": null },
               "variants": { "head": { "blink": "patch_1" } } }, ... }
"sheet" is the take most parts come from; "parts" overrides single parts with another take (null leaves a part
out: the puppet then mirrors the other side's); "variants" name patch takes (paint.py patch) holding an edit of one
part, such as closed eyes: the variant is cut with the part's own crop and silhouette, so it registers exactly.
Two corrections for when the model painted the right thing the wrong way round, both judged by eye on the QC sheet:
"flip": ["shoe_L"] mirrors a drawing inside its own box (it faces the wrong way); "as": {"thigh_L": "thigh_R"}
files a drawing under the other side's name (its outer details are on the wrong side). Neither moves a joint.
--max-k N (default 900) caps a part's resolution in pixels per body unit; larger drawings are scaled down.
Each take is cut by the layout it was painted over (TAKE.layout.json), so every attachment point in kit.json comes
from the template, never from the drawing.

Writes kits/NAME/VIEW/PART.png (colour, straight alpha), PART_in.png (grey: the alpha eroded past the ink outline,
used to hide outlines at joints), kits/NAME/kit.json and a QC sheet kits/NAME/qc/VIEW.png. Prints a JSON report; a part
whose blob is not where its shape was, or still has the template's grey, is listed under "warnings".
"""
import json, os, sys
import numpy as np, cv2

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
VIEW_YAW = {"front": 0, "front34": 45, "side": 90, "back34": 135, "back": 180}
GREY = (0x96, 0x96, 0x96)
# the colour key's label colours (pipeline/layout.js LEGEND): a part still in its label colour was never painted.
# The pelvis label is left out: it is the colour of dark trousers.
LABELS = {"head": (0xdc, 0xdc, 0xdc), "neck": (0xf3, 0xe9, 0xa6), "collar_back": (0xc9, 0xa8, 0x00), "torso": (0x8c, 0x8c, 0x8c),
          "uarm": (0x2e, 0x8b, 0x57), "farm": (0xa5, 0xdb, 0xa9), "thigh": (0x2a, 0x52, 0xbe), "shin": (0x9d, 0xbc, 0xff),
          "shoe": (0x8b, 0x5a, 0x2b), "bent": (0x17, 0xa3, 0x98)}


def key(sheet):
    """magenta ground -> alpha, and the colour with the ground unmixed from soft edges"""
    B, G, R = sheet[..., 0], sheet[..., 1], sheet[..., 2]
    m = np.minimum(R, B) - G                        # magenta-ness: ~255 on the ground, ~0 on ink
    alpha = 1 - np.clip((m - 70) / 110, 0, 1)
    a3 = np.maximum(alpha, 0.05)[..., None]
    col = np.clip((sheet - (1 - alpha[..., None]) * np.array([255, 0, 255], np.float32)) / a3, 0, 255)
    return alpha, col


_cache = {}


def take(src, view, name):
    k = (view, name)
    if k not in _cache:
        f = os.path.join(src, view, name + ".jpg")
        sheet = cv2.imread(f, cv2.IMREAD_COLOR).astype(np.float32)
        layout = json.load(open(os.path.join(src, view, name + ".layout.json")))
        s = layout["size"]
        if sheet.shape[0] != s: sheet = cv2.resize(sheet, (s, s), interpolation=cv2.INTER_LANCZOS4)
        alpha, col = key(sheet)
        n, lab, st, _ = cv2.connectedComponentsWithStats((alpha > 0.5).astype(np.uint8), 8)
        _cache[k] = dict(alpha=alpha, col=col, lab=lab, st=st, layout=layout, file=os.path.relpath(f, ROOT))
    return _cache[k]


def cut_part(t, part, box):
    """the blob with most of its area inside the part's box, whole. Returns rgba, inner rgba, origin, checks"""
    x0, y0, x1, y1 = box
    ids, cnt = np.unique(t["lab"][y0:y1, x0:x1], return_counts=True)
    best = max(((c, i) for i, c in zip(ids, cnt) if i != 0), default=(0, 0))
    if not best[1]: return None
    comp = t["lab"] == best[1]
    keep = cv2.dilate(comp.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
    a = t["alpha"] * keep
    ys, xs = np.nonzero(a > 0.02)
    bx0, bx1, by0, by1 = max(xs.min() - 6, 0), xs.max() + 7, max(ys.min() - 6, 0), ys.max() + 7
    a = a[by0:by1, bx0:bx1]; c = t["col"][by0:by1, bx0:bx1]
    solid = (a > 0.6).astype(np.uint8)
    c8 = c.astype(np.uint8)
    if solid.mean() < 0.999: c8 = cv2.inpaint(c8, ((1 - solid) * 255).astype(np.uint8), 3, cv2.INPAINT_TELEA)   # bleed colour past the edge
    inner = cv2.erode((a > 0.9).astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (17, 17)))
    inner = cv2.GaussianBlur(inner.astype(np.float32), (0, 0), 1.2)
    # the ink-free copy must not carry ink inside either: where the eroded edge still sits on dark line, pull colour from within
    inside = float(best[0]) / max(1, int(t["st"][best[1], cv2.CC_STAT_AREA]))
    px = c8[a > 0.9].astype(np.int32)
    labels = [GREY] + ([LABELS[part["kind"]]] if part["kind"] in LABELS else [])
    label = max(float((np.abs(px - np.array(l[::-1])).max(axis=1) < 16).mean()) for l in labels) if len(px) else 1.0
    return dict(rgba=np.dstack([c8, (a * 255).astype(np.uint8)]), rin=np.dstack([c8, (inner * 255).astype(np.uint8)]),
                origin=(int(bx0), int(by0)), inside=inside, label=label, area=int(solid.sum()))


def trunk_holes(r, lp):
    """A trunk painted as an empty garment has see-through holes where the arms and neck leave it. The layout says
    which is which: a hole at a shoulder joint is filled with the garment's shade (the arm that covers it moves away),
    and the neck opening stays open but loses the outline the model drew round it (a stump's rim would float on the neck)."""
    rgba, rin = r["rgba"].copy(), r["rin"].copy(); ox, oy = r["origin"]; k = lp["k"]
    n, lab, st, cen = cv2.connectedComponentsWithStats((rgba[..., 3] < 128).astype(np.uint8), 4)
    h, w = lab.shape; done = []
    pt = lambda nm: (lp["pts"][nm][0] - ox, lp["pts"][nm][1] - oy)
    for i in range(1, n):
        x, y, bw, bh, area = st[i]
        if area < 60 or x == 0 or y == 0 or x + bw == w or y + bh == h: continue     # not enclosed
        cx, cy = cen[i]; hole = lab == i
        if min(np.hypot(cx - pt(s)[0], cy - pt(s)[1]) for s in ("shL", "shR")) < 0.17 * k:
            grown = cv2.dilate(hole.astype(np.uint8), np.ones((3, 3), np.uint8), iterations=14) > 0
            ring = grown & ~hole & (rgba[..., 3] > 200)
            px = rgba[..., :3][ring]; px = px[px.max(axis=1) > 90]                     # the fill round the hole, not its ink
            if not len(px): continue
            col = (np.median(px, axis=0) * 0.88).astype(np.uint8)
            m = cv2.dilate(hole.astype(np.uint8), np.ones((3, 3), np.uint8), iterations=2) > 0
            soft = rgba[..., 3:4].astype(np.float32) / 255
            rgba[..., :3][m] = (rgba[..., :3][m] * soft[m] + col * (1 - soft[m])).astype(np.uint8)
            rgba[..., 3][m] = 255; rin[..., :3][m] = rgba[..., :3][m]; rin[..., 3][hole] = 255
            done.append("armhole filled")
        elif abs(cx - pt("b")[0]) < 0.1 * k and cy < pt("b")[1] + 0.06 * k:
            rim = cv2.dilate(hole.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (19, 19))) > 0
            rgba[..., 3][rim] = 0; rin[..., 3][rim] = 0
            done.append("neck opening cleared")
    r["rgba"], r["rin"] = rgba, rin
    return done


def qc_sheet(view, parts, out):
    """every cut part on a checker, with its attachment points and name: for looking at"""
    cell, cols = 330, 6
    rows = (len(parts) + cols - 1) // cols
    img = np.zeros((rows * cell, cols * cell, 3), np.uint8)
    yy, xx = np.mgrid[0:rows * cell, 0:cols * cell]
    img[:] = np.where(((yy // 16 + xx // 16) % 2 == 0)[..., None], 205, 235)
    for i, (name, p, rgba) in enumerate(parts):
        h, w = rgba.shape[:2]; k = min((cell - 40) / w, (cell - 50) / h)
        im = cv2.resize(rgba, (max(1, int(w * k)), max(1, int(h * k))), interpolation=cv2.INTER_AREA)
        ox, oy = (i % cols) * cell + (cell - im.shape[1]) // 2, (i // cols) * cell + 34
        a = im[..., 3:4] / 255.0
        roi = img[oy:oy + im.shape[0], ox:ox + im.shape[1]]
        roi[:] = (roi * (1 - a) + im[..., :3] * a).astype(np.uint8)
        for j, (n, pt) in enumerate(p["pts"].items()):
            q = (int(ox + pt[0] * k), int(oy + pt[1] * k)); colr = [(0, 0, 255), (255, 80, 0), (0, 170, 0), (200, 0, 200), (0, 160, 200)][j % 5]
            cv2.drawMarker(img, q, (255, 255, 255), cv2.MARKER_CROSS, 16, 4); cv2.drawMarker(img, q, colr, cv2.MARKER_CROSS, 14, 2)
            cv2.putText(img, n, (q[0] + 6, q[1] - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.4, colr, 1, cv2.LINE_AA)
        if "a" in p["pts"] and "b" in p["pts"]:
            cv2.line(img, *[(int(ox + p["pts"][n][0] * k), int(oy + p["pts"][n][1] * k)) for n in "ab"], (0, 0, 0), 1, cv2.LINE_AA)
        cv2.putText(img, name + ("  !" if p.get("warn") else ""), ((i % cols) * cell + 8, (i // cols) * cell + 22), cv2.FONT_HERSHEY_SIMPLEX, 0.6,
                    (0, 0, 220) if p.get("warn") else (40, 40, 40), 2, cv2.LINE_AA)
    os.makedirs(os.path.dirname(out), exist_ok=True); cv2.imwrite(out, img)


def main():
    if len(sys.argv) < 2 or sys.argv[1] in ("-h", "--help"): sys.exit(__doc__)
    max_k = 900.0
    if "--max-k" in sys.argv: i = sys.argv.index("--max-k"); max_k = float(sys.argv[i + 1]); del sys.argv[i:i + 2]
    name = sys.argv[1]; kit_dir = os.path.join(ROOT, "kits", name); src = os.path.join(kit_dir, "source")
    chosen = json.load(open(os.path.join(src, "chosen.json")))
    spec = json.load(open(os.path.join(kit_dir, "character.json")))
    kj = os.path.join(kit_dir, "kit.json")
    kit = json.load(open(kj)) if os.path.exists(kj) else {}
    kit.update(name=name, body=spec["body"]); kit.setdefault("views", {})
    report = {"views": {}, "warnings": []}
    for view in sys.argv[2:] or list(chosen):
        ch = chosen[view]; os.makedirs(os.path.join(kit_dir, view), exist_ok=True)
        base = take(src, view, ch["sheet"])
        out_parts, shown = {}, []
        for old in os.listdir(os.path.join(kit_dir, view)): os.remove(os.path.join(kit_dir, view, old))   # the view is rebuilt whole
        for pname in base["layout"]["parts"]:
            tname = ch.get("parts", {}).get(pname, ch["sheet"])
            if tname is None: continue
            t = take(src, view, tname)
            if pname not in t["layout"]["parts"]: sys.exit(f"{view}/{pname}: take {tname} has no such part")
            lp = t["layout"]["parts"][pname]
            r = cut_part(t, lp, lp["box"])
            if r is None: report["warnings"].append(f"{view}/{pname}: nothing painted in its box"); continue
            ox, oy = r["origin"]
            if lp["kind"] == "torso" and "shL" in lp["pts"]:
                fixed = trunk_holes(r, lp)
                if fixed: report.setdefault("notes", []).append(f"{view}/{pname}: " + ", ".join(fixed))
            raw_shape, raw_alpha = r["rgba"].shape[:2], r["rgba"][..., 3].copy()
            if pname in ch.get("flip", []): r["rgba"], r["rin"] = r["rgba"][:, ::-1], r["rin"][:, ::-1]
            sc = min(1.0, max_k / lp["k"])           # no part needs more pixels than the closest shot will show
            if sc < 1:
                size = (max(1, round(r["rgba"].shape[1] * sc)), max(1, round(r["rgba"].shape[0] * sc)))
                r["rgba"], r["rin"] = (cv2.resize(np.ascontiguousarray(x), size, interpolation=cv2.INTER_AREA) for x in (r["rgba"], r["rin"]))
            oname, pname = pname, ch.get("as", {}).get(pname, pname)
            p = dict(kind=lp["kind"], side=pname[-1] if lp["side"] else None, img=f"{view}/{pname}.png", w=int(r["rgba"].shape[1]), h=int(r["rgba"].shape[0]),
                     k=lp["k"] * sc, joints=lp["joints"], pts={n: [round((v[0] - ox) * sc, 1), round((v[1] - oy) * sc, 1)] for n, v in lp["pts"].items()},
                     src=t["file"], box=oname)
            if "skull" in lp: p["skull"] = [round((lp["skull"][0] - ox) * sc, 1), round((lp["skull"][1] - oy) * sc, 1), lp["skull"][2] * sc]; p["faceDir"] = lp["faceDir"]
            if "pose" in lp: p["pose"] = lp["pose"]
            why = []
            if r["inside"] < 0.8: why.append(f"only {r['inside']:.0%} of the blob is inside its box (merged with a neighbour or misplaced)")
            if r["label"] > 0.3: why.append(f"{r['label']:.0%} of it is still template colour (unpainted)")
            bw, bh = lp["box"][2] - lp["box"][0], lp["box"][3] - lp["box"][1]
            if r["area"] < 0.12 * bw * bh: why.append("much smaller than its shape")
            if why: p["warn"] = "; ".join(why); report["warnings"].append(f"{view}/{pname}: {p['warn']}")
            cv2.imwrite(os.path.join(kit_dir, view, pname + ".png"), np.ascontiguousarray(r["rgba"])); cv2.imwrite(os.path.join(kit_dir, view, pname + "_in.png"), np.ascontiguousarray(r["rin"][..., 3]))
            # variants: the same part from a patch take with the same layout, cut with this part's crop and silhouette
            for vname, vtake in ch.get("variants", {}).get(oname, {}).items():
                vt = take(src, view, vtake)
                if vt["layout"]["parts"][oname]["box"] != lp["box"]: sys.exit(f"{view}/{oname}@{vname}: take {vtake} has another layout")
                h0, w0 = raw_shape
                vc = vt["col"][oy:oy + h0, ox:ox + w0].astype(np.uint8)
                vim = np.dstack([vc, raw_alpha])
                if sc < 1: vim = cv2.resize(vim, (p["w"], p["h"]), interpolation=cv2.INTER_AREA)
                keep = r["rgba"][..., 3:4] > 0                 # outside the silhouette keep the base's bled colour
                vim = np.where(keep, vim, np.ascontiguousarray(r["rgba"]))
                cv2.imwrite(os.path.join(kit_dir, view, f"{pname}@{vname}.png"), vim)
                p.setdefault("variants", {})[vname] = f"{view}/{pname}@{vname}.png"
            out_parts[pname] = p; shown.append((pname, p, r["rgba"]))
        kit["views"][view] = dict(yaw=VIEW_YAW[view], parts=out_parts, sheet=base["file"])
        qc_sheet(view, shown, os.path.join(kit_dir, "qc", view + ".png"))
        report["views"][view] = {"parts": len(out_parts), "qc": f"kits/{name}/qc/{view}.png"}
    kit["sources"] = {"chosen": chosen, "design": json.load(open(os.path.join(src, "design.json")))["turnaround"] if os.path.exists(os.path.join(src, "design.json")) else None}
    json.dump(kit, open(kj, "w"), indent=1)
    print(json.dumps(report, indent=1))


main()
