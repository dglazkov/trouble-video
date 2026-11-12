// Core 1, 78.875-80.13 s: the cut from Juno's door slamming to near stillness. NOOR, alone, walks down a maintenance
// duct toward its mouth (the camera backs away ahead of them), lifts the headphones from the collar and puts them on:
// they seat on the brass's accent (1913), and the hands come down. One drawing and three edits of it, on the walk's bob.
import { FPS, CUT, CAST, EV, startOf, ease } from "./core_cast.js";
const FRAMES = CUT.play - CUT.duct, ON = EV.phones - CUT.duct, W = 1920, H = 1080, WALK = 1.25, STEP = 13;
export const DUCT_LIGHT = { tint: [0.88, 0.84, 1.0], rim: [0.95, 0.86, 1.0], rimDir: [5, 2.5] };
function frame(f, sync) {
  const z = -15 + WALK * f / FPS, f2 = f - f % 2, bob = -11 * Math.abs(Math.sin(Math.PI * f2 / STEP)), sway = 5 * Math.sin(Math.PI * f2 / STEP);
  const plate = f < ON - 8 ? "phones_a" : f < ON ? "phones_b" : f < ON + 6 ? "phones_c" : "phones_d", seat = f >= ON && f < ON + 2 ? [7, 3][f - ON] : 0;
  return { set: "core", camera: { pos: [0.5, 1.5 - bob * 0.0006, z + 2.5], target: [-0.15, 1.42, z - 6], fov: 42 }, options: { drones: [], far: 0.9 },
    post: { ca: 0.0012 + (f === ON ? 0.002 : 0) },
    cels: [{ plate, x: W * 0.5 + sway, y: H * 0.5 + 6 + bob + seat, scale: SCALE * (1 + 0.025 * ease(f / FRAMES)), layer: DUCT_LIGHT }] };
}
const SCALE = 0.705;
const src = (n) => ({ src: `/kits/noor/closeup/core_phones_${n}`, key: "magenta" });      // 1: the drawing (the headphones on, hands at the pads); 3, 6, 5: edits of it, graded back to it (pipeline/match.py)
export default { name: "core_duct", start: startOf("duct"), frames: FRAMES, fps: FPS, cutOn: "beat", marks: [{ at: ON, what: "the headphones are on", on: "brass" }], sets: ["core"], cast: CAST,
  plates: { phones_a: src("3.png"), phones_b: src("6.png"), phones_c: src("1.jpg"), phones_d: src("5.png") }, frame };
