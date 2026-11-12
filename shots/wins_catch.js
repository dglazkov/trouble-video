// Wins 5, 67.25-68.5 s: THE CATCH. From low in front of him. The second machine comes down at his head out of the top
// of the frame; on the second "deep" and the kick (1634) his left hand goes up and it is in his fist by the tail:
// impact frames. It bucks and screams; he has not moved.
import { FPS, CUT, CAST, TZ, startOf, corridor, ease, wob, IMPACT, SAY_MARKS } from "./wins_cast.js";
import { tane, trio, fist, CATCH } from "./wins_tane.js";
import { speedLines } from "./slice_fx.js";
import { burst, sparks } from "./wins_fx.js";
const FRAMES = CUT.slam - CUT.catch, HIT = CATCH - CUT.catch;
function frame(f, sync) {
  const F = CUT.catch + f, since = f - HIT, jolt = since >= 0 ? Math.exp(-since / 2.5) : 0, shake = 0.006 + 0.08 * jolt, k = ease(f / FRAMES), at = fist();
  return { set: "corridor",
    camera: { pos: [1.55 - 0.15 * k + shake * wob(f, 9, 14, 1), 0.72 + shake * wob(f, 11, 17, 2), 17.7 + 0.25 * k], target: [0.1, 1.6 + 0.1 * jolt, TZ], fov: 40 - 2 * k - 2 * jolt },
    options: corridor(F, { drones: trio(F, sync) }),
    post: since === 0 ? IMPACT.ink : since === 1 ? IMPACT.red : { ca: 0.0012 + 0.006 * jolt, flash: since === 2 ? 0.4 : since === 3 ? 0.12 : 0, bloom: 0.9 + 0.5 * jolt },
    actors: [tane(F, { over: true })],
    overlay(g, cam) {
      const hit = cam.project(at);
      if (since === 0) speedLines(g, 1920, 1080, { cx: hit.x, cy: hit.y, n: 120, seed: 31, inner: 140, color: "#07020f", width: 0.024, reach: 0.9 });
      else if (since === 1) speedLines(g, 1920, 1080, { cx: hit.x, cy: hit.y, n: 100, seed: 32, inner: 200, color: "#fff", width: 0.02, reach: 0.9 });
      if (since >= 1) { burst(g, hit.x, hit.y - 30, 90, since, 11, 11); sparks(g, cam, at, [0, 2, -4], since - 1, { n: 10, seed: 12, life: 8 }); }
    } };
}
export default { name: "wins_catch", start: startOf("catch"), frames: FRAMES, fps: FPS, cutOn: "kick", held: (f) => f,
  marks: [{ at: HIT, what: "Tane catches the second machine by the tail: impact frames", on: "kick" }, ...SAY_MARKS(CUT.catch, CUT.slam)], sets: ["corridor"], cast: CAST, frame };
