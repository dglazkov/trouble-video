// Draws a body's volumes as a solid, shaded, colour-coded dummy: red is the character's right side, blue the left,
// upper segments dark and lower ones light, so overlapping limbs read as in front or behind.
const TONES = {
  trunk: ["#b9b9b9", "#8d8d8d"], pelvis: ["#9a9a9a", "#707070"], neck: ["#d9d9d9", "#ababab"], head: ["#eeeeee", "#c2c2c2"],
  garment: ["#e9d27a", "#b79c45"], hair: ["#cfd8cf", "#9fb0a3"],
  L: { upper: ["#3f6fe6", "#2a49a8"], lower: ["#9bb8ff", "#6c8bd6"] },
  R: { upper: ["#e24a4a", "#a52e2e"], lower: ["#ff9c9c", "#d06a6a"] },
};
const toneOf = (v) => (v.side ? TONES[v.side][v.tone] : TONES[v.tone]) ?? TONES.trunk;

// Convex hull of projected spheres, as a polygon of screen points.
export function hull(spheres, cam) {
  const pts = [];
  for (const s of spheres) {
    const c = cam.project(s.c), rr = s.r * c.s;
    for (let i = 0; i < 28; i++) { const a = i / 28 * 2 * Math.PI; pts.push([c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr]); }
  }
  pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const p of pts) { while (lo.length > 1 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (const p of pts.slice().reverse()) { while (up.length > 1 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
const trace = (ctx, poly) => { ctx.beginPath(); poly.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); };
export const depthOf = (v, cam) => v.spheres.reduce((a, s) => a + cam.project(s.c).z, 0) / v.spheres.length;

// Volumes shaded and depth sorted. o: { ink: outline width }
export function drawVolumes(ctx, vols, cam, o = {}) {
  const items = vols.map((v) => ({ v, z: depthOf(v, cam), poly: hull(v.spheres, cam) })).sort((a, b) => b.z - a.z);
  const ink = o.ink ?? 3;
  for (const { v, poly } of items) {
    const [lit, dark] = toneOf(v);
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    for (const p of poly) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    const d = Math.min(x1 - x0, y1 - y0) * 0.16;
    ctx.lineJoin = "round"; ctx.lineWidth = ink * 2; ctx.strokeStyle = "#1b1b1b"; trace(ctx, poly); ctx.stroke();
    ctx.save(); trace(ctx, poly); ctx.clip();
    ctx.fillStyle = dark; ctx.fillRect(x0 - 9, y0 - 9, x1 - x0 + 18, y1 - y0 + 18);
    ctx.translate(-d, -d * 0.7); ctx.fillStyle = lit; trace(ctx, poly); ctx.fill();
    ctx.restore();
  }
}

// The whole dummy, with a nose and eye line so the head's facing reads from any side.
export function drawMannequin(ctx, body, cam, o = {}) {
  const { J, F, P } = body;
  const nose = { part: "head", side: null, tone: "head", spheres: [
    { c: [0, 1, 2].map((i) => J.headBase[i] + F.head.Y[i] * P.headH * 0.4 + F.head.Z[i] * P.headH * 0.44), r: P.headH * 0.07 },
    { c: [0, 1, 2].map((i) => J.headBase[i] + F.head.Y[i] * P.headH * 0.47 + F.head.Z[i] * P.headH * 0.36), r: P.headH * 0.05 }] };
  drawVolumes(ctx, body.vol.concat([nose]), cam, o);
}

// Skeleton and named points, for the debug overlay.
export function drawSkeleton(ctx, body, cam, o = {}) {
  const { J } = body, P2 = (p) => cam.project(p);
  const ln = (a, b, col) => { const p = P2(a), q = P2(b); ctx.strokeStyle = col; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke(); };
  ctx.lineWidth = o.width ?? 2.5; ctx.lineCap = "round";
  ln(J.hips, J.waist, "#22dd55"); ln(J.waist, J.neckBase, "#22dd55"); ln(J.neckBase, J.headBase, "#eeee33"); ln(J.headBase, J.crown, "#ffffff");
  for (const side of ["L", "R"]) {
    const j = J[side], c = side === "L" ? "#4d8dff" : "#ff5050";
    ln(j.hip, j.knee, c); ln(j.knee, j.ankle, c); ln(j.heel, j.toe, c); ln(j.ankle, j.sole, c);
    ln(j.sh, j.elbow, c); ln(j.elbow, j.wrist, c); ln(j.wrist, j.hand, c); ln(J.hips, j.hip, "#22dd55"); ln(J.neckBase, j.sh, "#22dd55");
  }
}
