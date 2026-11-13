#!/usr/bin/env python
"""The making-of's music: "Trouble" rebuilt from its own stems so that it starts with the voice alone and fills in.

    .venv/bin/python stories/makingof/arrange.py            # render, write everything, verify
    .venv/bin/python stories/makingof/arrange.py --dry      # the timeline only: no stems needed, nothing written

It needs the song's eleven stems in stems-wav/ (they are not in the repository: see LICENSE-SONG.md) and the mix,
audio.wav. It writes, beside itself:

    audio.wav          the arrangement, 48 kHz stereo 16 bit (committed: a fork has no stems to rebuild it from)
    arrangement.json   the edit as data: every clip (where it sits, what it is cut from, which stems at what gain,
                       its fades and level changes), every join, the bar grid
    listen.json  stems.json  lyrics.json   the song folder the engine reads for `song: "stories/makingof"`: beats,
                       bars, sections (the chapters), the kick, per-stem loudness and onsets, the sung words
    chapters.json      each chapter's bars and kicks, and the cue points the picture is cut to

Nothing here listens to the result to find out where things are. Nothing is stretched or shifted in pitch, so every
measurement of the original (analysis/stems.json, analysis/lyrics.json) is carried through the edit list exactly:
a kick at s seconds of the song, inside a clip that plays source time s0 at output time o0, is at o0 + (s - s0).
The last step checks that claim against the rendered sound (see verify()).

How the edit is made
- The song is at a constant 145 BPM. The beat and its phase are fitted to the measured kicks (grid()); bar 31 of
  that grid is the first drop's first kick. Its chords go round every eight bars (D#m, D#m/C#, B, B, F#, F#, C#,
  C#), so any phrase can follow any other at a phrase boundary and the harmony carries on.
- Every edit is on a bar line of that grid, PRE (42 ms) before it: a kick's attack starts about 36 ms before the
  point analysis/kicks.py calls its onset, and the mix dips just ahead of it. Cutting in the dip keeps every
  transient whole. What is not on a bar line is a pickup, as in the song: a voice or the brass coming in before
  the line it leads to, or a tail left to ring after one. The silence after the cold open is 21 ms longer than
  two bars (HOLD), which puts the drop's first kick on a film frame.
- Passages with the whole band are the mix itself (audio.wav), never the stems added up: the stems are not exact
  parts of the mix (their sum is up to 7 dB louder and 0.8-0.97 correlated with it). Stems are used alone or in
  small groups where the arrangement is thin, and as short overlays: a pickup before a bar line, a tail after one.
- Joins between different material are equal-power crossfades (8 ms where it is loud, 30 ms between sustained
  parts); joins inside the same recording are linear. Level changes are slow ramps in dB. The only filter is a
  300 Hz high-pass on the percussion stem in chapter 3; the limiter on the master never has to act.
- out/makingof/music/notes.md (not committed) says what each join is, how it was checked, and what to listen for.
"""
import json, os, sys
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.normpath(os.path.join(HERE, "..", ".."))
STEMS_DIR = os.path.join(ROOT, "stems-wav"); MIX = os.path.join(ROOT, "audio.wav")
SR, FPS = 48000, 24
PRE = 0.042                       # seconds an edit sits ahead of its bar line
FILES = {"lead_vocals": "0 Lead Vocals", "backing_vocals": "1 Backing Vocals", "drums": "2 Drums", "bass": "3 Bass", "guitar": "4 Guitar",
         "keyboard": "5 Keyboard", "percussion": "6 Percussion", "strings": "7 Strings", "synth": "8 Synth", "other": "9 Other", "brass": "10 Brass"}
UNDER = -2.0                      # dB: the mix under on-screen text; 0 where the picture is the finished film
VOX = -5.5                        # dB: lead + backing vocal stems added together, to sit where the choir sits in the mix
                                  # (least squares against the mix where it is the choir alone, 50.72-51.40 s: -5.8 dB, r = 0.89)
CEILING = 10 ** (-1 / 20)         # the master limiter's ceiling, -1 dBFS


def die(msg): sys.exit("arrange.py: " + msg)
def db(x): return 10 ** (x / 20)
def rms_db(x): return float(20 * np.log10(np.sqrt(np.mean(np.square(x))) + 1e-12))
def load_json(*p): return json.load(open(os.path.join(ROOT, *p)))


# ---------------------------------------------------------------------------------------------- the song's grid
def grid():
    """(beat seconds, time of bar 0's line): a least-squares line through the measured kicks that sit on a beat."""
    k = np.array(load_json("analysis", "stems.json")["stems"]["kick"]["onsets"]); first = 51.5505
    if first not in k: die("analysis/stems.json is not the demo song's: its first drop kick (51.5505 s) is missing")
    i = np.round((k - first) / 0.41375); on = np.abs((k - first) / 0.41375 - i) < 0.1
    beat, c = np.linalg.lstsq(np.vstack([i[on], np.ones(on.sum())]).T, k[on], rcond=None)[0]
    return float(beat), float(c - 31 * 4 * beat)

BEAT, BAR0 = grid(); BAR = 4 * BEAT; HOLD = 0
def src(b): return int(round((BAR0 + b * BAR - PRE) * SR))           # sample of the song where the edit for bar b's line is
def out(j): return int(round(j * BAR * SR)) + (HOLD if j >= 8 else 0)   # sample of the arrangement where its bar j is cut
def S(t): return int(round(t * SR))
# The one place the arrangement is not a whole number of bars: the silence after the cold open (bars 7 and 8, before the
# voice) is held HOLD samples longer than two bars, so that the first kick of the drop at bar 78, the cut the picture
# most needs, is on a frame of the 24 fps film and not half way between two. Nothing sounds during it.
DROP_KICK = 51.5505
HOLD = int(round((-((out(78) + (S(DROP_KICK) - src(31))) / SR * FPS) % 1) / FPS * SR))


# ---------------------------------------------------------------------------------------------- the arrangement
CHAPTERS = [  # name, first bar of the arrangement, what the picture is
    ("Cold open", 0, "the finished film at its first drop"),
    ("The prompt", 7, "a black terminal; the first message is typed"),
    ("The tools", 18, "a bake-off of two renderers; ugly first characters"),
    ("The first face", 34, "one drawing that changes the plan"),
    ("The pivot", 42, "the assembled puppet is rejected; then whole drawings"),
    ("The cast", 56, "four characters designed; the story decided"),
    ("Wow", 77, "going to sleep; a clock; the finished slice plays"),
    ("Building the rest", 95, "a map of the film filling in, four jobs at once"),
    ("The human eye", 115, "the owner's screenshots, each fault then its fix"),
    ("Who did what", 131, "a ledger and numbers"),
    ("Fork it", 139, "the repo address, credits"),
]
SONG_END = S(164.70)              # audio.wav is 164.8 s; it is silent (-72 dB) from 164.6 s and its last few samples click
LENGTH = 250.0                    # the arrangement is padded with silence to this: 6000 frames
EP, LIN, COS = "equal_power", "linear", "cosine"
CLIPS, JOINS = [], []


def clip(id, chapter, sources, src0, out0, n, fin=(0, LIN), fout=(0, LIN), auto=None, note=""):
    """One piece of sound: `n` samples of the song from sample `src0`, laid at sample `out0`. Fades are inside it."""
    sources = {k: (v if isinstance(v, dict) else {"db": v}) for k, v in sources.items()}
    if out0 < 0: src0 -= out0; n += out0; out0 = 0
    CLIPS.append({"id": id, "chapter": chapter, "sources": sources, "src0": src0, "out0": out0, "n": n,
                  "fin": (S(fin[0] / 1000), fin[1]), "fout": (S(fout[0] / 1000), fout[1]), "auto": auto or [], "note": note})


def bed(id, chapter, sources, j, bars, b, xin=(8, EP), xout=(8, EP), auto=None, note="", lead=0.0, tail=0.0):
    """Bars b.. of the song at bar j of the arrangement. Its fades are centred on its two bar-line edits, so two
    beds that meet crossfade there. `lead`/`tail` (seconds) start it earlier or let it run on, inside its fades."""
    a = S(xin[0] / 2000) if not lead else S(lead); z = S(xout[0] / 2000) if not tail else S(tail)
    fin = xin if not lead else (lead * 1000, xin[1]); fout = xout if not tail else (tail * 1000, xout[1])
    clip(id, chapter, sources, src(b) - a, out(j) - a, out(j + bars) - out(j) + a + z, fin, fout, auto, note)


def join(j, kind, what):
    JOINS.append({"bar": j, "kind": kind, "what": what})


def build():
    mixu = [(0, UNDER)]
    # 1 Cold open: the film's mix from the first kick of the first drop, seven bars, cut dead on the eighth bar line:
    #   the bar where the song itself stops for the spoken hook. (Six bars would end 140 ms into the choir's "trouble".)
    bed("cold_open", 1, {"mix": 0}, 0, 7, 31, xin=(2, LIN), xout=(6, LIN), note="the mix, bars 31-37 of the song")
    join(0, "start", "the mix starts 42 ms ahead of the first drop's kick, in the dip before its attack (2 ms fade)")
    join(7, "hard cut", "the mix stops on the bar line where the song's own drums stop for the hook; 6 ms fade ending before the next kick's attack")
    # 2 The prompt: a bar and most of another of silence, then the voice alone. "You're" is a pickup: it starts 0.2 s
    #   before bar 0's line, so "in" lands on the arrangement's bar 9. The strings come in under "mister", as in the song.
    clip("voice_hook", 2, {"lead_vocals": 1.0}, 0, out(9) - src(0), S(3.6), (3, LIN), (400, COS),
         note="lead vocal stem alone from 0:00, +1 dB to the level it has in the mix: \"You're in deep trouble, mister\"")
    join(9, "entry", "the lead vocal stem alone; its pickup \"You're\" starts 0.18 s before the bar line")
    bed("strings_A", 2, {"strings": 0}, 10, 8, 1, xin=(10, LIN), xout=(30, EP), note="strings stem alone, bars 1-8")
    join(10, "entry", "the strings stem enters where it does in the song, under the end of \"mister\"")
    # 3 The tools: strings and keyboard of the phrase after the first drop, then of the build with the shakers of the
    #   percussion stem (its low booms filtered off: no bass or drums yet).
    bed("tools_G", 3, {"strings": 0}, 18, 8, 48, xin=(30, EP), xout=(30, EP), note="strings stem, bars 48-55")
    late = S(0.016)       # the keyboard stem has a three-sample tick 13 ms after this edit (bleed of a drum hit's attack): it comes in after it, before its first note
    clip("tools_G_keys", 3, {"keyboard": 3}, src(48) + late, out(18) + late, out(26) - out(18) - late + S(0.015), (20, LIN), (30, EP), note="keyboard stem (+3 dB), bars 48-55")
    join(18, "crossfade 30 ms", "strings (bar 8, C#) to strings + keyboard (bar 48, D#m): a phrase boundary in both")
    bed("tools_D", 3, {"strings": -4, "keyboard": -1, "percussion": {"db": -1, "highpass_hz": 300}}, 26, 8, 23, xin=(30, EP), xout=(30, EP),
        note="strings (-4 dB) + keyboard (-1 dB) + percussion (-1 dB) high-passed at 300 Hz, bars 23-30: all are louder in the build, held here to the level of the eight bars before")
    join(26, "crossfade 30 ms", "bar 55 to bar 23, phrase boundary; the percussion stem joins, high-passed at 300 Hz")
    # 4 The first face: the bass joins, on the bar where it has the song to itself (bar 15), with the synth under it.
    bed("face_C", 4, {"bass": 1, "synth": -2, "strings": -1, "keyboard": 2, "percussion": 1}, 34, 8, 15, xin=(30, EP), xout=(30, EP),
        note="bass (+1 dB) + synth (-2 dB) + strings (-1 dB) + keyboard (+2 dB) + percussion (+1 dB), bars 15-22: about 1.5 dB over the chapter before")
    join(34, "crossfade 30 ms", "bar 30 (thinned out, as before the drop) to bar 15: the bass stem enters with its riff")
    # 5 The pivot: the brass fanfare (the mix: nobody sings there), its two-beat pickup taken from the brass stem.
    clip("brass_pickup", 5, {"brass": UNDER}, S(78.79), out(42) - (src(48) - S(78.79)), src(48) - S(78.79) + S(0.015), (15, LIN), (30, EP),
         note="brass stem: the fanfare's pickup (D#-F-F#), two beats before the bar line")
    bed("fanfare", 5, {"mix": 0}, 42, 4, 48, xin=(30, EP), xout=(20, EP), auto=mixu, note="the mix under text (-2 dB), bars 48-51")
    join(42, "crossfade 30 ms", "stems of bar 22 to the mix at bar 48; the brass stem's pickup hands over to the brass in the mix")
    # the hole: the breakdown's slow hook, alone but for its own strings far down; its held D#5 rings on over the restart
    join(46, "cut to near silence", "the mix stops (20 ms); the lead vocal stem from bar 67 and that bar's strings at -8 dB carry on (B, the fanfare's last chord)")
    clip("hole_hook", 5, {"lead_vocals": 1.0}, src(67), out(46), S(117.9) - src(67), (10, LIN), (350, COS),
         note="lead vocal stem from bar 67, +1 dB: the breakdown's \"You're in deep trouble, mister\" and its held D#5, 6.5 s")
    clip("hole_strings", 5, {"strings": -8}, src(67) - S(0.01), out(46) - S(0.01), out(48) - out(46) + S(0.01), (40, LIN), (500, COS),
         note="strings stem of bars 67-68 at -8 dB: the held chord under the quote")
    # the restart: the song from its top (bar 1), the first hook's last syllable cancelled out of the mix with the lead stem
    lead = src(1) - S(1.45); tie = S(0.004)
    clip("restart", 5, {"mix": 0, "lead_vocals": {"db": 0.95, "polarity": -1}}, S(1.45), out(48) - lead, lead + src(3) - src(1) + tie, (300, COS), (8, LIN), mixu,
         note="the mix from 1.45 s (the swell into bar 1) with the lead vocal stem subtracted: the end of the opening \"mister\" is 11 dB down")
    join(48, "restart", "the mix swells in over 0.3 s under the held note; bar 1's hit lands 0.135 s after the bar line, as in the song")
    # 6 The cast: the song carries on untouched through its build. Up from -2 dB to full over the last four bars.
    ramp = [(0, UNDER), (out(73), UNDER), (out(77), 0)]
    clip("song_3_30", 5, {"mix": 0}, src(3) - tie, out(50) - tie, out(77) - out(50) + tie + S(0.40), (8, LIN), (400, COS), ramp,
         note="the mix, bars 3-29 (same recording as the clip before it), ringing 0.4 s into the bar of held breath")
    join(50, "same recording", "the lead vocal subtraction ends where the stem is silent (-70 dB)")
    # 7 "Wow": a bar of held breath. The build rings out, then the choir's pickup "We're in deep" alone (the first 0.13 s
    #   from the vocal stems, because the mix still has the end of a drum fill there; then the mix, which is only voices).
    join(77, "held breath", "the mix fades over 0.4 s; silence; the choir's pickup (vocal stems, then the mix from 50.70 s) is alone before the drop")
    a = S(50.56); x = S(50.70)
    clip("breath_pickup", 7, {"lead_vocals": VOX, "backing_vocals": VOX}, a, out(78) - (src(31) - a), x - a + S(0.015), (15, LIN), (30, LIN),
         note="lead + backing vocal stems: the first 0.13 s of \"We're\", under which the mix has a drum fill")
    # the drop, full: bars 31-47, the whole first drop including the spoken hook in its kick gap
    clip("drop", 7, {"mix": 0}, x - S(0.015), out(78) - (src(31) - x) - S(0.015), src(31) - x + S(0.015) + out(95) - out(78) + S(0.004), (30, LIN), (8, EP),
         note="the mix at full level from 50.70 s (the pickup) through bars 31-47")
    join(78, "the drop", "no edit: the mix has been running since the pickup")
    # 8 Building the rest: four bars of the song's own run-up to its loud instrumental, then that twice. Down to -2 dB
    #   over the first two bars. The brass that enters in bar 47 lands on its F# and dies away (brass stem, 0.8 s).
    down = [(0, 0), (out(95), 0), (out(97), UNDER)]
    bed("runup_H1", 8, {"mix": 0}, 95, 12, 52, xin=(8, EP), xout=(8, EP), auto=down, note="the mix, bars 52-63: the run-up, then the loud instrumental")
    clip("brass_tail", 8, {"brass": 0}, src(48) - S(0.004), out(95) - S(0.004), S(0.80), (8, EP), (450, COS), down,
         note="brass stem: the note the pickup in bar 47 was heading for, 0.8 s, fading")
    join(95, "crossfade 8 ms", "bar 47 (C#) to bar 52 (F#) of the mix; the brass stem finishes its phrase over the top")
    bed("H2", 8, {"mix": 0}, 107, 8, 56, auto=mixu, note="the mix, bars 56-63 again")
    join(107, "crossfade 8 ms", "the loud instrumental loops: bar 63 (its fill) back to bar 56")
    # 9 The human eye: the final drop's choir phrase, a kick on every beat for fifteen bars. The song's eighth bar there
    #   has no kick on its beats, so the first time round it is replaced by bar 62 (C#, four kicks); the second time the
    #   song runs on untouched to its end. The choir's pickup "We're in" comes from the vocal stems, before each pass.
    pk = S(118.40)
    def pickup(id, j): clip(id, 9, {"lead_vocals": VOX, "backing_vocals": VOX}, pk, out(j) - (src(72) - pk), src(72) - pk + S(0.004), (40, LIN), (8, LIN), mixu,
                            note="lead + backing vocal stems: \"We're in\", the pickup into the final drop")
    pickup("pickup_1", 115)
    bed("J1", 9, {"mix": 0}, 115, 7, 72, auto=mixu, note="the mix, bars 72-78: the final drop")
    join(115, "crossfade 8 ms", "bar 63 to bar 72; the vocal stems sing the pickup over bar 63's fill")
    bed("J1_bar8", 9, {"mix": 0}, 122, 1, 62, auto=mixu, note="the mix, bar 62: four kicks where the song has a gap")
    clip("vocal_tail", 9, {"lead_vocals": VOX, "backing_vocals": VOX}, src(79) - S(0.004), out(122) - S(0.004), S(1.10), (8, EP), (700, COS), mixu,
         note="lead + backing vocal stems: the held \"trouble\" dies away instead of being cut")
    join(122, "crossfade 8 ms", "bar 78 to bar 62 (both C#); the held \"trouble\" carries on in the vocal stems and fades")
    pickup("pickup_2", 123)
    # 9 (second pass), 10 Who did what, 11 Fork it: the song from bar 72 to its end, untouched
    a = S(0.004)
    clip("J2_to_end", 9, {"mix": 0}, src(72) - a, out(123) - a, SONG_END - src(72) + a, (8, EP), (60, COS), mixu,
         note="the mix from bar 72 to the end of the song: final drop, brass, last kick, outro (its last 0.1 s, where it is already silent but for a click, left off)")
    join(123, "crossfade 8 ms", "bar 62 to bar 72, with the pickup again")
    end = out(123) + SONG_END - src(72)
    if end > S(LENGTH): die(f"the arrangement is {end / SR:.2f} s, longer than LENGTH")
    return S(LENGTH)


# ---------------------------------------------------------------------------------------------- envelopes of a clip
def shape(n, kind, up):
    x = (np.arange(n) + 0.5) / max(1, n)
    y = np.sin(np.pi / 2 * x) if kind == EP else 0.5 - 0.5 * np.cos(np.pi * x) if kind == COS else x
    return y if up else y[::-1]


def fade_of(c):
    f = np.ones(c["n"]); a, ka = c["fin"]; z, kz = c["fout"]
    if a: f[:a] *= shape(a, ka, True)
    if z: f[-z:] *= shape(z, kz, False)
    return f


def auto_of(c, at=None):
    """The clip's level automation (dB, straight lines between points given in arrangement samples) as a gain."""
    n = np.arange(c["out0"], c["out0"] + c["n"]) if at is None else np.asarray(at)
    if not c["auto"]: return np.ones(len(n))
    p = np.array(c["auto"], float); return db(np.interp(n, p[:, 0], p[:, 1]))


def stem_weights(c):
    """How loud each measured stem is in this clip (a gain; 0 = not there). The mix carries all of them."""
    w = {k: 0.0 for k in list(FILES) + ["kick"]}
    for name, s in c["sources"].items():
        g = db(s["db"]) * s.get("polarity", 1)
        for k in (w if name == "mix" else [name]): w[k] += g
    w["kick"] = w["drums"]
    return {k: max(0.0, v) for k, v in w.items()}


# ---------------------------------------------------------------------------------------------- rendering
def render(total):
    import soundfile as sf, scipy.signal as ss
    missing = [f + ".wav" for f in FILES.values() if not os.path.exists(os.path.join(STEMS_DIR, f + ".wav"))]
    if missing: die(f"the song's stems are not here: {len(missing)} of 11 missing from stems-wav/ ({', '.join(missing[:3])}...).\n"
                    "They are not in the repository (LICENSE-SONG.md). stories/makingof/audio.wav is the rendered arrangement; "
                    "arrangement.json says how it was cut. `--dry` prints the timeline without them.")
    cache = {}
    def get(name, hp=None):
        if (name, hp) not in cache:
            y, sr = sf.read(MIX if name == "mix" else os.path.join(STEMS_DIR, FILES[name] + ".wav"), dtype="float64")
            if sr != SR or y.ndim != 2: die(f"{name}: expected 48 kHz stereo")
            if hp: y = ss.sosfiltfilt(ss.butter(2, hp, "high", fs=SR, output="sos"), y, axis=0)
            cache[(name, hp)] = y
        return cache[(name, hp)]
    y = np.zeros((total, 2))
    for c in CLIPS:
        seg = np.zeros((c["n"], 2))
        for name, s in c["sources"].items():
            x = get(name, s.get("highpass_hz"))[c["src0"]:c["src0"] + c["n"]]
            if len(x) < c["n"]: die(f"{c['id']}: runs off the end of {name}")
            seg += x * (db(s["db"]) * s.get("polarity", 1))
        y[c["out0"]:c["out0"] + c["n"]] += seg * (fade_of(c) * auto_of(c))[:, None]
    return y, limit(y), get


def limit(y):
    """The master limiter: 5 ms look-ahead, 80 ms release, ceiling -1 dBFS. Returns how far it pulled down (dB), in
    place. This arrangement never reaches it (the mix peaks at -5 dBFS and the overlays are small): it is a guard."""
    from scipy.ndimage import minimum_filter1d
    peak = np.abs(y).max(axis=1)
    if peak.max() <= CEILING: return 0.0
    g = np.minimum(1.0, CEILING / np.maximum(peak, 1e-9)); look = S(0.005)
    g = minimum_filter1d(g, 2 * look + 1)
    r = np.exp(-1 / (0.080 * SR)); o = np.empty_like(g); v = 1.0
    for i, x in enumerate(g): v = x if x < v else 1 - (1 - v) * r if 1 - (1 - v) * r < x else x; o[i] = v
    o = np.minimum(np.convolve(o, np.ones(look) / look, "same"), g)
    y *= o[:, None]; return float(-20 * np.log10(o.min()))


def write_wav(y):
    import soundfile as sf
    rng = np.random.default_rng(1); q = 1 / 32768
    d = (rng.random(y.shape) - rng.random(y.shape)) * q                 # triangular dither, one step wide
    d[np.abs(y).max(axis=1) == 0] = 0                                   # silence stays silence
    sf.write(os.path.join(HERE, "audio.wav"), np.clip(y + d, -1, 1 - q), SR, subtype="PCM_16")


# ---------------------------------------------------------------------------------------------- carrying measurements through
def to_out(c, s): return (c["out0"] + (s * SR - c["src0"])) / SR          # song seconds -> arrangement seconds, in clip c
def heard(c, s, least=0.5):
    """Is song time `s` inside clip c, at least `least` of the way up its fades?"""
    i = int(round(s * SR)) - c["src0"]
    if not 0 <= i < c["n"]: return False
    a, ka = c["fin"]; z, kz = c["fout"]; f = 1.0
    if a and i < a: f *= shape(a, ka, True)[i]
    if z and i >= c["n"] - z: f *= shape(z, kz, False)[i - (c["n"] - z)]
    return f >= least


def map_stems(total):
    """stems.json of the arrangement: each stem's 24 fps loudness and its onsets, carried through the clips."""
    src_stems = load_json("analysis", "stems.json")["stems"]; frames = int(np.ceil(total / SR * FPS)); res = {}
    weights = [stem_weights(c) for c in CLIPS]; fades = [fade_of(c) * auto_of(c) for c in CLIPS]
    for name, st in src_stems.items():
        env = np.zeros(frames); e0 = np.array(st["env"]); ons = []
        for c, w, f in zip(CLIPS, weights, fades):
            if not w[name]: continue
            fr = np.arange(int(np.ceil(c["out0"] / SR * FPS)), min(frames, int(np.ceil((c["out0"] + c["n"]) / SR * FPS))))
            at = np.round(fr / FPS * SR).astype(int) - c["out0"]; at = np.clip(at, 0, c["n"] - 1)
            env[fr] += w[name] * f[at] * np.interp((c["src0"] + at) / SR * FPS, np.arange(len(e0)), e0)
            ons += [float(np.floor(to_out(c, s) * 1e4 + 1e-6) / 1e4) for s in st["onsets"] if heard(c, s)]     # never later than it is: a kick on a frame's first instant is in that frame
        ons = sorted(set(ons)); ons = [o for i, o in enumerate(ons) if i == 0 or o - ons[i - 1] > 0.002]
        res[name] = {"peak": st["peak"], "env": [round(float(min(1.0, v)), 3) for v in env], "onsets": ons}
    return res


def map_kicks():
    """[(arrangement seconds, song seconds, clip id)] for every measured kick that is heard."""
    k = load_json("analysis", "stems.json")["stems"]["kick"]["onsets"]
    return sorted((to_out(c, s), s, c["id"]) for c in CLIPS if stem_weights(c)["kick"] for s in k if heard(c, s))


def map_lyrics():
    """lyrics.json of the arrangement. A word is there if its voice is in a clip at the word's start, or if the clip
    starts inside the word with more than half of it to go (`entersMidWord`). Phrases are numbered by occurrence."""
    L = load_json("analysis", "lyrics.json"); P = {p["id"]: p for p in L["phrases"]}; words = []
    for c in CLIPS:
        w = stem_weights(c); c0, c1 = c["src0"] / SR, (c["src0"] + c["n"]) / SR
        for x in L["words"]:
            if not (w["lead_vocals"] if x["voice"] == "lead" else w["lead_vocals"] + w["backing_vocals"]): continue
            inside = heard(c, x["t"]); late = not inside and x["t"] < c0 < x["end"] and (x["end"] - c0) > 0.5 * (x["end"] - x["t"]) and c1 > x["end"] - 0.01
            if not (inside or late): continue
            s = x["t"] if inside else c0; t = to_out(c, s); e = to_out(c, min(x["end"], c1))
            words.append({**{k: v for k, v in x.items() if k not in ("t", "frame", "at", "end", "vowel", "phrase")}, "word": x["word"], "t": round(t, 3), "frame": int(round(t * FPS)),
                          "at": round(t * FPS, 2), **({"vowel": round(to_out(c, x["vowel"] / FPS) * FPS, 2)} if "vowel" in x else {}), "end": round(e, 3),
                          "phrase": x["phrase"], "songT": x["t"], "clip": c["id"], **({"entersMidWord": True} if late else {})})
    words.sort(key=lambda x: x["t"]); keep = []
    for x in words:                                                      # the same word through two overlapping clips is one word
        if keep and keep[-1]["songT"] == x["songT"] and x["t"] <= keep[-1]["end"] + 0.01: keep[-1]["end"] = max(keep[-1]["end"], x["end"]); continue
        keep.append(x)
    phrases, count = [], {}
    for x in keep:
        p = phrases[-1] if phrases else None
        if not (p and p["source"] == x["phrase"] and x["songT"] > p["_last"] and x["t"] - p["end"] < 0.05):
            count[x["phrase"]] = count.get(x["phrase"], 0) + 1; o = P[x["phrase"]]
            p = {"id": f'{x["phrase"]}.{count[x["phrase"]]}', "source": x["phrase"], "voice": o["voice"], "text": o["text"], "start": x["t"], "words": []}; phrases.append(p)
        p["words"].append(x["word"]); p["_last"] = x["songT"]; p["end"] = x["end"]; x["phrase"] = p["id"]
    for p in phrases:
        o = P[p["source"]]; del p["_last"]
        if p["words"] != o["words"]: p["text"] = " ".join(p["words"]); p["partial"] = True
        p["startFrame"] = int(round(p["start"] * FPS)); p["endFrame"] = int(round(p["end"] * FPS))
    for x in keep: del x["clip"]
    wordless = []
    for wl in L.get("wordless", []):
        for c in CLIPS:
            if stem_weights(c)["lead_vocals"] and heard(c, wl["start"]):
                wordless.append({"start": round(to_out(c, wl["start"]), 3), "end": round(to_out(c, min(wl["end"], (c["src0"] + c["n"]) / SR)), 3), "note": wl["note"]})
    return {"fps": FPS, "source": "stories/makingof/arrange.py: analysis/lyrics.json carried through the edit (arrangement.json), not re-measured",
            "vocabulary": L["vocabulary"], "note": "`songT` is where the word is in the original song. " + L["note"], "phrases": phrases, "words": keep, "wordless": wordless}


# ---------------------------------------------------------------------------------------------- the files
def fr(t): return round(t * FPS, 2)
def line(j): return out(j) / SR + PRE                                    # the bar line itself: where a downbeat's kick is measured


def describe(total):
    def cl(c):
        o0, o1 = c["out0"] / SR, (c["out0"] + c["n"]) / SR
        return {"id": c["id"], "chapter": c["chapter"], "what": c["note"],
                "out": {"start": round(o0, 4), "end": round(o1, 4), "startFrame": fr(o0), "endFrame": fr(o1)},
                "source": {"start": round(c["src0"] / SR, 4), "end": round((c["src0"] + c["n"]) / SR, 4)},
                "samples": {"out": c["out0"], "source": c["src0"], "length": c["n"]},
                "stems": {k: {"gain_db": v["db"], **({"polarity": -1} if v.get("polarity") == -1 else {}), **({"highpass_hz": v["highpass_hz"]} if v.get("highpass_hz") else {})} for k, v in c["sources"].items()},
                "fadeIn": {"ms": round(c["fin"][0] / SR * 1000, 1), "shape": c["fin"][1]}, "fadeOut": {"ms": round(c["fout"][0] / SR * 1000, 1), "shape": c["fout"][1]},
                "level": [{"t": round(n / SR, 4), "db": d} for n, d in c["auto"]] or [{"t": round(o0, 4), "db": 0}]}
    return {"what": "The making-of's music as an edit of the song \"Trouble\" (audio.wav and its stems). Written by stories/makingof/arrange.py; change that, not this.",
            "sampleRate": SR, "fps": FPS, "duration": round(total / SR, 4), "frames": int(np.ceil(total / SR * FPS)),
            "grid": {"bpm": round(60 / BEAT, 4), "beat": BEAT, "bar": BAR, "songBar0": BAR0, "editLead": PRE, "silenceHeld": round(HOLD / SR, 5),
                     "note": "Song bar b's line is at songBar0 + b * bar (bar 31 = the first drop's first kick). Arrangement bar j's line is at j * bar + editLead, plus silenceHeld from bar 8 on (the silence before the voice is that much longer than two bars, "
                             "which puts the drop's first kick on a whole frame). "
                             "Edits are editLead before a bar line. A clip plays source time s at out.start + (s - source.start); fades are inside the clip's times. "
                             "`mix` is audio.wav; other stems are stems-wav/. Gains in dB; `level` is the clip's automation (straight lines in dB between points, held outside them)."},
            "chapters": [{"n": i + 1, "name": n, "bar": j, "start": round(0 if j == 0 else line(j), 4)} for i, (n, j, _) in enumerate(CHAPTERS)],
            "barLines": [round(line(j), 4) for j in range(int(total / SR / BAR) + 1) if line(j) < total / SR],
            "clips": [cl(c) for c in CLIPS],
            "joins": [{**j, "t": round(out(j["bar"]) / SR, 4), "frame": fr(out(j["bar"]) / SR)} for j in sorted(JOINS, key=lambda j: j["bar"])]}


def listen_json(total, y):
    dur = total / SR; beats = [round(line(j) + k * BEAT, 4) for j in range(int(dur / BAR) + 1) for k in range(4) if line(j) + k * BEAT < dur]
    energy = []
    if y is not None:
        import librosa
        m = librosa.resample(y.mean(axis=1), orig_sr=SR, target_sr=22050)
        r = librosa.feature.rms(y=m, hop_length=512)[0]; ce = librosa.feature.spectral_centroid(y=m, sr=22050, hop_length=512)[0]; t = librosa.frames_to_time(np.arange(len(r)), sr=22050, hop_length=512)
        energy = [{"t": float(a), "rms": float(r[(t >= a) & (t < a + 5)].mean()), "bright": float(ce[(t >= a) & (t < a + 5)].mean())} for a in np.arange(0, dur, 5.0)]
    return {"duration": round(dur, 4), "tempo": round(60 / BEAT, 4), "key": load_json("analysis", "listen.json")["key"], "beats": beats, "downbeat": beats[0],
            "sections": [round(0 if j == 0 else line(j), 4) for _, j, _ in CHAPTERS], "sectionNames": [n for n, _, _ in CHAPTERS], "energy": energy,
            "source": "stories/makingof/arrange.py. beats: the grid fitted to the original's measured kicks, carried through the edit (every bar of the arrangement is a bar of "
                      "that grid, the silent ones too; the last beat of bar 7, in silence, is " + str(round(HOLD / SR * 1000, 1)) + " ms long: see arrange.py HOLD), so every fourth beat is a bar line; not a beat tracker's estimate. sections: the chapters. energy: measured on the rendered audio."}


def chapters_json(total, kicks, lyr, stems, y):
    dur = total / SR; W = lyr["words"]; ends = [line(j) for _, j, _ in CHAPTERS[1:]] + [dur]; ch = []
    def words(a, b, voice=None): return [{"word": w["word"], "t": w["t"], "frame": w["frame"], **({"entersMidWord": True} if w.get("entersMidWord") else {})} for w in W if a <= w["t"] < b and (not voice or w["voice"] == voice)]
    for i, (name, j, picture) in enumerate(CHAPTERS):
        a = 0.0 if j == 0 else line(j); b = ends[i]; nb = (CHAPTERS[i + 1][1] if i + 1 < len(CHAPTERS) else None)
        ks = [o for o, _, _ in kicks if a - 0.02 <= o < b - 0.02]
        ch.append({"n": i + 1, "name": name, "picture": picture, "start": round(a, 4), "end": round(b, 4), "startFrame": int(round(a * FPS)), "endFrame": int(round(b * FPS)),
                   "firstBar": j, "bars": (nb - j) if nb else round((out(123) / SR + (SONG_END - src(72)) / SR - a) / BAR, 2), "barFrames": [fr(line(k)) for k in range(j, nb if nb else int(dur / BAR) + 1) if line(k) < out(123) / SR + (SONG_END - src(72)) / SR],
                   "kicks": len(ks), "kickFrames": [int(round(o * FPS)) for o in ks], "kickTimes": [round(o, 4) for o in ks]})
    k = {s: o for o, s, _ in kicks}; ko = [o for o, _, _ in kicks]
    def kick(s, after=0): return next(o for o, ss, _ in kicks if ss == s and o >= after - 0.02)
    cue = lambda t, **more: {"t": round(t, 4), "frame": int(round(t * FPS)), "frameExact": fr(t), **more}
    senv = np.array(stems["strings"]["env"]); f0 = int(line(139) * FPS); peak = f0 + int(np.argmax(senv[f0:]))
    last = None
    if y is not None:
        lv = np.abs(y).max(axis=1); last = {f"lastAudible{-d}dB": cue(np.flatnonzero(lv > db(d))[-1] / SR) for d in (-60, -50, -40)}
    cues = {
        "note": "Frames are 24 fps from the start of audio.wav; `frame` is the nearest whole frame, `frameExact` the time x 24. A kick's time is its onset as "
                "analysis/kicks.py measures it (half way up its attack); its attack starts about 36 ms earlier. Edits sit 42 ms before bar lines.",
        "coldOpen": {"firstKick": cue(ko[0]), "hardCut": cue(out(7) / SR, what="the mix stops here (silent 3 ms later); the bar line it would have hit is at " + str(round(line(7), 3)) + " s"),
                     "silentUntil": cue(out(9) / SR - src(0) / SR, what="the voice starts")},
        "prompt": {"words": words(line(7), line(18), "lead"), "voiceAloneUntil": cue(out(10) / SR, what="the strings stem starts to come in (it is audible from about 0.05 s later)"),
                   "stringsOnly": cue(to_out(next(c for c in CLIPS if c["id"] == "voice_hook"), 2.351), what="the last word has ended; strings alone from here")},
        "tools": {"keyboardJoins": cue(line(18)), "percussionJoins": cue(line(26))},
        "firstFace": {"bassJoins": cue(line(34))},
        "pivot": {"brassPickup": cue(out(42) / SR - (src(48) - S(78.82)) / SR, what="the fanfare's pickup, two beats before the bar line"), "fanfare": cue(line(42)),
                  "quoteSilence": {"first": cue(out(46) / SR + 0.012, what="the mix is gone; the voice and its strings at -8 dB only"), "last": cue(out(48) / SR - 0.30, what="the song starts to swell back in after this"),
                                   "seconds": round((out(48) - out(46)) / SR - 0.312, 3)},
                  "hookWords": words(line(46) - 0.1, line(48) + 0.1, "lead"), "heldNoteEnds": cue(to_out(next(c for c in CLIPS if c["id"] == "hole_hook"), 117.432)),
                  "restart": cue(line(48), what="bar line of the restart"), "restartHit": cue(kick(1.9884), what="the low hit that starts the song proper, 93 ms after the bar line (it is so in the song)")},
        "cast": {"choirWords": words(line(48), line(77)), "drumsEnter": cue(to_out(next(c for c in CLIPS if c["id"] == "song_3_30"), 29.95), what="the drums come in quietly (song 0:30)"),
                 "firstKickOfBuild": cue(kick(31.3262))},
        "wow": {"heldBreath": {"first": cue(out(77) / SR, what="the build starts to fade (gone 0.4 s later)"), "silentFrom": cue(out(77) / SR + 0.40), "pickup": words(line(77), kick(DROP_KICK, line(77))),
                               "last": cue(kick(DROP_KICK, line(77)) - 1 / FPS)},
                "drop": cue(kick(DROP_KICK, line(77)), what="the first kick of the drop"), "hookInKickGap": words(line(78), line(95), "lead"),
                "fullStrengthUntil": cue(out(95) / SR, what="the level starts down to -2 dB over the next two bars")},
        "buildingTheRest": {"runUp": cue(line(95)), "loud": cue(kick(92.9289, line(95))), "loop": cue(kick(92.9289, line(107)))},
        "humanEye": {"firstKick": cue(kick(119.413, line(115))), "evenKicksUntil": cue(kick(130.5861, line(123)), what="the last of 60 kicks on 60 consecutive beats; the next bar is the song's own gap"),
                     "secondPass": cue(kick(119.413, line(123))), "gap": cue(line(130), what="the song's bar with no kick on its beats (one off-beat kick), into the brass")},
        "whoDidWhat": {"brass": cue(kick(132.654)), "lastKick": cue(kick(145.9141))},
        "forkIt": {"stringPeak": cue(peak / FPS, what="the strings stem's loudest frame"), **(last or {}), "end": cue(dur)},
    }
    return {"what": "The making-of's chapters on its music (stories/makingof/audio.wav), for the picture. Written by arrange.py from the edit; see arrangement.json.",
            "fps": FPS, "duration": round(dur, 4), "frames": int(np.ceil(dur * FPS)), "bar": BAR, "beat": BEAT, "chapters": ch, "cues": cues}


# ---------------------------------------------------------------------------------------------- checking the carry-through
def verify(y, kicks, get):
    """Is every kick in the rendered sound where the edit list says? Two measurements of the sound itself, neither
    using the clip arithmetic: (1) the 60 ms of the original mix around the kick is slid against the render around the
    predicted time to find where it fits best; (2) the envelope under 120 Hz (as analysis/kicks.py takes it, but of
    the full sound) is followed to half its local height in the render and, the same way, in the original."""
    import scipy.signal as ss
    pad = S(0.3); mix = get("mix").mean(axis=1); r = np.concatenate([np.zeros(pad), y.mean(axis=1), np.zeros(pad)]); sos = ss.butter(4, 120, "low", fs=SR, output="sos"); w = S(0.03); look = S(0.02); worst = (0, None); worst2 = (0, None); gains = []; d2s = []
    def onset(x, c):
        lo = ss.sosfiltfilt(sos, x[c - S(0.25):c + S(0.25)]); e = np.convolve(np.abs(ss.hilbert(lo)), np.ones(240) / 240, "same")[S(0.25) - S(0.06):S(0.25) + S(0.06)]
        p = int(np.argmax(e >= 0.9 * e.max())); h = 0.5 * e[:p + 1].max(); i = p
        while i > 0 and e[i - 1] >= h: i -= 1
        return i + (h - e[i - 1]) / max(1e-12, e[i] - e[i - 1]) if i > 0 else 0.0
    for o, s, cid in kicks:
        a = S(s); b = S(o) + pad; ref = mix[a - w:a + w]; best = max(range(-look, look + 1), key=lambda d: float(np.dot(ref, r[b + d - w:b + d + w])))
        if abs(best) > abs(worst[0]): worst = (best, (o, s, cid))
        d2 = onset(r, b) - onset(mix, a)
        d2s.append(abs(float(d2)) / SR * 1000)
        if abs(d2) > abs(worst2[0]): worst2 = (d2, (o, s, cid))
        gains.append(float(np.dot(ref, r[b - w:b + w]) / np.dot(ref, ref)))
    return {"kicks": len(kicks), "method1": "best fit of the original mix's 60 ms around each kick against the render, searched over +-20 ms",
            "worstSamples": int(worst[0]), "worstMs": round(worst[0] / SR * 1000, 4), "worstFrames": round(worst[0] / SR * FPS, 5), "worstAt": worst[1],
            "method2": "onset of the under-120 Hz envelope (half its local height) in the render, against the same in the original mix",
            "medianMs2": round(float(np.median(d2s)), 4), "over1Ms2": int(np.sum(np.array(d2s) > 1)), "worstMs2": round(float(worst2[0]) / SR * 1000, 4), "worstFrames2": round(float(worst2[0]) / SR * FPS, 5), "worstAt2": worst2[1],
            "gainAtKicks": {"min": round(min(gains), 3), "max": round(max(gains), 3)}}


def main():
    dry = "--dry" in sys.argv; total = build()
    print(f"grid: {60 / BEAT:.3f} BPM, bar {BAR:.5f} s; arrangement {total / SR:.3f} s = {total / SR // 60:.0f}:{total / SR % 60:05.2f}, {len(CLIPS)} clips")
    ends = [line(j) for _, j, _ in CHAPTERS[1:]] + [total / SR]
    for i, (n, j, _) in enumerate(CHAPTERS):
        a = 0 if j == 0 else line(j); print(f"  {i + 1:2d} {n:18s} bar {j:3d}  {a // 60:.0f}:{a % 60:05.2f} - {ends[i] // 60:.0f}:{ends[i] % 60:05.2f}  ({ends[i] - a:5.2f} s)")
    if dry: return
    y, pulled, get = render(total)
    print(f"rendered: peak {20 * np.log10(np.abs(y).max()):.2f} dBFS, limiter pulled down {pulled:.2f} dB at most")
    write_wav(y)
    kicks = map_kicks(); stems = map_stems(total); lyr = map_lyrics(); A = describe(total)
    A["verification"] = v = verify(y, kicks, get); A["master"] = {"ceiling_dbfs": -1, "limiterMaxReduction_db": round(pulled, 3), "peak_dbfs": round(float(20 * np.log10(np.abs(y).max())), 2), "dither": "triangular, 16 bit; none in silence"}
    print(f"kicks: {v['kicks']} carried through; worst disagreement with the rendered sound {v['worstSamples']} samples ({v['worstFrames']} frame) by fit, {v['worstMs2']} ms ({v['worstFrames2']} frame) by envelope")
    dump = lambda name, o, **kw: json.dump(o, open(os.path.join(HERE, name), "w"), ensure_ascii=False, **kw)
    dump("arrangement.json", A, indent=1); dump("listen.json", listen_json(total, y), indent=1)
    dump("stems.json", {"fps": FPS, "source": "stories/makingof/arrange.py: analysis/stems.json carried through the edit (arrangement.json); a stem's loudness is 0 wherever the arrangement mutes it", "stems": stems})
    dump("lyrics.json", lyr, indent=1); dump("chapters.json", chapters_json(total, kicks, lyr, stems, y), indent=1)
    print("wrote audio.wav arrangement.json listen.json stems.json lyrics.json chapters.json in stories/makingof/")


if __name__ == "__main__": main()
