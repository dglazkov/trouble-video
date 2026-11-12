// Wins 12, 75.13-75.96 s: UNDER IT. From her side and well ahead of her, low, at the height of her face, the wall cut
// away: her face is to us the whole way. She folds down over the board, chin up, and is flat on it, on her elbows,
// grinning, as the door comes down another notch (1813): she goes under its foot. It lands on the next drum hit
// (1818) behind her, and she is still in the picture, going away from it. Nothing of the set is ever in front of her.
// Her two drawings are this camera's own (kits/juno hero under_drop, under_flat).
import { FPS, CUT, CAST, J, DOORZ, UNDER, SLAM, startOf, jz, doorAt, ease, wob } from "./wins_cast.js";
import { swarm } from "./wins_juno.js";
import { sparks, smoke } from "./wins_fx.js";
import { sfx, sfxMark } from "../engine/sfx.js";
const FRAMES = CUT.pile - CUT.under, FLAT = 4, LAND = SLAM - CUT.under;
function frame(f, sync) {
  const F = CUT.under + f, z = jz(F), since = f - LAND, jolt = since >= 0 ? Math.exp(-since / 2.2) : 0, shake = 0.008 + 0.09 * jolt, k = ease(f / FRAMES);
  // from the side and well ahead of her, low, at the height of her face: it goes with her, her face to us, until she is
  // under the door; then she is faster than it is, and it widens to keep her and the door she left behind in one frame
  const lag = 0.017 * Math.max(0, f - 7) ** 2, c = z + 0.3 - lag, wide = ease((f - 7) / 12);
  return { set: "tunnel",
    camera: { pos: [6.6 + shake * wob(f, 9, 14, 1), 0.66 + shake * wob(f, 11, 17, 2), c + 3.6], target: [0, 0.6, c], fov: 15.5 + 13 * wide },
    options: { alert: 1, cut: true, door: doorAt(F), drones: swarm(F, sync), post: { ca: 0.0014 + 0.0025 * jolt, bgStreak: f < 10 ? [0.004, 0] : [0, 0] } },
    actors: [{ who: "juno", action: "wins_juno", view: "side", phase: J(f < FLAT ? 3 : 4), hero: f < FLAT ? "under_drop" : "under_flat", over: true, light: { tint: [0.98, 1.05, 0.98], fogK: 0 }, x: 0, z, y: 0 }],
    overlay(g, cam) {
      if (since < 0) return;
      sfx(g, { text: "ガシャン", x: 1480, y: 890, size: 92, angle: -0.1, color: "station", age: since, life: 5, shake: 10, seed: 10, pop: [1.3, 1.3, 1.05, 1.05], burst: { k: 0.7 } });      // on the dark of the floor under the door: Juno and the door's own sign are clear of it
      for (const x of [0.9, 0.2, -0.6]) sparks(g, cam, [x, 0.05, DOORZ - 0.1], [0, 2.5, -4], since, { n: 6, seed: 40 + x, life: 8, width: 4 });
      for (const x of [0.9, 0.0]) sparks(g, cam, [x, 0.05, DOORZ + 0.1], [0, 2.5, 4], since, { n: 6, seed: 50 + x, life: 8, width: 4 });
      smoke(g, cam, [0.9, 0.12, DOORZ - 0.35], since - 1, { size: 0.3, life: 18, n: 9, seed: 61, base: "#cfe6dc", shade: "#7fb5a4", up: 0.4, drift: [0, 0, -1], squash: 0.6 });
      smoke(g, cam, [0.9, 0.12, DOORZ + 0.35], since - 1, { size: 0.3, life: 18, n: 9, seed: 62, base: "#cfe6dc", shade: "#7fb5a4", up: 0.4, drift: [0, 0, 1], squash: 0.6 });
    } };
}
export default { name: "wins_under", start: startOf("under"), frames: FRAMES, fps: FPS, cutOn: "kick", held: (f) => f,
  marks: [{ at: UNDER - CUT.under, what: "Juno goes under the door", on: "kick" }, { at: LAND, what: "the door lands", on: "drums" }, sfxMark(LAND, "ガシャン", "the blast door lands behind Juno", "drums")], sets: ["tunnel"], cast: CAST, frame };
