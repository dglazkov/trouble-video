// Fall 4, 151.32-152.62 s: IFE'S GLASSES. Close on her, on the brass: the fall has lifted her glasses off her nose
// and they hang in the air over her forehead; her eyes cross to follow them, her hands come up. On the strings
// (3652) she has them, jammed back on crooked, both hands on the rims. One drawing and an edit of it.
import { CUT, EV, W, H, Yg, shot, plates, at2d, lit, ease, rnd, wob } from "./fall_cast.js";
import { wind } from "./fall_fx.js";
function frame(f, sync) {
  const F = CUT.glass + f, y = Yg(F), on = F - EV.caught, got = on >= 0, f2 = f - (f % 2);
  const grab = on >= -3 && on < 0 ? [-6, -14, -24][on + 3] : 0, jolt = got && on < 4 ? [16, 7, 2, -2][on] : 0, shv = (rnd(f2, 3) - 0.5) * 3;
  const scale = 0.775 + 0.0008 * f, L = lit(y, sync, F, { rimDir: [8, 3] });
  return { set: "shaft", camera: { pos: [0.6, y + 0.5, -2.4], target: [-0.4, y + 0.3, 8], fov: 40 }, options: { fog: 0.006 },
    cels: [{ ...at2d("ife.glass", got ? 1 : 0, W * 0.5 + shv, H * 0.5 + 18 + grab + jolt + 5 * wob(F, 0.2, 0.31, 1), 1536 * scale), layer: L }],
    post: { bgStreak: [0, 0.05], dark: 0.25, bgBlur: 0.02, flash: f === 0 ? 0.1 : on === 0 ? 0.08 : 0 },
    overlay(g) { wind(g, F, { n: 14, alpha: 0.3, speed: 210, len: 380, width: 4 }); } };
}
export default shot("glass", { cutOn: "brass", plates: plates("ife.glass"), marks: [{ at: EV.caught - CUT.glass, what: "she catches her glasses", on: "strings" }], frame });
