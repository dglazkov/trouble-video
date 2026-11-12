// Stress test: Juno runs on the spot while the camera circles her once, so every drawing swap happens in mid-stride,
// including the straight-on front and back views where the legs swing along the view axis.
import { runPose, runStride, pose, held, RUN_KEYS, orbit } from "/engine/body.js";
import { ground, shadows } from "/engine/scenery.js";

const FRAMES = 240, FPC = RUN_KEYS * 2;
let stride = null;
export default {
  name: "juno_orbit", frames: FRAMES, fps: 24, cast: { juno: "/kits/juno" },
  frame(f) {
    const cam = orbit([0, 0.85, 0], 90 - 360 * f / FRAMES, 7.4, { elev: 6, fov: 17 }), h = held(f);
    return {
      camera: { pos: cam.pos, target: cam.target, fov: 17 },
      actors: [{ who: "juno", pose: pose(runPose((h / 2 % RUN_KEYS) / RUN_KEYS)) }],
      backdrop(g, cam, bodies) { stride ??= runStride(bodies[0].P); ground(g, cam, { travel: [0, -stride * f / FPC] }); shadows(g, cam, bodies[0]); },
    };
  },
};
