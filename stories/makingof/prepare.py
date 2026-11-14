"""Builds the making-of's committed asset pack and session data from the gathered material.

    .venv/bin/python stories/makingof/prepare.py

Reads out/makingof/ (footage/, data/: gitignored working material, described in out/makingof/manifest.md), out/hello.mp4
and out/fixes/, and writes
    stories/makingof/footage/    only what the edit shows, at the size it is shown, as WebP stills and image sequences
    stories/makingof/session.json   the session's clock: commits, agents' spans, the numbers on screen (from data/stats.json)
A clone already has both; this is how they were made, and it is only re-run when the edit needs other footage.
Nothing private goes in: no message text (that is in ledger.json, chosen by hand), no paths, no addresses.
The film's own frames are not copied: the edit reads them from out/film/frames/ (npm run film).
"""
import json, os, subprocess, shutil, sys, tempfile
from datetime import datetime
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, "out/makingof/footage"); DATA = os.path.join(ROOT, "out/makingof/data"); DST = os.path.join(ROOT, "stories/makingof/footage")

def out(rel):
    p = os.path.join(DST, rel); os.makedirs(os.path.dirname(p), exist_ok=True); return p

def still(src, rel, size=None, box=None, crop=None, q=88, lossless=False):
    im = Image.open(src if os.path.isabs(src) else os.path.join(SRC, src))
    im = im.convert("RGBA" if im.mode in ("RGBA", "LA", "P") else "RGB")
    if crop: im = im.crop(crop)
    if box: k = min(box[0] / im.width, box[1] / im.height, 1); size = (round(im.width * k), round(im.height * k))
    if size and size != im.size: im = im.resize(size, Image.LANCZOS)
    im.save(out(rel), "WEBP", quality=q, lossless=lossless, method=6)

def seq(src, rel, size, first=0, count=None, q=80):
    """Frames first..first+count-1 of a clip as rel/000.webp ... at `size`."""
    src = src if os.path.isabs(src) else os.path.join(SRC, src)
    d = out(rel + "/x"); d = os.path.dirname(d); tmp = tempfile.mkdtemp()
    vf = f"select='gte(n\\,{first})" + (f"*lt(n\\,{first + count})'" if count else "'") + f",scale={size[0]}:{size[1]}:flags=lanczos"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", src, "-vf", vf, "-vsync", "0", os.path.join(tmp, "%03d.png")], check=True)
    for i, f in enumerate(sorted(os.listdir(tmp))): Image.open(os.path.join(tmp, f)).convert("RGB").save(os.path.join(d, f"{i:03d}.webp"), "WEBP", quality=q, method=6)
    shutil.rmtree(tmp)

def frames(files, rel, size, q=80):
    d = os.path.dirname(out(rel + "/x"))
    for i, f in enumerate(files): Image.open(f).convert("RGB").resize(size, Image.LANCZOS).save(os.path.join(d, f"{i:03d}.webp"), "WEBP", quality=q, method=6)

def whole_cells(size=330):
    """The first whole-drawing test, cell by cell: mannequin n of the layout sheet (whole/m{n}.webp) and the drawing
    painted over it in take B (whole/d{n}.webp), the take that followed the layout (take A ignored it: same pose eight
    times, facing the other way). The painted sheet came back at another size and aspect than the layout, so each drawing
    is laid into its mannequin's cell at one scale for all eight (the median of the figures' heights), its head over the
    mannequin's head and its middle at the mannequin's middle: they are in register, as they were painted."""
    import numpy as np
    L = Image.open(os.path.join(SRC, "06_whole_drawings/whole_original/run_layout.png")).convert("RGB"); B = Image.open(os.path.join(SRC, "06_whole_drawings/whole_original/run_b.png")).convert("RGB")
    cw, chh = B.width // 4, B.height // 2; cells = []
    for i in range(8):
        r, c = divmod(i, 4)
        m = L.crop((c * 1024, r * 1024, (c + 1) * 1024, (r + 1) * 1024)); d = B.crop((c * cw, r * chh, (c + 1) * cw, (r + 1) * chh))
        M = np.asarray(m).astype(int); D = np.asarray(d).astype(int); bg = D[5, 5]
        mm = np.abs(M - 255).max(axis=2) > 30; dm = np.abs(D - bg).max(axis=2) > 60
        box = lambda k: (np.where(k.any(axis=1))[0][[0, -1]], np.where(k.any(axis=0))[0][[0, -1]])
        head = lambda k, y0, y1: np.where(k[y0:y0 + int((y1 - y0) * 0.16)])[1].mean()
        (my0, my1), _ = box(mm); (dy0, dy1), _ = box(dm)
        cells.append(dict(m=m, d=d, bg=tuple(int(v) for v in bg), my=(my0, my1), dy=(dy0, dy1), mh=head(mm, my0, my1), dh=head(dm, dy0, dy1)))
    s = float(np.median([(c["my"][1] - c["my"][0]) / (c["dy"][1] - c["dy"][0]) for c in cells]))
    for i, c in enumerate(cells):
        d = c["d"].resize((round(c["d"].width * s), round(c["d"].height * s)), Image.LANCZOS)
        canvas = Image.new("RGB", (1024, 1024), c["bg"])
        canvas.paste(d, (round(c["mh"] - c["dh"] * s), round((c["my"][0] + c["my"][1]) / 2 - (c["dy"][0] + c["dy"][1]) / 2 * s)))
        c["m"].resize((size, size), Image.LANCZOS).save(out(f"whole/m{i}.webp"), "WEBP", quality=92, method=6)
        canvas.resize((size, size), Image.LANCZOS).save(out(f"whole/d{i}.webp"), "WEBP", quality=92, method=6)

def footage():
    shutil.rmtree(DST, ignore_errors=True)
    # 3 the tools: the same shot in two renderers (re-rendered from the committed code)
    seq("01_bakeoff/web.mp4", "bake/web", (928, 522)); seq("01_bakeoff/blender.mp4", "bake/blender", (928, 522))
    # 4 the first face
    for n in ("face", "blink", "shout", "shock", "grin"): still(f"02_face/test_{n}.png", f"face/{n}.webp", size=(860, 860))
    seq("02_face/face_closeup.mp4", "face/closeup", (1280, 720), q=82)
    still("03_pose/guide_sheet_8_phases.png", "pose/guides.webp", size=(1600, 800))
    still("screenshots/1.webp", "shots/1.webp", box=(1500, 800), q=92)
    # 5 the pivot
    # the puppet's turn as he watched it (the original file): its last full turn, which ends facing front, small; and
    # the front-facing frame it ends on at full size, where the seams are
    seq("05_parts_kit/juno_turn_original.mp4", "parts/turn", (640, 360), first=418, count=80)
    seq("05_parts_kit/juno_turn_original.mp4", "parts/front", (1920, 1080), first=508, count=1, q=95)
    whole_cells()
    seq("06_whole_drawings/whole_run_original.mp4", "whole/run", (1280, 720), q=82)
    # 6 the cast
    still("04_cast/lineup_v1.png", "cast/lineup.webp", size=(1376, 768), q=90)
    for n in ("juno", "tane", "ife", "noor"):
        still(f"04_cast/{n}_v1.png", f"cast/{n}_v1.webp", size=(418, 560)); still(f"04_cast/{n}_v2.png", f"cast/{n}_v2.webp", size=(418, 560))
    for n in ("v3a", "v3b", "v4"): still(f"04_cast/tane_{n}.png", f"cast/tane_{n}.webp", size=(448, 600))
    # 8 the method
    still("10_method/01_run_side_layout_mannequins.png", "method/layout.webp", size=(1376, 768), q=90)
    still("10_method/02_run_side_painted_take_9_accepted.jpg", "method/painted.webp", size=(1376, 768), q=90)
    still("10_method/03_run_side_cut_cels_0-7.png", "method/cels.webp", size=(1600, 286), q=92)
    still("10_method/rejected_extra_figures_12_for_8__juno_run_front34_take_3.jpg", "method/rej_count.webp", size=(1376, 768))
    still("10_method/rejected_mannequin_colour_left_in__tane_vault_take_1.jpg", "method/rej_colour.webp", size=(1376, 768))
    still("10_method/rejected_wrong_pose_invented_gadget__juno_reun_wide_take_3.jpg", "method/rej_gadget.webp", size=(1376, 768))
    # 9 the human eye: what he was shown (his screenshots, unchanged but for size; clips of the faults)
    for n in ("4", "5", "6", "7", "8"): still(f"screenshots/{n}.webp", f"shots/{n}.webp", box=(1500, 800), q=92)
    seq("07_slice/slice_before_polish_original.mp4", "before/crowd", (1280, 720), first=204, count=40)
    seq("07_slice/slice_before_polish_original.mp4", "before/kick", (1280, 720), first=85, count=40)
    frames([os.path.join(ROOT, f"out/fixes/warden/before/f{f:04d}.png") for f in range(367, 407)], "before/boss", (1280, 720))
    # 7 the night: the slice as first assembled at 23:46 (the original file)
    seq("07_slice/slice_before_polish_original.mp4", "before/slice", (960, 540), first=96, count=160, q=78)
    # 11 fork it: the hello clip
    seq(os.path.join(ROOT, "out/hello.mp4"), "hello", (960, 540), first=40, count=199, q=80)

def session():
    T = json.load(open(os.path.join(DATA, "timeline.json")))["events"]; S = json.load(open(os.path.join(DATA, "stats.json")))
    t0 = datetime.fromisoformat(S["wall_clock"]["first_message_local"])
    mins = lambda s: round((datetime.fromisoformat(s) - t0).total_seconds() / 60, 2)
    agents = [{"label": e["label"], "start": mins(e["local"]), "end": mins(e["ends_local"]), "nested": e["nested"] == "True", "killed": e["killed_by_interrupt"] == "True"} for e in T if e["type"] == "agent_start"]
    o, d, a, f, w = S["owner_messages"], S["drawings"], S["agents"], S["film"], S["wall_clock"]
    out_ = {
        "what": "The session's clock for the making-of's furniture, and the numbers it puts on screen. Written by stories/makingof/prepare.py from out/makingof/data/ (timeline.json, stats.json); minutes are from the first message, local time America/Los_Angeles.",
        "first": w["first_message_local"], "perfect": w["perfect_local"], "sleep": w["sleep_message_local"], "wow": w["wow_local"],
        "minutes": {"perfect": mins(w["perfect_local"]), "sleep": mins(w["sleep_message_local"]), "wow": mins(w["wow_local"]), "nightWorkEnds": mins("2026-11-12 00:30:19")},
        "commits": [mins(e["local"]) for e in T if e["type"] == "commit" and 0 <= mins(e["local"]) <= mins(w["perfect_local"])],
        "agents": agents,
        "stats": {
            "hours": w["hours_first_message_to_perfect"], "hoursAway": w["hours_away_overnight"],
            "messages": o["typed_first_to_perfect"], "words": o["words_first_to_perfect"], "assistantWords": o["assistant_words_first_to_perfect"], "screenshots": o["screenshots_pasted"],
            "logged": d["kit_logs_total"]["generations"], "rejected": d["kit_logs_total"]["rejected"], "kept": d["kit_logs_total"]["kept"],
            "agents": a["launched_for_the_film_and_repo"], "peak": a["peak_running_at_once_incl_nested"], "peakTopLevel": a["peak_top_level_at_once"],
            "frames": f["frames_rendered"], "marks": f["marks_checked"], "filmSeconds": f["sections"]["film"]["seconds"],
            "sections": {k: v["frames"] for k, v in f["sections"].items() if k not in ("film", "film_review")},
        },
    }
    json.dump(out_, open(os.path.join(ROOT, "stories/makingof/session.json"), "w"), indent=1)

if __name__ == "__main__":
    if not os.path.isdir(SRC): sys.exit("out/makingof/footage is not here: the pack in stories/makingof/footage/ is what a clone has, and is enough to render")
    if "--session" not in sys.argv: footage()
    session()
    n = sum(os.path.getsize(os.path.join(d, f)) for d, _, fs in os.walk(DST) for f in fs)
    print(f"stories/makingof/footage: {n / 1e6:.1f} MB")
