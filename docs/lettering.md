# Sound-effect words, signs and titles

All lettering in the film is drawn by code, on the frame it is needed. None of it is inside a generated picture:
an image model invents letters, changes them between drawings, and cannot be held to a frame.

## Sound words (`engine/sfx.js`)

The drawn sound effects of manga (ドーン for a blast, ガシャン for a slam). A word pops on oversized ON the frame of the
action, settles in two drawings and is gone within about ten frames. A shot draws it on its overlay and declares
the same frame as a mark:

```js
import { sfx, sfxMark } from "../engine/sfx.js";
const HIT = 40;                                     // the frame of the action: a measured kick
// in the shot:
marks: [sfxMark(HIT, "ドーン", "a drone is blown out of the pack", "kick")],
// in frame(f):
overlay(g) { sfx(g, { text: "ドーン", x: 1400, y: 180, size: 120, color: "alarm", age: f - HIT }); }
```

| Option | Meaning |
|---|---|
| `text` | Katakana in the station's stroked hand (`sets/sign.js` has the letters it knows). Anything else, hiragana for speech or Latin, needs `face: "type"` (the font Dela Gothic One) |
| `x`, `y`, `size`, `angle` | Middle of the word in pixels, glyph size once settled, tilt in radians (default climbs to the right) |
| `color` | Whose sound it is: `station` (yellow), `alarm` (red), `tane`, `ife`, `noor`, `juno`, or `[fill, outline]` |
| `age` | Frames since the action; the word shows for `0 <= age < life` (default 10) |
| `pop`, `shake`, `burst` | Its size on its first frames; pixels of jarring; the ticks thrown out round it |
| `gloss` | A small Latin word beside it for readers who need it: `"oops"` |

What the film learned:
- **Pick the word for the action.** ガシッ (a grab) for a catch, not ガンッ (a clang). `docs/japanese.md` lists
  every word used, how it reads and what it means.
- **Keep it in frame and off faces and signs.** One was drawn almost entirely above the frame; a word across a face
  is the first thing a viewer sees wrong. Put it beside the thing that makes the sound.
- **Where hits come faster than a word can be read, letter one of them**, not each.
- **Speech is hiragana** (おっと…, "oops"): in katakana the same sounds read as another word ("husband").

`scripts/starter_shot.txt` (`boom`) places a word beside a moving thing by projecting its position: `cam.project(at)`.

## Signs in a set (`sets/sign.js`)

Screens, boards and floor stencils are canvas textures: `kana(ctx, "トラブル", x, y, size, lineWidth, color)` strokes
katakana; `latin(ctx, "C-07", x, y, px, color)` sets Latin in a monospace face (DejaVu Sans Mono where installed);
`scanlines`, `hazard` and `chevrons` dress them. A set shows the texture on an emissive surface whose brightness a
stem drives (`sets/example.js` has a minimal screen).

Several sets take a word to show as a cue (`corridor` `says`, `gantry` `sign`, the vault's `speech`), which is how
the film's screens say the lyric: the shot reads the word being sung from the song (`sync.wordAt(frame)`) and holds
the frame to it with a mark `on: "lyric"`.

## Titles and name cards

Large type is the font in `fonts/` (`DelaGothicOne-Regular.ttf`, SIL OFL), which the stage loads for every shot:
on any 2D canvas of a shot, `g.font = '160px "Dela Gothic One"'`. The film's title card is `shots/open_title.js`;
its name cards are `nameCard` in `shots/slice_fx.js`.

## Checking text you cannot read at a glance

Render it and read the pixels. Do not trust the string in the code: a vertical sign lost its last letter to
overflow, a long-vowel mark was not rotated, and the voicing ticks of ブ against the ring of プ closed up at
distance. `docs/japanese.md` is the audit of every piece of Japanese in the film: text, reading, meaning, where,
and whether it is right.

```sh
node render.mjs shots/hello.js --frames 40,41,42,43 --stills 41     # a sound word on its first frames
node engine/marks.mjs shots/hello.js                                # the words' frames against the kicks
```
