// Tripwire: Juno stands at ease and turns on the spot. First each of eight directions is held long enough to judge
// the drawing, then she turns continuously, faster, to judge the changes between drawings.
import { ease } from "/engine/body.js";
import { ground, shadows } from "/engine/scenery.js";

const HOLD = 36, TURN = 8, STEP = HOLD + TURN, STOPS = 8, SPIN = 72, SPINS = 2;
const frames = STOPS * STEP + SPINS * SPIN + 24;
// degrees she has turned by frame f
function turned(f) {
  if (f < STOPS * STEP) { const k = Math.floor(f / STEP), u = f - k * STEP; return 45 * (k + ease((u - HOLD) / TURN)); }
  return 360 + Math.min(SPINS * 360, (f - STOPS * STEP) / SPIN * 360);
}
export default {
  name: "juno_turn", frames, fps: 24, cast: { juno: "/kits/juno" },
  frame(f) {
    return {
      camera: { pos: [0, 1.0, 7.2], target: [0, 0.83, 0], fov: 17 },
      actors: [{ who: "juno", action: "idle", yaw: -turned(Math.floor(f / 2) * 2) }],   // on twos
      backdrop(g, cam, bodies) { ground(g, cam, { posts: [] }); shadows(g, cam, bodies[0]); },
    };
  },
};
