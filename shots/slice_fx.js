// Graphics the slice's shots paint on the stage's 2D layers: hard shapes in flat colours, the way they were cut
// from paper and shot on the rostrum. Everything is a pure function of what it is given.
import { rnd } from "./slice_cast.js";

// Radial speed lines: n wedges from outside the frame toward (cx, cy), stopping short of it at `inner` (pixels,
// varying per wedge); width in radians. A new `seed` each frame makes them boil.
export function speedLines(g, W, H, o) {
  const { cx = W / 2, cy = H / 2, n = 90, seed = 0, inner = 260, color = "#000", width = 0.022, reach = 0.5 } = o, R = Math.hypot(W, H);
  g.fillStyle = color; g.beginPath();
  for (let i = 0; i < n; i++) {
    const a = (i + rnd(i, seed, 1)) / n * 2 * Math.PI, w = width * (0.25 + 1.5 * rnd(i, seed, 2) ** 2), r = inner * (1 + reach * rnd(i, seed, 3) * 2);
    g.moveTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); g.lineTo(cx + Math.cos(a - w) * R, cy + Math.sin(a - w) * R); g.lineTo(cx + Math.cos(a + w) * R, cy + Math.sin(a + w) * R); g.closePath();
  }
  g.fill();
}
// A streaking speed background: bands rushing along `angle` (radians) in a kid's colours. t advances the rush.
export function streaks(g, W, H, o) {
  const { colors, angle = 0, t = 0, seed = 0, n = 150 } = o, L = Math.hypot(W, H);
  const grad = g.createLinearGradient(0, 0, 0, H); grad.addColorStop(0, colors.deep); grad.addColorStop(0.5, colors.main); grad.addColorStop(1, colors.deep);
  g.fillStyle = grad; g.fillRect(0, 0, W, H);
  g.save(); g.translate(W / 2, H / 2); g.rotate(angle);
  for (let i = 0; i < n; i++) {
    const y = (rnd(i, seed, 1) - 0.5) * L, len = L * (0.15 + 0.9 * rnd(i, seed, 2) ** 2), th = 2 + 46 * rnd(i, seed, 3) ** 3, sp = 2.5 + 5 * rnd(i, seed, 4);
    const x = (((rnd(i, seed, 5) * 2 * L + t * sp * 260) % (2 * L)) + 2 * L) % (2 * L) - L, k = rnd(i, seed, 6);
    g.fillStyle = k > 0.86 ? "#ffffff" : k > 0.6 ? colors.hot : k > 0.3 ? colors.deep : "#05030c";
    g.globalAlpha = k > 0.6 ? 0.95 : 0.6;
    g.beginPath(); g.moveTo(x - len / 2, y); g.lineTo(x + len / 2 - th * 3, y - th / 2); g.lineTo(x + len / 2, y); g.lineTo(x + len / 2 - th * 3, y + th / 2); g.closePath(); g.fill();
  }
  g.restore(); g.globalAlpha = 1;
}
// A name card: the name in katakana, big, and in Latin capitals on a slab under it, slammed on: at age 0 (frames
// since it landed) it is oversized and askew, by 3 it has settled. (x, y) is the card's left baseline corner.
export function nameCard(g, o) {
  const { kana, latin, x, y, colors, age = 9, tilt = -0.07 } = o, k = age < 3 ? [1.55, 1.18, 1.05][age] : 1, jx = age < 3 ? [14, -9, 4][age] : 0, jy = age < 3 ? [-10, 7, -3][age] : 0;
  g.save(); g.translate(x + jx, y + jy); g.rotate(tilt + (age === 0 ? -0.05 : 0)); g.scale(k, k);
  g.textBaseline = "alphabetic"; g.lineJoin = "miter"; g.miterLimit = 3;
  g.font = '236px "Dela Gothic One"'; const wk = g.measureText(kana).width;
  g.font = '92px "Dela Gothic One"'; const sp = 14, wl = [...latin].reduce((a, c) => a + g.measureText(c).width + sp, -sp), wide = Math.max(wk, wl + 70);
  // the slab: black, with the kid's colour as a hard offset under it
  const slab = (dx, dy, col) => { g.fillStyle = col; g.beginPath(); g.moveTo(-34 + dx, 22 + dy); g.lineTo(wide + 60 + dx, 22 + dy); g.lineTo(wide + 24 + dx, 150 + dy); g.lineTo(-70 + dx, 150 + dy); g.closePath(); g.fill(); };
  slab(14, 14, colors.main); slab(0, 0, "#07050e");
  g.font = '92px "Dela Gothic One"'; g.fillStyle = colors.hot; let cx = 0; for (const c of latin) { g.fillText(c, cx, 122); cx += g.measureText(c).width + sp; }
  // the katakana: white on a black outline, the colour offset behind it
  g.font = '236px "Dela Gothic One"';
  g.lineWidth = 30; g.strokeStyle = "#07050e"; g.fillStyle = colors.main; g.strokeText(kana, 12, 12); g.fillText(kana, 12, 12);
  g.strokeText(kana, 0, 0); g.fillStyle = "#ffffff"; g.fillText(kana, 0, 0);
  g.restore();
}
