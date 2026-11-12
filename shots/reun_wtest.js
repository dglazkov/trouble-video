// Look-development of the reunion's set pieces: node render.mjs shots/reun_wtest.js --frames 0,1 --out out/reun_wtest
import { NIGHT } from "./reun_cast.js";
const V = [
  { camera: { pos: [3, 7, 58], target: [0, 0, 64], fov: 50 }, options: { ...NIGHT, hatch: [{ z0: 67.2, z1: 73.2, fall: 2, tilt: 0.3 }, { z0: 60.35, z1: 60.85 }] } },
  { camera: { pos: [0.35, 1.32, 55.4], target: [0, 1.12, 62], fov: 30 }, options: { ...NIGHT, drop: 0.3, hatch: [{ z0: 67.2, z1: 73.2 }, { z0: 60.35, z1: 60.85 }] } },
];
export default { name: "reun_wtest", start: 133, frames: V.length, sets: ["atrium"], cast: {}, frame: (f) => ({ set: "atrium", ...V[f], actors: [] }) };
