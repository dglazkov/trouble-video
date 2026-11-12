// Descent 6, 29.29-29.83 s: OUT AT THE BOTTOM. The stair tower's door on the lower gantry, from in front and low: the
// four come out of it at a run, together again, Juno in front, as the guitar picks up. The next section starts on
// this gantry, in this order (shots/gant_cast.js).
import { FPS, CUT, CAST, CADENCE, RUN, startOf, wob } from "./desc_cast.js";
const FRAMES = CUT.end - CUT.exit;
const PLACE = { juno: [0.55, 0, 0.55], tane: [-0.5, -1.3, 0.1], noor: [0.45, -2.7, 0.3], ife: [-0.45, -4.0, 0.84] };      // across, behind the leader, where in the cycle
function frame(f, sync) {
  const F = CUT.exit + f, z = 2.2 + RUN * f / FPS, k = f / FRAMES;
  return { set: "atrium",
    camera: { pos: [0.5 - 0.3 * k + wob(f, 1.9, 3.1, 1) * 0.015, 0.42 + wob(f, 2.3, 3.7, 2) * 0.015, z + 4.4 - 0.7 * k], target: [0.05, 1.1, z - 0.8], fov: 48, up: [Math.sin(-0.05), Math.cos(-0.05), 0] },
    options: { door: "stairs", alert: 1, alarm: { gantry: 200, rings: 99 }, screens: { text: "TROUBLE", small: "トラブル", alarm: 1 }, post: { bgBlur: 0.012, focus: [0.5, 0.55] } },
    actors: Object.entries(PLACE).map(([who, [x, dz, ph]]) => ({ who, action: "run", view: "front", phase: ph + (F - CUT.end) / CADENCE[who], yaw: 0, steady: 4, x, z: z + dz })) };
}
export default { name: "desc_exit", start: startOf("exit"), frames: FRAMES, fps: FPS, cutOn: "guitar", sets: ["atrium"], cast: CAST, frame };
