"""Caption files for the song, from the sung-word timeline: subs/trouble.srt and subs/trouble.vtt.
   .venv/bin/python analysis/captions.py        (after analysis/lyrics.py; needs nothing but analysis/lyrics.json)
One cue per sung phrase, starting on its first word and ending when the voices let go of its last (or the next
phrase starts). The .vtt also carries each word's own start inside the cue (<hh:mm:ss.mmm> karaoke timestamps),
which players that do not know them ignore. Times are seconds into audio.wav."""
import json, os
L = json.load(open("analysis/lyrics.json")); words, phrases = L["words"], L["phrases"]
stamp = lambda t, sep: f"{int(t // 3600):02d}:{int(t % 3600 // 60):02d}:{int(t % 60):02d}{sep}{int(round(t % 1 * 1000)) % 1000:03d}" if round(t % 1 * 1000) < 1000 else stamp(round(t), sep)
srt, vtt = [], ["WEBVTT", "", "NOTE made by analysis/captions.py from analysis/lyrics.json; do not edit by hand", ""]
for n, p in enumerate(phrases):
    ws = [w for w in words if w["phrase"] == p["id"]]; shown = p["text"].replace("...", "…").split(" ")
    assert len(shown) == len(ws), p
    srt += [str(n + 1), f"{stamp(p['start'], ',')} --> {stamp(p['end'], ',')}", " ".join(shown), ""]
    vtt += [p["id"], f"{stamp(p['start'], '.')} --> {stamp(p['end'], '.')}", " ".join(s if k == 0 else f"<{stamp(w['t'], '.')}>{s}" for k, (s, w) in enumerate(zip(shown, ws))), ""]
os.makedirs("subs", exist_ok=True)
open("subs/trouble.srt", "w", encoding="utf-8").write("\n".join(srt)); open("subs/trouble.vtt", "w", encoding="utf-8").write("\n".join(vtt))
print(f"{len(phrases)} cues -> subs/trouble.srt, subs/trouble.vtt")
