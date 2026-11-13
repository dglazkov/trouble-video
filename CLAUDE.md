# trouble-video: guide for an agent working in this repository or a fork of it

You are probably here because someone has a song and an idea and wants a film of it made with this kit. This file is
the map, the commands, the workflow and the rules. Read it all (it is short); the files it points to say the rest in
the comments at their tops, which are careful and current. `README.md` is the human introduction.

## What this is

A finished 2:45 anime music video ("Trouble") rendered frame by frame from code in headless Chrome, and everything
it was made with. Characters are **whole-figure drawings placed on a 3D skeleton**; sets are three.js geometry and
projected paintings; the song's measured beats, kicks, stems and words drive cuts, hits, lights and machines.

Terms, once:
- **shot**: a JS module that says, for any frame number, what the picture is (`shots/*.js`). **edit**: shots cut end to end.
- **kit**: one character's folder of drawings and its manifest `kit.json` (`kits/NAME/`).
- **cel**: one whole-figure drawing of a character in one pose from one view. **action**: a fixed small set of poses
  (`run` is 8); a kit holds a cel per pose per **view** (front, front34, side, back34, back, top).
- **hero cel**: a one-off drawing made for one shot's own camera on one frame, when no view fits.
- **plate**: a single drawing on a key colour laid over the picture whole (a close-up, two people in a grip).
- **stem**: one instrument's track of the song; here, its 24 fps loudness envelope and onset times in `stems.json`.
- **mark**: a declared frame that must land on the music (`marks: [{ at, what, on }]`), checked by `engine/marks.mjs`.
- **on twos**: a character's drawing changes every second frame; camera and set move every frame.

## Map: the reusable kit, and this film

| Path | Kit or film | What |
|---|---|---|
| `engine/` | kit | `stage.js` (plays a shot: set + cels + photography pass), `body.js` `actions.js` `views.js` `cels.js` (skeleton, poses, which drawing shows), `edit.js`, `sync.js` + `song.mjs` (the song as a function of the frame; which song), `post.js`, `fx.js` (drawn blasts, smoke), `sfx.js` (sound words), `marks.mjs`, `motion.mjs` |
| `pipeline/` | kit | Making drawings: `layout.mjs` (mannequin sheet from the skeleton), `paint.py` (image model), `cels.py` (check, key, cut, register), `plate.py`, `match.py`, `sprites.py`, `key.py`, `check.mjs` (kit against engine), `hole.mjs`, `proof.mjs`, `sheet.py`; `env.mjs` + `browser.mjs` (Chrome, Python, ffmpeg) |
| `kits/` | kit | `juno tane ife noor` (each: `character.json`, `design/`, `kit.json`, `ACTION/VIEW/N.webp`, `hero/`, `closeup/`, `source/`, `log.jsonl`), `crowd/` (40 bystanders), `cast.js` (paths, colours, strides for shots) |
| `sets/`, `machines/` | kit | Ten places (`corridor market vault gantry atrium stairwell tunnel core plant shaft`) + `example.js`; `kit.js` (shader, builder), `painted.js`, `sign.js`; drones and the warden |
| `analysis/song.py`, `kicks.py`, `captions.py` | kit | Measure any song; captions from a word timeline |
| `scripts/` | kit | `setup.sh`, `doctor.mjs`, `starter.mjs` (+ `starter_shot.txt`), `test.mjs`, `cast_doc.py` |
| `examples/` | kit | `shot.js` (shortest shot), `room.js` (two characters in the smallest set) |
| `render.mjs` | kit | The one way a picture is made |
| `shots/` | **film** | 137 shot files, ten section edits, `film.js` (all of it), `hello.js` (the demo clip) |
| `audio.wav`, `analysis/*.json`, `analysis/listen.py stems.py lyrics.py`, `subs/`, `docs/lyrics.md`, `docs/japanese.md` | **film** | The demo song (not licensed for reuse), its measurements and how they were made |
| `stories/NAME/` | yours | Where `scripts/starter.mjs` puts a new song's measurements and first shot. Put a fork's film here |
| `bakeoff/`, `art/` | history | Early experiments; `art/ref/test_face.png` is still the pipeline's style reference, `art/gen.py` its image call |
| `out/`, `.venv/`, `node_modules/`, `.env`, `tools/`, stems | never committed | |

## Commands (all run from the repository root)

```sh
npm run setup                                  # once: node_modules, .venv, then the doctor
npm run doctor                                 # what is this machine missing?
npm run hello                                  # shots/hello.js -> out/hello.mp4 (42 s on a laptop GPU)
npm run starter -- SONG.mp3 [--stems DIR] [--from 30] [--seconds 10] [--full]   # your song -> stories/NAME/, out/NAME.mp4
node render.mjs FILE.js                        # every frame to out/NAME/frames/, then out/NAME.mp4 with the song
node render.mjs FILE.js --frames 0,12,40 --stills 0,12     # a few frames; copies to out/NAME_stills/ to look at
node render.mjs FILE.js --range 100-147 --out out/try      # a span, somewhere else
node render.mjs FILE.js --debug                # skeletons and which drawing each character is on
node render.mjs FILE.js --mannequin            # posing dummies instead of drawings (staging before art exists)
node render.mjs FILE.js --software             # no GPU (slow)
node engine/marks.mjs FILE.js                  # every cut and hit against the song; exit 1 if any is over 0.75 frame off
node engine/motion.mjs FILE.js [--frames out/NAME/frames]   # sliding feet, pops, jumps, strobing light; exit 1 if over limits
node pipeline/check.mjs NAME                   # a kit's manifest against the engine
.venv/bin/python analysis/song.py SONG --out stories/NAME [--stems DIR] [--lyrics]     # measure a song
.venv/bin/python pipeline/sheet.py OUT.png --cols 4 --width 480 FRAMES...              # a contact sheet (to scan, not to judge)
npm test                                       # the checks to keep green (57 s; -- --no-render: 18 s; -- --all adds 70 s)
npm run cast                                   # regenerate docs/cast.md tables and docs/img from the kits
```

Making NEW drawings needs `GEMINI_API_KEY` in `.env` and costs money per image; nothing else needs a key.
`docs/cast.md` has those recipes. Every tool prints its usage with `--help` or when run bare.

## From a song to a film

1. **Measure first.** `analysis/song.py` (or `npm run starter`, which calls it). Read what it prints: tempo, bar
   line, sections, where the kicks are. With stems, measure them (`--stems`). `docs/song.md`.
2. **Storyboard to the measurements**, section by section: what happens on which bar, which hit lands on which
   kick. Write the frame numbers down in one place per section (see `shots/slice_cast.js`: `CUT`, `startOf`).
3. **Stage with what exists**: the cast's actions and views, the sets, `--mannequin` where a drawing is missing.
   Render frames, look at them at full size, run `marks` and `motion`. `docs/shots.md`, `docs/sets.md`.
4. **Then make the drawings a shot needs** (hero cels for its camera, plates for close-ups): `docs/cast.md`.
5. **Cut sections into edits**, edits into a film (`shots/film.js` is the pattern), render, and have a person watch
   it. `docs/story.md` has the whole path with commands.

## Conventions

- 24 fps, 1920x1080 (a shot may set `width`/`height`; 960x540 previews render about three times faster, but shots
  that draw 2D overlays in pixels must scale them).
- `frame(f, sync)` is a **pure function of the frame number**: no `Math.random()`, no clock, no state carried between
  frames. Use the seeded `rnd`/`hash` helpers. Frames can be rendered in any order and come out the same.
- One render path: `render.mjs` drives `engine/stage.html`. Do not add a second way to make pictures.
- Characters on twos, camera and set on ones. A run cycle of 16 frames uses each of its 8 drawings once; other
  cadences skip or repeat drawings (see `scripts/starter_shot.txt` for a run at any tempo).
- Metres, +Y up, ground at y = 0; `yaw` in degrees, 0 facing +z. Song time in frames = seconds x 24.
- A shot names its song with `song: "stories/NAME"`; none means the demo song.
- Generated art is frozen: nothing overwrites a take; every image has a `.json` sidecar with its prompt; every
  rejection is logged with its reason in the kit's `log.jsonl`.
- Lettering (signs, sound words, titles) is drawn by code (`sets/sign.js`, `engine/sfx.js`, the Dela Gothic font),
  never generated inside an image.
- Commit messages say what changed and why, in sentences.

## The rules this project paid for

Each of these was learned by getting it wrong. The reason is given so you can judge the edge cases.

**Characters**
1. **A character is a whole-figure drawing. Never assemble a figure from separately drawn parts, and never paste a
   piece of one drawing into another.** The first version was a puppet of drawn parts; the owner rejected it outright
   as "a body horror of misalignments". The 3D skeleton decides pose, size, place and camera, and is what a drawing
   is painted over; it is never what is shown.
2. **Any person on screen is a drawing.** Procedural crowd figures "looked non-human" and were replaced by 40 drawn
   people (`kits/crowd/`).
3. **Anything a character holds or rides is drawn with the character**, in the same image (Juno's board, Tane's
   pipe). Two characters who touch are painted together in one plate; hands and grips cannot be overlapped afterwards.
4. **Faces must be visible.** Nothing may slice through a head or hide a face unless a back view is the intent: no
   post, pipe, door edge, sound word or other character. Read every shot frame by frame for it; a bulkhead jaw hid
   Juno for one frame and a post read as "through her head".
5. **Keep things on the correct side.** A mirrored drawing puts an asymmetric detail (Noor's white streak and
   cassette player on their left, Ife's monitor arm, Tane's buttons) on the wrong side. Straight front and back views
   are never mirrored by the engine; for the others, put the camera on the side the view was drawn from when the
   detail shows, or make the design symmetric (Juno's sleeve patches were made the same on both sides for this).

**Making drawings with an image model** (`pipeline/`; details in `docs/cast.md`)
6. **Paint all the drawings of one action in ONE image.** That is what keeps them alike; separate images drift in
   proportion and colour, and a second sheet "for more pixels" did not match the first.
7. **Ask for painting over a layout, not for a described pose.** The request is "paint this character over each
   mannequin on this sheet"; the mannequin sheet comes from the skeleton (`pipeline/layout.mjs`), so the drawing fits
   the pose the engine will ask for by construction.
8. **Show the model sheet as a reference and say "do not copy it".** Show it on a white square, not in the layout's
   shape, or its standing figures get painted over the mannequins. **Never feed an accepted sheet back as a
   reference**: its poses and view were copied over the layout's in three takes of three, and its colours came back warmer.
9. **Lock and simplify the design before any cels**, in words (`character.json` `describe`) and a model sheet: few
   plain shapes, nothing that can wander between drawings (pins, logos, scars, asymmetric patches).
10. **Grade flats to the design, key on magenta with despill, and beware glass.** Each flat colour is graded to the
    design's at the cut so takes agree. Glasses and visors let the key colour through, and translucent dust or
    smoke painted over the key cannot be keyed: reject those takes.
11. **No text, brand marks or real-looking insignia inside generated art.** The model invents them, they change
    between drawings, and they may resemble real marks.
12. **Passing the automatic checks is not acceptance.** They catch a limb off its layout or a colour off the design
    (about 110 of 355 takes); they passed a sheet where Juno held an invented gadget. A person looks at every
    drawing that goes in.
13. **Change an expression by editing the accepted drawing, then register and grade the edit to its base**
    (`pipeline/match.py`): edits come back two or three pixels off and a few levels off in colour, which jumps
    when swapped. Keep edit wording narrow and re-check the whole picture; "streaming hair" grew ribbons.

**Looking**
14. **Judge every drawing and every frame at FULL resolution, on CONSECUTIVE frames.** Never on a contact sheet or
    sampled stills: twice, work that looked fine small was rejected at full size, and stills miss what happens
    between two frames. Contact sheets are for finding which frames to open.
15. **Only a human can judge motion.** `engine/motion.mjs` measures feet, pops and jumps; it cannot see whether a
    movement reads. Say plainly in your report what was watched as video by a person, what was only checked as
    frames, and what was only measured.
16. **Check Japanese (and any script you cannot read at a glance) by rendering it** and reading the pixels, not the
    code. A sign lost its last letter to overflow; one word was a homonym for "cremation". `docs/japanese.md`.

**Music**
17. **Measure the music before storyboarding.** The storyboard is re-fitted to the song, not the song to the board.
18. **Beats are not kicks.** A beat tracker gives a grid; the kick drum is an event in the drum stem. The film's
    first drop was a whole beat late until the kick was measured from the stem. Hang hits on `kick` (or a stem's
    onsets), cuts on `bar`/`beat`.
19. **Transcription is not alignment.** A speech model put the lyrics seconds from where they were sung. Words were
    right only after the known lyric was aligned against the vocal stems, word by word, each on its own onset (not
    on a level peak). A held word chopped by a gate is one word, not a chant.
20. **Every cut and every hit is a mark, and marks are checked** (`engine/marks.mjs`, within 0.75 of a frame). The
    film has 469, none off. A number typed by eye will be wrong by a frame or five.

**Staging**
21. **Cause and effect must read at a glance.** Check the physical logic of each action: a plug that did not fit its
    socket, a door that was smashed and then worked in the next shot, blasts that read as "explosions, then it falls"
    instead of "it is cut loose" were all sent back.
22. **Feet plant.** A character who walks or runs is an actor on the skeleton moving at the speed of its stride
    (`kits/cast.js` `STRIDE`), so `engine/motion.mjs` can measure it. A single held drawing slid across the frame
    floats; the owner saw it every time.
23. **A cel is flat, at the depth of the character's middle.** Where a lean would put part of it behind something
    it is in front of, use `over: true`; `render.mjs --over` shows what the set hides.
24. **Use a hero cel when no view fits the camera** (more than 30 degrees round or 15 in height from the view;
    `motion.mjs` reports it). A view stretched to a camera it was not drawn for looks wrong before anyone can say why.
25. **Light a moving figure with `steady: n`** when it crosses pools of light, or its tint strobes every few frames.
26. **Effects are hard flat shapes on twos** (`engine/fx.js`), not particles or glows; soft soot read as bruises.
    Sound words stay in frame and clear of faces, and only one is lettered where hits come faster than reading.

**Working**
27. **After a rejection, fix the pipeline, not the number.** The same mistake returns in the next drawing otherwise.
28. **Add a set or engine feature as an option that defaults off, and prove old frames are unchanged** by rendering
    the same frames before and after, the same way, and comparing files. (Renders repeat to the eye, not always to
    the byte: see Known limitations.)
29. **Parallel agents in one tree**: give each its own files (a section's shots, a character's kit), prefix action
    and file names (`gant_`, `reun_`), commit with explicit paths (`git add shots/x.js`, never `-A`), and never run
    two renders into one output folder. Kit logs are append-only: commit your own lines only.

## Known limitations

- Verified on Linux with Intel graphics and with software rendering; macOS and Windows are untested.
- The four characters have a run from several views and a handful of other actions; anything else (a walk for all,
  sitting, talking) is a new action to lay out and paint, or a hero cel. Only Juno has `idle`. `docs/cast.md` lists
  exactly what exists.
- Sets are the film's space station. A different world means new sets (`docs/sets.md`); that is real work.
- Built-in sets and many film shots draw 2D overlays in 1920x1080 pixels; previews at other sizes are only safe for
  shots written to scale (the starter is).
- Without stems, stems are stand-ins cut from the mix and the kick is an estimate (82% of real kicks found on the
  demo song, 4% false). Beat tracking can be wrong on sparse or unusual music; check the bar line by ear.
- `analysis/song.py --lyrics` is a rough first draft of a word timeline; correct it by ear.
- Renders repeat to the eye, not always to the byte. Of fifty film frames rendered twice the same way, 47 were
  identical files and 3 (atrium, shaft) differed by a few levels in a few hundred pixels, on the untouched original
  code too. A frame rendered in the middle of a long run differs from the same frame rendered alone at the edges
  of drawings (Chrome resamples a drawing differently once it has drawn it at other sizes), and the split screen's
  grain depends on what was rendered before it. None of it is visible; all of it defeats a naive file comparison.
- There is no CI. `npm test` is the gate; run it before pushing.
