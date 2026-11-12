// Fall 5, 152.62-155.5 s: FROM BELOW. Under them, looking up, on the bass: four figures spread on the air, small
// against the well they have fallen down, its storeys going away above them to one square of light. JUNO kicks the
// board away on the synth (3684) and it goes up the shaft, turning. The strings climb and the four drift in toward
// each other, arms out, and reach (3705): at the cut their hands are a hand apart. Four drawings cut from one picture
// (painted together from below, apart), each with a second drawing of its hair and cloth.
import { CUT, EV, W, H, WHO, MPP, Yg, shot, plates, propPlates, prop, at3d, flut, lit, ease, clamp, wob } from "./fall_cast.js";
import { burst } from "./fall_fx.js";
const N = CUT.ring - CUT.below, PLACE = { tane: [1.5, 1.25], ife: [-1.55, 1.3], noor: [1.5, -1.3], juno: [-1.6, -1.25] };
export const belowCam = (F) => { const u = (F - CUT.below) / N, y = Yg(F), roll = -0.12 + 0.3 * u; return { pos: [0.3, y - 7.6 + 1.2 * u, -0.3], target: [0, y + 40, 0.2], fov: 46, up: [Math.sin(roll), 0, Math.cos(roll)] }; };
function frame(f, sync) {
  const F = CUT.below + f, cam = belowCam(F), y = Yg(F), u = f / N, close = 1.75 - 0.52 * ease(clamp((f - 16) / (N - 16))) - 0.05 * clamp((F - EV.reach) / 6) * (F >= EV.reach ? 1 : 0);
  const cels = WHO.map((w, i) => { const [x, z] = PLACE[w], py = y + 0.2 * wob(F, 0.09, 0.14, i * 2);
    return at3d(cam, "tane.below_" + w, flut(f, 2, i), [x * close, py, z * close], MPP.below, { turn: 0.04 * wob(F, 0.06, 0.1, i), layer: lit(py, sync, F, { rimDir: [0, -6], base: [0.5, 0.52, 0.7] }) }); });
  // the board: at her hand until she lets it go; then away up the shaft, turning, toward the light
  const t = F - EV.letgo, j = PLACE.juno, b0 = [j[0] * close + 1.05, y + 0.1, j[1] * close + 0.1], b = t < 0 ? b0 : [b0[0] + 0.02 * t, b0[1] + 0.2 * t + 0.006 * t * t, b0[2] + 0.028 * t];
  cels.push(prop(cam, "board", b, t < 0 ? 0.5 + 0.02 * wob(F, 0.2, 0.3, 5) : 0.5 + 0.2 * t, 1.25, lit(b[1], sync, F)));
  cels.push(prop(cam, "geta2", [2.6, y + 2 + 0.01 * f, 2.2], f * 0.09, 1, lit(y, sync, F)), prop(cam, "tape", [0.3, y + 3 + 0.02 * f, -2.6], f * -0.06, 1, lit(y, sync, F)));
  return { set: "shaft", camera: cam, cels, options: { hatch: 1.3 },
    post: { flash: f === 0 ? 0.12 : 0, bgBlur: 0.035, focus: [0.5, 0.5], bloom: 0.9 },
    overlay(g) { burst(g, F, W / 2, H / 2, { alpha: 0.2, r0: 420, speed: 0.07 }); } };
}
export default shot("below", { cutOn: "bass", plates: { ...plates(...WHO.map((w) => "tane.below_" + w)), ...propPlates("board", "geta2", "tape") },
  marks: [{ at: EV.letgo - CUT.below, what: "Juno lets the board go", on: "synth" }, { at: EV.reach - CUT.below, what: "they reach", on: "percussion" }], frame });
