# bakeoff/: the first day's experiments (history; nothing uses these)

Before the film there was a comparison of ways to make it. These folders are what was tried, kept as a record. No
shot, set, test or script outside this folder imports anything from here, and they are not maintained: paths inside
them point at files and tools that may no longer exist.

| Folder | What it was | What came of it |
|---|---|---|
| `blender/` | The corridor and a kid built and rendered in Blender (Python) | Lost to the browser on speed and look; the film renders in headless Chrome with three.js |
| `web/` | The same shot in the browser: the first corridor, character and photography pass | Became `sets/`, `engine/post.js` and the stage |
| `parts/` | A puppet assembled from separately drawn body parts | **Rejected by the owner outright** ("a body horror of misalignments"). Characters became whole-figure drawings: see the first rule in `CLAUDE.md` |
| `face/` | Faces traced and rasterised from reference drawings | Superseded by close-up plates with edited expressions |
| `pose/` | A pose guide rendered for the image model to draw over | Became `pipeline/layout.mjs`: every drawing is painted over the skeleton's own mannequin |

`art/` at the top level is from the same days: `art/cast/` are the sketches each character's design started from
(each `kits/NAME/character.json` names its `origin`), and `art/ref/test_face.png` is still the style reference the
pipeline shows the image model.
