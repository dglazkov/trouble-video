// Tripwire: Juno's run cycle from three cameras (side, three-quarter front, three-quarter back), a few seconds each.
// She runs on the spot and the ground scrolls under her at the speed her planted foot travels.
import { runStride, RUN_KEYS, orbit } from "/engine/body.js";
import { ground, shadows } from "/engine/scenery.js";

const SEG = 96, CAMS = [{ az: 90, elev: 4 }, { az: 42, elev: 7 }, { az: 138, elev: 7 }];
const FPC = RUN_KEYS * 2;                       // frames per cycle: eight drawings, each held for two frames
let stride = null;
export default {
  name: "juno_run3", frames: SEG * CAMS.length, fps: 24, cast: { juno: "/kits/juno" },
  frame(f) {
    const c = CAMS[Math.min(CAMS.length - 1, Math.floor(f / SEG))];
    const cam = orbit([0, 0.85, 0], c.az, 7.4, { elev: c.elev, fov: 17 });
    return {
      camera: { pos: cam.pos, target: cam.target, fov: 17 },
      actors: [{ who: "juno", action: "run", phase: (f % FPC) / FPC }],
      backdrop(g, cam, bodies) {
        stride ??= runStride(bodies[0].P);
        ground(g, cam, { travel: [0, -stride * f / FPC] }); shadows(g, cam, bodies[0]);
      },
    };
  },
};
