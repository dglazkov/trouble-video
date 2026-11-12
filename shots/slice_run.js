// Slice 1, 48.00-50.25 s: the corridor run. A low camera tracks backward ahead of the four; the swarm fills the
// corridor behind them. They reach the hub's centre on the drop (in the film: after the four faces).
import { chase } from "../machines/drones.js";
import { FPS, CUT, CAST, CADENCE, startOf, wob } from "./slice_cast.js";
const SPEED = 7.5, lead = (f) => SPEED * (f - CUT.drop) / FPS;
// where each runs in the group: across the corridor, behind the leader, and where in their cycle they start
const PLACE = { tane: [-1.5, 0, 0.1], juno: [1.35, -0.9, 0.55], noor: [-0.65, -2.1, 0.3], ife: [0.55, -3.2, 0.8] };

function frame(f, sync) {
  const F = startOf("run") * FPS + f, drums = sync.drive({ stem: "drums", mode: "pulse", decay: 0.12 }, F), z = lead(f), k = f / (CUT.faces - CUT.run), shake = 0.012 + 0.03 * drums;
  return { set: "corridor",
    camera: { pos: [-0.75 + 0.55 * k + wob(f, 1.9, 3.1, 1) * shake, 0.38 + wob(f, 2.3, 3.7, 2) * shake, z + 4.6 - 1.2 * k], target: [0.0, 1.08, z - 0.6], fov: 50 + 3 * drums, up: [Math.sin(-0.07), Math.cos(-0.07), 0] },
    options: { junction: { z: 0 }, alert: 0.55,
      drones: [...chase(F, sync, { n: 14, lead: [0.2, 1.9, z - 5.2 + 1.2 * k], spread: [3.8, 1.6, 11], seed: 3 }), ...chase(F, sync, { type: "enforcer", n: 1, lead: [-0.4, 2.1, z - 11 + 2.5 * k], seed: 5 })],
      post: { bgBlur: 0.012 + 0.02 * drums, focus: [0.5, 0.55], ca: 0.0014 + 0.002 * drums } },
    actors: Object.entries(PLACE).map(([who, [x, dz, ph]]) => ({ who, action: "run", view: "front", phase: ph + f / CADENCE[who], x: x + 0.12 * Math.sin(f * 0.11 + ph * 9), z: z + dz + 0.25 * Math.sin(f * 0.07 + ph * 5) })) };
}
export default { name: "slice_run", start: startOf("run"), frames: CUT.faces - CUT.run, fps: FPS, sets: ["corridor"], cast: CAST, frame };
