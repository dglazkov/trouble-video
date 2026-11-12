// Core 4, 83.0-86.29 s: NOOR ADRIFT. From in front, travelling with them: hands in pockets, eyes half shut, the coat
// and the hair in one slow billow (four drawings, there and back, on fours), the wall and the duct's mouth falling
// away behind. In that mouth an eye opens on a percussion tick (2022); the enforcer comes out after them on the
// keyboard (2032); and the core's security grid wakes round them, a bank of emitters on each tick of the six that
// follow (2036-2061). Noor does not look round. The camera rolls a little, slowly: there is no up here.
import { FPS, CUT, CAST, EV, startOf, ease, noorAt, coreOptions, adrift, asDrawn } from "./core_cast.js";
const FRAMES = CUT.grid - CUT.drift;
export function driftCamera(F) {
  const n = noorAt(F), u = (F - CUT.drift) / (CUT.grid - CUT.drift), roll = 0.07 * Math.sin(u * 2.2 - 0.4);
  return { pos: [n.x + 2.0 + 0.8 * u, n.y + 0.8 - 0.2 * u, n.z + 4.3 + 0.4 * u], target: [n.x + 0.8 - 0.25 * u, n.y + 1.1, n.z - 1], fov: 36, up: [Math.sin(roll), Math.cos(roll), 0] };
}
function frame(f, sync) {
  const F = CUT.drift + f;
  return { set: "core", camera: driftCamera(F), options: coreOptions(F), actors: [adrift(F, "front")] };
}
export default { name: "core_drift", start: startOf("drift"), frames: FRAMES, fps: FPS, cutOn: "brass", held: asDrawn,
  marks: [{ at: EV.eye - CUT.drift, what: "an eye in the duct", on: "percussion" }, { at: EV.emerge - CUT.drift, what: "the enforcer comes out", on: "keyboard" },
    ...EV.wake.map((w, i) => ({ at: w - CUT.drift, what: `the grid wakes: bank ${i + 1}`, on: "percussion" }))], sets: ["core"], cast: CAST, frame };
