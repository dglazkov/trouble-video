// The fall, 146.33 s of the song to its end (frames 3512-3955): the film's ending, thirteen shots cut together.
// node render.mjs shots/fall.js -> out/fall.mp4
import { edit } from "../engine/edit.js";
import hang from "./fall_hang.js"; import drop from "./fall_drop.js"; import side from "./fall_side.js"; import glass from "./fall_glass.js"; import below from "./fall_below.js";
import ring from "./fall_ring.js"; import dark from "./fall_dark.js"; import deep from "./fall_deep.js"; import { tane, ife, noor, juno } from "./fall_faces.js"; import black from "./fall_black.js";
export default edit("fall", [hang, drop, side, glass, below, ring, dark, deep, tane, ife, noor, juno, black]);
