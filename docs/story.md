# From a song to a film

The path this project took, as steps you can repeat with your own song. Each step ends in commands that were run
while writing this. The rules behind the steps, with their reasons, are in [CLAUDE.md](../CLAUDE.md).

## 0. Set up, and see something move

```sh
npm run setup
npm run hello                                 # out/hello.mp4: the demo clip, 42 s on a laptop GPU
npm run starter -- my_song.mp3                # stories/my_song/ and out/my_song.mp4 (about a minute and a half)
```

`stories/my_song/` now holds your song (`audio.mp3`), what was measured of it (`listen.json`, `stems.json`) and
`starter.js`, a two-shot edit cut to it. Everything you make goes in that folder; commit it.

## 1. Measure the music

Before any picture: know the song in numbers. [song.md](song.md) says what is measured and how good it is.

```sh
.venv/bin/python analysis/song.py my_song.mp3 --out stories/my_song --stems path/to/stems    # with stems if you have them
```

It prints the tempo, where a bar starts, the section boundaries, a loudness map in 5 s blocks and how many kicks
it found. Listen to the song with that printout beside you and mark what you hear: where the drop is, where the
drums stop, which phrases repeat.

## 2. Storyboard to the measurements

Write the story as sections that follow the song's own sections, then each section as shots with a frame count.
The demo film is ten sections of 10 to 27 seconds; a section is 6 to 26 shots; most shots are 1 to 4 seconds.

For each section, put its numbers in one small module that every shot of the section imports (the pattern is
`shots/slice_cast.js`): the section's start in song time, the frame of every cut, and helpers.

```js
export const FPS = 24, T0 = 48;                               // the section starts 48.0 s into the song
export const CUT = { run: 0, faces: 45, drop: 85, end: 120 }; // frames from T0; each is on a beat or a kick
export const startOf = (name) => T0 + CUT[name] / FPS;        // a shot's `start`
```

Every cut and every hit gets its frame from the measurements, never by eye: a cut frame is
`Math.round(barTime * 24)`, a hit is the frame of a kick or a stem's onset. `engine/marks.mjs` will check them.

What to plan around, from making the demo:
- The loud moments want the simplest pictures: one clear action per kick.
- What the cast can already do is in [cast.md](cast.md). A shot that needs a new pose needs a new drawing; plan
  those and count them, they are the slow part.
- Decide early which shots are skeleton shots (running, walking: actors in a set) and which are plates (close-ups,
  two people touching). Plates are quicker to make and cannot move through a set.

## 3. Stage with what exists

Write the shots ([shots.md](shots.md)) in the sets that exist ([sets.md](sets.md)), with the drawings that exist,
and with the posing dummy where a drawing does not exist yet:

```sh
node render.mjs stories/my_song/starter.js --mannequin --frames 0,40,119,160     # staging, no art
node render.mjs stories/my_song/starter.js --frames 0,40,119,160 --stills 0,40   # with the cast's drawings
node engine/marks.mjs stories/my_song/starter.js                                # cuts and hits against the song
node engine/motion.mjs stories/my_song/starter.js                               # feet, pops, jumps
```

`render.mjs` prints `dummies`: which characters were drawn as the dummy because their kit has no drawing for the
action and view the shot asked for. That list is your shopping list for step 4.

## 4. Make the drawings the shots need

New actions, hero cels for a shot's own camera, plates and close-ups: the recipes are in [cast.md](cast.md). This is
the only step that needs a `GEMINI_API_KEY` and spends money.

## 5. Check, at full size

[checking.md](checking.md). In short: `marks`, `motion`, then open consecutive frames at full resolution and read
each shot for hidden faces, wrong sides, things that do not make physical sense. Then a person watches the video.

## 6. Cut sections together and render

A section is an edit of its shots; the film is an edit of its sections ([shots/film.js](../shots/film.js) is all of
the demo's):

```js
// stories/my_song/film.js
import { edit } from "../../engine/edit.js";
import intro from "./intro.js"; import chase from "./chase.js";      // each an edit(...) of its own shots, or a single shot
export default edit("my_film", [intro, chase]);                      // each must start where the one before ends
```

```sh
node render.mjs shots/slice.js           # one section of the demo: 336 frames -> out/slice.mp4
node engine/marks.mjs shots/film.js      # 469 marks, 0 off
npm run film                             # the whole demo film -> out/film.mp4 (3956 frames: 29 minutes, 1.4 GB)
```

`edit()` throws if a shot does not start exactly where the previous one ends, so a film has no gaps and no overlaps
by construction. Rendering writes PNG frames to `out/NAME/frames/` and then encodes H.264 with the song laid under
from the edit's `start`. Render sections separately while you work (two to five minutes each); render the film once.

Two renders must never write into the same folder at once; `--out DIR` sends frames elsewhere.

## 7. Captions

If your song has words and you have a word timeline (`lyrics.json`, see [song.md](song.md)):

```sh
.venv/bin/python analysis/captions.py stories/my_song     # -> stories/my_song/captions.srt and .vtt
.venv/bin/python analysis/captions.py                     # the demo song -> subs/trouble.srt, subs/trouble.vtt
```

One cue per sung phrase; the `.vtt` also carries each word's time. Nothing is burned into the picture.

## What a newcomer still has to bring

- Chrome or Chromium, Node and Python on the machine.
- A GPU, or patience: software rendering is about seven times slower.
- A song they have the rights to.
- For new drawings only: a Gemini API key, and a person willing to look at every drawing.
- A person to watch the result. Nothing here can tell you whether a film is good.
