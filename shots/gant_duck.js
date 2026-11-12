// Gantry 5, 35.0-36.08 s: JUNO. The drone fires on the drum and she is already under it: one drawing, dropped into
// the frame as the shot goes over her hair, and her laugh (an edit of the same drawing, eyes shut, swapped in after
// half a second). Behind her the gantry runs away and the screen overhead says IN, then DEEP.
import { FPS, CUT, startOf, gz, sign, PLATE_LIGHT, SIGN_MARKS, squadOf } from "./gant_cast.js";
import { frontCamera } from "./gant_front.js";
const FRAMES = CUT.tane - CUT.duck, W = 1920, H = 1080, LAUGH = 12;
function frame(f, sync) {
  const F = CUT.duck + f, drop = f < 3 ? [-150, -44, -10][f] : 0, bob = Math.abs(Math.sin(Math.PI * f / 6)) * -12, laugh = f >= LAUGH && (f - LAUGH) % 12 < 8;
  const cam = frontCamera(F, { ahead: 3.3, fov: 34, y: 1.0, ty: 1.75 });
  return { set: "gantry", camera: cam, options: { sign: sign(F), alert: 0.6, drones: squadOf(F) },
    post: { bgBlur: 0.03, focus: [0.5, 0.6], flash: f === 0 ? 0.28 : f === 1 ? 0.1 : 0, ca: 0.0014 + (f < 3 ? 0.005 : 0) },
    cels: [{ plate: laugh ? "laugh" : "duck", x: W * 0.47, y: H * 0.66 + drop + bob + (laugh ? 6 * Math.sin(f * 2.1) : 0), scale: 0.92 + 0.03 * f / FRAMES,
      layer: { ...PLATE_LIGHT, warp: 4, warpDir: [0.2, 1], warpTime: (f - f % 2) * 0.9, warpStill: [0.47, 0.42], warpRadius: 0.26 } }],
    overlay(g) {      // the shot, going over: a dart across the top of the frame, two frames, then its heat
      if (f > 3) return;
      const a = [W * 0.86, H * 0.2 - f * 30], b = [W * (0.5 - 0.5 * f), H * 0.05 - f * 60], n = [0.12, 1];
      const dart = (w, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(W * 1.05, H * 0.27); g.lineTo(a[0], a[1] - w); g.lineTo(-40 - (f ? 400 : 0), H * (f ? -0.2 : 0.02) - w * 0.2); g.lineTo(a[0], a[1] + w); g.closePath(); g.fill(); };
      if (f < 2) { dart(74, "#0b0a1e"); dart(58, "#ff2a3a"); dart(24, "#fff6d8"); }
      else { g.globalAlpha = f === 2 ? 0.5 : 0.22; dart(30, "#ff8a2a"); g.globalAlpha = 1; }
    } };
}
export default { name: "gant_duck", start: startOf("duck"), frames: FRAMES, fps: FPS, cutOn: "drums", marks: SIGN_MARKS(CUT.duck, CUT.tane), sets: ["gantry"],
  plates: { duck: { src: "/kits/juno/closeup/gant_duck_4.jpg", key: "magenta" }, laugh: { src: "/kits/juno/closeup/gant_duck_5.png", key: "magenta" } }, frame };
