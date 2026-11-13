"""The cast bible's tables and pictures, from the kits themselves:  .venv/bin/python scripts/cast_doc.py   (npm run cast)

For each character kit (kits/NAME/kit.json, character.json) and the crowd it writes
  docs/img/design_NAME.jpg    the locked model sheet, small
  docs/img/cast_NAME.jpg      every cel of every action x view, then every hero drawing, labelled
  docs/img/plates_NAME.jpg    one take of every close-up / plate in kits/NAME/closeup/
  docs/img/crowd.jpg          the crowd, calm and startled
and replaces, in docs/cast.md, what is between  <!-- generated:NAME -->  and  <!-- /generated:NAME -->  with tables of
what the kit holds. The prose of docs/cast.md is written by hand and left alone. Run it again after adding drawings.
"""
import glob, json, os, re, sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."); os.chdir(ROOT)
IMG, BG, FG, DIM = "docs/img", (38, 38, 46), (235, 235, 240), (150, 150, 165)
os.makedirs(IMG, exist_ok=True)
try: FONT = ImageFont.truetype("DejaVuSans.ttf", 15); SMALL = ImageFont.truetype("DejaVuSans.ttf", 12)
except OSError: FONT = SMALL = ImageFont.load_default()
# What each action is, in a line (engine/actions.js has the poses and says more).
ACTIONS = {"run": "the run cycle: 8 drawings, looped", "idle": "standing at ease: 1 drawing", "runtop": "the run seen from straight above: 4 drawings, looped",
           "charge": "Tane's shoulder charge: wind-up, impact", "ride": "Juno on her hoverboard: banked left, level, banked right", "leap": "Juno's leap on the board: launch, apex",
           "caught": "caught in the vault: four held poses", "gant_slide": "the slide under a closing door, feet first: 2 drawings", "desc_vault": "Tane vaulting the stair rails, flight to flight: 3 drawings",
           "desc_slide": "Juno sliding down a handrail on her feet: 3 drawings", "desc_steps": "Ife taking every stair: a patter of 4 drawings", "noor_walk": "Noor's walk: 10 drawings", "noor_over": "Noor stepping over something: 10 drawings"}
VIEWS = {"front": "front (0°)", "front34": "three-quarter front (45°)", "side": "left side (90°)", "back34": "three-quarter back (135°)", "back": "back (180°)", "top": "from above"}
shots = {f: open(f, encoding="utf-8").read() for f in sorted(glob.glob("shots/*.js"))}


def thumb(path, h):
    im = Image.open(path).convert("RGBA"); w = max(1, round(im.width * h / im.height)); im = im.resize((w, h), Image.LANCZOS)
    out = Image.new("RGB", im.size, BG); out.paste(im, (0, 0), im); return out


def sheet(rows, path, width=1400, quality=78):
    """rows: [(label, [(image, caption or None), ...])]; images flow, wrapping, under each label."""
    pad, y, placed = 8, 8, []
    for label, items in rows:
        placed.append(("label", 8, y, label)); y += 22; x = 8; rowh = 0
        for im, cap in items:
            if x + im.width > width - 8: x = 8; y += rowh + pad; rowh = 0
            placed.append(("im", x, y, im, cap)); x += im.width + pad; rowh = max(rowh, im.height + (16 if cap else 0))
        y += rowh + 14
    out = Image.new("RGB", (width, y), BG); d = ImageDraw.Draw(out)
    for p in placed:
        if p[0] == "label": d.text((p[1], p[2]), p[3], fill=FG, font=FONT)
        else:
            out.paste(p[3], (p[1], p[2]))
            if p[4]: d.text((p[1], p[2] + p[3].height + 1), p[4][: max(4, p[3].width // 7)], fill=DIM, font=SMALL)
    out.save(path, quality=quality, optimize=True); return os.path.getsize(path)


def used_in(word):
    return sorted({os.path.basename(f) for f, t in shots.items() if re.search(r"\b" + re.escape(word) + r"\b", t)})


def character(name):
    kit = json.load(open(f"kits/{name}/kit.json")); ch = json.load(open(f"kits/{name}/character.json")); b = ch["body"]
    d = Image.open(ch["design"]).convert("RGB"); d.thumbnail((1100, 1100), Image.LANCZOS); d.save(f"{IMG}/design_{name}.jpg", quality=80, optimize=True)
    rows, md = [], []
    md += [f"Body: {b['height']} m tall, {b['heads']} heads. Design locked in `{ch['design']}`; palette "
           + ", ".join(f"{k} `{v}`" for k, v in list(ch["palette"].items())[:8]) + (" …" if len(ch["palette"]) > 8 else "") + ".", "",
           f"![{name}'s model sheet](img/design_{name}.jpg)", "", "**Actions** (cels on the skeleton; a shot asks `{ who, action, phase, view }`):", "",
           "| Action | View | Drawings | What it is |", "|---|---|---|---|"]
    for a, A in kit["actions"].items():
        for v, V in A["views"].items():
            md.append(f"| `{a}` | {VIEWS.get(v, v)} `{v}` | {len(V['cels'])} | {ACTIONS.get(a, '')} |")
            rows.append((f"{a} × {v}", [(thumb(f"kits/{name}/{c['img']}", 120), None) for _, c in sorted(V["cels"].items(), key=lambda kv: int(kv[0]))]))
    heroes = kit.get("heroes", {})
    if heroes:
        md += ["", f"**Hero drawings** ({len(heroes)}; one-off drawings for one shot's camera; a shot asks `hero: \"name\"`):", "", "| Name | Drawn for | Pose it was laid out from |", "|---|---|---|"]
        for h, H in heroes.items(): md.append(f"| `{h}` | `{H.get('shot', '?')}` frame {H.get('frame', '?')} | `{H.get('action', '?')}` drawing {H.get('cel', '?')} |")
        rows.append(("hero drawings", [(thumb(f"kits/{name}/{H['img']}", 130), h) for h, H in heroes.items()]))
    size = sheet(rows, f"{IMG}/cast_{name}.jpg")
    md += ["", f"![every cel and hero drawing in {name}'s kit](img/cast_{name}.jpg)", ""]
    # plates: kits/NAME/closeup/STEM_N.jpg (takes), STEM_N.png (an edit graded to its base by pipeline/match.py, or keyed)
    stems = {}
    for f in sorted(glob.glob(f"kits/{name}/closeup/*.jpg") + glob.glob(f"kits/{name}/closeup/*.png")):
        base = os.path.splitext(os.path.basename(f))[0]; m = re.match(r"^(.*?)_(\d+)[a-z]?(_key)?$", base); stem = m.group(1) if m else re.sub(r"_[a-z]$", "", base)
        stems.setdefault(stem, []).append(f)
    if stems:
        md += [f"**Close-ups and plates** (`kits/{name}/closeup/`; single drawings on the key colour, laid over a set whole). A plate with more than one of the cast "
               "is filed under each of them. Takes include rejected ones and expression edits; the sidecar `.json` beside each has its prompt.", "",
               "| Plate | Takes | Kind | Shots that name it |", "|---|---|---|---|"]
        prow = []
        for stem, files in stems.items():
            jpgs = [f for f in files if f.endswith(".jpg")] or files; side = os.path.splitext(jpgs[0])[0] + ".json"
            kind = json.load(open(side)).get("kind", "") if os.path.exists(side) else ""
            kind = "close-up" if "closeup" in kind else "plate" if "plate" in kind else kind.split(":")[0]
            md.append(f"| `{stem}` | {len(jpgs)} | {kind} | {', '.join(f'`{s}`' for s in used_in(stem)) or '—'} |")
            prow.append((thumb(jpgs[0], 100), stem))
        sheet([("one take of each plate", prow)], f"{IMG}/plates_{name}.jpg", quality=72)
        md += ["", f"![one take of each of {name}'s plates](img/plates_{name}.jpg)", ""]
    extra = sorted(os.path.basename(p) for p in glob.glob(f"kits/{name}/*/") if os.path.basename(p.rstrip("/")) not in list(kit["actions"]) + ["hero", "closeup", "design", "source"])
    for e in [p.rstrip("/") for p in extra]: md.append(f"Also `kits/{name}/{e}/`: drawings cut from plates for one section's shots (pipeline/sprites.py), {len(glob.glob(f'kits/{name}/{e}/*.webp'))} files.")
    return md, size


def crowd():
    kit = json.load(open("kits/crowd/kit.json")); people = kit["people"]
    rows = [(role, [(thumb(f"kits/crowd/{c['img']}", 110), p["name"] if i == 0 else "startled") for p in people if p["role"] == role for i, c in enumerate(p["cels"])]) for role in ("shopper", "keeper", "special")]
    sheet(rows, f"{IMG}/crowd.jpg", quality=72)
    md = [f"{len(people)} people, two drawings each (going about their business; startled), cut by `kits/crowd/cut.py` from sheets in `kits/crowd/source/`:", "",
          "| Role | People |", "|---|---|"]
    for role in ("shopper", "keeper", "special"): md.append(f"| {role} | {', '.join('`' + p['name'] + '`' for p in people if p['role'] == role)} |")
    return md + ["", "![the crowd](img/crowd.jpg)", ""]


doc = "docs/cast.md"; text = open(doc, encoding="utf-8").read() if os.path.exists(doc) else ""
for name in ["juno", "tane", "ife", "noor", "crowd"]:
    md, size = (crowd(), 0) if name == "crowd" else character(name)
    a, b = f"<!-- generated:{name} -->", f"<!-- /generated:{name} -->"
    if a in text and b in text: text = text[: text.index(a) + len(a)] + "\n" + "\n".join(md) + "\n" + text[text.index(b):]
    else: print(f"docs/cast.md has no {a} ... {b}: tables for {name} not written", file=sys.stderr)
if text: open(doc, "w", encoding="utf-8").write(text)
print("\n".join(f"{f} {os.path.getsize(f) // 1024} KB" for f in sorted(glob.glob(f"{IMG}/*.jpg"))))
