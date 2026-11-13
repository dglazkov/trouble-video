"""Measure a song, any song, into a folder the engine can be cut to.

  python analysis/song.py AUDIO --out stories/NAME [--stems DIR] [--lyrics [MODEL]] [--words "the lyric, if you have it"]

Writes, into the folder given with --out (a shot says `song: "stories/NAME"` to be cut to it; engine/song.mjs):
  audio.EXT      a copy of AUDIO (render.mjs lays it under the video)
  listen.json    duration, tempo, key, every beat, section boundaries, energy in 5 s blocks, and `downbeat`: a beat
                 that starts a bar (an estimate: of the four ways to count in fours, the one on whose first beats the chords change)
  stems.json     for each stem, a 24 fps loudness envelope (0..1) and its onsets in seconds; engine/sync.js reads it
  lyrics.json    only with --lyrics: the sung words on one timeline, as a speech model heard them (see below)

WITH STEMS (--stems DIR: one audio file per instrument, as Suno's "Get stems" or a separator such as Demucs gives):
each file becomes a stem named after its file ("2 Drums.wav" -> drums, "0 Lead Vocals.wav" -> lead_vocals), measured
on its own, and the kick is measured from the drum stem under 120 Hz (analysis/kicks.py: good to a few milliseconds).
This is the better path: a hit hung on `kick` is on the kick drum and nothing else.

WITHOUT STEMS the mix is split by arithmetic, not by ear, and every stem is a STAND-IN:
  drums, percussion   the percussive part of the mix (sudden, broadband), all of it and above 5 kHz
  kick                the percussive part under 120 Hz: every swell that reaches 40% of the loudest. On music with a
                      plain kick drum this finds it to within a frame; a loud bass note that starts suddenly is taken
                      for a kick, and a soft kick under a wall of bass is missed (measured on the demo song against its
                      real drum stem: docs/song.md has the numbers)
  bass                the sustained part under 200 Hz
  keyboard, guitar, brass, strings, synth, lead_vocals, backing_vocals, other
                      bands of the sustained part. They move with the music in their register; they are NOT the
                      instrument they are named for. The names are the ones the sets' wiring asks for (a set's lights
                      are wired to `bass`, its alarms to `brass` ...), so every set works on any song.
Where --stems gives some of these names and not others (a four-stem separator: drums, bass, vocals, other), the
missing ones are filled in from the mix in the same way. Each stand-in is marked "estimated": true in stems.json.

LYRICS (--lyrics): faster-whisper (default model "small"; it is downloaded on first use) transcribes the vocal stem,
or the mix when there is none, with word times, into lyrics.json, every word marked confidence "low". Treat it as a
first draft: on the demo song a transcription put words seconds from where they were sung until the words were
aligned by hand against the stems (analysis/lyrics.py is that work). Give --words "..." with the real lyric to bias
the model toward it, then listen and correct the JSON before anything on screen is hung on it.

Prints what it found. Nothing here is specific to one song; analysis/listen.py, stems.py, kicks.py and lyrics.py are
the record of how the demo song was measured.
"""
import argparse, json, os, re, shutil, sys
import numpy as np, librosa, scipy.signal as ss
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kicks as K

FPS, SR, HOP, NFFT = 24, 22050, 512, 2048
AUDIO_EXT = (".wav", ".flac", ".mp3", ".m4a", ".ogg", ".aac", ".aif", ".aiff")
# The stems the sets and machines are wired to (grep 'stem: "' sets machines), and where each stand-in is taken from
# when there is no such stem: (part of the mix, low Hz, high Hz).
STANDINS = {"drums": ("perc", 0, 1e9), "percussion": ("perc", 5000, 1e9), "bass": ("harm", 30, 200), "keyboard": ("harm", 200, 600),
            "guitar": ("harm", 600, 1500), "brass": ("harm", 500, 2000), "strings": ("harm", 1500, 4000), "synth": ("harm", 2000, 6000),
            "lead_vocals": ("harm", 300, 3000), "backing_vocals": ("harm", 300, 3000), "other": ("harm", 0, 1e9)}
ALIASES = {"vocals": "lead_vocals", "vocal": "lead_vocals", "lead_vocal": "lead_vocals", "voice": "lead_vocals", "drum": "drums", "piano": "keyboard", "keys": "keyboard", "guitars": "guitar"}


def die(msg): sys.exit("song.py: " + msg)


def load(path, sr=SR):
    try: y, _ = librosa.load(path, sr=sr, mono=True)
    except Exception as e: die(f"cannot read {path} as audio ({type(e).__name__}: {e})")
    if len(y) < sr * 2: die(f"{path} is {len(y) / sr:.1f} s long; this wants at least a couple of seconds of music")
    return y


def to_fps(values, times, dur):
    """A curve sampled at `times`, resampled to one value per film frame and scaled so its peak is 1."""
    env = np.interp(np.arange(0, dur, 1 / FPS), times, values); peak = float(env.max()) or 1.0
    return [round(float(v / peak), 3) for v in env], peak


def stem_of_file(path, dur):
    """One real stem, measured as analysis/stems.py measured the demo's: RMS envelope, onsets."""
    y = load(path); rms = librosa.feature.rms(y=y, hop_length=HOP)[0]; t = librosa.frames_to_time(np.arange(len(rms)), sr=SR, hop_length=HOP)
    env, peak = to_fps(rms, t, dur)
    on = librosa.onset.onset_detect(y=y, sr=SR, hop_length=HOP, units="time", backtrack=False)
    return {"peak": peak, "env": env, "onsets": [round(float(o), 3) for o in on]}


def standin(mag, freqs, lo, hi, dur):
    """A band of one part of the mix (a magnitude spectrogram) as a stem: its level, and onsets from its own rise."""
    band = mag[(freqs >= lo) & (freqs < hi)]
    level = np.sqrt((band ** 2).mean(axis=0)); t = librosa.frames_to_time(np.arange(len(level)), sr=SR, hop_length=HOP)
    env, peak = to_fps(level, t, dur)
    flux = np.maximum(0, np.diff(np.log1p(band * 10), axis=1, prepend=0)).mean(axis=0)
    on = librosa.onset.onset_detect(onset_envelope=flux, sr=SR, hop_length=HOP, units="time", backtrack=False) if flux.max() > 0 else []
    return {"peak": peak, "env": env, "onsets": [round(float(o), 3) for o in on], "estimated": True}


def kick_from(y, sr):
    """analysis/kicks.py's measure on any signal: the envelope under 120 Hz, and its kicks as a stem."""
    lo = ss.sosfiltfilt(ss.butter(4, K.CUTOFF, "low", fs=sr, output="sos"), y); k = max(1, int(sr * 0.005))
    env = np.convolve(np.abs(ss.hilbert(lo)), np.ones(k) / k, "same"); top = float(env.max()) or 1.0; hop = sr / FPS
    n = int(len(env) / sr * FPS) + 1
    e = [round(float(env[int(i * hop):max(int(i * hop) + 1, int((i + 1) * hop))].max() / top), 3) for i in range(n) if int(i * hop) < len(env)]
    found = K.kicks(env, sr)
    return {"peak": top, "env": e, "onsets": [t for t, _ in found]}


def listen(y, dur):
    tempo, bf = librosa.beat.beat_track(y=y, sr=SR); tempo = float(np.atleast_1d(tempo)[0]); beats = librosa.frames_to_time(bf, sr=SR)
    if len(beats) < 4: die("no steady beat found (fewer than four beats): is this music with a pulse? A longer excerpt may help.")
    cq = librosa.feature.chroma_cqt(y=y, sr=SR); chroma = cq.mean(axis=1)
    maj = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]); mnr = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
    names = "C C# D D# E F F# G G# A A# B".split()
    key = max(((np.corrcoef(np.roll(p, i), chroma)[0, 1], names[i] + m) for i in range(12) for p, m in ((maj, " major"), (mnr, " minor"))))[1]
    rms = librosa.feature.rms(y=y, hop_length=HOP)[0]; cent = librosa.feature.spectral_centroid(y=y, sr=SR, hop_length=HOP)[0]
    t = librosa.frames_to_time(np.arange(len(rms)), sr=SR, hop_length=HOP)
    energy = [{"t": float(a), "rms": float(rms[(t >= a) & (t < a + 5)].mean()), "bright": float(cent[(t >= a) & (t < a + 5)].mean())} for a in np.arange(0, dur, 5.0)]
    # section boundaries from timbre and harmony, about one per 20 s (the demo's nine in 165 s)
    k = int(min(max(2, round(dur / 20)), 12, max(2, len(beats) // 8)))
    feat = librosa.util.sync(np.vstack([librosa.util.normalize(librosa.feature.mfcc(y=y, sr=SR, n_mfcc=13), axis=1), cq]), bf)
    sect = [float(beats[min(b, len(beats) - 1)]) for b in librosa.segment.agglomerative(feat, k)] if feat.shape[1] > k else [float(beats[0])]
    db, margin = downbeat(beats, bf, cq)
    return {"duration": dur, "tempo": tempo, "key": key, "beats": [float(b) for b in beats], "downbeat": db, "sections": sect, "energy": energy}, margin


def downbeat(beats, bf, cq):
    """A beat that starts a bar: chords change on bar lines, so of the four ways to count in fours, the one whose
    first beats see the harmony (chroma) change most. -> (seconds, how clearly it won, 0..1)."""
    if len(beats) < 9: return float(beats[0]), 0.0
    c = librosa.util.sync(cq, bf, aggregate=np.mean)[:, 1:len(beats)]; nov = np.r_[0, np.linalg.norm(np.diff(c, axis=1), axis=0)]
    score = [float(nov[k::4].mean()) for k in range(4)]; k = int(np.argmax(score)); top = score[k] or 1.0
    return float(beats[k]), (top - sorted(score)[-2]) / top


def transcribe(path, model, words, dur):
    try: from faster_whisper import WhisperModel
    except ImportError: die("--lyrics needs faster-whisper (it is in requirements.txt)")
    m = WhisperModel(model, device="cpu", compute_type="int8")
    segs, _ = m.transcribe(librosa.load(path, sr=16000, mono=True)[0], word_timestamps=True, vad_filter=True, initial_prompt=words or None)
    out_w, out_p = [], []
    for n, s in enumerate(segs):
        ws = [w for w in (s.words or []) if w.word.strip()]
        if not ws: continue
        pid = f"p{n + 1}"
        for w in ws:
            out_w.append({"word": w.word.strip(), "t": round(w.start, 3), "end": round(w.end, 3), "frame": int(round(w.start * FPS)), "at": round(w.start * FPS, 2),
                          "voice": "lead", "phrase": pid, "confidence": "low", "by": "whisper"})
        out_p.append({"id": pid, "voice": "lead", "text": " ".join(w.word.strip() for w in ws), "start": round(ws[0].start, 3), "end": round(ws[-1].end, 3),
                      "startFrame": int(round(ws[0].start * FPS)), "endFrame": int(round(ws[-1].end * FPS)), "words": [w.word.strip() for w in ws]})
    return {"fps": FPS, "source": f"analysis/song.py --lyrics: faster-whisper {model} on {os.path.basename(path)}; a first draft, every time unverified",
            "note": "`frame` is the song frame a word starts on (round(t * fps)); `at` the same before rounding. Correct the words and times by ear before hanging pictures on them.",
            "phrases": out_p, "words": out_w}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("audio"); ap.add_argument("--out", required=True); ap.add_argument("--stems"); ap.add_argument("--lyrics", nargs="?", const="small"); ap.add_argument("--words")
    a = ap.parse_args()
    if not os.path.isfile(a.audio): die(f"no such file: {a.audio}")
    if not a.audio.lower().endswith(AUDIO_EXT): die(f"{a.audio}: expected an audio file ({', '.join(AUDIO_EXT)})")
    if a.stems and not os.path.isdir(a.stems): die(f"--stems {a.stems}: no such folder")
    os.makedirs(a.out, exist_ok=True)
    dst = os.path.join(a.out, "audio" + os.path.splitext(a.audio)[1].lower())
    for old in os.listdir(a.out):      # one song to a folder: a different format from last time must not leave two
        if os.path.splitext(old)[0] == "audio" and os.path.join(a.out, old) != dst: os.remove(os.path.join(a.out, old))
    if os.path.abspath(a.audio) != os.path.abspath(dst): shutil.copyfile(a.audio, dst)

    y = load(a.audio); dur = len(y) / SR
    L, margin = listen(y, dur)
    S = np.abs(librosa.stft(y, n_fft=NFFT, hop_length=HOP)); H, P = librosa.decompose.hpss(S); freqs = librosa.fft_frequencies(sr=SR, n_fft=NFFT)
    stems, real, vocal = {}, [], None
    if a.stems:
        files = sorted(f for f in os.listdir(a.stems) if f.lower().endswith(AUDIO_EXT))
        if not files: die(f"--stems {a.stems}: no audio files in it")
        for f in files:
            name = re.sub(r"[^a-z0-9]+", "_", re.sub(r"^\d+[ _.-]*", "", os.path.splitext(f)[0]).lower()).strip("_"); name = ALIASES.get(name, name)
            stems[name] = stem_of_file(os.path.join(a.stems, f), dur); real.append(name)
            if name == "drums":
                yk, srk = librosa.load(os.path.join(a.stems, f), sr=None, mono=True); stems["kick"] = kick_from(yk, srk)
            if name == "lead_vocals": vocal = os.path.join(a.stems, f)
    for name, (part, lo, hi) in STANDINS.items():
        if name not in stems: stems[name] = standin(H if part == "harm" else P, freqs, lo, hi, dur)
    if "kick" not in stems:
        # librosa.effects.hpss on the waveform: the percussive part, then the low end of it
        stems["kick"] = {**kick_from(librosa.effects.hpss(y)[1], SR), "estimated": True}
    L["source"] = f"analysis/song.py on {os.path.basename(a.audio)}"
    json.dump(L, open(os.path.join(a.out, "listen.json"), "w"), indent=1)
    json.dump({"fps": FPS, "source": "stems" if real else "mix", "stems": stems}, open(os.path.join(a.out, "stems.json"), "w"))

    kick = stems["kick"]["onsets"]
    print(f"{os.path.basename(a.audio)}: {dur:.1f} s, {L['tempo']:.1f} bpm ({24 * 60 / L['tempo']:.1f} frames a beat), {L['key']}, {len(L['beats'])} beats, first at {L['beats'][0]:.2f} s")
    print(f"sections start at {' '.join(f'{s:.1f}' for s in L['sections'])} s")
    print(f"bar line: the beat at {L['downbeat']:.2f} s starts a bar" + ("" if margin > 0.15 else "  (a weak guess: check it by ear, and set `downbeat` in listen.json if it is wrong)"))
    print(f"kick: {len(kick)} found" + (f", the first at {kick[0]:.2f} s" if kick else "") + ("" if "drums" in real else "  (estimated from the mix: no drum stem)"))
    mx = max(e["rms"] for e in L["energy"]) or 1
    for e in L["energy"]: print(f'{e["t"]:5.0f} s {"#" * int(40 * e["rms"] / mx):40s}')
    print("stems measured: " + (", ".join(real) if real else "none (all stand-ins from the mix)"))
    if real: print("stand-ins from the mix: " + (", ".join(n for n in stems if stems[n].get("estimated")) or "none"))
    if a.lyrics:
        ly = transcribe(vocal or a.audio, a.lyrics, a.words, dur)
        json.dump(ly, open(os.path.join(a.out, "lyrics.json"), "w"), indent=1, ensure_ascii=False)
        print(f"lyrics: {len(ly['words'])} words in {len(ly['phrases'])} phrases, unverified -> {os.path.join(a.out, 'lyrics.json')}")
    print(f"-> {a.out}/listen.json, stems.json, {os.path.basename(dst)}")


if __name__ == "__main__":
    main()
