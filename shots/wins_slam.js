// Wins 6, 68.5-70.17 s: THE THIRD HIT. Side-on again. He holds the second machine out at arm's length, by the tail,
// and looks past it at the third, which thinks better of it and backs away. He draws the one back over his shoulder
// and, as the third comes in low on the third "deep" (1674), puts the one through the other: impact frames, and what
// is left of both goes down the corridor in pieces.
import { FPS, CUT, CAST, TZ, startOf, corridor, ease, wob, IMPACT, SAY_MARKS } from "./wins_cast.js";
import { tane, trio, HIT3, SLAM_AT, TX } from "./wins_tane.js";
import { speedLines } from "./slice_fx.js";
import { sfx, sfxMark } from "../engine/sfx.js";
import { burst, sparks, smoke, shards, shardsOf, smear } from "./wins_fx.js";
const FRAMES = CUT.rest - CUT.slam, HIT = HIT3 - CUT.slam;
const BITS = shardsOf(34, 14, SLAM_AT, [0, 3.5, -7], 9, ["#2a2f55", "#d9cfb0", "#f07a22", "#14152b", "#2a2f55", "#ff2a1e"]);
function frame(f, sync) {
  const F = CUT.slam + f, since = f - HIT, jolt = since >= 0 ? Math.exp(-since / 2.5) : 0, shake = 0.006 + 0.12 * jolt, k = ease(f / HIT), cz = TZ - 1.25;
  return { set: "corridor",
    camera: { pos: [7.6 - 0.4 * k + shake * wob(f, 9, 14, 1), 1.12 + shake * wob(f, 11, 17, 2), cz], target: [0, 1.22, cz], fov: 30 - 1.5 * k },
    options: corridor(F, { cut: "right", clearStruts: [12, 24], drones: trio(F, sync) }),
    post: since === 0 ? IMPACT.ink : since === 1 ? IMPACT.red : { ca: 0.0012 + 0.007 * jolt, flash: since === 2 ? 0.45 : since === 3 ? 0.14 : 0, bloom: 0.9 + 0.5 * jolt },
    actors: [tane(F, { over: true })],
    overlay(g, cam, bodies) {
      const hit = cam.project(SLAM_AT), sh = cam.project(bodies[0].J.L.sh);
      // the swing: the machine and his arm as one sweep, over the top and down
      if (since === -2) smear(g, sh.x, sh.y, 0.45 * sh.s, 1.3 * sh.s, 3.9, 5.3, ["#f07a22", "#2a2f55"]);
      if (since === -1) smear(g, sh.x, sh.y, 0.45 * sh.s, 1.35 * sh.s, 5.3, 6.9, ["#f07a22", "#2a2f55"]);
      if (since === 0) speedLines(g, 1920, 1080, { cx: hit.x, cy: hit.y, n: 130, seed: 41, inner: 160, color: "#07020f", width: 0.026, reach: 0.9 });
      else if (since === 1) speedLines(g, 1920, 1080, { cx: hit.x, cy: hit.y, n: 100, seed: 42, inner: 230, color: "#fff", width: 0.02, reach: 0.9 });
      sfx(g, { text: "ガンッ", x: 1560, y: 965, size: 116, angle: 0.08, color: since < 2 ? ["#ffffff", "#07020f"] : "tane", age: since, life: 10, shake: 14, seed: 9 });      // the biggest of the three
      if (since >= 1) { burst(g, hit.x, hit.y, 150, since, 17, 15); sparks(g, cam, SLAM_AT, [0, 4, -10], since - 1, { n: 24, seed: 18, life: 12, spread: 0.9 }); shards(g, cam, BITS, since);
        smoke(g, cam, [SLAM_AT[0], SLAM_AT[1], SLAM_AT[2] - 0.3], since - 2, { size: 0.85, life: 34, n: 16, seed: 16, up: 0.9, drift: [0, 0, -1.6], hot: true }); smoke(g, cam, [SLAM_AT[0], 0.3, SLAM_AT[2] - 1.5], since - 6, { size: 0.5, life: 30, n: 10, seed: 19, up: 0.5, drift: [0, 0, -1.0] }); }
    } };
}
export default { name: "wins_slam", start: startOf("slam"), frames: FRAMES, fps: FPS, cutOn: "kick", held: (f) => f,
  marks: [{ at: HIT, what: "Tane puts the second machine through the third: impact frames", on: "kick" }, sfxMark(HIT, "ガンッ", "one machine through the other", "kick"), ...SAY_MARKS(CUT.slam, CUT.rest)], sets: ["corridor"], cast: CAST, frame };
