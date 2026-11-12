// THE BREAKDOWN (song frames 2538-2865, 105.75-119.4 s): what its shots share. Frames here are frames of the SECTION
// (L = 0 at song frame 2538); each shot counts its own from its cut.
// Where the music really is (analysis/stems.json, and the lead-vocal stem's own envelope and pitch, frame by frame):
// the last drum hit of Ife's win is on L0, a stray kick on L12, and then there is NO kick until one pickup on L294.6
// (118.03 s); it is back for good on L328, the next section's first frame. Strings alone at first (notes on L11, L30.5,
// L36, L50, L69.5), with ONE accent of brass, keyboard and guitar on L70 and again on L75.6. The lead vocal does not
// return at 108.9 s as the early notes had it (what is there is bleed 35 dB down): it comes in at 111.24 s, L132.5,
// alone, and says the line it said to Tane: "You're (L132.5) in (L136) deep (L140) trouble, (L150.3) mister (L159.2)".
// From L170 the stem holds one high note that pulses every half beat (L182.6, L194.9, L209.4 and every five frames
// after, dying away by L290) with no words in it; drums tick under it from L224. Then "We're" (L307.5) "in" (L323),
// and "deep" is the next section's first frame (L327.5).
//   ife     0  Ife in the clearing smoke, her CRT still saying OK: a small smile. The lamps flicker (strings, L11): she looks up
//   tane   20  Tane, the pipe on his shoulder, grinning. The flicker (L30.5): he looks up
//   juno   40  Juno on her board, laughing. The flicker (L50): she looks up
//   noor   60  Noor: nothing. On the accent (L70) the core's light drops: the eyes go up, and that is all
//   dark   76  the atrium: the lights go out deck by deck, from the top down (L76, L90, L95, L100), and the screens with them
//   hall  108  over Tane's shoulder, down his corridor: the lamps die toward him, one module at a time, and reach him
//   v_ife 132  in the dark, each lit by one screen, a word each: "YOU'RE IN" on Ife's own CRT
//   v_tane 140 "DEEP" on the board beside Tane
//   v_juno 150 "TROUBLE," on the tunnel's little screen
//   v_noor 159 "MISTER." on the island's console: Noor's eyes are wide open for the first time in the film
//   w_noor 170 what they broke is leaving: the sliced enforcer drifts out of the core past Noor, slice after slice
//   w_tane 182 the three wrecks at Tane's feet open an eye each (the voice's pulse) and drag themselves off
//   w_ife  195 scorched cowls skitter away down Ife's passage
//   w_juno 202 the red round Juno's blast door goes out, and its dents ease: what was behind it has gone
//   gather 209 the atrium, dark but for the mist far down the shaft: under the bridge the wreckage comes together into
//              ONE machine, a shape against that glow; its eyes come on with the voice's pulses and turn up to us
//   m_ife  244 Ife's CRT draws a map: the station in plan, four dots, one large mass, the ways to the bridge. Relief, then resolve
//   m_tane 259 the same map on Tane's board   m_juno 269 on the tunnel's monitor   m_noor 279 on the console
//   go_tane 295 the pickup kick: Tane charges      go_ife 303 (drums) Ife scurries; her CRT says WE'RE (L307)
//   go_juno 309 (strings) Juno kicks off, the monitor behind her saying it      go_noor 318 (drums) Noor walks; the console says IN (L323)
// "Deep" and the kick's return are the reunion's first frame, which is Tane alone, coming at us (shots/reun_split.js).
import { camera } from "../engine/body.js";
import { kana, latin, kanaWidth, scanlines, FONT } from "../sets/sign.js";
import { rnd } from "../engine/fx.js";
export { rnd };
export const FPS = 24, F0 = 2538, W = 1920, H = 1080, PW = 2752, PH = 1536;
export const CUT = { ife: 0, tane: 20, juno: 40, noor: 60, dark: 76, hall: 108, v_ife: 132, v_tane: 140, v_juno: 150, v_noor: 159, w_noor: 170, w_tane: 182, w_ife: 195, w_juno: 202,
  gather: 209, m_ife: 244, m_tane: 259, m_juno: 269, m_noor: 279, go_tane: 295, go_ife: 303, go_juno: 309, go_noor: 318, end: 328 };
const ORDER = Object.keys(CUT);
export const startOf = (name) => (F0 + CUT[name]) / FPS, lengthOf = (name) => CUT[ORDER[ORDER.indexOf(name) + 1]] - CUT[name];
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), lerp = (a, b, t) => a + (b - a) * t, mix3 = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
export const ease = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
export const wob = (f, a, b, c) => Math.sin(f * a + c) * 0.6 + Math.sin(f * b + c * 2.3) * 0.4;
// a shot of this section
export const shot = (name, o) => ({ name: "brk_" + name, start: startOf(name), frames: lengthOf(name), fps: FPS, ...o });
// the events the shots hang on (section frames)
export const EV = { look: { ife: 11, tane: 30, juno: 50, noor: 70 }, decks: [76, 90, 95, 100], voice: 132, mister: 159, quiet: 182, pulses: [183, 195, 209, 214, 219, 224, 229, 234, 239], map: 244, kick: 295, were: 307, inn: 323 };
// what the station says, a word at a time
export const WORDS = [[132, "YOU'RE", "ユーア"], [136, "IN", "イン"], [140, "DEEP", "ディープ"], [150, "TROUBLE,", "トラブル"], [159, "MISTER.", "ミスター"], [307, "WE'RE", "ウィーア"], [323, "IN", "イン"]];
export const wordAt = (L) => { let w = null; for (const x of WORDS) if (L >= x[0]) w = x; return w; };
// the four, their colours on the map, and the phosphor of the screen nearest each
export const KIDS = ["tane", "ife", "noor", "juno"], COLOUR = { tane: "#ff3b30", ife: "#5dff8c", noor: "#d9c2ff", juno: "#ff9a2e" };
export const PAL = { amber: { ink: "#ffb428", dim: "#8a5a10", bg: "#1c0d02", glow: [1.0, 0.7, 0.24] }, green: { ink: "#6dff9c", dim: "#1c7a40", bg: "#04160b", glow: [0.45, 1.0, 0.6] }, violet: { ink: "#efe4ff", dim: "#6a52a8", bg: "#140a2c", glow: [0.85, 0.72, 1.0] } };

// ---- a picture laid on a quadrilateral of the frame (a screen seen at an angle) ------------------------------------------
// quad: [TL, TR, BR, BL] in pixels. The picture is painted by paint(c, w, h) on its own canvas and laid over the quad in
// perspective (a grid of small triangles, each an affine piece).
const canvases = new Map();
export function onQuad(g, quad, w, h, paint, n = 10) {
  const key = w + "x" + h; if (!canvases.has(key)) canvases.set(key, new OffscreenCanvas(w, h));
  const cv = canvases.get(key), c = cv.getContext("2d"); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1; c.clearRect(0, 0, w, h); c.save(); paint(c, w, h); c.restore();
  const [p0, p1, p2, p3] = quad, dx1 = p1[0] - p2[0], dx2 = p3[0] - p2[0], sx = p0[0] - p1[0] + p2[0] - p3[0], dy1 = p1[1] - p2[1], dy2 = p3[1] - p2[1], sy = p0[1] - p1[1] + p2[1] - p3[1], det = dx1 * dy2 - dx2 * dy1;
  const G = (sx * dy2 - dx2 * sy) / det, Hh = (dx1 * sy - sx * dy1) / det, a = p1[0] - p0[0] + G * p1[0], b = p3[0] - p0[0] + Hh * p3[0], d = p1[1] - p0[1] + G * p1[1], e = p3[1] - p0[1] + Hh * p3[1];
  const at = (u, v) => { const q = G * u + Hh * v + 1; return [(a * u + b * v + p0[0]) / q, (d * u + e * v + p0[1]) / q]; };
  const tri = (s, t) => {      // source triangle s (pixels of the picture) onto t (pixels of the frame)
    const [[u0, v0], [u1, v1], [u2, v2]] = s, [[x0, y0], [x1, y1], [x2, y2]] = t, D = (u1 - u0) * (v2 - v0) - (u2 - u0) * (v1 - v0); if (Math.abs(D) < 1e-9) return;
    const A = ((x1 - x0) * (v2 - v0) - (x2 - x0) * (v1 - v0)) / D, B = ((x2 - x0) * (u1 - u0) - (x1 - x0) * (u2 - u0)) / D, C = ((y1 - y0) * (v2 - v0) - (y2 - y0) * (v1 - v0)) / D, E = ((y2 - y0) * (u1 - u0) - (y1 - y0) * (u2 - u0)) / D;
    const cx = (x0 + x1 + x2) / 3, cy = (y0 + y1 + y2) / 3, out = (x, y) => { const l = Math.hypot(x - cx, y - cy) || 1; return [x + (x - cx) / l * 0.7, y + (y - cy) / l * 0.7]; };      // a hair larger: no seams
    g.save(); g.beginPath(); g.moveTo(...out(x0, y0)); g.lineTo(...out(x1, y1)); g.lineTo(...out(x2, y2)); g.closePath(); g.clip();
    g.transform(A, C, B, E, x0 - A * u0 - B * v0, y0 - C * u0 - E * v0); g.drawImage(cv, 0, 0); g.restore();
  };
  g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    const u0 = i / n, u1 = (i + 1) / n, v0 = j / n, v1 = (j + 1) / n, A0 = at(u0, v0), A1 = at(u1, v0), A2 = at(u1, v1), A3 = at(u0, v1);
    tri([[u0 * w, v0 * h], [u1 * w, v0 * h], [u1 * w, v1 * h]], [A0, A1, A2]); tri([[u0 * w, v0 * h], [u1 * w, v1 * h], [u0 * w, v1 * h]], [A0, A2, A3]);
  }
  g.restore();
}
// a screen that is in a set: its centre, the way its text runs, up, its size (metres) -> its quad on the frame (null if it is behind the camera)
export function quadIn(cam, s) {
  const v = s.v ?? [0, 1, 0], P = (a, b) => cam.project([s.c[0] + s.u[0] * a * s.w / 2 + v[0] * b * s.h / 2, s.c[1] + s.u[1] * a * s.w / 2 + v[1] * b * s.h / 2, s.c[2] + s.u[2] * a * s.w / 2 + v[2] * b * s.h / 2]);
  const q = [P(-1, 1), P(1, 1), P(1, -1), P(-1, -1)]; if (q.some((p) => p.z < 0.15)) return null;
  let area = 0; q.forEach((p, i) => { const n = q[(i + 1) % 4]; area += p.x * n.y - n.x * p.y; }); return area <= 0 ? null : q.map((p) => [p.x, p.y]);      // (seen from behind, it is its back)
}
// a screen that is in a drawing: its quad in the drawing's pixels, and how the drawing is hung
export const quadOf = (hung, q) => q.map(([px, py]) => [hung.x + (px - PW / 2) * hung.scale, hung.y + (py - PH / 2) * hung.scale]);

// ---- what a screen shows ---------------------------------------------------------------------------------------------------
// The station's voice: one word, large, its katakana with it, in the screen's own phosphor. t: frames since the word came on.
export function sayOn(c, w, h, pal, text, small, t = 9) {
  const flare = t < 2; c.fillStyle = flare ? pal.ink : pal.bg; c.fillRect(0, 0, w, h); const ink = flare ? pal.bg : pal.ink;
  c.strokeStyle = ink; c.lineWidth = h * 0.028; c.strokeRect(h * 0.05, h * 0.05, w - h * 0.1, h - h * 0.1);
  if (w / h > 2.2) {      // a long board: the word, and the katakana down its right-hand end
    const px = h * 0.66; c.font = FONT(px); const tw = c.measureText(text).width, room = w - h * 0.62, k = Math.min(1, room / tw);
    c.save(); c.translate(h * 0.16 + (room - tw * k) / 2, h * 0.74); c.scale(k, 1); c.fillStyle = ink; c.fillText(text, 0, 0); c.restore();
    const n = [...small].length, s = Math.min(h * 0.2, h * 0.8 / (n * 1.0)); kana(c, small, w - h * 0.3 - s / 2, h * 0.5 - n * s / 2, s, s * 0.16, ink, { vertical: true, pitch: 1.0 });
  } else {
    const px = h * 0.44; c.font = FONT(px); const tw = c.measureText(text).width, k = Math.min(1, (w - h * 0.24) / tw);
    c.save(); c.translate(w / 2 - tw * k / 2, h * 0.56); c.scale(k, 1); c.fillStyle = ink; c.fillText(text, 0, 0); c.restore();
    const s = h * 0.16; kana(c, small, w / 2 - kanaWidth(small, s) / 2, h * 0.68, s, s * 0.15, ink);
  }
  scanlines(c, w, h, 0.34, Math.max(4, Math.round(h / 44)));
}
// A screen with the power gone: black glass; `wake` 0..1: a line of phosphor opening across it
export function deadOn(c, w, h, pal, wake = 0) {
  c.fillStyle = "#020306"; c.fillRect(0, 0, w, h);
  if (wake > 0) { c.fillStyle = pal.ink; const hh = Math.max(2, h * 0.012) + h * 0.5 * Math.max(0, wake - 0.5) * 2; c.fillRect(w / 2 - w * 0.5 * Math.min(1, wake * 2), h / 2 - hh, w * Math.min(1, wake * 2), hh * 2); }
}
// The map: the station in plan, a vector display. The atrium is the ring in the middle with the core tower in it and the
// bridge across; four ways run out from it to where the four are, a dot each in their colour (`me` has a box round it);
// in the atrium one large mass, red, blinking, and growing as small red marks run in to it along the ways; and the ways
// themselves light up, from each dot to the bridge. t: frames since the map came on.
const WAYS = { tane: [[-0.5, -0.1], [-0.92, -0.1], [-0.92, -0.62], [-1.5, -0.62]], ife: [[-0.42, 0.28], [-0.7, 0.28], [-0.7, 0.66], [-1.42, 0.66]], noor: [[0.46, -0.2], [0.8, -0.2], [0.8, -0.66], [1.46, -0.66]], juno: [[0.5, 0.12], [1.0, 0.12], [1.0, 0.6], [1.5, 0.6]] };
const PLACE = { tane: "セクター", ife: "レイキャク", noor: "コア", juno: "トンネル" };
export function mapOn(c, w, h, pal, me, t) {
  c.fillStyle = pal.bg; c.fillRect(0, 0, w, h);
  const wide = w / h > 2.2, S = h * (wide ? 0.6 : 0.4), kx = wide ? 1.42 : Math.min(1.0, (w * 0.46) / (1.55 * S)), cx = w / 2, cy = h * (wide ? 0.5 : 0.54), X = (x) => cx + x * S * kx, Y = (y) => cy + y * S, lw = Math.max(2, h / 70), t2 = t - t % 2;
  const line = (pts, col, width, dash, off = 0) => { c.strokeStyle = col; c.lineWidth = width; c.lineJoin = "miter"; c.setLineDash(dash ?? []); c.lineDashOffset = off; c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(X(x), Y(y)) : c.moveTo(X(x), Y(y))); c.stroke(); c.setLineDash([]); };
  const ring = (r, col, width, n = 48, dash) => line([...Array(n + 1)].map((_, i) => [Math.cos(i / n * 6.2832) * r / kx * (wide ? 1.15 : 1), Math.sin(i / n * 6.2832) * r]), col, width, dash);
  c.strokeStyle = pal.dim; c.lineWidth = lw; c.strokeRect(h * 0.04, h * 0.04, w - h * 0.08, h - h * 0.08);
  if (!wide) { kana(c, "ゼンタイズ", h * 0.09, h * 0.09, h * 0.075, h * 0.012, pal.dim); latin(c, "R7", w - h * 0.09, h * 0.16, h * 0.085, pal.dim, { align: "right" }); }
  if (t >= 1) { ring(0.5, pal.ink, lw * 1.2); ring(0.14, pal.ink, lw, 8); line([[0.12, 0.05], [0.5, 0.05]], pal.ink, lw * 2.2); line([[0.12, -0.05], [0.5, -0.05]], pal.dim, lw * 0.7); }
  KIDS.forEach((k, i) => {
    const way = WAYS[k], end = way[way.length - 1], on = t >= 3 + i * 2;
    if (t >= 2) { line(way, pal.dim, lw * 2.6); line(way, pal.bg, lw * 1.2); const bx = end[0] + (end[0] < 0 ? -0.2 : 0.2), s = Math.sign(end[0]); line([[end[0], end[1] - 0.14], [bx + s * 0.02, end[1] - 0.14], [bx + s * 0.02, end[1] + 0.14], [end[0], end[1] + 0.14]], pal.dim, lw); }
    // the way to the bridge lights from the dot inward
    const go = clamp((t - 12 - i) / 8); if (go > 0) { const pts = way.slice().reverse(), total = pts.slice(1).reduce((a, p, j) => a + Math.hypot(p[0] - pts[j][0], p[1] - pts[j][1]), 0); let left = total * go; const out = [pts[0]];
      for (let j = 1; j < pts.length && left > 0; j++) { const l = Math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1]), u = Math.min(1, left / l); out.push([pts[j - 1][0] + (pts[j][0] - pts[j - 1][0]) * u, pts[j - 1][1] + (pts[j][1] - pts[j - 1][1]) * u]); left -= l; }
      line(out, COLOUR[k], lw * 1.1, [lw * 3, lw * 2.4], -t2 * lw * 0.9); }
    // small red marks running in along the way: what is being pulled together
    if (t >= 6) for (let m = 0; m < 3; m++) { const u = ((t2 * 0.035 + m / 3 + i * 0.13) % 1), pts = way.slice().reverse(), seg = Math.min(pts.length - 2, Math.floor(u * (pts.length - 1))), v = u * (pts.length - 1) - seg, x = pts[seg][0] + (pts[seg + 1][0] - pts[seg][0]) * v, y = pts[seg][1] + (pts[seg + 1][1] - pts[seg][1]) * v; c.fillStyle = "#ff2a1e"; c.fillRect(X(x) - lw * 1.1, Y(y) - lw * 1.1, lw * 2.2, lw * 2.2); }
    if (on) { const r = lw * (t - (3 + i * 2) < 2 ? 5.2 : 3.4); c.fillStyle = COLOUR[k]; c.beginPath(); c.arc(X(end[0]), Y(end[1]), r, 0, 7); c.fill(); c.fillStyle = "#ffffff"; c.beginPath(); c.arc(X(end[0]), Y(end[1]), r * 0.36, 0, 7); c.fill();
      if (k === me && t2 % 8 < 6) { c.strokeStyle = COLOUR[k]; c.lineWidth = lw; const q = lw * 7; c.strokeRect(X(end[0]) - q, Y(end[1]) - q, q * 2, q * 2); }
      if (!wide || h > 200) kana(c, PLACE[k], X(end[0]) + (end[0] < 0 ? lw * 6 : -lw * 6 - kanaWidth(PLACE[k], h * 0.05)), Y(end[1]) - h * 0.115, h * 0.05, h * 0.009, pal.dim); }
  });
  // the mass: a ragged block of red squares in the atrium, larger every few frames, blinking
  if (t >= 6) { const n = Math.min(26, 6 + Math.floor((t - 6) * 0.7)), onNow = Math.floor(t / 3) % 2 === 0; c.fillStyle = onNow ? "#ff2a1e" : "#7a0f0a";
    for (let i = 0; i < n; i++) { const a = rnd(i, 3) * 6.2832, r = 0.3 * Math.sqrt(rnd(i, 5)) * Math.min(1, 0.45 + n / 40), s = lw * (2.2 + 2.6 * rnd(i, 7)); c.fillRect(X(Math.cos(a) * r / kx * 0.9) - s, Y(Math.sin(a) * r * 0.8) - s, s * 2, s * 2); }
    if (onNow) { c.strokeStyle = "#ff2a1e"; c.lineWidth = lw; const q = S * 0.43; c.strokeRect(cx - q * (wide ? 1.3 : 1), cy - q, q * 2 * (wide ? 1.3 : 1), q * 2); } }
  scanlines(c, w, h, 0.3, Math.max(4, Math.round(h / 44)));
}
// what a kid's screen shows at L: { kind: "idle" | "dead" | "say" | "map", ... }. The screens die with the lights, wake on the voice, go quiet, and draw the map.
export function screenAt(L, who) {
  const w = wordAt(L);
  if (L >= EV.were) return { kind: "say", text: w[1], small: w[2], t: L - w[0] };
  if (L >= EV.map) return { kind: "map", t: L - EV.map, me: who };
  if (L >= EV.voice && L < EV.quiet && w) return { kind: "say", text: w[1], small: w[2], t: L - w[0] };
  if (L >= EV.quiet) return { kind: "dead", wake: 0 };      // the line said, the screens go out again
  return { kind: "idle" };      // before the voice: whatever the place's own screens were showing
}
export function screenPaint(s, pal, c, w, h) {
  if (s.kind === "say") sayOn(c, w, h, pal, s.text, s.small, s.t); else if (s.kind === "map") mapOn(c, w, h, pal, s.me, s.t); else deadOn(c, w, h, pal, s.wake ?? 0);
}
// the light a screen throws on a drawing beside it: its colour, harder for the first frames of a word
export const screenGlow = (s, pal) => s.kind === "say" ? pal.glow.map((v) => v * (s.t < 2 ? 1.25 : 0.95)) : s.kind === "map" ? pal.glow.map((v) => v * 0.9) : null;

// Where a whole-figure drawing stands in a frame: its foot point (pixels of the drawing) on the world point `at`.
export function stand(cam, at, foot, m, k = 1) {
  const c = camera({ fov: 30, ...cam, w: W, h: H }), p = c.project(at), scale = p.s * m * k;
  return { x: p.x + (PW / 2 - foot[0]) * scale, y: p.y + (PH / 2 - foot[1]) * scale, scale, depth: p.z };
}
// a drawing hung so that the point `face` of it (its own pixels) is at (fx, fy) of the frame
export const hang = (face, fx, fy, scale) => ({ x: W * fx + (PW / 2 - face[0]) * scale, y: H * fy + (PH / 2 - face[1]) * scale, scale });
