// Passage 4, 42.88-44.13 s: the four, flat out, on a long lens: Juno ahead and loving it, Noor loping, Ife's legs a
// blur, Tane at the back with his head down; the three drones that got under the last door on their heels.
import { FPS, CUT, CAST, KIDS, startOf, cz, slabs, sprinter, wob } from "./gant_cast.js";
import { pack } from "./gant_slam.js";
const FRAMES = CUT.slide - CUT.sprint, JUNO = 1 / 24;      // Juno a little on in her cycle: this near, on twos, each planted foot is one drawing
function frame(f, sync) {
  const F = CUT.sprint + f, z = cz(F), k = f / FRAMES, shake = 0.02;
  return { set: "corridor",
    camera: { pos: [0.5 - 0.5 * k + wob(f, 1.9, 3.1, 1) * shake, 0.9 + wob(f, 2.3, 3.7, 2) * shake, z + 7.6 - 3.2 * k], target: [0, 1.02, z - 1], fov: 23 - 2 * k, up: [Math.sin(-0.05), Math.cos(-0.05), 0] },
    options: { junction: { z: 0 }, alert: 0.9, slabs: slabs(F), hubDoors: { A: 0, B: 0, C: 0, D: 0 }, drones: pack(F, sync).filter((d) => d.pos[2] > -71), post: { bgBlur: 0.03, focus: [0.5, 0.52] } },
    actors: KIDS.map((who) => { const a = sprinter(who, F, { steady: 5 }); return who === "juno" ? { ...a, phase: a.phase + JUNO } : a; }) };
}
export default { name: "gant_sprint", start: startOf("sprint"), frames: FRAMES, fps: FPS, cutOn: "beat", sets: ["corridor"], cast: CAST, frame };
