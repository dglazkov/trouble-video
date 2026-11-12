// Opening 5, 10.17-10.83 s: the other three shutters, round the room behind us, in one whip of the camera: one per
// string hit (10.17, 10.38, 10.59 s), and it lands on the one doorway left open, with a punch in on the fourth hit.
import { FPS, CUT, SHUTS, startOf, cues, ease } from "./open_cast.js";
import { bayAt } from "../sets/vault.js";
const FRAMES = CUT.drones - CUT.ring, EYE = [0.3, 1.7, 4.9], STOPS = [[0, 5], [5, 6], [10, 7], [14, 0]];      // [frame it is looked at from, bay]
const dirTo = (k) => { const p = bayAt(k); return Math.atan2(p[0] - EYE[0], p[2] - EYE[2]); };
function frame(f, sync) {
  const F = CUT.ring + f; let i = STOPS.length - 1; while (STOPS[i][0] > f) i--;
  const a0 = dirTo(STOPS[i][1]), n = STOPS[i + 1], u = n ? ease((f - STOPS[i][0] - 1) / (n[0] - STOPS[i][0] - 1)) : 0, a = n ? a0 + (dirTo(n[1]) - a0) * u * u : a0;
  const whip = n ? Math.abs(dirTo(n[1]) - a0) * (u > 0.02 && u < 0.98 ? 1 : 0) : 0, land = f - STOPS[i][0];
  return { set: "vault", camera: { pos: EYE, target: [EYE[0] + Math.sin(a) * 8, 2.15 + (land === 0 ? 0.08 : 0), EYE[2] + Math.cos(a) * 8], fov: i === 3 && land >= 1 ? 30 : 44 },
    options: { ...cues(F) }, post: { bgStreak: [0.035 * whip, 0], ca: 0.0014 + (land < 2 ? 0.005 : 0), flash: land === 0 && i < 3 ? 0.2 : i === 3 && land === 1 ? 0.12 : 0 } };
}
export default { name: "open_ring", start: startOf("ring"), frames: FRAMES, fps: FPS, cutOn: "strings",
  marks: [...SHUTS.filter(([, hit]) => hit >= CUT.ring).map(([bay, hit]) => ({ at: hit - CUT.ring, what: `shutter lands (bay ${bay})`, on: "strings" })), { at: 15, what: "a punch in on the one open doorway", on: "strings" }], sets: ["vault"], frame };
