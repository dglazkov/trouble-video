// The whole film, 0:00-2:44.8: the ten sections cut together in order.
//   node render.mjs shots/film.js              -> out/film.mp4 (3956 frames; 29 minutes on a laptop GPU, 1.4 GB)
//   node engine/marks.mjs shots/film.js        every cut and hit of the film against the song
// An edit of edits is the edit of all their shots (engine/edit.js), so each frame here is the frame its section renders
// on its own. A film of your own is the same file with your sections in it.
import { edit } from "../engine/edit.js";
import open from "./open.js"; import descent from "./descent.js"; import gantry from "./gantry.js"; import slice from "./slice.js"; import wins from "./wins.js";
import core from "./core.js"; import boom from "./boom.js"; import breakdown from "./breakdown.js"; import reunion from "./reunion.js"; import fall from "./fall.js";
export default edit("film", [open, descent, gantry, slice, wins, core, boom, breakdown, reunion, fall]);
