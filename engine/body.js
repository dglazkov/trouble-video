// A parameterised human body: proportions -> skeleton -> joints and simple volumes, posed by joint angles.
// Everything is a pure function of its inputs. Units are metres-ish; the character faces +Z, +Y is up and
// +X is the character's LEFT. Sides are "L" (+X) and "R" (-X).
export const D = Math.PI / 180;
export const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k, a[2] + b[2] * k];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const norm = (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
export const lerp = (a, b, t) => a + (b - a) * t;
export const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const comb = (...t) => { let o = [0, 0, 0]; for (let i = 0; i < t.length; i += 2) o = add(o, t[i], t[i + 1]); return o; };
export const SIDES = ["L", "R"], SIGN = { L: 1, R: -1 };

// ---- proportions ---------------------------------------------------------------------------------------------------
// spec: { height, heads, ...overrides, pad: {part: extra radius}, belly, garments: {...} }. Lengths default to
// fractions of the height, so a spec can be as short as { height: 1.6, heads: 6.4 }.
export function proportions(spec = {}) {
  const H = spec.height ?? 1.6, heads = spec.heads ?? 6.5, h = H / heads;
  const P = {
    height: H, heads, headH: h, neck: 0.3 * h,
    ankleH: 0.045 * H, shin: 0.235 * H, thigh: 0.24 * H, pelvisH: 0.085 * H,
    shoulderW: 0.1 * H, shoulderDrop: 0.022 * H, hipW: 0.052 * H,
    upperArm: 0.155 * H, foreArm: 0.14 * H, hand: 0.05 * H, heel: 0.035 * H, toe: 0.105 * H,
    belly: 0,
    r: { skull: 0.45 * h, jaw: 0.27 * h, neck: 0.17 * h, chest: 0.062 * H, waist: 0.055 * H, hip: 0.058 * H,
      shoulder: 0.032 * H, elbow: 0.027 * H, wrist: 0.021 * H, hand: 0.027 * H,
      thigh: 0.047 * H, knee: 0.036 * H, ankle: 0.026 * H, heel: 0.022 * H, ball: 0.024 * H, toe: 0.019 * H },
    pad: { head: 0, neck: 0, torso: 0, pelvis: 0, uarm: 0, farm: 0, hand: 0, thigh: 0, shin: 0, foot: 0 },
    garments: {},
  };
  for (const k in spec) {
    if (k === "r" || k === "pad") Object.assign(P[k], spec[k]);
    else P[k] = spec[k];
  }
  P.height = H; P.headH = spec.headH ?? h;
  P.hipY = P.ankleH + P.shin + P.thigh;                       // hip joints above the sole when standing straight
  P.torso = spec.torso ?? H - P.headH - P.neck - P.hipY;      // hips to the base of the neck: whatever is left
  return P;
}

// ---- poses ---------------------------------------------------------------------------------------------------------
// A pose is plain numbers (degrees and metres), so two poses blend by interpolating every leaf.
const LIMB = { arm: { swing: 0, out: 0, elbow: 0 }, leg: { swing: 0, out: 0, knee: 0, foot: 0 } };
export const ZERO = { yaw: 0, x: 0, z: 0, lift: 0, lean: 0, twist: 0, pelvisTwist: 0,
  head: { yaw: 0, pitch: 0, roll: 0 },
  arm: { L: { ...LIMB.arm }, R: { ...LIMB.arm } }, leg: { L: { ...LIMB.leg }, R: { ...LIMB.leg } } };
export function pose(over = {}, base = ZERO) {
  const o = {};
  for (const k in base) o[k] = typeof base[k] === "object" ? pose(over[k] ?? {}, base[k]) : over[k] ?? base[k];
  return o;
}
export function mix(a, b, t) {
  const o = {};
  for (const k in a) o[k] = typeof a[k] === "object" ? mix(a[k], b[k], t) : lerp(a[k], b[k], t);
  return o;
}
// Frame held on twos (or any n): what the character's drawing is a function of.
export const held = (f, n = 2) => Math.floor(f / n) * n;
export const ease = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };

// The layout pose: every limb straight down, which is how a kit's parts are drawn.
export const LAYOUT = pose();
// The A-pose a design turnaround is drawn in: limbs clear of the trunk.
export const APOSE = pose({ arm: { L: { out: 24, elbow: 6 }, R: { out: 24, elbow: 6 } }, leg: { L: { out: 7 }, R: { out: 7 } } });

// periodic catmull-rom over n keys
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
export const RUN_KEYS = 8;
// p: phase 0..1 of one full cycle (two steps). o: { lean, energy }
export function runPose(p, o = {}) {
  const energy = o.energy ?? 1, lean = o.lean ?? 14;
  const tw = 17 * Math.cos(2 * Math.PI * (p - 0.8)) * energy;
  const q = { lean, twist: tw, pelvisTwist: -0.6 * tw, arm: {}, leg: {},
    head: { yaw: 0, pitch: -lean * 0.45, roll: 3 * Math.sin(2 * Math.PI * p + 1) } };
  for (const side of SIDES) {
    const ph = side === "L" ? p : p + 0.5, pl = ph * 8, c = Math.cos(2 * Math.PI * (ph - 0.8));
    q.leg[side] = { swing: cr(THIGH, pl) * energy, out: 5, knee: cr(KNEE, pl), foot: cr(FOOT, pl) };
    q.arm[side] = { swing: -8 - 42 * c * energy, out: 12, elbow: 86 - 12 * c };   // back: hand by the hip; front: fist up by the chest
  }
  const h = (p * 2) % 1, fl = h > 0.3 ? Math.sin(Math.PI * Math.min(1, (h - 0.3) / 0.65)) : 0;
  q.lift = 0.055 * fl * energy;
  q.flight = fl;
  return pose(q);
}
// Standing, breathing and shifting weight a little. t in seconds.
export function idlePose(t = 0) {
  const b = Math.sin(t * 2 * Math.PI / 3.2), w = Math.sin(t * 2 * Math.PI / 6.4 + 1);
  const arm = (s) => ({ swing: 3 + 2 * b * s, out: 9 + 1.5 * b, elbow: 14 + 3 * b });
  return pose({ lean: 1 + 0.8 * b, twist: 2 * w, head: { yaw: 3 * w, pitch: -1 + 1.5 * b, roll: 0 },
    arm: { L: arm(1), R: arm(-1) },
    leg: { L: { swing: 2, out: 6, knee: 3 }, R: { swing: -1, out: 6, knee: 2 } } });
}
// Looking back over the left shoulder from a stand.
export const lookBackPose = (k = 1) => mix(idlePose(0), pose({ lean: 2, twist: 24, pelvisTwist: 6,
  head: { yaw: 68, pitch: 4, roll: -4 },
  arm: { L: { swing: -14, out: 12, elbow: 20 }, R: { swing: 16, out: 10, elbow: 34 } },
  leg: { L: { swing: 2, out: 7, knee: 3 }, R: { swing: -2, out: 6, knee: 4 } } }), k);
// A braking skid: weight back, front leg braced, arms out for balance.
export const skidPose = (k = 1) => mix(idlePose(0), pose({ lean: -16, twist: -22, pelvisTwist: -8,
  head: { yaw: 0, pitch: 8, roll: 0 },
  arm: { L: { swing: -30, out: 48, elbow: 30 }, R: { swing: 38, out: 40, elbow: 44 } },
  leg: { L: { swing: 52, out: 8, knee: 22, foot: -26 }, R: { swing: -6, out: 10, knee: 74, foot: 22 } } }), k);

// ---- skeleton ------------------------------------------------------------------------------------------------------
// solve(P, pose) -> { J: joints, F: frames, vol: volumes, q: the pose }. Joints with a side live under J.L / J.R.
export function solve(P, q0) {
  const q = q0.arm ? q0 : pose(q0), J = { L: {}, R: {} };
  const yw = q.yaw * D, X = [Math.cos(yw), 0, -Math.sin(yw)], Z = [Math.sin(yw), 0, Math.cos(yw)], Y = [0, 1, 0];
  const dirYZ = (a) => comb(Y, -Math.cos(a), Z, Math.sin(a));           // a limb swung forward by a from hanging
  const pt = q.pelvisTwist * D, pX = comb(X, Math.cos(pt), Z, -Math.sin(pt));
  // legs, relative to the hips, to find how high the hips ride
  let minY = 1e9;
  for (const side of SIDES) {
    const s = SIGN[side], l = q.leg[side], j = J[side];
    const sw = l.swing * D, kn = l.knee * D, ft = l.foot * D, out = l.out * D;
    j.hip = mul(pX, s * P.hipW);
    j.thighDir = norm(comb(X, s * Math.sin(out), dirYZ(sw), Math.cos(out)));
    j.knee = add(j.hip, j.thighDir, P.thigh);
    j.shinDir = norm(comb(X, -s * 0.045, dirYZ(sw - kn), 1));
    j.ankle = add(j.knee, j.shinDir, P.shin);
    j.toeDir = comb(Z, Math.cos(ft), Y, -Math.sin(ft)); j.footDn = comb(Y, -Math.cos(ft), Z, -Math.sin(ft));
    j.sole = add(j.ankle, j.footDn, P.ankleH);
    j.heel = add(j.sole, j.toeDir, -P.heel); j.toe = add(j.sole, j.toeDir, P.toe); j.ball = add(j.sole, j.toeDir, P.toe * 0.62);
    j.kneeFlex = l.knee;
    minY = Math.min(minY, j.heel[1], j.toe[1]);
  }
  const hips = [q.x, -minY + q.lift, q.z];
  for (const side of SIDES) for (const k of ["hip", "knee", "ankle", "sole", "heel", "toe", "ball"]) J[side][k] = add(J[side][k], hips);
  J.hips = hips;
  // spine
  const ln = q.lean * D, S = comb(Y, Math.cos(ln), Z, Math.sin(ln)), Fw = comb(Z, Math.cos(ln), Y, -Math.sin(ln));
  const tw = q.twist * D, cX = comb(X, Math.cos(tw), Fw, -Math.sin(tw)), cF = comb(Fw, Math.cos(tw), X, Math.sin(tw));
  const latT = comb(X, Math.cos(tw), Z, -Math.sin(tw)), fwdT = comb(Z, Math.cos(tw), X, Math.sin(tw));
  J.waist = add(hips, S, P.pelvisH);
  J.neckBase = add(hips, S, P.torso);
  J.chest = add(hips, S, P.torso * 0.72);
  for (const side of SIDES) {
    const s = SIGN[side], a = q.arm[side], j = J[side];
    const al = a.swing * D, el = a.elbow * D, out = a.out * D;
    const down = (g) => comb(Y, -Math.cos(g), fwdT, Math.sin(g));
    j.sh = comb(J.neckBase, 1, S, -P.shoulderDrop, cX, s * P.shoulderW);
    j.armDir = norm(comb(latT, s * Math.sin(out), down(al), Math.cos(out)));
    j.elbow = add(j.sh, j.armDir, P.upperArm);
    j.foreDir = norm(comb(latT, s * Math.sin(out) * 0.35 - s * 0.1 * Math.sin(el), down(al + el), 1));
    j.wrist = add(j.elbow, j.foreDir, P.foreArm);
    j.hand = add(j.wrist, j.foreDir, P.hand);
  }
  // neck and head
  const nl = ln * 0.5, N = comb(Y, Math.cos(nl), Z, Math.sin(nl));
  J.headBase = add(J.neckBase, N, P.neck);
  const hy = (q.twist * 0.6 + q.head.yaw) * D, hp = q.head.pitch * D, hr = q.head.roll * D;
  const hX0 = comb(X, Math.cos(hy), Z, -Math.sin(hy)), hF0 = comb(Z, Math.cos(hy), X, Math.sin(hy));
  const hF = comb(hF0, Math.cos(hp), Y, -Math.sin(hp)), hU0 = comb(Y, Math.cos(hp), hF0, Math.sin(hp));
  const hX = comb(hX0, Math.cos(hr), hU0, Math.sin(hr)), hU = comb(hU0, Math.cos(hr), hX0, -Math.sin(hr));
  J.head = add(J.headBase, hU, P.headH * 0.5); J.crown = add(J.headBase, hU, P.headH);
  const F = { root: { X, Y, Z }, pelvis: { X: pX, Y, Z }, chest: { X: cX, Y: S, Z: cF }, head: { X: hX, Y: hU, Z: hF }, neck: N };
  return { P, q, J, F, vol: volumes(P, J, F) };
}

// ---- volumes -------------------------------------------------------------------------------------------------------
// Each volume is the convex hull of a few spheres, tagged with the body part it belongs to. Clothing bulk comes from
// P.pad; garments that wrap the body (a collar) are chains of capsules so a layout can split them front and back.
function volumes(P, J, F) {
  const r = P.r, pad = P.pad, h = P.headH, V = [];
  const vol = (part, side, tone, spheres) => V.push({ part, side, tone, spheres: spheres.map(([c, rr]) => ({ c, r: rr })) });
  const C = F.chest, Hd = F.head;
  // trunk
  const chestC = add(J.neckBase, C.Y, -(P.shoulderDrop + r.chest * 0.75));
  const trunk = [];
  for (const s of [1, -1]) {
    trunk.push([add(chestC, C.X, s * (P.shoulderW - r.chest * 0.55)), r.chest + pad.torso]);
    trunk.push([add(add(J.hips, C.Y, P.torso * 0.42), F.root.X, s * P.hipW * 0.8), r.waist * 0.94 + pad.torso]);
    trunk.push([add(J.waist, F.root.X, s * P.hipW * 0.75), r.waist + pad.torso]);
  }
  if (P.belly) trunk.push([comb(J.waist, 1, C.Y, P.torso * 0.12, C.Z, P.belly * 0.6), r.waist + P.belly]);
  vol("torso", null, "trunk", trunk);
  const pel = [];
  for (const s of [1, -1]) {
    pel.push([add(J.waist, F.root.X, s * P.hipW * 0.75), r.waist + pad.pelvis]);
    pel.push([add(J[s > 0 ? "L" : "R"].hip, F.root.Y, 0.012), r.hip + pad.pelvis]);
  }
  pel.push([add(J.hips, F.root.Y, -r.hip * 0.55), r.hip * 0.75 + pad.pelvis]);
  vol("pelvis", null, "pelvis", pel);
  vol("neck", null, "neck", [[add(J.neckBase, F.neck, -0.25 * P.neck), r.neck + pad.neck], [add(J.headBase, Hd.Y, 0.12 * h), r.neck + pad.neck]]);
  // head: skull and jaw
  vol("head", null, "head", [[comb(J.headBase, 1, Hd.Y, 0.55 * h), r.skull + pad.head], [comb(J.headBase, 1, Hd.Y, 0.24 * h, Hd.Z, 0.13 * h), r.jaw]]);
  for (const side of SIDES) {
    const j = J[side];
    vol("uarm", side, "upper", [[j.sh, r.shoulder + pad.uarm], [j.elbow, r.elbow + pad.uarm]]);
    vol("farm", side, "lower", [[j.elbow, r.elbow + pad.farm], [j.wrist, r.wrist + pad.farm]]);
    vol("farm", side, "upper", [[add(j.wrist, j.foreDir, P.hand * 0.55), r.hand + pad.hand], [add(j.wrist, j.foreDir, P.hand * 0.1), r.wrist + pad.hand]]);
    vol("thigh", side, "upper", [[j.hip, r.thigh + pad.thigh], [j.knee, r.knee + pad.thigh]]);
    vol("shin", side, "lower", [[j.knee, r.knee + pad.shin], [j.ankle, r.ankle + pad.shin]]);
    const up = (p, rr) => [add(p, j.footDn, -rr), rr + pad.foot];
    vol("shoe", side, "upper", [up(j.heel, r.heel), up(j.ball, r.ball), up(j.toe, r.toe), [j.ankle, r.ankle + pad.foot],
      [add(j.ankle, j.shinDir, -P.shin * (P.shoeTop ?? 0.12)), r.ankle + pad.foot]]);
  }
  // garments and extras, placed in a frame: "head" (origin the base of the skull) or "chest" (origin the base of the
  // neck), in units of the head height so they scale with the character
  const frame = (n) => n === "head" ? [J.headBase, Hd] : [J.neckBase, C];
  const at = (n, p) => { const [o, f] = frame(n); return comb(o, 1, f.X, p[0] * h, f.Y, p[1] * h, f.Z, p[2] * h); };
  for (const e of P.extras ?? []) vol(e.part, null, e.tone ?? e.part, e.spheres.map((s) => [at(e.frame, s.at), s.r * h]));
  for (const name in P.garments) {
    const g = P.garments[name];
    if (!g.ring) continue;
    const n = g.n ?? 9, pts = [];
    for (let i = 0; i < n; i++) {
      const a = (g.from + (g.to - g.from) * i / (n - 1)) * D;       // 0 = front, turning toward the character's left
      const k = 1 + (g.back ?? 0) * (0.5 - 0.5 * Math.cos(a));       // a collar stands higher at the nape
      pts.push([at(g.frame, [Math.sin(a) * g.radius, g.y * k + (g.tilt ?? 0) * Math.cos(a), Math.cos(a) * g.radius * (g.depth ?? 1)]), g.r * h]);
    }
    for (let i = 0; i + 1 < n; i++) vol(name, null, "garment", [pts[i], pts[i + 1]]);
  }
  return V;
}

// ---- camera --------------------------------------------------------------------------------------------------------
// camera({ pos, target, fov, w, h }) or camera({ ..., ortho: pxPerUnit }). project(p) -> { x, y, z, s }: screen
// pixels, depth along the view axis, and pixels per unit at that depth.
export function camera(o) {
  const w = o.w ?? 1920, h = o.h ?? 1080, pos = o.pos, fwd = norm(sub(o.target, pos));
  const right = norm(cross(fwd, o.up ?? [0, 1, 0])), up = cross(right, fwd);
  const f = (h / 2) / Math.tan((o.fov ?? 30) * D / 2), cx = o.cx ?? w / 2, cy = o.cy ?? h / 2;
  const project = (p) => {
    const d = sub(p, pos), z = dot(d, fwd), s = o.ortho ?? f / Math.max(z, 1e-3);
    return { x: cx + dot(d, right) * s, y: cy - dot(d, up) * s, z, s };
  };
  return { ...o, w, h, pos, fwd, right, up, project };
}
// A camera on a circle round a point: azimuth 0 looks at the front of a character facing +Z, 90 at its left side.
export function orbit(target, az, dist, o = {}) {
  const a = az * D, el = (o.elev ?? 0) * D;
  const pos = [target[0] + Math.sin(a) * Math.cos(el) * dist, target[1] + Math.sin(el) * dist, target[2] + Math.cos(a) * Math.cos(el) * dist];
  return camera({ ...o, pos, target });
}
// The camera's azimuth round a character, relative to where the character faces: 0 front, +90 its left side, 180 back.
export function relativeYaw(cam, root, yaw) {
  const az = Math.atan2(cam.pos[0] - root[0], cam.pos[2] - root[2]) / D;
  let r = (az - yaw) % 360; if (r > 180) r -= 360; if (r <= -180) r += 360;
  return r;
}

// How far the ground passes under a run cycle, per cycle: the planted foot's backward travel while it is planted.
export function runStride(P, o = {}) {
  const N = 96; let dist = 0, n = 0;
  for (let i = 0; i < N; i++) {
    const p0 = i / N, p1 = (i + 1) / N, a = solve(P, runPose(p0, o)), b = solve(P, runPose(p1, o));
    if (a.q.lift > 1e-4 || b.q.lift > 1e-4) continue;
    const low = (B, side) => Math.min(B.J[side].heel[1], B.J[side].toe[1]);
    const side = low(a, "L") < low(a, "R") ? "L" : "R";
    dist += a.J[side].ball[2] - b.J[side].ball[2]; n++;
  }
  return n ? dist / n * N : 0;
}
