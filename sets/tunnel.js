// The service tunnel: the station's back passage, along +Z, and it NARROWS: from a duct you could drive a cart down
// (5.4 m wide, 3.4 m high at z <= 0) to a crawlway (2.5 m by 1.95 m at z >= TAPER), a frame every four metres, each a
// little smaller than the last, while the pipes on the left wall and the cable trays on the right stay the size they
// are and crowd in. Sea-green plate in the dark, mint tube lamps, rust and bone pipes, amber warning lamps that run
// toward the door: no indigo, no neon (the corridor's), no olive and yellow rails (the stairwell's).
// At z = DOOR a blast door closes the crawlway: a bone-coloured slab that comes down out of its housing in the roof.
// What hits it from the far side DENTS it: the slab is a sheet of small facets that is pushed out of true where it is
// hit, so the dents are creased plate (flat facets, each its own tone, an ink line on every crease) and the hazard
// paint, which is on the sheet, is pulled out of shape with it.
//
//   const set = await createTunnel(renderer, { width, height });
//   set.update(camera, frame, sync, options) -> { scene, camera, clear, post };   set.light(p) -> the light on a figure
//
// Cue options (all optional, plain values for this frame):
//   door     0..1                how far shut the blast door is (1: on the floor)
//   dents    [{ x, y, r, d, k, seed }]   where it has been hit: centre on the slab (metres: x across, y up from its
//                                foot), radius, depth (metres, toward +Z: the side away from what hit it), how far in
//                                it has gone (0..1), a seed for its creases
//   cut      true                the right wall (x > 0) is taken away from z = cutFrom to cutTo, to watch from the side
//   cutFrom, cutTo               (default DOOR - 16, DOOR + 12)
//   sign     { text, small }     what the tunnel's little screens say (default: the tunnel's own notice)
//   monitor  { c, u, w, h }      a monitor on a bracket: its screen's centre, the way its text runs, its size (metres); the shot draws what it says
//   alert    0..1                the warning lamps: how hard they burn as their chase runs down the tunnel
//   drones   [...]               machines/drones.js specs
//   wiring   { name: wire }      replace wires of WIRING
//   shadows  [...]               contact shadows (the stage's)
//   post     { ... }             engine/post.js parameters
import * as THREE from "three";
import { createKit, createShadows, canvasTex, aim, hash, clamp } from "./kit.js";
import { kana, latin, scanlines, hazard, chevrons, kanaWidth } from "./sign.js";
import { driveAll } from "../engine/sync.js";
import { createDrones } from "../machines/drones.js";

export const M = 4, Z0 = -40, Z1 = 96, TAPER = 60, DOOR = 64, WIDE = [2.7, 3.4], NARROW = [1.25, 1.95];      // module; the tunnel's ends; where it is narrowest from; the door; half-width and height at each end
export const SLAB = { w: 2.7, h: 2.5, t: 0.14 };
// half the width and the height of the tunnel at z (each module is as wide as its middle)
export const sectionAt = (z) => { const zc = Math.floor(z / M) * M + M / 2, k = clamp(zc / TAPER); return [WIDE[0] + (NARROW[0] - WIDE[0]) * k, WIDE[1] + (NARROW[1] - WIDE[1]) * k]; };
export const WIRING = {
  lamps: { stem: "bass", mode: "pulse", decay: 0.22, floor: 0.7, gain: 0.4 },       // the tube lamps and the pools under them
  chase: { stem: "kick", mode: "count", gain: 1 },                                  // the warning lamps' chase steps on every kick
  flare: { stem: "kick", mode: "pulse", decay: 0.12, floor: 0.55, gain: 0.6 },      // and they burn harder on it
  screens: { stem: "lead_vocals", mode: "pulse", decay: 0.16, floor: 0.75, gain: 0.6 },   // the little screens flare with the voice
  thrust: { stem: "drums", mode: "pulse", decay: 0.15, gain: 1 },                   // drones
};

const CHUNK = `
uniform float uHull, uWarn, uChase, uDoorZ, uCut;
float lampOn(float z){ return step(fract((floor(z/8.0) + uChase)/3.0), 0.34); }      // one warning lamp in three is lit, and which one steps toward the door
float setTone(vec3 W, vec3 N){
  float wob = (vnoise(surf(W, N)*1.5)-0.5)*0.16;
  if(abs(W.z-uDoorZ) < 0.5 && abs(N.z) > 0.2 && abs(W.x) < 1.36){         // the door's sheet: every facet in its own tone, by how it is turned to the lamp above it
    float d = dot(N, normalize(vec3(0.3, 0.74, N.z > 0.0 ? 0.6 : -0.6)));
    return d > 0.72 ? 2.0 : (d > 0.44 ? 1.0 : 0.0);
  }
  float dz = abs(fract(W.z/4.0)-0.5)*4.0 + wob;
  float wide = 0.6+0.4*uHull;
  if(N.y > 0.7) return dz < 0.85*wide ? 2.0 : (dz < 1.6 ? 1.0 : 0.0);     // the floor: a pool under each tube
  if(N.y < -0.7) return dz < 0.5 ? 1.0 : 0.0;
  float up = W.y + wob;
  float t = dz < (0.25+up*0.42)*wide && up > 0.35 ? 2.0 : (dz < 0.8+up*0.6 ? 1.0 : 0.0);
  if(abs(N.z) > 0.9) t = max(t, 1.0);                                    // what faces along the tunnel (a frame, the bulkhead) is never lost
  if(uCut > 0.5 && W.x > 0.0 && abs(N.x) < 0.5 && N.y < 0.7 && abs(N.z) < 0.9) t = 0.0;
  return t;
}
vec3 setExtra(vec3 col, vec3 W, vec3 N, float tone){
  // the warning lamps: an amber wash, hard-edged, on whatever is near one that is lit
  float lz = (floor(W.z/8.0)+0.5)*8.0, on = lampOn(W.z)*uWarn;
  float r = length(vec2(W.z-lz, (W.y-1.2)*0.8)) + (vnoise(W.zy*1.3)-0.5)*0.5;
  if(on > 0.0 && abs(W.z-uDoorZ) > 0.5) col = mix(col, col*vec3(1.55,0.72,0.34)+vec3(0.2,0.06,0.0), step(r, 1.9)*clamp(on, 0.0, 1.0)*0.85);
  return col;
}
float setEmit(vec3 W, int flag){
  if(flag == 2) return 0.5+0.6*uHull;                                     // tube lamps
  if(flag == 3) return 0.18 + 1.5*lampOn(W.z)*uWarn;                      // warning lamps
  return 1.0;
}
vec3 setSpecial(vec3 W, vec3 d, vec2 uv){ return vec3(0.0); }`;

function signTex(text, small) {
  return canvasTex(512, 256, (c) => {
    const col = text ? "#ffb428" : "#58f0c0", bg = text ? "#1c0d02" : "#02170f";
    c.fillStyle = bg; c.fillRect(0, 0, 512, 256); c.strokeStyle = col; c.lineWidth = 8; c.strokeRect(12, 12, 488, 232);
    if (text) {
      c.font = 'bold 120px "DejaVu Sans Mono", monospace'; const w = c.measureText(text).width, k = Math.min(1, 440 / w);
      c.save(); c.translate(256 - w * k / 2, 132); c.scale(k, 1); c.fillStyle = col; c.fillText(text, 0, 0); c.restore();
      if (small) kana(c, small, 256 - kanaWidth(small, 56) / 2, 164, 56, 9, col);
    } else { kana(c, "サービス", 40, 36, 92, 13, col); latin(c, "TUNNEL 7 // NO THROUGH WAY", 40, 212, 28, col); }
    scanlines(c, 512, 256, 0.4, 6);
  });
}
// the door's paint: bone plate, a number, the word, chevrons that point at the floor, a hazard band along its foot.
// It is laid over the slab's sheet once; a dent takes the paint with it.
const doorTex = () => canvasTex(1024, 960, (c) => {
  c.fillStyle = "#bfb894"; c.fillRect(0, 0, 1024, 960);
  c.fillStyle = "#afa884"; for (let i = 0; i < 4; i++) c.fillRect(i * 256 + 8, 0, 120, 960);
  c.fillStyle = "#8d8668"; for (let i = 1; i < 5; i++) c.fillRect(0, i * 192 - 4, 1024, 8); for (let i = 1; i < 4; i++) c.fillRect(i * 256 - 4, 0, 8, 960);
  c.fillStyle = "#3a3528"; for (let i = 0; i < 4; i++) for (let j = 0; j < 5; j++) for (const [dx, dy] of [[22, 22], [234, 22], [22, 170], [234, 170]]) { c.beginPath(); c.arc(i * 256 + dx, j * 192 + dy, 7, 0, 7); c.fill(); }
  c.save(); c.translate(512, 470); c.rotate(Math.PI / 2); chevrons(c, -170, -400, 330, 800, 3, 46, "#d8462a"); c.restore();
  c.fillStyle = "#bfb894"; c.fillRect(262, 330, 500, 170); kana(c, "キケン", 300, 352, 126, 20, "#23201a");
  latin(c, "T-7", 60, 190, 150, "#23201a"); latin(c, "BLAST DOOR // SERVICE", 512, 250, 40, "#6d664c", { align: "center" });
  latin(c, "KEEP CLEAR", 964, 176, 64, "#d8462a", { align: "right" });
  hazard(c, 0, 760, 1024, 200, "#f2b21c", "#1a1810", 128); c.fillStyle = "#1a1810"; c.fillRect(0, 748, 1024, 14);
});

export async function createTunnel(renderer, o = {}) {
  const W = o.width ?? 1920, H = o.height ?? 1080;
  const U = { uHull: { value: 1 }, uWarn: { value: 0 }, uChase: { value: 0 }, uDoorZ: { value: DOOR }, uCut: { value: 0 } };
  const kit = createKit(CHUNK, U), { mat } = kit;
  kit.shared.uFogCol.value.setRGB(0.03, 0.17, 0.16); kit.shared.uFogTop.value.setRGB(0.03, 0.17, 0.16); kit.shared.uFogDeep.value.setRGB(0.02, 0.08, 0.08); kit.shared.uFogK.value = 0.024;
  kit.shared.uKey.value.set(0.2, 0.9, -0.35).normalize(); kit.shared.uTintLit.value.setRGB(1.12, 1.2, 1.05); kit.shared.uTintMid.value.setRGB(0.62, 0.82, 0.76); kit.shared.uTintShade.value.setRGB(0.24, 0.42, 0.45); kit.shared.uRim.value.setRGB(0.6, 1.0, 0.8);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(50, W / H, 0.08, 500);
  const G = { screens: { value: 1 } };
  const wall = "#2f6f64", wallD = "#234f4a", floorC = "#2a5653", ceilC = "#1d4441", rib = "#a3482f", ribD = "#6d2a22", bone = "#a9a58c", rustC = "#b5562d", mint = "#7fd6b4", dark = "#10221f", steel = "#5d8078", haz = "#f2b21c";
  const stripes = canvasTex(256, 64, (c) => hazard(c, 0, 0, 256, 64, "#f2b21c", "#1a1810", 64), { repeat: true });
  const grate = canvasTex(256, 256, (c) => { c.fillStyle = "#1c3a38"; c.fillRect(0, 0, 256, 256); c.fillStyle = "#3a6c66"; for (let y = 8; y < 256; y += 32) c.fillRect(14, y, 228, 14); c.fillStyle = "#4b8279"; c.fillRect(0, 0, 256, 6); c.fillRect(0, 0, 8, 256); c.fillRect(248, 0, 8, 256); }, { repeat: true });
  const arrow = canvasTex(128, 256, (c) => { c.strokeStyle = "#fff"; c.lineWidth = 26; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(14, 226 - i * 80); c.lineTo(64, 180 - i * 80); c.lineTo(114, 226 - i * 80); c.stroke(); } });
  const st = (str) => canvasTex(Math.ceil(kanaWidth(str, 104) + 28), 128, (c) => kana(c, str, 14, 12, 104, 17, "#fff"));
  const stencils = [["サービス トンネル", 3.4], ["キケン", 1.5], ["ハイカン", 1.9], ["セマイ", 1.5]].map(([s, w]) => ({ tex: st(s), w }));
  const code = (s) => canvasTex(300, 128, (c) => latin(c, s, 4, 104, 104, "#fff"));
  const signMat = mat("#fff", { kind: 2, map: signTex("", ""), gain: G.screens }), signs = new Map();
  const uvq = (b, c, u, v, w, h, m, ru, rv) => { b.quad(c, u, v, w, h, m); const list = b.bins.get(m), uv = list[list.length - 1].attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * ru, uv.getY(i) * rv); };
  const stripeMat = mat("#fff", { kind: 10, map: stripes }), grateMat = mat("#fff", { kind: 10, map: grate });

  // ---- the tunnel, module by module: the shell, and what hangs on the right wall apart (a cutaway takes that away) ---
  const shell = kit.builder(), right = kit.builder(), rightCut = kit.builder(), CUT0 = o.cutFrom ?? DOOR - 16, CUT1 = o.cutTo ?? DOOR + 12;
  for (let z = Z0; z < Z1; z += M) {
    const zc = z + M / 2, i = Math.round(z / M), [w, h] = sectionAt(zc), [wp, hp] = sectionAt(zc - M), b = shell, inCut = zc > CUT0 && zc < CUT1, R = inCut ? rightCut : right;
    // floor: plate, a grating down the middle, a bone line either side of it, a kerb
    b.quad([0, 0, zc], [1, 0, 0], [0, 0, -1], 2 * w, M, mat(floorC, { seam: [1, 1], seamMode: 2 }));
    uvq(b, [0, 0.006, zc], [1, 0, 0], [0, 0, -1], 0.9, M, grateMat, 1, 4);
    for (const s of [1, -1]) { b.box(0.07, 0.008, M, s * 0.56, 0.006, zc, mat(bone)); b.box(0.16, 0.12, M, s * (w - 0.08), 0.06, zc, mat(wallD)); }
    if (hash(i, 3) > 0.45) b.quad([0, 0.012, zc + 0.6], [1, 0, 0], [0, 0, -1], 0.5, 1.0, mat("#a9cfc0", { kind: 4, map: arrow }));
    // ceiling, with a duct along it and the tube lamp in its cage
    b.quad([0, h, zc], [1, 0, 0], [0, 0, 1], 2 * w, M, mat(ceilC, { seam: [1.35, 2], seamMode: 2 }));
    b.box(0.62, 0.2, M, -w * 0.42, h - 0.1, zc, mat(steel, { seam: [0.62, 1] })); b.box(0.7, 0.24, 0.1, -w * 0.42, h - 0.12, z + 0.4, mat(wallD));
    b.box(0.2, 0.06, 1.7, w * 0.22, h - 0.05, zc, mat(dark)); b.box(0.12, 0.05, 1.5, w * 0.22, h - 0.09, zc, mat("#d6ffe9", { kind: 1, flag: 2 }));
    for (const dz of [-0.6, 0, 0.6]) b.box(0.2, 0.09, 0.03, w * 0.22, h - 0.1, zc + dz, mat(dark));
    // walls: plate above a darker dado
    for (const s of [1, -1]) {
      const B = s > 0 ? R : b;
      B.quad([s * w, h / 2, zc], [0, 0, s], [0, 1, 0], M, h, mat(wall, { seam: [2, 0.8], seamMode: 2 }));
      B.box(0.05, 0.62, M, s * (w - 0.025), 0.43, zc, mat(wallD)); B.box(0.07, 0.05, M, s * (w - 0.035), 0.76, zc, mat(steel));
      // the step where the last module was wider: a return face, so nothing shows through
      if (wp > w + 1e-6) B.quad([s * (w + wp) / 2, hp / 2, z], [1, 0, 0], [0, 1, 0], wp - w, hp, mat(wallD));
    }
    if (hp > h + 1e-6) b.quad([0, (h + hp) / 2, z], [1, 0, 0], [0, 1, 0], 2 * wp, hp - h, mat(ceilC));
    // the frame at the module's start: two posts, a lintel, a sill
    for (const s of [1, -1]) (s > 0 ? R : b).box(0.2, h, 0.3, s * (w - 0.1), h / 2, z, mat(rib));
    b.box(2 * w, 0.2, 0.3, 0, h - 0.1, z, mat(rib)); b.box(2 * w, 0.05, 0.34, 0, 0.025, z, mat(ribD));
    for (const s of [1, -1]) (s > 0 ? R : b).box(0.24, 0.24, 0.36, s * (w - 0.12), h - 0.12, z, mat(ribD));
    // LEFT wall: three pipes that keep their size while the wall comes in, a flange each on every frame, a valve now and then
    const L = -w;
    for (const [fy, r, col, off] of [[0.5, 0.17, bone, 0.2], [0.72, 0.11, rustC, 0.14], [0.86, 0.065, mint, 0.09]]) {
      const y = Math.min(h - r - 0.05, 0.3 + fy * (h - 0.4));
      b.cyl(r, M, L + off, y, zc, mat(col), "z", 10); b.cyl(r + 0.045, 0.1, L + off, y, z + 0.3, mat(col === bone ? "#a8a184" : ribD), "z", 10);
      b.box(off + 0.02, 0.05, 0.08, L + off / 2, y - r - 0.02, z + 2.2, mat(dark));
      if (col === rustC && hash(i, 7) > 0.6) { b.cyl(0.05, 0.2, L + off + 0.14, y, zc + 0.7, mat(dark), "x", 6); b.add(new THREE.TorusGeometry(0.13, 0.025, 5, 14).rotateY(Math.PI / 2), mat("#d8462a"), new THREE.Matrix4().makeTranslation(L + off + 0.24, y, zc + 0.7)); }
    }
    // RIGHT wall: a ladder tray of cables, junction boxes, conduit; a warning lamp every other module; a stencil
    const X = w, ty = Math.min(h - 0.3, 0.3 + 0.78 * (h - 0.4));
    for (const dx of [0.06, 0.36]) R.box(0.03, 0.06, M, X - dx, ty, zc, mat(steel));
    for (let k = 0; k < 6; k++) R.box(0.3, 0.025, 0.04, X - 0.21, ty - 0.02, z + 0.35 + k * 0.66, mat(steel));
    [[0.1, 0.035, dark], [0.17, 0.028, "#d8462a"], [0.235, 0.03, bone], [0.3, 0.024, mint]].forEach(([dx, r, col]) => R.cyl(r, M, X - dx, ty + 0.03 + r, zc, mat(col), "z", 6));
    if (hash(i, 11) > 0.5) { R.box(0.12, 0.36, 0.3, X - 0.06, ty - 0.5, z + 1.2, mat(bone)); R.box(0.02, 0.04, 0.04, X - 0.13, ty - 0.42, z + 1.12, mat("#58f0c0", { kind: 1 })); R.box(0.02, 0.04, 0.04, X - 0.13, ty - 0.42, z + 1.26, mat("#ff5a3c", { kind: 1 })); R.cyl(0.02, 0.36, X - 0.06, ty - 0.2, z + 1.2, mat(dark), "y", 5); }
    if (((i % 2) + 2) % 2 === 0) {      // warning lamps: one each side at the middle of every eight metres, in a cage
      for (const s of [1, -1]) { const B = s > 0 ? R : b, lx = s * (w - (s > 0 ? 0.5 : 0.48)), ly = Math.min(h - 0.22, 2.3); B.box(0.2, 0.08, 0.2, lx, ly + 0.11, z + 4, mat(dark)); B.ball(0.085, lx, ly, z + 4, mat("#ffab2e", { kind: 1, flag: 3 }), null, 10); B.box(0.02, 0.2, 0.02, lx + 0.09, ly, z + 4, mat(dark)); B.box(0.02, 0.2, 0.02, lx - 0.09, ly, z + 4, mat(dark)); }
    }
    const sn = stencils[((i % 4) + 4) % 4], sw = Math.min(sn.w, 3.2);
    if (hash(i, 5) > 0.35 && h > 2.2) R.quad([X - 0.012, 1.25, zc + 0.2], [0, 0, 1], [0, 1, 0], sw, 0.5 * sw / sn.w * (sn.w > 3 ? 1.1 : 1), mat("#8fd0bd", { kind: 4, map: sn.tex }));
    if (((i % 3) + 3) % 3 === 1) {      // a little screen on the left wall, over the pipes' brackets, tipped to face down the tunnel
      const sy = Math.min(h - 0.5, 1.9); b.box(0.16, 0.5, 0.86, L + 0.45, sy, z + 3.3, mat(bone), { ry: -0.5 }); b.quad([L + 0.535, sy, z + 3.25], [-0.479, 0, -0.878], [0, 1, 0], 0.74, 0.38, signMat);
    }
    b.quad([L + 0.4, 0.014, zc], [0, 0, -1], [1, 0, 0], 1.1, 0.48, mat("#a9cfc0", { kind: 4, map: code(`T-${String(Math.max(0, Math.round((DOOR - z) / M))).padStart(2, "0")}`) }));
  }
  // ---- the bulkhead and the door's housing ---------------------------------------------------------------------------
  {
    const b = shell, [w, h] = NARROW, ow = 1.12, oh = 1.78;      // the opening: 2.24 m by 1.78 m
    for (const s of [1, -1]) { (s > 0 ? rightCut : b).box(w - ow, h, 0.5, s * (w + ow) / 2, h / 2, DOOR, mat(rib)); uvq(s > 0 ? rightCut : b, [s * (w + ow) / 2, h / 2, DOOR - 0.252], [-1, 0, 0], [0, 1, 0], w - ow, h, stripeMat, 0.5, 6); uvq(s > 0 ? rightCut : b, [s * (w + ow) / 2, h / 2, DOOR + 0.252], [1, 0, 0], [0, 1, 0], w - ow, h, stripeMat, 0.5, 6); }
    b.box(2 * w, h - oh, 0.5, 0, (h + oh) / 2, DOOR - 0.0, mat(ribD));
    // above the roof: the housing the slab hangs in, seen only from outside (a cutaway)
    b.box(0.2, SLAB.h + 0.5, 0.6, -1.45, h + SLAB.h / 2, DOOR, mat(ribD)); b.box(3.1, 0.3, 0.7, 0, h + SLAB.h + 0.35, DOOR, mat(rib)); b.box(0.6, 0.5, 0.5, 0, h + SLAB.h + 0.7, DOOR, mat(steel));
    for (const dz of [-0.2, 0.2]) b.box(0.06, SLAB.h + 0.3, 0.06, -1.3, h + SLAB.h / 2, DOOR + dz, mat(steel));
  }
  scene.add(shell.build()); const rightG = right.build(), rightCutG = rightCut.build(); scene.add(rightG, rightCutG);
  // what a cutaway shows where the wall was: the section of the floor and the roof, dark
  const section = (() => { const b = kit.builder(), sec = mat("#061413", { paint: 0 }); for (let z = Math.ceil(CUT0 / M) * M; z < CUT1; z += M) { const [w, h] = sectionAt(z + 2); b.box(0.5, 0.4, M, w + 0.25, -0.2, z + 2, sec); b.box(0.5, 0.4, M, w + 0.25, h + 0.2, z + 2, sec); b.box(0.5, 0.04, M, w + 0.25, 0.0, z + 2, mat(steel, { paint: 0 })); } return b.build(); })(); scene.add(section);

  // ---- the slab: a plate with a hole cut in it for every dent, and each dent built of flat facets in its hole ----------
  const tex = doorTex(), slab = new THREE.Group(), faces = [THREE.FrontSide, THREE.BackSide].map((side) => { const m = new THREE.Mesh(new THREE.BufferGeometry(), mat("#fff", { kind: 10, map: tex, side })); m.frustumCulled = false; slab.add(m); return m; });
  const edge = kit.builder(); edge.box(SLAB.w, 0.1, SLAB.t + 0.06, 0, -SLAB.h / 2 + 0.02, 0, mat("#3a3528")); for (const s of [1, -1]) edge.box(0.08, SLAB.h, SLAB.t + 0.04, s * (SLAB.w / 2 - 0.02), 0, 0, mat("#8d8668")); edge.box(SLAB.w - 0.5, 0.045, SLAB.t + 0.1, 0, -SLAB.h / 2 + 0.105, 0, mat("#ffab2e", { kind: 1 })); slab.add(edge.build());
  scene.add(slab);
  let dentKey = null;
  // A dent is a many-sided pit: a flat floor the shape of what hit it, flat walls up to a rim that stands a little
  // proud of the plate, and round that a skirt back down to the plate, drawn out to a point where the plate buckled.
  // Every facet is flat, so each is one tone and every crease gets its ink line; a point's paint is the paint that was
  // there before the blow, so the stripes and the lettering are dragged in with the plate.
  function dent(list) {
    const key = JSON.stringify(list); if (key === dentKey) return; dentKey = key;
    const pos = [], uv = [], hw = SLAB.w / 2, tri = (a, b, c) => { for (const p of [a, b, c]) { pos.push(p[0], p[1] - SLAB.h / 2, p[2]); uv.push((p[3] + hw) / SLAB.w, p[4] / SLAB.h); } };
    const plate = new THREE.Shape([[-hw, 0], [hw, 0], [hw, SLAB.h], [-hw, SLAB.h]].map((p) => new THREE.Vector2(...p)));
    for (const d of list) {
      const n = 7 + Math.floor(hash(d.seed, 1) * 3), a0 = hash(d.seed, 2) * 6.28, k = d.k ?? 1, spike = [Math.floor(hash(d.seed, 7) * n), Math.floor(hash(d.seed, 8) * n + n / 2) % n];
      const ring = (scale, z, pullTo, jit) => Array.from({ length: n }, (_, i) => { const a = a0 + (i + 0.5 * hash(d.seed, i, 3)) / n * 6.283, r = d.r * (0.8 + 0.4 * hash(d.seed, i, 4)), R = r * scale * (jit && spike.includes(i) ? 1.28 + 0.2 * hash(d.seed, i, 9) : 1);
        const hx = d.x + Math.cos(a) * R, hy = d.y + Math.sin(a) * R, sx = d.x + Math.cos(a) * r * pullTo, sy = d.y + Math.sin(a) * r * pullTo;      // where it is; whose paint it carries
        return [hx, hy, z, sx, sy]; });
      const outer = ring(1.42, 0, 1.42, true).map((p) => [p[0], p[1], 0, p[0], p[1]]), rim = ring(1, -0.11 * d.d * k, 1.08), floor = ring(0.42 - 0.08 * k, d.d * k, 0.62), mid = [d.x, d.y, d.d * k, d.x, d.y];
      plate.holes.push(new THREE.Path(outer.map((p) => new THREE.Vector2(p[0], p[1])).reverse()));
      for (let i = 0; i < n; i++) { const j = (i + 1) % n; tri(outer[i], outer[j], rim[j]); tri(outer[i], rim[j], rim[i]); tri(rim[i], rim[j], floor[j]); tri(rim[i], floor[j], floor[i]); tri(floor[i], floor[j], mid); }
    }
    const flat = new THREE.ShapeGeometry(plate).toNonIndexed().attributes.position.array;
    for (let i = 0; i < flat.length; i += 9) tri(...[0, 3, 6].map((o) => [flat[i + o], flat[i + o + 1], 0, flat[i + o], flat[i + o + 1]]));
    faces.forEach((m, f) => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(f ? uv.map((v, i) => i % 2 ? v : 1 - v) : uv, 2)); g.computeVertexNormals(); m.geometry.dispose(); m.geometry = g; });
  }
  const drones = createDrones(kit, scene), shadows = createShadows(kit, scene, "#04100f");
  // a monitor on a wall bracket (options.monitor; the breakdown): built when first asked for, where the shot says; its screen is blank
  let monitorG = null;
  const monitor = (o) => { if (!o) { if (monitorG) monitorG.visible = false; return; }
    if (!monitorG) { const c = kit.builder(), n = [-o.u[2], 0, o.u[0]], ry = { ry: Math.atan2(n[0], n[2]) }, at = (d, dy = 0) => [o.c[0] - n[0] * d, o.c[1] + dy, o.c[2] - n[2] * d];
      c.box(o.w + 0.16, o.h + 0.16, 0.34, ...at(0.18), mat(bone), ry); c.box(o.w + 0.22, 0.07, 0.4, ...at(0.18, o.h / 2 + 0.1), mat(rustC), ry); c.box(0.1, 0.1, 0.5, ...at(0.55), mat(steel), ry);
      c.quad([o.c[0] + n[0] * 0.006, o.c[1], o.c[2] + n[2] * 0.006], o.u, [0, 1, 0], o.w, o.h, mat("#06120f"));
      monitorG = c.build(); scene.add(monitorG); }
    monitorG.visible = true; };

  function update(cam, frame, sync, opt = {}) {
    const w = driveAll(sync, WIRING, frame, opt.wiring), alert = opt.alert ?? 0.8;
    aim(camera, cam, W / H);
    kit.shared.uCam.value.copy(camera.position); kit.shared.uFrame.value = frame;
    U.uHull.value = clamp(w.lamps, 0, 1.2); U.uWarn.value = clamp(alert * w.flare, 0, 1.2); U.uChase.value = -w.chase; U.uCut.value = opt.cut ? 1 : 0;
    G.screens.value = w.screens;
    const key = (opt.sign?.text ?? "") + "|" + (opt.sign?.small ?? ""); if (!signs.has(key)) signs.set(key, signTex(opt.sign?.text ?? "", opt.sign?.small ?? "")); signMat.uniforms.uMap.value = signs.get(key);
    rightCutG.visible = !opt.cut; section.visible = !!opt.cut;
    if (opt.monitor || monitorG) monitor(opt.monitor);
    const shut = clamp(opt.door ?? 0);
    slab.position.set(0, SLAB.h / 2 + (1 - shut) * (NARROW[1] + 0.02), DOOR); dent(opt.dents ?? []);
    drones.update(opt.drones ?? [], frame, sync, camera, { thrust: w.thrust }); shadows.update(opt.shadows);
    return { scene, camera, wires: w, clear: opt.clear ?? 0x04100f, post: { bloom: 0.75, bloomThreshold: 0.7, shadowTint: [0.0, 0.03, 0.035], ...opt.post } };
  }
  // The light on a figure: under a tube it is in the mint pool, between them in the green dark; the tubes rim it from above.
  function light(p) {
    const lit = Math.abs(((p[2] / M) % 1 + 1) % 1 - 0.5) * M < 0.95 * (0.6 + 0.4 * U.uHull.value);
    return { tint: lit ? [0.98, 1.06, 0.98] : [0.74, 0.9, 0.86], rim: lit ? [0.7, 1.0, 0.85] : [0.4, 0.8, 0.66], from: [0, 1, 0], fogK: kit.shared.uFogK.value * 0.6, fogColor: kit.shared.uFogCol.value.toArray(), gradient: 0.2 };
  }
  return { name: "tunnel", scene, camera, kit, update, light, floorAt: () => 0, WIRING, M, DOOR };
}
