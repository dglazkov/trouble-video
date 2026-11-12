// Fall 6, 155.5-157.64 s: THE RING. On the crest of the strings, from above: the four have each other's hands, a ring
// on the air, faces up at us, turning slowly, and under them the shaft goes down into the dark. On 3748, the strings'
// hardest note, they are beside the atrium and its daylight is on them; then the vault's green screens go up past,
// and after that there is only what is under the vault. ONE drawing of all four (their hands are drawn holding, not laid
// over each other) and one more of its hair and cloth, swapped on threes; the camera rolls with the drawing's turn,
// so the shaft turns with them.
import { CUT, EV, W, H, Yg, shot, plates, propPlates, prop, at2d, flut, lit, ease, clamp, mix3, wob, strings } from "./fall_cast.js";
import { burst } from "./fall_fx.js";
const N = CUT.dark - CUT.ring;
export const ringTurn = (F) => -0.09 + 0.2 * ((F - CUT.ring) / N);
export const ringCam = (F, back = 0) => { const y = Yg(F), a = ringTurn(F); return { pos: [0.1, y + 7 + back, 0.1], target: [0, y - 40, 0], fov: 50, up: [Math.sin(a), 0, Math.cos(a)] }; };
function frame(f, sync) {
  const F = CUT.ring + f, y = Yg(F), u = f / N, g0 = Math.exp(-Math.abs(F - EV.day) / 6), breathe = 1 + 0.006 * Math.sin(f * 0.21);
  const L = lit(y, sync, F, { rimDir: [0, -7], rim: 1.2, base: [0.56, 0.6, 0.78] });
  const cam = ringCam(F), light = { ...L, tint: mix3(L.tint, [1.08, 1.1, 1.12], 0.5 * g0) };
  const cels = [prop(cam, "pipe", [2.9, y - 4.5 - 0.02 * f, -1.6], 0.4 + f * 0.05, 1, { ...lit(y - 5, sync, F), fog: 0.3, fogColor: [0.02, 0.03, 0.08] }), prop(cam, "head", [-3.3, y - 6, 2.2], f * -0.04, 1, { ...lit(y - 6, sync, F), fog: 0.4, fogColor: [0.02, 0.03, 0.08] }),
    prop(cam, "plate", [-1.2, y - 8 - 0.03 * f, -3.4], 1 + f * 0.03, 1, { ...lit(y - 8, sync, F), fog: 0.5, fogColor: [0.02, 0.03, 0.08] }), prop(cam, "geta", [3.6, y - 3, 2.6], f * 0.07, 1, { ...lit(y - 3, sync, F), fog: 0.2, fogColor: [0.02, 0.03, 0.08] })];
  cels.push({ ...at2d("tane.ring", flut(f, 2, 0), W / 2 + 6 * wob(F, 0.05, 0.08, 1), H / 2 + 8 - 10 * u + 5 * wob(F, 0.06, 0.09, 2), 2406 * (0.405 + 0.03 * ease(u)) * breathe), turn: ringTurn(F) - ringTurn(CUT.ring + N / 2), depth: -1, layer: light });
  return { set: "shaft", camera: cam, cels, options: { fog: 0.011, rooms: 0.8 + 0.45 * strings(sync, F) },
    post: { flash: f === 0 ? 0.3 : f === 1 ? 0.12 : F === EV.day ? 0.1 : 0, bloom: 0.85 + 0.25 * g0, diffusion: 0.28, bgBlur: 0.014, focus: [0.5, 0.5], vignette: 0.5 },
    overlay(g) { burst(g, F, W / 2, H / 2, { alpha: 0.16, r0: 560, speed: 0.06, n: 30 }); } };
}
export default shot("ring", { cutOn: "strings", plates: { ...plates("tane.ring"), ...propPlates("pipe", "head", "plate", "geta") },
  marks: [{ at: EV.day - CUT.ring, what: "the atrium's daylight on the ring", on: "strings" }], frame });
