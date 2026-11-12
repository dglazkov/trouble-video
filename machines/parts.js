// Shaped parts for machines: what a machine is built of when a box, a bar and a cylinder are not enough. Chamfered
// plates, tapering limbs, turned drums and bellows, hoses, torn sheet; each with its dark twin (the drawn outline:
// the same solid a little larger, seen from inside), made for ANY geometry by pushing its welded corners out.
//
//   const part = maker(kit, 0.05);                      // t: how far the outline stands off, metres
//   const g = part((p) => { p.box(...); p.limb(...); p.turn(...); p.bare.quad(...); });   // -> THREE.Group
// p (every solid takes a material and is given its outline; x, y, z: where; r: { rx, ry, rz, order, s } as in sets/kit.js):
//   box(w, h, d, x, y, z, m, r, c)          a box with every edge chamfered by c (default: a tenth of its least side)
//   slab(w, h, d, x, y, z, m, r)            a plain box (thin sheet, where a chamfer would be lost)
//   cyl(r, len, x, y, z, m, axis, seg, r2, rot)   ball(r, x, y, z, m, rot, seg)      as sets/kit.js Builder
//   limb(w0, d0, w1, d1, len, x, y, z, m, r, c)   a tapering limb up its +Y from (x, y, z): w0 x d0 at the foot, w1 x d1
//                                                 at the top, its four long edges chamfered (c: fraction of the width)
//   loft(rings, x, y, z, m, r)              rings: [{ y, pts: [[x, z], ...] }] (same count, anticlockwise from above)
//   turn(profile, x, y, z, m, r, seg)       a turned solid about its Y: profile [[radius, y], ...] from the bottom up
//   prism(pts, depth, x, y, z, m, r, bevel) an outline in XY ([x, y] points) extruded along Z, centred, edges bevelled
//   tube(pts, rad, m, seg)                  a hose through points [[x, y, z], ...]
//   rod(a, b, rad, m, seg, rad2)            a bar from a to b
//   bare                                    a sets/kit.js Builder for what takes no outline (lamps, decals, screens)
import * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { Builder, FX } from "../sets/kit.js";

export const xf = (x = 0, y = 0, z = 0, r) => (r = r ?? {}, new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(r.rx ?? 0, r.ry ?? 0, r.rz ?? 0, r.order ?? "XYZ")), new THREE.Vector3(...(r.s ?? [1, 1, 1]))));
// the dark twin of a solid: its corners welded, each pushed out along the mean of its faces' normals
export function hullOf(g, t) {
  const p = new THREE.BufferGeometry(); p.setAttribute("position", (g.index ? g.toNonIndexed() : g).attributes.position.clone());
  const m = mergeVertices(p, 2e-3); m.computeVertexNormals();
  const P = m.attributes.position, N = m.attributes.normal;
  for (let i = 0; i < P.count; i++) P.setXYZ(i, P.getX(i) + N.getX(i) * t, P.getY(i) + N.getY(i) * t, P.getZ(i) + N.getZ(i) * t);
  const out = m.toNonIndexed(); out.computeVertexNormals(); out.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(out.attributes.position.count * 2), 2)); return out;
}
const flat = (pos) => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals(); g.setAttribute("uv", new THREE.Float32BufferAttribute(new Float32Array(pos.length / 3 * 2), 2)); return g; };
// a rectangle with its corners cut, anticlockwise from above (x, z)
export const oct = (w, d, c) => [[w / 2, -d / 2 + c], [w / 2, d / 2 - c], [w / 2 - c, d / 2], [-w / 2 + c, d / 2], [-w / 2, d / 2 - c], [-w / 2, -d / 2 + c], [-w / 2 + c, -d / 2], [w / 2 - c, -d / 2]];
export function loft(rings) {
  const pos = [], n = rings[0].pts.length, V = (r, i) => [r.pts[i % n][0] + (r.x ?? 0), r.y, r.pts[i % n][1] + (r.z ?? 0)], tri = (a, b, c) => pos.push(...a, ...b, ...c);
  for (let k = 0; k < rings.length - 1; k++) for (let i = 0; i < n; i++) { const A = V(rings[k], i), B = V(rings[k], i + 1), C = V(rings[k + 1], i + 1), D = V(rings[k + 1], i); tri(A, C, B); tri(A, D, C); }
  const cap = (r, top) => { const c = [0, r.y, 0]; for (let i = 0; i < n; i++) { c[0] += V(r, i)[0] / n; c[2] += V(r, i)[2] / n; } for (let i = 0; i < n; i++) top ? tri(c, V(r, i + 1), V(r, i)) : tri(c, V(r, i), V(r, i + 1)); };
  cap(rings[0], false); cap(rings[rings.length - 1], true);
  return flat(pos);
}
export const limbG = (w0, d0, w1, d1, len, c = 0.18) => loft([{ y: 0, pts: oct(w0, d0, Math.min(w0, d0) * c) }, { y: len, pts: oct(w1, d1, Math.min(w1, d1) * c) }]);
export function turned(profile, seg = 14) {
  const pos = [], nor = [], uv = [], L = [0]; for (let k = 1; k < profile.length; k++) L.push(L[k - 1] + Math.hypot(profile[k][0] - profile[k - 1][0], profile[k][1] - profile[k - 1][1]));
  for (let k = 0; k < profile.length - 1; k++) {
    const [r0, y0] = profile[k], [r1, y1] = profile[k + 1], dl = Math.hypot(r1 - r0, y1 - y0) || 1, nr = (y1 - y0) / dl, ny = -(r1 - r0) / dl;
    for (let i = 0; i < seg; i++) {
      const a0 = i / seg * 6.283185307, a1 = (i + 1) / seg * 6.283185307, P = (r, y, a) => [r * Math.cos(a), y, r * Math.sin(a)], Nn = (a) => [nr * Math.cos(a), ny, nr * Math.sin(a)];
      const q = [[r0, y0, a0, k], [r1, y1, a1, k + 1], [r0, y0, a1, k], [r0, y0, a0, k], [r1, y1, a0, k + 1], [r1, y1, a1, k + 1]];
      for (const [r, y, a, kk] of q) { pos.push(...P(r, y, a)); nor.push(...Nn(a)); uv.push(a / 6.283185307, L[kk] / L[L.length - 1]); }
    }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); return g;
}
export function prismG(pts, depth, bevel = 0) {
  const s = new THREE.Shape(pts.map((p) => new THREE.Vector2(p[0], p[1])));
  const g = new THREE.ExtrudeGeometry(s, bevel > 0 ? { depth: Math.max(0.001, depth - 2 * bevel), bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelOffset: -bevel, bevelSegments: 1, steps: 1 } : { depth, bevelEnabled: false, steps: 1 });
  return g.translate(0, 0, bevel > 0 ? -Math.max(0.001, depth - 2 * bevel) / 2 : -depth / 2);
}
export const cboxG = (w, h, d, c) => { const k = Math.min(c, Math.min(w, h, d) * 0.45); return prismG(oct(w, h, k), d, k); };
export function tubeG(pts, rad, seg = 6) { return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), Math.max(4, pts.length * 5), rad, seg, false); }
const rodM = (a, b) => { const A = new THREE.Vector3(...a), C = new THREE.Vector3(...b), d = C.clone().sub(A), len = d.length(); return { len, m: new THREE.Matrix4().compose(A.add(C).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()), new THREE.Vector3(1, 1, 1)) }; };
// a torn sheet's outline: a w x h rectangle (centred) whose listed edges ("t", "b", "l", "r") are ripped
export function torn(w, h, seed, edges = "r", bite = 0.22) {
  let a = seed * 9301 + 49297; const R = () => { a = (a * 233280 + 12345) % 2147483647; return (a % 10000) / 10000; }, pts = [], n = 5;
  const side = (x0, y0, x1, y1, rip, nx, ny) => { pts.push([x0, y0]); if (rip) for (let i = 1; i < n; i++) { const u = (i + (R() - 0.5) * 0.5) / n, k = (i % 2 ? 1 : 0.15) * bite * (0.5 + R()); pts.push([x0 + (x1 - x0) * u - nx * k, y0 + (y1 - y0) * u - ny * k]); } };
  side(-w / 2, -h / 2, w / 2, -h / 2, edges.includes("b"), 0, -1); side(w / 2, -h / 2, w / 2, h / 2, edges.includes("r"), 1, 0); side(w / 2, h / 2, -w / 2, h / 2, edges.includes("t"), 0, 1); side(-w / 2, h / 2, -w / 2, -h / 2, edges.includes("l"), -1, 0);
  return pts;
}

export function maker(kit, t, hullColor = "#0b0a1e") {
  const hullMat = kit.mat(hullColor, { kind: 1, side: THREE.BackSide, fog: 1 });
  return (fn) => {
    const b = new Builder(), h = new Builder();
    const add = (g, m, matrix, tt = t) => { let q = g.index ? g.toNonIndexed() : g; if (matrix) q.applyMatrix4(matrix); b.add(q, m); if (tt > 0) h.add(hullOf(q, tt), hullMat); };
    const p = {
      add, bare: b,
      box(w, hh, d, x, y, z, m, r, c) { add(cboxG(w, hh, d, c ?? Math.min(w, hh, d) * 0.1), m, xf(x, y, z, r)); },
      slab(w, hh, d, x, y, z, m, r) { add(new THREE.BoxGeometry(w, hh, d), m, xf(x, y, z, r)); },
      cyl(r, len, x, y, z, m, axis = "y", seg = 10, r2 = r, rot) { const g = new THREE.CylinderGeometry(r2, r, len, seg); if (axis === "z") g.rotateX(Math.PI / 2); else if (axis === "x") g.rotateZ(-Math.PI / 2); add(g, m, xf(x, y, z, rot)); },
      ball(r, x, y, z, m, rot, seg = 12) { add(new THREE.SphereGeometry(r, seg, Math.max(6, seg * 0.66 | 0)), m, xf(x, y, z, rot)); },
      limb(w0, d0, w1, d1, len, x, y, z, m, r, c) { add(limbG(w0, d0, w1, d1, len, c), m, xf(x, y, z, r)); },
      loft(rings, x, y, z, m, r) { add(loft(rings), m, xf(x, y, z, r)); },
      turn(profile, x, y, z, m, r, seg) { add(turned(profile, seg), m, xf(x, y, z, r)); },
      prism(pts, depth, x, y, z, m, r, bevel = 0) { add(prismG(pts, depth, bevel), m, xf(x, y, z, r)); },
      tube(pts, rad, m, seg) { add(tubeG(pts, rad, seg), m); },
      rod(a, c, rad, m, seg = 6, rad2 = rad) { const { len, m: mm } = rodM(a, c); add(new THREE.CylinderGeometry(rad2, rad, len, seg), m, mm); },
    };
    fn(p);
    const g = new THREE.Group(); g.add(b.build()); if (h.bins.size) { const hull = h.build(); hull.traverse((m) => m.layers.set(FX)); g.add(hull); }
    g.traverse((m) => { m.frustumCulled = false; }); return g;
  };
}
