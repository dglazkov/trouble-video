// The core, 78.875-92.9 s of the song (frames 1893-2229): the seven shots cut together. node render.mjs shots/core.js -> out/core.mp4
import { edit } from "../engine/edit.js";
import duct from "./core_duct.js"; import play from "./core_play.js"; import open from "./core_open.js"; import drift from "./core_drift.js"; import grid from "./core_grid.js"; import face from "./core_face.js"; import close from "./core_close.js";
export default edit("core", [duct, play, open, drift, grid, face, close]);
