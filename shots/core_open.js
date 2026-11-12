// Core 3, 81.33-83.0 s: the duct opens on the station's ZERO-GRAVITY CORE. From behind Noor, still in the duct: they
// stand at the lip a moment (hands in pockets, the reels turning at the hip), step off it on the brass (1972) and are
// adrift two notes later, coat and hair lifting. The camera follows them to the lip and stops there: it has weight.
import { motes } from "./core_fx.js";
import { FPS, CUT, CAST, EV, startOf, ease, noorAt, coreOptions, adrift, asDrawn } from "./core_cast.js";
const FRAMES = CUT.drift - CUT.open;
function frame(f, sync) {
  const F = CUT.open + f, n = noorAt(F), u = ease(f / (FRAMES - 1)), off = F >= EV.off;
  const actor = off ? adrift(F, "open", { y: n.y + 0.06 * ease((F - EV.off) / 6) }) : { who: "noor", action: "core_step", phase: F >= EV.step ? 0.5 : 0, hero: F >= EV.step ? "open_step" : "open_lip", x: n.x, y: 0, z: n.z, yaw: 0 };
  return { set: "core", camera: { pos: [1.15 - 0.35 * u, 1.72 + 0.1 * u, -5.4 + 2.6 * u], target: [0.75 - 0.2 * u, 1.62, 6], fov: 40 },
    options: coreOptions(F), actors: [actor], overlay(g, cam) { motes(g, cam, F); } };
}
export default { name: "core_open", start: startOf("open"), frames: FRAMES, fps: FPS, cutOn: "brass", held: asDrawn,
  marks: [{ at: EV.step - CUT.open, what: "Noor steps off the lip", on: "brass" }, { at: EV.off - CUT.open, what: "adrift", on: "brass" }], sets: ["core"], cast: CAST, frame };
