# Checking your work

Three kinds of check, in the order to run them. The first two are measurements and take seconds; the third is
looking, and nothing replaces it.

## 1. Marks: is it on the music?

A shot lists what must land on the music:

```js
marks: [{ at: 40, what: "the shutter slams", on: "kick" }]     // at: frame of the shot
cutOn: "bar"                                                    // in an edit: this shot's first frame is on a bar line
```

`on` is `"beat"`, `"bar"`, a stem's name (its onsets: `"kick"`, `"drums"`, `"brass"`...), or `"lyric"` (the start of a
sung word; add `word: "DEEP"` to hold it to that word).

```sh
node engine/marks.mjs shots/hello.js          # 7 marks, 0 off by more than 0.75 of a frame
node engine/marks.mjs shots/film.js           # 469 marks, 0 off
node engine/marks.mjs shots/hello.js --within 0.5 --json
```

Each line says the frame the mark is on, the frame the song puts the nearest such event on, and the difference.
Exit status 1 if any is further off than `--within` (default 0.75 of a frame). A cut or hit placed by eye is
usually off by one to five frames; the fix is to compute the frame from the measurement, not to nudge it.

## 2. Motion: do feet slide, do drawings pop?

`engine/motion.mjs` walks every pair of consecutive frames the way the stage plays them, without rendering:

| It measures | Meaning | Limit |
|---|---|---|
| `stride`, `plant` | A planted foot's place on the floor from one drawing to the next, and over the whole plant | 14 px; 0.2 m |
| `glide` | How far one held drawing with a foot down is carried | 0.45 m |
| `angle` | How far the camera is from the view a drawing was made for | 30 degrees round, 15 in height |
| `pop` | A jump of the drawn head or hips at a change of drawing, beyond the skeleton's own | 6% of the figure's height |
| `jump` | A jerk in a figure's place that the frames either side do not share | 0.1 m |
| `light`, `glitch`, `hidden` | With rendered frames: a figure's light strobing; a frame unlike both neighbours; how much of each figure the set hides | |

```sh
node engine/motion.mjs shots/hello.js                              # 0 over their limits
node render.mjs examples/room.js                                   # frames and notes.json in out/example_room/frames
node render.mjs examples/room.js --over --out out/room_over        # the same with nothing of the set hiding anyone
node engine/motion.mjs examples/room.js --frames out/example_room/frames --over out/room_over
```

Exit status 1 if anything is over its limit. A finding is a place to look, not a verdict: an impact frame or a leap
can be meant. The finished film has 21 findings over the limits (16 in the slice), each looked at and left, and
`npm test` fails if a section gains one.

What it cannot see: whether a drawing is good, a limb drawn wrongly, what a face reads as, whether what hides a
figure ought to, anything inside a held drawing.

## 3. Looking

- **Full resolution, consecutive frames.** Open the PNGs themselves, several in a row, across every cut and every
  hit. Twice in this project, work that looked fine on a contact sheet was rejected at full size.
- A **contact sheet** is for finding which frames to open:
  `node render.mjs FILE --range 0-95 --sheet 8` writes `out/NAME_sheet.png` with every 8th frame.
- **`--debug`** overlays skeletons and prints, per character, the action, view, drawing number and whether it is
  mirrored. **`--mannequin`** shows the posing dummies alone.
- Read each shot for the things the rules name ([CLAUDE.md](../CLAUDE.md)): a face hidden or sliced by anything,
  an asymmetric detail on the wrong side, a held thing that is not in the drawing, an action whose cause and effect
  do not read, text that is cut off.
- **Then a person watches the video.** Motion cannot be judged from frames. When you report, say what was watched
  as video and by whom, what was read as frames, and what was only measured.

While writing this guide the examples and the hello clip were measured and read as frames by the agent; no person
has watched them as video.

## The kit and the whole repository

```sh
node pipeline/check.mjs juno        # a kit against the engine: every drawing present, scaled, feet on the ground
npm test                            # everything above for the film and the hello clip, a synthetic song, five frames (57 s)
npm test -- --no-render             # without Chrome (18 s)
npm test -- --all                   # also breaks a painted sheet every way the cel checks guard against (about 70 s more)
```

The render comparison in `npm test` is deliberately loose (small pictures, mean difference): a GPU and Chrome's
software renderer differ in about 2% of pixels at full size, and a few film frames differ by a few levels from one
run to the next on one machine. To prove a change left the film alone, render the same frames before and after and
compare the files; where two runs of the same code differ, compare those frames by eye.
