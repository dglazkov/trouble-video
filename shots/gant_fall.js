// Gantry 7, 37.88-38.71 s: the drone goes down. From among the pistons, looking up: the gantry overhead, the board on
// the far wall; the machine falls spinning toward us and a piston head comes up to meet it on the drum (919): it
// bursts, and the board says DEEP.
import { FPS, CUT, startOf, sign, wob, ease, SIGN_MARKS } from "./gant_cast.js";
import { HIT_AT } from "./gant_tane.js";
const FRAMES = CUT.doors - CUT.fall, BURST = 919 - CUT.fall, END = [7.3, -8.6, 46.2];      // the piston block it lands on (sets/gantry.js: x 7.2, z = 8n + 6)
function frame(f, sync) {
  const F = CUT.fall + f, since = f - BURST, jolt = since >= 0 ? Math.exp(-since / 3) : 0, k = Math.min(1, f / BURST), shake = 0.02 + 0.16 * jolt;
  const from = [HIT_AT[0] + 2.2, 2.6, HIT_AT[2] - 1.9], pos = [from[0] + (END[0] - from[0]) * k, from[1] + (END[1] - from[1]) * k * k + 1.2 * k * (1 - k), from[2] + (END[2] - from[2]) * k];
  return { set: "gantry",
    camera: { pos: [10.7 + shake * wob(f, 9, 14, 1), -9.2 + shake * wob(f, 11, 17, 2), 52.7], target: [3.4 + 2.4 * ease(k), -3.0 - 3.4 * ease(k), 45.6], fov: 52 - 6 * ease(k) },
    options: { sign: sign(F), alert: 0.6, drones: [{ type: "chaser", pos: since >= 0 ? END : pos, yaw: 40 + f * 47, pitch: f * 61, roll: f * 83, eye: since >= 0 ? 0 : 0.4 + 0.6 * (f % 2), thrust: 0, scale: since >= 0 ? 2.6 : 1.5, seed: 12, broken: since >= 0 ? since / FPS : null }] },
    post: { flash: since >= 0 && since < 6 ? [0.85, 0.55, 0.36, 0.22, 0.12, 0.05][since] : 0, ca: 0.0014 + 0.008 * jolt, bloom: 1.0 + 0.9 * jolt, bgBlur: since >= 0 ? 0.02 * jolt : 0, focus: [0.5, 0.45] } };
}
export default { name: "gant_fall", start: startOf("fall"), frames: FRAMES, fps: FPS, cutOn: "beat", marks: [{ at: BURST, what: "the drone bursts on a piston head", on: "drums" }, ...SIGN_MARKS(CUT.fall, CUT.doors)], sets: ["gantry"], frame };
