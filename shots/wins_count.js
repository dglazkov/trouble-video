// Wins 9, 73.08-74.29 s: SHE COUNTS THEM. We are one of the swarm, on her tail: she looks back over her shoulder,
// straight at us, and counts on her fingers, one on each kick (1754, 1764, 1774). By three she is grinning.
// One drawing and two edits of it (the fingers; the grin), graded back to it and swapped on the kicks.
import { FPS, CUT, startOf, jz, jx, ease, wob, tunnelSign } from "./wins_cast.js";
import { swarm } from "./wins_juno.js";
const FRAMES = CUT.door - CUT.count, W = 1920, H = 1080, TWO = 1764 - CUT.count, THREE = 1774 - CUT.count;
function frame(f, sync) {
  const F = CUT.count + f, z = jz(F), x = jx(F), drums = sync.drive({ stem: "kick", mode: "pulse", decay: 0.1 }, F), shake = 0.012 + 0.03 * drums, n = f < TWO ? 0 : f < THREE ? 1 : 2, since = f - [0, TWO, THREE][n], pop = Math.exp(-since / 1.5);
  // the others of the swarm are either side of us and a little ahead: their blades at the edges of the frame
  const mates = [[-0.95, 1.5, 1.5, 3], [1.0, 0.75, 1.2, 4], [0.25, 1.75, 2.4, 5]].map(([dx, y, dz, s]) => ({ type: "chaser", pos: [x * 0.4 + dx + 0.08 * Math.sin(F * 0.4 + s), y + 0.06 * Math.sin(F * 0.5 + s * 2), z - 2.6 + dz], yaw: 0, pitch: -8, roll: 14 * Math.sin(F * 0.3 + s), thrust: 0.6 + drums, eye: 1.4, seed: 90 + s }));
  return { set: "tunnel",
    camera: { pos: [x * 0.5 + 0.2 + wob(f, 2.1, 3.3, 1) * shake, 1.3 + wob(f, 2.6, 3.9, 2) * shake, z - 2.6], target: [x * 0.6, 1.2, z + 6], fov: 52 + 2 * drums },
    options: { alert: 1, sign: tunnelSign(F), drones: mates, post: { bgBlur: 0.045 + 0.02 * drums, focus: [0.5, 0.5], ca: 0.0016 + 0.002 * drums } },
    cels: [{ plate: ["one", "two", "three"][n], x: W * 0.47 + 9 * Math.sin(f * 0.21), y: H * 0.53 + 7 * Math.sin(f * 0.33) - 10 * pop, scale: 0.735 + 0.012 * pop,
      layer: { tint: [0.95, 1.02, 0.97], rim: [0.7, 1.0, 0.85], rimDir: [0, 7], warp: 3.5, warpDir: [0.3, 1], warpTime: (f - f % 2) * 0.9, warpStill: [0.62, 0.62], warpRadius: 0.3 } }] };
}
export default { name: "wins_count", start: startOf("count"), frames: FRAMES, fps: FPS, cutOn: "kick",
  marks: [{ at: 0, what: "one", on: "kick" }, { at: TWO, what: "two", on: "kick" }, { at: THREE, what: "three", on: "kick" }], sets: ["tunnel"],
  plates: { one: { src: "/kits/juno/closeup/wins_count_1.jpg", key: "magenta" }, two: { src: "/kits/juno/closeup/wins_count_2.png", key: "magenta" }, three: { src: "/kits/juno/closeup/wins_count_3.png", key: "magenta" } }, frame };
