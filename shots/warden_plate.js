// The guide for the warden's one drawn plate (kits/warden/head_*.png; shots/reun_fight.js nover): its head on the deck
// from that shot's own camera, without Noor. node render.mjs shots/warden_plate.js --out out/warden_plate
//   frame 0: the head, eyes lit;  1: the same place without it (the two differ where the head is: its matte);  2: eyes out
import { nover } from "./reun_fight.js";
const at = (f, w) => { const o = nover.frame(f); return { set: o.set, camera: o.camera, options: w === null ? { ...o.options, warden: null } : o.options, actors: [], post: { vignette: 0, grain: 0, ca: 0 } }; };
export default { name: "warden_plate", start: nover.start, frames: 3, sets: ["atrium"], cast: {}, frame: (f) => f === 0 ? at(14) : f === 1 ? at(14, null) : at(26) };
