"""The kick drum, as a stem of its own: .venv/bin/python analysis/kicks.py [--json] [--from S --to S] [--dry]
analysis/stems.py finds onsets in the whole drum stem at a 23 ms hop, which puts a snare, a roll and a kick in one
list and each of them within a frame or so. A hit in the picture wants the kick itself, so this takes the drum stem
under 120 Hz at its own sample rate, follows its envelope, and calls every swell that reaches 40% of the loudest a
kick: its onset is where the envelope crosses half of that kick's own height on the way up (the attack is 20-30 ms
long; the half-way point is what the ear hears as the hit). It writes them into analysis/stems.json as the stem
`kick` (onsets, a 24 fps envelope, the peak), beside the others and leaving them as they are, so engine/sync.js and
engine/marks.mjs take `on: "kick"` like any stem. --dry writes nothing; --from/--to print only that span.
"""
import json, sys, os, numpy as np, soundfile as sf
from scipy import signal
FPS, CUTOFF, LEVEL, GAP = 24, 120.0, 0.4, 0.12
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")


def envelope(path=os.path.join(ROOT, "stems-wav", "2 Drums.wav")):
    y, sr = sf.read(path)
    y = y.mean(axis=1) if y.ndim > 1 else y
    lo = signal.sosfiltfilt(signal.butter(4, CUTOFF, "low", fs=sr, output="sos"), y)      # zero phase: nothing is delayed
    k = int(sr * 0.005)
    return np.convolve(np.abs(signal.hilbert(lo)), np.ones(k) / k, "same"), sr


def kicks(env, sr):
    """[(onset seconds, height 0..1)]: each stretch above half the level whose top reaches the level is one kick."""
    top = float(env.max()) or 1.0
    above = np.flatnonzero(env > LEVEL * top * 0.5)
    if not len(above): return []
    runs = np.split(above, np.flatnonzero(np.diff(above) > GAP * sr) + 1)
    out = []
    for r in runs:
        a, b = r[0], r[-1] + 1; peak = float(env[a:b].max())
        if peak < LEVEL * top: continue
        # the first top of the swell, not a later ripple in its body: the first sample within 90% of the peak
        first = a + int(np.argmax(env[a:b] >= 0.9 * peak)); half = 0.5 * float(env[a:first + 1].max())
        i = first
        while i > 0 and env[i - 1] >= half: i -= 1
        lo = max(0, i - 1); t = (lo + (half - env[lo]) / max(1e-12, env[i] - env[lo])) / sr if i > 0 else 0.0      # between samples
        out.append((round(float(t), 4), round(peak / top, 3)))
    return out


def kick_stem():
    env, sr = envelope(); top = float(env.max()) or 1.0; n = int(len(env) / sr * FPS) + 1; hop = sr / FPS
    e = [round(float(env[int(i * hop):max(int(i * hop) + 1, int((i + 1) * hop))].max() / top), 3) for i in range(n) if int(i * hop) < len(env)]
    found = kicks(env, sr)
    return {"peak": top, "env": e, "onsets": [t for t, _ in found]}, found


if __name__ == "__main__":
    a = sys.argv[1:]
    if "--help" in a: print(__doc__); sys.exit(2)
    val = lambda n, d: float(a[a.index(n) + 1]) if n in a else d
    t0, t1 = val("--from", 0.0), val("--to", float("inf"))
    stem, found = kick_stem()
    rows = [{"t": t, "frame": round(t * FPS, 2), "height": h} for t, h in found if t0 <= t <= t1]
    if "--dry" not in a:
        p = os.path.join(ROOT, "analysis", "stems.json"); d = json.load(open(p)); d["stems"]["kick"] = stem; json.dump(d, open(p, "w"))
    if "--json" in a: print(json.dumps({"kicks": len(found), "written": "--dry" not in a, "shown": rows}))
    else:
        for r in rows: print(f"{r['t']:8.3f} s  frame {r['frame']:8.2f}  height {r['height']:.2f}")
        print(f"{len(found)} kicks in the song" + ("" if "--dry" in a else "; written to analysis/stems.json as the stem `kick`"))
