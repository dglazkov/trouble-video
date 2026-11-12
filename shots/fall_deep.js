// Fall 8, 158.62-159.54 s: THE LAST SCREEN. On the synth's pick-up: a lone monitor off some wall of the vault,
// tumbling up past us in the dark (it falls slower than we do), its cable whipping after it, and what the station
// has to say on it for the last time: DEEP, in the vault's green. It flickers on 3818 as it turns square to us.
// Everything in the shot is drawn by the film; the lettering is the vault's (sets/sign.js).
import { CUT, EV, W, H, Yg, shot, ease, clamp, wob } from "./fall_cast.js";
import { crt, deep, tail, wind } from "./fall_fx.js";
const N = CUT.tane - CUT.deep;
function frame(f, sync) {
  const F = CUT.deep + f, y = Yg(F), u = f / N, e = F - EV.flick, flick = e >= 0 && e < 4 ? [0.25, 1.35, 0.5, 1.15][e] : 1;
  // up through the frame: quick in, slow through the middle (where it is read), quick out
  const through = u < 0.5 ? 0.5 * (2 * u) ** 0.55 : 1 - 0.5 * (2 * (1 - u)) ** 0.55, sy = y - 2.5 + 5.0 * through;
  const r = [-0.5 + 0.62 * through + 0.05 * wob(F, 0.2, 0.3, 1), 0.34 - 0.5 * through, -0.42 + 0.66 * through];
  const cam = { pos: [0, y + 0.1, -3.6], target: [0, y + 0.1, 8], fov: 40 };
  return { set: "shaft", camera: cam, options: { fog: 0.014 },
    post: { bgStreak: [0, 0.03], flash: f === 0 ? 0.1 : e === 1 ? 0.07 : 0, bloom: 0.7, bloomThreshold: 0.82, vignette: 0.55, ca: 0.0012 + (e >= 0 && e < 4 ? 0.003 : 0) },
    overlay(g, c) {
      wind(g, F, { n: 12, alpha: 0.16, speed: 120, color: "#9fd8c0" });
      const pos = [0.1 - 0.25 * through, sy, 0];
      const m = c.project(pos); tail(g, m.x + 60, m.y + 40, F, 520, [0.25, 1], 1);
      g.save(); g.globalCompositeOperation = "lighter"; const R = 760, gr = g.createRadialGradient(m.x, m.y, 0, m.x, m.y, R); gr.addColorStop(0, `rgba(93,255,168,${0.2 * flick})`); gr.addColorStop(1, "rgba(93,255,168,0)"); g.fillStyle = gr; g.fillRect(m.x - R, m.y - R, 2 * R, 2 * R); g.restore();
      crt(g, c, pos, r, 2.15, { say: (g2, w, h) => deep(g2, w, h, F, Math.min(1, flick)), glow: flick });
    } };
}
export default shot("deep", { cutOn: "guitar", marks: [{ at: EV.flick - CUT.deep, what: "the screen flickers, square to us: DEEP", on: "other" }], frame });
