// What the core's shots paint on the stage's 2D layers: the grid's beams where they pass in front of a figure, the
// glint where one stops by it, sparks where they bite the enforcer, the dust that hangs in the core. Hard shapes,
// flat colours. Everything is a pure function of what it is given; points are world points seen through the frame's
// camera (engine/body.js camera().project).
import { rnd, EV } from "./core_cast.js";
const HOT = "#ffffff", LILAC = "#d9b8ff", VIOLET = "#8a4cff", INK = "#1a0f3a";
const vis = (cam, p) => (p[0] - cam.pos[0]) * cam.fwd[0] + (p[1] - cam.pos[1]) * cam.fwd[1] + (p[2] - cam.pos[2]) * cam.fwd[2] > 0.3;
const dist = (cam, p) => (p[0] - cam.pos[0]) * cam.fwd[0] + (p[1] - cam.pos[1]) * cam.fwd[1] + (p[2] - cam.pos[2]) * cam.fwd[2];
function strip(g, a, b, w0, w1, col, alpha = 1) { const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l; g.globalAlpha = alpha; g.fillStyle = col; g.beginPath(); g.moveTo(a.x + nx * w0, a.y + ny * w0); g.lineTo(b.x + nx * w1, b.y + ny * w1); g.lineTo(b.x - nx * w1, b.y - ny * w1); g.lineTo(a.x - nx * w0, a.y - ny * w0); g.closePath(); g.fill(); g.globalAlpha = 1; }
function star(g, x, y, R, n, seed, col, inner = 0.25) { g.fillStyle = col; g.beginPath(); for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * 2 * Math.PI + seed, r = i % 2 ? R * inner : R * (0.6 + 0.8 * rnd(i, seed)); g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.closePath(); g.fill(); }
// The set draws every beam, behind the figures (a cel hides the set). Those that pass nearer the camera than the
// figure are drawn again here, over it: the same three strips the set lays (glow, sheath, core).
export function beamsOver(g, cam, beams, body) {
  if (!body) return; const q = body.q, d0 = dist(cam, [q.x, (q.y ?? 0) + 1, q.z]);
  g.save(); g.globalCompositeOperation = "lighter";
  for (const b of beams) {
    if (!vis(cam, b.a) || !vis(cam, b.b)) continue;
    const mid = b.near ?? [(b.a[0] + b.b[0]) / 2, (b.a[1] + b.b[1]) / 2, (b.a[2] + b.b[2]) / 2]; if (dist(cam, mid) > d0 - 0.02) continue;
    const A = cam.project(b.a), B = cam.project(b.b), gn = b.gain ?? 1;
    strip(g, A, B, 0.12 * gn * A.s, 0.12 * gn * B.s, VIOLET, 0.16); strip(g, A, B, 0.042 * (0.6 + 0.4 * gn) * A.s, 0.042 * (0.6 + 0.4 * gn) * B.s, "#c79bff", 0.5); strip(g, A, B, Math.max(1.2, 0.016 * A.s), Math.max(1.2, 0.016 * B.s), HOT, 1);
  }
  g.restore();
}
// where a beam has stopped a hair from Noor: a four-pointed glint at the nearest point of it, for the few frames round its note
export function glints(g, cam, beams, F, events) {
  for (const b of beams) {
    if (b.kind !== "miss" || !b.near) continue; const u = F - events[b.i]; if (u < 0 || u > 5 || !vis(cam, b.near)) continue;
    const p = cam.project(b.near), R = p.s * [0.34, 0.26, 0.2, 0.14, 0.1, 0.06][u];
    g.save(); g.translate(p.x, p.y); g.rotate(0.4 + b.i); g.fillStyle = HOT; g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? R * 0.14 : R; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); g.restore();
  }
}
// where a beam is on the enforcer's hull: a burst when it bites, then sparks thrown off along the beam, on twos
export function sparks(g, cam, beams, F) {
  for (const b of beams) {
    if (!b.touch || !b.near || !vis(cam, b.near)) continue;
    const p = cam.project(b.near), f2 = F - F % 2, k = 0.5 * p.s;
    const bit = [...EV.bite, ...EV.tighten].some((x) => F - x >= 0 && F - x < 2);
    star(g, p.x, p.y, k * (bit ? 0.5 : 0.2 + 0.1 * rnd(b.i, f2)), 6, f2 + b.i, bit ? HOT : "#ffe9b8", 0.2);
    for (let i = 0; i < 5; i++) { const a = rnd(i, b.i, f2) * 6.283, r0 = k * (0.2 + 0.5 * rnd(i, f2, b.i, 1)), r1 = r0 + k * (0.15 + 0.3 * rnd(i, f2, 2)); strip(g, { x: p.x + Math.cos(a) * r0, y: p.y + Math.sin(a) * r0 }, { x: p.x + Math.cos(a) * r1, y: p.y + Math.sin(a) * r1 }, 0.012 * p.s, 0.003 * p.s, i % 2 ? "#ffd27a" : HOT); }
  }
}
// the cut itself: on 2211 each closing beam is a hard white slash across the machine, with an ink edge, for two frames
export function cutFlash(g, cam, beams, F) {
  const u = F - EV.cut; if (u < 0 || u > 1) return;
  for (const b of beams) { if (b.kind !== "close" || !vis(cam, b.a) || !vis(cam, b.b)) continue; const A = cam.project(b.a), B = cam.project(b.b); if (!u) strip(g, A, B, 0.07 * A.s, 0.07 * B.s, INK); strip(g, A, B, (u ? 0.02 : 0.045) * A.s, (u ? 0.02 : 0.045) * B.s, HOT); }
}
// dust: motes hanging in the core, lit by its far light: each a small hard disc, the near ones larger; they do not
// move (nothing here does), the camera does
export function motes(g, cam, F, n = 90, box = [16, 10, 30], centre = [0, 2, 12]) {
  g.save();
  for (let i = 0; i < n; i++) {
    const p = [centre[0] + (rnd(i, 1) - 0.5) * box[0] + 0.1 * Math.sin(F * 0.01 + i), centre[1] + (rnd(i, 2) - 0.5) * box[1] + 0.08 * Math.sin(F * 0.013 + i * 2), centre[2] + (rnd(i, 3) - 0.5) * box[2]];
    if (!vis(cam, p)) continue; const q = cam.project(p), r = Math.min(7, Math.max(0.8, (0.006 + 0.012 * rnd(i, 4)) * q.s)); if (q.x < -10 || q.x > 1930 || q.y < -10 || q.y > 1090) continue;
    g.globalAlpha = r > 4 ? 0.35 : 0.75; g.fillStyle = i % 5 ? "#f4ecff" : LILAC; g.beginPath(); g.arc(q.x, q.y, r, 0, 7); g.fill();
  }
  g.restore();
}
