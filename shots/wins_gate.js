// Wins 11, 74.71-75.13 s: THE DOOR, AS SHE SEES IT. Low, down the crawlway, the door rushing at us: on the kick (1793) it
// drops another notch, its foot lit amber, and there is less under it than there was.
import { FPS, CUT, DOORZ, startOf, jz, jx, doorAt, wob } from "./wins_cast.js";
const FRAMES = CUT.under - CUT.gate;
function frame(f, sync) {
  const F = CUT.gate + f, z = jz(F), drums = sync.drive({ stem: "kick", mode: "pulse", decay: 0.1 }, F), shake = 0.01 + 0.04 * drums;
  return { set: "tunnel",
    camera: { pos: [jx(F) * 0.5 + wob(f, 2.1, 3.3, 1) * shake, 0.62 + wob(f, 2.6, 3.9, 2) * shake, z + 0.4], target: [0, 0.78, DOORZ], fov: 25 + 2 * drums, up: [Math.sin(0.03 * wob(f, 1.3, 2.1, 3)), 1, 0] },
    options: { alert: 1, door: doorAt(F), drones: [], post: { bgBlur: 0.05 + 0.03 * drums, focus: [0.5, 0.52], ca: 0.0018 + 0.004 * drums, flash: f === 0 ? 0.12 : 0 } } };
}
export default { name: "wins_gate", start: startOf("gate"), frames: FRAMES, fps: FPS, cutOn: "kick", marks: [{ at: 0, what: "the door drops another notch", on: "kick" }], sets: ["tunnel"], frame };
