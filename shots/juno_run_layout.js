// The run cycle's eight poses from the side on a blank ground: with --mannequin, the layout a whole-figure cycle is drawn over.
import { runPose, pose, RUN_KEYS, orbit } from "/engine/body.js";
export default {
  name: "juno_run_layout", frames: RUN_KEYS, fps: 24, cast: { juno: "/kits/juno" },
  frame(f) {
    const cam = orbit([0, 0.85, 0], 90, 6.8, { elev: 3, fov: 17 });
    return { camera: { pos: cam.pos, target: cam.target, fov: 17 },
      actors: [{ who: "juno", pose: pose(runPose(f / RUN_KEYS)) }],
      backdrop(g) { g.fillStyle = "#ffffff"; g.fillRect(0, 0, 1920, 1080); } };
  },
};
