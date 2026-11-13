# Licence for the characters and the art: CC BY 4.0

The characters **Juno, Tane, Ife and Noor**, the crowd, and all the pictures in this repository (drawings, model
sheets, close-ups, painted backgrounds, sketches, and the images made from them) are licensed under the
**Creative Commons Attribution 4.0 International** licence.

- Summary: https://creativecommons.org/licenses/by/4.0/
- Full legal text: https://creativecommons.org/licenses/by/4.0/legalcode

You may copy, redistribute, remix, transform and build on them, for any purpose including commercial ones, as long as
you give credit.

## How to give credit

> Characters and art from "Trouble" by Dimitri Glazkov, https://github.com/dglazkov/trouble-video, CC BY 4.0.

Say if you changed them ("adapted from ..."). A line like this in your video's description, credits or README is
enough. Do not suggest that Dimitri Glazkov endorses your work.

## What this covers, by path

| Path | What is there |
|---|---|
| `kits/` | The cast and the crowd: `character.json` (each design in words and colours), `design/` (model sheets), the cut drawings (`ACTION/VIEW/*.webp`, `hero/`, `fall/`, the crowd's folders), `closeup/` (plates and close-ups), `source/` (the sheets as generated, their layouts), the `.json` sidecars with each image's prompt, and `log.jsonl` |
| `art/cast/`, `art/ref/` | Early sketches of the cast and the style references |
| `sets/atrium/`, `sets/core/`, `sets/shaft/` | The painted backgrounds and their sidecars |
| `machines/warden/` | The boss machine's drawn head and its sources |
| `docs/img/`, `test/ref/` | Pictures made from the above for the documentation and the tests |

Frames and videos you render from this repository contain these characters and so carry the same credit.

## What it does not cover

- **Code** (every `.js`, `.mjs`, `.py`, `.sh`, `.html` file, wherever it is, including `kits/cast.js`, `kits/crowd/cut.py`
  and `art/gen.py`): Apache-2.0, see [LICENSE](LICENSE). That includes the sets and machines as code: the corridor,
  the drones and the rest are programs, and are Apache-2.0.
- **The song** (`audio.wav`) and its words: not licensed for reuse, see [LICENSE-SONG.md](LICENSE-SONG.md).
- **The font** in `fonts/`: SIL Open Font License 1.1, see `fonts/OFL.txt`.

## How the art was made

Plainly: these images were **generated with Google's Gemini image models** ("Nano Banana 2"; `art/gen.py` names the
model) from prompts and direction written for this project by Dimitri Glazkov and the coding agent working for him,
over layouts rendered from the project's own skeleton and sets; they were then selected, edited, colour-graded,
keyed, cut and composited with the tools in `pipeline/`. They were not drawn by hand. The prompt and the reference
images for every picture are in the `.json` file beside it.

How far copyright reaches into machine-generated pictures differs from country to country and is not settled. This
licence grants you everything Dimitri Glazkov is able to grant in them; where the law gives no one exclusive rights
in a picture, you need no licence for it, and the request for credit stands as a courtesy.
