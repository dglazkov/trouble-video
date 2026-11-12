"""Per-stem activity: a 24 fps loudness envelope and onset times for each stem, for the video to react to."""
import json, glob, os, re, numpy as np, librosa
FPS = 24
out = {"fps": FPS, "stems": {}}
for path in sorted(glob.glob("stems-wav/*.wav"), key=lambda p: int(re.match(r"(\d+)", os.path.basename(p)).group(1))):
    name = re.sub(r"^\d+ ", "", os.path.basename(path)[:-4]).lower().replace(" ", "_")
    y, sr = librosa.load(path, sr=22050, mono=True)
    hop = 512
    rms = librosa.feature.rms(y=y, hop_length=hop)[0]
    t = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=hop)
    ft = np.arange(0, len(y) / sr, 1 / FPS)
    env = np.interp(ft, t, rms)
    peak = float(env.max()) or 1.0
    on = librosa.onset.onset_detect(y=y, sr=sr, hop_length=hop, units="time", backtrack=False)
    out["stems"][name] = {"peak": peak, "env": [round(float(v / peak), 3) for v in env],
                          "onsets": [round(float(o), 3) for o in on]}
    # where is this stem present? 5 s blocks
    blocks = [env[i:i + FPS * 5].mean() / peak for i in range(0, len(env), FPS * 5)]
    print(f"{name:15s} peak {peak:.3f} onsets {len(on):4d} |" + "".join(" .:-=+*#%@"[min(9, int(b * 18))] for b in blocks) + "|")
json.dump(out, open("analysis/stems.json", "w"))
