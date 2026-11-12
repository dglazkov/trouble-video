// Tripwire: Juno stands idle and turns on the spot. First each of the eight directions is held long enough to judge
// the drawing, then she turns continuously, faster, to judge the swaps between drawings.
import { idlePose, pose, held, ease } from "/engine/body.js";
import { ground, shadows } from "/engine/scenery.js";

const HOLD = 36, TURN = 8, STEP = HOLD + TURN, STOPS = 8, SPIN = 72, SPINS = 2;
const frames = STOPS * STEP + SPINS * SPIN + 24;
// degrees she has turned by frame f (on ones; the pose is sampled on twos)
function turned(f) {
  if (f < STOPS * STEP) { const k = Math.floor(f / STEP), u = f - k * STEP; return 45 * (k + ease((u - HOLD) / TURN)); }
  return 360 + Math.min(SPINS * 360, (f - STOPS * STEP) / SPIN * 360);
}
export default {
  name: "juno_turn", frames, fps: 24, cast: { juno: "/kits/juno" },
  frame(f) {
    const h = held(f), t = h / 24;
    const q = pose({ ...idlePose(t), yaw: -turned(h) });
    const blink = (h % 72) >= 66 && (h % 72) < 70;
    return {
      camera: { pos: [0, 1.0, 7.2], target: [0, 0.83, 0], fov: 17 },
      actors: [{ who: "juno", pose: q, expr: blink ? "blink" : null }],
      backdrop(g, cam, bodies) { ground(g, cam, { posts: [] }); shadows(g, cam, bodies[0]); },
    };
  },
};
