// Gantry 1, 29.83-30.71 s: the machine level. From out over the pistons, the gantry crossing the hall with the four
// running along it, small; behind them, red eyes come out of the dark and close.
import { FPS, CUT, CAST, KIDS, startOf, gz, runner, squadOf, sign, wob } from "./gant_cast.js";
const FRAMES = CUT.fire - CUT.wide;
function frame(f, sync) {
  const F = CUT.wide + f, z = gz(F), k = f / FRAMES;
  return { set: "gantry",
    camera: { pos: [15.5 - 1.2 * k, 3.3 + 0.2 * k, z - 9.5 + 3.5 * k], target: [0, 0.4, z - 2.5], fov: 44 - 3 * k },
    options: { sign: sign(F), alert: 0.5, drones: squadOf(F) },
    actors: KIDS.map((who) => runner(who, F, { view: "side" })) };
}
export default { name: "gant_wide", start: startOf("wide"), frames: FRAMES, fps: FPS, cutOn: "beat", sets: ["gantry"], cast: CAST, frame };
