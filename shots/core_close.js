// Core 7, 89.63-92.9 s: THE GRID CLOSES. From the island, Noor coming at us with the enforcer behind, in the lattice,
// where it followed them: one long take. A beam bites into its hull on each drum hit (2156-2191), they tighten on the
// keyboard (2196, 2201), and on 2211 they go through it. It hangs there in slices that slide apart, hot at the cuts,
// as Noor's boot comes down on the deck (2221) where there is weight again: the coat and the hair fall. Noor's back
// is to it throughout. The lens grows longer as they leave it behind, so the machine stays as large as it was.
import { FPS, CUT, CAST, EV, startOf, ease, clamp, lerp, wob, noorAt, coreOptions, adrift, asDrawn, enforcerAt, P } from "./core_cast.js";
import { beamsOver, sparks, motes, cutFlash } from "./core_fx.js";
import { solve } from "../engine/body.js";
import { actorPose } from "../engine/actions.js";
// the foot that came down stays where it came down: the figure moves on over it by what the two drawings' legs differ
const ballZ = (phase) => solve(P, actorPose({ who: "noor", action: "core_land", phase })).J.L.ball[2], LAND_SHIFT = ballZ(0.4) - ballZ(0.8);
const FRAMES = CUT.end - CUT.close;
export function closeCamera(F) {
  const n = noorAt(F), e = enforcerAt(F), gap = n.z - e.pos[2], d = 0.66 * gap, fov = 2 * Math.atan(Math.tan(17.5 * Math.PI / 180) * 5.4 / d) * 180 / Math.PI;
  const jolt = F >= EV.cut ? Math.exp(-(F - EV.cut) / 2.5) : 0, land = clamp((F - EV.land + 14) / 14);
  return { pos: [n.x + 0.5 * d + 0.03 * jolt * wob(F, 9, 14, 1), 1.25 + 0.3 * n.y + 0.03 * jolt * wob(F, 11, 17, 2), n.z + 0.87 * d], target: [n.x + 0.2 * d, n.y + 0.98 - 0.1 * land, n.z], fov };
}
function frame(f, sync) {
  const F = CUT.close + f, n = noorAt(F), opt = coreOptions(F), since = F - EV.cut, landed = F >= EV.land;
  const actor = F < EV.land - 8 ? adrift(F, "front") : { who: "noor", action: "core_land", phase: F < EV.land ? 0 : F < EV.land + 4 ? 0.4 : 0.8, hero: F < EV.land ? "land_reach" : F < EV.land + 4 ? "land_down" : "land_stand", x: n.x, y: n.y, z: n.z + (F >= EV.land + 4 ? LAND_SHIFT : 0), yaw: 0, shadow: landed };
  return { set: "core", camera: closeCamera(F), options: opt, actors: [actor],
    post: { flash: since === 0 ? 0.55 : since === 1 ? 0.2 : 0, ca: 0.0012 + (since >= 0 ? 0.004 * Math.exp(-since / 3) : 0) },
    overlay(g, cam, bodies) { sparks(g, cam, opt.beams, F); cutFlash(g, cam, opt.beams, F); beamsOver(g, cam, opt.beams, bodies[0]); motes(g, cam, F); } };
}
export default { name: "core_close", start: startOf("close"), frames: FRAMES, fps: FPS, cutOn: "keyboard", held: asDrawn,
  marks: [...EV.bite.map((b, i) => ({ at: b - CUT.close, what: `a beam bites (${i + 1})`, on: "drums" })), ...EV.tighten.map((b) => ({ at: b - CUT.close, what: "the beams tighten", on: "keyboard" })),
    { at: EV.cut - CUT.close, what: "the grid goes through the enforcer", on: "drums" }, { at: EV.land - CUT.close, what: "Noor touches down", on: "drums" }], sets: ["core"], cast: CAST, frame };
