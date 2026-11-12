// Opening 1, 0.00-1.88 s: black. One screen comes on in front of us and says the line, a word at a time, as the
// voice says it: "You're in deep trouble, mister." On "mister" it cocks its head. We are where the four are standing.
import { FPS, CUT, startOf, cues, ease, wob } from "./open_cast.js";
import { FIRST } from "../sets/vault.js";
const FRAMES = CUT.room - CUT.wake, EYE = [0.45, 1.5, 3.2];
function frame(f, sync) {
  const F = CUT.wake + f, k = f / FRAMES, c = cues(F), d = [EYE[0] - FIRST[0], EYE[1] - FIRST[1], EYE[2] - FIRST[2]], l = Math.hypot(...d), far = 2.55 - 0.5 * ease(k);
  const lean = F >= 37 ? ease((F - 37) / 4) : 0;
  return { set: "vault",
    camera: { pos: [FIRST[0] + d[0] / l * far + wob(f, 0.21, 0.13, 1) * 0.01, FIRST[1] + 0.06 + d[1] / l * far + wob(f, 0.17, 0.11, 2) * 0.008, FIRST[2] + d[2] / l * far], target: [FIRST[0], FIRST[1] + 0.02, FIRST[2]], fov: 23, up: [Math.sin(0.03 * lean), Math.cos(0.03 * lean), 0] },
    options: { ...c, focus: EYE, tilt: -11 * lean, gold: 0 },
    post: { bloom: 1.25, bloomThreshold: 0.5, vignette: 0.5, grain: 0.05, ca: 0.0016 + (F === 2 || F === 4 ? 0.004 : 0) } };
}
export default { name: "open_wake", start: startOf("wake"), frames: FRAMES, fps: FPS,
  marks: [{ at: 2, what: "the first screen comes on: \"You're\"", on: "lead_vocals" }, { at: 16, what: "\"deep\"", on: "lead_vocals" }, { at: 23, what: "\"trouble\"", on: "lead_vocals" }, { at: 37, what: "\"mister\": the screen cocks its head", on: "lead_vocals" }, { at: 41, what: "the other screens start to come on", on: "strings" }], sets: ["vault"], frame };
