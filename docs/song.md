# Measuring a song

The engine never listens to audio. It reads two JSON files (and an optional third) that say what the song does at
every frame, and everything that moves to the music asks them. `analysis/song.py` writes those files for any song.

```sh
.venv/bin/python analysis/song.py my_song.mp3 --out stories/my_song                       # the mix alone (31 s for a 2:45 song)
.venv/bin/python analysis/song.py my_song.wav --out stories/my_song --stems my_stems/     # with stems: better
.venv/bin/python analysis/song.py my_song.wav --out stories/my_song --lyrics --words "the lyric if you have it"
```

(`npm run starter -- my_song.mp3 [--stems DIR]` runs the first two for you.)

## What is written

| File | What | Read by |
|---|---|---|
| `audio.EXT` | a copy of your file | `render.mjs` lays it under the video |
| `listen.json` | `duration`, `tempo`, `key`, `beats` (seconds), `downbeat` (a beat that starts a bar), `sections` (boundaries), `energy` (loudness in 5 s blocks) | `engine/sync.js` |
| `stems.json` | per stem: `env` (loudness 0..1 at 24 fps), `onsets` (seconds), `peak`; `estimated: true` on stand-ins | `engine/sync.js` |
| `lyrics.json` | only with `--lyrics`: `words` (`word`, `t`, `frame`, `phrase`, `confidence`) and `phrases` | `engine/sync.js`, `engine/marks.mjs`, `analysis/captions.py` |

A shot is cut to this folder by saying `song: "stories/my_song"` (see [shots.md](shots.md)). In a shot, `sync` is
the song:

```js
const s = sync.at(frame);                    // frame = song seconds x 24
s.beat.index, s.beat.phase                   // which beat, and 0..1 through it
s.bar.beat                                   // 0..3 within the bar
s.stems.kick.since                           // seconds since the last kick (Infinity before the first)
sync.drive({ stem: "kick", mode: "pulse", decay: 0.12 }, frame)   // 1 on a kick, dying away: one "wire"
sync.drive({ stem: "bass", mode: "env" }, frame)                  // the bass's loudness now
sync.wordAt(frame)                           // the word being sung, or null
```

`engine/sync.js` documents every field and wire mode (`env`, `pulse`, `gate`, `count`, `beat`, `bar`).

## Stems: get them if you can

A stem is one instrument's track. With stems, each is measured on its own and the kick is taken from the drum stem
under 120 Hz, good to a few milliseconds. The sets are wired to stems **by name**:

`lead_vocals backing_vocals drums bass guitar keyboard percussion strings synth brass other`, plus `kick`.

- **Suno**: a song's menu has "Get stems"; it gives files named like `0 Lead Vocals.wav`, `2 Drums.wav`, which is
  what the demo used. Put them in one folder and pass `--stems`.
- **A separator** such as Demucs gives four stems (`drums`, `bass`, `vocals`, `other`). That is enough for the kick
  and the bass; `vocals` is read as `lead_vocals`; the names it does not give are filled in from the mix. (We have
  not run a separator in this repository; the file naming is all `song.py` depends on.)
- Stems are large and are not committed (`.gitignore`); what the film needs from them is in `stems.json`.

Run on the demo song's own stems, `song.py --stems` reproduces `analysis/stems.json` exactly.

## Without stems: what degrades

Every stem becomes a **stand-in** cut from the mix by arithmetic: the percussive part for `drums`, its low end for
`kick`, bands of the sustained part for the rest. Measured on the demo song against its real stems:

| | Without stems | With stems |
|---|---|---|
| Kicks found (of 157 real ones) | 128 within one frame (82%); 5 of the 133 it reports are not kicks | all, by definition |
| Kick timing | median 4 ms early, 90% within 10 ms | reference |
| `drums` loudness against the real drum stem | correlation 0.53 | 1 |
| `bass` loudness against the real bass stem | correlation 0.39 | 1 |
| `brass`, `strings`, `synth`, `keyboard`, vocals | a frequency band; **not** that instrument | the instrument |

So without stems: hits on `kick` are mostly right, with some missed where the bass is loud; a set's lights and
machines still move with the music, but "the klaxon follows the brass" is no longer true. Beats, bars, sections and
tempo come from the mix either way.

## What to check by ear

- **The bar line.** `downbeat` is an estimate: of the four ways to count in fours, the one on whose first beats the
  chords change most. `song.py` says when it is a weak guess. If cuts feel a beat off, set `"downbeat"` in
  `listen.json` to the time of a beat you know starts a bar. (The demo song's own `listen.json` has no `downbeat`,
  and takes the start of its fourth section, which is how the film was cut.)
- **Beats are not kicks.** The beat grid comes from a beat tracker and is an estimate; on a synthetic click track it
  drifted by nearly half a beat while every kick was found to 0.04 of a frame. Hang hits on `kick` or a stem's
  onsets; use `beat` and `bar` for cuts and for things that should pulse.
- **Sections** are found from timbre and harmony, about one per 20 s. They are a starting point for a storyboard,
  not a structure to trust.

## Lyrics

`--lyrics` transcribes the vocal stem (or the mix) with faster-whisper and writes a word timeline with every word
marked `"confidence": "low"`. It downloads a speech model on first use. On a 30 s stretch of the demo song that has
five sung phrases it heard one, a blend of two of them, three quarters of a second late; expect that from sung, layered vocals. Treat it as a form to
fill in:

1. Get the real words from whoever wrote the song.
2. Fix the words and phrases in `lyrics.json`.
3. Put each word on its onset in the vocal stem: where the spectrum changes, not where the level peaks.
   `analysis/lyrics.py` is that work for the demo song (two phrases, 59 words), and its header says how each kind
   of word was found. It is written for that song; read it as a method.

A shot holds a word on screen to the frame it is sung with a mark: `{ at, what, on: "lyric", word: "DEEP" }`.

## The demo song's own scripts

`analysis/listen.py`, `stems.py`, `kicks.py` and `lyrics.py` are how `audio.wav` was measured, kept as the record.
`song.py` does what the first three do, for any song, in one step.
