// Gantry 3, 32.71-34.38 s: IFE trips; NOOR hooks the handle of her pack without looking and carries her on, never
// breaking stride. Two drawings laid over the gantry as it goes by (the camera on the deck beside them, the far rail
// and the machine hall streaking behind): the trip, eleven frames; then, on the beat, the catch, Ife's legs still
// going on twos.
import { FPS, CUT, startOf, gz, sign, PLATE_LIGHT, SIGN_MARKS } from "./gant_cast.js";
const FRAMES = CUT.front - CUT.haul, HOOK = 796 - CUT.haul, W = 1920, H = 1080;
function frame(f, sync) {
  const F = CUT.haul + f, z = gz(F) - 3.4, f2 = f - f % 2, hooked = f >= HOOK, u = f - HOOK;
  // the trip: she pitches forward and down across the frame; the catch: snapped in from the right, then riding Noor's stride
  const trip = { plate: "trip", x: W * 0.56 - f2 * 16, y: H * 0.46 + f2 * f2 * 0.9, scale: 0.8, turn: -0.1 - 0.014 * f2, layer: PLATE_LIGHT };
  const bob = Math.abs(Math.sin(Math.PI * u / 7.15)) * -14, lunge = u < 3 ? [130, 40, 10][u] ?? 0 : 0;
  const haul = { plate: (u - u % 6) % 12 === 0 ? "haul" : "haul_b", x: W * 0.43 + lunge - u * 1.0, y: H * 0.6 + bob, scale: 0.9 + 0.03 * u / 29,
    layer: { ...PLATE_LIGHT, warp: 5, warpDir: [1, 0.05], warpTime: (u - u % 2) * 0.9, warpStill: [0.28, 0.78], warpRadius: 0.3 } };
  return { set: "gantry",
    camera: { pos: [1.2, 1.25, z + 0.4], target: [-1.4, 1.05, z - 0.3], fov: 42 },
    options: { sign: sign(F), alert: 0.6, drones: [] },
    post: { bgStreak: [0.035, 0], flash: f === HOOK ? 0.2 : f === HOOK + 1 ? 0.06 : 0, ca: 0.0014 + (u >= 0 && u < 2 ? 0.004 : 0) },
    cels: [hooked ? haul : trip] };
}
export default { name: "gant_haul", start: startOf("haul"), frames: FRAMES, fps: FPS, cutOn: "beat", marks: [{ at: HOOK, what: "Noor hooks the handle", on: "beat" }], sets: ["gantry"],
  plates: { trip: { src: "/kits/ife/closeup/gant_trip_1.jpg", key: "magenta" }, haul: { src: "/kits/noor/closeup/gant_haul_2.jpg", key: "magenta" }, haul_b: { src: "/kits/noor/closeup/gant_haul_3.png", key: "magenta" } }, frame };
