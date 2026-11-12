// The atrium's layout guides: the blockout (sets/atrium.js, guide: true) from the camera the vista was painted for,
// HERO, with the wider lens the paintings cover. Frame 0 is the guide a painting is made over; frames 1 and 2 are the
// same view with and without the core and its bridges (their difference is where the tower's layer may be).
//   node render.mjs shots/atrium_plate.js --frames 0,1,2 --out out/atrium/plate
import { HERO } from "../sets/atriumplan.js";
const cam = { pos: HERO.pos, target: HERO.target, fov: HERO.wide }, flat = { ink: 0, grain: 0, vignette: 0, ca: 0, bloom: 0, diffusion: 0 };
const V = [{ guide: true, gantry: false, post: { ...flat, ink: 0.5 } }, { guide: true, gantry: false, post: flat }, { guide: "wall", gantry: false, post: flat }];
export default { name: "atrium_plate", start: 21.0, frames: V.length, sets: ["atrium"], frame: (f) => ({ set: "atrium", camera: cam, options: V[f] }) };
