"""The part of engine/motion.mjs that reads the rendered pictures: motion_frames.py PLAN.json (written by motion.mjs).
Prints a JSON list of findings: a frame unlike both its neighbours (glitch), a jump of the whole picture's brightness
that goes straight back (flash), and, where the plan names frames rendered with --over, how much of each figure's box
the set hides and when that starts and stops (hidden)."""
import json, os, sys
import numpy as np, cv2

plan = json.load(open(sys.argv[1])); rows = plan["rows"]; names = plan["names"]; out = []
def read(d, f, small=True):
    im = cv2.imread(os.path.join(d, "f%04d.png" % f))
    if im is None: return None
    return cv2.resize(im, (480, 270), interpolation=cv2.INTER_AREA).astype(np.float32) if small else im
ims = {r["f"]: read(plan["frames"], r["f"]) for r in rows}
rows = [r for r in rows if ims[r["f"]] is not None]
if not rows: sys.exit("no frames in " + plan["frames"])
by = {r["f"]: r for r in rows}
diff = lambda a, b: float(np.abs(ims[a] - ims[b]).mean())
luma = {f: float(im.mean()) for f, im in ims.items() if im is not None}
for r in rows:
    f = r["f"]; a, c = by.get(f - 1), by.get(f + 1)
    if not a or not c or a["take"] != r["take"] or c["take"] != r["take"]: continue
    d1, d2, d02 = diff(f - 1, f), diff(f, f + 1), diff(f - 1, f + 1)
    declared = r["declared"] or a["declared"] or c["declared"]
    v = min(d1, d2) / max(d02, 1.0)
    if min(d1, d2) > 5:
        out.append(dict(kind="glitch", shot=names[r["take"]], who="", at=f, value=round(v, 2), limit=plan["glitch"], over=bool(v > plan["glitch"] and not declared),
                        text=f"the frame differs from f{f-1} by {d1:.1f} and from f{f+1} by {d2:.1f} (of 255), while they differ from each other by {d02:.1f}" + (" [declared: impact, flash or black]" if declared else "")))
    j = abs(luma[f - 1] + luma[f + 1] - 2 * luma[f]) / 2
    if j > 3:
        out.append(dict(kind="flash", shot=names[r["take"]], who="", at=f, value=round(j, 1), limit=8, over=bool(j > 8 and not declared),
                        text=f"the picture's brightness is {luma[f]:.0f}, between {luma[f-1]:.0f} and {luma[f+1]:.0f}" + (" [declared]" if declared else "")))
if plan.get("over"):
    last = {}
    for r in rows:
        if not r["people"]: continue
        a, b = read(plan["frames"], r["f"], False), read(plan["over"], r["f"], False)
        if b is None: continue
        d = (np.abs(a.astype(np.int16) - b.astype(np.int16)).max(-1) > 40)
        d = cv2.morphologyEx(d.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))      # grain is not a difference
        for p in r["people"]:
            x0, y0, x1, y1 = [int(v) for v in p["box"]]; x0, y0 = max(0, x0), max(0, y0); x1, y1 = min(a.shape[1], x1), min(a.shape[0], y1)
            if x1 <= x0 or y1 <= y0: continue
            share = float(d[y0:y1, x0:x1].mean()); k = (r["take"], p["who"]); was = last.get(k, 0.0)
            if (share > 0.02) != (was > 0.02) or share > 0.02 and r["f"] % 12 == 0:
                out.append(dict(kind="hidden", shot=names[r["take"]], who=p["who"], at=r["f"], value=round(share, 3), limit=0.02, over=bool(share > 0.02),
                                text=f"the set hides {share:.0%} of the figure's box" + (" (starts here)" if was <= 0.02 else "") if share > 0.02 else "the set stops hiding the figure here"))
            last[k] = share
print(json.dumps(out))
