"""A song we know everything about, for the tests: test_song.py OUT.wav [--bpm 120] [--bars 8]
A kick (a 55 Hz thump) on every beat, a hat on every off-beat, and a chord that changes on every bar line.
Prints, as JSON, where the beats, bars and kicks are, so a test can hold analysis/song.py to them."""
import json, sys, numpy as np, soundfile as sf
a = sys.argv[1:]; out = a[0]; val = lambda n, d: float(a[a.index(n) + 1]) if n in a else d
bpm, bars, sr, lead = val("--bpm", 120), int(val("--bars", 8)), 22050, 0.5
beat = 60 / bpm; n = int((lead + bars * 4 * beat + 1) * sr); y = np.zeros(n); rng = np.random.default_rng(7)
def add(t, sig): i = int(t * sr); y[i:i + len(sig)] += sig[:max(0, n - i)]
tt = np.arange(int(0.25 * sr)) / sr; kick = np.sin(2 * np.pi * (55 + 60 * np.exp(-tt * 40)) * tt) * np.exp(-tt * 14)
th = np.arange(int(0.04 * sr)) / sr; hat = rng.standard_normal(len(th)) * np.exp(-th * 90) * 0.15
kicks = [lead + i * beat for i in range(bars * 4)]
for t in kicks: add(t, kick); add(t + beat / 2, hat)
for b in range(bars):      # a chord for each bar: two triads, turn about
    tb = np.arange(int(4 * beat * sr)) / sr; notes = [220, 277.18, 329.63] if b % 2 == 0 else [174.61, 220, 261.63]
    add(lead + b * 4 * beat, sum(np.sin(2 * np.pi * f * tb) for f in notes) * 0.08 * np.minimum(1, tb * 40) * np.minimum(1, (4 * beat - tb) * 40))
sf.write(out, (y / np.abs(y).max() * 0.8).astype(np.float32), sr)
print(json.dumps({"bpm": bpm, "kicks": kicks, "bars": [lead + b * 4 * beat for b in range(bars)], "duration": n / sr}))
