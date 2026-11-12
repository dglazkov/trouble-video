"""First listen: tempo, key, energy by section, and a rough lyric transcript."""
import json, sys, numpy as np, librosa
from faster_whisper import WhisperModel

src = sys.argv[1]
y, sr = librosa.load(src, sr=22050, mono=True)
dur = len(y) / sr
tempo, beats = librosa.beat.beat_track(y=y, sr=sr)
tempo = float(np.atleast_1d(tempo)[0])
bt = librosa.frames_to_time(beats, sr=sr)
chroma = librosa.feature.chroma_cqt(y=y, sr=sr).mean(axis=1)
maj = np.array([6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88])
mnr = np.array([6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17])
names = "C C# D D# E F F# G G# A A# B".split()
best = max(((np.corrcoef(np.roll(p, i), chroma)[0, 1], names[i] + m)
            for i in range(12) for p, m in ((maj, " major"), (mnr, " minor"))))
rms = librosa.feature.rms(y=y, hop_length=512)[0]
cent = librosa.feature.spectral_centroid(y=y, sr=sr, hop_length=512)[0]
t = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=512)
win = 5.0
energy = [{"t": float(a), "rms": float(rms[(t >= a) & (t < a + win)].mean()),
           "bright": float(cent[(t >= a) & (t < a + win)].mean())}
          for a in np.arange(0, dur, win)]
# section boundaries from timbre + harmony
mf = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13)
feat = librosa.util.sync(np.vstack([librosa.util.normalize(mf, axis=1),
                                    librosa.feature.chroma_cqt(y=y, sr=sr)]), beats)
bounds = librosa.segment.agglomerative(feat, 9)
sect = [float(bt[min(b, len(bt) - 1)]) for b in bounds]

model = WhisperModel("medium", device="cpu", compute_type="int8", cpu_threads=16)
segs, info = model.transcribe(librosa.resample(y, orig_sr=sr, target_sr=16000), word_timestamps=True, vad_filter=True)
lyrics = [{"start": round(s.start, 2), "end": round(s.end, 2), "text": s.text.strip(),
           "words": [[round(w.start, 2), round(w.end, 2), w.word.strip()] for w in s.words]}
          for s in segs]
out = {"duration": dur, "tempo": tempo, "key": best[1], "beats": [float(b) for b in bt],
       "sections": sect, "energy": energy, "language": info.language, "lyrics": lyrics}
json.dump(out, open("analysis/listen.json", "w"), indent=1)
print(f"dur {dur:.1f}s tempo {tempo:.1f} key {best[1]} beats {len(bt)} lang {info.language}")
print("sections", [f"{s:.1f}" for s in sect])
mx = max(e["rms"] for e in energy)
for e in energy:
    print(f'{e["t"]:5.0f}s {"#" * int(40 * e["rms"] / mx):40s} bright {e["bright"]:.0f}')
for l in lyrics:
    print(f'{l["start"]:6.1f} {l["text"]}')
