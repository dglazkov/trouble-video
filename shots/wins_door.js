// Wins 10, 74.29-75.13 s: THE DOOR. From behind her: the tunnel is down to a crawlway and at the end of it the blast
// door is coming down, a notch on every kick. She goes straight at it.
import { FPS, CUT, CAST, DOORZ, startOf, jz, jx, doorAt, ease, wob } from "./wins_cast.js";
import { swarm } from "./wins_juno.js";
const FRAMES = CUT.gate - CUT.door;
function frame(f, sync) {
  const F = CUT.door + f, z = jz(F), x = jx(F), turn = (jx(F + 2) - jx(F - 2)) / 4, drums = sync.drive({ stem: "kick", mode: "pulse", decay: 0.1 }, F), shake = 0.012 + 0.04 * drums, k = f / FRAMES;
  return { set: "tunnel",
    camera: { pos: [jx(F - 4) * 0.6 + 0.62 + wob(f, 2.1, 3.3, 1) * shake, 1.2 + wob(f, 2.6, 3.9, 2) * shake, z - 2.5], target: [x * 0.6, 0.95, z + 6], fov: 50 + 3 * drums - 4 * k },
    options: { alert: 1, door: doorAt(F), drones: swarm(F, sync).filter((d) => d.pos[2] > z - 2.2 ? false : true), post: { bgBlur: 0.022 + 0.02 * drums, focus: [0.5, 0.5], ca: 0.0016 + 0.003 * drums } },
    actors: [{ who: "juno", action: "ride", view: "back34", hero: "ride_mid", phase: 0.5, steady: 6, x, z }] };
}
export default { name: "wins_door", start: startOf("door"), frames: FRAMES, fps: FPS, cutOn: "kick",
  marks: [{ at: 0, what: "the door drops a notch", on: "kick" }], sets: ["tunnel"], cast: CAST, frame };
