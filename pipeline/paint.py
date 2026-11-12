"""Paint step of a cel kit: ask the image model (art/gen.py) for whole-figure drawings.

  paint.py NAME design ["extra wording"]     a model sheet (four views and an accessory callout) from the character's origin drawing
  paint.py NAME ACTION VIEW [--ref FILE ...] [--note "extra wording"] [--size 4K] [--layout FILE.json]
                                             the cels of one action seen from one view, painted over its layout sheet
                                             (pipeline/layout.mjs); --ref adds reference images after the design sheet,
                                             such as an accepted sheet of the same character
  paint.py NAME closeup STEM "acting"        a widescreen head-and-shoulders close-up of the character, mid-sprint, on the
                                             key colour, from the model sheet -> kits/NAME/closeup/STEM_N.jpg
  paint.py NAME edit FILE "what to change" [--ref FILE ...]
                                             a new take that is FILE with one thing changed (same folder, next number);
                                             it keeps FILE's layout, so it is checked and cut like any take
  paint.py NAME reject FILE "why"            record that a take was looked at and thrown away
  paint.py NAME count                        generations made, and rejected by the checks or by hand, with reasons

What making the first kit showed (kits/juno/log.jsonl has the takes): paint all of an action's cels in ONE image;
that is what keeps them alike. A finished sheet given with --ref has its poses and its view copied over the layout's
(three of three takes), and its colours come back warmer; a second sheet of four (--layout) for more pixels does not
match the first without it, and copies the first's poses with it. An edit pass asking for identical details changes
little and shifts the colours.

Every generation is saved under kits/NAME/ with a sidecar .json holding its prompt and references, and is logged
in kits/NAME/log.jsonl. Generated art is frozen: nothing here overwrites a take.
"""
import json, os, subprocess, sys, time
sys.dont_write_bytecode = True
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
STYLE = ("1990s cel anime: bold clean black ink outlines of even weight, flat colour fills, two tones per material "
         "(a base and one hard-edged shade), no gradients, no texture, no soft shading")
# {S} she/he/they, {s} the same in lower case, {o} her/him/them, {p} her/his/their, and the verbs that follow {S}
WORDS = {"she": dict(S="She", s="she", o="her", p="her", IS="is", faces="faces", moves="moves", looks="looks"),
         "he": dict(S="He", s="he", o="him", p="his", IS="is", faces="faces", moves="moves", looks="looks"),
         "they": dict(S="They", s="they", o="them", p="their", IS="are", faces="face", moves="move", looks="look")}
VIEWS = {
    "front": "{S} {faces} the viewer and {moves} straight toward the viewer, seen from straight in front: {p} face and chest are toward the viewer, and the limbs that reach toward or away from the viewer are drawn foreshortened, as the mannequin has them.",
    "front34": "{S} {IS} seen in three-quarter FRONT view: {s} {faces} and {moves} toward the viewer's LEFT and a little toward the viewer, so {p} face, {p} chest and {p} LEFT side show.",
    "side": "{S} {faces} and {moves} toward the viewer's LEFT, seen exactly from the side ({p} left side toward the viewer, {p} face in profile).",
    "back34": "{S} {IS} seen in three-quarter BACK view: {s} {faces} and {moves} toward the viewer's LEFT and away from the viewer, so the viewer sees {p} BACK, the back of {p} head and {p} LEFT side; {p} face is turned away and only the edge of {p} left cheek may show.",
    "back": "{S} {faces} away from the viewer, seen from straight behind.",
    "top": "{S} {IS} seen from DIRECTLY ABOVE and a little BEHIND, a bird's-eye plan view with the camera looking straight down at the floor. {S} {moves} toward the TOP edge of the image: the top of each figure is the FRONT of {p} body and the bottom is {p} back. So the viewer looks down on the crown and the BACK of {p} head, the back of {p} shoulders and {p} back, with {p} arms and legs reaching out ahead of and behind the body as the mannequin has them; whatever trails behind {o} (hair, coat tails) trails toward the BOTTOM edge. {p_cap} face, chest and belly are underneath, hidden from this camera: NO face, no eyes, no nose and no chest show in any drawing.",
}
ACTIONS = {
    "run": "the {n} successive drawings of ONE run cycle",
    "idle": "{n} drawing(s) of {o} standing relaxed and at ease, like a person waiting, weight on one leg",
    "runtop": "the {n} successive drawings of ONE run cycle, seen from directly above",
    "charge": "{n} key drawings of a shoulder charge, different from each other: in the FIRST {s} {IS} still running, crouched low, dropping {p} leading LEFT shoulder with the left arm tucked against the chest; in the SECOND {s} {IS} at the moment of impact: launched forward off the ground with BOTH feet in the air behind {o}, the body thrown almost level, the left shoulder driven forward first and the right arm flung straight back",
    "ride": "{n} key drawings of {o} riding a hoverboard at speed, crouched with knees bent and arms out for balance: banking to {p} left, level, and banking to {p} right",
    "leap": "{n} key drawings of {o} jumping a gap on a hoverboard, seen from above and behind: first launching upward with the board's nose tilted up, then the top of the jump, knees tucked up, one hand gripping the board's edge and the other arm thrown up",
}


def rel(p): return os.path.relpath(p, ROOT)


def kit_dir(name): return os.path.join(ROOT, "kits", name)


def log(name, rec):
    with open(os.path.join(kit_dir(name), "log.jsonl"), "a") as f: f.write(json.dumps(rec) + "\n")


def take(dirpath, stem):
    os.makedirs(dirpath, exist_ok=True)
    n = 1
    while True:   # reserve the name, so two takes started together cannot land on one file
        try: os.close(os.open(os.path.join(dirpath, f"{stem}_{n}.json"), os.O_CREAT | os.O_EXCL)); break
        except FileExistsError: n += 1
    return os.path.join(dirpath, f"{stem}_{n}.jpg")


def generate(name, out, prompt, refs, aspect="16:9", size="4K", kind="", extra=None):
    """One generation -> out (.jpg) and its sidecar. Returns True, or False if the service gave no image."""
    tmp = out[:-4] + ".tmp.png"
    cmd = [sys.executable, os.path.join(ROOT, "art", "gen.py"), tmp, prompt, "--ref", *refs, "--aspect", aspect, "--size", size]
    rec = {}
    for attempt in range(3):   # the service sometimes answers with no image or an overload: worth asking again
        try: r = subprocess.run(cmd, capture_output=True, text=True, timeout=420)
        except subprocess.TimeoutExpired: r = subprocess.CompletedProcess(cmd, 1, "", "timed out after 420 s")
        rec = {"file": rel(out), "kind": kind, "time": time.strftime("%Y-%m-%dT%H:%M:%S"), "ok": r.returncode == 0}
        if r.returncode == 0: break
        rec["error"] = (r.stderr or r.stdout)[-400:]; log(name, rec)
        time.sleep(5)
    if not rec.get("ok"):
        os.remove(out[:-4] + ".json")   # give the reserved name back
        print("generation failed:", rec["error"], file=sys.stderr); return False
    Image.open(tmp).convert("RGB").save(out, quality=96, subsampling=0); os.remove(tmp)
    json.dump({"prompt": prompt, "refs": [rel(x) for x in refs], "kind": kind, "aspect": aspect, "size": size, "made": rec["time"],
               **(extra or {})}, open(out[:-4] + ".json", "w"), indent=1)
    log(name, rec); print("wrote", rel(out)); return True


def spec_of(name): return json.load(open(os.path.join(kit_dir(name), "character.json")))


def design_text(spec):
    d = spec["describe"]
    return d["who"] + ". " + ". ".join(d["design"]) + ". " + d["never"]


def design_prompt(spec, note=""):
    return (
        "Make a character MODEL SHEET of the character in the FIRST image, redrawn in a simplified, locked design that an "
        "animation team can repeat exactly in every drawing. The SECOND image is the style reference. "
        f"The design, which replaces whatever the first image shows where they differ: {design_text(spec)} "
        "Layout of the sheet, on a plain pure white background: on the left, FOUR full-body drawings of her standing in a row, "
        "all the same height, feet on one line, left to right: (1) from straight in front, (2) three-quarter front view, turned "
        "toward the viewer's left, (3) exact side view facing the viewer's left, (4) from straight behind. She stands relaxed, "
        "arms a little away from the body, hands empty, mouth closed, calm. On the right, a column of four close-up callout "
        "drawings of her accessories, each drawn once, large and plain: the goggles, the headphones, one fingerless glove on a "
        "hand, one shoe from the side. "
        "The four full-body drawings show the SAME outfit with IDENTICAL colours and details; each patch stays on the same "
        "side of HER body in every view (a yellow triangle on each upper sleeve, so every view that shows a sleeve from outside shows its triangle; the white circle on her left chest, so the "
        "back view shows no circle). No hoverboard, no props. No text, no labels, no numbers, no arrows, no colour swatches, "
        f"no borders, no ground line, no ground shadow. Style: {STYLE}. {note}").strip()


def design_ref(name, spec):
    """The model sheet as the painter is shown it: on a white square. A reference in the same shape as the layout
    sheet gets copied (the painter redraws the model sheet's standing figures instead of painting the mannequins);
    in another shape it is read as a reference."""
    src = os.path.join(ROOT, spec["design"]); out = os.path.join(ROOT, "out", "ref", f"{name}_design.png")
    if not os.path.exists(out) or os.path.getmtime(out) < os.path.getmtime(src):
        im = Image.open(src).convert("RGB"); im.thumbnail((2048, 2048), Image.LANCZOS)
        sq = Image.new("RGB", (2048, 2048), "white"); sq.paste(im, ((2048 - im.width) // 2, (2048 - im.height) // 2))
        os.makedirs(os.path.dirname(out), exist_ok=True); sq.save(out)
    return out


def cel_prompt(spec, layout, extra_refs=0, note=""):
    n, cols, rows, view, action = len(layout["cels"]), layout["cols"], layout["rows"], layout["view"], layout["action"]
    w = WORDS[spec.get("pronoun", "she")]; w = {**w, "p_cap": w["p"].capitalize()}; f = lambda text: text.format(n=n, **w)
    grid = f"{n} posing mannequins in a {cols}x{rows} grid" if n > 1 else "one posing mannequin"
    order = " (reading left to right, top row then bottom row)" if rows > 1 else (" (reading left to right)" if n > 1 else "")
    what = f(ACTIONS.get(action, "{n} drawing(s) of {o}: " + action))
    each = f"For each of the {n}: keep" if n > 1 else "Keep"
    same = (f"so the {n} figures stay the same size as each other. " if n > 1 else "")
    ident = (f"All {n} drawings must be the SAME character with IDENTICAL design, colours and details in every drawing: " if n > 1 else "The design: ")
    refs = ""
    if extra_refs:
        refs = (f" The {'THIRD image is' if extra_refs == 1 else 'images after the second are'} finished drawings of this same character already "
                "approved: match their design, colours, line weight and every detail exactly, but take the poses only from the first image.")
    # what is particular to this character doing this (how they run), and a prop the layout shows with them
    acting = spec.get("acting", {}).get(action, ""); acting = f" How {w['s']} {'do' if w['IS'] == 'are' else 'does'} it: {acting}." if acting else ""
    prop = " " + spec["props"][layout["prop"]]["describe"] if layout.get("prop") else ""
    face = (f"Wherever {w['p']} face shows it is fully drawn, with eyes, eyebrows, nose and mouth as on the model sheet: never a blank face. " if view != "top" else "")
    return (
        f"Edit the FIRST image. It is an animator's layout sheet: {grid}, {what}{order}. "
        f"Paint the character from the SECOND image ({w['p']} model sheet) over every mannequin, as {n if n > 1 else 'a'} finished key drawing{'s' if n > 1 else ''} by the same animator. "
        f"The second image only shows what {w['s']} {w['looks']} like: do not copy its standing figures, its poses or its arrangement; the result holds exactly the {n} figure{'s' if n > 1 else ''} of the first image, each in its mannequin's pose and place, and nothing else.{refs} "
        f"{each} every limb exactly where the mannequin has it (same joint positions and angles, same lean, same head position, "
        f"same size and same place in its cell), {same}"
        f"BLUE limbs are {w['p']} LEFT arm and leg; RED limbs are {w['p']} RIGHT arm and leg; the darker shade is the upper limb, the lighter the lower. "
        f"{f(VIEWS[view])}{acting}{prop} Each figure has exactly two arms and two legs, and both feet are drawn complete. "
        f"{face}"
        f"{ident}{design_text(spec)} "
        "Remove every trace of the mannequins: no blue, red, green or grey mannequin colour may remain. "
        f"Style as the second image: {STYLE}, no motion blur, no speed lines, no ground, no shadows on the ground, no text, no panel borders. "
        f"Background: one flat solid pure magenta (#FF00FF) everywhere, also between the legs and inside every gap. {note}").strip()


def paint_cels(name, action, view, extra=(), note="", size="4K", layout_file=None):
    """One take of an action x view sheet. Returns the take's path or None. layout_file: another layout of the same
    action and view than layout.json, such as a sheet of some of its cels (layout.mjs --only ... --out STEM)."""
    spec = spec_of(name); src = os.path.join(kit_dir(name), "source", action, view)
    lf = os.path.join(ROOT, layout_file) if layout_file else os.path.join(src, "layout.json"); layout = json.load(open(lf))
    refs = [lf[:-5] + ".png", design_ref(name, spec), *extra]
    out = take(src, "take")
    ok = generate(name, out, cel_prompt(spec, layout, len(extra), note), refs, aspect=layout["aspect"], size=size,
                  kind=f"cels:{action}/{view}", extra={"layout": layout, "map": rel(lf[:-5] + "_map.png")})
    return out if ok else None


def count(name):
    """Generations made, and which were thrown away by whom. A take counts once, by its first verdict; a take the kit
    is cut from is not a rejection, whatever the checks said of it before they changed."""
    recs = [json.loads(l) for l in open(os.path.join(kit_dir(name), "log.jsonl"))]
    kp = os.path.join(kit_dir(name), "kit.json"); kit = json.load(open(kp)) if os.path.exists(kp) else {}
    used = {c["source"] for a in kit.get("actions", {}).values() for v in a["views"].values() for c in v["cels"].values()}
    made = [r for r in recs if r.get("ok")]; rej = {}
    for r in recs:
        if "reject" in r and r["file"] not in used: rej.setdefault(r["file"], r)
    auto = [r for r in rej.values() if r.get("by") == "check"]
    return {"made": len(made), "failed_calls": len([r for r in recs if r.get("ok") is False]), "in_kit": sorted(used),
            "rejected_by_check": len(auto), "rejected_by_hand": len(rej) - len(auto),
            "rejections": [{"file": r["file"], "by": r.get("by", "hand"), "why": r["reject"]} for r in rej.values()]}


def closeup_prompt(spec, acting):
    return (
        "Anime close-up shot, widescreen film frame, of the character from the FIRST image (same face, hair, skin tone, outfit; "
        "the first image is her model sheet). Head and shoulders fill the frame, three-quarter view, mid-sprint: body leaning "
        "forward, hair and clothes blown back by speed, a bead or two of sweat. "
        f"Her design, exactly as on the model sheet: {design_text(spec)} "
        f"Style: 1990s cel anime key frame exactly like the SECOND image: {STYLE}, white highlight shapes in eyes and hair, "
        "no motion blur, no speed lines, no text, no brand marks. "
        f"Background: one flat solid pure magenta (#FF00FF) and nothing else. Expression and acting: {acting}").strip()


def refs_of(rest):
    extra = []
    if "--ref" in rest:
        i = rest.index("--ref") + 1
        while i < len(rest) and not rest[i].startswith("--"): extra.append(os.path.join(ROOT, rest[i])); i += 1
    return extra


def main():
    if len(sys.argv) < 3 or sys.argv[1] in ("-h", "--help"): sys.exit(__doc__)
    name, what, rest = sys.argv[1], sys.argv[2], sys.argv[3:]
    opt = lambda k, d=None: rest[rest.index(k) + 1] if k in rest else d
    if what == "count": print(json.dumps(count(name), indent=1)); return
    if what == "reject":
        log(name, {"file": rest[0], "reject": rest[1], "by": "hand", "time": time.strftime("%Y-%m-%dT%H:%M:%S")}); return
    if what == "edit":
        src = os.path.join(ROOT, rest[0]); side = json.load(open(src[:-4] + ".json"))
        stem = os.path.basename(src).rsplit("_", 1)[0]; out = take(os.path.dirname(src), stem)
        extra = refs_of(rest)
        prompt = ("Edit the FIRST image. Change only this and keep everything else exactly as it is, line for line, the same "
                  f"figures in the same poses, sizes and places, the same style and the same background: {rest[1]}"
                  + (" The other image(s) are reference for the change." if extra else ""))
        keep = {k: side[k] for k in ("layout", "map") if k in side}
        if not generate(name, out, prompt, [src, *extra], aspect=side["aspect"], size=side["size"], kind="edit:" + side.get("kind", stem),
                        extra={"from": rel(src), **keep}): sys.exit(1)
        return
    if what == "closeup":
        spec = spec_of(name); out = take(os.path.join(kit_dir(name), "closeup"), rest[0])
        if not generate(name, out, closeup_prompt(spec, rest[1]), [os.path.join(ROOT, spec["design"]), os.path.join(ROOT, spec["style"])],
                        size="2K", kind="closeup:" + rest[0]): sys.exit(1)
        return
    if what == "design":
        spec = spec_of(name); out = take(os.path.join(kit_dir(name), "design"), "model")
        note = rest[0] if rest else ""
        if not generate(name, out, design_prompt(spec, note), [os.path.join(ROOT, spec["origin"]), os.path.join(ROOT, spec["style"])], kind="design"): sys.exit(1)
        return
    if not paint_cels(name, what, rest[0], refs_of(rest), opt("--note", ""), opt("--size", "4K"), opt("--layout")): sys.exit(1)


if __name__ == "__main__": main()
