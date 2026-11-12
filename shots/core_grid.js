// Core 5, 86.29-87.96 s: THROUGH THE LATTICE. From behind and above, travelling with Noor, the island's lit door ahead
// and the core's light beyond it. Three beams swing in, each on a note, and each stops a hair short: over the head
// (2081), beside the shoulder (2091), under the boots (2101). Noor's body does nothing at all.
import { FPS, CUT, CAST, EV, startOf, noorAt, coreOptions, adrift, asDrawn, beamRim } from "./core_cast.js";
import { beamsOver, glints, motes } from "./core_fx.js";
const FRAMES = CUT.face - CUT.grid;
export function gridCamera(F) {
  const n = noorAt(F), u = (F - CUT.grid) / FRAMES, roll = -0.05 + 0.08 * u;
  return { pos: [n.x + 2.1 - 0.4 * u, n.y + 2.5 - 0.3 * u, n.z - 3.7], target: [n.x - 0.75, n.y + 1.0, n.z + 3.2], fov: 38, up: [Math.sin(roll), Math.cos(roll), 0] };
}
function frame(f, sync) {
  const F = CUT.grid + f, opt = coreOptions(F), k = beamRim(F);
  return { set: "core", camera: gridCamera(F), options: opt,
    actors: [adrift(F, "grid", { layer: { rim: [0.55 + 0.45 * k, 0.5 + 0.5 * k, 0.75 + 0.25 * k].map((v) => v * (0.75 + 0.6 * k)), rimDir: [-3 - 5 * k, 5 + 3 * k] } })],
    overlay(g, cam, bodies) { beamsOver(g, cam, opt.beams, bodies[0]); glints(g, cam, opt.beams, F, EV.miss); motes(g, cam, F); } };
}
export default { name: "core_grid", start: startOf("grid"), frames: FRAMES, fps: FPS, cutOn: "keyboard", held: asDrawn,
  marks: EV.miss.map((m, i) => ({ at: m - CUT.grid, what: ["a beam stops over the head", "a beam stops beside the shoulder", "a beam stops under the boots"][i], on: "strings" })), sets: ["core"], cast: CAST, frame };
