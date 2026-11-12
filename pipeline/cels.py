"""Check, cut and register step of a cel kit: what turns a painted sheet (pipeline/paint.py) into drawings the engine places.

  cels.py check TAKE.jpg [...]        judge takes against the layout they were painted over; prints a JSON report per take
                                      and exits 1 if any is rejected
  cels.py cut TAKE.jpg [...]          key, cut and register every cel of the takes into kits/NAME/ACTION/VIEW/N.webp and
                                      kits/NAME/kit.json (several takes may each hold some of an action's cels), and write
                                      a full-size QC sheet out/qc/NAME_ACTION_VIEW.jpg; refuses a take the checks reject
                                      unless --force
  cels.py make NAME ACTION VIEW [--tries 3] [--size 4K] [--ref FILE ...] [--note "..."]
                                      paint, check, and paint again on rejection (each rejection is logged with its
                                      reasons in kits/NAME/log.jsonl); cut the first take that passes
  cels.py measure [--together] TAKE.jpg [...]
                                      how alike the cels of a take are: per cel, how much of each design colour shows and
                                      in how many pieces, and how much that varies between the cels
  cels.py selftest TAKE.jpg           break a good take every way the checks guard against and see each check fail

A take is judged by data, not by eye: its sidecar holds the layout it was painted over (where each mannequin stood,
which body part is where), and kits/NAME/character.json holds the design's colours. Rejected without a person:
  count     not exactly one figure per mannequin, or stray pieces
  pose      a figure does not cover its mannequin (a limb elsewhere, another pose, the key colour showing through);
            a held drawing such as a stand ("loose" in engine/actions.js) is held to its stance, not to each limb
  facing    the face is on the wrong side of the head for the view, or has no features
  size      a figure is larger or smaller than the others, relative to its mannequin
  place     a figure is not where its mannequin was
  palette   a part of the body is not in the design's colours for it (gloves in the hair's colour), or a material's
            flat colour has drifted from the design's
  mannequin the mannequin's own colours are still in the drawing
At the cut each of the design's flats is graded from the colour the take painted it to the design's own, so takes
agree in colour. A cel is registered by its layout: its scale is the layout's, and its ground point is the layout's moved by where the
figure was actually painted (sideways by the best fit of the mannequin inside the figure, vertically by the lowest
point of the shoes), so a cel stands on the ground whichever way the painter nudged it. A drawing that does not stand
on its lowest row ("float" in engine/actions.js: on a board, or seen from above) is registered by the fit both ways.
"""
import fcntl, json, os, subprocess, sys, time
import numpy as np, cv2
from scipy import ndimage

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
CLASSES = ["face", "hair", "neck", "torso", "pelvis", "garment", "uarm", "farm", "hand", "thigh", "shin", "shoe"]   # pipeline/layout.js NAMES
LIMBS = ["uarm", "farm", "thigh", "shin", "shoe"]
MANNEQUIN = ["#3f6fe6", "#2a49a8", "#9bb8ff", "#6c8bd6", "#e24a4a", "#a52e2e", "#ff9c9c", "#d06a6a"]   # engine/mannequin.js limb tones
T_DEFAULT = T = dict(
    cover=0.88,        # least share of a mannequin its figure must cover
    limb=0.55,         # least share of any one limb segment
    limb_loose=0.25,   # the same for a held drawing (an action that is "loose"), whose arms and feet may settle
    excess=0.30,       # most of a figure that may lie well outside its mannequin
    size=0.07,         # most a figure's size (relative to its mannequin) may differ from the sheet's median
    place=0.10,        # most a figure may be painted away from its mannequin, in body units
    debris=0.04,       # most stray area, as a share of one figure
    wear=0.35,         # least share of a body part's paint that is in the colours the design gives that part
    wear1=0.2,         # the same for one leg by itself
    off=0.16,          # most of a figure's paint that is in none of the design's colours
    mannequin=0.006,   # most of a figure still in mannequin colour
    features=0.03,     # least area the face's skin encloses (eyes, mouth) as a share of it, on a head not seen from behind
    drift=16.0,        # most (Lab) a flat's painted colour may be from the design's (less is graded away at the cut)
    near=17.0,         # how close (weighted Lab) a pixel must be to a design colour to count as it
)


def rel(p): return os.path.relpath(p, ROOT)
def hexrgb(h): return [int(h[i:i + 2], 16) for i in (1, 3, 5)]


def lab(rgb):
    """rgb (N,3) 0..255 -> Lab with lightness weighed down: a material's shade tone is the same material"""
    l = cv2.cvtColor(np.asarray(rgb, np.uint8).reshape(-1, 1, 3), cv2.COLOR_RGB2LAB).reshape(-1, 3).astype(np.float32)
    l[:, 0] *= 0.3
    return l


def key(img):
    """magenta ground -> soft alpha, and the colour with the ground unmixed from soft edges (BGR float). The ground is
    whatever magenta the painter actually used: it is measured off the sheet."""
    f = img.astype(np.float32); B, G, R = f[..., 0], f[..., 1], f[..., 2]
    m = np.minimum(R, B) - G                                   # magenta-ness: high on the ground, <= 0 on paint and ink
    g = m > 150
    if g.sum() < 0.05 * m.size: return np.ones(m.shape, np.float32), f      # no ground at all: the checks will say so
    ground = np.median(f[g][::97], 0); top = float(np.percentile(m[g][::97], 2))
    alpha = 1 - np.clip((m - 0.25 * top) / (0.6 * top), 0, 1)
    a3 = np.maximum(alpha, 0.08)[..., None]
    col = np.clip((f - (1 - alpha[..., None]) * ground) / a3, 0, 255)
    spill = np.clip(np.minimum(col[..., 0], col[..., 2]) - col[..., 1], 0, 255) * (alpha < 0.999)   # what magenta is left in soft pixels
    col[..., 0] -= spill; col[..., 2] -= spill
    return alpha, col


def flats(px, spec):
    """the colour each of the design's large flat materials ("flats") was actually painted in: its lighter, base tone,
    as the commonest colour among the paint nearest that material. px: (N,3) rgb paint, no ink.
    -> { name: [hex painted, Lab distance from the design's] }"""
    names = list(spec["palette"]); pal = lab([hexrgb(spec["palette"][c]) for c in names]); out = {}
    if not len(px): return out                          # no figure at all: the count check says so
    if len(px) > 600000: px = px[:: len(px) // 600000 + 1]
    fl = lab(px); dd = np.stack([np.linalg.norm(fl - p, axis=1) for p in pal], 1); near = dd.argmin(1); near[dd.min(1) > 30] = -1
    full = lambda c: cv2.cvtColor(np.uint8([[c]]), cv2.COLOR_RGB2LAB)[0, 0].astype(np.float32) * [100 / 255, 1, 1]
    for nm in spec.get("flats", []):
        p = px[near == names.index(nm)]
        if len(p) < 0.004 * len(px): out[nm] = [None, None]; continue      # the material is not in the drawing at all
        lum = p.sum(1); p = p[lum >= np.percentile(lum, 60)]
        q = (p // 8).astype(np.int32); keys = q[:, 0] * 1024 + q[:, 1] * 32 + q[:, 2]; u, cnt = np.unique(keys, return_counts=True)
        mode = p[keys == u[cnt.argmax()]].mean(0)
        out[nm] = ["#%02x%02x%02x" % tuple(int(v) for v in mode), round(float(np.linalg.norm(full(mode) - full(hexrgb(spec["palette"][nm])))), 1)]
    return out


def grade(col, alpha, spec, drift):
    """Pull each of the design's flats from the colour this take painted it to the design's own, softly: a pixel moves
    by its material's correction as far as it is that material. Takes then agree with the design and so with each
    other, whatever cast each came back with. col: BGR float, changed in place. drift: analyse()'s measurement."""
    m = alpha > 0.02; px = col[m][:, ::-1]; pl = lab(px); move = np.zeros_like(px); wsum = np.zeros(len(px), np.float32)
    for nm, (painted, de) in drift.items():
        if painted is None or de < 1.5: continue
        w = np.clip(1 - np.linalg.norm(pl - lab([hexrgb(painted)])[0], axis=1) / 24, 0, 1)
        move += w[:, None] * (np.array(hexrgb(spec["palette"][nm]), np.float32) - np.array(hexrgb(painted), np.float32)); wsum += w
    col[m] = np.clip(px + move / np.maximum(1, wsum)[:, None], 0, 255)[:, ::-1]
    return col


def load(take):
    """a take and what it was painted over -> dict(img, map, layout, spec, name, file)"""
    take = os.path.abspath(take); side = json.load(open(take[:-4] + ".json")); L = side["layout"]
    name = rel(take).split(os.sep)[1]
    mp = os.path.join(ROOT, side.get("map") or side["refs"][0][:-4] + "_map.png")
    img = cv2.imread(take, cv2.IMREAD_COLOR); mapi = cv2.imread(mp, cv2.IMREAD_COLOR)
    if img is None or mapi is None: raise SystemExit(f"cannot read {take} or its layout map {mp}")
    spec = json.load(open(os.path.join(ROOT, "kits", name, "character.json")))
    if L.get("prop"): spec["palette"] = {**spec["palette"], **spec["props"][L["prop"]]["palette"]}     # a prop in the drawing brings its colours
    return dict(img=img, map=mapi, layout=L, spec=spec, name=name, file=rel(take))


def bottom(mask):
    """the lowest row of a mask that holds more than a speck"""
    rows = np.nonzero(mask.sum(1) >= 3)[0]
    return int(rows.max()) if len(rows) else 0


def fit(F, M):
    """where the mannequin M sits inside the figure F: (dx, dy) of the middle of the shifts that cover M best"""
    ys, xs = np.nonzero(M); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    r = int(0.2 * max(y1 - y0, x1 - x0))
    Fp = cv2.copyMakeBorder(F.astype(np.float32), r, r, r, r, cv2.BORDER_CONSTANT, value=0)[y0:y1 + 2 * r, x0:x1 + 2 * r]
    res = cv2.matchTemplate(Fp, M[y0:y1, x0:x1].astype(np.float32), cv2.TM_CCORR)
    best = np.nonzero(res >= res.max() * 0.995)
    return float(best[1].mean() - r), float(best[0].mean() - r)


def shift(a, dx, dy):
    return cv2.warpAffine(a, np.float32([[1, 0, dx], [0, 1, dy]]), (a.shape[1], a.shape[0]), flags=cv2.INTER_NEAREST)


def analyse(t, full=False):
    """Judge a loaded take. Returns a report: { ok, reasons, cels: [...], spread, ... }. The judging is done on the
    sheet at the layout's own size; offsets are reported in body units. full: keep each cel's masks under "_"."""
    L, spec = t["layout"], t["spec"]
    T = {**T_DEFAULT, **spec.get("check", {})}      # a character may loosen a limit its design cannot keep (a long coat flies far from the body)
    top = L["view"] == "top"                        # seen from above: no face to judge
    TH, TW = t["img"].shape[:2]; reasons = []; bad = lambda kind, msg: reasons.append(f"{kind}: {msg}")
    loose = bool(L.get("loose"))      # a held drawing: judged on its stance, not limb by limb (engine/actions.js)
    if abs((TW / L["W"]) / (TH / L["H"]) - 1) > 0.01: bad("place", f"the sheet came back in another shape ({TW}x{TH} for a {L['W']}x{L['H']} layout)")
    W, H = L["W"], L["H"]; k = float(L["unit"])
    img = cv2.resize(t["img"], (W, H), interpolation=cv2.INTER_AREA) if (TW, TH) != (W, H) else t["img"]
    mapi = t["map"]
    man = mapi[..., 0] > 127
    pure = mapi[..., 0] > 250                                      # not an anti-aliased edge of the map
    cls = np.where(pure, np.rint((mapi[..., 2].astype(np.float32) - 20) / 20), -1).astype(np.int16)
    sidec = np.rint(mapi[..., 1] / 100.0).astype(np.int16)         # 0 none, 1 left, 2 right
    alpha, col = key(img)
    solid = (alpha > 0.5).astype(np.uint8)
    n, lab_, st, _ = cv2.connectedComponentsWithStats(solid, 8)
    cels = []; areas = []
    for c in L["cels"]:
        x0, y0, x1, y1 = c["box"]
        M = np.zeros_like(man); M[y0:y1, x0:x1] = man[y0:y1, x0:x1]
        cels.append(dict(index=c["index"], M=M, area=int(M.sum()), c=c)); areas.append(int(M.sum()))
    A = float(np.median(areas))
    big = [i for i in range(1, n) if st[i, cv2.CC_STAT_AREA] > 0.3 * A]
    small = [i for i in range(1, n) if 0.002 * A < st[i, cv2.CC_STAT_AREA] <= 0.3 * A]
    if len(big) != len(cels): bad("count", f"{len(big)} figures for {len(cels)} mannequins")
    owner = {}
    for ce in cels:
        ids, cnt = np.unique(lab_[ce["M"]], return_counts=True)
        best = max(((c, i) for i, c in zip(ids, cnt) if i in big), default=(0, 0))
        ce["comp"] = int(best[1])
        if not best[1]: bad("count", f"cel {ce['index']}: no figure on its mannequin"); continue
        if best[1] in owner: bad("count", f"cels {owner[best[1]]} and {ce['index']} are one joined figure"); ce["comp"] = 0; continue
        owner[best[1]] = ce["index"]
    debris = sum(int(st[i, cv2.CC_STAT_AREA]) for i in small)
    if debris > T["debris"] * A: bad("count", f"{len(small)} stray pieces ({debris / A:.0%} of a figure)")
    # the design's colours, and which each pixel is nearest
    names = list(spec["palette"]); pal = lab([hexrgb(spec["palette"][c]) for c in names])
    rgb = col[..., ::-1]
    ink = rgb.max(-1) < 46
    plab = lab(rgb.reshape(-1, 3)); dmin = np.full(len(plab), 1e9, np.float32); label = np.full(len(plab), -1, np.int16)
    for j, p in enumerate(pal):
        d = np.linalg.norm(plab - p, axis=1); nearer = d < dmin; dmin[nearer] = d[nearer]; label[nearer] = j
    label[dmin >= T["near"]] = -1; label = label.reshape(H, W); del plab, dmin
    fig = np.isin(lab_, [ce["comp"] for ce in cels if ce["comp"]]) & ~ink
    drift = flats(rgb[fig], spec)
    for nm, (painted, de) in drift.items():
        if painted is None: bad("palette", f"nothing in the drawing is the design's {nm} colour ({spec['palette'][nm]})")
        elif de > T["drift"]: bad("palette", f"the {nm} is painted {painted}, {de:.0f} from the design's {spec['palette'][nm]}")
    dm = np.full((H, W), 1e9, np.float32)
    for h in MANNEQUIN: dm = np.minimum(dm, np.abs(rgb - np.array(hexrgb(h), np.float32)).sum(-1))
    left = cv2.morphologyEx(((dm < 42) & (label < 0)).astype(np.uint8), cv2.MORPH_OPEN, np.ones((5, 5), np.uint8)) > 0   # areas, not the blend along an edge
    skin = label == names.index("skin") if "skin" in names else np.zeros_like(man)
    el = lambda r: cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))
    er = lambda m, r: cv2.erode(m.astype(np.uint8), el(r)) > 0
    di = lambda m, r: cv2.dilate(m.astype(np.uint8), el(r)) > 0
    out = []
    for ce in cels:
        if not ce["comp"]: continue
        i, c = ce["index"], ce["c"]
        Fw = lab_ == ce["comp"]
        dx, dy0 = fit(Fw, ce["M"]); dy = dy0 if L.get("float") else float(bottom(Fw) - bottom(ce["M"]))
        Mw = shift(ce["M"].astype(np.uint8), round(dx), round(dy)) > 0
        ys, xs = np.nonzero(Fw | Mw); pad = int(0.12 * k)
        win = (slice(max(0, ys.min() - pad), ys.max() + pad), slice(max(0, xs.min() - pad), xs.max() + pad))
        F, M = Fw[win], Mw[win]; lb = label[win]
        cl = shift(cls, round(dx), round(dy))[win]; sd = shift(sidec, round(dx), round(dy))[win]
        cover = float((F & M).sum() / max(1, M.sum()))
        limbs = {}
        for nm in LIMBS + ["hand", "face", "hair"]:
            for s_, sn in ((1, "L"), (2, "R")) if nm in LIMBS + ["hand"] else ((0, ""),):
                reg = M & (cl == CLASSES.index(nm)) & (sd == s_)
                if reg.sum() > 0.004 * ce["area"]: limbs[nm + ("." + sn if sn else "")] = float((F & reg).sum() / reg.sum())
        worst = min(limbs, key=limbs.get) if limbs else None
        excess = float((F & ~di(M, int(0.09 * k))).sum() / max(1, F.sum()))
        fy, fx = np.nonzero(Fw); my, mx = np.nonzero(ce["M"])
        size = float(np.sqrt(Fw.sum() / ce["area"])), float((fy.max() - fy.min()) / max(1, my.max() - my.min()))
        # facing: where the skin of the face is, round the middle of the head
        J = c["joints"]; hx, hy = J["head"][0] + dx - win[1].start, J["head"][1] + dy - win[0].start
        hr = 0.62 * np.hypot(J["crown"][0] - J["headBase"][0], J["crown"][1] - J["headBase"][1])
        yy, xx = np.ogrid[:F.shape[0], :F.shape[1]]; disc = ((xx - hx) ** 2 + (yy - hy) ** 2 < hr * hr) & F
        sk = skin[win] & disc; share = float(sk.sum() / max(1, disc.sum())); face = c.get("face", [0, 0, 1]); toward = 0.0
        if sk.sum() > 30:
            qy, qx = np.nonzero(sk); toward = float(((qx.mean() - hx) * face[0] + (qy.mean() - hy) * face[1]) / hr)
        # features: what the skin of the face encloses (eyes, a mouth); a blank face encloses nothing
        shut = cv2.morphologyEx(sk.astype(np.uint8), cv2.MORPH_CLOSE, el(2)) > 0          # a hair's breadth of ink does not open an eye
        features = float((ndimage.binary_fill_holes(shut) & ~shut).sum() / max(1, shut.sum()))
        paint = F & ~ink[win]; np_ = max(1, paint.sum())
        wear = {}
        for nm, allowed in spec.get("wear", {}).items():
            ok_ = np.isin(lb, [names.index(a) for a in allowed])
            reg = er(M & (cl == CLASSES.index(nm)), max(2, int(0.016 * k))) & paint
            if reg.sum() > 0.003 * ce["area"]: wear[nm] = float(ok_[reg].sum() / reg.sum())
            if nm not in ("thigh", "shin"): continue      # each leg by itself too, where much of it shows: a far leg left in
            for s_, sn in ((1, ".L"), (2, ".R")):         # mannequin red is one leg of two. (Arms and shoes hide behind the body
                reg = er(M & (cl == CLASSES.index(nm)) & (sd == s_), max(2, int(0.016 * k))) & paint   # too differently to judge singly.)
                if reg.sum() > 0.015 * ce["area"]: wear[nm + sn] = float(ok_[reg].sum() / reg.sum())
        off = float(((lb < 0) & paint).sum() / np_); lf = float((left[win] & F).sum() / max(1, F.sum()))
        shown = {nm: float(((lb == j) & paint).sum() / k / k) for j, nm in enumerate(names)}      # in square body units
        pieces = {}
        for nm in spec.get("marks", []):
            m8 = cv2.morphologyEx(((lb == names.index(nm)) & paint).astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
            nn, _, s2, _ = cv2.connectedComponentsWithStats(m8, 8)
            pieces[nm] = int(sum(1 for j in range(1, nn) if s2[j, cv2.CC_STAT_AREA] > 0.00025 * k * k))
        r = dict(index=i, cover=round(cover, 3), worst_limb=[worst, round(limbs[worst], 3)] if worst else None, excess=round(excess, 3),
                 size=[round(size[0], 3), round(size[1], 3)], offset=[round(dx / k, 3), round(dy / k, 3)], fit_dy=round(dy0 / k, 3),
                 face_skin=round(share, 3), face_toward=round(toward, 3), face_features=round(features, 3), wear={a: round(b, 2) for a, b in wear.items()},
                 off_palette=round(off, 3), mannequin=round(lf, 4), shown={a: round(b, 4) for a, b in shown.items()}, pieces=pieces)
        if full: r["_"] = dict(F=Fw, M=Mw, dx=dx, dy=dy)
        out.append(r)
        if cover < T["cover"]: bad("pose", f"cel {i}: covers {cover:.0%} of its mannequin")
        elif worst and limbs[worst] < (T["limb_loose"] if loose else T["limb"]): bad("pose", f"cel {i}: covers {limbs[worst]:.0%} of the mannequin's {worst}")
        if excess > T["excess"]: bad("pose", f"cel {i}: {excess:.0%} of the figure is away from its mannequin")
        if np.hypot(dx, dy) / k > T["place"]: bad("place", f"cel {i}: painted {np.hypot(dx, dy) / k:.2f} body units from its mannequin")
        f2 = np.hypot(face[0], face[1])
        if top: face = [0, 0, -0.3]; f2 = 0; share = min(share, 0.2)
        if face[2] > 0.3 and share < 0.10: bad("facing", f"cel {i}: no face where the face should be ({share:.0%} skin)")
        if face[2] > -0.3 and share >= 0.10 and features < T["features"]: bad("facing", f"cel {i}: the face is blank (eyes and mouth are {features:.1%} of it)")
        if face[2] < -0.3 and share > 0.22: bad("facing", f"cel {i}: a face shows ({share:.0%} skin) on a head seen from behind")
        if f2 > 0.5 and face[2] > -0.3 and toward < 0.04: bad("facing", f"cel {i}: the face is on the wrong side of the head")
        if f2 > 0.5 and face[2] <= -0.3 and sk.sum() > 0.04 * disc.sum() and toward < 0: bad("facing", f"cel {i}: the face is on the wrong side of the head")
        for nm, v in wear.items():
            if loose and nm in ("hand", "farm", "shoe"): continue
            if v < (T["wear1"] if "." in nm else T["wear"]): bad("palette", f"cel {i}: only {v:.0%} of the {nm} is in the design's colours for it ({', '.join(spec['wear'][nm.split('.')[0]])})")
        if off > T["off"]: bad("palette", f"cel {i}: {off:.0%} of the figure is in none of the design's colours")
        if lf > T["mannequin"]: bad("mannequin", f"cel {i}: {lf:.1%} of the figure is still mannequin colour")
    if len(out) > 1:
        for j in (0, 1):
            med = float(np.median([r["size"][j] for r in out]))
            for r in out:
                r.setdefault("size_rel", []).append(round(r["size"][j] / med, 3))
        for r in out:
            if all(abs(v - 1) > T["size"] for v in r["size_rel"]): bad("size", f"cel {r['index']}: {r['size_rel'][1]:.2f} of the others' size")
    rep = dict(take=t["file"], ok=not reasons, reasons=reasons, drift=drift, cels=out, spread=spread(out, spec))
    return rep


def spread(cels, spec):
    """how much the cels differ in what they show of each accent colour: the coefficient of variation of its area
    over the cels, and whether its number of pieces changes. A number to compare takes of one layout by."""
    o = {}
    if len(cels) < 2: return o
    for nm in spec.get("accents", []):
        a = np.array([c["shown"][nm] for c in cels])
        o[nm] = dict(area=round(float(a.mean()), 4), cv=round(float(a.std() / a.mean()), 3) if a.mean() >= 0.0015 else None)
        if nm in spec.get("marks", []): o[nm]["pieces"] = [c["pieces"][nm] for c in cels]
    cv = [v["cv"] for v in o.values() if v["cv"] is not None]
    o["mean_cv"] = round(float(np.mean(cv)), 3) if cv else None
    o["piece_changes"] = int(sum(len(set(v["pieces"])) - 1 for v in o.values() if isinstance(v, dict) and "pieces" in v))
    return o


def strip(rep):
    r = {k: v for k, v in rep.items() if k != "_"}
    r["cels"] = [{k: v for k, v in c.items() if k != "_"} for c in rep["cels"]]
    return r


def log(name, rec):
    with open(os.path.join(ROOT, "kits", name, "log.jsonl"), "a") as f: f.write(json.dumps(rec) + "\n")


def cut(takes, force=False, max_k=1000):
    """takes of one action x view -> cel files, kit.json entries and the QC sheet. Returns a report."""
    kitp = None; done = []; qc = []; graded = {}
    for tk in takes:
        t = load(tk); rep = analyse(t, full=True); L = t["layout"]; name = t["name"]
        if not rep["ok"] and not force: raise SystemExit(f"{t['file']} is rejected by the checks: " + "; ".join(rep["reasons"]))
        kd = os.path.join(ROOT, "kits", name); kitp = os.path.join(kd, "kit.json")
        os.makedirs(os.path.join(ROOT, "out"), exist_ok=True); lock = open(os.path.join(ROOT, "out", name + ".kit.lock"), "w"); fcntl.flock(lock, fcntl.LOCK_EX)   # one writer of kit.json at a time
        kit = json.load(open(kitp)) if os.path.exists(kitp) else {"name": name}
        kit["body"] = t["spec"]["body"]
        V = kit.setdefault("actions", {}).setdefault(L["action"], {"views": {}})["views"].setdefault(L["view"], {"yaw": L["yaw"], "elev": L["elev"], "cels": {}})
        TH, TW = t["img"].shape[:2]; sx, sy = TW / L["W"], TH / L["H"]; k = L["unit"] * sx; z = min(1.0, max_k / k)
        alpha, col = key(t["img"])                                              # at the size it was painted
        grade(col, alpha, t["spec"], rep["drift"])
        rgb = col[alpha > 0.99][:, ::-1]; after = flats(rgb[rgb.max(1) >= 46], t["spec"])
        graded[t["file"]] = {nm: [v[1], after.get(nm, [None, None])[1]] for nm, v in rep["drift"].items()}   # Lab distance from the design: as painted, as cut
        d = os.path.join(kd, L["action"], L["view"]); os.makedirs(d, exist_ok=True)
        for c, lc in zip(rep["cels"], L["cels"]):
            dx, dy = c["_"]["dx"] * sx, c["_"]["dy"] * sy
            F = cv2.resize(c["_"]["F"].astype(np.uint8), (TW, TH), interpolation=cv2.INTER_NEAREST)
            ys, xs = np.nonzero(F); m = int(4 * sx) + 4
            x0, x1, y0, y1 = max(xs.min() - m, 0), min(xs.max() + m, TW), max(ys.min() - m, 0), min(ys.max() + m, TH)
            keep = cv2.dilate(F[y0:y1, x0:x1], np.ones((2 * m - 3, 2 * m - 3), np.uint8)) > 0
            a = np.clip((alpha[y0:y1, x0:x1] * keep - 0.12) / 0.8, 0, 1)        # pull the edge in a hair: no fringe
            bgr = col[y0:y1, x0:x1].astype(np.uint8)
            hole = (a < 0.5).astype(np.uint8)                                    # colour under the soft edge: bleed the paint outward
            if hole.any(): bgr = np.where(hole[..., None] > 0, cv2.inpaint(bgr, cv2.dilate(hole, np.ones((3, 3), np.uint8)), 2, cv2.INPAINT_TELEA), bgr)
            rgba = np.dstack([bgr, (a * 255).astype(np.uint8)])
            if z < 1: rgba = cv2.resize(rgba, None, fx=z, fy=z, interpolation=cv2.INTER_AREA)
            f = os.path.join(d, f"{lc['index']}.webp"); cv2.imwrite(f, rgba, [cv2.IMWRITE_WEBP_QUALITY, 96])
            pt = lambda p: [round((p[0] * sx + dx - x0) * z, 1), round((p[1] * sy + dy - y0) * z, 1)]
            V["cels"][str(lc["index"])] = dict(img=os.path.relpath(f, kd), w=rgba.shape[1], h=rgba.shape[0], k=round(k * z, 2),
                ground=pt(lc["ground"]), bottom=bottom(rgba[..., 3] > 127), hips=pt(lc["joints"]["hips"]), head=pt(lc["joints"]["head"]),
                source=t["file"])
            done.append(lc["index"])
        json.dump(kit, open(kitp, "w"), indent=1); lock.close()
        qc.append(qc_sheet(t, rep, alpha, col, sx, sy))
    t0 = load(takes[0]); L = t0["layout"]
    q = os.path.join(ROOT, "out", "qc", f"{t0['name']}_{L['action']}_{L['view']}.jpg"); os.makedirs(os.path.dirname(q), exist_ok=True)
    w = max(x.shape[1] for x in qc)
    cv2.imwrite(q, np.vstack([cv2.copyMakeBorder(x, 0, 0, 0, w - x.shape[1], cv2.BORDER_CONSTANT) for x in qc]), [cv2.IMWRITE_JPEG_QUALITY, 93])
    return dict(kit=rel(kitp), action=L["action"], view=L["view"], cels=sorted(done), graded=graded, qc=rel(q))


def qc_sheet(t, rep, alpha, col, sx, sy):
    """the take at full size, keyed: over the stage's blue as a shot shows it, and over white with each mannequin's
    outline where the cel was registered, the ground line it will stand on and the point it hangs from"""
    a = alpha[..., None]; L = t["layout"]; TH, TW = alpha.shape
    over = lambda bg: (col * a + np.array(bg, np.float32) * (1 - a)).astype(np.uint8)
    top, bot = over((0x5e, 0x36, 0x30)), over((255, 255, 255))
    for c, lc in zip(rep["cels"], L["cels"]):
        M = cv2.resize(c["_"]["M"].astype(np.uint8), (TW, TH), interpolation=cv2.INTER_NEAREST)
        cs, _ = cv2.findContours(M, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        cv2.drawContours(bot, cs, -1, (0, 170, 0), 2)
        gx, gy = int((lc["ground"][0] + c["_"]["dx"]) * sx), int((lc["ground"][1] + c["_"]["dy"]) * sy)
        x0, _, x1, _ = [int(v * sx) for v in lc["box"]]
        cv2.line(bot, (x0 + 20, gy), (x1 - 20, gy), (255, 120, 0), 2); cv2.circle(bot, (gx, gy), 9, (0, 0, 255), -1)
    return np.vstack([top, bot])


def selftest(take):
    """Break a take that passes, one way per check, and see each break rejected for its own reason."""
    t = load(take); base = analyse(t)
    if not base["ok"]: raise SystemExit("selftest needs a take that passes; this one: " + "; ".join(base["reasons"]))
    L = t["layout"]; img = t["img"]; H, W = img.shape[:2]; sx, sy = W / L["W"], H / L["H"]
    box = lambda i: [int(round(v * s)) for v, s in zip(L["cels"][i]["box"], (sx, sy, sx, sy))]
    MAG = np.array([255, 0, 255], np.uint8)
    spec = t["spec"]; names = list(spec["palette"])
    def erase():
        im = img.copy(); x0, y0, x1, y1 = box(0); im[y0:y1, x0:x1] = MAG; return im
    def wrong_pose():
        im = img.copy(); a, b = box(0), box(min(3, len(L["cels"]) - 1)); h, w = min(a[3] - a[1], b[3] - b[1]), min(a[2] - a[0], b[2] - b[0])
        im[a[1]:a[1] + h, a[0]:a[0] + w] = img[b[1]:b[1] + h, b[0]:b[0] + w]; return im
    def flipped():
        im = img.copy()
        for i in range(len(L["cels"])):
            x0, y0, x1, y1 = box(i); c = L["cels"][i]; cx = int(c["joints"]["hips"][0] * sx); w = min(cx - x0, x1 - cx)
            im[y0:y1, cx - w:cx + w] = img[y0:y1, cx - w:cx + w][:, ::-1]
        return im
    def shrunk():
        im = img.copy(); x0, y0, x1, y1 = box(0); cell = img[y0:y1, x0:x1]; s = cv2.resize(cell, None, fx=0.8, fy=0.8, interpolation=cv2.INTER_AREA)
        im[y0:y1, x0:x1] = MAG; oy, ox = (cell.shape[0] - s.shape[0]) // 2, (cell.shape[1] - s.shape[1]) // 2
        im[y0 + oy:y0 + oy + s.shape[0], x0 + ox:x0 + ox + s.shape[1]] = s; return im
    def moved():
        im = img.copy(); x0, y0, x1, y1 = box(0); d = int(0.16 * L["unit"] * sx); im[y0:y1, x0:x1] = MAG
        im[y0:y1 - d, x0:x1] = img[y0 + d:y1, x0:x1]; return im
    def recoloured(frm, to):
        def f():
            rgb = img[..., ::-1].reshape(-1, 3); d = np.linalg.norm(lab(rgb) - lab([hexrgb(spec["palette"][frm])])[0], axis=1) < T["near"]
            im = img.copy().reshape(-1, 3); im[d] = hexrgb(spec["palette"][to])[::-1]; return im.reshape(img.shape)
        return f
    def mannequin():
        ly = cv2.resize(cv2.imread(os.path.join(ROOT, json.load(open(os.path.join(ROOT, t["file"])[:-4] + ".json"))["refs"][0])), (W, H))
        mp = cv2.resize(t["map"], (W, H), interpolation=cv2.INTER_NEAREST); limb = (mp[..., 0] > 250) & (mp[..., 1] > 50) & (mp[..., 2] > 20 + 20 * 5.5)
        x0, y0, x1, y1 = box(0); m = np.zeros((H, W), bool); m[y0:y1, x0:x1] = limb[y0:y1, x0:x1]
        m = cv2.erode(m.astype(np.uint8), np.ones((9, 9), np.uint8)) > 0
        im = img.copy(); im[m] = ly[m]; return im
    def blank_face():
        im = img.copy(); skin = np.array(hexrgb(spec["palette"]["skin"])[::-1], np.uint8)
        for c in L["cels"]:
            J = c["joints"]; r = int(0.7 * np.hypot(J["crown"][0] - J["headBase"][0], J["crown"][1] - J["headBase"][1]) * sx)
            x, y = int(J["head"][0] * sx), int(J["head"][1] * sy); win = im[max(0, y - r):y + r, max(0, x - r):x + r]
            near = (np.linalg.norm(lab(win[..., ::-1].reshape(-1, 3)) - lab([hexrgb(spec["palette"]["skin"])])[0], axis=1) < T["near"]).reshape(win.shape[:2])
            shut = cv2.morphologyEx(near.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((int(0.5 * r) | 1,) * 2, np.uint8)) > 0
            win[ndimage.binary_fill_holes(shut)] = skin
        return im
    def far_limb_red():
        mp = cv2.resize(t["map"], (W, H), interpolation=cv2.INTER_NEAREST); x0, y0, x1, y1 = box(0); m = np.zeros((H, W), bool)
        m[y0:y1, x0:x1] = ((mp[..., 0] > 250) & (np.abs(mp[..., 1].astype(int) - 200) < 20) & (np.abs(mp[..., 2].astype(int) - (20 + 20 * CLASSES.index("thigh"))) < 8))[y0:y1, x0:x1]
        im = img.copy(); im[m & (key(img)[0] > 0.9)] = hexrgb(MANNEQUIN[4])[::-1]; return im
    def stray():
        im = img.copy(); x0, y0, x1, y1 = box(0); r = int(0.07 * L["unit"] * sx)
        for j in range(4): cv2.circle(im, (x0 + r * 2 + j * r * 3, y0 + r * 2), r, (40, 40, 40), -1)
        return im
    cases = [("palette", far_limb_red), ("facing", blank_face), ("count", erase), ("pose", wrong_pose), ("facing pose", flipped), ("size", shrunk), ("place", moved), ("count", stray),
             ("palette", recoloured("glove", "hair")), ("palette", recoloured("jacket", "shirt")), ("mannequin", mannequin)]
    if len(L["cels"]) < 2: cases = [c for c in cases if c[0] not in ("size",) and c[1] is not wrong_pose]
    res = []
    for kind, make in cases:
        r = analyse({**t, "img": make()}); kinds = sorted({x.split(":")[0] for x in r["reasons"]})
        res.append(dict(broke=make.__name__ if make.__name__ != "f" else "recoloured", expect=kind, rejected=not r["ok"], for_=kinds, caught=any(k in kinds for k in kind.split()),
                        first=r["reasons"][:1]))
    return dict(take=t["file"], all_caught=all(x["caught"] for x in res), cases=res)


def make(name, action, view, tries=3, size="4K", refs=(), note=""):
    sys.dont_write_bytecode = True; sys.path.insert(0, os.path.dirname(__file__)); import paint
    src = os.path.join(ROOT, "kits", name, "source", action, view)
    if not os.path.exists(os.path.join(src, "layout.json")):
        subprocess.run(["node", os.path.join(ROOT, "pipeline", "layout.mjs"), name, action, view], check=True, timeout=180)
    tried = []
    for n in range(tries):
        tk = paint.paint_cels(name, action, view, [os.path.join(ROOT, r) for r in refs], note, size)
        if not tk: tried.append(dict(take=None, reasons=["no image came back"])); continue
        rep = analyse(load(tk)); tried.append(dict(take=rel(tk), reasons=rep["reasons"], spread=rep["spread"].get("mean_cv")))
        if rep["ok"]: return dict(ok=True, tried=tried, **cut([tk]))
        log(name, {"file": rel(tk), "reject": "; ".join(rep["reasons"]), "by": "check", "time": time.strftime("%Y-%m-%dT%H:%M:%S")})
    return dict(ok=False, tried=tried)


def main():
    a = sys.argv[1:]
    if len(a) < 2 or a[0] in ("-h", "--help"): sys.exit(__doc__)
    cmd, rest = a[0], a[1:]
    flag = lambda k: (rest.remove(k) or True) if k in rest else False
    def opt(k, d=None):
        if k not in rest: return d
        i = rest.index(k); v = rest[i + 1]; del rest[i:i + 2]; return v
    def many(k):
        if k not in rest: return []
        i = rest.index(k); j = i + 1
        while j < len(rest) and not rest[j].startswith("--"): j += 1
        v = rest[i + 1:j]; del rest[i:j]; return v
    if cmd == "check":
        reps = [strip(analyse(load(f))) for f in rest]
        for r in reps: [c.pop("shown") for c in r["cels"]]
        print(json.dumps(reps if len(reps) > 1 else reps[0], indent=1)); sys.exit(0 if all(r["ok"] for r in reps) else 1)
    if cmd == "measure":
        o = []; together = flag("--together"); allc = []
        for f in rest:
            t = load(f); r = analyse(t); allc += r["cels"]; o.append(dict(take=r["take"], ok=r["ok"], reasons=r["reasons"], drift=r["drift"], spread=r["spread"],
                size_rel=[c.get("size_rel") for c in r["cels"]], offset=[c["offset"] for c in r["cels"]]))
        if together: o.append(dict(take="together", ok=all(x["ok"] for x in o), reasons=[], drift={}, spread=spread(allc, t["spec"]), size_rel=[None], offset=[]))
        print(json.dumps(o, indent=1)); return
    if cmd == "cut":
        force = flag("--force"); mk = float(opt("--max-k", 1000)); print(json.dumps(cut(rest, force, mk), indent=1)); return
    if cmd == "selftest":
        r = selftest(rest[0]); print(json.dumps(r, indent=1)); sys.exit(0 if r["all_caught"] else 1)
    if cmd == "make":
        refs = many("--ref"); tries = int(opt("--tries", 3)); size = opt("--size", "4K"); note = opt("--note", "")
        r = make(rest[0], rest[1], rest[2], tries, size, refs, note); print(json.dumps(r, indent=1)); sys.exit(0 if r["ok"] else 1)
    sys.exit(__doc__)


if __name__ == "__main__": main()
