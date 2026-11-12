// Fall 7, 157.64-158.62 s: BELOW THEM, ONLY DARK. On the brass, from higher above: the ring is small now, still
// turning, and nothing under it is lit; the last lamps go up past. Then one thing is: a green light, far down, coming
// up at them; it comes up through the middle of the ring (their faces go green from below) and at the lens.
// The ring is the drawing of the shot before, further off. The light is the station's last screen (shots/fall_fx.js).
import { CUT, W, H, Yg, shot, plates, at3d, flut, lit, ease, clamp, mix3, wob } from "./fall_cast.js";
import { crt, deep, burst } from "./fall_fx.js";
import { ringCam, ringTurn } from "./fall_ring.js";
const N = CUT.deep - CUT.dark;
// where the screen is: it falls slower than they do, so it comes up
export const screenY = (F) => Yg(F) - 26 + 1.75 * (F - CUT.dark);      // through the ring's plane 15 frames in; at the lens (16 m above it) on the cut
function frame(f, sync) {
  const F = CUT.dark + f, y = Yg(F), u = f / N, cam = ringCam(F, 9 + 2 * u), sy = screenY(F), near = clamp(1 - Math.abs(sy - y) / 9), above = sy > y;
  const L = lit(y, sync, F, { rimDir: [0, -7], base: [0.5, 0.54, 0.74] }), green = clamp(1 - Math.abs(sy - y + 2) / 12);
  const ring = { ...at3d(cam, "tane.ring", flut(f + 1, 2, 0), [0, y, 0], 0.00112), turn: ringTurn(F) - ringTurn(CUT.dark - 25), layer: { ...L, tint: mix3(L.tint, [0.62, 1.1, 0.8], 0.55 * green), rim: mix3(L.rim, [0.36, 1.0, 0.6], green), rimDir: [0, above ? 7 : -7] } };
  const screen = (g, c) => { const p = crt(g, c, [0.25 - 0.2 * u, sy, -0.1 + 0.2 * u], [0.5 + f * 0.05, -1.15 + 0.3 * Math.sin(f * 0.12), 0.3 + f * 0.035], 1.25, { say: (g2, w, h) => deep(g2, w, h, F, 1) });
    g.save(); g.globalCompositeOperation = "lighter"; const r = Math.max(30, p.mid.s * 2.2), gr = g.createRadialGradient(p.mid.x, p.mid.y, 0, p.mid.x, p.mid.y, r); gr.addColorStop(0, "rgba(93,255,168,0.34)"); gr.addColorStop(1, "rgba(93,255,168,0)"); g.fillStyle = gr; g.fillRect(p.mid.x - r, p.mid.y - r, 2 * r, 2 * r); g.restore(); };
  return { set: "shaft", camera: cam, cels: [ring], options: { fog: 0.016, rooms: 0.8 },
    post: { flash: f === 0 ? 0.1 : 0, bloom: 0.9, bgBlur: 0.03, focus: [0.5, 0.5], vignette: 0.55 },
    under(g, c) { if (!above) screen(g, c); },
    overlay(g, c) { if (above) screen(g, c); burst(g, F, W / 2, H / 2, { alpha: 0.13, r0: 500, speed: 0.06, n: 26 }); } };
}
export default shot("dark", { cutOn: "brass", plates: plates("tane.ring"), frame });
