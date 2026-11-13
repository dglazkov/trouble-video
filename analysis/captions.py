"""Caption files from a song's sung-word timeline.
   .venv/bin/python analysis/captions.py              the demo song: analysis/lyrics.json -> subs/trouble.srt, subs/trouble.vtt
   .venv/bin/python analysis/captions.py stories/NAME  another song: stories/NAME/lyrics.json -> stories/NAME/captions.srt, .vtt
(lyrics.json: analysis/lyrics.py for the demo song; analysis/song.py --lyrics for another, corrected by ear.)
One cue per sung phrase, starting on its first word and ending when the voices let go of its last (or the next
phrase starts). The .vtt also carries each word's own start inside the cue (<hh:mm:ss.mmm> karaoke timestamps),
which players that do not know them ignore. Times are seconds into the song's audio. Nothing is burned into the picture."""
import json, os, sys
SONG = sys.argv[1].rstrip("/") if len(sys.argv) > 1 else None
SRC = os.path.join(SONG or "analysis", "lyrics.json"); OUT = os.path.join(SONG, "captions") if SONG else "subs/trouble"
if not os.path.exists(SRC): sys.exit(f"captions.py: {SRC} is missing (analysis/song.py AUDIO --out {SONG or 'stories/NAME'} --lyrics writes a first draft)")
L = json.load(open(SRC)); words, phrases = L["words"], L["phrases"]
stamp = lambda t, sep: f"{int(t // 3600):02d}:{int(t % 3600 // 60):02d}:{int(t % 60):02d}{sep}{int(round(t % 1 * 1000)) % 1000:03d}" if round(t % 1 * 1000) < 1000 else stamp(round(t), sep)
srt, vtt = [], ["WEBVTT", "", f"NOTE made by analysis/captions.py from {SRC}; do not edit by hand", ""]
for n, p in enumerate(phrases):
    ws = [w for w in words if w["phrase"] == p["id"]]; shown = p["text"].replace("...", "…").split(" ")
    assert len(shown) == len(ws), p
    srt += [str(n + 1), f"{stamp(p['start'], ',')} --> {stamp(p['end'], ',')}", " ".join(shown), ""]
    vtt += [p["id"], f"{stamp(p['start'], '.')} --> {stamp(p['end'], '.')}", " ".join(s if k == 0 else f"<{stamp(w['t'], '.')}>{s}" for k, (s, w) in enumerate(zip(shown, ws))), ""]
os.makedirs(os.path.dirname(OUT), exist_ok=True)
open(OUT + ".srt", "w", encoding="utf-8").write("\n".join(srt)); open(OUT + ".vtt", "w", encoding="utf-8").write("\n".join(vtt))
print(f"{len(phrases)} cues -> {OUT}.srt, {OUT}.vtt")
