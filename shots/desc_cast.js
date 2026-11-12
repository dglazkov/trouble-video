// The descent, song 19.92-29.83 s (frames 478-715): what its shots share. Frames here are frames of the SONG; each shot
// counts its own from its cut. Every cut and hit is on a beat or an onset of analysis/ (engine/sync.js): each shot
// lists its own as `marks`, and `node engine/marks.mjs shots/descent.js` holds them to the song.
//   out    478  out of the vault's doorway onto the gantry, and back, and back: the atrium. On the second "Trouble!"
//               (518) every screen in it says so and the alarm runs down the gantry; the rings answer on the brass
//   head   537  the stairwell from straight above: the four come in along the walkway; Noor peels off to the lift
//   gate   557  Noor in the lift cage: the gate rattles shut a notch on each hit, latches, and the cage drops
//   shaft  577  down the shaft beside them: Tane rail to rail (a landing on every other beat), Juno down the handrails,
//               Ife on every single step, Noor going down in the cage at the camera's own pace
//   ding   656  the bottom: the lift arrives on the hit (666); a cut in to its gate folding back on Noor (669), a cut out
//               (677) with Noor outside it; the others arrive on the next two hits (681, 687)
//   exit   703  out of the stairwell's door onto the lower gantry, the four together again (the next section starts here)
import { proportions, solve } from "../engine/body.js";
import { actorPose } from "../engine/actions.js";
import { CAST, KIDS, STRIDE, RUN, CADENCE, ease, wob, rnd, boil } from "./open_cast.js";
export { CAST, KIDS, STRIDE, RUN, CADENCE, ease, wob, rnd, boil };
export const FPS = 24;
export const CUT = { out: 478, head: 537, gate: 557, shaft: 577, ding: 656, exit: 703, end: 716 };
export const startOf = (name) => CUT[name] / FPS;
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), lerp = (a, b, t) => a + (b - a) * t;
// what of each body its feet depend on (kits/NAME/character.json)
export const LEGS = { tane: { height: 1.7, hipW: 0.102 }, ife: { height: 1.42 }, noor: { height: 1.82 }, juno: { height: 1.6 } };
// the skeleton of an actor as a shot states it (for where its feet and hands are)
export const bones = (a) => solve(proportions(LEGS[a.who]), actorPose(a));
// a yaw that faces a point from another (degrees; 0 faces +Z)
export const facing = (from, to) => Math.atan2(to[0] - from[0], to[2] - from[2]) * 180 / Math.PI;
