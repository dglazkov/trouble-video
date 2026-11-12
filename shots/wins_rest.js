// Wins 7, 70.17-71.83 s: HE RESTS. From in front. He straightens out of the lunge, and on the kick (1694) the pipe goes
// up on his shoulder; his coat settles; the last of the smoke goes by and a blade comes down behind him. The board has
// nothing more to say.
import { FPS, CUT, CAST, TZ, startOf, corridor, ease, wob } from "./wins_cast.js";
import { tane, trio, SHOULDER, SLAM_AT } from "./wins_tane.js";
import { smoke, sparks } from "./wins_fx.js";
const FRAMES = CUT.tunnel - CUT.rest, UP = SHOULDER - CUT.rest;
function frame(f, sync) {
  const F = CUT.rest + f, k = ease(f / FRAMES), tap = f >= UP ? Math.exp(-(f - UP) / 2) : 0, settle = Math.exp(-f / 14);
  return { set: "corridor",
    camera: { pos: [1.9 - 0.25 * k, 1.0 + 0.012 * tap * wob(f, 9, 14, 1), 16.9 + 0.5 * k], target: [0.1, 1.08, TZ], fov: 33 - 2.5 * k },
    options: corridor(F, { alert: 1 - 0.7 * k, drones: trio(F, sync), post: { bgBlur: 0.006, focus: [0.5, 0.5], bloom: 0.95 } }),
    // his coat is still moving when we get to him, and settles
    actors: [tane(F, { over: true, layer: { warp: 5 * settle + 1.2, warpDir: [0.2, -1], warpTime: (f - f % 2) * 0.8, warpStill: [0.5, 0.72], warpRadius: 0.13 } })],
    under(g, cam) {      // what is left of the smoke, behind him
      smoke(g, cam, [-1.5, 0.5, TZ + 0.6], f + 12, { size: 0.4, life: 46, seed: 23, up: 0.5, drift: [-0.2, 0, 0.2] });
      smoke(g, cam, [1.3, 0.35, TZ - 0.2], f + 6, { size: 0.3, life: 38, n: 10, seed: 27, up: 0.45, drift: [0.25, 0, 0.1] });
    } };
}
export default { name: "wins_rest", start: startOf("rest"), frames: FRAMES, fps: FPS, cutOn: "bar", held: (f) => f,
  marks: [{ at: UP, what: "the pipe goes up on his shoulder", on: "kick" }], sets: ["corridor"], cast: CAST, frame };
