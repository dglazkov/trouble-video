// Stress test: Juno runs on the spot while the camera circles her once, so every change of view happens in mid-stride.
// The kit draws her run from three sides; each is mirrored for the other side of her, so the circle shows six.
import { runStride, RUN_KEYS, orbit } from "/engine/body.js";
import { ground, shadows } from "/engine/scenery.js";

const FRAMES = 240, FPC = RUN_KEYS * 2;
let stride = null;
export default {
  name: "juno_orbit", frames: FRAMES, fps: 24, cast: { juno: "/kits/juno" },
  frame(f) {
    const cam = orbit([0, 0.85, 0], 90 - 360 * f / FRAMES, 7.4, { elev: 6, fov: 17 });
    return {
      camera: { pos: cam.pos, target: cam.target, fov: 17 },
      actors: [{ who: "juno", action: "run", phase: (f % FPC) / FPC }],
      backdrop(g, cam, bodies) { stride ??= runStride(bodies[0].P); ground(g, cam, { travel: [0, -stride * f / FPC] }); shadows(g, cam, bodies[0]); },
    };
  },
};
