// Slice 5, 56.08-60.04 s: JUNO, down the market deck on her board, seen from behind and a little to her left. She
// weaves between the stalls; the pack is on her tail; the shoppers flinch out of her way. She reaches the foot of
// the ramp on the cut; the leap is the next shot.
import { chase } from "../machines/drones.js";
import { FPS, CUT, CAST, startOf, ease, wob } from "./slice_cast.js";
const FRAMES = CUT.leap - CUT.ride, SPEED = 15, LAUNCH = 294, TOP = 66;      // m/s; the slice frame she leaves the ramp's top (z = 66) on
export const rideZ = (F) => TOP + SPEED * (F - LAUNCH) / FPS;                 // F: frames of the slice
export const rideX = (F) => 1.75 * Math.sin((F - CUT.ride) * 0.105 + 0.6) * Math.min(1, Math.max(0, (TOP - 5 - rideZ(F)) / 9));

function frame(f, sync) {
  const S = CUT.ride + f, F = startOf("ride") * FPS + f, drums = sync.drive({ stem: "drums", mode: "pulse", decay: 0.12 }, F);
  const z = rideZ(S), x = rideX(S), turn = (rideX(S + 2) - rideX(S - 2)) / 4, xc = rideX(S - 5) * 0.75, bank = turn * 0.9, shake = 0.015 + 0.03 * drums;
  // the pack: over her shoulders and above her, never between her and the camera
  const pack = chase(F, sync, { n: 6, lead: [x * 0.5, 2.9, z + 0.6], spread: [5.4, 1.3, 2.6], seed: 11, lurch: 0.8, weave: 1.4 }).map((d, i) => ({ ...d, pos: [d.pos[0] + (Math.abs(d.pos[0] - x) < 0.9 ? (i % 2 ? 1.2 : -1.2) : 0), d.pos[1], d.pos[2]] }));
  pack.push({ type: "enforcer", pos: [0.6 + 0.4 * Math.sin(F * 0.05), 6.6 - 3.0 * ease((f - 20) / 50), 55 + 6 * ease((f - 60) / 36)], yaw: 180, pitch: 14, beam: 1, beamTilt: 0.25, thrust: drums, seed: 5 });
  return { set: "market",
    camera: { pos: [xc + 1.5 + wob(f, 2.1, 3.3, 1) * shake, 1.55 + wob(f, 2.6, 3.9, 2) * shake, z - 3.4], target: [x * 0.75, 1.25, z + 5], fov: 57 + 3 * drums, up: [Math.sin(bank), Math.cos(bank), 0] },
    options: { alert: 0.6, drones: pack, crowd: { flee: [x, z] }, steam: 1.4 },
    post: { bgBlur: 0.022 + 0.02 * drums, focus: [0.5, 0.52], ca: 0.0016 + 0.002 * drums },
    // lean: left of centre as she swings toward +x (her left), right as she swings back
    actors: [{ who: "juno", action: "ride", view: "back34", phase: turn > 0.035 ? 0 : turn < -0.035 ? 1 : 0.5, yaw: turn * 60, x, z }] };
}
export default { name: "slice_ride", start: startOf("ride"), frames: FRAMES, fps: FPS, cutOn: "beat", sets: ["market"], cast: CAST, frame };
