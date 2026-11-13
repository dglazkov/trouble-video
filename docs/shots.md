# Making a shot

A shot is a JavaScript module. Its default export says how long it is, who is in it, and a function that returns,
for any frame number, what the picture is. `render.mjs` renders it; `engine/stage.js` (read its header: it is the
reference) plays it.

Three examples to copy, shortest first. All three were rendered while writing this.

```sh
node render.mjs examples/shot.js       # one character, no set: out/example_shot.mp4 (64 frames, 13 s to render)
node render.mjs examples/room.js       # two characters in the smallest set: out/example_room.mp4 (40 frames, 22 s)
node render.mjs examples/closeup.js    # a close-up plate: out/example_closeup.mp4
```

## The shortest complete shot (`examples/shot.js`)

```js
import { orbit } from "../engine/body.js";
import { ground, shadows } from "../engine/scenery.js";
import { CAST, STRIDE } from "../kits/cast.js";

const FPS = 24, CYCLE = 16;      // frames to a cycle of the run: its eight drawings, two frames each ("on twos")
export default {
  name: "example_shot",          // names out/example_shot/ and out/example_shot.mp4
  start: 51.55,
  frames: 64, fps: FPS,
  cast: { juno: CAST.juno },     // who is in it: a name for each, and their kit's folder
  frame(f, sync) {               // sync: the song at any frame (engine/sync.js): beats, bars, stems, words
    const kick = sync.drive({ stem: "kick", mode: "pulse", decay: 0.12 }, this.start * FPS + f);
    const z = -7 + STRIDE.juno * f / CYCLE;
    const cam = orbit([0, 0.85, z], 90, 7.4 - 0.5 * kick, { elev: 4, fov: 17 });
    return {
      camera: { pos: cam.pos, target: cam.target, fov: 17 },
      // what she is doing: an action from engine/actions.js and how far through it (phase counts cycles)
      actors: [{ who: "juno", action: "run", phase: f / CYCLE, z }],
      // no set, so the shot paints its own background on a 2D canvas: a floor grid and posts for her to pass
      backdrop(g, c, bodies) { ground(g, c); shadows(g, c, bodies[0]); },
    };
  },
};
```

## The fields of a shot

| Field | Meaning |
|---|---|
| `name` | Output names. Unique among your shots |
| `start` | Seconds into the song at frame 0. In an edit, each shot must start exactly where the one before ends |
| `frames`, `fps` | Length; `fps` is 24 everywhere |
| `song` | The folder of the song it is cut to (`"stories/NAME"`); none: the demo song |
| `width`, `height` | Default 1920x1080 |
| `cast` | `{ who: "/kits/NAME" }`. `kits/cast.js` exports `CAST` with all four |
| `plates` | `{ name: { src, key: "magenta" } }`: single pictures the shot lays in |
| `sets` | Sets to build before frame 0 (others are built when first used) |
| `marks` | `[{ at, what, on }]`: frames that must land on the music ([checking.md](checking.md)) |
| `cutOn` | What this shot's first frame is on (`"bar"`, `"beat"`, `"kick"`, a stem): becomes a mark when it is in an edit |
| `held` | `(f) => frame whose drawings frame f shows`. Default: the last even frame ("on twos") |
| `frame(f, sync)` | The picture at frame `f`: see below |

## What `frame(f, sync)` returns

| Field | Meaning |
|---|---|
| `set` | A set's name, or nothing (then `backdrop` paints the background) |
| `camera` | `{ pos: [x, y, z], target: [x, y, z], fov, up }`. Metres, +Y up, vertical fov in degrees |
| `options` | The set's cues for this frame (each set's header lists its own), `drones`, and `post` |
| `actors` | Characters on the skeleton: below |
| `cels` | Plates on the frame: `{ plate, x, y, scale, turn, flip, layer }`, or `{ draw(g, cam), depth }` for something the shot draws that characters pass behind and in front of |
| `backdrop(g, cam, bodies)` | Paints the background on a 2D canvas, when there is no set |
| `under(g, cam, bodies)`, `overlay(g, cam, bodies)` | Painted under the characters; over everything (sound words, titles, drawn effects) |
| `post` | Photography parameters over the set's own: `engine/post.js` `DEFAULTS` lists them (`bloom`, `flash`, `bgBlur`, `mode: 1` for an impact frame, `black: 1`) |
| `pictures` | `["/path/a.webp", ...]`: picture files this frame draws (footage: a still, or one frame of an image sequence). They are loaded before the frame is painted, and `backdrop`, `under` and `overlay` get a fourth argument `pic(url)` that returns the image to `g.drawImage` (`stories/makingof/` is cut from these) |
| `panels` | A split screen: several pictures, each with its own set and camera, laid in through polygons (`shots/reun_split.js`) |

`sync` is the song at any frame ([song.md](song.md)). Everything must be a pure function of `f`: no `Math.random`,
no state. Frames are rendered in any order and must come out the same.

## Characters: actors

```js
{ who: "tane", action: "run", phase: 0.25, x: 1.2, z: -3, yaw: 180, view: "side" }
```

| Field | Meaning |
|---|---|
| `who` | A name in `cast` |
| `action`, `phase` | What they are doing (`engine/actions.js` `ACTIONS`) and how far through. For a looped action `phase` counts cycles; for a held one, 0..1 picks among its drawings |
| `x`, `z`, `y` | Where the ground point under them is; `y` lifts the whole figure (a leap's arc) |
| `yaw` | Which way they face, degrees: 0 toward +z, 90 toward +x |
| `view` | The drawing the shot was staged for. Optional: the stage picks the kit's nearest view to the camera's line of sight anyway; naming it makes a kit that lacks it show the dummy, and `render.mjs` report it |
| `hero` | The name of a hero cel: that drawing is shown whatever the camera |
| `light`, `steady`, `over`, `shadow`, `layer` | Light overrides; `steady: n` averages the set's light over n frames either side (no strobing through pools); `over: true` lets nothing of the set hide the cel; `shadow: false`; `layer` is `engine/post.js` `LAYER` (a wobble of hair and cloth) |

What each character has is in [cast.md](cast.md). The essentials:

- **All four** have `run` from the front and the side, `runtop` (from above), `gant_slide`. Juno also has `run` from
  three-quarter front and back, `idle`, `ride`, `leap`. Asking for anything else shows the posing dummy.
- **Views** are front (0 degrees), front34 (45), side (90: the character's LEFT side), back34 (135), back (180), and
  top. The other side is the same drawing mirrored, except straight front and back, which are never mirrored.
  `node render.mjs FILE --debug` prints which drawing each character is on and whether it is mirrored.
- **Feet.** A runner who covers `d` metres is at `phase = d / STRIDE[who]` (`kits/cast.js`). At 16 frames a cycle
  the eight drawings fall two frames each and a planted foot holds exactly. For another cadence, or several
  runners with different legs at one speed, choose each one's drawing yourself and tell the motion check:
  `scripts/starter_shot.txt` (`runners`) is the pattern, and `shots/hello.js` is it filled in.
- **A hero cel** is asked for by name: `{ who: "juno", action: "ride", hero: "ride_left", ... }`. It was drawn for
  one camera on one frame of one shot; `engine/motion.mjs` says how far your camera is from it.

## Plates and close-ups (`examples/closeup.js`)

A plate is one picture, not a cel on the skeleton. Declare it, then place it by its centre in pixels:

```js
plates: { juno: { src: "/kits/juno/closeup/slice_run.png", key: "magenta" } },
...
cels: [{ plate: "juno", x: 960, y: 566, scale: 0.75, layer: { warp: 7, warpStill: [0.6, 0.5] } }],
```

- `key: "magenta"` lifts the drawing off its key-colour backdrop when it loads (the backdrop's colour is read from
  the top-left pixel). A picture already keyed (`*_key.png`, made by `pipeline/key.py`) is given without `key`.
- **A change of expression** is a second plate, an edit of the first graded and registered to it (the `.png` beside
  a take's `.jpg`), swapped by frame: `shots/brk_face.js` holds five faces per character and switches on the music.
- Two of the cast touching (a grip, a haul) is one plate with both in it: `kits/noor/closeup/gant_haul_*`.

## Drones and the boss

Sets that take `options.drones` draw whatever list you give for the frame (`machines/drones.js` has every field):

```js
import { chase } from "../machines/drones.js";
options: { drones: chase(F, sync, { n: 12, lead: [0, 2, z - 6], spread: [3.8, 1.4, 11], seed: 3 }) }
// or by hand: { type: "chaser" | "enforcer", pos: [x, y, z], yaw, eye, beam, broken: secondsSinceDestroyed }
```

`chase` is a pack that follows a point and lurches on the drums. `broken` plays a drone's destruction from 0.
The warden (`machines/warden.js`) lives in the atrium set: `options.warden = { pos, yaw, ... }`.

## Edits

```js
import { edit } from "../engine/edit.js";
export default edit("slice", [run, faces, drop, tane, ride, leap]);   // shots or edits, each starting where the last ends
```

An edit is rendered and checked like a shot. It keeps each shot's marks at the edit's frames and adds one for each
cut (`cutOn`).

## Commands

```sh
node render.mjs examples/shot.js --frames 0,8 --stills 0,8     # stills to out/example_shot_stills/
node render.mjs examples/room.js --debug --range 0-23 --sheet 6 # skeletons and drawing names; a contact sheet
node render.mjs examples/shot.js --mannequin                    # dummies only
node pipeline/proof.mjs examples/room.js --frames 0,12          # the kit's drawings on a plain backdrop: out/proof/
node engine/motion.mjs examples/room.js                         # 123 measurements, 0 over their limits
```
