// The other poses in the library, from a three-quarter camera: idle, a look back over the shoulder (the head goes to
// its own drawing while the body stays on its own), idle again, a braking skid.
import { idlePose, lookBackPose, skidPose, mix, pose, held, ease } from "/engine/body.js";
import { ground, shadows } from "/engine/scenery.js";

const BEATS = [["idle", 24], ["look", 48], ["idle", 24], ["skid", 48]], IN = 6;
const of = { idle: (t) => idlePose(t), look: () => lookBackPose(1), skid: () => skidPose(1) };
export default {
  name: "juno_poses", frames: BEATS.reduce((a, b) => a + b[1], 0), fps: 24, cast: { juno: "/kits/juno" },
  frame(f) {
    const h = held(f), t = h / 24;
    let k = 0, start = 0; while (k < BEATS.length - 1 && h >= start + BEATS[k][1]) start += BEATS[k++][1];
    const now = of[BEATS[k][0]](t), before = k ? of[BEATS[k - 1][0]](t) : now;
    const q = pose({ ...mix(before, now, ease((h - start + 2) / IN)), yaw: -70 });
    return {
      camera: { pos: [0, 1.0, 7.2], target: [0, 0.83, 0], fov: 17 },
      actors: [{ who: "juno", pose: q, expr: h % 60 >= 54 && h % 60 < 58 ? "blink" : null }],
      backdrop(g, cam, bodies) { ground(g, cam, { posts: [] }); shadows(g, cam, bodies[0]); },
    };
  },
};
