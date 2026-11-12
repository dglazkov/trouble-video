// Look-development stills of the shaft, to be read at full size: node render.mjs shots/set_shaft.js --frames 0,1,2,3,4,5,6,7 --out out/set_shaft
//   0 from the collar, down   1 beside the plant, across   2 down past the market   3 up from the stairwell
//   4 across at the atrium   5 the vault, across   6 down from the vault into the dark   7 below everything, up
import { levelMid, levelOf } from "../sets/shaftplan.js";
const at = (n, dy = 0) => levelMid(levelOf(n)) + dy;
const V = [
  { camera: { pos: [1.5, -4, 2], target: [0, -60, 0], fov: 50, up: [0, 0, -1] } },
  { camera: { pos: [0, at("plant", 0.5), -6], target: [0, at("plant"), 8], fov: 42 } },
  { camera: { pos: [2, at("market", 6), -3], target: [-0.5, at("market", -40), 0.5], fov: 50, up: [0, 0, 1] } },
  { camera: { pos: [-2, at("stair", -3), 3], target: [0.5, at("stair", 60), -0.5], fov: 50, up: [0, 0, 1] } },
  { camera: { pos: [-3, at("atrium", 1), -5.5], target: [1, at("atrium", -0.5), 8], fov: 42 } },
  { camera: { pos: [3, at("vault", -1), -6], target: [-2, at("vault", 0.5), 8], fov: 42 } },
  { camera: { pos: [1, at("vault", 3), 1], target: [0, at("vault", -60), 0], fov: 50, up: [0, 0, 1] } },
  { camera: { pos: [1, at("deep", -80), 1], target: [0, 0, 0], fov: 50, up: [0, 0, 1] } },
];
export default { name: "set_shaft", start: 150, frames: V.length, sets: ["shaft"], frame: (f) => ({ set: "shaft", camera: V[f].camera, options: { rooms: 1, lamps: 0.8 } }) };
