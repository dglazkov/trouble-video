// 2.5D cel character: a 3D rig of joints posed pose-to-pose (held on twos), projected through the
// real scene camera, then drawn as inked 2D vector shapes with hard two-tone fills on a Canvas 2D layer.
const D = Math.PI / 180;
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const lerp = (a, b, t) => a + (b - a) * t;
const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

// periodic catmull-rom over 8 keys
function cr(k, t) {
  const n = k.length; t = ((t % n) + n) % n;
  const i = Math.floor(t), u = t - i;
  const p0 = k[(i + n - 1) % n], p1 = k[i], p2 = k[(i + 1) % n], p3 = k[(i + 2) % n];
  return 0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u * u * u);
}
// run cycle keys (per leg): contact, down, push-off, trail, recover, drive, high-knee, reach
const THIGH = [38, 22, -32, -42, -8, 44, 82, 62];
const KNEE = [18, 52, 14, 62, 132, 122, 92, 34];
const FOOT = [-18, 0, 48, 78, 60, 30, 5, -18];

export function rig(p, o) {
  const lean = o.lean * D, J = {};
  const tw = 0.3 * Math.cos(2 * Math.PI * (p - 0.8)) * o.energy;
  const legs = {};
  let minY = 1e9;
  for (const s of [1, -1]) {
    const pl = (s > 0 ? p : p + 0.5) * 8;
    const th = cr(THIGH, pl) * D * o.energy, kn = cr(KNEE, pl) * D, ft = cr(FOOT, pl) * D;
    const hip = [s * 0.1 * Math.cos(tw * 0.6), 0, s * 0.1 * Math.sin(tw * 0.6)];
    const knee = add(hip, norm([s * 0.12, -Math.cos(th), Math.sin(th)]), 0.43);
    const ankle = add(knee, norm([-s * 0.08, -Math.cos(th - kn), Math.sin(th - kn)]), 0.43);
    const toeDir = [0, -Math.sin(ft), Math.cos(ft)], dn = [0, -Math.cos(ft), -Math.sin(ft)];
    const heel = add(add(ankle, toeDir, -0.07), dn, 0.05);
    const toe = add(add(ankle, toeDir, 0.2), dn, 0.05);
    minY = Math.min(minY, heel[1], toe[1]);
    legs[s] = { hip, knee, ankle, heel, toe, toeDir, dn };
  }
  const q = (p * 2) % 1;
  const fl = q > 0.3 ? Math.sin(Math.PI * Math.min(1, (q - 0.3) / 0.65)) : 0;
  const hipY = -minY + 0.06 + 0.1 * fl * o.energy;
  const hips = [0, hipY, 0];
  for (const s of [1, -1]) for (const k in legs[s]) if (k !== 'toeDir' && k !== 'dn') legs[s][k] = add(legs[s][k], hips);
  J.legs = legs; J.hips = hips;
  const S = [0, Math.cos(lean), Math.sin(lean)];
  const chest = add(hips, S, 0.45);
  J.S = S; J.chest = chest; J.Ft = [0, -Math.sin(lean), Math.cos(lean)];
  J.arms = {};
  for (const s of [1, -1]) {
    const pa = s > 0 ? p : p + 0.5;
    const c = Math.cos(2 * Math.PI * (pa - 0.8));
    const al = (-4 - 44 * c * o.energy) * D, el = (60 + 18 * c) * D;
    const sh = add(chest, [s * 0.2 * Math.cos(tw), -0.02, -s * 0.2 * Math.sin(tw)]);
    const elbow = add(sh, norm([s * 0.48, -Math.cos(al), Math.sin(al)]), 0.27);
    const hand = add(elbow, norm([-s * 0.08, -Math.cos(al + el), Math.sin(al + el)]), 0.26);
    J.arms[s] = { sh, elbow, hand };
  }
  const hl = lean * 0.35;
  J.neck = add(chest, S, 0.05);
  J.head = add(J.neck, [0.012 * Math.sin(2 * Math.PI * p), Math.cos(hl), Math.sin(hl)], 0.165);
  const hp = o.headPitch * D, roll = 0.07 * Math.sin(2 * Math.PI * p + 1);
  J.hX = [Math.cos(roll), Math.sin(roll), 0];
  const up0 = [0, Math.cos(hp), Math.sin(hp)];
  J.hU = [-Math.sin(roll) * up0[1], Math.cos(roll) * up0[1], up0[2]];
  J.hF = [0, -Math.sin(hp), Math.cos(hp)];
  return J;
}

const PAL = {
  ink: '#1c0f33',
  skin: ['#ffd9b8', '#e0907c', '#fff0e0'],
  hair: ['#f6f7ff', '#a3a6e6', '#8ffaff'],
  jacket: ['#ffc81e', '#e2701c', '#fff6a8'],
  dark: ['#3a2f6b', '#221a48', '#5de6ff'],
  shirt: ['#2f2c63', '#1a1840', '#2f2c63'],
  scarf: ['#ff2f66', '#b4124f', '#ffa0bb'],
  pants: ['#3f55b8', '#252e78', '#55eaff'],
  shoe: ['#fbfbff', '#a9aad8', '#ffffff'],
  sole: ['#ff2f66', '#b4124f', '#ff2f66'],
  gog: ['#ff7b1c', '#b9450f', '#ffd08a'],
  lens: ['#62f6ff', '#1c9fd0', '#ffffff'],
  white: ['#ffffff', '#c9cdf5', '#ffffff'],
  mouth: ['#7a1030', '#7a1030', '#7a1030'],
  iris: ['#12c9b8', '#0a7f8f', '#12c9b8'],
};
function palette(mode) {
  if (mode === 0) return PAL;
  const out = {};
  for (const k in PAL) {
    if (k === 'ink') out.ink = mode === 1 ? '#ffffff' : '#000000';
    else if (mode === 1) out[k] = ['#000', '#000', '#000'];
    else out[k] = ['#ffffff', '#ff2e9a', '#ffffff'];
  }
  if (mode === 1) { out.scarf = ['#ff0a55', '#ff0a55', '#ff0a55']; out.white = ['#fff', '#fff', '#fff']; out.lens = ['#fff', '#fff', '#fff']; out.iris = ['#ff0a55', '#ff0a55', '#ff0a55']; }
  else { out.scarf = ['#00f0ff', '#0090d0', '#fff']; out.dark = ['#ff2e9a', '#a00060', '#fff']; out.shirt = ['#111', '#000', '#111']; out.mouth = ['#000', '#000', '#000']; out.iris = ['#000', '#000', '#000']; out.pants = ['#ff2e9a', '#a00060', '#fff']; }
  return out;
}

export function drawCharacter(ctx, o, proj) {
  const C = palette(o.mode);
  const J = rig(o.phase, o);
  const R = o.root;
  const W = v => proj([v[0] + R[0], v[1] + R[1], v[2] + R[2]]);
  const L = [0.42, -0.9]; // screen-space light direction (ceiling panels, up-right)
  const lwOf = s => (0.6 + 0.17 * Math.sqrt(Math.max(s, 1))) * o.inkScale;
  const NEAR = 0.16;

  function cel(path, c, r, lw, noStroke) {
    if (!noStroke) { ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.lineWidth = lw * 2; ctx.strokeStyle = C.ink; path(); ctx.stroke(); }
    ctx.save(); path(); ctx.clip();
    ctx.fillStyle = c[2]; path(); ctx.fill();
    ctx.translate(L[0] * r * 0.13, L[1] * r * 0.13); ctx.fillStyle = c[1]; path(); ctx.fill();
    ctx.translate(L[0] * r * 0.42, L[1] * r * 0.42); ctx.fillStyle = c[0]; path(); ctx.fill();
    ctx.restore();
  }
  function capPath(a, ra, b, rb) {
    ctx.beginPath();
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
    if (d <= Math.abs(ra - rb) + 1e-3) { const c = ra > rb ? a : b; ctx.arc(c.x, c.y, Math.max(ra, rb), 0, 7); return; }
    const th = Math.atan2(dy, dx), ph = Math.acos((ra - rb) / d);
    ctx.arc(a.x, a.y, ra, th + ph, th + 2 * Math.PI - ph);
    ctx.arc(b.x, b.y, rb, th - ph, th + ph);
    ctx.closePath();
  }
  function poly(pts, smooth) {
    ctx.beginPath();
    if (!smooth) { pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath(); return; }
    const n = pts.length;
    const m = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
    let s = m(pts[n - 1], pts[0]); ctx.moveTo(s.x, s.y);
    for (let i = 0; i < n; i++) { const e = m(pts[i], pts[(i + 1) % n]); ctx.quadraticCurveTo(pts[i].x, pts[i].y, e.x, e.y); }
    ctx.closePath();
  }
  const parts = [];
  const capsule = (A, ra, B, rb, c, bias = 0) => {
    const a = W(A), b = W(B);
    if (a.z < NEAR || b.z < NEAR) return;
    parts.push({ z: (a.z + b.z) / 2 + bias, draw() {
      const r1 = ra * a.s, r2 = rb * b.s;
      cel(() => capPath(a, r1, b, r2), c, Math.max(r1, r2), lwOf((a.s + b.s) / 2));
    } });
  };

  // ---- ground contact shadow
  {
    const g = [];
    for (let i = 0; i < 14; i++) { const t = i / 14 * 2 * Math.PI; g.push(proj([R[0] + Math.cos(t) * 0.42, 0.005, R[2] + J.hips[2] + 0.1 + Math.sin(t) * 0.6])); }
    if (g.every(p => p.z > NEAR) && o.mode === 0) { poly(g, true); ctx.fillStyle = 'rgba(10,6,30,0.55)'; ctx.fill(); }
  }

  // ---- legs
  for (const s of [1, -1]) {
    const l = J.legs[s];
    capsule(l.hip, 0.105, lerp3(l.hip, l.knee, 0.93), 0.1, C.pants);
    capsule(lerp3(l.hip, l.knee, 0.9), 0.064, l.ankle, 0.05, C.skin, 0.01);
    capsule(lerp3(l.knee, l.ankle, 0.6), 0.063, l.ankle, 0.058, C.dark, 0.005);
    // shoe: sole + upper + toe cap
    const a = W(l.ankle), h = W(l.heel), t = W(l.toe);
    if (a.z > NEAR && h.z > NEAR && t.z > NEAR) {
      parts.push({ z: (a.z + t.z) / 2 - 0.01, draw() {
        const lw = lwOf(a.s);
        cel(() => capPath(h, 0.062 * h.s, t, 0.058 * t.s), C.sole, 0.06 * a.s, lw);
        const up = add(l.ankle, l.toeDir, 0.02), mid = W(add(add(l.ankle, l.toeDir, 0.16), l.dn, 0.005)), u = W(up);
        cel(() => capPath(u, 0.066 * u.s, mid, 0.055 * mid.s), C.shoe, 0.06 * a.s, lw);
        const an = W(add(l.ankle, l.dn, -0.05));
        cel(() => capPath(an, 0.058 * an.s, u, 0.06 * u.s), C.shoe, 0.06 * a.s, lw);
        ctx.strokeStyle = C.scarf[0]; ctx.lineWidth = lw * 1.6; ctx.beginPath(); ctx.moveTo(an.x - 0.05 * an.s, an.y); ctx.lineTo(an.x + 0.05 * an.s, an.y); ctx.stroke();
      } });
    }
  }
  // ---- jacket tails + torso
  const X = [1, 0, 0];
  const T = (x, y, z) => add(add(add(J.hips, X, x), J.S, y), J.Ft, z);
  for (const s of [1, -1]) {
    const fph = o.flap + (s > 0 ? 0 : 2.1);
    const top = [], bot = [];
    for (let k = 0; k <= 4; k++) {
      const t = k / 4;
      const c = T(s * (0.17 + 0.2 * t), 0.16 - 0.02 * t + 0.08 * Math.sin(fph + t * 3) * t, -0.05 - 0.42 * t * o.wind);
      const w = 0.15 * (1 - t * 0.75);
      top.push(W(add(c, J.S, w))); bot.push(W(add(c, J.S, -w)));
    }
    const pts = top.concat(bot.reverse());
    if (pts.every(p => p.z > NEAR)) parts.push({ z: pts[4].z + 0.05, draw() { cel(() => poly(pts, false), C.jacket, 0.1 * pts[0].s, lwOf(pts[0].s)); } });
  }
  capsule(T(0, 0.02, 0), 0.175, T(0, 0.4, 0), 0.2, C.jacket, 0.02);
  capsule(T(0, -0.02, 0), 0.182, T(0, 0.03, 0), 0.186, C.dark, 0.018);
  {
    const pts = [T(-0.07, 0.47, 0.13), T(0.07, 0.47, 0.13), T(0.11, 0.0, 0.16), T(-0.11, 0.0, 0.16)].map(W);
    const yoke = [W(J.arms[1].sh), W(J.arms[-1].sh)];
    const zc = W(J.chest).z;
    if (pts.every(p => p.z > NEAR)) parts.push({ z: zc + 0.015, draw() {
      const s = pts[0].s, lw = lwOf(s);
      cel(() => capPath(yoke[0], 0.085 * yoke[0].s, yoke[1], 0.085 * yoke[1].s), C.jacket, 0.1 * s, lw);
      cel(() => poly(pts, false), C.shirt, 0.1 * s, lw);
      // shirt stripe + zipper teeth
      const a = W(T(-0.085, 0.2, 0.145)), b = W(T(0.085, 0.2, 0.145));
      ctx.strokeStyle = C.scarf[0]; ctx.lineWidth = 0.035 * s; ctx.lineCap = 'butt'; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    } });
  }
  // ---- arms
  for (const s of [1, -1]) {
    const a = J.arms[s];
    capsule(a.sh, 0.098, a.elbow, 0.09, C.jacket);
    capsule(a.elbow, 0.092, lerp3(a.elbow, a.hand, 0.72), 0.085, C.jacket);
    capsule(lerp3(a.elbow, a.hand, 0.62), 0.09, lerp3(a.elbow, a.hand, 0.8), 0.088, C.dark, -0.004);
    const h = W(a.hand);
    if (h.z > NEAR) parts.push({ z: h.z - 0.012, draw() {
      const r = 0.062 * h.s, lw = lwOf(h.s);
      cel(() => { ctx.beginPath(); ctx.arc(h.x, h.y, r, 0, 7); }, C.skin, r, lw);
      ctx.strokeStyle = C.ink; ctx.lineWidth = lw * 0.8; ctx.beginPath();
      for (const k of [-0.35, 0.05, 0.45]) { ctx.moveTo(h.x + k * r, h.y - r * 0.15); ctx.lineTo(h.x + k * r + 0.05 * r, h.y + r * 0.55); }
      ctx.stroke();
    } });
  }
  // ---- scarf: wrap + two streaming tails
  {
    const n = W(J.neck);
    const a = W(add(J.neck, [0.1, 0.0, 0.03])), b = W(add(J.neck, [-0.1, 0.0, 0.03]));
    if (n.z > NEAR) parts.push({ z: n.z - 0.03, draw() { cel(() => capPath(a, 0.075 * a.s, b, 0.075 * b.s), C.scarf, 0.08 * n.s, lwOf(n.s)); } });
    for (const tl of [0, 1]) {
      const anchor = add(J.neck, [0.1, 0.0 - tl * 0.03, -0.08]);
      const dir = norm([1.0, 0.6 - tl * 0.45, -0.55 - tl * 0.2]);
      const len = o.scarfLen * (tl ? 0.8 : 1), ph = o.flap * 1.0 + tl * 1.7;
      const top = [], bot = [];
      const N = 9;
      for (let k = 0; k <= N; k++) {
        const t = k / N;
        let c = add(anchor, dir, len * t);
        c = add(c, [0.12 * Math.sin(ph + t * 5.5) * t, 0.2 * Math.sin(ph * 1.0 + t * 6.5 + 1) * t, 0]);
        const w = (0.065 + 0.07 * Math.sin(Math.min(1, t * 1.4) * Math.PI * 0.6)) * (k === N ? 0.25 : 1);
        const wv = norm([0.25 * Math.cos(ph + t * 5.5), 1, 0]);
        top.push(W(add(c, wv, w))); bot.push(W(add(c, wv, -w)));
      }
      const pts = top.concat(bot.reverse());
      if (pts.every(p => p.z > NEAR)) parts.push({ z: pts[N].z + 0.3, draw() { cel(() => poly(pts, true), C.scarf, 0.09 * pts[0].s, lwOf(pts[0].s)); } });
    }
  }
  // ---- head
  {
    const hc = W(J.head);
    const HS = 1.24;
    const HP = (x, y, z) => W(add(add(add(J.head, J.hX, x * HS), J.hU, y * HS + 0.03), J.hF, z * HS));
    if (hc.z > NEAR + 0.2) parts.push({ z: hc.z - 0.12, draw() {
      const s = hc.s * HS, lw = lwOf(hc.s), r = 0.128 * s;
      const wind = o.wind, hj = o.hairJit;
      // back hair spikes (union with cranium)
      const spikes = [];
      const NS = 9;
      for (let i = 0; i < NS; i++) {
        const a = (-35 + i * (250 / (NS - 1))) * D;
        const len = 0.235 + 0.07 * Math.sin(i * 2.3 + 1) + 0.03 * Math.sin(hj + i * 1.9) + 0.04 * wind;
        const sw = 0.2 + 0.1 * Math.sin(hj * 0.7 + i);
        const b1 = HP(Math.cos(a - 0.42) * 0.11, 0.02 + Math.sin(a - 0.42) * 0.11, -0.02);
        const b2 = HP(Math.cos(a + 0.42) * 0.11, 0.02 + Math.sin(a + 0.42) * 0.11, -0.02);
        const tip = HP(Math.cos(a + sw) * len + 0.03, 0.02 + Math.sin(a + sw) * len + 0.03 * wind, -0.06 - 0.12 * wind);
        spikes.push([b1, tip, b2]);
      }
      const cran = HP(0, 0.02, 0);
      const hairPath = () => { ctx.beginPath(); for (const t of spikes) { ctx.moveTo(t[0].x, t[0].y); ctx.lineTo(t[1].x, t[1].y); ctx.lineTo(t[2].x, t[2].y); ctx.closePath(); } ctx.moveTo(cran.x + r, cran.y); ctx.arc(cran.x, cran.y, r, 0, 7); };
      cel(hairPath, C.hair, r, lw);
      // neck (in shadow, seen from below)
      const nk = W(J.neck), ch = HP(0, -0.1, 0.03);
      ctx.lineWidth = lw * 2; ctx.strokeStyle = C.ink; capPath(nk, 0.05 * nk.s, ch, 0.05 * s); ctx.stroke(); ctx.fillStyle = C.skin[1]; ctx.fill();
      // face
      const jaw = [[0.118, 0.035, 0.03], [0.112, -0.05, 0.05], [0.07, -0.135, 0.08], [0, -0.172, 0.095], [-0.07, -0.135, 0.08], [-0.112, -0.05, 0.05], [-0.118, 0.035, 0.03], [-0.08, 0.09, 0.08], [0, 0.105, 0.1], [0.08, 0.09, 0.08]].map(p => HP(...p));
      cel(() => poly(jaw, true), C.skin, r, lw);
      const Z = 0.108;
      for (const e of [1, -1]) {
        const cx = e * 0.054, cy = -0.03;
        const sc = [[cx - e * 0.032, cy + 0.008], [cx + e * 0.012, cy + 0.03], [cx + e * 0.036, cy + 0.026], [cx + e * 0.037, cy - 0.012], [cx, cy - 0.026], [cx - e * 0.03, cy - 0.016]].map(p => HP(p[0], p[1], Z));
        ctx.save(); poly(sc, false); ctx.fillStyle = C.white[0]; ctx.fill(); ctx.clip();
        const ic = HP(cx - e * 0.004, cy + 0.002, Z + 0.004);
        ctx.fillStyle = C.iris[0]; ctx.beginPath(); ctx.ellipse(ic.x, ic.y, 0.021 * s, 0.026 * s, 0, 0, 7); ctx.fill();
        ctx.fillStyle = C.ink; ctx.beginPath(); ctx.ellipse(ic.x, ic.y, 0.009 * s, 0.013 * s, 0, 0, 7); ctx.fill();
        ctx.fillStyle = C.white[0]; ctx.beginPath(); ctx.arc(ic.x + 0.008 * s, ic.y - 0.011 * s, 0.006 * s, 0, 7); ctx.fill();
        ctx.restore();
        ctx.strokeStyle = C.ink; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        ctx.lineWidth = lw * 0.7; poly(sc, false); ctx.stroke();
        ctx.lineWidth = lw * 1.9; ctx.beginPath(); ctx.moveTo(sc[0].x, sc[0].y); ctx.lineTo(sc[1].x, sc[1].y); ctx.lineTo(sc[2].x, sc[2].y); ctx.lineTo(sc[3].x, sc[3].y); ctx.stroke();
        // brow
        const b0 = HP(e * 0.1, 0.03, Z + 0.004), b1 = HP(e * 0.018, -0.006, Z + 0.008);
        ctx.lineWidth = lw * 2.2; ctx.beginPath(); ctx.moveTo(b0.x, b0.y); ctx.lineTo(b1.x, b1.y); ctx.stroke();
      }
      // nose tick
      const n0 = HP(0.004, -0.07, 0.122), n1 = HP(0.012, -0.085, 0.118);
      ctx.strokeStyle = C.ink; ctx.lineWidth = lw * 0.8; ctx.beginPath(); ctx.moveTo(n0.x, n0.y); ctx.lineTo(n1.x, n1.y); ctx.stroke();
      // bandage on cheek
      const bd = [[0.05, -0.068], [0.1, -0.058], [0.098, -0.082], [0.05, -0.092]].map(p => HP(p[0], p[1], 0.085));
      poly(bd, false); ctx.fillStyle = C.white[0]; ctx.fill(); ctx.lineWidth = lw * 0.7; ctx.stroke();
      // mouth
      const mo = o.shout
        ? [[-0.034, -0.1], [0.036, -0.097], [0.03, -0.15], [-0.026, -0.152]]
        : [[-0.04, -0.108], [0.042, -0.1], [0.034, -0.13], [-0.03, -0.134]];
      const mp = mo.map(p => HP(p[0], p[1], 0.098));
      poly(mp, false); ctx.fillStyle = o.shout ? C.mouth[0] : C.white[0]; ctx.fill();
      if (o.shout) { ctx.save(); poly(mp, false); ctx.clip(); const t0 = HP(-0.04, -0.097, 0.098), t1 = HP(0.04, -0.097, 0.098); ctx.strokeStyle = C.white[0]; ctx.lineWidth = 0.028 * s; ctx.beginPath(); ctx.moveTo(t0.x, t0.y); ctx.lineTo(t1.x, t1.y); ctx.stroke(); ctx.restore(); }
      else { const t0 = HP(-0.036, -0.12, 0.098), t1 = HP(0.038, -0.115, 0.098); ctx.lineWidth = lw * 0.6; ctx.strokeStyle = C.ink; ctx.beginPath(); ctx.moveTo(t0.x, t0.y); ctx.lineTo(t1.x, t1.y); ctx.stroke(); }
      ctx.strokeStyle = C.ink; ctx.lineWidth = lw * 0.9; poly(mp, false); ctx.stroke();
      // bangs
      const bangs = [];
      const bx = [-0.115, -0.07, -0.02, 0.035, 0.085, 0.125];
      for (let i = 0; i < 5; i++) {
        const tipx = (bx[i] + bx[i + 1]) / 2 + 0.025 + 0.012 * Math.sin(hj + i * 2.1);
        const tipy = 0.0 + 0.022 * Math.sin(i * 2.7 + 0.5) + (i === 2 ? -0.02 : 0);
        bangs.push([HP(bx[i] - 0.008, 0.1, 0.09 - Math.abs(bx[i]) * 0.3), HP(tipx, tipy, 0.125 - Math.abs(tipx) * 0.35), HP(bx[i + 1] + 0.008, 0.1, 0.09 - Math.abs(bx[i + 1]) * 0.3)]);
      }
      const bangPath = () => { ctx.beginPath(); for (const t of bangs) { ctx.moveTo(t[0].x, t[0].y); ctx.quadraticCurveTo((t[0].x + t[1].x) / 2 - 0.01 * s, (t[0].y + t[1].y) / 2 + 0.012 * s, t[1].x, t[1].y); ctx.lineTo(t[2].x, t[2].y); ctx.closePath(); } };
      cel(bangPath, C.hair, r * 0.6, lw * 0.85);
      // goggles pushed up
      const strap = [[-0.128, 0.075, 0.0], [-0.09, 0.105, 0.08], [0, 0.125, 0.112], [0.09, 0.105, 0.08], [0.128, 0.075, 0.0]].map(p => HP(...p));
      const strapPath = () => { ctx.beginPath(); ctx.moveTo(strap[0].x, strap[0].y); ctx.quadraticCurveTo(strap[1].x, strap[1].y, strap[2].x, strap[2].y); ctx.quadraticCurveTo(strap[3].x, strap[3].y, strap[4].x, strap[4].y); };
      ctx.lineCap = 'butt'; ctx.strokeStyle = C.ink; ctx.lineWidth = 0.05 * s + lw * 2; strapPath(); ctx.stroke();
      ctx.strokeStyle = C.dark[0]; ctx.lineWidth = 0.05 * s; strapPath(); ctx.stroke();
      for (const e of [1, -1]) {
        const g = HP(e * 0.056, 0.122, 0.11);
        cel(() => { ctx.beginPath(); ctx.ellipse(g.x, g.y, 0.05 * s, 0.038 * s, -e * 0.12, 0, 7); }, C.gog, 0.04 * s, lw);
        cel(() => { ctx.beginPath(); ctx.ellipse(g.x, g.y, 0.036 * s, 0.025 * s, -e * 0.12, 0, 7); }, C.lens, 0.03 * s, lw * 0.6);
        ctx.strokeStyle = C.white[0]; ctx.lineWidth = lw * 0.9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(g.x - 0.02 * s, g.y + 0.006 * s); ctx.lineTo(g.x - 0.004 * s, g.y - 0.012 * s); ctx.stroke();
      }
    } });
  }
  parts.sort((a, b) => b.z - a.z);
  for (const p of parts) p.draw();
  return W(J.chest);
}
