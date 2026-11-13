# Sets: the places that exist, and making one

A set is a place built in three.js with one cel shader, drawn rather than lit: it says where tone falls as hard
shapes, and its lights, screens and machines are wired to the song's stems. A shot names a set and gives it a camera
and cue options for the frame.

## The places that exist

Every set's header comment lists its dimensions and cue options in full. Look at one before using it:

```sh
node render.mjs shots/set_corridor.js --frames 0,100 --stills 0,100     # each set has a test shot: shots/set_*.js
```

| Set | Place | Its systems play (wire = stem) | Cues a shot gives (among others) |
|---|---|---|---|
| `corridor` | An endless ribbed corridor along Z with bulkhead shutters every 24 m and a four-way hub; indigo, cyan, orange | hull=bass, doorChomp=drums, klaxon=brass, stars=strings, screens=synth, reels=keyboard | `junction`, `cut` (remove a wall or the ceiling), `doors`, `slabs` (blast doors), `holes`, `says`, `alert`, `drones` |
| `market` | A street of stalls under housing stacks, lanterns, a drawn crowd, a gap in the deck | lamps=bass, blink=drums, screens=synth, steam=drums, klaxon=brass | `crowd`, `alert`, `steam`, `drones` |
| `vault` | An eight-sided archive silo lit by its own screens, monitors on arms that turn to look | glow=strings, speak=lead_vocals, chorus=backing_vocals, floor=bass, reels=keyboard | `wake`, `speech`, `doors`, `drones` |
| `gantry` | A railed gantry over a hall of pistons and a furnace; oxblood and rust, lit from below | engine=bass, furnace=bass, klaxon=brass, steam=drums | `sign`, `alert`, `drones` |
| `atrium` | The station's hollow middle: a **painted vista** in projected layers, a gantry to its core | klaxon=brass, windows=strings, hull=bass, screens=synth, traffic=keyboard | `vista`, `alarm`, `screens`, `warden`, `drones` |
| `stairwell` | A steel stair tower and lift cage in a concrete shaft | hull=bass, klaxon=brass, sky=strings, hum=synth | `lift`, `alert`, `drones` |
| `tunnel` | A service tunnel that narrows to a crawlway, a blast door that dents | lamps=bass, chase=kick, flare=kick, screens=lead_vocals | `door`, `dents`, `cut`, `sign`, `monitor` |
| `core` | The zero-gravity core: violet and white, a gyroscope the size of a town (painted far plate) | far=strings, beams=keyboard | `beams`, `emitters`, `slabs`, `console` |
| `plant` | A frost-blue passage of coolant mains, things to blow up | pump=bass, lamps=kick, vents=drums, screens=keyboard | `armed`, `blasts`, `wreck`, `cards` |
| `shaft` | A well straight down through every other place, for a fall | rooms=strings, lamps=bass | `rooms`, `lamps`, `hatch` |
| `example` | A bare room: the template below | pool=bass, screen=kick | `wiring`, `post` |

Because the wires name stems, a set plays any song measured by `analysis/song.py` (with stand-ins when there are no
real stems: [song.md](song.md)). A shot can rewire a system for a frame: `options: { wiring: { klaxon: { stem:
"kick", mode: "pulse" } } }`.

## The interface

A set is a module in `sets/` that exports `createSet(renderer, { width, height })` and returns:

| | |
|---|---|
| `update(camera, frame, sync, options)` -> `{ scene, camera, clear, post }` | Called for every frame: aim the camera, set the systems' levels from the song, place what moves. `post` is the set's own photography (bloom, tint) |
| `light([x, y, z], options)` -> `{ tint, rim, from, fogK, fogColor, gradient }` | The light a figure standing there is laid in: an ambient tint, a hard rim colour and the direction it comes from, how the set's air swallows distance |
| `floorAt(x, z)` -> height or `null` | The floor under a point: where contact shadows fall; `null` where there is no floor |

The stage finds a set by its file name: `set: "example"` loads `sets/example.js`. (The ten film sets are named in
`engine/stage.js` and export `createCorridor` and so on; new sets need only `createSet`.)

## Making one: `sets/example.js`

It is fifty lines and has every part. Render it with `node render.mjs examples/room.js`.

1. **Wiring.** One line per system that moves with the music:
   `pool: { stem: "bass", mode: "env", floor: 0.6, gain: 0.6 }`. `driveAll(sync, WIRING, frame, options.wiring)`
   turns them into numbers each frame.
2. **Tone, in GLSL.** `setTone(W, N)` returns 0 (shade), 1 (mid) or 2 (lit) for a world position and normal: write
   the pools of light as shapes (`length(W.xz) < 2.4*uPool`). No lamps, no shadow maps: tone is drawn. The other
   three functions (`setExtra`, `setEmit`, `setSpecial`) can be the one-liners in the example.
3. **Geometry.** `kit.builder()` merges boxes, cylinders, quads and extruded outlines by material:
   `b.box(w, h, d, x, y, z, mat("#3b4a8a"))`. `mat(color, { kind })` picks the kind of surface (`sets/kit.js` lists
   them: 0 lit by the set, 1 and 2 emissive, 7 transparent, ...).
4. **Screens and signs** are canvas textures drawn by code (`canvasTex`), shown with an emissive material whose
   `gain` a wire drives. Lettering goes here, never into a generated picture. Katakana in the station's stroked hand
   is `sets/sign.js` `kana()`.
5. **`light()`**: start with one light for the whole place. A light that changes from spot to spot must not make a
   running figure strobe (`steady: n` on the actor averages it).
6. **Options default off.** When you add a cue to a set that shots already use, a frame without the option must
   render exactly as before; render the same frames before and after and compare the files.

Sets take drones by owning them: `const drones = createDrones(kit, scene)` and in `update`,
`drones.update(opt.drones ?? [], frame, sync, camera, { thrust })` (`sets/gantry.js` is a compact example).

## Painted backdrops

A vista can be a painting instead of geometry and still have depth (`sets/painted.js` has the method; the atrium is
the example):

1. The set keeps a plain **blockout** of the place and one **hero camera** the vista is seen from; a guide is
   rendered from it with a wider lens (`shots/atrium_plate.js`).
2. The view is painted over the guide by the image model, then again as **layers** (the far plate with nearer things
   removed; nearer things cut off the whole painting), in each state the film needs (day, alarm):
   `sets/paint.py gen | key | cut | freeze | crop`. Judge at 1:1, then freeze into `sets/NAME/` with sidecars.
3. In the set, each layer is **projected from the hero camera** onto stand-ins at the right distances. From the hero
   camera the picture is exactly the painting; a camera that moves a little sees the layers slide.
4. Whatever moves, must stay crisp, or is touched by a character is not painted: screens, beacons, the gantry.

This needs the image model (`GEMINI_API_KEY`), and was not re-run while writing this guide; the commands are
`sets/paint.py`'s own (`.venv/bin/python sets/paint.py --help` lists them). Give a vista time on
screen: the atrium read as a pale model until it was painted and held for two seconds.

## Commands

```sh
node render.mjs examples/room.js                      # the example set with two of the cast
node render.mjs shots/set_market.js --frames 0,60     # any film set's test shot
grep -n "^//   [a-z]" sets/corridor.js | head -30     # a set's cue options
```
