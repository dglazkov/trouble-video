"""Paint step of a kit: ask the image model (art/gen.py) for the character's drawings, over the layout step's guides.

  paint.py NAME turnaround            the five-view design sheet, painted over the turnaround guide
  paint.py NAME crop FILE             cut an approved turnaround into one design drawing per view
  paint.py NAME VIEW [--nokey]        that view's parts sheet, painted over its template (--nokey: no colour key image)
  paint.py NAME patch VIEW TAKE PART "what" [--region face]
                                      an edit of one part of a take (an expression, a fix), saved as a new take
                                      patch_N with the same layout; only the pixels the edit changed are taken
  paint.py NAME reject FILE "why"     record that a generation was looked at and thrown away
  paint.py NAME count                 generations made and rejected so far

Every generation is saved as kits/NAME/source/...jpg with a sidecar .json holding the prompt and the references it
was made from, and is logged in kits/NAME/source/log.jsonl. Generated art is frozen: nothing here overwrites a take.
"""
import json, os, subprocess, sys, time
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
VIEWS = {"front": "from straight in front", "front34": "in three-quarter front view (turned 45 degrees, facing the viewer's left)",
         "side": "in pure side view (profile, facing the viewer's left)", "back34": "in three-quarter back view (turned away, facing the far left)",
         "back": "from straight behind"}
STYLE = ("Style: 1990s hand-painted cel anime, exactly like the style reference: clean black ink outlines of even weight, "
         "flat colour fills, exactly two tones per material (a base and one hard-edged shade), no gradients, no texture, "
         "no soft shading, no highlights bloom. No brand logos, no text, no letters, no emblems anywhere.")


def rel(p): return os.path.relpath(p, ROOT)


def log(src, rec):
    with open(os.path.join(src, "log.jsonl"), "a") as f: f.write(json.dumps(rec) + "\n")


def take(dirpath, stem):
    n = 1
    while True:   # reserve the name, so two takes started together cannot land on one file
        try: os.close(os.open(os.path.join(dirpath, f"{stem}_{n}.json"), os.O_CREAT | os.O_EXCL)); break
        except FileExistsError: n += 1
    return os.path.join(dirpath, f"{stem}_{n}.jpg")


def generate(src, out, prompt, refs, aspect="1:1", size="2K", kind=""):
    os.makedirs(os.path.dirname(out), exist_ok=True)
    tmp = out[:-4] + ".tmp.png"
    cmd = [sys.executable, os.path.join(ROOT, "art", "gen.py"), tmp, prompt, "--ref", *refs, "--aspect", aspect, "--size", size]
    for attempt in range(3):   # the service sometimes answers with no image; that is worth asking again, a refusal is not
        r = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
        rec = {"file": rel(out), "kind": kind, "time": time.strftime("%Y-%m-%dT%H:%M:%S"), "ok": r.returncode == 0}
        if r.returncode == 0: break
        rec["error"] = (r.stderr or r.stdout)[-400:]; log(src, rec)
        if "NO_IMAGE" not in rec["error"] or attempt == 2:
            for f in (out[:-4] + ".json", out[:-4] + ".layout.json"):   # give the reserved name back
                if os.path.exists(f) and (f.endswith(".layout.json") or os.path.getsize(f) == 0): os.remove(f)
            sys.exit("generation failed: " + rec["error"])
    Image.open(tmp).convert("RGB").save(out, quality=95, subsampling=0); os.remove(tmp)
    json.dump({"prompt": prompt, "refs": [rel(x) for x in refs], "aspect": aspect, "size": size, "made": rec["time"],
               "command": "pipeline/paint.py " + " ".join(sys.argv[1:])}, open(out[:-4] + ".json", "w"), indent=1)
    log(src, rec); print("wrote", rel(out))


BEHIND = ("This is a view from BEHIND her: every part shows its back - the back of the hair (no face{cheek}), the BACK panel of "
          "the jacket with the back of the stand-up collar (no shirt, no zip, no chest patches), the seat of the trousers, the backs "
          "of the legs, the heels of the shoes. ")


def parts_prompt(spec, layout, view, key=True):
    d = spec["describe"]; parts = layout["parts"]
    side_word = {"L": "her LEFT", "R": "her RIGHT"}
    near = {"front34": "L", "side": "L", "back34": "L"}.get(view)
    kinds, lines, rows = {}, [], {}
    for name, p in parts.items():
        rows.setdefault(p["box"][1], []).append((p["box"][0], name, p)); kinds.setdefault(p["kind"], p["colour"])
    for ri, y in enumerate(sorted(rows)):
        names = []
        for _, name, p in sorted(rows[y]):
            t = p["kind"].replace("_", " ").replace("uarm", "upper arm").replace("farm", "forearm").replace("bent", "bent leg").replace("shin", "lower leg").replace("thigh", "upper leg")
            if p["side"] and near:
                t += f" ({side_word[p['side']]}, the {'near' if p['side'] == near else 'far'} side" + ("" if p["side"] == near else ": drawn from its inner face") + ")"
            elif p["side"]:
                t += f" ({side_word[p['side']]}, which is on the viewer's {('right' if p['side'] == 'L' else 'left') if view == 'front' else ('left' if p['side'] == 'L' else 'right')})"
            names.append(t)
        lines.append(f"Row {ri + 1}, left to right: " + "; ".join(names) + ".")
    legend = " ".join(f"{c.upper()} in the key = {d['parts'][k]}." for k, c in kinds.items())
    behind = BEHIND.format(cheek=", only the edge of one cheek" if view == "back34" else "") if view in ("back34", "back") else ""
    note = d.get("views", {}).get(view, "")
    if key:
        intro = (f"Image 2 is the KEY to the template: the same layout, with each shape coloured to say which part it is (the key's "
                 f"colours are labels only: never paint with them). Image 3 is the character")
        what = f"What each key colour means: {legend} Where they are: " + " ".join(lines)
    else:   # no key image: the rows spell out each part in full
        intro = "Image 2 is the character"
        full = []
        for ri, y in enumerate(sorted(rows)):
            full.append(f"Row {ri + 1}, left to right: " + " ".join(f"({i + 1}) {d['parts'][p['kind']]}." for i, (_, _, p) in enumerate(sorted(rows[y]))))
        what = "The shapes are, by rows from the top: " + " ".join(full)
    ch = "image 3" if key else "image 2"
    return (
        f"Image 1 is a LAYOUT TEMPLATE: {len(parts)} plain grey shapes on a pure magenta ground. Each grey shape is one separate "
        f"body part of a cut-out animation puppet, all seen {VIEWS[view]}. {intro}, drawn {VIEWS[view]}: {d['character']}. "
        f"Paint over image 1: replace every grey shape with that part of the character from {ch}, drawn {VIEWS[view]}, "
        f"filling exactly the position, size, angle and silhouette of its shape. {behind}{note} {what} "
        f"Rules: the result has exactly {len(parts)} parts, one per grey shape, each where its shape is. Never draw a part that has no "
        f"shape: the empty magenta areas stay empty. Do not draw whole limbs, whole trousers or a whole body anywhere. "
        f"Every part is a complete, separate drawing with a closed black ink outline all the way round, with a plain rounded end "
        f"where it would join its neighbour; parts never touch or overlap. No grey shape may be left unpainted. "
        f"Keep the ground pure flat magenta (#FF00FF) outside the parts: no shadows, no glow, no magenta inside any part. "
        f"Every colour comes from {ch} only. " + STYLE)


def main():
    if len(sys.argv) < 3 or sys.argv[1] in ("-h", "--help"): sys.exit(__doc__)
    name, what, rest = sys.argv[1], sys.argv[2], sys.argv[3:]
    kit = os.path.join(ROOT, "kits", name); src = os.path.join(kit, "source")
    spec = json.load(open(os.path.join(kit, "character.json")))
    design, style = os.path.join(ROOT, spec["design"]), os.path.join(ROOT, spec["style"])
    if what == "count":
        recs = [json.loads(l) for l in open(os.path.join(src, "log.jsonl"))]
        made = [r for r in recs if r.get("ok") and "reject" not in r]; rej = [r for r in recs if "reject" in r]
        print(json.dumps({"made": len(made), "failed_calls": len([r for r in recs if r.get("ok") is False]), "rejected": len(rej),
                          "rejections": [{"file": r["file"], "why": r["reject"]} for r in rej]}, indent=1)); return
    if what == "reject":
        log(src, {"file": rest[0], "reject": rest[1], "time": time.strftime("%Y-%m-%dT%H:%M:%S")}); return
    if what == "turnaround":
        guide = os.path.join(src, "turnaround_guide.png")
        prompt = (
            "Image 1 is a POSING GUIDE: one mannequin standing in an A-pose, shown five times from five angles, left to right: "
            "(1) from straight in front, (2) three-quarter front, facing the viewer's left, (3) pure side view facing the viewer's left, "
            "(4) three-quarter back, (5) from straight behind. On the mannequin, red marks the figure's own RIGHT arm and leg, blue its LEFT. "
            f"Image 2 is the character design: {spec['describe']['character']}. Image 3 is the style reference. "
            "Make a character turnaround model sheet: paint the character from image 2 over each of the five mannequins, at exactly the "
            "same position, size, pose, proportions and viewing angle as the mannequin under it, so the five drawings are the same girl "
            "turning on the spot. Identical outfit, identical colours and identical details in all five views; the long side lock and "
            "the patches stay on the same side of HER body in every view. Arms held slightly away from the body, hands empty and relaxed, "
            "no hoverboard, no props. Calm neutral expression, mouth closed. Plain pure white background, no ground shadow, no text, "
            "no labels, no numbers, nothing of the mannequin left visible. " + STYLE)
        generate(src, take(src, "turnaround"), prompt, [guide, design, style], aspect="16:9", kind="turnaround"); return
    if what == "crop":
        boxes = json.load(open(os.path.join(src, "turnaround_guide.json")))["boxes"]
        im = Image.open(os.path.join(ROOT, rest[0])); gw = Image.open(os.path.join(src, "turnaround_guide.png")).size[0]
        k = im.size[0] / gw
        for v, b in boxes.items():
            os.makedirs(os.path.join(src, v), exist_ok=True)
            im.crop([int(x * k) for x in b]).save(os.path.join(src, v, "design.png"))
        json.dump({"turnaround": rest[0]}, open(os.path.join(src, "design.json"), "w")); print("cropped", list(boxes)); return
    if what == "patch":
        # an edit of one part of a take, pasted back into a copy of that take: same layout, so the part cuts as before.
        # Only pixels the edit really changed are taken, and with --region face only those on the face.
        import numpy as np
        view, tk, part, text = rest[:4]; vd = os.path.join(src, view)
        layout = json.load(open(os.path.join(vd, tk + ".layout.json"))); lp = layout["parts"][part]
        sheet = Image.open(os.path.join(vd, tk + ".jpg")).convert("RGB")
        x0, y0, x1, y1 = lp["box"]; side = max(x1 - x0, y1 - y0) + 40; cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
        bx, by = max(0, min(sheet.size[0] - side, cx - side // 2)), max(0, min(sheet.size[1] - side, cy - side // 2))
        crop = sheet.crop((bx, by, bx + side, by + side))
        # blank the neighbours that fall inside the square, so the edit sees one part
        arr = np.asarray(crop).copy(); keep = np.zeros(arr.shape[:2], bool); keep[max(0, y0 - by):y1 - by, max(0, x0 - bx):x1 - bx] = True
        arr[~keep] = (255, 0, 255)
        out = take(vd, "patch"); tmp_in = out[:-4] + ".in.png"
        Image.fromarray(arr).resize((1024, 1024), Image.LANCZOS).save(tmp_in)
        prompt = ("Edit this image. Change ONLY this: " + text + " Everything else stays exactly where it is: the same drawing, same "
                  "position, same size, same outlines, same colours, same flat magenta (#FF00FF) ground. " + STYLE)
        generate(src, out, prompt, [tmp_in], aspect="1:1", size="1K", kind=f"patch:{view}/{part}")
        os.remove(tmp_in)
        ed = np.asarray(Image.open(out).convert("RGB").resize((side, side), Image.LANCZOS)).astype(np.float32)
        base = arr.astype(np.float32)
        import cv2
        d = cv2.GaussianBlur(np.abs(ed - base).max(axis=2), (0, 0), 2.0)
        m = np.clip((d - 22) / 30, 0, 1)
        if "--region" in rest and rest[rest.index("--region") + 1] == "face" and "skull" in lp:
            sx, sy, sr = lp["skull"]; fx = lp.get("faceDir", [0, 0])[0]
            yy, xx = np.mgrid[0:side, 0:side]
            m *= (np.hypot(xx + bx - (sx + fx * sr * 0.35), yy + by - (sy + sr * 0.3)) < sr * 0.8)
        m = cv2.GaussianBlur(cv2.dilate(m, np.ones((7, 7), np.uint8)), (0, 0), 1.5)[..., None] * keep[..., None]
        res = np.asarray(sheet).copy()
        res[by:by + side, bx:bx + side] = (base * (1 - m) + ed * m).astype(np.uint8)
        Image.fromarray(res).save(out, quality=95, subsampling=0)
        json.dump(layout, open(out[:-4] + ".layout.json", "w"), indent=1)
        side_car = json.load(open(out[:-4] + ".json")); side_car.update(patch_of=f"{view}/{tk}", part=part, changed=float(m.mean()))
        json.dump(side_car, open(out[:-4] + ".json", "w"), indent=1)
        print(f"patched {part}: {m.mean():.1%} of the crop changed"); return
    if what in VIEWS:
        vd = os.path.join(src, what); layout = json.load(open(os.path.join(vd, "layout.json")))
        out = take(vd, "sheet")
        json.dump(layout, open(out[:-4] + ".layout.json", "w"), indent=1)   # the layout this take was painted over, kept with it
        key = "--nokey" not in rest   # the colour key helps the model tell parts apart, but on sparse sheets its colours leak in
        refs = [os.path.join(vd, "template.png")] + ([os.path.join(vd, "key.png")] if key else []) + [os.path.join(vd, "design.png")]
        generate(src, out, parts_prompt(spec, layout, what, key), refs, kind="parts:" + what); return
    sys.exit("unknown step: " + what)


main()
