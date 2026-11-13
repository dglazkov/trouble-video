"""The sung words of the song, one timeline: analysis/lyrics.json.   .venv/bin/python analysis/lyrics.py [--whisper]

THE WORDS (from the song's author): the whole lyric is two phrases, the spoken hook "You're in deep trouble, mister"
and the choir's "We're in deep trouble", which the choir sometimes sings only as far as "We're in deep..." and
repeats. There are no other words, so finding the words is alignment, not transcription.

METHOD
  1. Which phrase is where (PLAN below) was read from mel spectrograms of the two vocal stems with that vocabulary:
     the hook is speech (formant glides, the burst of "d", the frication of "tr" and of the "s" in "mister"); the
     choir's phrase is three notes, "we're" from silence, "in" a change of note and vowel about a beat later, "deep"
     the "d" and the bright "ee" two beats after "we're"; "trouble" is a burst of noise ("tr") in both stems after
     a long held "deep", and again eight beats later. faster-whisper (large-v3, prompted with the two phrases,
     one phrase to a window) hears the same words in the same order everywhere it hears anything; --whisper runs
     it again and prints it beside the plan. Its times are a quarter of a second early and are not used.
  2. When each word starts is MEASURED here, not taken from the plan: the plan gives a rough frame, and the word is
     put on the strongest change of spectrum within +-2.2 frames of it (novelty: the distance between the mean
     log-mel spectrum of the 50 ms after and the 50 ms before, in the stem or stems that sing it). A word that
     starts a phrase is put where the level first climbs 15% of the way from its lowest to its coming peak instead.
     The choir's "trouble" has two times: its vowel (`vowel`, measured as above: the crisp event) and, two or
     three frames before it, where the breath of its "tr" starts in the backing stem (the level above 5 kHz
     climbing a fifth of the way to its loudest), which is where the word starts and what `frame` says. A screen
     that says TROUBLE anywhere from the one to the other is with the voice (engine/marks.mjs takes either).
     The spoken "trouble" is on the burst of its "tr", loud and sudden. "mister" is on its "m" (its "s" is two
     frames later).
     The choir's "in" is a new note sung without a break, so it is put where the pitch (pYIN) first leaves the
     old note for another in each stem; where that and the change of spectrum are more than a frame and a half apart (the
     voices slide into it) it is marked low.
  3. Confidence is said, not assumed: "high" when the change stands clear of the others near it and, where lead and
     choir both sing, the two stems put it within a frame of each other; "low" when neither holds. A sung "in" is
     a legato change of note, so it is never better than a frame either way. `spread` is the frames between the
     two stems' answers.
Between about 42 s and 50.5 s the lead (then the choir) holds a vowel with no consonant in it: no word, listed under
`wordless`. The held "deep" and "trouble" are chopped by a gate in the lead stem (a stutter on one vowel): no new
words. `phrases` is all of it: outside them nobody sings (at 0:30-0:40 a BRASS figure plays the three notes of
"we're in deep" and the film's screens say so with it; that is the film's choice, not a sung phrase, and is not here).
"""
import json, sys, numpy as np, librosa, scipy.signal as ss

FPS, SR, HOP = 24, 22050, 64
STEMS = {"lead": "stems-wav/0 Lead Vocals.wav", "backing": "stems-wav/1 Backing Vocals.wav"}
HOOK, CHOIR = ["You're", "in", "deep", "trouble", "mister"], ["We're", "in", "deep"]
# (id, voice, text as sung, [(word, rough song frame)]); voice "lead" = the spoken hook, "choir" = lead and backing
def chorus(n, a, b, c, t1, t2):
    w = lambda *f: list(zip(CHOIR, f))
    return [(f"{n}a", "choir", "We're in deep...", w(*a)), (f"{n}b", "choir", "We're in deep...", w(*b)),
            (f"{n}c", "choir", "We're in deep trouble", w(*c) + [("trouble", t1)]), (f"{n}d", "choir", "Trouble", [("trouble", t2)])]
PLAN = [("hook1", "lead", "You're in deep trouble, mister", list(zip(HOOK, (0, 6.5, 14.8, 21.7, 35.7)))),
        *chorus("choir1", (180, 189.8, 202.9), (259.8, 269.8, 282.4), (339.7, 349.6, 362.4), 440.9, 520.2),
        *chorus("choir2", (1215, 1222.2, 1235.2), (1255, 1262.4, 1276.4), (1294.7, 1301.7, 1314.8), 1393.8, 1474.4),
        ("hook2", "lead", "You're in deep trouble, mister", list(zip(HOOK, (1518.3, 1524.6, 1534, 1541.8, 1557.5)))),
        *chorus("choir3", (1572.9, 1580.4, 1593.7), (1613.6, 1621.4, 1633), (1652.8, 1663, 1672.6), 1752.2, 1831.8),
        ("hook3", "lead", "You're in deep trouble, mister", list(zip(HOOK, (2669.7, 2676.8, 2687.6, 2696.6, 2713.2)))),
        *chorus("choir4", (2844.3, 2852.4, 2865.8), (2883.9, 2891.3, 2905.3), (2923.6, 2930.9, 2944.7), 3022.5, 3102.8)]
WORDLESS = [(42.1, 50.5, "a held vowel with no consonant in it: lead, the choir joining at about 45 s")]
WIN = 2.2            # frames either side of the plan that a word's start is looked for in


def features():
    out = {}
    for name, path in STEMS.items():
        y, _ = librosa.load(path, sr=SR, mono=True)
        mel = np.log1p(3000 * librosa.feature.melspectrogram(y=y, sr=SR, n_fft=512, hop_length=HOP, n_mels=64, fmax=10000))
        w, n = int(0.05 * SR / HOP), mel.shape[1]
        c = np.cumsum(np.pad(mel, ((0, 0), (1, 0))), axis=1); i = np.arange(w, n - w)
        nov = np.zeros(n); nov[w:n - w] = np.sqrt((((c[:, i + w] - c[:, i]) - (c[:, i] - c[:, i - w])) ** 2).sum(0)) / w
        rms = librosa.feature.rms(y=y, frame_length=512, hop_length=HOP)[0][:n]
        hiss = np.sqrt(np.expm1(mel[50:]).sum(0) / 3000)                        # the level above 5 kHz: the noise of "tr"
        out[name] = {"nov": nov, "rms": np.convolve(rms, np.ones(9) / 9, "same"), "hiss": np.convolve(hiss, np.ones(7) / 7, "same")}
    return out


F2I = lambda f: int(round(f / FPS * SR / HOP))
I2F = lambda i: i * HOP / SR * FPS


def peak(nov, rough, win=WIN):
    """the strongest novelty peak within `win` frames of `rough`: (frame, height, height of the runner-up)"""
    a, b = max(0, F2I(rough - win)), F2I(rough + win); seg = nov[a:b]
    pk, _ = ss.find_peaks(seg, distance=F2I(0.7))
    if not len(pk): return None
    order = sorted(pk, key=lambda i: -seg[i]); best = order[0]
    return I2F(a + best), float(seg[best]), float(seg[order[1]]) if len(order) > 1 else 0.0


def rise(rms, rough):
    """where the level first climbs 15% of the way from its lowest (within 4 frames before `rough`) to the peak of the next 0.4 s"""
    a, b = max(0, F2I(rough - 4)), F2I(rough + 1.5); a += int(np.argmin(rms[a:b])); low, top = rms[a], rms[a:F2I(rough + 10)].max()
    for i in range(a, F2I(rough + 4)):
        if rms[i] >= low + 0.15 * (top - low): return I2F(i)
    return None


def breath(hiss, vowel):
    """where the noise of the choir's "tr" starts: back from its loudest (within 6 frames before the vowel) to a fifth of the way up from the level before"""
    a, b = F2I(vowel - 6), F2I(vowel + 1); seg = hiss[a:b]; low = np.median(hiss[F2I(vowel - 10):F2I(vowel - 5)]); i = int(np.argmax(seg))
    while i > 0 and seg[i] > low + 0.2 * (seg.max() - low): i -= 1
    return I2F(a + i)


def note(path, rough):
    """the choir's "in" is a new note: the first frame with a pitch a semitone or more off the old note, after the last frame on the old one"""
    a = (rough - 7) / FPS - 0.2; hop = SR // 96
    y, _ = librosa.load(path, sr=SR, mono=True, offset=a, duration=15 / FPS + 0.4)
    f0, _, _ = librosa.pyin(y, fmin=100, fmax=900, sr=SR, frame_length=1024, hop_length=hop)
    m, t = librosa.hz_to_midi(f0), (np.arange(len(f0)) * hop / SR + a) * FPS
    old, new = np.nanmedian(m[(t > rough - 6) & (t < rough - 2)]), np.nanmedian(m[(t > rough + 2.5) & (t < rough + 6)])
    if np.isnan(new) or abs(new - old) < 1: return None
    on_old = np.where(((np.abs(m - old) < 0.6) & (t < rough + 3)) | (t < rough - 3))[0]      # no pitch before it: the note starts the voice again
    for i in range(on_old[-1] + 1, len(m)):
        if not np.isnan(m[i]) and (np.isnan(old) or abs(m[i] - old) >= 1): return float(t[i])
    return None


def measure(F):
    words, phrases = [], []
    for pid, voice, text, plan in PLAN:
        stems = ["lead"] if voice == "lead" else ["lead", "backing"]
        first = len(words)
        for k, (word, rough) in enumerate(plan):
            from_silence = k == 0 and word != "trouble" and pid != "hook2"     # hook2 starts over the chopped end of the choir's note
            got = {}
            for s in stems:
                p = peak(F[s]["nov"], rough, 1.2 if word == "mister" else WIN)
                if p: got[s] = p
            if from_silence:
                r = [x for x in (rise(F[s]["rms"], rough) for s in stems) if x is not None]
                # the choir comes in together; the earlier stem is the start of the word
                at, spread = min(r), (max(r) - min(r) if len(r) > 1 else None); clear = True; how = "level"
            elif word == "in" and voice == "choir":
                r = [x for x in (note(STEMS[s], rough) for s in stems) if x is not None]
                if not r: raise SystemExit(f"lyrics: no change of note found for the \"in\" near frame {rough}")
                nv = sum(f * h for f, h, _ in got.values()) / sum(h for _, h, _ in got.values())      # the change of spectrum, to check it by
                at, spread = float(np.mean(r)), (max(r) - min(r) if len(r) > 1 else None)
                if spread is not None and spread > 1.5: at = r[-1]                 # the stems disagree: the choir carries the note
                clear = abs(nv - at) <= 1.5; how = "pitch"
            else:
                tot = sum(h for _, h, _ in got.values())
                at = sum(f * h for f, h, _ in got.values()) / tot
                fr = [f for f, _, _ in got.values()]; spread = max(fr) - min(fr) if len(fr) > 1 else None
                clear = all(h >= 1.4 * o for _, h, o in got.values()); how = "novelty"
            agree = spread is None or spread <= 1.0
            if spread is not None and spread > 1.0 and how == "novelty":      # the stems disagree: trust the clearer one
                s = max(got, key=lambda s: got[s][1] / (got[s][2] + 1e-9)); at = got[s][0]
            conf = "high" if clear and agree else "low" if not clear and not agree else "medium"
            if how == "pitch" and conf == "high": conf = "medium"
            extra = {}
            if word == "trouble" and voice == "choir":      # the word starts with the breath of its "tr"; its vowel is where it was measured
                extra = {"vowel": round(at, 2)}; at = min(at, breath(F["backing"]["hiss"], at))
            words.append({"word": word, "t": round(at / FPS, 3), "frame": int(round(at)), "at": round(at, 2), **extra, "voice": voice,
                          "stems": stems, "phrase": pid, "confidence": conf, "by": how,
                          **({"spread": round(spread, 2)} if spread is not None else {})})
        # the phrase ends when the level in its stems falls under 10% of its peak (or the next phrase starts)
        i0 = F2I(words[first]["at"]); phrases.append({"id": pid, "voice": voice, "text": text, "first": first, "i0": i0, "stems": stems})
    for n, p in enumerate(phrases):
        nxt = phrases[n + 1]["i0"] if n + 1 < len(phrases) else len(F["lead"]["rms"])
        last = F2I(words[(phrases[n + 1]["first"] if n + 1 < len(phrases) else len(words)) - 1]["at"])
        lvl = sum(F[s]["rms"] for s in p["stems"]); top = lvl[p["i0"]:nxt].max(); end = nxt
        for i in range(last + F2I(2), nxt):
            if lvl[i:i + F2I(3)].max() < 0.1 * top: end = i; break
        p["start"] = round(I2F(p["i0"]) / FPS, 3); p["end"] = round(I2F(end) / FPS, 3)
        p["startFrame"], p["endFrame"] = int(round(I2F(p["i0"]))), int(round(I2F(end)))
        p["words"] = [w["word"] for w in words if w["phrase"] == p["id"]]
        del p["i0"], p["first"], p["stems"]
    for n, w in enumerate(words):                                            # a word lasts until the next, or its phrase's end
        p = next(p for p in phrases if p["id"] == w["phrase"])
        w["end"] = words[n + 1]["t"] if n + 1 < len(words) and words[n + 1]["phrase"] == w["phrase"] else p["end"]
    return words, phrases


def whisper(words):
    from faster_whisper import WhisperModel
    m = WhisperModel("large-v3", device="cpu", compute_type="int8", cpu_threads=12)
    for name, path in STEMS.items():
        y, _ = librosa.load(path, sr=16000, mono=True)
        for pid, voice, text, plan in PLAN:
            if voice == "lead" and name == "backing": continue
            a, b = plan[0][1] / FPS - 0.6, plan[-1][1] / FPS + 2.0; a = max(0, a)
            segs, _ = m.transcribe(y[int(a * 16000):int(b * 16000)], word_timestamps=True, language="en", condition_on_previous_text=False,
                                   initial_prompt="You're in deep trouble, mister. We're in deep, we're in deep, we're in deep trouble. Trouble.")
            heard = " ".join(f"{w.word.strip()}@{(a + w.start) * FPS:.0f}({w.probability:.2f})" for s in segs for w in s.words)
            print(f"{pid:8s} {name:8s} plan: {' '.join(f'{w}@{f:.0f}' for w, f in plan)}\n{'':17s} hears: {heard}")


if __name__ == "__main__":
    F = features(); words, phrases = measure(F)
    out = {"fps": FPS, "source": "analysis/lyrics.py; see its header for the method",
           "vocabulary": ["You're in deep trouble, mister", "We're in deep trouble"],
           "note": "`frame` is the song frame a word starts on (round(t * fps)); `at` the same before rounding; `vowel` (the choir's trouble only) the frame its vowel lands on, after the breath of its tr. A sung word's start is good to about a frame; `confidence` says where it is worse, and is about the TIME only: which word it is is not in doubt anywhere.",
           "phrases": phrases, "words": words,
           "wordless": [{"start": a, "end": b, "note": n} for a, b, n in WORDLESS]}
    json.dump(out, open("analysis/lyrics.json", "w"), indent=1, ensure_ascii=False)
    for p in phrases:
        print(f"{p['start']:7.2f}-{p['end']:7.2f} s  {p['id']:8s} {p['voice']:5s}  " + "  ".join(f"{w['word']}@{w['frame']}{'' if w['confidence'] == 'high' else '?' if w['confidence'] == 'medium' else '??'}" for w in words if w["phrase"] == p["id"]))
    print(f"{len(words)} words in {len(phrases)} phrases -> analysis/lyrics.json   (? medium, ?? low confidence)")
    if "--whisper" in sys.argv: whisper(words)
