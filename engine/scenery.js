// Plain things to stand a character on: a ground plane whose markings scroll, posts that pass, and contact shadows.
// Enough to judge speed and foot contact; not a set.
import { add, sub, dot, mul } from "./body.js";

// A 3D segment drawn through the camera, clipped at the near plane.
export function line3(g, cam, a, b) {
  const near = 0.2, za = dot(sub(a, cam.pos), cam.fwd), zb = dot(sub(b, cam.pos), cam.fwd);
  if (za < near && zb < near) return;
  if (za < near) a = add(a, sub(b, a), (near - za) / (zb - za));
  if (zb < near) b = add(b, sub(a, b), (near - zb) / (za - zb));
  const p = cam.project(a), q = cam.project(b);
  g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(q.x, q.y); g.stroke();
}
// o: { travel: [x, z] how far the ground has moved under the character, spacing, sky, floor, line, extent }
export function ground(g, cam, o = {}) {
  const W = cam.w, H = cam.h, sp = o.spacing ?? 1, ext = o.extent ?? 14, t = o.travel ?? [0, 0];
  const far = add(cam.pos, add(mul([cam.fwd[0], 0, cam.fwd[2]], 400), [0, -cam.pos[1], 0]));
  const hy = clampY(cam.project(far).y, H);
  const sky = g.createLinearGradient(0, 0, 0, hy); sky.addColorStop(0, o.sky?.[0] ?? "#1b2148"); sky.addColorStop(1, o.sky?.[1] ?? "#3a4a86");
  g.fillStyle = sky; g.fillRect(0, 0, W, hy);
  const fl = g.createLinearGradient(0, hy, 0, H); fl.addColorStop(0, o.floor?.[0] ?? "#56608f"); fl.addColorStop(1, o.floor?.[1] ?? "#8a93b8");
  g.fillStyle = fl; g.fillRect(0, hy, W, H - hy);
  const ox = ((t[0] % sp) + sp) % sp, oz = ((t[1] % sp) + sp) % sp;
  g.strokeStyle = o.line ?? "rgba(255,255,255,0.28)"; g.lineWidth = 2.5;
  for (let k = -ext; k <= ext; k += sp) {
    line3(g, cam, [-ext, 0, k - oz], [ext, 0, k - oz]);
    line3(g, cam, [k - ox, 0, -ext], [k - ox, 0, ext]);
  }
  // posts along both sides, every other line, so something tall passes too
  const ps = sp * 2, pz = ((t[1] % ps) + ps) % ps, px = ((t[0] % ps) + ps) % ps;
  g.strokeStyle = o.post ?? "rgba(20,24,60,0.55)"; g.lineWidth = 7; g.lineCap = "round";
  for (let k = -ext; k <= ext; k += ps) for (const x of o.posts ?? [-2.5, 2.5]) line3(g, cam, [x - px, 0, k - pz], [x - px, 1.1, k - pz]);
}
const clampY = (y, H) => Math.max(0, Math.min(H, y));

// Soft dark ellipses on the ground: one under the hips, one under each foot that fades as the foot lifts.
export function shadows(g, cam, body) {
  const blob = (c, rx, rz, a) => {
    if (a <= 0.01) return;
    g.fillStyle = `rgba(12,14,40,${a.toFixed(3)})`; g.beginPath();
    for (let i = 0; i < 20; i++) { const t = i / 20 * 2 * Math.PI, p = cam.project([c[0] + Math.cos(t) * rx, 0.002, c[2] + Math.sin(t) * rz]); i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y); }
    g.closePath(); g.fill();
  };
  const { J } = body;
  blob(J.hips, 0.3, 0.3, 0.22);
  for (const s of ["L", "R"]) { const j = J[s], h = Math.min(j.heel[1], j.toe[1]), c = [(j.heel[0] + j.toe[0]) / 2, 0, (j.heel[2] + j.toe[2]) / 2]; blob(c, 0.13, 0.13, 0.4 * Math.max(0, 1 - h / 0.12)); }
}
