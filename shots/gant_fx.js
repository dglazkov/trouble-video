// What the gantry's shots paint on the stage's 2D layers: the drones' fire and what it does. Hard shapes, flat colours,
// on twos where it boils. Everything is a pure function of what it is given; points are world points seen through
// the frame's camera (engine/body.js camera().project).
import { rnd, FLY } from "./gant_cast.js";
const HOT = "#fff6d8", RED = "#ff2a3a", ORANGE = "#ff8a2a", YELLOW = "#ffd23c", INK = "#0b0a1e";
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const vis = (cam, p) => (p[0] - cam.pos[0]) * cam.fwd[0] + (p[1] - cam.pos[1]) * cam.fwd[1] + (p[2] - cam.pos[2]) * cam.fwd[2] > 0.3;
// a tapered streak between two screen points, w0 wide at a and w1 at b
function taper(g, a, b, w0, w1, col) { const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l; g.fillStyle = col; g.beginPath(); g.moveTo(a.x + nx * w0, a.y + ny * w0); g.lineTo(b.x + nx * w1, b.y + ny * w1); g.lineTo(b.x - nx * w1, b.y - ny * w1); g.lineTo(a.x - nx * w0, a.y - ny * w0); g.closePath(); g.fill(); }
// a jagged star round (x, y)
function star(g, x, y, R, n, seed, col, squash = 1, inner = 0.3) { g.fillStyle = col; g.beginPath(); for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * 2 * Math.PI + seed, r = i % 2 ? R * inner : R * (0.65 + 0.7 * rnd(i, seed)); g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r * squash); } g.closePath(); g.fill(); }
// The bolt of shot s on song frame F, while it is in the air: a red dart with a white core, its tail longer than it
// goes in a frame. Also the flash at the muzzle on the frame it leaves.
export function bolts(g, cam, shots, F) {
  for (const s of shots) {
    const u = F - (s.at - FLY); if (u < 0 || u >= FLY) continue;
    const head = lerp3(s.from, s.to, (u + 1) / (FLY + 0.35)), tail = lerp3(s.from, s.to, Math.max(0, (u - 0.25) / (FLY + 0.35)));
    if (!vis(cam, head) || !vis(cam, tail)) continue;
    const a = cam.project(tail), b = cam.project(head), w = Math.max(5, 0.085 * b.s);
    taper(g, a, b, w * 0.25, w * 1.5, INK); taper(g, a, b, w * 0.15, w, RED); taper(g, lerp2(a, b, 0.25), b, w * 0.1, w * 0.5, HOT);
    if (u === 0 && vis(cam, s.from)) { const m = cam.project(s.from); star(g, m.x, m.y, 0.5 * m.s, 7, s.at, HOT, 1, 0.22); }
  }
}
const lerp2 = (a, b, t) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
// What a shot leaves where it lands, from the frame it lands: a burst (three frames of hard shapes), sparks that fly
// and fall on twos, and a scorch that stays. `part`: "burst" (over the figures) or "scorch" (under them).
export function impacts(g, cam, shots, F, part = "burst") {
  for (const s of shots) {
    const age = F - s.at; if (age < 0 || !vis(cam, s.to)) continue;
    const p = cam.project(s.to), k = 0.5 * (s.size ?? 1) * p.s;
    if (part === "scorch") {
      if (age < 1) continue;
      g.fillStyle = INK; g.beginPath(); for (let i = 0; i < 9; i++) { const a = i / 9 * 6.283, r = k * (0.2 + 0.18 * rnd(i, s.at)); g.lineTo(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r * 0.8); } g.closePath(); g.fill();
      if (age < 30) { g.fillStyle = age < 12 ? ORANGE : "#b8401c"; g.beginPath(); g.arc(p.x, p.y, k * 0.1 * (1 - age / 40), 0, 7); g.fill(); }      // it glows a while
      continue;
    }
    if (age === 0) { star(g, p.x, p.y, k * 1.25, 9, s.at, INK, 1, 0.34); star(g, p.x, p.y, k * 1.1, 9, s.at, HOT, 1, 0.3); }
    else if (age === 1) { star(g, p.x, p.y, k * 1.0, 8, s.at + 1, YELLOW, 1, 0.28); star(g, p.x, p.y, k * 0.55, 6, s.at + 2, HOT); }
    else if (age < 4) { star(g, p.x, p.y, k * 0.7, 7, s.at + 3, ORANGE, 1, 0.2); }
    if (age >= 1 && age < 16) {      // sparks, on twos: short streaks along the way each is going
      const t = (age - age % 2 + 1) / 24, n = s.sparks ?? 12;
      for (let i = 0; i < n; i++) {
        const v = [(rnd(i, s.at, 1) - 0.5) * 7 + (s.kick?.[0] ?? 0), 1 + rnd(i, s.at, 2) * 5 + (s.kick?.[1] ?? 0), (rnd(i, s.at, 3) - 0.5) * 7 + (s.kick?.[2] ?? 0)], life = 0.25 + 0.4 * rnd(i, s.at, 4); if (t > life) continue;
        const at = (tt) => [s.to[0] + v[0] * tt, s.to[1] + v[1] * tt - 4.9 * tt * tt, s.to[2] + v[2] * tt], a = at(t), b = at(Math.max(0, t - 0.035)); if (!vis(cam, a) || !vis(cam, b)) continue;
        const A = cam.project(a), B = cam.project(b), w = Math.max(2, 0.022 * A.s);
        taper(g, B, A, w * 0.3, w, i % 3 ? YELLOW : HOT);
      }
    }
  }
}
// A cable slung between two points (a catenary of `sag` metres). Cut at song frame `at` (null: whole) at its
// middle: each half swings down from its own end and whips, its free end spitting sparks for a while.
export function cable(g, cam, a, b, sag, F, at, o = {}) {
  const N = 14, pts = (from, to, half) => {
    const out = [], u = at === null || at === undefined ? -1 : F - at;
    for (let i = 0; i <= N; i++) {
      const t = i / N * (half ? 0.5 : 1), base = lerp3(from, to, t), y = base[1] - sag * 4 * t * (1 - t);
      if (u < 0) { out.push([base[0], y, base[2]]); continue; }
      // the half hangs from `from`: it swings down like a pendulum that dies away, and a wave runs along it
      const len = Math.hypot(to[0] - from[0], to[2] - from[2]) * 0.5, s = t / 0.5, tt = u / 24, sw = 1 - Math.exp(-tt * 5), ang = (Math.PI / 2) * sw + 0.5 * Math.exp(-tt * 1.6) * Math.sin(tt * 9) * sw;
      const dz = Math.sign(to[2] - from[2]) * Math.cos(ang) * len * s, dy = -Math.sin(ang) * len * s, wave = 0.35 * Math.exp(-tt * 2.2) * Math.sin(s * 5 - tt * 16) * s;
      out.push([from[0] + (o.out ?? 0.5) * wave, from[1] + dy - sag * 0.3 * s * (1 - sw), from[2] + dz + wave * 0.6]);
    }
    return out;
  };
  const draw = (l) => { const q = l.filter((p) => vis(cam, p)).map((p) => cam.project(p)); if (q.length < 2) return null; const w = Math.max(3, 0.045 * q[0].s);
    for (const [lw, col] of [[w + 4, INK], [w, o.color ?? "#3a3348"]]) { g.strokeStyle = col; g.lineWidth = lw; g.lineJoin = "round"; g.lineCap = "round"; g.beginPath(); q.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); g.stroke(); } return q[q.length - 1]; };
  if (at === null || at === undefined || F < at) { draw(pts(a, b, false)); return; }
  const u = F - at;
  for (const [from, to, k] of [[a, b, 1], [b, a, 2]]) {
    const tip = draw(pts(from, to, true)); if (!tip || u > 40) continue;
    if ((u + k) % 4 < 2) { star(g, tip.x, tip.y, 0.3 * tip.s * (1 - u / 60), 6, u + k, u % 8 < 4 ? HOT : YELLOW, 1, 0.2); }
  }
}
