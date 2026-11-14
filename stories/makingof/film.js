// The making-of of "Trouble": eleven chapters cut to stories/makingof/audio.wav (the song rebuilt from its stems).
//   npm run makingof      (node render.mjs stories/makingof/film.js --mp4 out/makingof/makingof.mp4)   -> out/makingof/frames/, out/makingof/makingof.mp4
//   node engine/marks.mjs stories/makingof/film.js                     every cut and entrance against the music
//   node stories/makingof/check.mjs                                    quotes, numbers, reading time, the tally
// It needs the film's own frames in out/film/frames/ (npm run film) for the passages that are the film.
import { edit } from "../../engine/edit.js";
import { ALL } from "./chapters.js";
export default edit("makingof", ALL);
