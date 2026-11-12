// Look-development of the warden (machines/warden.js) in the reunion's night: node render.mjs shots/warden_look.js --out out/warden_look
// Frames 0-7 are views round it standing on the gantry (front three-quarter, back, side, the head, from above, from below);
// from 8 on, the fight's own cameras at a few of its moments.
import { NIGHT } from "./reun_cast.js";
import { stance } from "../machines/warden.js";
const Z = 80, W = { pos: [0, 0, Z], yaw: 180, deck: { y: 0, half: 2.25, x: 0 }, look: [3, 2, 60], reach: 0.3, eye: 1.3, sway: 0.3, feet: stance([0, 0, Z], 180) };
const V = [
  { pos: [9, 3, 62], target: [0, 5, 78], fov: 46 }, { pos: [11, 8, 96], target: [0, 5, 80], fov: 46 }, { pos: [-20, 4, 80], target: [0, 5, 79], fov: 46 }, { pos: [3.5, 4.5, 66.5], target: [0.2, 4.6, 73.5], fov: 40 },
  { pos: [4, 20, 70], target: [0, 4, 80], fov: 46 }, { pos: [1.5, 0.6, 70], target: [0, 5.5, 80], fov: 56 }, { pos: [-7, 7, 90], target: [0, 6, 80], fov: 40 }, { pos: [5, 1.2, 76], target: [2.2, 0.6, 80], fov: 40 },
];
export default { name: "warden_look", start: 133, frames: V.length, sets: ["atrium"], cast: {}, frame: (f) => ({ set: "atrium", camera: V[f], options: { ...NIGHT, alert: 1.2, warden: W }, actors: [] }) };
