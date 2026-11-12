// Wins 12, 75.13-75.96 s: UNDER IT. From the side and a little ahead, the wall cut away. She folds down over the board and is flat on it
// as the door comes down another notch (1813): she goes under its foot with a hand's breadth over her hair. It lands
// on the next drum hit (1818), and the first of the swarm is a length short of it.
import { FPS, CUT, CAST, J, DOORZ, UNDER, SLAM, startOf, jz, doorAt, ease, wob } from "./wins_cast.js";
import { swarm } from "./wins_juno.js";
import { burst, sparks, smoke } from "./wins_fx.js";
const FRAMES = CUT.pile - CUT.under, FLAT = 4, LAND = SLAM - CUT.under;
function frame(f, sync) {
  const F = CUT.under + f, z = jz(F), since = f - LAND, jolt = since >= 0 ? Math.exp(-since / 2.2) : 0, shake = 0.008 + 0.09 * jolt, k = ease(f / FRAMES);
  // three-quarters on from her side of the door: it goes with her until the door is in front of it, and stops there,
  // so that the slab's face is seen coming down and she comes out from under it
  const cz = Math.min(z + 3.4, DOORZ + 3.6);
  return { set: "tunnel",
    camera: { pos: [7.4 + shake * wob(f, 9, 14, 1), 0.95 + shake * wob(f, 11, 17, 2), cz], target: [0, 0.85, cz - 3.4], fov: 21 },
    options: { alert: 1, cut: true, door: doorAt(F), drones: swarm(F, sync), post: { ca: 0.0014 + 0.006 * jolt, flash: since === 0 ? 0.3 : 0, bgStreak: f < 10 ? [0.004, 0] : [0, 0] } },
    actors: z - 1.9 > cz - 0.6 ? [] : [{ who: "juno", action: "wins_juno", view: "side", phase: J(f < FLAT ? 3 : 4), hero: f < FLAT ? "drop" : "flat", over: true, light: { tint: [0.98, 1.05, 0.98], fogK: 0 }, x: 0, z, y: f < FLAT ? 0 : 0.0 }],
    overlay(g, cam) {
      if (since < 0) return;
      for (const x of [0.9, 0.2, -0.6]) sparks(g, cam, [x, 0.05, DOORZ - 0.1], [0, 2.5, -4], since, { n: 6, seed: 40 + x, life: 8, width: 4 });
      for (const x of [0.9, 0.0]) sparks(g, cam, [x, 0.05, DOORZ + 0.1], [0, 2.5, 4], since, { n: 6, seed: 50 + x, life: 8, width: 4 });
      smoke(g, cam, [0.9, 0.12, DOORZ - 0.35], since - 1, { size: 0.3, life: 18, n: 9, seed: 61, base: "#cfe6dc", shade: "#7fb5a4", up: 0.4, drift: [0, 0, -1], squash: 0.6 });
      smoke(g, cam, [0.9, 0.12, DOORZ + 0.35], since - 1, { size: 0.3, life: 18, n: 9, seed: 62, base: "#cfe6dc", shade: "#7fb5a4", up: 0.4, drift: [0, 0, 1], squash: 0.6 });
    } };
}
export default { name: "wins_under", start: startOf("under"), frames: FRAMES, fps: FPS, cutOn: "kick", held: (f) => f,
  marks: [{ at: UNDER - CUT.under, what: "Juno goes under the door", on: "kick" }, { at: LAND, what: "the door lands", on: "drums" }], sets: ["tunnel"], cast: CAST, frame };
