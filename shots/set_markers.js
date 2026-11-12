// Camera agreement: three cameras from the set shots, each with markers at known points on the ground and at head height,
// photographed plainly (no bloom, aberration, vignette or grain) so sets/agree.mjs can find them.
import corridor from "./set_corridor.js"; import market from "./set_market.js"; import { PLAIN } from "../engine/post.js";
export const VIEWS = [
  { name: "corridor run, f24", shot: corridor, f: 24, points: [[0, 0, -22.2], [1, 0, -22.2], [-1, 0, -22.2], [0, 0, -20.2], [0, 1.6, -22.2], [1.5, 0, -19.5]] },
  { name: "corridor side-on, f135", shot: corridor, f: 135, points: [[0, 0, 21.2], [0, 1.6, 21.2], [0, 0, 19.2], [1, 0, 21.2], [-1, 0, 23.2], [0, 0, 24]] },
  { name: "market chase, f40", shot: market, f: 40, points: [[0, 0, 31], [1, 0, 31], [-1, 0, 31], [0, 1.6, 31], [0, 0, 35], [2, 0, 40]] },
];
export default { name: "set_markers", start: 0, frames: VIEWS.length, sets: [],
  frame(i, sync) { const v = VIEWS[i], fr = v.shot.frame(v.f, sync); return { set: fr.set, camera: fr.camera, options: { ...fr.options, drones: [], markers: v.points, post: PLAIN } }; } };
