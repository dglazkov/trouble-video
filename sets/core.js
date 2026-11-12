// The zero-gravity core: the hollow heart of the station, kilometres across, where nothing has weight and nothing
// moves. Violet and white, and nothing else: lilac haze, a white light far off at the middle of a gyroscope the size
// of a town, deep violet for whatever is near and turned away from it. Seen from a hole in its wall: a MAINTENANCE
// DUCT (along +Z to its lip at z = 0, floor y = 0: there is weight in the duct) opens on it; twenty metres out a
// service ISLAND hangs on its mast, its deck (y = 0, weight again) beginning at z = ISLAND; and between the two the
// SECURITY LATTICE, a six-sided cage of truss with an emitter on its longerons for every beam of the grid.
//
// THE FAR SIDE IS PAINTED (sets/painted.js says how; sets/core/far.webp is the painting, with its sidecar): one
// plate, projected from HERO (sets/coreplan.js) onto a sphere far outside the set, so near things slide against it as
// they would against something kilometres off. Everything nearer is geometry, lit and inked like the rest of the film:
// the duct, the wall, the lattice, the island, what floats (wreckage turning slowly, loose cable), the enforcer.
//
//   const set = await createCore(renderer, { width, height });
//   const { scene, camera, clear, post } = set.update(camera, frame, sync, options);
//   set.light([x, y, z]) -> the light a figure there is in;  set.floorAt(x, z) -> 0 in the duct and on the island
//
// The station plays the song here too (WIRING): the strings drive the far light (the painting's core and everything
// it lights), the keyboard the beams' glow, the drums the enforcer's thrusters.
// Cue options (all optional, plain values for this frame):
//   beams     [{ a, b, gain }]          the grid: a beam from a to b (shots/core_cast.js beamsAt)
//   emitters  [{ at, deg, on }]         the grid's emitters (built once, from the first frame that gives them); on: its lens is lit
//   drones    [...]                     machines/drones.js specs
//   slabs     { pos, cuts, at: [[dx, dy, dz, roll], ...], heat }   an enforcer cut in slices across its length at `cuts`
//                                       (metres from its middle), each slice moved by `at`; heat 1..0: how hot the cut faces are
//   console   true                      a service console stands on the island (sets/coreplan.js CONSOLE): its screen is blank, the shot draws on it
//   wiring    { name: wire }            replace wires of WIRING
//   shadows, post                       as in the other sets
import * as THREE from "three";
import { createKit, createShadows, canvasTex, aim, hash, clamp, sstep, rng, FX } from "./kit.js";
import { kana, latin, hazard, chevrons } from "./sign.js";
import { driveAll } from "../engine/sync.js";
import { createDrones } from "../machines/drones.js";
import { projector, loadPainting, painted, PROJECT_VS } from "./painted.js";
import { DUCT, ISLAND, LAT, HERO, SUN, CONSOLE } from "./coreplan.js";
export { DUCT, ISLAND, LAT, HERO } from "./coreplan.js";

export const WIRING = {
  far: { stem: "strings", mode: "env", floor: 0.55, gain: 1.0 },                      // the core's light, and what it lights
  beams: { stem: "keyboard", mode: "pulse", decay: 0.2, floor: 0.9, gain: 0.45 },     // the grid's glow
  thrust: { stem: "drums", mode: "pulse", decay: 0.15, gain: 1 },                     // the enforcer
};
export const HAZE = [0.72, 0.6, 0.93];

const CHUNK = `
uniform float uFar; uniform vec3 uSun;
float setTone(vec3 W, vec3 N){
  float wob = (vnoise(surf(W, N)*0.9)-0.5)*0.25;
  if(W.z < -0.02 && abs(W.x) < ${(DUCT.w / 2 + 0.6).toFixed(2)} && W.y > -0.7 && W.y < ${(DUCT.h + 0.7).toFixed(2)}){
    // in the duct: a pool under each strip lamp, and the core's glow coming in at the mouth
    float dz = abs(fract(W.z/4.0)-0.5)*4.0, mouth = smoothstep(-9.0, -0.6, W.z + wob*3.0);
    if(N.y > 0.7) return dz < 0.85+wob ? 2.0 : (mouth > 0.6 ? 2.0 : ((dz < 1.6 || mouth > 0.25) ? 1.0 : 0.0));
    if(N.y < -0.7) return dz < 0.6 ? 1.0 : 0.0;
    float up = W.y + wob*1.6;
    return mouth > 0.72 && N.z > -0.5 ? 2.0 : (up > 2.0 ? (dz < 1.2 ? 1.0 : 0.0) : ((dz < 1.25 || mouth > 0.3) ? 1.0 : 0.0));
  }
  float d = dot(N, uSun) + wob*0.35;
  return d > 0.42 ? 2.0 : (d > -0.08 ? 1.0 : 0.0);
}
vec3 setExtra(vec3 col, vec3 W, vec3 N, float tone){
  if(W.z < -0.02 && abs(W.x) < 2.4 && W.y > -0.7 && W.y < 4.0) return mix(col, vec3(0.05,0.03,0.12), smoothstep(-14.0, -30.0, W.z));      // the duct goes back into the dark
  return tone > 1.5 ? col*(0.86+0.2*uFar) : col; }
float setEmit(vec3 W, int flag){ if(W.z < -16.0 && W.z > -39.0) return 1.0-smoothstep(-16.0, -26.0, W.z)*0.9; return flag == 1 ? 0.75+0.35*uFar : 1.0; }
vec3 setSpecial(vec3 W, vec3 d, vec2 uv){ return vec3(0.0); }`;

// The far plate on its sphere: the painting where HERO saw it, mirrored on beyond its edges and sinking into the haze
// there; behind HERO, haze. The core's light swells with the strings.
const FAR_FS = `uniform sampler2D tMap; uniform mat4 uProj; uniform vec3 uHaze; uniform vec2 uLight; uniform float uFar; varying vec3 vW;
void main(){
  vec4 p = uProj*vec4(vW, 1.0);
  if(p.w <= 0.0){ gl_FragColor = vec4(uHaze*0.82, 1.0); return; }
  vec2 uv = p.xy/p.w*0.5+0.5; vec2 o = max(vec2(0.0), max(-uv, uv-1.0));
  vec3 col = texture2D(tMap, clamp(uv, 0.002, 0.998)).rgb;
  float r = length((uv-uLight)*vec2(1.78, 1.0));
  col *= 0.8+0.2*uFar; col += vec3(1.0, 0.94, 1.0)*(0.5*uFar-0.25)*exp(-r*r/0.012) + vec3(0.9, 0.8, 1.0)*(0.16*uFar-0.08)*exp(-r*r/0.12);
  float out_ = clamp(max(max(o.x, o.y)*5.0, smoothstep(0.89, 0.965, uv.x)), 0.0, 1.0);
  col = mix(col, uHaze*mix(0.9, 0.66, clamp(0.5-uv.y, 0.0, 1.0)), out_);
  gl_FragColor = vec4(col, 1.0); }`;

// a kit material that is cut off by clipping planes (a machine in slices): the same shader and the same uniforms
function clipped(m, planes, cache) {
  if (cache.has(m)) return cache.get(m);
  const c = new THREE.ShaderMaterial({ uniforms: { ...m.uniforms }, side: m.side, clipping: true, clippingPlanes: planes,
    vertexShader: m.vertexShader.replace("varying vec3 vW;", "varying vec3 vW;\n#include <clipping_planes_pars_vertex>\n").replace("gl_Position = projectionMatrix*viewMatrix*w;", "vec4 mvPosition = viewMatrix*w; gl_Position = projectionMatrix*mvPosition;\n#include <clipping_planes_vertex>\n"),
    fragmentShader: m.fragmentShader.replace("void main(){", "#include <clipping_planes_pars_fragment>\nvoid main(){\n#include <clipping_planes_fragment>\n") });
  c.transparent = m.transparent; c.depthWrite = m.depthWrite; c.blending = m.blending; c.polygonOffset = m.polygonOffset; c.polygonOffsetFactor = m.polygonOffsetFactor; c.polygonOffsetUnits = m.polygonOffsetUnits; c.userData = m.userData;
  cache.set(m, c); return c;
}

export async function createCore(renderer, o = {}) {
  const W = o.width ?? 1920, H = o.height ?? 1080;
  const U = { uFar: { value: 1 }, uSun: { value: new THREE.Vector3(...SUN).normalize() } };
  const kit = createKit(CHUNK, U), { mat } = kit, S = kit.shared;
  S.uFogCol.value.setRGB(...HAZE); S.uFogTop.value.setRGB(...HAZE); S.uFogDeep.value.setRGB(...HAZE); S.uFogK.value = 0.0085;
  S.uKey.value.set(...SUN).normalize(); S.uTintLit.value.setRGB(1.2, 1.12, 1.22); S.uTintMid.value.setRGB(0.7, 0.6, 0.96); S.uTintShade.value.setRGB(0.34, 0.26, 0.6); S.uRim.value.setRGB(1.0, 0.92, 1.0);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(40, W / H, 0.08, 2000);
  renderer.localClippingEnabled = true;
  const hw = DUCT.w / 2, dh = DUCT.h;
  const wall = "#8a7cba", wallD = "#62558f", rib = "#4a3f78", dark = "#2a2247", pale = "#e6def5", gold = "#e8d29a", steel = "#6d6398", duct = "#5a4f86", ductD = "#3b3262";
  const uvq = (b, c, u, v, w, h, m, ru, rv) => { b.quad(c, u, v, w, h, m); const list = b.bins.get(m), uv = list[list.length - 1].attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * ru, uv.getY(i) * rv); };
  const grate = canvasTex(256, 256, (c) => { c.fillStyle = "#463c70"; c.fillRect(0, 0, 256, 256); c.fillStyle = "#2c2450"; for (let y = 6; y < 256; y += 16) c.fillRect(10, y, 236, 7); c.fillStyle = "#5c5190"; c.fillRect(0, 0, 256, 5); c.fillRect(0, 0, 5, 256); c.fillRect(124, 0, 8, 256); }, { repeat: true });
  const stripes = canvasTex(256, 64, (c) => hazard(c, 0, 0, 256, 64, "#e8d29a", "#2a2247", 64), { repeat: true });
  const grateMat = mat("#fff", { kind: 10, map: grate }), stripeMat = mat("#fff", { kind: 10, map: stripes });
  // stencils: what the wall says by the duct's mouth, what the duct says at its lip, what the island says on its deck
  const stencil = (w, h, draw) => mat("#efe9fb", { kind: 4, map: canvasTex(w, h, (c) => { c.clearRect(0, 0, w, h); draw(c); }) });
  const sWall = stencil(1024, 512, (c) => { kana(c, "コア", 40, 40, 250, 40, "#fff"); latin(c, "C-03", 44, 470, 150, "#fff"); c.fillStyle = "#fff"; c.fillRect(620, 60, 30, 400); kana(c, "ダクト", 690, 70, 96, 15, "#fff"); latin(c, "D-7", 694, 300, 110, "#fff"); latin(c, "NO WEIGHT BEYOND", 694, 380, 31, "#fff"); latin(c, "THIS POINT", 694, 424, 31, "#fff"); });
  const sLip = stencil(1024, 256, (c) => { kana(c, "ゼロ", 30, 30, 190, 30, "#fff"); latin(c, "0G", 480, 216, 230, "#fff"); chevrons(c, 800, 30, 200, 196, 2, 26, "#fff", 1); });
  const sDeck = stencil(1024, 512, (c) => { c.strokeStyle = "#fff"; c.lineWidth = 22; c.strokeRect(30, 30, 964, 452); latin(c, "1G", 70, 400, 380, "#fff"); kana(c, "デグチ", 560, 90, 120, 19, "#fff"); chevrons(c, 560, 280, 400, 150, 3, 24, "#fff", 1); });
  const sDoor = canvasTex(512, 128, (c) => { c.fillStyle = "#1c1436"; c.fillRect(0, 0, 512, 128); kana(c, "デグチ", 24, 22, 84, 13, "#f3ecff"); latin(c, "EXIT", 330, 96, 64, "#f3ecff"); });

  const b = kit.builder();
  // ---- the duct -----------------------------------------------------------------------------------------------------
  {
    const L = DUCT.len, zc = -L / 2, m = mat(duct, { seam: [2, 1.6], seamMode: 2 }), md = mat(ductD, { seam: [2, 2], seamMode: 2 });
    uvq(b, [0, 0, zc], [1, 0, 0], [0, 0, -1], DUCT.w, L, grateMat, 2, L / 1.6);
    b.quad([0, dh, zc], [1, 0, 0], [0, 0, 1], DUCT.w, L, md);
    for (const s of [1, -1]) {
      b.quad([s * hw, dh / 2, zc], [0, 0, -s], [0, 1, 0], L, dh, m);
      b.box(0.5, 0.5, L, s * (hw - 0.12), dh - 0.12, zc, md, { rz: Math.PI / 4 }); b.box(0.36, 0.36, L, s * (hw - 0.06), 0.06, zc, md, { rz: Math.PI / 4 });      // the corners are chamfered
      b.cyl(0.085, L, s * (hw - 0.12), 2.25, zc, mat(steel), "z", 8); b.cyl(0.05, L, s * (hw - 0.1), 2.02, zc, mat(dark), "z", 6); b.cyl(0.05, L, s * (hw - 0.1), 1.9, zc, mat(steel), "z", 6);
      b.box(0.1, 0.05, L, s * (hw - 0.05), 1.05, zc, mat(steel));                                                                                             // a hand rail's worth of trim
    }
    for (let z = -1; z > -L; z -= 2) {
      const i = Math.round(-z / 2);
      for (const s of [1, -1]) b.box(0.14, dh, 0.2, s * (hw - 0.07), dh / 2, z, mat(rib));
      b.box(DUCT.w, 0.16, 0.2, 0, dh - 0.08, z, mat(rib));
      if (i % 2 === 1) { b.box(1.2, 0.07, 0.3, 0, dh - 0.17, z - 1, mat(dark)); b.box(1.04, 0.03, 0.2, 0, dh - 0.215, z - 1, mat("#f6f0ff", { kind: 1 })); }      // strip lamps, one to a pool
      if (i % 4 === 2) { b.box(0.07, 0.5, 0.7, -(hw - 0.06), 1.5, z - 1, mat(dark)); b.box(0.02, 0.1, 0.16, -(hw - 0.105), 1.62, z - 1.15, mat(gold, { kind: 1 })); for (let k = 0; k < 3; k++) b.box(0.02, 0.05, 0.05, -(hw - 0.105), 1.42, z - 0.85 - k * 0.12, mat(k ? pale : gold, { kind: 1 })); }
      if (i % 4 === 0) { b.box(0.3, 0.42, 0.5, hw - 0.2, 0.45, z - 1, mat(steel)); b.cyl(0.04, 0.7, hw - 0.2, 1.0, z - 1, mat(dark), "y", 6); }
    }
    b.quad([0, 0.012, -1.5], [1, 0, 0], [0, 0, -1], 2.6, 0.65, sLip); uvq(b, [0, 0.01, -0.3], [1, 0, 0], [0, 0, -1], DUCT.w, 0.5, stripeMat, 6, 1);
    b.box(DUCT.w + 0.6, 0.2, L, 0, -0.1, zc, mat(dark)); b.quad([0, dh / 2, -L], [1, 0, 0], [0, 1, 0], DUCT.w, dh, mat("#120e22", { kind: 1 }));           // under the floor; the dark the duct comes out of
  }
  // ---- the wall the duct opens in: z = 0, facing the core's light ----------------------------------------------------
  {
    const R = 420, wm = mat(wall, { seam: [7, 5], seamMode: 2 }), y0 = -0.2, y1 = dh + 0.2, x1 = hw + 0.2;
    b.quad([0, (y1 + R) / 2, 0], [1, 0, 0], [0, 1, 0], 2 * R, R - y1, wm); b.quad([0, (y0 - R) / 2, 0], [1, 0, 0], [0, 1, 0], 2 * R, R + y0, wm);
    for (const s of [1, -1]) b.quad([s * (x1 + R) / 2, (y0 + y1) / 2, 0], [1, 0, 0], [0, 1, 0], R - x1, y1 - y0, wm);
    // the mouth: a frame proud of the wall, striped, and a lip to step off
    for (const s of [1, -1]) { b.box(0.5, dh + 1.1, 0.7, s * (hw + 0.3), dh / 2, 0.3, mat(rib)); uvq(b, [s * (hw + 0.3), dh / 2, 0.655], [1, 0, 0], [0, 1, 0], 0.5, dh + 1.1, stripeMat, 1, 8); }
    b.box(DUCT.w + 1.1, 0.5, 0.7, 0, dh + 0.3, 0.3, mat(rib)); b.box(DUCT.w + 1.1, 0.4, 1.0, 0, -0.2, 0.45, mat(rib)); uvq(b, [0, 0.005, 0.5], [1, 0, 0], [0, 0, -1], DUCT.w, 0.9, grateMat, 2, 0.6);
    uvq(b, [0, -0.2, 0.955], [1, 0, 0], [0, 1, 0], DUCT.w + 1.1, 0.4, stripeMat, 8, 1);
    b.box(0.5, 0.26, 0.3, 0, dh + 0.72, 0.5, mat(dark)); b.box(0.3, 0.12, 0.05, 0, dh + 0.72, 0.67, mat("#f6f0ff", { kind: 1 }));
    b.quad([hw + 4.2, 2.3, 0.02], [1, 0, 0], [0, 1, 0], 5.6, 2.8, sWall);
    // round the mouth: a ladder up the wall, pipe runs over it, a bank of lockers with lit ports, a hatch
    for (const x of [-3.05, -3.6]) b.box(0.07, 60, 0.07, x, 6, 0.22, mat(steel)); for (let y = -8; y < 22; y += 0.42) b.box(0.55, 0.05, 0.05, -3.325, y, 0.22, mat(steel));
    for (const [y, r, c] of [[5.3, 0.16, steel], [5.75, 0.24, wallD], [6.2, 0.12, pale]]) { b.cyl(r, 46, 6, y, 0.12 + r, mat(c), "x", 8); for (let x = -15; x < 28; x += 5.5) b.box(0.14, r * 2 + 0.16, r * 2 + 0.2, x, y, 0.12 + r, mat(rib)); }
    for (let k = 0; k < 4; k++) { const x = -5.2 - k * 1.5; b.box(1.3, 2.6, 0.5, x, 1.5, 0.25, mat(k % 2 ? wallD : steel)); b.box(0.9, 0.3, 0.04, x, 2.3, 0.51, mat(k === 2 ? gold : "#f6f0ff", { kind: 1 })); b.box(0.1, 0.5, 0.06, x + 0.4, 1.3, 0.52, mat(dark)); }
    b.box(2.2, 2.2, 0.36, 5.0, -3.2, 0.18, mat(rib)); b.cyl(0.8, 0.1, 5.0, -3.2, 0.4, mat(wallD), "z", 16); b.box(1.2, 0.14, 0.08, 5.0, -3.2, 0.46, mat(pale));
    for (const s of [1, -1]) { b.box(0.3, 0.3, 0.34, s * (hw + 0.95), dh + 0.3, 0.17, mat(dark)); b.box(0.16, 0.16, 0.06, s * (hw + 0.95), dh + 0.3, 0.37, mat(gold, { kind: 1 })); }
    // what the wall is made of: ribs, ledges, plates proud of it, pipe runs, other mouths with a lamp over each
    for (let i = -14; i <= 14; i++) { const x = i * 13 + (i >= 0 ? 6.5 : -6.5); b.box(0.9, 2 * R * 0.6, 1.1, x, 0, 0.5, mat(rib)); b.box(0.3, 2 * R * 0.6, 0.3, x + 2.1, 0, 0.15, mat(wallD)); }
    for (let j = -12; j <= 12; j++) { const y = j * 11 + 7.4; b.box(2 * R * 0.6, 0.7, 1.5, 0, y, 0.7, mat(wallD)); b.box(2 * R * 0.6, 0.12, 1.7, 0, y + 0.42, 0.8, mat(rib)); }
    const r = rng(4107);
    for (let k = 0; k < 150; k++) {
      const x = (r() - 0.5) * 300, y = (r() - 0.5) * 240, w = 1.5 + r() * 6, h = 1 + r() * 5, d = 0.2 + r() * 1.3, t = r();
      if (Math.abs(x) < 9 && Math.abs(y - 1.6) < 5) continue;
      if (t < 0.5) b.box(w, h, d, x, y, d / 2, mat(t < 0.25 ? wallD : wall, { seam: [1.5, 1.5], seamMode: 2 }));
      else if (t < 0.7) { b.cyl(0.5 + r() * 0.9, 3 + r() * 9, x, y, 0.9, mat(t < 0.6 ? steel : pale), r() > 0.5 ? "x" : "y", 12); }
      else if (t < 0.88) { b.box(3.4, 3.0, 0.5, x, y, 0.25, mat(rib)); b.quad([x, y, 0.51], [1, 0, 0], [0, 1, 0], 2.6, 2.3, mat("#1a1232", { kind: 1 })); b.box(0.5, 0.14, 0.06, x, y + 1.75, 0.3, mat("#f6f0ff", { kind: 1 })); }
      else for (let n = 0; n < 5; n++) b.box(0.12, 0.12, 0.05, x + n * 0.5, y, 0.05, mat(n % 3 ? "#f6f0ff" : gold, { kind: 1 }));
    }
    for (let k = 0; k < 9; k++) { const y = -60 + k * 15 + 3; b.cyl(0.3, 300, 0, y + 2.6, 0.5, mat(k % 2 ? steel : wallD), "x", 8); }
  }
  // ---- the security lattice: three six-sided rings on six longerons, braced, and stayed to the wall ----------------------
  const hexAt = (deg, z, r = LAT.r) => [r * Math.cos(deg * Math.PI / 180), LAT.y + r * Math.sin(deg * Math.PI / 180), z];
  {
    const truss = mat("#463b76"), trussD = mat("#30285a"), bar = (p, q, t, m) => { const d = new THREE.Vector3(q[0] - p[0], q[1] - p[1], q[2] - p[2]), l = d.length(), g = new THREE.BoxGeometry(t, t, l); const o3 = new THREE.Object3D(); o3.position.set((p[0] + q[0]) / 2, (p[1] + q[1]) / 2, (p[2] + q[2]) / 2); o3.lookAt(q[0], q[1], q[2]); o3.updateMatrix(); b.add(g, m, o3.matrix); };
    const rings = [LAT.z0, (LAT.z0 + LAT.z1) / 2, LAT.z1];
    for (const z of rings) for (let k = 0; k < 12; k++) { bar(hexAt(k * 30, z), hexAt(k * 30 + 30, z), 0.15, truss); bar(hexAt(k * 30, z, LAT.r + 0.5), hexAt(k * 30 + 30, z, LAT.r + 0.5), 0.07, trussD); if (k % 2) bar(hexAt(k * 30, z), hexAt(k * 30, z, LAT.r + 0.5), 0.07, trussD); }
    for (let k = 0; k < 12; k++) {
      const a = k * 30; bar(hexAt(a, LAT.z0 - 0.4), hexAt(a, LAT.z1 + 0.4), k % 2 ? 0.16 : 0.1, truss);
      for (let n = 0; n < 2; n++) if ((k + n) % 4 === 1) bar(hexAt(a, rings[n]), hexAt(a + 60, rings[n + 1]), 0.05, trussD);
      if (k % 4 === 1) { bar(hexAt(a, LAT.z0), hexAt(a, 0.4, LAT.r + 5), 0.16, trussD); const f = hexAt(a, 0.5, LAT.r + 5); b.box(1.2, 1.2, 0.9, f[0], f[1], 0.45, mat(rib)); }
      if (k % 2) { const n = hexAt(a, LAT.z0 - 0.4); b.box(0.42, 0.42, 0.3, n[0], n[1], n[2], mat(gold)); const m2 = hexAt(a, LAT.z1 + 0.4); b.box(0.42, 0.42, 0.3, m2[0], m2[1], m2[2], mat(gold)); }
    }
  }
  // ---- the island: a landing deck on a boom, the pod its door is in, the mast they hang on -------------------------------
  {
    const z0 = ISLAND, len = 12, zc = z0 + len / 2, iw = 5, pz = z0 + len + 2.0, pr = 2.3;
    b.box(iw, 0.36, len, 0, -0.18, zc, mat(rib)); uvq(b, [0, 0.004, zc], [1, 0, 0], [0, 0, -1], iw - 0.5, len - 0.3, grateMat, 3, len / 1.6);
    uvq(b, [0, -0.18, z0 - 0.004], [-1, 0, 0], [0, 1, 0], iw, 0.36, stripeMat, 10, 1); uvq(b, [0, 0.006, z0 + 0.3], [1, 0, 0], [0, 0, -1], iw, 0.5, stripeMat, 10, 1);
    b.quad([0, 0.012, z0 + 4.4], [-1, 0, 0], [0, 0, 1], 3.6, 1.8, sDeck);
    for (const s of [1, -1]) {
      for (let z = z0 + 7; z < z0 + len; z += 1.8) b.box(0.07, 1.1, 0.07, s * (iw / 2 - 0.12), 0.55, z, mat(steel));
      for (const y of [0.6, 1.1]) b.box(0.05, 0.05, len - 7, s * (iw / 2 - 0.12), y, z0 + 7 + (len - 7) / 2, mat(y > 1 ? pale : steel));
      b.box(0.3, 0.7, len, s * (iw / 2 - 0.3), -0.7, zc, mat(wallD));
    }
    for (let k = 0; k < 4; k++) b.box(iw - 0.6, 0.3, 0.3, 0, -0.5, z0 + 1 + k * 3.3, mat(dark));
    // the pod: a drum with a lit door, on the mast
    b.cyl(pr, 3.9, 0, 1.75, pz, mat(wall, { seam: [1.2, 1.3], seamMode: 2 }), "y", 18); b.cyl(pr + 0.18, 0.3, 0, 3.6, pz, mat(rib), "y", 18); b.cyl(pr + 0.18, 0.3, 0, -0.1, pz, mat(rib), "y", 18); b.cyl(pr * 0.6, 0.8, 0, 4.1, pz, mat(wallD), "y", 14);
    b.box(1.9, 2.7, 0.5, 0, 1.35, pz - pr + 0.1, mat(rib)); b.quad([0, 1.25, pz - pr - 0.16], [-1, 0, 0], [0, 1, 0], 1.3, 2.3, mat("#fbf6ff", { kind: 1, flag: 1 }));
    b.quad([0, 3.0, pz - pr - 0.16], [-1, 0, 0], [0, 1, 0], 1.6, 0.4, mat("#fff", { kind: 2, map: sDoor }));
    b.cyl(0.5, 620, 0, 0, pz, mat(wallD), "y", 10); for (let y = -90; y <= 90; y += 9) { b.cyl(0.72, 0.4, 0, y + 6.5, pz, mat(y % 18 ? rib : pale), "y", 10); if (y % 27 === 0) b.box(4.4, 0.3, 0.3, 0, y + 8.5, pz, mat(rib)); }
    b.cyl(0.12, 9, 2.6, 5.5, pz - 2.4, mat(dark), "y", 6, 0.05, { rz: -0.3, rx: -0.2 });
  }
  scene.add(b.build());
  // a service console on the island (options.console; sets/coreplan.js CONSOLE): hidden unless a shot asks for it
  const consoleG = (() => { const c = kit.builder(), [x, , z] = CONSOLE.at, n = CONSOLE.n, ry = { ry: Math.atan2(n[0], n[2]) }, S = CONSOLE.screen;
    c.cyl(0.07, 1.0, x - n[0] * 0.3, 0.5, z - n[2] * 0.3, mat(steel), "y", 8); c.box(0.5, 0.06, 0.5, x - n[0] * 0.3, 0.03, z - n[2] * 0.3, mat(rib), ry);
    c.box(1.0, 0.8, 0.56, x - n[0] * 0.3, S.c[1], z - n[2] * 0.3, mat(pale), ry); c.box(1.06, 0.1, 0.62, x - n[0] * 0.3, S.c[1] + 0.44, z - n[2] * 0.3, mat(gold), ry);
    c.quad([S.c[0] + n[0] * 0.012, S.c[1], S.c[2] + n[2] * 0.012], S.u, [0, 1, 0], S.w, S.h, mat("#120a26"));
    const g = c.build(); g.visible = false; scene.add(g); return g; })();

  // ---- the far plate ----------------------------------------------------------------------------------------------------
  const PJ = projector({ pos: HERO.pos, target: HERO.target, fov: HERO.wide });
  const farMat = new THREE.ShaderMaterial({ vertexShader: PROJECT_VS, fragmentShader: FAR_FS, uniforms: { tMap: { value: await loadPainting("/sets/core/far.webp") }, uProj: { value: PJ.matrix }, uHaze: { value: new THREE.Color(...HAZE) }, uLight: { value: new THREE.Vector2(0.711, 0.507) }, uFar: U.uFar } });
  const far = new THREE.Mesh(new THREE.SphereGeometry(1200, 48, 32), farMat); far.position.set(...HERO.pos); painted(farMat, far, -30); scene.add(far);

  // ---- what floats: wreckage turning slowly, each piece about its own axis; loose cable ----------------------------------
  const junk = [];
  {
    const protos = [
      () => { const p = kit.builder(); p.box(2.4, 2.4, 5.6, 0, 0, 0, mat(steel, { seam: [0.4, 2.4], seamMode: 1 })); for (const z of [-2.7, 0, 2.7]) p.box(2.56, 2.56, 0.2, 0, 0, z, mat(rib)); p.box(1.0, 1.6, 0.06, 0, 0, 2.84, mat(pale)); return p.build(); },                  // a container
      () => { const p = kit.builder(); p.box(7, 0.16, 4.4, 0, 0, 0, mat(wall, { seam: [1.2, 1.2], seamMode: 1 })); p.box(7, 0.4, 0.3, 0, -0.2, 1.2, mat(rib)); p.box(7, 0.4, 0.3, 0, -0.2, -1.4, mat(rib)); p.box(1.6, 0.5, 1.1, 2, -0.3, 0.2, mat(dark)); p.box(0.3, 0.2, 5.2, -2.8, 0.05, 0.6, mat(pale)); return p.build(); },      // a hull plate, torn off
      () => { const p = kit.builder(); for (const [x, y] of [[0.5, 0.5], [-0.5, 0.5], [0, -0.45]]) p.box(0.12, 0.12, 9, x, y, 0, mat(rib)); for (let z = -4; z <= 4; z += 1.6) { p.box(1.1, 0.07, 0.07, 0, 0.5, z, mat(steel)); p.box(0.07, 1.1, 0.07, 0.27, 0, z, mat(steel), { rz: 0.5 }); p.box(0.07, 1.1, 0.07, -0.27, 0, z, mat(steel), { rz: -0.5 }); } return p.build(); },      // a length of truss
      () => { const p = kit.builder(); p.cyl(1.1, 3.6, 0, 0, 0, mat(pale), "z", 14); p.ball(1.1, 0, 0, 1.8, mat(pale)); p.ball(1.1, 0, 0, -1.8, mat(pale)); p.cyl(1.16, 0.3, 0, 0, 0.6, mat(rib), "z", 14); p.cyl(0.2, 1.2, 0.9, 0.9, -1.2, mat(dark), "z", 6); return p.build(); },                                       // a tank
      () => { const p = kit.builder(); p.box(1.0, 0.7, 0.8, 0, 0, 0, mat(steel)); p.box(0.7, 0.05, 0.5, 0, 0.38, 0, mat(dark)); p.box(0.12, 0.12, 0.05, 0.2, 0.1, 0.42, mat(gold, { kind: 1 })); return p.build(); },                                                                                              // a crate
    ];
    const built = protos.map((f) => f());
    // [kind, x, y, z, scale]: off the way across, at every distance, a few near the lens
    const LIST = [[0, -9, 6.5, 13, 1], [1, 11, -5, 22, 1.2], [2, -13, -3, 8, 1], [3, 15, 8, 30, 1.3], [4, -4.2, 4.6, 4.5, 0.8], [4, 5.5, -2.6, 6, 0.6], [1, -24, 10, 40, 1.6], [0, 22, -12, 52, 1.2], [2, 6, 13, 24, 1.3], [3, -17, -11, 34, 1], [4, 3.6, 5.2, 16, 0.7],
      [0, -30, 2, 70, 1.5], [2, 28, 18, 80, 1.8], [1, 8, -17, 64, 1.4], [4, -7.5, -1.2, 21.5, 0.9], [3, -40, -20, 110, 2], [1, 44, 6, 130, 2.2], [2, -12, 22, 95, 1.6], [4, 9.5, 3.4, 12.5, 0.5], [0, 13, -9, 44, 0.9]];
    LIST.forEach(([k, x, y, z, s], i) => { const g = built[k].clone(); g.scale.setScalar(s); scene.add(g); junk.push({ g, at: [x, y, z], i }); });
  }
  const cables = [[[-3.4, 5.6, 0.2], [-5.5, 2.5, 9], 5], [[4.8, -1.4, 0.2], [7.5, 3.0, 12.5], 6.5], [[-2.2, -2.6, ISLAND], [-6.5, -4, 11], 5]].map(([a, c, len], i) => {
    const m = new THREE.Mesh(new THREE.BufferGeometry(), mat(i === 1 ? "#d9d0ee" : "#3a3160")); m.frustumCulled = false; scene.add(m); return { m, a, c, len, i };
  });
  const cablePts = (cb, t) => { const N = 22, pts = []; for (let k = 0; k <= N; k++) { const u = k / N, w = u * u; pts.push(new THREE.Vector3(
    cb.a[0] + (cb.c[0] - cb.a[0]) * u + w * 1.3 * Math.sin(u * 5.1 + t * 0.5 + cb.i * 2), cb.a[1] + (cb.c[1] - cb.a[1]) * u + w * 1.5 * Math.sin(u * 4.3 - t * 0.37 + cb.i), cb.a[2] + (cb.c[2] - cb.a[2]) * u + w * 0.9 * Math.cos(u * 3.7 + t * 0.43 + cb.i * 3))); } return pts; };

  // ---- the grid: emitters (built when first given), their flares, the beams ------------------------------------------------
  const haloTex = canvasTex(128, 128, (c) => { c.fillStyle = "rgba(255,255,255,0.25)"; c.beginPath(); c.arc(64, 64, 60, 0, 7); c.fill(); c.fillStyle = "rgba(255,255,255,0.55)"; c.beginPath(); c.arc(64, 64, 34, 0, 7); c.fill(); c.fillStyle = "#fff"; c.beginPath(); c.arc(64, 64, 15, 0, 7); c.fill(); c.beginPath(); c.moveTo(0, 64); c.lineTo(64, 59); c.lineTo(128, 64); c.lineTo(64, 69); c.fill(); });
  const haloMat = mat("#ecd9ff", { kind: 7, flag: 1, map: haloTex, additive: true, fog: 0.2 });
  let turrets = null; const flares = [];
  function buildTurrets(list) {
    turrets = new THREE.Group(); scene.add(turrets);
    for (const e of list) {
      const p = kit.builder(); p.box(0.5, 0.42, 0.5, 0, 0, 0, mat(gold)); p.box(0.46, 0.2, 0.2, -0.4, 0, 0, mat(dark)); p.cyl(0.19, 0.42, -0.72, 0, 0, mat(pale), "x", 12); p.cyl(0.215, 0.1, -0.86, 0, 0, mat(dark), "x", 12);
      const g = p.build(); g.position.set(...e.at); g.rotation.z = Math.atan2(e.at[1] - LAT.y, e.at[0]); turrets.add(g);
      const lens = new THREE.Mesh(new THREE.SphereGeometry(0.15, 10, 8), mat("#ffffff", { kind: 1, fog: 0.3 })); lens.position.set(...e.at).add(new THREE.Vector3(-0.92, 0, 0).applyAxisAngle(new THREE.Vector3(0, 0, 1), g.rotation.z)); lens.layers.set(FX); scene.add(lens);
      const halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), haloMat); halo.layers.set(FX); halo.renderOrder = 12; halo.frustumCulled = false; halo.position.copy(lens.position); scene.add(halo);
      flares.push({ lens, halo });
    }
  }
  const beamGeo = new THREE.PlaneGeometry(1, 1), beams = [];
  // across a strip: a soft shoulder for the glow, a flat top with a feathered edge for the sheath and the core (the
  // frame is drawn without anti-aliasing: a hard thin bright line would stair-step, and its bloom with it)
  const strip = (f) => { const t = canvasTex(4, 64, (c) => { const d = c.createImageData(4, 64); for (let y = 0; y < 64; y++) { const u = Math.abs((y + 0.5) / 64 - 0.5) * 2, a = f(u); for (let x = 0; x < 4; x++) d.data.set([255, 255, 255, Math.round(255 * a)], (y * 4 + x) * 4); } c.putImageData(d, 0, 0); }); t.premultiplyAlpha = false; return t; };
  const softTex = strip((u) => Math.exp(-u * u * 4.5) * (1 - u) ** 0.5), coreTex = strip((u) => 1 - sstep(0.45, 0.95, u));
  const beamMesh = (i) => beams[i] ?? (beams[i] = [0, 1, 2].map((k) => { const m = new THREE.Mesh(beamGeo, null); m.layers.set(FX); m.renderOrder = 11 + k; m.frustumCulled = false; scene.add(m); return m; }));
  const vA = new THREE.Vector3(), vB = new THREE.Vector3(), vD = new THREE.Vector3(), vS = new THREE.Vector3(), vN = new THREE.Vector3(), vM = new THREE.Vector3(), mB = new THREE.Matrix4();
  function layBeams(list, glow) {
    const pxm = (H / 2) / Math.tan(camera.fov * Math.PI / 360);      // pixels a metre covers at one metre
    list.forEach((bm, i) => {
      const ms = beamMesh(i); vA.set(...bm.a); vB.set(...bm.b); vD.subVectors(vB, vA); const len = vD.length(); vD.normalize(); vM.copy(vA).addScaledVector(vD, len / 2);
      vN.subVectors(camera.position, vM); const dist = Math.max(0.5, vN.length()), px = dist / pxm; vN.normalize(); vS.crossVectors(vD, vN).normalize(); vN.crossVectors(vS, vD);
      const g = bm.gain ?? 1, widths = [Math.max(0.34 * g * glow, 22 * px), Math.max(0.1 * (0.6 + 0.4 * g), 9 * px), Math.max(0.04, 4.2 * px)], cols = ["#7a3cff", "#c79bff", "#ffffff"], alphas = [0.22, 0.6, 1];
      ms.forEach((m, k) => { m.visible = true; mB.makeBasis(vD, vS, vN); m.quaternion.setFromRotationMatrix(mB); m.position.copy(vM); m.scale.set(len, widths[k], 1);
        m.material = mat(cols[k], { kind: 7, flag: 1, map: k ? coreTex : softTex, additive: true, alpha: Math.round(clamp(alphas[k] * Math.min(1.4, g), 0, 1) * 20) / 20, fog: 0.15 }); });
    });
    for (let i = list.length; i < beams.length; i++) beams[i].forEach((m) => { m.visible = false; });
  }

  // ---- the machines: the enforcer whole, and in slices -----------------------------------------------------------------------
  const drones = createDrones(kit, scene), shadows = createShadows(kit, scene, "#1c1436");
  const NS = 5, slabs = Array.from({ length: NS }, () => { const planes = [new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), new THREE.Plane(new THREE.Vector3(0, 0, -1), 0)], cache = new Map(), g = new THREE.Group(); scene.add(g);
    const caps = [new THREE.Group(), new THREE.Group()]; caps.forEach((c) => { scene.add(c); });
    return { planes, g, caps, drones: createDrones({ ...kit, mat: (c, o2) => clipped(mat(c, o2), planes, cache) }, g) }; });
  const HEATS = ["#ffffff", "#fff3c4", "#ffd27a", "#ffb060", "#ff8a4a", "#e8683f", "#c24a4a"];
  // the cut face of the enforcer at c metres along it from its middle (machines/drones.js buildEnforcer says what is where)
  function capShapes(c) {
    const l = [[0, 0, 1.15, 0.95], [0.9, 0.12, 0.6, 0.6, 1], [-0.9, 0.12, 0.6, 0.6, 1]];
    if (Math.abs(c) < 0.4) { const w = 2 * Math.sqrt(0.4 * 0.4 - c * c); l.push([0, -0.62, w, 0.34]); }
    if (c > -0.06 && c < 0.7) l.push([0, 0.44 + (c - 0.34) * 0.24, 1.36, 0.3]);
    if (c > 0.3) l.push([0, -0.52 - (c - 0.5) * 0.5, 1.0, 0.26]);
    if (c > -0.5 && c < 0.2) l.push([0, 0.53, 0.95, 0.12]);
    return l;
  }
  // a cut face: the glowing edge of the cut (it cools), and inside it the machine in section, dark, with what it is
  // full of. Flat shapes with a feathered edge (their own alpha), so their outlines do not stair-step.
  const feather = (round) => { const t = canvasTex(256, 256, (c) => { c.clearRect(0, 0, 256, 256); c.filter = "blur(1.6px)"; c.fillStyle = "#fff"; if (round) { c.beginPath(); c.arc(128, 128, 122, 0, 7); c.fill(); } else c.fillRect(5, 5, 246, 246); }); t.premultiplyAlpha = false; return t; };
  const rectTex = feather(false), discTex = feather(true), flat = (c, round) => { const m = mat(c, { kind: 7, flag: 1, map: round ? discTex : rectTex, fog: 0.3 }); m.depthWrite = true; return m; };
  const HOT = [0, 1].map((round) => HEATS.map((c) => flat(c, round))), gut = (c) => [flat(c, 0), flat(c, 1)], gutA = gut("#2a2247"), gutB = gut("#6d6398"), gutC = gut("#e8d29a");
  function setCap(group, c, heat, order) {
    if (group.userData.c !== c) {
      group.clear(); const r = rng(Math.round(c * 100) + 700), add = (round, w, h, m, x, y, z, hot) => { const q = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); q.position.set(x, y, z); q.layers.set(FX); q.frustumCulled = false; q.userData.hot = hot ? 1 + round : 0; q.renderOrder = order + (hot ? 0 : z > 0.003 ? 2 : 1); group.add(q); };
      for (const [x, y, w, h, round = 0] of capShapes(c)) {
        add(round, w + 0.04, h + 0.04, HOT[round][0], x, y, 0, true); add(round, w - 0.1, h - 0.1, gutA[round], x, y, 0.002, false);
        if (round) { add(1, w * 0.56, w * 0.56, gutB[1], x, y, 0.004, false); add(1, w * 0.32, w * 0.32, gutA[1], x, y, 0.006, false); }
        else if (h > 0.5) for (let k = 0; k < 9; k++) { const bw = 0.1 + 0.25 * r(), bh = 0.08 + 0.2 * r(); add(0, bw, bh, (k % 4 === 3 ? gutC : gutB)[0], x + (r() - 0.5) * (w - 0.3 - bw), y + (r() - 0.5) * (h - 0.3 - bh), 0.004, false); }
      }
      group.userData.c = c;
    }
    const k = Math.min(HEATS.length - 1, Math.floor((1 - heat) * HEATS.length)); group.children.forEach((m) => { if (m.userData.hot) m.material = HOT[m.userData.hot - 1][k]; });
  }

  function update(cam, frame, sync, opt = {}) {
    const w = driveAll(sync, WIRING, frame, opt.wiring), t = frame / sync.fps;
    aim(camera, { near: 0.08, far: 2000, ...cam }, W / H);
    S.uCam.value.copy(camera.position); S.uFrame.value = frame; U.uFar.value = clamp(opt.far ?? w.far, 0, 1.5);
    for (const j of junk) { const r = rng(900 + j.i * 13), ax = new THREE.Vector3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(), sp = 0.05 + 0.1 * r(), dr = [(r() - 0.5) * 0.06, (r() - 0.5) * 0.06, (r() - 0.5) * 0.06];
      j.g.position.set(j.at[0] + dr[0] * t, j.at[1] + dr[1] * t, j.at[2] + dr[2] * t); j.g.quaternion.setFromAxisAngle(ax, r() * 6.28 + sp * t); }
    for (const cb of cables) { cb.m.geometry.dispose(); cb.m.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cablePts(cb, t)), 44, 0.045, 6, false); }
    if (opt.emitters && !turrets) buildTurrets(opt.emitters);
    flares.forEach((f, i) => { const on = !!opt.emitters?.[i]?.on; f.lens.visible = on; f.halo.visible = on; if (on) { f.halo.quaternion.copy(camera.quaternion); const s = 0.42 * w.beams * (hash(frame >> 1, i) > 0.15 ? 1 : 0.7); f.halo.scale.set(s * 1.5, s, 1); } });
    layBeams(opt.beams ?? [], w.beams);
    drones.update(opt.drones ?? [], frame, sync, camera, { thrust: w.thrust });
    consoleG.visible = !!opt.console;
    const sl = opt.slabs;
    slabs.forEach((s, j) => {
      s.g.visible = !!sl; s.caps.forEach((c) => { c.visible = false; }); if (!sl) return;
      const [dx, dy, dz, roll] = sl.at[j], lo = j ? sl.cuts[j - 1] : -50, hi = j < NS - 1 ? sl.cuts[j] : 50, p = [sl.pos[0] + dx, sl.pos[1] + dy, sl.pos[2] + dz];
      s.planes[0].constant = -(p[2] + lo); s.planes[1].constant = p[2] + hi;
      s.drones.update([{ type: "enforcer", pos: p, yaw: 0, pitch: 0, roll: roll * 180 / Math.PI, eye: 0, thrust: 0, fold: 1, beam: 0, seed: 77 }], frame, sync, camera, { thrust: 0 });
      s.g.traverse((x) => { if (x.isMesh) x.layers.set(FX); });
      [[lo, j > 0, Math.PI], [hi, j < NS - 1, 0]].forEach(([c, has, turn], k) => { const cg = s.caps[k]; cg.visible = has; if (!has) return; setCap(cg, c, sl.heat ?? 1, 20 + j * 4); cg.position.set(p[0], p[1], p[2] + c + (k ? -0.004 : 0.004)); cg.rotation.set(0, turn, k ? roll : -roll); });
    });
    shadows.update(opt.shadows);
    return { scene, camera, wires: w, clear: opt.clear ?? 0xb799ed, post: { inkColor: [0.13, 0.07, 0.3], shadowTint: [0.03, 0.012, 0.07], bloom: 0.75, bloomThreshold: 0.86, diffusion: 0.12, contrast: 0.34, sat: 1.1, inkFar: 0.02, ...opt.post } };
  }
  // The light on a figure: in the duct, its lamps and the glow of the mouth ahead; in the core, the far light: a hard
  // white rim on what faces it, and enough of the haze in the paint that black clothes are not a hole in the picture.
  function light(p) {
    if (p[2] < -0.4) return { tint: [0.86, 0.82, 1.0], rim: [0.92, 0.84, 1.0], from: [0.1, 0.25, 1], fogK: 0, gradient: 0.12 };
    return { tint: [0.97, 0.93, 1.04], rim: [1.0, 0.95, 1.0], from: SUN, fogK: S.uFogK.value * 0.6, fogColor: [...HAZE], gradient: 0 };
  }
  const floorAt = (x, z) => (z < 0.9 && Math.abs(x) < hw) || z >= ISLAND ? 0 : null;
  return { name: "core", scene, camera, kit, update, light, floorAt, WIRING };
}
