// The reunion 1, L 0-208 (song 119.42-128.08 s): FOUR ROUTES AT ONCE. The four are apart and running for each other,
// and the frame is cut into panels, one each, edged in their colour: a device the film uses only here. Each panel is a
// picture of its own (engine/stage.js `panels`; shots/reun_p_cast.js says what is in them); this is the page they are
// laid out on, and the page is re-cut on the kick:
//   strips   0   Tane alone, the whole frame; a strip slams in from the right on each kick (10 Ife, 20 Noor, 30 Juno)
//   cross   40   a canted two-by-two, from the side: the two on the left head right, the two on the right head left
//   bands   79   four bands, their eyes
//   slices 119   four leaning slices, coming at us
//   rush   159   the slices stand up into strips, squeeze together toward the middle of the frame and lean in on each
//                other, the four nearer and nearer; from 199 the borders shake
// and on the kick at 208 (the next shot's first frame) the borders BREAK: shards(g, age) draws them flying apart.
import { K, PART } from "./reun_cast.js";
import { content, modeAt, LAYOUT, KIDS, COLOR, CAST, PLATES, WORDS, FPS, F0, W, H } from "./reun_p_cast.js";
import { clamp, lerp, ease, rnd } from "./reun_cast.js";
const INK = "#0b0a1e", G = 9;      // the gutter between panels: half its width
const slam = (t, n = 4) => { const u = clamp((t + 1) / n);      // (a quarter of the way out on the kick's own frame: the page is never empty)
  return 1 - (1 - u) * (1 - u) * (1 - 2.2 * u); };      // in hard, a little too far, and back

// The page at L: [{ who, poly, c: [x, y] where the panel's picture has its middle }]. Polygons go clockwise from top left.
function page(L) {
  const m = modeAt(L), t = m.t, out = [];
  // strips between leaning lines: xs = the lines' x at mid height, lean = how far each line's top is right of its foot
  const strips = (xs, lean, order, y0 = 0, y1 = H, cy = H / 2) => order.forEach((who, i) => { const a = xs[i], b = xs[i + 1], la = lean[i] / 2, lb = lean[i + 1] / 2; if (b - a < 24) return;
    out.push({ who, poly: [[a + la + G, y0], [b + lb - G, y0], [b - lb - G, y1], [a - la + G, y1]], c: [(a + b) / 2, cy] }); });
  if (m.name === "front") {
    // one more strip on each kick: the ones there squeeze left to make room
    const n = 1 + (L >= K[1]) + (L >= K[2]) + (L >= K[3]), since = n > 1 ? L - K[n - 1] : 99, u = slam(since), xs = [];
    for (let j = 0; j <= 4; j++) { const was = j >= n ? W + 80 : n === 1 ? (j === 0 ? -80 : W + 80) : j === 0 ? -80 : j * (W / (n - 1)) + (j === n - 1 ? 80 : 0), now = j === 0 ? -80 : j >= n ? W + 80 : j * W / n; xs.push(n === 1 ? (j === 0 ? -80 : W + 80) : lerp(was, now, u)); }
    strips(xs.slice(0, n + 1), Array(n + 1).fill(70), KIDS.slice(0, n));
  } else if (m.name === "side") {
    // a canted cross: its middle a little off the frame's, the upright leaning, the level tilted
    const u = slam(t), cx = 960, vx = 46, hy = 34, gx = (y) => cx + vx * (1 - 2 * y / H), gy = (x) => 540 + hy * (2 * x / W - 1), o = (1 - u) * 300;
    out.push({ who: "tane", poly: [[-10 - o, -10], [gx(0) - G - o, -10], [gx(gy(cx)) - G - o, gy(cx) - G], [-10 - o, gy(0) - G]], c: [480 - o, 262] });
    out.push({ who: "juno", poly: [[gx(0) + G + o, -10], [W + 10 + o, -10], [W + 10 + o, gy(W) - G], [gx(gy(cx)) + G + o, gy(cx) - G]], c: [1446 + o, 278] });
    out.push({ who: "noor", poly: [[-10 - o, gy(0) + G], [gx(gy(cx)) - G - o, gy(cx) + G], [gx(H) - G - o, H + 10], [-10 - o, H + 10]], c: [470 - o, 806] });
    out.push({ who: "ife", poly: [[gx(gy(cx)) + G + o, gy(cx) + G], [W + 10 + o, gy(W) + G], [W + 10 + o, H + 10], [gx(H) + G + o, H + 10]], c: [1436 + o, 822] });
  } else if (m.name === "eyes") {
    // bands, each cut on a slant the other way from the one above; they come in from either side
    const u = slam(t), ys = [-10, 270, 540, 810, H + 10], tilt = [0, 22, -22, 22, 0];
    KIDS.forEach((who, i) => { const o = (1 - u) * 520 * (i % 2 ? 1 : -1), a = ys[i], b = ys[i + 1], ta = tilt[i], tb = tilt[i + 1];
      out.push({ who, poly: [[-10 + o, a - ta + (i ? G : 0)], [W + 10 + o, a + ta + (i ? G : 0)], [W + 10 + o, b + tb - (i < 3 ? G : 0)], [-10 + o, b - tb - (i < 3 ? G : 0)]], c: [960 + o, (a + b) / 2] }); });
  } else {
    // slices, then strips that squeeze together and lean in
    const rush = m.name === "rush", u = rush ? ease(t / 40) : 0, sq = rush ? ease((t - 4) / 44) : 0, inn = slam(rush ? 99 : t);
    const half = lerp(880, 660, sq), lean = lerp(330, 0, u), shake = L >= 199 ? (L - 197) * 1.6 : 0, j = (i, s) => shake * (rnd(i, L - L % 2, s) - 0.5) * 2;
    const xs = [0, 1, 2, 3, 4].map((i) => 960 + (i - 2) * half / 2 + j(i, 1)), ln = [0, 1, 2, 3, 4].map((i) => lean + (rush ? (2 - i) * 56 * sq : 0) + j(i, 2));
    const order = rush ? ["tane", "ife", "noor", "juno"] : ["juno", "noor", "ife", "tane"], dy = (1 - inn) * 400;
    strips(xs, ln, order, -10 + (rush ? 60 * sq : 0), H + 10 - (rush ? 60 * sq : 0));
    if (!rush) out.forEach((p, i) => { const o = dy * (i % 2 ? 1 : -1); p.poly = p.poly.map(([x, y]) => [x, y + o]); p.c = [p.c[0], p.c[1] + o]; });
  }
  return out;
}
// the borders: every panel's edge inked, with its colour inside the ink
function borders(g, list) {
  g.lineJoin = "miter";
  for (const [col, w] of [[INK, 2 * G + 6], [null, 7]]) for (const p of list) { g.strokeStyle = col ?? COLOR[p.who]; g.lineWidth = w; g.beginPath(); p.poly.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.stroke(); }
}
// The borders breaking (the kick at 208): the last page's edges in pieces, thrown outward from the middle of the frame
// and turning, on twos, with splinters of white; age in frames from the break (they are gone by 22).
export function shards(g, age) {
  if (age < 0 || age > 22) return;
  const a2 = age - age % 2 + 1, list = page(207), t = a2 / 24;
  g.save(); g.lineJoin = "miter";
  list.forEach((p, pi) => p.poly.forEach((a, ei) => {
    const b = p.poly[(ei + 1) % p.poly.length], len = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(len / 150));
    for (let i = 0; i < n; i++) {
      const s = pi * 100 + ei * 10 + i, u0 = i / n, u1 = (i + 0.72 + 0.25 * rnd(s, 1)) / n, mx = lerp(a[0], b[0], (u0 + u1) / 2), my = lerp(a[1], b[1], (u0 + u1) / 2);
      const dx = mx - W / 2, dy = my - H / 2, d = Math.hypot(dx, dy) || 1, sp = 700 + 1900 * rnd(s, 2), x = mx + dx / d * sp * t + (rnd(s, 3) - 0.5) * 500 * t, y = my + dy / d * sp * t * 0.8 + 1300 * t * t - 260 * t;
      const rot = Math.atan2(b[1] - a[1], b[0] - a[0]) + (rnd(s, 4) - 0.5) * 9 * t, hl = (u1 - u0) * len / 2 * (1 + 0.5 * t), wd = 14 + 22 * rnd(s, 5);
      g.save(); g.translate(x, y); g.rotate(rot);
      const pts = [[-hl, -wd * 0.4], [hl * (0.5 + 0.5 * rnd(s, 6)), -wd], [hl, wd * 0.3], [-hl * (0.4 + 0.6 * rnd(s, 7)), wd]];
      g.beginPath(); pts.forEach((q, k) => k ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath();
      g.lineWidth = 9; g.strokeStyle = INK; g.stroke(); g.fillStyle = rnd(s, 8) > 0.8 ? "#ffffff" : COLOR[p.who]; g.fill();
      g.restore();
    }
  }));
  // splinters: thin white needles from the middle
  if (age < 9) for (let i = 0; i < 46; i++) { const an = rnd(i, 11) * 6.283, sp = 2200 + 3800 * rnd(i, 12), r0 = 120 + sp * Math.min(t, 0.4), l = 60 + 200 * rnd(i, 13), c = Math.cos(an), s = Math.sin(an) * 0.7;
    g.strokeStyle = i % 5 ? "#ffffff" : INK; g.lineWidth = 3 + 5 * rnd(i, 14); g.beginPath(); g.moveTo(W / 2 + c * r0, H / 2 + s * r0); g.lineTo(W / 2 + c * (r0 + l), H / 2 + s * (r0 + l)); g.stroke(); }
  g.restore();
}
function frame(f) {
  const list = page(f), m = modeAt(f);
  return { clear: "#0b0a1e",
    panels: list.map((p) => ({ id: p.who, poly: p.poly, shift: [p.c[0] - W / 2, p.c[1] - H / 2], frame: content(p.who, f) })),
    overlay(g) { borders(g, list);
      // the page is re-cut on the kick: a frame of white in the gutters
      if (m.t === 0 && f) { g.strokeStyle = "#ffffff"; g.lineWidth = 2 * G + 6; for (const p of list) { g.beginPath(); p.poly.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.stroke(); } } } };
}
export { page };
export default { name: "reun_split", start: F0 / FPS, held: (f) => { const m = modeAt(f); return f - m.t % 2; }, frames: PART.meet - PART.split, fps: FPS, cutOn: "kick", sets: ["corridor", "plant", "core", "tunnel"], cast: CAST, plates: PLATES, frame,
  marks: [{ at: 0, what: "\"DEEP\": the boards light; Tane, the whole frame", on: "kick" }, { at: 10, what: "Ife's strip slams in", on: "kick" }, { at: 20, what: "Noor's strip", on: "kick" }, { at: 30, what: "Juno's strip", on: "kick" },
    { at: 19, what: "\"we're in\": the boards light", on: "backing_vocals" }, { at: 58, what: "\"we're in\"", on: "backing_vocals" }, { at: 40, what: "the page is re-cut: a cross, from the side; \"DEEP\"", on: "kick" }, { at: 79, what: "re-cut: four bands of eyes; \"DEEP\"", on: "kick" }, { at: 92, what: "\"TROUBLE\" on every board", on: "backing_vocals" },
    { at: 119, what: "re-cut: four slices", on: "kick" }, { at: 143, what: "\"TROUBLE\"", on: "backing_vocals" }, { at: 156, what: "\"TROUBLE\" (the katakana)", on: "backing_vocals" }, { at: 159, what: "re-cut: the strips begin to close", on: "kick" },
    { at: 165, what: "\"TROUBLE\"", on: "backing_vocals" }, { at: 182, what: "\"TROUBLE\"", on: "backing_vocals" }, { at: 194, what: "\"TROUBLE\"", on: "backing_vocals" }, { at: 199, what: "the borders shake", on: "kick" }, { at: 207, what: "\"TROUBLE\"", on: "backing_vocals" }] };
