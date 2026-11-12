// The slice, 48.0-62.0 s of the song: the six shots cut together. node render.mjs shots/slice.js -> out/slice.mp4
import { edit } from "../engine/edit.js";
import run from "./slice_run.js"; import faces from "./slice_faces.js"; import drop from "./slice_drop.js"; import tane from "./slice_tane.js"; import ride from "./slice_ride.js"; import leap from "./slice_leap.js";
export default edit("slice", [run, faces, drop, tane, ride, leap]);
