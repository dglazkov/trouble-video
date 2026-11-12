// What every set and machine is made of: one cel shader with a few kinds of surface, a geometry builder that merges
// everything of one material into one mesh, canvas textures, and the camera. A set gives the shader its own lighting
// (a GLSL chunk: where the light pools fall, as hard shapes) so that tone is drawn, not computed from lamps.
//
// The camera is engine/body.js's: { pos, target, fov (vertical, degrees), up }, ground y = 0, metres, +Y up.
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

export const INK = 0, FX = 1;      // layers: INK is drawn into the normal/depth buffer the ink lines come from; FX is not
export const rng = (seed) => { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
export const hash = (...n) => { let h = 2166136261; for (const x of n) { h ^= Math.round(x * 1000) | 0; h = Math.imul(h, 16777619); h ^= h >>> 13; } return ((Math.imul(h, 2246822519) ^ (h >>> 15)) >>> 0) / 4294967296; };
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

const VERT = `
varying vec3 vW; varying vec3 vN; varying vec2 vUv; varying vec3 vL;
void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; vL = position; vN = normalize(mat3(modelMatrix)*normal); vUv = uv; gl_Position = projectionMatrix*viewMatrix*w; }`;
// Kinds of surface:
//  0 lit by the set, flat base colour      4 the same, cut out by the map's alpha (stencils)   10 the same, coloured by the map
//                                                                                              (flag 1: and cut out by its alpha)
//  1 emissive flat colour x gain           2 emissive map x gain (screens)                     6 emissive, cut out by the map's alpha
//  3 the set's special (a window on space, a backdrop)
//  5 machine: three tones from the key light, a hard rim
//  7 flat translucent (beams, steam): colour x gain, alpha = uAlpha x map alpha
//  8 a level meter: columns of cells lit up to gain    9 tape reels turning
const FRAG = (chunk) => `
uniform int uKind, uSeamMode, uFlag; uniform vec3 uBase; uniform vec2 uSeam; uniform sampler2D uMap; uniform float uGain, uFogMul, uAlpha, uPaint;
uniform vec3 uCam, uFogCol, uFogTop, uKey, uTintLit, uTintMid, uTintShade, uRim; uniform float uFogK, uFrame; uniform vec2 uFogH;
varying vec3 vW; varying vec3 vN; varying vec2 vUv; varying vec3 vL;
float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*0.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f); return mix(mix(hash(i), hash(i+vec2(1.0,0.0)), f.x), mix(hash(i+vec2(0.0,1.0)), hash(i+vec2(1.0,1.0)), f.x), f.y); }
vec2 surf(vec3 W, vec3 N){ vec3 a = abs(N); return a.y > 0.7 ? W.xz : (a.x > a.z ? W.zy : W.xy); }
${chunk}
void main(){
  vec3 col = uBase; float alpha = 1.0;
  vec3 N = normalize(vN); if(!gl_FrontFacing) N = -N;
  vec3 V = normalize(uCam-vW);
  float fog = (1.0-exp(-length(vW-uCam)*uFogK))*uFogMul;
  if(uKind==0 || uKind==4 || uKind==10){
    if(uKind==4){ alpha = texture2D(uMap, vUv).a; if(alpha<0.03) discard; }
    if(uKind==10){ vec4 t = texture2D(uMap, vUv); if(uFlag==1 && t.a < 0.5) discard; col = t.rgb; }
    float tone = setTone(vW, N);
    vec2 sv = surf(vW, N);
    if(uPaint > 0.0){
      // the painter's hand: big hard-edged washes a step lighter or darker, never a gradient
      float b = vnoise(sv*0.55+7.3) + 0.35*vnoise(sv*1.9);
      col *= b > 0.86 ? 1.0-0.09*uPaint : (b < 0.42 ? 1.0+0.07*uPaint : 1.0);
    }
    if(uSeamMode > 0){
      vec2 s = (uSeamMode==1 ? vUv : sv)/uSeam; vec2 fw = fwidth(s);
      vec2 dI = 0.5-abs(fract(s)-0.5);
      vec2 ln = (1.0-smoothstep(fw*0.7, fw*1.9, dI))*(1.0-smoothstep(0.12,0.4,fw));
      float h = hash(floor(s));
      col *= h > 0.8 ? 0.82 : (h < 0.12 ? 1.13 : 1.0);
      col *= 1.0-0.62*max(ln.x, ln.y);
    }
    col *= tone > 1.5 ? uTintLit : (tone > 0.5 ? uTintMid : uTintShade);
    col = setExtra(col, vW, N, tone);
  } else if(uKind==5){
    float d = dot(N, uKey);
    float tone = d > 0.3 ? 2.0 : (d > -0.2 ? 1.0 : 0.0);
    col *= tone > 1.5 ? vec3(1.12) : (tone > 0.5 ? uTintMid*1.08 : uTintShade*0.92);
    float fr = 1.0-max(dot(N, V), 0.0);
    if(fr > 0.72 && d < 0.3 && dot(N, -uKey) > -0.3) col = mix(col, uRim, 0.55);
    col = setExtra(col, vW, N, tone);
  } else if(uKind==1){
    col = uBase*uGain*setEmit(vW, uFlag);
  } else if(uKind==2){
    vec3 t = texture2D(uMap, vUv).rgb;
    float roll = step(0.93, fract(vUv.y*0.6 - uFrame*0.021 + hash(floor(vW.xz*0.25))));
    col = t*uGain*(1.0+0.35*roll);
  } else if(uKind==6){
    alpha = texture2D(uMap, vUv).a; if(alpha<0.25) discard; alpha = 1.0;
    col = uBase*uGain;
  } else if(uKind==3){
    col = setSpecial(vW, -V, vUv); fog *= 0.2;
  } else if(uKind==7){
    alpha = uAlpha*(1.0-clamp(fog, 0.0, 1.0)); if(uFlag==1) alpha *= texture2D(uMap, vUv).a;
    col = uBase*uGain; fog = 0.0;
  } else if(uKind==8){
    vec2 g = vUv*uSeam; vec2 c = floor(g), f = fract(g);
    float lvl = uGain*(0.45+0.75*hash(vec2(c.x, floor(uFrame*0.5)+floor(vW.z*0.25+vW.x*0.25))));
    float on = step(c.y/uSeam.y, lvl)*step(0.14, f.x)*step(f.x, 0.86)*step(0.2, f.y)*step(f.y, 0.8);
    vec3 lit = c.y/uSeam.y > 0.72 ? vec3(1.0,0.25,0.2) : uBase;
    col = mix(vec3(0.02,0.03,0.08), lit, on);
  } else if(uKind==9){
    vec2 p = vUv*vec2(2.0,1.0); float side = floor(p.x); vec2 q = vec2(fract(p.x)-0.5, p.y-0.5)*2.0;
    float r = length(q), a = atan(q.y, q.x) + uGain*(side>0.5?1.0:1.0);
    col = vec3(0.03,0.04,0.1);
    if(r < 0.84) col = uBase*0.55;
    if(r < 0.84 && r > 0.3 && abs(fract(a*0.4775)-0.5) < 0.18) col = vec3(0.03,0.04,0.1);
    if(r < 0.3) col = uBase;
    if(r < 0.1) col = vec3(0.03,0.04,0.1);
  }
  col = mix(col, mix(uFogCol, uFogTop, clamp(smoothstep(uFogH.x, uFogH.y, vW.y)+step(vW.y, -0.5), 0.0, 1.0)), clamp(fog, 0.0, 1.0));
  gl_FragColor = vec4(col, alpha);
}`;

// Normal and view depth, for the ink lines the photography pass draws at their discontinuities.
export const ndMaterial = new THREE.ShaderMaterial({
  side: THREE.DoubleSide,
  vertexShader: `varying vec3 vN; varying float vD; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); vD = -mv.z; vN = normalize(normalMatrix*normal); gl_Position = projectionMatrix*mv; }`,
  fragmentShader: `varying vec3 vN; varying float vD; void main(){ vec3 n = normalize(vN); if(!gl_FrontFacing) n = -n; gl_FragColor = vec4(n*0.5+0.5, vD); }`,
});

// A set's materials. chunk must define: float setTone(vec3 W, vec3 N) -> 0 shade, 1 mid, 2 lit;
// vec3 setExtra(vec3 col, vec3 W, vec3 N, float tone); float setEmit(vec3 W, int flag); vec3 setSpecial(vec3 W, vec3 dir, vec2 uv).
// uniforms: the set's own, shared by every material (its systems' levels live here).
export function createKit(chunk, uniforms = {}) {
  const shared = {
    uCam: { value: new THREE.Vector3() }, uFogCol: { value: new THREE.Color(0.07, 0.27, 0.42) }, uFogK: { value: 0.03 }, uFrame: { value: 0 }, uFogTop: { value: new THREE.Color(0.07, 0.27, 0.42) }, uFogH: { value: new THREE.Vector2(1e5, 2e5) },
    uKey: { value: new THREE.Vector3(0.3, 0.9, 0.3).normalize() }, uTintLit: { value: new THREE.Color(1.18, 1.22, 1.25) },
    uTintMid: { value: new THREE.Color(0.66, 0.68, 0.92) }, uTintShade: { value: new THREE.Color(0.36, 0.33, 0.66) }, uRim: { value: new THREE.Color(0.4, 0.9, 1.0) },
    ...uniforms,
  };
  const frag = FRAG(chunk), mats = new Map(), ONE = { value: 1 };
  let ids = 0; const idOf = new WeakMap(), id = (o) => { if (!o) return 0; if (!idOf.has(o)) idOf.set(o, ++ids); return idOf.get(o); };
  // o: { kind, seam: [u, v] metres, seamMode: 1 uv | 2 world, map, gain: a { value } shared with whoever drives it,
  //      fog: multiplier, alpha, additive, flag, paint: 0..1, offset: polygon offset for decals,
  //      noInk: keep it out of the ink buffer (free-standing cut-outs), side }
  function mat(color, o = {}) {
    const kind = o.kind ?? 0, key = [color, kind, o.seam, o.seamMode, id(o.map), id(o.gain), o.fog, o.alpha, o.additive, o.flag, o.paint, o.offset, o.side, o.noInk].join("|");
    if (mats.has(key)) return mats.get(key);
    const m = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: frag, side: o.side ?? THREE.DoubleSide,
      uniforms: { ...shared, uKind: { value: kind }, uBase: { value: new THREE.Color(color) }, uSeam: { value: new THREE.Vector2(...(o.seam ?? [1, 1])) },
        uSeamMode: { value: o.seam && kind !== 8 ? (o.seamMode ?? 1) : 0 }, uMap: { value: o.map ?? null }, uGain: o.gain ?? ONE, uFogMul: { value: o.fog ?? (kind === 1 || kind === 2 || kind === 6 ? 0.75 : 1) },
        uAlpha: { value: o.alpha ?? 1 }, uFlag: { value: o.flag ?? 0 }, uPaint: { value: o.paint ?? (kind === 0 ? 1 : 0) } } });
    if (kind === 4 || o.offset) { m.polygonOffset = true; m.polygonOffsetFactor = -2 * (o.offset ?? 1); m.polygonOffsetUnits = -2 * (o.offset ?? 1); }
    if (kind === 7) { m.transparent = true; m.depthWrite = false; if (o.additive) m.blending = THREE.AdditiveBlending; }
    m.userData.fx = kind === 7 || !!o.noInk;
    mats.set(key, m); return m;
  }
  return { shared, mat, builder: () => new Builder() };
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler();
const xform = (x, y, z, r) => (r = r ?? {}, new THREE.Matrix4()).compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(r.rx ?? 0, r.ry ?? 0, r.rz ?? 0, r.order ?? "XYZ")), new THREE.Vector3(...(r.s ?? [1, 1, 1])));
export function quadGeometry(center, u, v, w, h, uvMetric) {
  const g = new THREE.BufferGeometry(), C = new THREE.Vector3(...center), U = new THREE.Vector3(...u).normalize().multiplyScalar(w / 2), V = new THREE.Vector3(...v).normalize().multiplyScalar(h / 2);
  const P = [[-1, -1], [1, -1], [1, 1], [-1, -1], [1, 1], [-1, 1]].map(([a, b]) => C.clone().addScaledVector(U, a).addScaledVector(V, b));
  const n = new THREE.Vector3(...u).cross(new THREE.Vector3(...v)).normalize(), k = uvMetric ? [w, h] : [1, 1];
  g.setAttribute("position", new THREE.Float32BufferAttribute(P.flatMap((p) => [p.x, p.y, p.z]), 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(P.flatMap(() => [n.x, n.y, n.z]), 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute([[0, 0], [1, 0], [1, 1], [0, 0], [1, 1], [0, 1]].flatMap(([a, b]) => [a * k[0], b * k[1]]), 2));
  return g;
}
// Collects geometry by material and merges it: a whole corridor module is a handful of draw calls.
export class Builder {
  constructor() { this.bins = new Map(); }
  // r in box/cyl/ball: { rx, ry, rz, order, s: [sx, sy, sz] }
  add(geom, material, matrix) {
    let g = geom.index ? geom.toNonIndexed() : geom;
    for (const k of Object.keys(g.attributes)) if (!["position", "normal", "uv"].includes(k)) g.deleteAttribute(k);
    if (matrix) g.applyMatrix4(matrix);
    if (!this.bins.has(material)) this.bins.set(material, []);
    this.bins.get(material).push(g); return this;
  }
  box(w, h, d, x, y, z, material, r) { return this.add(new THREE.BoxGeometry(w, h, d), material, xform(x, y, z, r)); }
  // a cylinder along `axis` ("x" | "y" | "z"); r2 for a cone
  cyl(r, len, x, y, z, material, axis = "y", seg = 10, r2 = r, rot) {
    const g = new THREE.CylinderGeometry(r2, r, len, seg);
    if (axis === "z") g.rotateX(Math.PI / 2); else if (axis === "x") g.rotateZ(-Math.PI / 2);
    return this.add(g, material, xform(x, y, z, rot));
  }
  ball(r, x, y, z, material, rot, seg = 12) { return this.add(new THREE.SphereGeometry(r, seg, Math.max(6, seg * 0.66 | 0)), material, xform(x, y, z, rot)); }
  quad(center, u, v, w, h, material, uvMetric) { return this.add(quadGeometry(center, u, v, w, h, uvMetric), material); }
  // an extruded outline in the XY plane (points [x, y]), depth along +Z from z
  slab(points, depth, x, y, z, material, r) {
    const s = new THREE.Shape(points.map((p) => new THREE.Vector2(p[0], p[1])));
    return this.add(new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false }), material, xform(x, y, z, r));
  }
  build() {
    const grp = new THREE.Group();
    for (const [material, list] of this.bins) {
      const mesh = new THREE.Mesh(list.length > 1 ? mergeGeometries(list) : list[0], material);
      mesh.frustumCulled = false; if (material.userData.fx) { mesh.layers.set(FX); if (material.transparent) mesh.renderOrder = 10; }
      grp.add(mesh);
    }
    return grp;
  }
}
// Clones of built groups, handed out per frame: a set that goes on for ever is a few modules re-placed round the camera.
export class Pool {
  constructor(parent) { this.parent = parent; this.items = new Map(); }
  begin() { for (const p of this.items.values()) { p.n = 0; } }
  use(proto) {
    let p = this.items.get(proto); if (!p) this.items.set(proto, p = { n: 0, list: [] });
    if (p.n === p.list.length) { const c = proto.clone(); this.parent.add(c); p.list.push(c); }
    const o = p.list[p.n++]; o.visible = true; o.position.set(0, 0, 0); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1); return o;
  }
  end() { for (const p of this.items.values()) for (let i = p.n; i < p.list.length; i++) p.list[i].visible = false; }
}

export function canvasTex(w, h, draw, o = {}) {
  const c = document.createElement("canvas"); c.width = w; c.height = h; draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c); t.anisotropy = 8; if (o.repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
}
// The engine's camera on a three.js one. cam = { pos, target, fov = 30, up = [0, 1, 0] }, exactly engine/body.js camera().
export function aim(three, cam, aspect = 16 / 9) {
  three.fov = cam.fov ?? 30; three.aspect = aspect; three.near = cam.near ?? 0.08; three.far = cam.far ?? 500; three.updateProjectionMatrix();
  three.position.set(...cam.pos); three.up.set(...(cam.up ?? [0, 1, 0])); three.lookAt(...cam.target); three.updateMatrixWorld(true);
  return three;
}
