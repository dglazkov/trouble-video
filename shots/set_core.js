// Look-development stills of the core, to be read at full size: node render.mjs shots/set_core.js --frames 0,1,2,3,4,5,6 --out out/set_core
//   0 from the duct to its mouth   1 at the lip, the core beyond   2 adrift, from in front (the wall and the duct behind)
//   3 the lattice from behind and above   4 from the island, the enforcer in the grid   5 the same, cut   6 the far plate alone
import { CAST, noorAt, enforcerAt, beamsAt, awake, EMITTERS, CUTS, slabAt, EV } from "./core_cast.js";
import { HERO } from "../sets/coreplan.js";
const V = [
  { F: 1900, camera: { pos: [0.5, 1.5, -9], target: [0, 1.5, 0], fov: 40 } },
  { F: 1960, camera: { pos: [0.9, 1.9, -4.6], target: [0.5, 1.5, 6], fov: 38 } },
  { F: 2060, camera: { pos: [3.2, 1.2, 12.5], target: [0.4, 1.9, 6.5], fov: 36 } },
  { F: 2091, camera: { pos: [-2.6, 5.4, 3.4], target: [0.6, 1.4, 13], fov: 42 } },
  { F: 2200, camera: { pos: [3.4, 1.5, 26.5], target: [1.0, 1.6, 12], fov: 24 } },
  { F: 2226, camera: { pos: [2.6, 2.3, 14.5], target: [0, 1.9, 9.6], fov: 40 } },
  { F: 2214, camera: { pos: [2.6, 2.3, 14.5], target: [0, 1.9, 9.6], fov: 40 } },
  { F: 2000, camera: { pos: HERO.pos, target: HERO.target, fov: HERO.fov }, bare: true },
];
export default { name: "set_core", start: 0, frames: V.length, sets: ["core"], cast: CAST, frame: (f) => { const v = V[f], F = v.F, n = noorAt(F), e = enforcerAt(F), t = (F - EV.cut) / 24;
  return { set: "core", camera: v.camera, post: globalThis.location?.search.includes("plain") ? { bloom: 0, diffusion: 0, contrast: 0 } : {}, options: { far: 1, beams: v.bare ? [] : beamsAt(F), emitters: EMITTERS.map((x, i) => ({ ...x, on: awake(F)[i] })), drones: F < EV.cut ? [e] : [],
      slabs: F >= EV.cut ? { pos: e.pos, cuts: CUTS, at: [0, 1, 2, 3, 4].map((j) => slabAt(j, t)), heat: Math.max(0, 1 - t * 1.2) } : null },
    actors: v.bare ? [] : [{ who: "noor", action: F < EV.off ? "core_step" : F >= EV.land ? "core_land" : "core_drift", phase: F < EV.step ? 0 : F >= EV.land ? 0.5 : 0.6, x: n.x, y: n.y, z: n.z, yaw: 0, shadow: F < EV.off || F >= EV.land }] }; } };
