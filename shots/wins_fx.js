// Effects the wins' shots paint on the stage's 2D layers: drawn smoke, bursts, sparks, shards, smears. Hard shapes in
// flat colours with an ink line, on twos, as an effects animator would draw them; each a pure function of its inputs.
import { rnd } from "./wins_cast.js";
const INK = "#0b0a1e";

// SMOKE, drawn: a clump of round lobes that billows out of a point, rolls upward, and comes apart: the lobes shrink
// each at its own rate and drift away from each other until the last are specks.
// at: [x, y, z] where it started; age: frames since (it is drawn on twos); o: { size (metres), life (frames),
// n lobes, seed, base, shade, drift: [x, y, z] metres per second, up }. One outline round the whole clump, a shade
// crescent on each lobe's underside.
export function smoke(g, cam, at, age, o = {}) {
  const { size = 0.9, life = 30, n = 14, seed = 1, base = "#d5d1ea", shade = "#8580bb", drift = [0, 0, 0], up = 1.1, ink = INK, hot = false, squash = 1 } = o;
  if (age < 0 || age >= life) return;
  const a2 = age - age % 2, t = a2 / life, grow = 1 - Math.exp(-a2 / 4), fade = t > 0.45 ? (t - 0.45) / 0.55 : 0, sec = a2 / 24;
  const lobes = [];
  for (let i = 0; i < n; i++) {
    const an = rnd(seed, i, 1) * 6.283, el = (rnd(seed, i, 2) - 0.3) * 1.6, d = size * (0.15 + 0.85 * rnd(seed, i, 3)) * (grow + 0.9 * fade), r0 = size * (0.16 + 0.36 * rnd(seed, i, 4) ** 1.5);
    const p = cam.project([at[0] + Math.cos(an) * Math.cos(el) * d + drift[0] * sec, at[1] + (Math.sin(el) * d * 0.8 + (up * sec) * (0.4 + 0.6 * rnd(seed, i, 5))) * squash + drift[1] * sec, at[2] + Math.sin(an) * Math.cos(el) * d + drift[2] * sec]);
    if (p.z <= 0.2) continue;
    const r = r0 * (0.5 + 0.7 * grow) * Math.max(0, 1 - fade * (0.75 + 1.1 * rnd(seed, i, 6))) * p.s;
    if (r > 1.5) lobes.push({ x: p.x, y: p.y, r, i, core: d < size * 0.45 });
  }
  if (!lobes.length) return;
  lobes.sort((a, b) => b.r - a.r);
  const disc = (x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill(); };
  const lw = Math.max(2.5, Math.min(4.5, lobes[0].r * 0.08));
  g.fillStyle = ink; for (const l of lobes) disc(l.x, l.y, l.r + lw);
  g.fillStyle = shade; for (const l of lobes) disc(l.x, l.y, l.r);
  g.fillStyle = base; for (const l of lobes) disc(l.x - l.r * 0.14, l.y - l.r * 0.18, l.r * 0.78);
  // what blew up is still burning inside it for a few frames: the inner lobes are fire
  if (hot && a2 < 6) { g.fillStyle = a2 < 2 ? "#ffb43c" : "#f0702a"; for (const l of lobes) if (l.core) disc(l.x, l.y, l.r * (0.8 - a2 * 0.11)); g.fillStyle = "#ffe27a"; if (a2 < 2) for (const l of lobes) if (l.core) disc(l.x, l.y, l.r * 0.4); }
  // a curl of ink inside the big lobes: the line an animator gives a billow
  g.strokeStyle = ink; g.lineWidth = lw * 0.7; g.lineCap = "round";
  for (const l of lobes.slice(0, 4)) { if (l.r < 22 || (hot && a2 < 6 && l.core)) continue; const a0 = rnd(seed, l.i, 7) * 6.283; g.beginPath(); g.arc(l.x + l.r * 0.1, l.y + l.r * 0.12, l.r * 0.52, a0, a0 + 1.4); g.stroke(); }
}
// A BURST: a hard star, white then yellow then orange, a few frames long. R in pixels.
export function burst(g, x, y, R, age, seed = 0, n = 13) {
  if (age < 0 || age > 5) return;
  const cols = ["#ffffff", "#fff6d8", "#ffe27a", "#ffb43c", "#ff8a2a", "#ff8a2a"], k = age < 4 ? 1 + age * 0.22 : 0.7;
  const star = (r, col, turn) => { g.fillStyle = col; g.beginPath(); for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * 6.2832 + turn, rr = i % 2 ? r * (0.3 + 0.08 * age) : r * (0.75 + 0.55 * rnd(i, seed, age - age % 2)); g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.9); } g.closePath(); g.fill(); };
  star(R * k * 1.12, INK, seed + age * 0.4); star(R * k, cols[age], seed + age * 0.4); if (age < 3) star(R * k * 0.5, "#ffffff", seed + 1 + age * 0.4);
}
// SPARKS: short hard streaks thrown from a point. at: world; dir: [x, y, z] the way they are thrown (metres per second,
// scattered round it); age in frames.
export function sparks(g, cam, at, dir, age, o = {}) {
  const { n = 14, seed = 0, life = 12, spread = 0.6, color = "#ffe27a", hot = "#ffffff", width = 5, grav = 9.8 } = o;
  if (age < 0 || age >= life) return;
  const a2 = age - age % 2, t0 = a2 / 24, t1 = (a2 + 1.4) / 24;
  for (let i = 0; i < n; i++) {
    const sp = 0.5 + rnd(seed, i, 1), v = [dir[0] * sp + (rnd(seed, i, 2) - 0.5) * spread * 8, dir[1] * sp + (rnd(seed, i, 3) - 0.5) * spread * 8, dir[2] * sp + (rnd(seed, i, 4) - 0.5) * spread * 8];
    if (rnd(seed, i, 5) < a2 / life) continue;
    const at2 = (t) => cam.project([at[0] + v[0] * t, Math.max(0.02, at[1] + v[1] * t - 0.5 * grav * t * t), at[2] + v[2] * t]), a = at2(t0), b = at2(t1);
    if (a.z <= 0.2 || b.z <= 0.2) continue;
    g.lineCap = "butt"; g.strokeStyle = INK; g.lineWidth = width + 4; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
    g.strokeStyle = i % 3 ? color : hot; g.lineWidth = width; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
  }
}
// SHARDS: flat chips of whatever broke, tumbling. list: [{ at, v, size (metres), spin, col, cut }]; age in frames.
export const shardsOf = (n, seed, at, v, spread, cols) => Array.from({ length: n }, (_, i) => ({ at: [at[0] + (rnd(seed, i, 1) - 0.5) * 0.5, at[1] + (rnd(seed, i, 2) - 0.5) * 0.5, at[2] + (rnd(seed, i, 3) - 0.5) * 0.5],
  v: [v[0] + (rnd(seed, i, 4) - 0.5) * spread, v[1] + (rnd(seed, i, 5) - 0.3) * spread, v[2] + (rnd(seed, i, 6) - 0.5) * spread], size: 0.03 + 0.11 * rnd(seed, i, 7) ** 2, spin: (rnd(seed, i, 8) - 0.5) * 1.4, cut: 0.4 + rnd(seed, i, 9), col: cols[i % cols.length] }));
export function shards(g, cam, list, age, floor = 0.03) {
  if (age < 1) return; const t = (age - age % 2 + 1) / 24;
  for (const s of list) {
    const y = s.at[1] + s.v[1] * t - 4.9 * t * t; if (y < floor) continue;
    const p = cam.project([s.at[0] + s.v[0] * t, y, s.at[2] + s.v[2] * t]); if (p.z <= 0.2) continue;
    const r = s.size * p.s; g.save(); g.translate(p.x, p.y); g.rotate(s.spin * age); g.lineJoin = "miter"; g.lineWidth = Math.min(5, 2 + r * 0.2); g.strokeStyle = INK; g.fillStyle = s.col;
    g.beginPath(); g.moveTo(-r, -r * 0.35); g.lineTo(r * 1.1, -r * 0.7 * s.cut); g.lineTo(r * 0.2 * s.cut, r * 0.8); g.closePath(); g.stroke(); g.fill(); g.restore();
  }
}
// A SMEAR: the swept shape of something swung in one frame: a crescent about (cx, cy) from angle a0 to a1 (radians,
// screen, y down), r0 to r1 pixels, thick at its leading end, drawn in bands of the thing's colours.
export function smear(g, cx, cy, r0, r1, a0, a1, cols = ["#e9eef2", "#9aa7b4"], o = {}) {
  const n = 18, lead = o.lead ?? 1;
  const band = (ra, rb, col) => { g.fillStyle = col; g.beginPath(); for (let i = 0; i <= n; i++) { const t = i / n, a = a0 + (a1 - a0) * t, w = lead > 0 ? 0.25 + 0.75 * t : 1 - 0.75 * t, r = (ra + rb) / 2 + (rb - ra) / 2 * w; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
    for (let i = n; i >= 0; i--) { const t = i / n, a = a0 + (a1 - a0) * t, w = lead > 0 ? 0.25 + 0.75 * t : 1 - 0.75 * t, r = (ra + rb) / 2 - (rb - ra) / 2 * w; g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } g.closePath(); g.fill(); };
  band(r0 - 5, r1 + 5, INK); band(r0, r1, cols[0]); band(r0 + (r1 - r0) * 0.55, r1, cols[1]);
  // drag lines off its trailing end
  g.strokeStyle = cols[0]; g.lineWidth = 3; for (let i = 0; i < 5; i++) { const r = r0 + (r1 - r0) * (0.1 + 0.2 * i), aa = a0 - (a1 - a0) * (0.08 + 0.1 * rnd(i, 3)); g.beginPath(); g.arc(cx, cy, r, Math.min(aa, a0), Math.max(aa, a0)); g.stroke(); }
}
// A length of pipe lying or flying: drawn between two world points, steel with a darker underside and a coupling at
// one end, as Tane's drawings have it.
export function pipe(g, cam, a, b, o = {}) {
  const p = cam.project(a), q = cam.project(b); if (p.z <= 0.2 || q.z <= 0.2) return;
  const w = (o.r ?? 0.024) * (p.s + q.s), dx = q.x - p.x, dy = q.y - p.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
  const seg = (k0, k1, ww, col, off = 0) => { g.strokeStyle = col; g.lineWidth = ww; g.lineCap = "butt"; g.beginPath(); g.moveTo(p.x + dx * k0 + nx * off, p.y + dy * k0 + ny * off); g.lineTo(p.x + dx * k1 + nx * off, p.y + dy * k1 + ny * off); g.stroke(); };
  seg(-0.01, 1.01, w + 6, INK); seg(0, 1, w, "#aab5c0"); seg(0, 1, w * 0.4, "#6c7c92", w * 0.3 * (ny > 0 ? 1 : -1)); seg(0.86, 1.0, w * 1.5 + 6, INK); seg(0.87, 0.99, w * 1.5, "#8794a3");
}
