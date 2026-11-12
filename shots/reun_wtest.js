// Look-development of the warden on the atrium's gantry: node render.mjs shots/reun_wtest.js --frames 0,1,2,3,4,5,6,7 --out out/reun_wtest
import { stalk } from "../machines/warden.js";
const A = { vista: 1, alert: 1, alarm: { gantry: 200, rings: 60 } };
const base = { pos: [0, 0, 60], yaw: 180, look: [0, 1.5, 40] };
const V = [
  { camera: { pos: [14, 9, 30], target: [0, 5, 58], fov: 50 }, warden: base },
  { camera: { pos: [0.8, 1.2, 38], target: [0, 6, 60], fov: 55 }, warden: { ...base, reach: 1 } },
  { camera: { pos: [30, 3, 60], target: [0, 5, 60], fov: 40 }, warden: base },
  { camera: { pos: [14, 9, 30], target: [0, 5, 58], fov: 50 }, warden: { ...base, assemble: 0.0 } },
  { camera: { pos: [14, 9, 30], target: [0, 5, 58], fov: 50 }, warden: { ...base, assemble: 0.55 } },
  { camera: { pos: [14, 9, 30], target: [0, 5, 58], fov: 50 }, warden: { ...base, assemble: 0.9 } },
  { camera: { pos: [14, 9, 30], target: [0, 5, 58], fov: 50 }, warden: { ...base, broken: { leg1: 0.5, leg3: 0.3, arm: 0.2 }, roll: -14, deck: { y: 0, half: 2.2, x: 0 } } },
  { camera: { pos: [14, 9, 30], target: [0, 5, 58], fov: 50 }, warden: { ...base, broken: { all: 0.6 }, deck: { y: 0, half: 2.2, x: 0 } } },
];
export default { name: "reun_wtest", start: 133, frames: V.length + 48, sets: ["atrium"], cast: {},
  frame: (f, sync) => f < V.length ? { set: "atrium", camera: V[f].camera, options: { ...A, warden: V[f].warden }, actors: [] }
    : { set: "atrium", camera: { pos: [10, 4, 30], target: [0, 5, 50], fov: 50 }, options: { ...A, warden: { yaw: 180, look: [0, 1.5, 30], ...stalk(133 * 24 + f, sync, { from: [0, 0, 62], yaw: 180, per: 1.5, k0: 60 }) } }, actors: [] } };
