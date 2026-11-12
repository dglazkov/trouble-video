// Gantry 2, 30.71-32.71 s: the drums come in and the drones open fire. Side-on, tracking the four along the gantry
// (they run right to left); a shot lands on every drum hit: the rail behind Ife, the frame as Juno passes it, the
// rail by Tane, the screen overhead as it says WE'RE, and the cable, which comes down whipping. The hall's boards
// say the words behind them.
import { FPS, CUT, CAST, KIDS, startOf, gz, runner, squadOf, sign, wob, SHOTS, CABLE, SIGN_MARKS } from "./gant_cast.js";
import { bolts, impacts, cable } from "./gant_fx.js";
const FRAMES = CUT.haul - CUT.fire, MINE = SHOTS.filter((s) => s.at >= CUT.fire && s.at < CUT.haul);
function frame(f, sync) {
  const F = CUT.fire + f, z = gz(F), hit = Math.min(...MINE.map((s) => F >= s.at ? F - s.at : 99)), jolt = Math.exp(-hit / 2.2), shake = 0.012 + 0.07 * jolt;
  return { set: "gantry",
    camera: { pos: [8.6 + wob(f, 1.9, 3.1, 1) * shake, 2.5 + wob(f, 2.3, 3.7, 2) * shake, z - 1.6], target: [0, 1.0, z - 2.6], fov: 37 - 2 * jolt },
    options: { sign: sign(F), alert: 0.6, drones: squadOf(F) },
    post: { bgStreak: [0.006, 0], ca: 0.0012 + 0.002 * jolt, flash: hit === 0 ? 0.18 : 0, bloom: 1.0 + 0.4 * jolt },
    actors: KIDS.map((who) => { const a = runner(who, F, { view: "side" }); return who === "tane" ? { ...a, phase: a.phase + 1 / 15 } : a; }),      // Tane a fifteenth on: on twos here, each of his planted feet is one drawing
    under(g, cam) { impacts(g, cam, SHOTS, F, "scorch"); },
    overlay(g, cam) { cable(g, cam, CABLE.a, CABLE.b, CABLE.sag, F, CABLE.at); bolts(g, cam, SHOTS, F); impacts(g, cam, SHOTS, F); } };
}
export default { name: "gant_fire", start: startOf("fire"), frames: FRAMES, fps: FPS, cutOn: "drums",
  marks: [...MINE.slice(1).map((s) => ({ at: s.at - CUT.fire, what: "a shot lands", on: "drums" })), ...SIGN_MARKS(CUT.fire, CUT.haul)], sets: ["gantry"], cast: CAST, frame };
