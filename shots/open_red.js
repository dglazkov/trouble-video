// Opening 7, 14.17-14.71 s: "We're in deep" (3). From above the four, the floor's rings of light turn red under
// them, the outermost first, one every four frames.
import { FPS, CUT, CAST, KIDS, startOf, cues, kid, boil, ease } from "./open_cast.js";
import { swarm } from "./open_drones.js";
const FRAMES = CUT.back - CUT.red;
function frame(f, sync) {
  const F = CUT.red + f, k = f / FRAMES, turn = f % 4 === 0 && f < 12;
  return { set: "vault", camera: { pos: [0.5, 2.55 + 0.1 * k, 9.5], target: [0.3, 0.55, 1.6], fov: 55 - 3 * ease(k) },
    options: { ...cues(F), drones: swarm(F) }, post: { ca: 0.0016 + (turn ? 0.005 : 0), flash: turn ? 0.16 : 0, bloom: 1.2 },
    actors: KIDS.map((who, i) => kid(who, 1, { layer: boil(f + i) })) };
}
export default { name: "open_red", start: startOf("red"), frames: FRAMES, fps: FPS, cutOn: "backing_vocals", marks: [{ at: 0, what: "the first ring of the floor turns red", on: "backing_vocals" }], sets: ["vault"], cast: CAST, frame };
