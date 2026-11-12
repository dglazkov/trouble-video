// Gantry 4, 34.38-35.0 s: from in front, backing along the gantry ahead of the four. The screens overhead say WE'RE;
// a shot takes the rail beside Tane on the drum, and the lead drone, over their heads, turns its eye on Juno.
import { FPS, CUT, CAST, KIDS, startOf, gz, runner, squadOf, sign, wob, SHOTS } from "./gant_cast.js";
import { bolts, impacts } from "./gant_fx.js";
const FRAMES = CUT.duck - CUT.front, MINE = SHOTS.filter((s) => s.at >= CUT.front && s.at <= CUT.duck);
export const frontCamera = (F, o = {}) => ({ pos: [0.95, o.y ?? 1.0, gz(F) + (o.ahead ?? 5.4)], target: [0.15, o.ty ?? 1.25, gz(F) - 2], fov: o.fov ?? 46, up: [Math.sin(0.05), Math.cos(0.05), 0] });
function frame(f, sync) {
  const F = CUT.front + f, hit = Math.min(...MINE.map((s) => F >= s.at ? F - s.at : 99)), jolt = Math.exp(-hit / 2.2), cam = frontCamera(F), shake = 0.012 + 0.05 * jolt;
  cam.pos = [cam.pos[0] + wob(f, 1.9, 3.1, 1) * shake, cam.pos[1] + wob(f, 2.3, 3.7, 2) * shake, cam.pos[2]];
  return { set: "gantry", camera: cam, options: { sign: sign(F), alert: 0.6, drones: squadOf(F) },
    post: { bgBlur: 0.012, focus: [0.5, 0.55], ca: 0.0014 + 0.004 * jolt, flash: hit === 0 ? 0.25 : 0 },
    actors: KIDS.map((who) => runner(who, F, { view: "front", ...(who === "ife" ? { z: gz(F) - 3.3, x: -0.6 } : {}) })),
    under(g, c) { impacts(g, c, SHOTS, F, "scorch"); },
    overlay(g, c) { bolts(g, c, MINE, F); impacts(g, c, MINE.filter((s) => !s.miss), F); } };
}
export default { name: "gant_front", start: startOf("front"), frames: FRAMES, fps: FPS, cutOn: "brass", marks: [{ at: 835 - CUT.front, what: "a shot takes the rail", on: "drums" }], sets: ["gantry"], cast: CAST, frame };
