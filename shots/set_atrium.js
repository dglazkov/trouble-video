// Look-development stills of the atrium's painted vista, to be read at full size: node render.mjs shots/set_atrium.js --frames 0,1,2,3,4,5 --out out/set_atrium
//   0 the hero camera by day   1 the alarm three bands out   2 the alarm everywhere   3 from eight metres further back and up (parallax)
//   4 at the doorway, before the camera lets go   5 the paintings alone: no gantry, no figures
import { HERO } from "../sets/atriumplan.js";
import { CAST } from "./desc_cast.js";
const hero = { pos: HERO.pos, target: HERO.target, fov: HERO.fov }, T = { text: "TROUBLE", small: "トラブル", alarm: 1 };
const V = [
  { camera: hero, options: { vista: 1 } },
  { camera: hero, options: { vista: 1, alert: 1, alarm: { gantry: 30, rings: 3 }, screens: T } },
  { camera: hero, options: { vista: 1, alert: 1, alarm: { gantry: 200, rings: 60 }, screens: T } },
  { camera: { pos: [18, 13.5, 51], target: [-17, -27, -10], fov: HERO.fov }, options: { vista: 1 } },
  { camera: { pos: [0.45, 0.4, 5.5], target: [-0.1, 1.12, 1.9], fov: 50 }, options: {} },
  { camera: hero, options: { vista: 1, gantry: false }, actors: [] },
];
const PLACE = { tane: [-0.95, 0, 0.1], ife: [0.3, -0.9, 0.7], juno: [1.05, -1.3, 0.55], noor: [-0.4, -1.9, 0.3] };
export default { name: "set_atrium", start: 21.6, frames: V.length, sets: ["atrium"], cast: CAST, frame: (f) => ({ set: "atrium", ...V[f],
  actors: V[f].actors ?? Object.entries(PLACE).map(([who, [x, dz, ph]]) => ({ who, action: "run", view: "front", phase: ph, yaw: 0, x, z: (f === 4 ? 2.5 : 18) + dz })) }) };
