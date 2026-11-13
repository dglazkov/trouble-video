// Which song a shot is cut to, for the tools that run in Node (render.mjs, engine/marks.mjs, engine/motion.mjs ...).
// A shot (or an edit) may say `song: "stories/mine"`: a folder, from the project's root, that holds the song and what
// was measured of it:
//   audio.wav (or .mp3 .flac .m4a .ogg)   the music; render.mjs lays it under the video
//   listen.json                           beats, sections, tempo            (analysis/song.py writes these three)
//   stems.json                            per-stem loudness and onsets, the kick among them
//   lyrics.json                           optional: the sung words on one timeline
// A shot that says nothing is cut to the demo song this repository was made for: audio.wav and analysis/ at the root.
// The stage (engine/stage.js) reads the same folder in the page, so pictures and checks hear one song.
import fs from "node:fs"; import path from "node:path";
import { createSync } from "./sync.js";
import { ROOT } from "../pipeline/env.mjs";
export { ROOT };
const AUDIO = [".wav", ".flac", ".mp3", ".m4a", ".ogg", ".aac"];

export function songOf(shot) {
  const dir = shot.song ? path.resolve(ROOT, shot.song.replace(/^\//, "")) : path.join(ROOT, "analysis");
  if (!fs.existsSync(dir)) throw new Error(`${shot.name}: its song folder ${path.relative(ROOT, dir)} does not exist`);
  const audio = shot.song ? AUDIO.map((e) => path.join(dir, "audio" + e)).find((f) => fs.existsSync(f)) ?? null : path.join(ROOT, "audio.wav");
  const read = (f, need) => {
    const p = path.join(dir, f);
    if (!fs.existsSync(p)) { if (need) throw new Error(`${path.relative(ROOT, p)} is missing: measure the song first (python analysis/song.py AUDIO --out ${path.relative(ROOT, dir)})`); return null; }
    return JSON.parse(fs.readFileSync(p, "utf8"));
  };
  const listen = read("listen.json", true), stems = read("stems.json", true), lyrics = read("lyrics.json", false);
  return { dir, audio, listen, stems, lyrics, sync: createSync(listen, stems, { lyrics }) };
}
