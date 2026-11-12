// Wins 3, 64.71-65.63 s: "...MISTER." Close on him, the screen over his shoulder saying it. He rolls his head over
// one way, eyes shut; on the bar (1565) it snaps over the other with a crack, and his eyes are open and on them.
// Two drawings: the second is an edit of the first, graded back to it (pipeline/match.py).
import { FPS, CUT, TZ, startOf, corridor, ease, wob, SAY_MARKS } from "./wins_cast.js";
import { burst } from "./wins_fx.js";
const FRAMES = CUT.bat - CUT.crack, CRACK = 1565 - CUT.crack, W = 1920, H = 1080;
function frame(f, sync) {
  const F = CUT.crack + f, since = f - CRACK, snap = since >= 0 ? Math.exp(-since / 1.6) : 0, k = f / FRAMES, lean = since < 0 ? ease(f / CRACK) : 1;
  return { set: "corridor",
    camera: { pos: [0.5, 1.5, 19.3 + 0.3 * k], target: [-0.35, 2.3, 23.2], fov: 38 },
    options: corridor(F, { post: { bgBlur: 0.02, focus: [0.5, 0.5], dark: 0.12, ca: 0.0014 + 0.005 * snap, flash: since === 0 ? 0.16 : 0 } }),
    // he leans into the first roll; the snap throws the drawing a few pixels over and back
    cels: [{ plate: since < 0 ? "roll" : "snap", x: W * 0.44 + (since < 0 ? 14 * lean : -26 * snap), y: H * 0.6 + (since < 0 ? 6 * lean : -8 * snap), scale: 0.66 + 0.02 * k, turn: since < 0 ? 0.012 * lean : -0.02 * snap,
      layer: { tint: [0.92, 0.94, 1.08], rim: [0.62, 0.95, 1.0], rimDir: [0, 7] } }],
    overlay(g) {      // the crack: a small hard star at his neck, two frames, and three short strokes
      if (since < 0 || since > 3) return; const x = W * 0.5, y = H * 0.66;
      burst(g, x, y, 44, since + 1, 3, 7);
      g.strokeStyle = "#fff6d8"; g.lineWidth = 7; g.lineCap = "butt"; for (let i = 0; i < 3; i++) { const a = -0.5 + i * 0.5, r0 = 80 + since * 14, r1 = r0 + 46; g.beginPath(); g.moveTo(x + Math.cos(a) * r0, y + Math.sin(a) * r0); g.lineTo(x + Math.cos(a) * r1, y + Math.sin(a) * r1); g.stroke(); }
    } };
}
export default { name: "wins_crack", start: startOf("crack"), frames: FRAMES, fps: FPS, cutOn: "lead_vocals",
  marks: [{ at: CRACK, what: "he cracks his neck", on: "bar" }, ...SAY_MARKS(CUT.crack, CUT.bat)], sets: ["corridor"],
  plates: { roll: { src: "/kits/tane/closeup/wins_crack_1.jpg", key: "magenta" }, snap: { src: "/kits/tane/closeup/wins_crack_2.png", key: "magenta" } }, frame };
