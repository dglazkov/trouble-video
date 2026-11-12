// Opening 9, 18.42-19.08 s: "Trouble!" The only title in the film. Two impact frames on the shout's onset (black on
// white, then yellow on black), then the card: TROUBLE slammed on over a burst, oversized and settling; on the
// shout's second syllable (18.67 s) the katakana slams in under it. Everything boils on twos.
import { FPS, CUT, startOf, rnd } from "./open_cast.js";
import { speedLines } from "./slice_fx.js";
const FRAMES = CUT.bolt - CUT.title, KANA = 448 - CUT.title, W = 1920, H = 1080, FACE = '"Dela Gothic One"';
const INK = "#07050e", RED = "#e8242c", HOT = "#ffd23c", DEEP = "#5a0a14";
// a word set to a width, its left baseline at (0, 0); returns the font size used
function word(g, text, wide, fill, o = {}) {
  g.font = `300px ${FACE}`; const px = 300 * wide / g.measureText(text).width; g.font = `${px}px ${FACE}`; g.textBaseline = "alphabetic"; g.lineJoin = "miter"; g.miterLimit = 3;
  if (o.shadow) { g.lineWidth = px * 0.13; g.strokeStyle = INK; g.fillStyle = o.shadow; g.strokeText(text, px * 0.05, px * 0.05); g.fillText(text, px * 0.05, px * 0.05); }
  if (o.stroke) { g.lineWidth = px * 0.13; g.strokeStyle = o.stroke; g.strokeText(text, 0, 0); }
  g.fillStyle = fill; g.fillText(text, 0, 0); return px;
}
// a jagged burst round (0, 0)
function burst(g, R, n, seed, col) { g.fillStyle = col; g.beginPath(); for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * 2 * Math.PI, r = i % 2 ? R * (0.62 + 0.1 * rnd(i, seed)) : R * (0.92 + 0.3 * rnd(i, seed, 2)); g.lineTo(Math.cos(a) * r * 1.9, Math.sin(a) * r); } g.closePath(); g.fill(); }
function frame(f) {
  const f2 = f - f % 2, since = f - KANA, k = f < 2 ? 1 : [1.5, 1.16, 1.05][f - 2] ?? 1 + 0.035 * (f - 5) / FRAMES, jx = f < 6 ? [0, 0, 16, -10, 5, -2][f] : 0, jy = f < 6 ? [0, 0, -12, 8, -4, 2][f] : 0, kk = since < 0 ? 0 : [1.34, 1.12, 1.04][since] ?? 1;
  return { camera: { pos: [0, 0, 10], target: [0, 0, 0] },
    backdrop(g) {
      if (f === 0) { g.fillStyle = "#fff"; g.fillRect(0, 0, W, H); return; }
      if (f === 1) { g.fillStyle = INK; g.fillRect(0, 0, W, H); return; }
      const grad = g.createLinearGradient(0, 0, 0, H); grad.addColorStop(0, DEEP); grad.addColorStop(0.5, RED); grad.addColorStop(1, DEEP); g.fillStyle = grad; g.fillRect(0, 0, W, H);
      speedLines(g, W, H, { cx: W / 2, cy: H * 0.47, n: 70, seed: f2, inner: 380, color: DEEP, width: 0.03, reach: 0.5 });
      speedLines(g, W, H, { cx: W / 2, cy: H * 0.47, n: 46, seed: f2 + 50, inner: 470, color: INK, width: 0.018, reach: 0.6 });
      speedLines(g, W, H, { cx: W / 2, cy: H * 0.47, n: 26, seed: f2 + 90, inner: 520, color: HOT, width: 0.007, reach: 0.8 });
    },
    overlay(g) {
      g.save(); g.translate(W / 2 + jx, H * 0.47 + jy); g.rotate(-0.055 + (f === 2 ? -0.03 : 0));
      if (f === 0) { speedLines(g, W, H, { cx: 0, cy: 0, n: 120, seed: 1, inner: 520, color: INK, width: 0.022, reach: 0.3 }); g.scale(1.08, 1.08); g.translate(-830, 120); word(g, "TROUBLE", 1660, INK); g.restore(); return; }
      if (f === 1) { speedLines(g, W, H, { cx: 0, cy: 0, n: 100, seed: 2, inner: 560, color: RED, width: 0.02, reach: 0.3 }); g.scale(1.13, 1.13); g.translate(-830, 120); word(g, "TROUBLE", 1660, HOT); g.restore(); return; }
      g.scale(k, k);
      burst(g, 430, 17, f2, INK); burst(g, 392, 17, f2 + 7, "#fff6d8");
      // the slab under the word, and the word
      g.fillStyle = INK; g.beginPath(); g.moveTo(-900, 150); g.lineTo(880, 96); g.lineTo(900, 190); g.lineTo(-880, 250); g.closePath(); g.fill();
      g.save(); g.translate(-830, 110); word(g, "TROUBLE", 1660, "#ffffff", { stroke: INK, shadow: RED }); g.restore();
      if (since >= 0) {      // the katakana: yellow, on the slab's line, askew the other way
        g.save(); g.translate(160, 318); g.rotate(0.03 + (since === 0 ? 0.04 : 0)); g.scale(kk, kk);
        g.fillStyle = INK; g.beginPath(); g.moveTo(-60, -196); g.lineTo(700, -212); g.lineTo(676, 46); g.lineTo(-84, 34); g.closePath(); g.fill();
        g.fillStyle = RED; g.beginPath(); g.moveTo(-84, 34); g.lineTo(676, 46); g.lineTo(672, 66); g.lineTo(-80, 54); g.closePath(); g.fill();
        word(g, "トラブル", 600, HOT); g.restore();
      }
      g.restore();
    },
    post: { ink: 0, bloom: 0.45, bloomThreshold: 0.8, diffusion: 0.16, ca: 0.0014 + (f < 4 || (since >= 0 && since < 2) ? 0.005 : 0), vignette: f < 2 ? 0 : 0.3, grain: 0.035, wrap: 0, sat: 1.08, contrast: 0.25, shadowTint: [0.01, 0, 0.03],
      flash: f === 2 ? 0.5 : f === 3 ? 0.15 : since === 0 ? 0.35 : since === 1 ? 0.1 : 0 } };
}
export default { name: "open_title", start: startOf("title"), frames: FRAMES, fps: FPS, cutOn: "backing_vocals",
  marks: [{ at: 0, what: "\"Trouble!\": the title's impact frames", on: "backing_vocals" }, { at: KANA, what: "the katakana slams in", on: "lead_vocals" }], frame };
