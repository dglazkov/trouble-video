// THE WARDEN: the one enormous machine the station pulls together out of every drone the four broke. A spider of
// wreckage that straddles whatever it walks on: six mismatched legs (bundles of chaser bodies, enforcer arms, scrap
// girder) whose knees stand far out and high above it, clawed feet that clamp a deck's edges; a scorched enforcer for a
// trunk with tape reels still turning on its back; a neck that is a sliced enforcer still in its slices, the cuts
// still hot; a head that is an enforcer's dead face in a cluster of chaser cowls, MANY RED EYES THAT MOVE TOGETHER;
// on its left a long arm ending in a pincer the size of a door, on its right a fan of chaser blades.
// DRAWN like a 1990s mecha: every part is a shaped solid (machines/parts.js: chamfered plate, tapering limbs, turned
// drums, bellows, rams that work, torn sheet) in the wrecks' own paint (machines/livery.js: panel lines, rivets, bands,
// stencilled codes and katakana, soot and scrapes as flat shapes), cel-shaded in the set's light (sets/kit.js kind 12)
// with the dark twin hull for its outline; its eyes are glass with a drawn glint.
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
//   head: [x, y, z]     where the head is (world), whatever the trunk does: the neck's slices and their lashings stretch to it
//                       (its chin on the deck while its trunk hangs in a hole). Overrides reach.
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
import { FX, canvasTex, quadGeometry, rng, hash, clamp } from "../sets/kit.js";
import { maker, xf, oct, limbG, prismG, cboxG, torn } from "./parts.js";
import { liveries } from "./livery.js";

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

export function createWarden(kit, scene) {
  const { mat } = kit, mk = maker(kit, 0.055), root = new THREE.Group(); scene.add(root); root.visible = false;
  const part = (group, order, kick, fn) => { const g = mk(fn); g.userData = { group, order, kick }; return g; };
  // ---- its paint (machines/livery.js): every solid is drawn, in the set's light ---------------------------------------
  const L = liveries(), plain = canvasTex(8, 8, (c) => { c.fillStyle = "#fff"; c.fillRect(0, 0, 8, 8); }, { repeat: true });
  const SK = (tex, tint = "#ffffff", tile = 4) => mat(tint, { kind: 12, map: tex, seam: [tile, tile] }), flatK = (col) => mat(col, { kind: 12, map: plain, seam: [1, 1] });
  const enf = SK(L.enf), enfS = SK(L.enf, "#b9b5b0"), navy = SK(L.navy), navy2 = SK(L.navy, "#c2c2dc", 3.1), gun = SK(L.gun), black = SK(L.black), rust = SK(L.rust), scorch = SK(L.scorch), scorch2 = SK(L.scorch, "#d8c8c0", 2.7);
  const orange = flatK("#f07a22"), cream = flatK("#d9cfb0"), steel = flatK("#8d90b4"), rubber = flatK("#16162c"), bone = flatK("#d8d2bc");
  const byUV = (tex, ru = 1, rv = 1) => mat("#ffffff", { kind: 12, flag: 1, map: tex, seam: [ru, rv] }), band = byUV(L.band, 6, 1), hazardM = byUV(L.hazard, 6, 1), drum = byUV(L.drum, 2, 1);
  const decalM = (tex) => mat("#ffffff", { kind: 12, flag: 3, map: tex });
  const eyeG = { value: 1 }, hotG = { value: 1 }, reels = { value: 0 }, crtG = [0, 1, 2, 3].map(() => ({ value: 1 }));
  const eye = mat("#ff2a1e", { kind: 1, fog: 0.5, gain: eyeG }), eyeHot = mat("#ff6a4c", { kind: 1, fog: 0.5, gain: eyeG }), eyeLit = mat("#ffe2d0", { kind: 1, fog: 0.5, gain: eyeG }), hot = mat("#ff9a3a", { kind: 1, fog: 0.5, gain: hotG });
  const sliceM = mat("#ffffff", { kind: 2, map: L.slice, gain: hotG, fog: 0.5 }), crtM = crtG.map((g, i) => mat("#ffffff", { kind: 2, map: L.crt[i], gain: g, fog: 0.5, offset: 1 }));
  const HP = Math.PI / 2, TOZ = { rx: HP }, TOX = { rz: -HP };      // a solid built up its Y, laid along Z / along X
  // ---- pieces of drone, as shapes -------------------------------------------------------------------------------------
  const decal = (p, tex, c, u, v, w, h) => p.bare.quad(c, u, v, w, h, decalM(tex));
  const code = (p, text, c, u, v, h, col) => decal(p, L.code(text, col), c, u, v, h * L.codeAspect(text), h), word = (p, str, c, u, v, h, col) => decal(p, L.word(str, col), c, u, v, h * L.wordAspect(str), h);
  const soot = (p, seed, c, u, v, w, h) => decal(p, L.soot(seed), c, u, v, w, h);
  // an eye: the red glass, its hot middle, a glint (looking along +Z from (x, y, z))
  const lens = (p, r, x, y, z) => { p.bare.ball(r, x, y, z, eye, { s: [1, 1, 0.55] }, 16); p.bare.cyl(r * 0.36, r * 0.1, x, y, z + r * 0.52, eyeHot, "z", 14); p.bare.cyl(r * 0.17, r * 0.06, x - r * 0.3, y + r * 0.3, z + r * 0.55, eyeLit, "z", 8); };
  // a drum (a shoulder, a knee) along X at (x, y, z): its side plated and bolted, a trim band, a dark hub either end
  const drumX = (p, r, len, x, y, z, hub = 0.55) => {
    p.turn([[0, -len / 2], [r * 0.82, -len / 2], [r, -len / 2 + r * 0.16], [r, len / 2 - r * 0.16], [r * 0.82, len / 2], [0, len / 2]], x, y, z, drum, TOX, 16);
    p.cyl(r * 1.06, len * 0.16, x + len * 0.24, y, z, band, "x", 16); p.cyl(r * hub, len + 0.26, x, y, z, black, "x", 10); p.cyl(r * hub * 0.5, len + 0.4, x, y, z, steel, "x", 8);
  };
  // a chaser's cowl with its eye, looking along +Z, k times life size (0.6 m): the black shroud, its orange collar, the glass
  const cowl = (p, k, x = 0, y = 0, z = 0) => {
    p.turn([[0, -0.16], [0.17, -0.16], [0.215, -0.08], [0.2, 0.02], [0.155, 0.15], [0.118, 0.15], [0.1, 0.04], [0, 0.04]].map(([r, h]) => [r * k, h * k]), x, y, z, black, TOZ, 14);
    p.cyl(0.222 * k, 0.05 * k, x, y, z - 0.09 * k, band, "z", 14); lens(p, 0.112 * k, x, y, z + 0.075 * k);
  };
  // a chaser's hull behind its cowl, tail along -Z from (x, y, z): the tapering body, its cream spine, two thruster cans
  const hull = (p, k, len, x, y, z, m = navy, r) => {
    const g = new THREE.Group(); const M = xf(x, y, z, r);
    p.add(limbG(0.36 * k, 0.28 * k, 0.15 * k, 0.12 * k, len, 0.24).rotateX(-HP), m, M); p.add(limbG(0.16 * k, 0.1 * k, 0.07 * k, 0.05 * k, len * 0.7, 0.2).rotateX(-HP).translate(0, 0.15 * k, -len * 0.08), cream, M);
    for (const s of [1, -1]) p.add(new THREE.CylinderGeometry(0.05 * k, 0.06 * k, 0.22 * k, 8).rotateX(HP).translate(s * 0.08 * k, 0, -len - 0.04 * k), black, M);
  };
  // a chaser's blade: swept, a notch near the root, the orange tip. In the XZ plane, running out along -X from the root, `len` long, `w` wide
  const bladeXZ = (len, w, bent = 0) => [[0, -w * 0.3], [-len * 0.12, -w * 0.5], [-len * 0.2, -w * 0.28], [-len * 0.3, -w * 0.52], [-len * 0.82, -w * 0.42], [-len, w * (0.1 + bent)], [-len * 0.84, w * 0.5], [-len * 0.3, w * 0.42], [0, w * 0.3]];
  const tipXZ = (len, w, bent = 0) => [[-len * 0.8, -w * 0.43], [-len * 0.84, -w * 0.415], [-len, w * (0.1 + bent)], [-len * 0.84, w * 0.5], [-len * 0.76, w * 0.48]];
  const blade = (p, len, w, x, y, z, r, m = navy, th = 0.07, bent = 0) => { const R = { order: "ZYX", ...r }; p.add(prismG(bladeXZ(len, w, bent), th, th * 0.42).rotateX(HP), m, xf(x, y, z, R)); p.add(prismG(tipXZ(len, w, bent), th * 1.25, th * 0.5).rotateX(HP), orange, xf(x, y, z, R)); };
  // a piston: a sleeve and its bright rod from a to b, a collar at each end
  const piston = (p, a, b, r = 0.13) => { const m = [0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * 0.55); p.rod(a, m, r, gun, 8); p.rod(m, b, r * 0.5, steel, 6); p.ball(r * 1.25, a[0], a[1], a[2], black, null, 8); p.ball(r * 0.9, b[0], b[1], b[2], black, null, 8); };
  // bellows: a rubber boot, pleated, up its Y from (x, y, z)
  const bellows = (p, r, n, pitch, x, y, z, rot) => { const pr = [[0, 0]]; for (let i = 0; i < n; i++) pr.push([r * 0.78, i * pitch], [r, (i + 0.5) * pitch]); pr.push([r * 0.78, n * pitch], [0, n * pitch]); p.turn(pr, x, y, z, rubber, rot, 10); };
  // a guard over a drum that lies along X: a strip of plate bent round it from angle a0 to a1 (radians from +Z toward +Y)
  const guardYZ = (r, a0, a1, th = 0.13, n = 5) => { const o = [], q = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; o.push([Math.cos(a) * (r + th), Math.sin(a) * (r + th)]); q.push([Math.cos(a) * r, Math.sin(a) * r]); } return [...o, ...q.reverse()]; };
  const bolts = (p, pts, r = 0.05, m = black) => { for (const [x, y, z] of pts) p.bare.ball(r, x, y, z, m, null, 6); };
  // a CRT monitor, its screen toward +Z: a cream case, the dark bezel, what it still shows
  const crt = (p, n, w, x, y, z, r) => { const h = w * 0.78, M = xf(x, y, z, r); p.add(cboxG(w, h, w * 0.8, w * 0.07), cream, M); p.add(cboxG(w * 0.86, h * 0.84, 0.08, 0.02).translate(0, 0, w * 0.4), rubber, M);
    const q = quadGeometry([0, 0, w * 0.445], [1, 0, 0], [0, 1, 0], w * 0.74, h * 0.7); q.applyMatrix4(M); p.bare.add(q, crtM[n]); p.add(limbG(w * 0.5, w * 0.4, w * 0.3, w * 0.24, w * 0.3, 0.2).rotateX(-HP).translate(0, 0, -w * 0.4), enfS, M); };

  // the rig: empty nodes whose world matrices say where each piece belongs this frame; the pieces themselves are laid
  // on them (or on the way to them, or thrown from them)
  const rig = new THREE.Group(), B = new THREE.Group(), HD = new THREE.Group(); rig.add(B); B.add(HD);
  const pieces = [], add = (node, g) => { g.userData.node = node; g.userData.i = pieces.length; root.add(g); pieces.push(g); return g; };
  const on = (parent, at = [0, 0, 0], rot = [0, 0, 0]) => { const n = new THREE.Group(); n.position.set(...at); n.rotation.set(...rot); parent.add(n); return n; };

  // ---- the trunk: a scorched enforcer, twice the size; scrap plates bolted over where its face was ----------------------
  add(B, part("trunk", 0, [0, 1, 0], (p) => {
    p.box(2.6, 2.1, 3.0, 0, 0, 0, enf, null, 0.26); p.box(2.74, 0.36, 3.14, 0, -0.66, 0, enfS, null, 0.07); p.box(2.72, 0.13, 3.12, 0, 0.5, 0, enfS, null, 0.04);
    p.prism([[-1.05, 0.02], [1.05, 0.02], [0.62, -0.5], [-0.62, -0.5]], 2.7, 0, -1.05, 0, gun, null, 0.06);      // its keel
    p.turn([[0, -0.46], [0.66, -0.46], [0.74, -0.34], [0.98, -0.2], [0.98, 0.22], [0.72, 0.4], [0, 0.4]], 0, -1.52, 0, drum, null, 16); p.turn([[0, -0.14], [0.6, -0.14], [0.76, -0.02], [0.76, 0.1], [0, 0.1]], 0, -2.0, 0, orange, null, 16); p.bare.cyl(0.5, 0.05, 0, -2.16, 0, hot, "y", 14);
    for (const s of [1, -1]) for (const z of [1.3, 0, -1.4]) { drumX(p, 0.62, 0.9, s * 1.55, 0.25, z); bolts(p, [0, 1, 2, 3, 4, 5].map((i) => [s * 2.04, 0.25 + Math.cos(i * 1.047) * 0.44, z + Math.sin(i * 1.047) * 0.44]), 0.06, steel); }      // enforcers' shoulders: the legs' sockets
    // where its face was: the dead screen's hole, torn plate bolted over it, what hangs out
    p.box(2.1, 1.5, 0.24, 0, 0.0, 1.46, black, null, 0.06); p.prism(torn(1.55, 1.35, 1, "rb", 0.3), 0.14, -0.74, 0.12, 1.66, scorch, { rz: 0.12, ry: -0.07 }, 0.035); p.prism(torn(1.25, 0.95, 2, "lt", 0.26), 0.14, 0.8, -0.32, 1.7, rust, { rz: -0.2, rx: -0.08 }, 0.035);
    bolts(p, [[-1.3, 0.6, 1.76], [-0.3, 0.7, 1.76], [-1.3, -0.35, 1.76], [1.2, 0.0, 1.8], [0.4, -0.6, 1.8], [1.25, -0.6, 1.8]], 0.07, steel);
    p.tube([[0.3, 0.45, 1.6], [0.5, 0.2, 1.95], [0.42, -0.5, 1.9], [0.6, -1.0, 1.7]], 0.07, rubber); p.tube([[0.1, 0.5, 1.6], [0.05, 0.1, 2.0], [-0.1, -0.7, 1.86]], 0.05, orange);
    // its flanks: burnt plate, a vent, the wreck's own number, grab rails, soot
    p.prism(torn(1.2, 1.15, 3, "tr", 0.3), 0.14, 1.38, -0.05, 0.25, scorch2, { ry: HP, rx: 0.1 }, 0.035); p.prism(torn(1.25, 1.0, 4, "bl", 0.24), 0.14, -1.38, -0.2, 0.5, rust, { ry: -HP, rx: -0.15 }, 0.035);
    for (const s of [1, -1]) { for (let i = 0; i < 4; i++) p.slab(0.08, 0.07, 0.7, s * 1.33, 0.86 - i * 0.13, s > 0 ? 0.95 : -0.75, rubber); code(p, "E-02", [s * 1.312, 0.84, s > 0 ? -0.6 : 0.55], [0, 0, -s], [0, 1, 0], 0.26, "#2a2a44");
      p.tube([[s * 1.32, 0.3, -1.1], [s * 1.52, 0.42, -0.95], [s * 1.52, 0.42, -0.45], [s * 1.32, 0.3, -0.3]], 0.04, steel, 5); }
    p.cyl(1.0, 0.2, 0, -0.66, 1.2, hazardM, "y", 4, 1.0, { ry: Math.PI / 4, s: [1.36, 1, 0.5] });
    soot(p, 1, [-1.315, 0.3, -0.7], [0, 0, 1], [0, 1, 0], 1.2, 1.1); soot(p, 2, [0.4, 1.062, 0.6], [1, 0, 0], [0, 0, -1], 1.3, 1.0);
    // the top: a spine of ribs between the reels and the neck
    for (let i = 0; i < 4; i++) p.box(1.5 - i * 0.16, 0.16, 0.2, 0, 1.1, 1.25 - i * 0.34, gun, null, 0.04); p.box(0.5, 0.26, 1.5, 0, 1.12, 0.72, black, null, 0.06);
  }));
  // ---- its back: the reels still turning, a length of blast door for a shell, stacks, aerials, two screens ---------------
  add(B, part("back", 0.08, [0, 3, -2], (p) => {
    p.box(2.3, 0.34, 1.8, 0, 1.2, -0.5, gun, null, 0.08); p.bare.quad([0, 1.38, -0.5], [1, 0, 0], [0, 0, -1], 1.9, 0.95, mat("#e6dcc0", { kind: 9, gain: reels, offset: 1 }));
    p.box(0.3, 0.2, 0.5, 0, 1.44, -0.06, black, null, 0.04); for (const s of [1, -1]) p.cyl(0.07, 0.3, s * 0.3, 1.5, -0.1, steel, "y", 6);      // the tape's head and its two posts
    p.cyl(0.05, 2.6, -0.9, 2.5, -1.1, rubber, "y", 6, 0.03); p.bare.ball(0.1, -0.9, 3.82, -1.1, eye); p.cyl(0.04, 1.7, 0.7, 2.1, -1.2, rubber, "y", 5, 0.02, { rz: -0.2 }); p.turn([[0, 0], [0.3, 0.02], [0.34, 0.1], [0, 0.16]], -0.9, 3.0, -1.1, cream, null, 12);
    // the door: bone plate, torn along two edges, lashed on behind the reels like the shell of a crab
    const dw = 3.0, dh = 2.25, dpts = torn(dw, dh, 9, "tr", 0.34).map(([x, y]) => [x + dw / 2, y + dh / 2]);
    p.add(prismG(dpts, 0.16, 0.04).translate(-dw / 2, -dh / 2, 0), mat("#ffffff", { kind: 12, flag: 1, map: L.door, seam: [1 / dw, 1 / dh] }), xf(0.1, 1.5, -1.95, { ry: Math.PI, rx: 0.42, rz: 0.08, order: "YXZ" }));
    for (const [x, y] of [[-1.1, 0.7], [1.2, 0.75], [-1.0, 2.2], [1.1, 2.3]]) { p.rod([x * 0.8, y + 0.2, -1.3], [x, y + 0.1, -1.95 - (y - 1.5) * 0.42], 0.06, rubber, 5); }
    p.box(0.9, 1.7, 0.7, 0.6, 1.0, -1.4, scorch, { rx: -0.3 }, 0.1);
    // stacks: two exhausts leaning back, sooted at the lip
    for (const [x, h, r] of [[-0.55, 1.5, 0.3], [-1.02, 1.1, 0.22]]) { p.turn([[0, 0], [r * 1.2, 0], [r * 1.2, 0.16], [r, 0.22], [r * 0.86, h], [r * 1.08, h + 0.04], [r * 1.08, h + 0.2], [r * 0.8, h + 0.2], [r * 0.8, h * 0.6], [0, h * 0.6]], x, 1.1, -1.25, gun, { rx: -0.5 }, 10); bellows(p, r * 1.18, 3, 0.1, x, 1.1, -1.25, { rx: -0.5 }); }
    crt(p, 1, 0.8, 1.05, 1.75, -0.75, { ry: 1.2, rz: 0.12 }); crt(p, 2, 0.56, 1.0, 2.5, -0.9, { ry: 1.5, rz: -0.2, rx: 0.1 }); crt(p, 3, 0.62, -1.25, 1.72, -0.2, { ry: -1.45, rz: -0.1 });
    p.tube([[0.5, 1.3, 0.3], [0.9, 1.7, 0.1], [1.0, 1.6, -0.5]], 0.06, rubber); p.tube([[-0.4, 1.3, 0.2], [-0.9, 1.9, 0.0], [-1.2, 1.5, -0.2]], 0.05, orange);
    word(p, "キカイ", [0, 1.215, -1.39], [-1, 0, 0], [0, 1, 0], 0.22, "#d9cfb0");
  }));
  // ---- the neck: an enforcer in six slices, each cut still hot, lashed one to the next -------------------------------------
  const NECK = Array.from({ length: 6 }, (_, i) => { const n = on(B); add(n, part("neck", 0.2 + i * 0.03, [(i % 2 ? 1 : -1) * 2, 2, 2], (p) => {
    const k = 1 - i * 0.07, m = i % 2 ? enf : enfS; p.prism(oct(1.9 * k, 1.5 * k, 0.22 * k), 0.42, 0, 0, 0, m, null, 0.03); p.prism(oct(2.0 * k, 0.26 * k, 0.05), 0.46, 0, -0.45 * k, 0, gun, null, 0.03);
    for (const s of [1, -1]) { p.cyl(0.3 * k, 0.44, s * 1.02 * k, 0.12 * k, 0, gun, "z", 12); p.cyl(0.31 * k, 0.12, s * 1.02 * k, 0.12 * k, 0, band, "z", 12); }      // what is left of its shoulders
    for (const z of [0.216, -0.216]) p.bare.quad([0, 0, z], [z > 0 ? 1 : -1, 0, 0], [0, 1, 0], 1.72 * k, 1.32 * k, sliceM);
    p.box(0.5, 0.2, 0.5, (i % 2 ? 0.4 : -0.4) * k, 0.8 * k, 0, black, null, 0.05); p.cyl(0.16, 0.12, (i % 2 ? 0.4 : -0.4) * k, 0.95 * k, 0, steel, "y", 8);      // the clamp its lashing runs through
    if (i % 2) soot(p, 3 + i, [-0.3 * k, 0.76 * k, 0], [1, 0, 0], [0, 0, -1], 0.9, 0.4);
  })); return n; });
  // the lashings: cable from each slice's clamp to the next one's, a turnbuckle in the middle; they stretch as the neck goes out
  const LASH = [];
  for (let i = 0; i < 5; i++) for (const s of [1, -1]) { const n = on(rig); add(n, part("neck", 0.26 + i * 0.03, [s * 2, 3, 2], (p) => { p.cyl(0.05, 1, 0, 0.5, 0, rubber, "y", 5); p.cyl(0.1, 0.24, 0, 0.5, 0, orange, "y", 6); }));
    const k0 = 1 - i * 0.07, k1 = 1 - (i + 1) * 0.07; LASH.push({ n, a: NECK[i], b: NECK[i + 1], pa: V3([s * 0.78 * k0, (s > 0 ? 0.5 : -0.6) * k0, 0.1]), pb: V3([s * 0.78 * k1, (s > 0 ? 0.5 : -0.6) * k1, -0.1]) }); }
  // ---- the head: an enforcer's dead face under its brow, in a cluster of chaser cowls; a mane of blades ------------------
  add(HD, part("head", 0.86, [0, 2, 3], (p) => {
    p.box(2.0, 1.3, 1.0, 0, 0, -0.2, enf, null, 0.14); p.box(2.08, 0.2, 1.06, 0, -0.42, -0.2, enfS, null, 0.05);
    // the brow: a heavy visor, low over the eye, its underside cut back; a cheek housing either side
    p.add(prismG([[-0.62, 0.46], [-0.62, 0.9], [0.1, 1.04], [0.86, 0.66], [1.02, 0.36], [0.4, 0.5]], 2.5, 0.06).rotateY(-HP), enfS, null); p.box(2.56, 0.12, 0.5, 0, 0.99, -0.3, gun, { rx: -0.19 }, 0.03); p.add(prismG([[0.3, 0.5], [0.98, 0.36], [1.0, 0.3], [0.3, 0.42]], 2.3, 0).rotateY(-HP), orange, null);
    for (const s of [1, -1]) { p.box(0.34, 1.0, 1.15, s * 1.16, -0.05, -0.1, enf, { rz: s * 0.08 }, 0.08); p.cyl(0.2, 0.2, s * 1.34, 0.1, 0.1, black, "x", 10); for (let i = 0; i < 3; i++) p.slab(0.06, 0.06, 0.6, s * 1.35, -0.25 - i * 0.13, -0.1, rubber); }
    p.box(1.78, 1.1, 0.2, 0, -0.04, 0.3, black, null, 0.05); p.bare.quad([0, -0.04, 0.405], [1, 0, 0], [0, 1, 0], 1.6, 0.92, crtM[2]);      // the face: a screen that still crawls
    p.turn([[0, -0.1], [0.58, -0.1], [0.58, 0.02], [0.5, 0.1], [0.42, 0.1], [0.38, 0.0], [0, 0.0]], 0, 0, 0.42, enf, TOZ, 18); p.turn([[0, 0], [0.42, 0], [0.4, 0.07], [0.33, 0.07], [0.3, 0.0]], 0, 0, 0.44, black, TOZ, 18); lens(p, 0.3, 0, 0, 0.46);
    bolts(p, [0, 1, 2, 3, 4, 5, 6, 7].map((i) => [Math.cos(i * 0.785 + 0.39) * 0.5, Math.sin(i * 0.785 + 0.39) * 0.5, 0.53]), 0.04, steel);
    // the jaw: a prow under the face, a grille in it
    p.add(prismG([[-0.3, -0.62], [0.72, -0.62], [1.0, -0.8], [0.62, -1.14], [-0.3, -1.02]], 1.76, 0.06).rotateY(-HP), enfS, null); p.add(prismG([[0.86, -0.69], [1.03, -0.8], [1.0, -0.86], [0.83, -0.76]], 1.84, 0).rotateY(-HP), orange, null);
    for (let i = 0; i < 5; i++) p.slab(0.16, 0.2, 0.08, -0.56 + i * 0.28, -0.96, 0.82, rubber, { rx: -0.72 });
    p.cyl(0.03, 1.5, 0.8, 1.6, -0.5, rubber, "y", 5, 0.015, { rz: -0.15 }); p.bare.ball(0.06, 0.92, 2.36, -0.5, eye);
    for (const [x, y] of [[-0.5, -0.3], [0.2, -0.5], [0.6, -0.1]]) p.tube([[x, y, -0.7], [x * 1.2, y - 0.4, -1.3], [x * 0.9, y - 0.9, -1.9]], 0.07, rubber);
    soot(p, 9, [0.5, 0.655, -0.2], [1, 0, 0], [0, 0, -1], 0.9, 0.7);
  }));
  const EYES = [[1.45, 0.5, 0.1, 2.3, 16], [-1.5, 0.3, 0.0, 2.6, -18], [1.2, -0.75, 0.2, 1.8, 12], [-1.15, -0.85, 0.15, 2.0, -10], [0.5, 1.35, -0.1, 1.9, 4], [-0.65, 1.3, -0.15, 1.6, -6], [2.2, -0.2, -0.4, 1.5, 28], [-2.25, -0.5, -0.5, 1.7, -30], [0.1, -1.5, 0.0, 1.5, 0]];
  const eyeNodes = EYES.map(([x, y, z, k, a], i) => { const n = on(HD, [x, y, z], [-(y > 0 ? 0.12 : -0.2), a * D, 0]); add(n, part("head", 0.9 + i * 0.01, [x * 2, 3 + y, 3], (p) => {
    cowl(p, k); hull(p, k, 0.62 * k, 0, 0, -0.12 * k, i % 2 ? navy : navy2);
    // a brow of its own: a hood over the glass, tipped down toward the middle of the face (they glare together)
    p.box(0.44 * k, 0.05 * k, 0.34 * k, 0, 0.215 * k, 0.07 * k, gun, { rx: 0.3, rz: -Math.sign(x || 1) * 0.3 }, 0.02 * k);
    // what is left of its four blades, in their X
    [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach(([s, v], j) => { if ((i + j) % 4 === 0) return; const len = (0.3 + 0.2 * hash(i, j)) * k; blade(p, len, 0.13 * k, -s * 0.1 * k, v * 0.04 * k, -0.2 * k, { ry: s > 0 ? Math.PI - 0.55 : 0.55, rz: (s > 0 ? -1 : 1) * v * 0.5 }, navy, 0.022 * k, hash(i, j, 2) - 0.3); });
  })); n.userData.k = k; return n; });
  add(HD, part("head", 0.84, [0, 4, -1], (p) => { for (let i = 0; i < 7; i++) { const a = (i - 3) * 0.33, len = 2.4 + (i % 2) * 0.7 + hash(i, 5) * 0.4; blade(p, len, 0.44, Math.sin(a) * 0.5, 0.75 + Math.cos(a) * 0.4, -0.75 - 0.03 * i, { rz: -a - HP, ry: 0, rx: -0.35, order: "XZY" }, i % 2 ? navy : navy2, 0.07, i === 2 ? 0.5 : 0); }
    p.box(1.9, 0.3, 0.3, 0, 0.74, -0.74, black, null, 0.06); }));
  // ---- the legs: an upper (built up its +Y), a lower (down its -Y), a clawed foot; no two alike --------------------------
  const clawOut = [[0, 0.56], [0.36, 0.62], [0.78, 0.36], [0.94, -0.12], [0.8, -0.82], [0.64, -0.3], [0.48, 0.1], [0.2, 0.2], [0, 0.14]], clawTip = [[0.93, -0.2], [0.8, -0.82], [0.655, -0.34], [0.78, -0.26]];
  const toeIn = [[0, 0.52], [0.5, 0.46], [1.0, 0.2], [1.3, 0.03], [0.3, 0.03], [0, 0.1]], toeTip = [[0.98, 0.215], [1.3, 0.03], [0.9, 0.03]];
  const LEGS = HIPS.map((h, i) => {
    const up = on(rig), lo = on(rig), ft = on(rig), s = i % 2 ? -1 : 1, v = i % 3, a = L1[i], b = L2[i], kick = [s * 5, 2, (1 - (i >> 1)) * 3];
    add(up, part("leg" + i, 0.3 + i * 0.03, kick, (p) => {
      if (v === 0) {      // three chasers' hulls, bound: tails to the knee, their blades still on at the hip
        for (const [x, z, k] of [[0.3, 0.2, 2.5], [-0.3, 0.15, 2.3], [0, -0.3, 2.6]]) { p.limb(0.36 * k, 0.3 * k, 0.17 * k, 0.14 * k, a - 0.2, x, 0, z, navy, null, 0.24); blade(p, 1.5, 0.5, x * 2, 0.9, z * 2, { rz: -1.2 * Math.sign(x || 1) - (x ? 0 : 1.6), ry: z < 0 ? HP : 0, order: "YZX" }, navy2, 0.06); }
        p.limb(0.34, 0.2, 0.16, 0.1, a * 0.7, 0, a * 0.12, 0.52, cream, null, 0.2); for (const y of [a * 0.22, a * 0.5, a * 0.78]) { const w = 1.5 - y / a * 0.6; p.box(w, 0.2, w * 0.92, 0, y, 0, black, null, 0.05); p.box(0.22, 0.3, 0.16, w * 0.3, y, w * 0.46, orange, null, 0.03); }
        piston(p, [-0.45, a * 0.55, 0.4], [-0.3, a - 0.5, 0.5], 0.12);
      } else if (v === 1) {      // an enforcer's arm, grown: its bands, its number, a ram down the back of it
        p.limb(1.05, 0.95, 0.84, 0.74, a, 0, 0, 0, enf, null, 0.16); p.box(1.06, 0.5, 0.96, 0, a * 0.3, 0, enfS, null, 0.06); p.box(0.98, 0.3, 0.88, 0, a * 0.72, 0, band, null, 0.05);
        p.limb(0.34, 0.3, 0.3, 0.26, a * 0.8, 0.56, a * 0.1, 0.3, black, null, 0.2); piston(p, [-0.2, a * 0.12, -0.58], [-0.2, a - 0.7, -0.5], 0.15);
        code(p, "E-0" + (4 + i), [0, a * 0.52, 0.44], [0, 1, 0], [-1, 0, 0], 0.4, "#2a2a44"); soot(p, 20 + i, [0.46, a * 0.86, 0], [0, 0, -1], [0, 1, 0], 0.8, 1.0);
        for (const y of [a * 0.06, a * 0.94]) p.box(1.2, 0.16, 1.1, 0, y, 0, gun, null, 0.04);
      } else {      // scrap girder: two flanges, a web, cross-bracing, burnt plate bolted over
        for (const z of [0.42, -0.42]) p.limb(0.6, 0.16, 0.5, 0.14, a, 0, 0, z, gun, null, 0.2); p.limb(0.14, 0.8, 0.12, 0.7, a, 0, 0, 0, black, null, 0.1);
        for (let y = 0.5, k = 0; y < a - 1.2; y += 1.0, k++) { p.rod([0.26, y, k % 2 ? 0.4 : -0.4], [0.26, y + 1.0, k % 2 ? -0.4 : 0.4], 0.05, steel, 5); p.rod([-0.26, y, k % 2 ? -0.4 : 0.4], [-0.26, y + 1.0, k % 2 ? 0.4 : -0.4], 0.05, steel, 5); }
        p.prism(torn(0.9, 1.5, 30 + i, "tb", 0.2), 0.1, 0.34, a * 0.34, 0, scorch, { ry: HP, rz: 0.06 }, 0.03); p.prism(torn(0.8, 1.1, 40 + i, "tr", 0.2), 0.1, -0.34, a * 0.66, 0, rust, { ry: -HP, rz: -0.08 }, 0.03);
        p.tube([[0.34, 0.2, 0.3], [0.48, a * 0.3, 0.42], [0.36, a * 0.6, 0.36], [0.5, a - 0.6, 0.3]], 0.07, rust, 6); piston(p, [0, a * 0.5, -0.56], [0, a - 0.55, -0.62], 0.12);
      }
      drumX(p, 0.74, 1.1, 0, a, 0, 0.56);      // the knee: a shoulder drum, a guard over it
      p.add(prismG(guardYZ(0.84, 0.5, 2.9), 1.0, 0.04).rotateY(-HP), v === 1 ? enf : v === 0 ? navy2 : scorch, xf(0, a, 0)); p.add(prismG(guardYZ(0.98, 1.1, 2.1, 0.1, 3), 0.5, 0.03).rotateY(-HP), orange, xf(0, a, 0));
    }));
    add(lo, part("leg" + i, 0.36 + i * 0.03, kick, (p) => {
      const DOWN = { rx: Math.PI };
      if (v === 1) {      // three thin hulls bound into a shin, a long blade down the front of it
        for (const [x, z] of [[0.24, 0.1], [-0.24, 0.1], [0, -0.26]]) p.limb(0.62, 0.54, 0.26, 0.22, b - 0.3, x, 0, z, navy2, DOWN, 0.24);
        for (const y of [b * 0.2, b * 0.5, b * 0.76]) { const w = 1.2 - y / b * 0.5; p.box(w, 0.18, w * 0.9, 0, -y, 0, black, null, 0.05); }
        blade(p, b * 0.62, 0.6, 0, -b * 0.12, 0.42, { rz: HP, ry: HP, order: "ZYX" }, navy, 0.08, 0.3);
      } else if (v === 2) {      // an enforcer's forearm: bands, a cable, soot
        p.limb(0.84, 0.8, 0.5, 0.46, b, 0, 0, 0, enf, DOWN, 0.16); p.box(0.8, 0.4, 0.76, 0, -b * 0.25, 0, gun, null, 0.05); p.box(0.66, 0.4, 0.62, 0, -b * 0.6, 0, scorch, null, 0.05); p.box(0.92, 0.16, 0.88, 0, -0.5, 0, band, null, 0.04);
        p.tube([[-0.44, -0.3, 0.1], [-0.52, -b * 0.3, 0.2], [-0.36, -b * 0.6, 0.1], [-0.34, -b + 0.5, 0.05]], 0.07, rubber, 6); piston(p, [0.1, -0.6, -0.48], [0.06, -b * 0.5, -0.4], 0.11);
        code(p, "C-07", [0, -b * 0.42, 0.372], [0, -1, 0], [1, 0, 0], 0.3, "#2a2a44");
      } else {      // a black spike, armoured with blades overlapping down its shin
        p.limb(0.84, 0.76, 0.3, 0.28, b, 0, 0, 0, black, DOWN, 0.2); for (let k = 0; k < 3; k++) p.add(prismG([[-0.36, 0.8], [0.36, 0.8], [0.42, -0.5], [0, -0.92], [-0.42, -0.5]], 0.08, 0.03), navy, xf(0, -1.3 - k * 1.75, 0.46 - k * 0.07, { rx: 0.1, s: [1 - k * 0.14, 1, 1] }));
        p.cyl(0.5, 0.26, 0, -b * 0.1, 0, band, "y", 8); piston(p, [0, -0.5, -0.5], [0, -b * 0.45, -0.34], 0.11);
      }
      bellows(p, 0.34, 4, 0.11, 0, -b + 0.1, 0);
    }));
    add(ft, part("leg" + i, 0.42 + i * 0.03, kick, (p) => {
      p.ball(0.4, 0, 0.5, 0, gun, null, 12); p.turn([[0, 0.06], [0.52, 0.06], [0.56, 0.14], [0.5, 0.3], [0, 0.3]], 0, 0, 0, band, null, 10); p.box(0.7, 0.3, 0.7, 0, 0.5, 0, black, { ry: 0.785 }, 0.08);
      // two claws over the deck's edge, hooked under it; a toe flat on the deck
      for (const dz of [1, -1]) { const M = xf(s * 0.2, 0.05, dz * 0.22, { ry: -dz * (HP - s * 0.22) }); p.add(prismG(clawOut, 0.24, 0.05), black, M); p.add(prismG(clawTip, 0.27, 0.05), orange, M); }
      { const M = xf(-s * 0.2, 0, 0, { ry: s > 0 ? Math.PI : 0 }); p.add(prismG(toeIn, 0.4, 0.06), black, M); p.add(prismG(toeTip, 0.43, 0.05), orange, M); }
      piston(p, [-s * 0.1, 0.7, 0], [-s * 0.75, 0.32, 0], 0.07);
    }));
    // the ram that works the hip: its sleeve on the trunk, its rod on the leg
    const ram = { sleeve: on(rig), rod: on(rig), from: V3([h[0] * 0.72, h[1] + 0.95, h[2] * 0.9]), to: V3([0, a * 0.3, 0]) };
    add(ram.sleeve, part("leg" + i, 0.33 + i * 0.03, kick, (p) => { p.cyl(0.17, 1.3, 0, 0.65, 0, gun, "y", 8); p.cyl(0.2, 0.14, 0, 1.24, 0, band, "y", 8); p.ball(0.24, 0, 0, 0, black, null, 8); }));
    add(ram.rod, part("leg" + i, 0.34 + i * 0.03, kick, (p) => { p.cyl(0.08, 1, 0, 0.5, 0, steel, "y", 6); }));
    return { up, lo, ft, hip: V3(h), a, b, s, ram };
  });
  // ---- the arm (its left): two lengths and a pincer the size of a door ---------------------------------------------------
  const ARM = { up: on(rig), fore: on(rig), hand: on(rig), jaw: [on(rig), on(rig)], at: V3([1.9, 1.0, 1.2]), a: 5.2, b: 5.6 };
  add(ARM.up, part("arm", 0.62, [6, 2, 1], (p) => {
    p.limb(0.98, 0.94, 0.78, 0.74, ARM.a, 0, 0, 0, enf, TOZ, 0.16); p.box(0.98, 0.94, 0.6, 0, 0, ARM.a * 0.3, enfS, null, 0.06); p.box(0.9, 0.86, 0.3, 0, 0, ARM.a * 0.7, band, null, 0.05);
    drumX(p, 0.8, 1.2, 0, 0, 0); p.rod([0.55, 0.3, 0.2], [0.5, 0.3, ARM.a - 0.3], 0.09, rubber, 6); piston(p, [0, -0.62, 0.5], [0, -0.5, ARM.a - 0.6], 0.15);
    code(p, "E-07", [-0.47, 0.05, ARM.a * 0.5], [0, 0, 1], [0, 1, 0], 0.4, "#2a2a44"); soot(p, 31, [0, 0.47, ARM.a * 0.46], [0, 0, 1], [-1, 0, 0], 1.3, 0.8);
    p.add(prismG(guardYZ(0.8, 0.4, 2.7), 1.1, 0.04).rotateY(-HP).rotateX(HP), enf, xf(0, 0, ARM.a));
  }));
  add(ARM.fore, part("arm", 0.66, [6, 2, 2], (p) => {
    for (const [x, y, k] of [[0.26, 0.2, 2.3], [-0.26, 0.2, 2.2], [0, -0.26, 2.4]]) p.limb(0.36 * k, 0.3 * k, 0.19 * k, 0.16 * k, ARM.b - 0.2, x, y, 0, navy, TOZ, 0.24);
    for (const z of [ARM.b * 0.24, ARM.b * 0.52, ARM.b * 0.78]) { const w = 1.4 - z / ARM.b * 0.5; p.box(w, w * 0.94, 0.2, 0, 0, z, black, null, 0.05); p.box(0.2, 0.16, 0.3, 0, w * 0.47, z, orange, null, 0.03); }
    drumX(p, 0.66, 1.0, 0, 0, 0); p.cyl(0.5, 0.5, 0, 0, ARM.b, band, "z", 10); blade(p, 2.2, 0.6, 0, 0.5, 0.6, { ry: HP, rz: 0, rx: HP, order: "YXZ" }, navy2, 0.08, 0.4);
  }));
  const jawXZ = (s) => [[0.12, 0], [0.74, 0.16], [1.06, 1.15], [0.98, 2.2], [0.5, 3.1], [0.1, 3.36], [0.26, 2.76], [0.34, 2.5], [0.46, 2.52], [0.5, 2.16], [0.4, 1.9], [0.54, 1.8], [0.56, 1.42], [0.44, 1.2], [0.5, 0.96], [0.3, 0.66], [0.12, 0.6]].map(([x, z]) => [s * x, z]);
  ARM.jaw.forEach((n, j) => add(n, part("arm", 0.7 + j * 0.02, [6, 3, 3], (p) => { const s = j ? -1 : 1, T = (g) => g.rotateX(HP);
    p.add(T(prismG(jawXZ(s), 0.52, 0.09)), black, null); p.add(T(prismG([[0.5, 3.1], [0.1, 3.36], [0.24, 2.84], [0.38, 2.86]].map(([x, z]) => [s * x, z]), 0.58, 0.08)), orange, null);
    p.add(T(prismG([[0.3, 0.3], [0.78, 0.4], [0.94, 1.1], [0.62, 1.0]].map(([x, z]) => [s * x, z]), 0.64, 0.05)), gun, null); p.add(cboxG(0.2, 0.74, 0.5, 0.04), hazardM, xf(s * 0.98, 0, 1.7, { ry: -s * 0.06 }));
    bolts(p, [[s * 0.5, 0.3, 0.5], [s * 0.8, 0.3, 1.2], [s * 0.5, -0.3, 0.5], [s * 0.8, -0.3, 1.2]], 0.07, steel); })));
  add(ARM.hand, part("arm", 0.68, [6, 2, 3], (p) => { p.ball(0.6, 0, 0, 0, gun, null, 12); p.box(1.4, 0.7, 0.7, 0, 0, 0.12, scorch, null, 0.12); p.cyl(0.36, 1.0, 0, 0, 0.2, black, "y", 10); p.cyl(0.4, 0.14, 0, 0.44, 0.2, band, "y", 10); p.cyl(0.4, 0.14, 0, -0.44, 0.2, band, "y", 10); bellows(p, 0.5, 3, 0.12, 0, 0, -0.62, TOZ); }));
  // ---- the fan (its right): chaser blades, spread like a hand of knives --------------------------------------------------
  const FAN = Array.from({ length: 7 }, (_, i) => { const n = on(B, [-1.7, 1.0, 0.2]); add(n, part("fan", 0.74 + i * 0.012, [-6, 3, i - 3], (p) => { const len = 4.2 + (i % 3) * 1.1; blade(p, len, 0.72, 0, 0, 0, { ry: 0.1 }, i % 2 ? navy : navy2, 0.08, i === 5 ? 0.5 : 0); p.cyl(0.07, len * 0.5, -len * 0.3, 0.06, 0.02, cream, "x", 5, 0.03, { ry: 0.1 });
    if (i === 3) { p.turn([[0, -0.5], [0.5, -0.5], [0.62, -0.36], [0.62, 0.36], [0.5, 0.5], [0, 0.5]], 0, 0, 0, drum, TOZ, 12); p.cyl(0.66, 0.16, 0, 0, 0, band, "z", 12); } })); return n; });
  // hanging cables under the trunk
  const CABLES = Array.from({ length: 5 }, (_, i) => { const n = on(B, [(hash(i, 1) - 0.5) * 2, -1.5, (hash(i, 2) - 0.5) * 2.4]); add(n, part("trunk", 0.5 + i * 0.02, [0, -1, 0], (p) => { const len = 1.6 + hash(i, 3) * 2.2, w = 0.16 * (hash(i, 4) - 0.5); p.tube([[0, 0, 0], [w, -len * 0.35, w * 0.6], [-w * 0.6, -len * 0.7, -w], [0, -len, 0]], 0.055, rubber, 5); p.box(0.22, 0.34, 0.22, 0, -len, 0, i % 2 ? orange : gun, null, 0.05); p.cyl(0.03, 0.2, 0, -len - 0.24, 0, steel, "y", 5); })); return n; });
  // the eyes' glints: a drawn star on each glass
  const haloMat = kit.mat("#ff4a34", { kind: 7, flag: 1, map: L.star, additive: true, fog: 0.3 });
  const halos = [[0, 0, 0.6, 3.0], ...EYES.map(([x, y, z, k]) => [x, y, z + 0.3 * k, k])].map(([x, y, z, k]) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), haloMat); m.layers.set(FX); m.renderOrder = 12; m.frustumCulled = false; m.userData = { at: [x, y, z], k }; root.add(m); return m; });

  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _c = new THREE.Vector3(), _q = new THREE.Quaternion(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _m = new THREE.Matrix4(), YU = new THREE.Vector3(0, 1, 0), YD = new THREE.Vector3(0, -1, 0), ZF = new THREE.Vector3(0, 0, 1);
  // two lengths from A to T, the joint thrown toward `pole`
  const ik = (A, T, a, b, pole) => { const d = _a.copy(T).sub(A), len = Math.min(a + b - 0.05, Math.max(Math.abs(a - b) + 0.05, d.length())); d.normalize(); const x = (a * a - b * b + len * len) / (2 * len), h = Math.sqrt(Math.max(0, a * a - x * x)), pp = _b.copy(pole).addScaledVector(d, -pole.dot(d)).normalize(); return { knee: A.clone().addScaledVector(d, x).addScaledVector(pp, h), end: A.clone().addScaledVector(d, len) }; };
  const stretch = (n, from, to, sc, cut = 0) => { const d = _c.copy(to).sub(from), len = Math.max(0.05, d.length() - cut); n.position.copy(from); n.quaternion.setFromUnitVectors(YU, d.normalize()); n.scale.set(sc, len, sc); };
  const point = (n, from, to, axis, sc) => { n.position.copy(from); n.quaternion.setFromUnitVectors(axis, _c.copy(to).sub(from).normalize()); n.scale.setScalar(sc); };
  const headAt = (spec) => { const r = clamp(spec.reach ?? 0); return [0, -0.9 - 1.6 * r, 5.4 + 3.2 * r]; };

  function pose(spec, frame) {
    const sc = spec.scale ?? 1, yaw = (spec.yaw ?? 0) * D, pos = spec.pos, t = frame / 24;
    rig.position.set(0, 0, 0); B.position.set(pos[0], pos[1] + ((spec.height ?? 5.6) + (spec.bob ?? 0)) * sc, pos[2]); B.rotation.set((spec.pitch ?? 0) * D, yaw, (spec.roll ?? 0) * D, "YXZ"); B.scale.setScalar(sc);
    B.updateMatrixWorld(true);
    // the head: out on the neck, turned to what it looks at
    const hp = spec.head ? B.worldToLocal(V3(spec.head)).toArray() : headAt(spec); HD.position.set(...hp); HD.rotation.set(0.25, 0, 0);
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
      L.up.updateMatrixWorld(); const R0 = L.ram.from.clone().applyMatrix4(B.matrixWorld), R1 = L.ram.to.clone().applyMatrix4(L.up.matrixWorld); point(L.ram.sleeve, R0, R1, YU, sc); stretch(L.ram.rod, R1, R0, sc, 0.4 * sc);
    });
    for (const l of LASH) stretch(l.n, _a.copy(l.pa).applyMatrix4(l.a.matrixWorld).clone(), _b.copy(l.pb).applyMatrix4(l.b.matrixWorld).clone(), sc);
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
    reels.value = frame / 24 * 3; crtG.forEach((g, i) => { const k = hash(frame >> 1, i, 21); g.value = k < 0.1 ? 0.25 : 0.75 + 0.5 * k; }); hotG.value = 0.8 + 0.35 * hash(frame >> 1, 5); eyeG.value = clamp(spec.eye ?? 1, 0.12, 2) * (hash(frame >> 1, 9) > 0.1 ? 1 : 0.7);
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
      // (a glint is drawn to the picture's scale, not the machine's: close to, it does not grow into a disc)
      const hs = 1.05 * h.userData.k * sc * (0.55 + 0.4 * (spec.eye ?? 1)) * (hash(frame >> 1, h.userData.k, 9) > 0.12 ? 1 : 0.7) * clamp(camera.position.distanceTo(wp) / 18, 0.3, 1); h.scale.set(hs, hs, 1);
    }
  }
  const eyeAt = (spec) => { pose(spec, 0); return HD.getWorldPosition(new THREE.Vector3()).toArray(); };
  return { update, eyeAt, root, GROUPS };
}
