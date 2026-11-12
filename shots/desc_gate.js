// Descent 3, 23.21-24.04 s: NOOR TAKES THE LIFT. Square on the cage at the top landing: Noor inside, arms folded,
// looking at nothing. The folding gate rattles across a notch on each hit (the brass, the drums, the bar line), latches
// on the next, and the cage drops out of the picture with Noor in it, in no hurry at all.
import { FPS, CUT, CAST, startOf, boil, wob, facing } from "./desc_cast.js";
import { LIFT } from "../sets/stairplan.js";
const FRAMES = CUT.shaft - CUT.gate, NOTCH = [3, 7, 10], LATCH = 15, GO = 16;      // frames of this shot
export const gateAt = (f) => { let g = 0; NOTCH.forEach((n, i) => { if (f >= n) g = [0.36, 0.72, 1][i] + (f === n ? -0.06 : f === n + 1 ? 0.03 : 0); }); return Math.min(1, g); };
function frame(f, sync) {
  const drop = f < GO ? 0 : -0.045 * (f - GO + 1) ** 2, jolt = Math.max(...[...NOTCH, LATCH].map((n) => f >= n ? Math.exp(-(f - n) / 1.3) : 0)), k = f / FRAMES;
  const cam = { pos: [LIFT.x + 0.25 + 0.012 * jolt * wob(f, 9, 14, 1), 1.5 + 0.012 * jolt * wob(f, 11, 17, 2), 6.5 - 0.5 * k], target: [LIFT.x, 1.36, LIFT.z], fov: 24 };
  return { set: "stairwell", camera: cam,
    options: { lift: { y: drop, gate: gateAt(f), lamp: f >= LATCH ? 1 : 0, going: f >= GO ? 1 : 0 }, alert: 0.5 },
    post: { ca: 0.0012 + 0.003 * jolt },
    actors: [{ who: "noor", action: "desc_cage", phase: 0, hero: "lift", x: LIFT.x, y: drop, z: LIFT.z, yaw: facing([LIFT.x, 0, LIFT.z], cam.pos), shadow: false, layer: boil(f, 1.0) }] };
}
export default { name: "desc_gate", start: startOf("gate"), frames: FRAMES, fps: FPS, cutOn: "beat", sets: ["stairwell"], cast: CAST, frame,
  marks: [{ at: NOTCH[0], what: "the gate: first notch", on: "brass" }, { at: NOTCH[1], what: "the gate: second notch", on: "drums" }, { at: NOTCH[2], what: "the gate shuts", on: "bar" }, { at: LATCH, what: "it latches; the cage goes", on: "brass" }] };
