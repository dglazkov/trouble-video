// Fall 2, 147.17-149.24 s: THE DROP. From the hatch, straight down the shaft: on the brass the four drop away from
// under the lens, faces up at us, shrinking into the well, its storeys stacked below them in every colour the film has
// been; fourteen frames on the camera lets go too and goes after them. Four drawings cut from one picture (painted
// together from above, apart), each with a second drawing of its hair and cloth, swapped on threes.
import { CUT, W, H, WHO, MPP, Yg, shot, plates, propPlates, prop, at3d, flut, lit, ease, clamp, wob } from "./fall_cast.js";
import { burst } from "./fall_fx.js";
const PLACE = { tane: [1.25, 0.95], ife: [-1.2, 1.05], noor: [1.15, -1.0], juno: [-1.3, -1.1] };      // x, z about the shaft's axis (the lens has -X to its right)
export const dropCam = (F) => { const f = F - CUT.drop, y = f <= 14 ? -0.5 : -0.5 - 7.75 * ((f - 14) / 36) ** 2, roll = 0.1 * ease(f / 50); return { pos: [0.25, y, -0.2], target: [0, y - 40, 0.15], fov: 52, up: [Math.sin(roll), 0, Math.cos(roll)] }; };
function frame(f, sync) {
  const F = CUT.drop + f, cam = dropCam(F), y = Yg(F), e = ease(f / 40), sx = 1.1 + 0.15 * e, sz = 0.7 + 0.5 * e;      // two rows close together under the lens at first (no head off the frame's edge, nobody over anybody), drifting apart as they go
  const cels = WHO.map((w, i) => { const [x, z] = PLACE[w], py = y + 0.25 * wob(F, 0.11, 0.17, i * 2);
    return at3d(cam, "tane.above_" + w, flut(f, 2, i), [x * sx, py, z * sz], MPP.above, { turn: 0.05 * wob(F, 0.07, 0.11, i), layer: lit(py, sync, F, { rimDir: [0, 6] }) }); });
  cels.push(prop(cam, "pipe", [0.2, y - 1.5 - 0.02 * f, -2.2], 0.6 + f * 0.11, 1, lit(y, sync, F)), prop(cam, "head", [-2.3, y - 2.5 - 0.03 * f, 0.4], f * -0.08, 1, lit(y, sync, F)), prop(cam, "rotor", [2.4, y - 1 + 0.01 * f, -0.3], 1 + f * 0.14, 1, lit(y, sync, F)));
  return { set: "shaft", camera: cam, cels, post: { flash: f < 2 ? [0.3, 0.1][f] : 0, bgBlur: 0.02 + 0.05 * ease((f - 10) / 30), focus: [0.5, 0.5], ca: 0.0012 + 0.002 * ease(f / 40) },
    overlay(g) { if (f > 12) burst(g, F, W / 2, H / 2, { alpha: 0.22 * ease((f - 12) / 20), r0: 300 }); } };
}
export default shot("drop", { cutOn: "brass", plates: { ...plates(...WHO.map((w) => "tane.above_" + w)), ...propPlates("pipe", "head", "rotor") }, frame });
