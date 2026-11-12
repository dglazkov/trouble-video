// THE WARDEN: the one enormous machine the station pulls together out of every drone the four broke. A spider of
// wreckage that straddles whatever it walks on: six mismatched legs (bundles of chaser bodies, enforcer arms, scrap
// girder) whose knees stand far out and high above it, clawed feet that clamp a deck's edges; a scorched enforcer for a
// trunk with tape reels still turning on its back; a neck that is a sliced enforcer still in its slices, the cuts
// still hot; a head that is an enforcer's dead face in a cluster of chaser cowls, MANY RED EYES THAT MOVE TOGETHER;
// on its left a long arm ending in a pincer the size of a door, on its right a fan of chaser blades.
// Toon-shaded and outlined like machines/drones.js (same materials, same dark twin hull).
//
// USAGE (a set owns it, like the drones; sets/atrium.js takes `options.warden = spec`):
//   import { createWarden, stalk } from "../machines/warden.js";
//   const warden = createWarden(kit, scene);                     // kit: the set's sets/kit.js kit, so it takes the set's light
//   warden.update(spec | null, frame, sync, threeCamera);        // every frame; null hides it
// spec (every field optional but pos; all plain values for this frame, so a shot's frame() stays pure):
//   pos: [x, y, z]      the ground point under its trunk            yaw: degrees, 0 faces +Z (like a character)
//   scale: 1            1 = about 11 m to the knees, 14 m knee to knee, trunk 5.6 m up
//   height: 5.6         the trunk above pos;  pitch, roll: degrees (nose down positive);  bob: metres added to height
//   span: 2.25          how far either side of its line the feet come down (2.25 clamps the atrium gantry's edges; ~5 on a floor)
//   feet: [[x, y, z] x6]  where each foot is, in the WORLD (legs 0,2,4 are its left, +X at yaw 0; front to back). Default: its stance.
//   look: [x, y, z]     what the eyes look at (world): the whole head turns, every eye with it
//   reach: 0..1         the neck thrown out toward `look` (a lunge of the head);  eye: 0..2 how hard the eyes burn (0: dead)
//   arm: { to: [x, y, z] (world: where the pincer is), open: 0..1 }    default: held cocked at its left
//   sway: 0..1          the blade fan and hanging cables shiver
//   assemble: 0..1      0: every piece lies where it was thrown (`sources`), 1: built. In between they fly together, trunk
//                       first, eyes last, each one tumbling in on an arc and snapping home. (omit: built)
//   sources: [[x, y, z], ...]   where the wreckage lies before it assembles (pieces take them in turn, with a scatter);
//                       default: a ring of `scatter` = [rx, ry, rz] metres round pos (default [16, 0.5, 16])
//   broken: { GROUP: seconds since that group came off }   it comes apart in stages. GROUPS: "leg0".."leg5", "arm",
//                       "fan", "head", "neck", "back", "trunk"; "all" = everything not already off.
//   deck: { y: 0, half: 2.2, x: 0 }   what thrown pieces land on: a strip `half` wide along Z at height y (a bridge: what
//                       misses it goes on falling); half: Infinity = a floor. Default: a floor at pos's height.
//   carry: [vx, vy, vz] added to every thrown piece's velocity (m/s)
// stalk(frame, sync, o) -> spec fields { pos, feet, bob }: it walks along its yaw with ONE PAIR OF FEET COMING DOWN ON
//   EACH KICK (o.stem, default "kick"): o = { from: [x, y, z] where it stands at kick number o.k0, yaw, per: metres per
//   kick, span, stop: kick number after which it stands }.
// warden.eyeAt(spec) -> [x, y, z] where the head is (world), for a shot that wants to aim at it.
import * as THREE from "three";
import { Builder, FX, canvasTex, rng, hash, clamp } from "../sets/kit.js";

const D = Math.PI / 180, V3 = (a) => new THREE.Vector3(a[0], a[1], a[2]), ease = (u) => u * u * (3 - 2 * u);
export const GROUPS = ["leg0", "leg1", "leg2", "leg3", "leg4", "leg5", "arm", "fan", "head", "neck", "back", "trunk"];
const HIPS = [[1.5, 0.3, 1.3], [-1.5, 0.3, 1.3], [1.7, 0.2, 0], [-1.7, 0.2, 0], [1.5, 0.3, -1.4], [-1.5, 0.3, -1.4]], REST = [4.6, 4.6, 0.2, 0.2, -4.4, -4.4], L1 = [6.2, 5.6, 6.6, 6.0, 5.8, 6.4], L2 = [7.6, 7.0, 7.9, 7.4, 7.2, 7.8];
// the default stance: where each foot stands for a machine at pos heading yaw
export function stance(pos, yaw = 0, span = 2.25, scale = 1) {
  const c = Math.cos(yaw * D), s = Math.sin(yaw * D);
  return REST.map((z, i) => { const x = (i % 2 ? -1 : 1) * span * scale, zz = z * scale; return [pos[0] + x * c + zz * s, pos[1], pos[2] - x * s + zz * c]; });
}
export function stalk(frame, sync, o) {
  const k = sync.at(frame).stems[o.stem ?? "kick"], yaw = o.yaw ?? 0, per = o.per ?? 1.6, c = Math.cos(yaw * D), s = Math.sin(yaw * D), stop = o.stop ?? 1e9, k0 = o.k0 ?? 0;
  const idx = Math.min(k.index, stop), swing = 0.24, going = k.index < stop && k.until < swing, u = going ? ease(1 - k.until / swing) : 0;
  const along = (n) => (Math.min(n, stop) - k0) * per, at = (d) => [o.from[0] + d * s, o.from[1], o.from[2] + d * c];
  // the trunk goes on between kicks and drops onto each footfall
  const lead = k.index < stop && k.until < 0.6 ? ease(clamp(1 - k.until / 0.42)) : 0, pos = at(along(idx) + per * lead * 0.999);
  const feet = stance([0, 0, 0], yaw, o.span ?? 2.25).map((p, i) => {
    const g = (i >> 1) + (i % 2 ? 0 : 0), mine = (n) => ((n % 3) + 3) % 3 === [0, 2, 1][g];      // front pair, back pair, middle pair, turn about
    let last = idx; while (!mine(last)) last--;
    const a = at(along(last) + (i % 2 ? 0 : per * 0.5)), q = [a[0] + p[0], a[1], a[2] + p[2]];
    if (going && mine(idx + 1)) { const b = at(along(idx + 1 + 0) + (i % 2 ? 0 : per * 0.5) + per * 2); const e = [b[0] + p[0], b[1], b[2] + p[2]]; return [q[0] + (e[0] - q[0]) * u, q[1] + Math.sin(Math.PI * u) * 1.5, q[2] + (e[2] - q[2]) * u]; }
    return q;
  });
  // (a foot's place after a step is three kicks' travel on from its last: along(last) already carries it, since `last` is the kick it came down on)
  return { pos, feet, bob: k.since < 1 ? -0.3 * Math.exp(-k.since / 0.09) : 0 };
}

function maker(kit, t) {
  const hullMat = kit.mat("#0b0a1e", { kind: 1, side: THREE.BackSide, fog: 1 });
  return (group, order, kick, fn) => {
    const b = new Builder(), h = new Builder();
    fn({
      box(w, hh, d, x, y, z, m, r) { b.box(w, hh, d, x, y, z, m, r); h.box(w + 2 * t, hh + 2 * t, d + 2 * t, x, y, z, hullMat, r); },
      cyl(r, len, x, y, z, m, axis, seg, r2 = r, rot) { b.cyl(r, len, x, y, z, m, axis, seg, r2, rot); h.cyl(r + t, len + 2 * t, x, y, z, hullMat, axis, seg, r2 + t, rot); },
      ball(r, x, y, z, m, rot, seg) { b.ball(r, x, y, z, m, rot, seg); h.ball(r + t, x, y, z, hullMat, rot, seg); },
      bare: b,
    });
    const g = new THREE.Group(); g.add(b.build()); const hull = h.build(); hull.traverse((m) => m.layers.set(FX)); g.add(hull);
    g.traverse((m) => { m.frustumCulled = false; }); g.userData = { group, order, kick }; return g;
  };
}

export function createWarden(kit, scene) {
  const { mat } = kit, part = maker(kit, 0.05), root = new THREE.Group(); scene.add(root); root.visible = false;
  const navy = mat("#2a2f55", { kind: 5 }), navy2 = mat("#20244a", { kind: 5 }), cream = mat("#d9cfb0", { kind: 5 }), beige = mat("#c9bf9d", { kind: 5 }), shade = mat("#968d72", { kind: 5 }), gun = mat("#3a3f6a", { kind: 5 }), black = mat("#14152b", { kind: 5 }), orange = mat("#f07a22", { kind: 5 }), scorch = mat("#3b2f3a", { kind: 5 }), rust = mat("#7a4a3c", { kind: 5 });
  const eyeG = { value: 1 }, hotG = { value: 1 }, reels = { value: 0 };
  const eye = mat("#ff2a1e", { kind: 1, fog: 0.5, gain: eyeG }), hot = mat("#ff9a3a", { kind: 1, fog: 0.5, gain: hotG });
  // the rig: empty nodes whose world matrices say where each piece belongs this frame; the pieces themselves are laid
  // on them (or on the way to them, or thrown from them)
  const rig = new THREE.Group(), B = new THREE.Group(), HD = new THREE.Group(); rig.add(B); B.add(HD);
  const pieces = [], add = (node, g) => { g.userData.node = node; g.userData.i = pieces.length; root.add(g); pieces.push(g); return g; };
  const on = (parent, at = [0, 0, 0], rot = [0, 0, 0]) => { const n = new THREE.Group(); n.position.set(...at); n.rotation.set(...rot); parent.add(n); return n; };
  // a chaser's cowl with its eye, looking along +Z; a chaser's blade; a chaser's body (tail along -Z)
  const cowl = (p, k, x = 0, y = 0, z = 0) => { p.cyl(0.19 * k, 0.3 * k, x, y, z, black, "z", 12, 0.15 * k); p.cyl(0.2 * k, 0.05 * k, x, y, z - 0.1 * k, orange, "z", 12); p.bare.ball(0.115 * k, x, y, z + 0.13 * k, eye, { s: [1, 1, 0.6] }, 12); };
  const blade = (p, len, x, y, z, r) => { p.box(len, 0.05, 0.34, x, y, z, navy, r); };

  // ---- the trunk: a scorched enforcer, twice the size; the reels on its back; scrap plates bolted over it ---------------
  add(B, part("trunk", 0, [0, 1, 0], (p) => {
    p.box(2.6, 2.1, 3.0, 0, 0, 0, beige); p.box(2.7, 0.36, 3.1, 0, -0.66, 0, shade); p.box(2.7, 0.12, 3.1, 0, 0.5, 0, shade);
    p.box(1.5, 1.3, 0.2, -0.75, 0.1, 1.5, scorch, { rz: 0.12 }); p.box(1.2, 0.9, 0.2, 0.8, -0.3, 1.52, rust, { rz: -0.2 });      // scorched plates where its face was
    p.box(0.22, 1.5, 1.9, 1.34, 0.1, -0.3, scorch, { rx: 0.1 }); p.box(0.22, 1.0, 1.2, -1.34, -0.2, 0.5, rust, { rx: -0.15 });
    p.cyl(0.95, 0.8, 0, -1.4, 0, gun, "y", 14, 0.7); p.cyl(0.74, 0.2, 0, -1.84, 0, orange, "y", 14);
    for (const s of [1, -1]) for (const z of [1.3, 0, -1.4]) { p.cyl(0.62, 0.9, s * 1.55, 0.25, z, gun, "x", 14); p.cyl(0.66, 0.16, s * 1.75, 0.25, z, orange, "x", 14); }      // enforcers' shoulders: the legs' sockets
  }));
  add(B, part("back", 0.08, [0, 3, -2], (p) => {
    p.box(2.2, 0.3, 1.7, 0, 1.2, -0.5, gun); p.bare.quad([0, 1.36, -0.5], [1, 0, 0], [0, 0, -1], 1.9, 0.95, mat("#e6dcc0", { kind: 9, gain: reels, offset: 1 }));
    p.cyl(0.05, 2.6, -0.9, 2.4, -1.1, black, "y", 6, 0.03); p.bare.ball(0.1, -0.9, 3.72, -1.1, eye); p.cyl(0.04, 1.7, 0.7, 2.0, -1.2, black, "y", 5, 0.02, { rz: -0.2 }); p.ball(0.3, -0.9, 3.0, -1.1, beige, { s: [1, 0.35, 1] });
    p.box(0.9, 1.6, 0.7, 0.6, 1.3, -1.7, scorch, { rx: -0.3 }); p.cyl(0.4, 1.4, -0.5, 1.0, -1.9, gun, "y", 10, 0.3, { rx: -0.5 });
  }));
  // ---- the neck: an enforcer in six slices, each cut still hot ---------------------------------------------------------
  const NECK = Array.from({ length: 6 }, (_, i) => { const n = on(B); add(n, part("neck", 0.2 + i * 0.03, [(i % 2 ? 1 : -1) * 2, 2, 2], (p) => {
    const k = 1 - i * 0.07; p.box(1.9 * k, 1.5 * k, 0.42, 0, 0, 0, i % 2 ? beige : shade); p.box(1.96 * k, 0.24 * k, 0.44, 0, -0.45 * k, 0, gun);
    p.bare.box(1.7 * k, 1.3 * k, 0.05, 0, 0, 0.22, hot); p.bare.box(1.7 * k, 1.3 * k, 0.05, 0, 0, -0.22, hot);
  })); return n; });
  // ---- the head: an enforcer's dead face under its brow, in a cluster of chaser cowls; a mane of blades ------------------
  add(HD, part("head", 0.86, [0, 2, 3], (p) => {
    p.box(2.0, 1.3, 0.9, 0, 0, -0.2, beige); p.box(2.4, 0.5, 1.3, 0, 0.72, 0.1, gun, { rx: 0.24 }); p.box(1.7, 1.05, 0.16, 0, -0.04, 0.3, black);
    p.cyl(0.5, 0.16, 0, 0, 0.4, gun, "z", 18); p.cyl(0.4, 0.16, 0, 0, 0.44, black, "z", 18); p.bare.ball(0.3, 0, 0, 0.48, eye, { s: [1, 1, 0.5] }, 16);
    p.box(1.7, 0.4, 0.8, 0, -0.84, 0.2, gun, { rx: -0.5 }); p.box(1.76, 0.12, 0.5, 0, -0.74, 0.5, orange, { rx: -0.5 });
  }));
  const EYES = [[1.45, 0.5, 0.1, 2.3, 16], [-1.5, 0.3, 0.0, 2.6, -18], [1.2, -0.75, 0.2, 1.8, 12], [-1.15, -0.85, 0.15, 2.0, -10], [0.5, 1.35, -0.1, 1.9, 4], [-0.65, 1.3, -0.15, 1.6, -6], [2.2, -0.2, -0.4, 1.5, 28], [-2.25, -0.5, -0.5, 1.7, -30], [0.1, -1.5, 0.0, 1.5, 0]];
  const eyeNodes = EYES.map(([x, y, z, k, a], i) => { const n = on(HD, [x, y, z], [-(y > 0 ? 0.12 : -0.2), a * D, 0]); add(n, part("head", 0.9 + i * 0.01, [x * 2, 3 + y, 3], (p) => { cowl(p, k); p.cyl(0.07 * k, 0.62 * k, 0, 0, -0.4 * k, navy, "z", 6, 0.17 * k, { s: [1, 0.8, 1] }); })); n.userData.k = k; return n; });
  add(HD, part("head", 0.84, [0, 4, -1], (p) => { for (let i = 0; i < 7; i++) { const a = (i - 3) * 0.33; p.box(0.3, 2.4 + (i % 2) * 0.6, 0.06, Math.sin(a) * 1.4, 0.9 + Math.cos(a) * 1.3, -0.75, i % 2 ? navy : navy2, { rz: -a, rx: -0.35 }); p.box(0.32, 0.5, 0.07, Math.sin(a) * 2.5, 0.9 + Math.cos(a) * 2.4, -1.2, orange, { rz: -a, rx: -0.35 }); } }));
  // ---- the legs: an upper (built up its +Y), a lower (down its -Y), a clawed foot; no two alike --------------------------
  const LEGS = HIPS.map((h, i) => {
    const up = on(rig), lo = on(rig), ft = on(rig), s = i % 2 ? -1 : 1, v = i % 3, a = L1[i], b = L2[i], kick = [s * 5, 2, (1 - (i >> 1)) * 3];
    add(up, part("leg" + i, 0.3 + i * 0.03, kick, (p) => {
      if (v === 0) { for (const [x, z] of [[0.3, 0.2], [-0.3, 0.15], [0, -0.3]]) p.cyl(0.42, a, x, a / 2, z, navy, "y", 6, 0.2); p.cyl(0.3, a * 0.7, 0, a * 0.5, 0.45, cream, "y", 4, 0.16); }
      else if (v === 1) { p.box(0.9, a, 0.8, 0, a / 2, 0, beige); p.box(0.96, 0.5, 0.86, 0, a * 0.3, 0, shade); p.box(0.96, 0.3, 0.86, 0, a * 0.72, 0, orange); p.box(0.3, a * 0.8, 0.3, 0.5, a / 2, 0.3, black); }
      else { p.box(0.5, a, 0.9, 0, a / 2, 0, gun); for (let y = 0.8; y < a - 0.4; y += 1.1) p.box(0.56, 0.16, 1.0, 0, y, 0, scorch, { rx: 0.5 }); p.cyl(0.14, a, 0.35, a / 2, 0.3, rust, "y", 6); }
      p.cyl(0.72, 1.1, 0, a, 0, gun, "x", 14); p.cyl(0.76, 0.2, 0, a, 0, orange, "x", 14); p.cyl(0.4, 1.3, 0, a, 0, black, "x", 10);      // the knee: a shoulder drum
    }));
    add(lo, part("leg" + i, 0.36 + i * 0.03, kick, (p) => {
      if (v === 1) { for (const [x, z] of [[0.24, 0.1], [-0.24, 0.1], [0, -0.26]]) p.cyl(0.14, b, x, -b / 2, z, navy2, "y", 6, 0.4); p.box(0.3, b * 0.5, 0.06, 0, -b * 0.4, 0.5, navy, { rx: 0.08 }); }
      else if (v === 2) { p.box(0.6, b, 0.6, 0, -b / 2, 0, beige, { s: [1, 1, 1] }); p.box(0.66, 0.4, 0.66, 0, -b * 0.25, 0, gun); p.box(0.66, 0.4, 0.66, 0, -b * 0.6, 0, scorch); p.cyl(0.1, b, -0.4, -b / 2, 0, black, "y", 5); }
      else { p.cyl(0.16, b, 0, -b / 2, 0, black, "y", 7, 0.44); for (let k = 0; k < 3; k++) p.box(0.5, 1.5, 0.07, 0, -1.2 - k * 1.8, 0.4, navy, { rx: 0.3 }); p.cyl(0.47, 0.3, 0, -b * 0.12, 0, orange, "y", 7); }
    }));
    add(ft, part("leg" + i, 0.42 + i * 0.03, kick, (p) => {
      p.ball(0.42, 0, 0.3, 0, gun); p.cyl(0.5, 0.18, 0, 0.12, 0, orange, "y", 10);
      for (const [dx, dz, ry] of [[-s * 0.55, 0, 0], [s * 0.15, 0.6, 1.2], [s * 0.15, -0.6, -1.2]]) { p.box(0.2, 0.9, 0.3, dx * 1.1, -0.15, dz, black, { rz: -Math.sign(dx || s) * 0.5 * (dz ? 0.4 : 1), rx: dz ? Math.sign(dz) * 0.5 : 0 }); p.box(0.16, 0.5, 0.24, dx * 1.25, -0.7, dz * 1.2, orange, { rz: Math.sign(dx || s) * 0.25 * (dz ? 0.3 : 1) }); }
    }));
    return { up, lo, ft, hip: V3(h), a, b, s };
  });
  // ---- the arm (its left): two lengths and a pincer the size of a door ---------------------------------------------------
  const ARM = { up: on(rig), fore: on(rig), hand: on(rig), jaw: [on(rig), on(rig)], at: V3([1.9, 1.0, 1.2]), a: 5.2, b: 5.6 };
  add(ARM.up, part("arm", 0.62, [6, 2, 1], (p) => { p.box(0.8, 0.8, ARM.a, 0, 0, ARM.a / 2, beige); p.box(0.86, 0.86, 0.6, 0, 0, ARM.a * 0.3, gun); p.box(0.86, 0.86, 0.3, 0, 0, ARM.a * 0.7, orange); p.cyl(0.8, 1.2, 0, 0, 0, gun, "x", 14); p.cyl(0.84, 0.2, 0, 0, 0, orange, "x", 14); p.cyl(0.1, ARM.a, 0.5, 0.3, ARM.a / 2, black, "z", 5); }));
  add(ARM.fore, part("arm", 0.66, [6, 2, 2], (p) => { for (const [x, y] of [[0.26, 0.2], [-0.26, 0.2], [0, -0.26]]) p.cyl(0.36, ARM.b, x, y, ARM.b / 2, navy, "z", 6, 0.2); p.ball(0.6, 0, 0, 0, gun); p.cyl(0.5, 0.5, 0, 0, ARM.b, orange, "z", 10); }));
  ARM.jaw.forEach((n, j) => add(n, part("arm", 0.7 + j * 0.02, [6, 3, 3], (p) => { const s = j ? -1 : 1; p.box(0.3, 0.5, 1.9, s * 0.5, 0, 0.9, black, { ry: s * 0.25 }); p.box(0.28, 0.44, 1.3, s * 0.52, 0, 2.3, black, { ry: -s * 0.5 }); p.box(0.24, 0.4, 0.6, s * 0.2, 0, 2.95, orange, { ry: -s * 0.9 }); })));
  add(ARM.hand, part("arm", 0.68, [6, 2, 3], (p) => { p.ball(0.6, 0, 0, 0, gun); p.box(1.3, 0.6, 0.6, 0, 0, 0.1, scorch); }));
  // ---- the fan (its right): chaser blades, spread like a hand of knives --------------------------------------------------
  const FAN = Array.from({ length: 7 }, (_, i) => { const n = on(B, [-1.7, 1.0, 0.2]); add(n, part("fan", 0.74 + i * 0.012, [-6, 3, i - 3], (p) => { const len = 4.2 + (i % 3) * 1.1; p.box(len, 0.07, 0.6, -len / 2, 0, 0, i % 2 ? navy : navy2, { ry: 0.1 }); p.box(1.0, 0.09, 0.62, -len + 0.4, 0, 0.1, orange, { ry: 0.1 }); if (i === 3) p.cyl(0.6, 1.0, 0, 0, 0, gun, "z", 12); })); return n; });
  // hanging cables under the trunk
  const CABLES = Array.from({ length: 5 }, (_, i) => { const n = on(B, [(hash(i, 1) - 0.5) * 2, -1.5, (hash(i, 2) - 0.5) * 2.4]); add(n, part("trunk", 0.5 + i * 0.02, [0, -1, 0], (p) => { const len = 1.6 + hash(i, 3) * 2.2; p.cyl(0.05, len, 0, -len / 2, 0, black, "y", 5); p.box(0.2, 0.3, 0.2, 0, -len, 0, i % 2 ? orange : gun); })); return n; });
  // the eyes' halos
  const haloTex = canvasTex(256, 256, (c) => { c.fillStyle = "rgba(255,255,255,0.22)"; c.beginPath(); c.arc(128, 128, 78, 0, 7); c.fill(); c.fillStyle = "rgba(255,255,255,0.5)"; c.beginPath(); c.arc(128, 128, 40, 0, 7); c.fill(); c.fillStyle = "rgba(255,255,255,0.8)"; c.beginPath(); c.moveTo(0, 128); c.lineTo(128, 122); c.lineTo(256, 128); c.lineTo(128, 134); c.fill(); });
  const haloMat = kit.mat("#ff3a2a", { kind: 7, flag: 1, map: haloTex, additive: true, fog: 0.3 });
  const halos = [[0, 0, 0.6, 3.0], ...EYES.map(([x, y, z, k]) => [x, y, z + 0.3 * k, k])].map(([x, y, z, k]) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), haloMat); m.layers.set(FX); m.renderOrder = 12; m.frustumCulled = false; m.userData = { at: [x, y, z], k }; root.add(m); return m; });

  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _m = new THREE.Matrix4(), YU = new THREE.Vector3(0, 1, 0), YD = new THREE.Vector3(0, -1, 0), ZF = new THREE.Vector3(0, 0, 1);
  // two lengths from A to T, the joint thrown toward `pole`
  const ik = (A, T, a, b, pole) => { const d = _a.copy(T).sub(A), len = Math.min(a + b - 0.05, Math.max(Math.abs(a - b) + 0.05, d.length())); d.normalize(); const x = (a * a - b * b + len * len) / (2 * len), h = Math.sqrt(Math.max(0, a * a - x * x)), pp = _b.copy(pole).addScaledVector(d, -pole.dot(d)).normalize(); return { knee: A.clone().addScaledVector(d, x).addScaledVector(pp, h), end: A.clone().addScaledVector(d, len) }; };
  const point = (n, from, to, axis, sc) => { n.position.copy(from); n.quaternion.setFromUnitVectors(axis, _c.copy(to).sub(from).normalize()); n.scale.setScalar(sc); };
  const headAt = (spec) => { const r = clamp(spec.reach ?? 0); return [0, -0.9 - 1.6 * r, 5.4 + 3.2 * r]; };

  function pose(spec, frame) {
    const sc = spec.scale ?? 1, yaw = (spec.yaw ?? 0) * D, pos = spec.pos, t = frame / 24;
    rig.position.set(0, 0, 0); B.position.set(pos[0], pos[1] + ((spec.height ?? 5.6) + (spec.bob ?? 0)) * sc, pos[2]); B.rotation.set((spec.pitch ?? 0) * D, yaw, (spec.roll ?? 0) * D, "YXZ"); B.scale.setScalar(sc);
    B.updateMatrixWorld(true);
    // the head: out on the neck, turned to what it looks at
    const hp = headAt(spec); HD.position.set(...hp); HD.rotation.set(0.25, 0, 0);
    if (spec.look) { const l = B.worldToLocal(V3(spec.look)).sub(HD.position), ry = clamp(Math.atan2(l.x, l.z), -1.2, 1.2), rx = clamp(-Math.atan2(l.y, Math.hypot(l.x, l.z)), -0.9, 1.1); HD.rotation.set(rx, ry, Math.sin(t * 1.7) * 0.03, "YXZ"); }
    NECK.forEach((n, i) => { const u = (i + 0.6) / 6.4, w = u * u; n.position.set(hp[0] * w + Math.sin(i * 2.1) * 0.12, 0.5 * (1 - u) * (1 - u) + 2 * u * (1 - u) * 1.4 + hp[1] * w, 1.5 * (1 - u) * (1 - u) + 2 * u * (1 - u) * 3.2 + hp[2] * w - 0.5 * u); n.rotation.set(0.15 + 0.5 * u + HD.rotation.x * w, HD.rotation.y * w, (i % 2 ? 0.1 : -0.08) + Math.sin(i * 1.3) * 0.05); });
    const sway = spec.sway ?? 0;
    FAN.forEach((n, i) => { const a = (i - 3) * 0.24; n.rotation.set(0, 0.5 + a * 0.3, -0.5 - a * 1.1 + Math.sin(frame * 0.5 + i) * 0.04 * (0.4 + sway), "YXZ"); });
    CABLES.forEach((n, i) => n.rotation.set(Math.sin(t * 2.1 + i) * 0.12 * (1 + sway), 0, Math.sin(t * 1.7 + i * 2) * 0.12 * (1 + sway) - (spec.roll ?? 0) * D));
    B.updateMatrixWorld(true);
    // legs
    const feet = spec.feet ?? stance(pos, spec.yaw ?? 0, spec.span ?? 2.25, sc);
    LEGS.forEach((L, i) => {
      const A = L.hip.clone().applyMatrix4(B.matrixWorld), T = V3(feet[i]); T.y += 0.5 * sc;
      const out = _p.set(L.s * 1.0, 0.0, (1 - (i >> 1)) * 0.25).applyQuaternion(B.quaternion); out.y += 1.25;
      const { knee, end } = ik(A, T, L.a * sc, L.b * sc, out);
      point(L.up, A, knee, YU, sc); point(L.lo, knee, end, YD, sc); L.ft.position.copy(end).y -= 0.5 * sc; L.ft.quaternion.setFromAxisAngle(YU, yaw); L.ft.scale.setScalar(sc);
    });
    // the arm
    { const A = ARM.at.clone().applyMatrix4(B.matrixWorld), T = spec.arm?.to ? V3(spec.arm.to) : V3([4.6, -1.6, 4.4]).applyMatrix4(B.matrixWorld), pole = _p.set(1.0, 0.8, -0.3).applyQuaternion(B.quaternion).clone();
      const { knee, end } = ik(A, T, ARM.a * sc, ARM.b * sc, pole), open = spec.arm?.open ?? 0.4;
      point(ARM.up, A, knee, ZF, sc); point(ARM.fore, knee, end, ZF, sc); ARM.hand.position.copy(end); ARM.hand.quaternion.copy(ARM.fore.quaternion); ARM.hand.scale.setScalar(sc);
      ARM.jaw.forEach((n, j) => { n.position.copy(end); n.quaternion.copy(ARM.fore.quaternion).multiply(_q.setFromAxisAngle(YU, (j ? -1 : 1) * (0.1 + 0.6 * open))); n.scale.setScalar(sc); }); }
    rig.updateMatrixWorld(true);
  }

  function update(spec, frame, sync, camera) {
    root.visible = !!spec; if (!spec) return;
    pose(spec, frame);
    const sc = spec.scale ?? 1, asm = spec.assemble ?? 1, br = spec.broken ?? {}, deck = { y: spec.pos[1], half: Infinity, x: spec.pos[0], ...spec.deck }, sca = spec.scatter ?? [16, 0.5, 16], yaw = (spec.yaw ?? 0) * D, cy = Math.cos(yaw), sy = Math.sin(yaw);
    reels.value = frame / 24 * 3; hotG.value = 0.8 + 0.35 * hash(frame >> 1, 5); eyeG.value = clamp(spec.eye ?? 1, 0.12, 2) * (hash(frame >> 1, 9) > 0.1 ? 1 : 0.7);
    let headOn = asm >= 1;
    for (const g of pieces) {
      const u = g.userData, i = u.i; u.node.matrixWorld.decompose(g.position, g.quaternion, g.scale);
      const since = br[u.group] ?? br.all ?? null;
      if (asm < 1) {
        const r = rng(i * 131 + 7), w = ease(clamp((asm - u.order * 0.72) / 0.28)), src = spec.sources ? spec.sources[i % spec.sources.length] : null, a = r() * 6.283, d = 0.45 + 0.55 * r();
        const from = src ? _p.set(src[0] + (r() - 0.5) * 1.6, src[1] + 0.3, src[2] + (r() - 0.5) * 1.6) : _p.set(spec.pos[0] + Math.cos(a) * d * sca[0], spec.pos[1] + 0.3 + r() * sca[1], spec.pos[2] + Math.sin(a) * d * sca[2]);
        const k = w * w * (3 - 2 * w), k2 = k * k, over = w > 0.86 && w < 1 ? Math.sin((w - 0.86) / 0.14 * Math.PI) * 0.25 : 0;      // slow off the floor, hard home, a knock as it seats
        _q.setFromEuler(new THREE.Euler(r() * 6.28 + (1 - k) * 5 * (r() - 0.5) * w * 4, r() * 6.28, r() * 6.28 + (1 - k) * 3 * w));
        const lift = Math.sin(Math.PI * Math.min(1, w * 1.15)) * (2 + 4 * r()) * (1 - k2);
        g.position.set(from.x + (g.position.x - from.x) * k2, from.y + (g.position.y - from.y) * k2 + lift + over, from.z + (g.position.z - from.z) * k2); g.quaternion.slerp(_q, 1 - k2);
        if (u.group === "head" && w < 1) headOn = false;
      } else if (since !== null && since >= 0) {
        const r = rng(i * 77 + 3), kx = u.kick[0] * (0.7 + 0.6 * r()) + (r() - 0.5) * 2, ky = u.kick[1] * (0.6 + r()) + 1.5, kz = u.kick[2] * (0.7 + 0.6 * r()) + (r() - 0.5) * 2, c = spec.carry ?? [0, 0, 0];
        const vx = kx * cy + kz * sy + c[0], vz = -kx * sy + kz * cy + c[2], vy = ky + c[1], y0 = g.position.y, fl = deck.y + 0.35 * sc;
        let tt = since; const disc = vy * vy + 19.6 * (y0 - fl), tHit = disc > 0 ? (vy + Math.sqrt(disc)) / 9.8 : 1e9, xHit = g.position.x + vx * tHit;
        const lands = y0 > fl && Math.abs(xHit - deck.x) < deck.half; if (lands) tt = Math.min(since, tHit);
        const slide = lands ? (1 - Math.exp(-Math.max(0, since - tHit) * 4)) * 0.12 : 0;
        g.position.set(g.position.x + vx * (tt + slide), y0 + vy * tt - 4.9 * tt * tt, g.position.z + vz * (tt + slide));
        _q.setFromEuler(new THREE.Euler((r() - 0.5) * 7 * tt, (r() - 0.5) * 7 * tt, (r() - 0.5) * 7 * tt)); g.quaternion.multiply(_q);
        if (u.group === "head") headOn = false;
      }
    }
    const eyeOn = (spec.eye ?? 1) > 0.02 && headOn;
    HD.updateMatrixWorld(true);
    for (const h of halos) {
      h.visible = eyeOn; if (!eyeOn) continue;
      const wp = _p.set(...h.userData.at).applyMatrix4(HD.matrixWorld), to = _a.copy(camera.position).sub(wp).normalize();
      h.position.copy(wp).addScaledVector(to, 0.3 * sc); h.quaternion.copy(camera.quaternion);
      const hs = 0.42 * h.userData.k * sc * (0.55 + 0.4 * (spec.eye ?? 1)) * (hash(frame >> 1, h.userData.k, 9) > 0.12 ? 1 : 0.6); h.scale.set(hs * 1.6, hs, 1);
    }
  }
  const eyeAt = (spec) => { pose(spec, 0); return HD.getWorldPosition(new THREE.Vector3()).toArray(); };
  return { update, eyeAt, root, GROUPS };
}
