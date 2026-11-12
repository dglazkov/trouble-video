// The machine level: a railed gantry that crosses a hall of heavy machinery, ten metres over it. Rows of pistons pump
// either side, flywheels turn against the walls, a furnace channel burns along the floor under the gantry and lights
// everything from BELOW: undersides are the lit faces, tops are dark, the air is orange low down and black-green up
// in the trusses. Oxblood, iron and rust with yellow hazard paint: no indigo, no neon (that is the corridor's).
// The gantry runs along Z, its deck at y = 0, 2.8 m wide; a portal frame stands over it every 8 m with a lamp and a
// two-faced CRT hung under its beam, and the hall's long walls carry sign boards the size of a house.
//
//   const set = await createGantry(renderer, { width, height });
//   set.update(camera, frame, sync, options) -> { scene, camera, clear, post };   set.light(p) -> the light on a figure
//
// The station plays the song here too (WIRING): the bass drives the machinery (how fast the pistons and flywheels
// go, how hard the furnace burns), the brass the klaxon, the drums the drones' thrusters and the steam.
// Cue options (all optional, plain values for this frame):
//   sign     { text, small }     what every CRT and board says ("" / none: the level's own notice)
//   alert    0..1                beacons and the red sweep
//   drones   [...]               machines/drones.js specs
//   wiring   { name: wire }      replace wires of WIRING
//   shadows  [...]               contact shadows (the stage's)
//   post     { ... }             engine/post.js parameters
import * as THREE from "three";
import { createKit, createShadows, canvasTex, aim, hash, clamp, FX } from "./kit.js";
import { kana, latin, scanlines, hazard, kanaWidth } from "./sign.js";
import { driveAll } from "../engine/sync.js";
import { createDrones } from "../machines/drones.js";

export const GM = 8, Z0 = -72, Z1 = 168, HALF = 1.4, WALL = 26, PIT = -16, ROOF = 11;      // module; the gantry's ends; half its width; walls; floor; roof
export const WIRING = {
  engine: { stem: "bass", mode: "env", floor: 0.3, gain: 1.6 },                     // pistons and flywheels: how fast
  furnace: { stem: "bass", mode: "env", floor: 0.45, gain: 1.1 },                   // how hard the channel burns
  lamps: { stem: "bass", mode: "pulse", decay: 0.25, floor: 0.75, gain: 0.35 },     // the portal lamps and the pools under them
  klaxon: { stem: "brass", mode: "env", gain: 1.0 },                                // beacons, the red sweep
  screens: { stem: "brass", mode: "pulse", decay: 0.2, floor: 0.9, gain: 0.5 },     // CRTs flare
  steam: { stem: "drums", mode: "pulse", decay: 0.5, floor: 0.35, gain: 0.65 },     // vents blow on the drums
  thrust: { stem: "drums", mode: "pulse", decay: 0.15, gain: 1 },                   // drones
};

const CHUNK = `
uniform float uHull, uFurn, uAlarm, uAlarmAng;
float setTone(vec3 W, vec3 N){
  float wob = (vnoise(surf(W, N)*1.3)-0.5)*0.2;
  if(N.y < -0.35) return W.y > 6.0 ? 1.0 : 2.0;                      // undersides catch the furnace
  if(N.y > 0.7){
    if(W.y > -0.3 && W.y < 0.3 && abs(W.x) < 1.6){                   // the deck: a pool under each portal lamp
      float dz = abs(fract(W.z/8.0+0.5)-0.5)*8.0 + wob*1.5;
      return dz < 1.25*(0.6+0.4*uHull) ? 2.0 : (dz < 2.3 ? 1.0 : 0.0);
    }
    return W.y < -11.0 ? 1.0 : 0.0;
  }
  float h = W.y + wob*7.0 - 2.5*(uFurn-0.6);
  return h < -8.5 ? 2.0 : (h < 2.2 ? 1.0 : 0.0);
}
vec3 setExtra(vec3 col, vec3 W, vec3 N, float tone){
  if(W.y < -11.5 && tone > 0.5) col += vec3(0.20,0.07,0.0)*uFurn;    // the glow low down
  if(uAlarm > 0.0){
    float on = step(fract((atan(W.y-2.0, W.x)+uAlarmAng+W.z*0.045)/6.28318), 0.09);
    col = mix(col, col*vec3(1.5,0.5,0.45)+vec3(0.16,0.0,0.02), on*clamp(uAlarm, 0.0, 1.0));
  }
  return col;
}
float setEmit(vec3 W, int flag){
  if(flag == 1){ float b = vnoise(vec2(W.z*0.35+uFrame*0.11, W.x*0.6-uFrame*0.05)); return (0.55+0.75*uFurn)*(b > 0.62 ? 1.3 : (b < 0.3 ? 0.62 : 0.95)); }   // the fire: three flat heats that crawl
  if(flag == 2) return 0.45+0.7*uHull;
  if(flag == 3) return 0.25+1.3*clamp(uAlarm, 0.0, 1.0)*step(0.5, fract(uAlarmAng/3.14159+floor(W.z/8.0)*0.37));
  return 1.0;
}
vec3 setSpecial(vec3 W, vec3 d, vec2 uv){ return vec3(0.0); }`;

// what a CRT says: one word, big, the katakana under it; or the level's own notice
function signTex(text, small) {
  return canvasTex(1024, 384, (c) => {
    const col = text ? "#ffb428" : "#ff7a2a", bg = text ? "#1c0d02" : "#170703";
    c.fillStyle = bg; c.fillRect(0, 0, 1024, 384); c.strokeStyle = col; c.lineWidth = 10; c.strokeRect(18, 18, 988, 348);
    if (text) {
      c.font = 'bold 250px "DejaVu Sans Mono", monospace'; const w = c.measureText(text).width, k = Math.min(1, (small ? 600 : 900) / w);
      c.save(); c.translate(small ? 48 : 512 - w * k / 2, 286); c.scale(k, 1); c.fillStyle = col; c.fillText(text, 0, 0); c.restore();
      if (small) kana(c, small, 1024 - 56 - 76, 52, 76, 12, col, { vertical: true, pitch: 1.0 });
    } else {
      hazard(c, 40, 40, 944, 60, col, bg, 64); kana(c, "キカイ デッキ", 60, 128, 104, 15, col); latin(c, "MACHINE LEVEL 03 // KEEP TO THE GANTRY", 62, 322, 36, col);
    }
    scanlines(c, 1024, 384, 0.4, 8);
  });
}

export async function createGantry(renderer, o = {}) {
  const W = o.width ?? 1920, H = o.height ?? 1080;
  const U = { uHull: { value: 1 }, uFurn: { value: 1 }, uAlarm: { value: 0 }, uAlarmAng: { value: 0 } };
  const kit = createKit(CHUNK, U), { mat } = kit;
  kit.shared.uFogCol.value.setRGB(0.30, 0.11, 0.10); kit.shared.uFogTop.value.setRGB(0.04, 0.08, 0.10); kit.shared.uFogH.value.set(1.5, 9); kit.shared.uFogDeep.value.setRGB(0.80, 0.30, 0.08); kit.shared.uFogK.value = 0.011;
  kit.shared.uKey.value.set(0.25, -0.9, 0.35).normalize(); kit.shared.uTintLit.value.setRGB(1.36, 1.0, 0.62); kit.shared.uTintMid.value.setRGB(0.72, 0.52, 0.56); kit.shared.uTintShade.value.setRGB(0.25, 0.29, 0.45); kit.shared.uRim.value.setRGB(1.0, 0.55, 0.2);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(50, W / H, 0.08, 500);
  const G = { screens: { value: 1 } };
  const iron = "#4d4860", ironD = "#2b2838", teal = "#2f6264", ox = "#7a3136", rust = "#a8562c", haz = "#f2b21c", cream = "#cfc4a2", dark = "#1b1826";
  const stripes = canvasTex(256, 64, (c) => hazard(c, 0, 0, 256, 64, "#f2b21c", "#17141f", 64), { repeat: true });
  const grate = canvasTex(256, 256, (c) => { c.fillStyle = "#3b3648"; c.fillRect(0, 0, 256, 256); c.fillStyle = "#231f2e"; for (let y = 6; y < 256; y += 16) c.fillRect(10, y, 236, 7); c.fillStyle = "#4f4960"; c.fillRect(0, 0, 256, 5); c.fillRect(0, 0, 5, 256); c.fillRect(124, 0, 8, 256); }, { repeat: true });
  const stripeMat = mat("#fff", { kind: 10, map: stripes }), grateMat = mat("#fff", { kind: 10, map: grate });
  const signMat = mat("#fff", { kind: 2, map: signTex("", ""), gain: G.screens }), signs = new Map();
  const uvq = (b, c, u, v, w, h, m, ru, rv) => { b.quad(c, u, v, w, h, m); const list = b.bins.get(m), uv = list[list.length - 1].attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * ru, uv.getY(i) * rv); };

  // ---- everything that does not move, in one build ----------------------------------------------------------------
  const b = kit.builder();
  for (let z = Z0; z <= Z1; z += GM) {
    const zc = z + GM / 2, i = Math.round(z / GM);
    // the deck: grating between two edge beams in hazard stripes, a kick plate, posts and two rails each side
    uvq(b, [0, 0, zc], [1, 0, 0], [0, 0, -1], 2 * HALF, GM, grateMat, 2, 6);
    b.box(2 * HALF, 0.1, GM, 0, -0.06, zc, mat(ironD));
    for (const s of [1, -1]) {
      b.box(0.14, 0.34, GM, s * (HALF + 0.03), -0.17, zc, mat(ironD));
      uvq(b, [s * (HALF + 0.105), -0.17, zc], [0, 0, s], [0, 1, 0], GM, 0.3, stripeMat, 6, 1);
      b.box(0.03, 0.13, GM, s * HALF, 0.065, zc, mat(rust));
      for (let k = 0; k < 4; k++) b.box(0.07, 1.1, 0.07, s * HALF, 0.55, z + k * 2 + 1, mat(iron));
      b.cyl(0.04, GM, s * HALF, 1.1, zc, mat(haz), "z", 6); b.cyl(0.028, GM, s * HALF, 0.6, zc, mat(iron), "z", 6);
      // the portal's leg: from the pit floor up past the deck to the beam
      b.box(0.34, 3.6 - PIT, 0.34, s * (HALF + 0.42), (3.6 + PIT) / 2, z, mat(ox, { seam: [0.34, 1.6] }));
      b.box(0.5, 0.3, 0.5, s * (HALF + 0.42), -0.5, z, mat(ironD)); b.box(0.24, 0.1, 0.9, s * (HALF + 0.2), -0.25, z, mat(ironD));
      for (const d of [1, -1]) b.box(0.12, 0.12, 4.6, s * (HALF + 0.42), -2.2, z + d * 1.9, mat(iron), { rx: d * 0.95 });       // knee braces under the deck
      b.cyl(0.09, GM, s * (HALF + 0.42), 3.86, zc, mat(s > 0 ? rust : teal), "z", 8); b.cyl(0.05, GM, s * (HALF + 0.2), 3.95, zc, mat(dark), "z", 6);
      b.box(0.16, 0.2, 0.2, s * (HALF + 0.2), 2.5, z, mat(dark)); b.box(0.1, 0.14, 0.14, s * (HALF + 0.11), 2.5, z, mat("#ff3030", { kind: 1, flag: 3 }));
    }
    b.box(2 * HALF + 1.3, 0.34, 0.34, 0, 3.6, z, mat(ox)); uvq(b, [0, 3.6, z + 0.172], [1, 0, 0], [0, 1, 0], 2 * HALF + 0.5, 0.3, stripeMat, 4, 1); uvq(b, [0, 3.6, z - 0.172], [-1, 0, 0], [0, 1, 0], 2 * HALF + 0.5, 0.3, stripeMat, 4, 1);
    b.box(1.3, 0.12, 0.7, 0, 3.38, z, mat(ironD)); b.box(1.1, 0.04, 0.5, 0, 3.31, z, mat("#fff1d0", { kind: 1, flag: 2 }));
    // the CRT under the beam, a face each way, off to one side so the lamp is clear of it
    const sx = (i % 2 ? 1 : -1) * 0.0;
    b.box(1.9, 0.78, 0.34, sx, 2.86, z + 1.0, mat(cream)); b.box(1.96, 0.08, 0.4, sx, 3.27, z + 1.0, mat(rust));
    for (const d of [1, -1]) { b.quad([sx, 2.86, z + 1.0 + d * 0.175], [d, 0, 0], [0, 1, 0], 1.72, 0.64, signMat); b.cyl(0.03, 0.5, sx + d * 0.7, 3.4, z + 1.0, mat(dark), "y", 5); }
    // roof truss and what hangs from it
    b.box(2 * WALL, 0.5, 0.5, 0, ROOF - 1, z, mat(dark, { paint: 0 })); for (let k = -5; k <= 5; k++) if (k) b.box(0.2, 1.6, 0.2, k * 4.6, ROOF - 0.2, z, mat(dark, { paint: 0 }), { rz: (k % 2 ? 0.6 : -0.6) });
    for (const s of [1, -1]) {
      const hx = s * (5.5 + 5 * hash(i, s, 1)), hl = 2 + 5 * hash(i, s, 2); b.box(0.05, hl, 0.05, hx, ROOF - 1.2 - hl / 2, z + 3, mat(dark, { paint: 0 })); b.box(0.5, 0.4, 0.3, hx, ROOF - 1.3 - hl, z + 3, mat(haz));
      // the walls: plate, a duct and a service ledge, pipes, a furnace mouth, every fourth module a sign board
      b.box(0.6, ROOF - PIT, GM, s * (WALL + 0.3), (ROOF + PIT) / 2, zc, mat("#3d3142", { seam: [4, 3.2], seamMode: 2 }));
      b.cyl(1.1, GM, s * (WALL - 1.1), 7.2, zc, mat(teal, { seam: [2, 8] }), "z", 12); b.cyl(1.22, 0.5, s * (WALL - 1.1), 7.2, z, mat(rust), "z", 12);
      b.box(1.5, 0.16, GM, s * (WALL - 0.75), -2.0, zc, mat(ironD)); b.cyl(0.04, GM, s * (WALL - 1.5), -0.9, zc, mat(haz), "z", 5); for (let k = 0; k < 2; k++) b.box(0.06, 1.1, 0.06, s * (WALL - 1.5), -1.45, z + k * 4 + 2, mat(iron));
      for (const [px, pr, pc] of [[0.5, 0.3, rust], [1.15, 0.18, cream]]) b.cyl(pr, ROOF - PIT, s * (WALL - px), (ROOF + PIT) / 2, z + 5.5 + pr * 3, mat(pc), "y", 8);
      if (((i % 2) + 2) % 2 === 0) {         // a furnace mouth in the wall's foot, hooded
        b.box(0.3, 3.2, 4.4, s * (WALL - 0.1), PIT + 2.0, zc, mat("#ffb24a", { kind: 1, flag: 1 })); b.box(1.6, 0.7, 5.4, s * (WALL - 0.7), PIT + 4.0, zc, mat(ox)); for (const d of [1, -1]) b.box(1.0, 4.0, 0.5, s * (WALL - 0.5), PIT + 2.0, zc + d * 2.5, mat(ironD));
      }
      if (((i % 4) + 4) % 4 === 1) { b.box(0.5, 5.2, 13.0, s * (WALL - 0.4), 2.2, zc, mat(dark)); b.quad([s * (WALL - 0.66), 2.2, zc], [0, 0, s], [0, 1, 0], 12.2, 4.56, signMat); b.box(0.6, 0.3, 13.4, s * (WALL - 0.4), 4.95, zc, mat(haz)); }
      // the cylinder blocks the pistons work in: two rows a side
      for (const [px, r] of [[7.2, 1.7], [14.5, 2.2]]) for (const dz of [2, 6]) {
        if (px > 10 && dz === 6) continue;
        const x = s * px, zz = z + dz, top = px > 10 ? -9.5 : -11;
        b.cyl(r, top - PIT, x, (top + PIT) / 2, zz, mat(iron, { seam: [1.2, 2.5] }), "y", 14); b.cyl(r + 0.16, 0.5, x, top - 0.25, zz, mat(haz), "y", 14); b.cyl(r + 0.12, 0.4, x, PIT + 2.2, zz, mat(ox), "y", 14);
      }
      b.cyl(0.5, GM, s * 10.8, PIT + 1.2, zc, mat(rust), "z", 8); b.box(4.6, 0.3, 0.6, s * 10.8, PIT + 4.5, z + 2, mat(ironD));
    }
    // the pit floor and the furnace channel under the gantry
    b.quad([0, PIT, zc], [1, 0, 0], [0, 0, -1], 2 * WALL, GM, mat("#3a2c36", { seam: [4, 4], seamMode: 2 }));
    b.quad([0, PIT + 0.05, zc], [1, 0, 0], [0, 0, -1], 5.2, GM, mat("#ffb24a", { kind: 1, flag: 1 }));
    for (const s of [1, -1]) { b.box(0.7, 0.9, GM, s * 3.0, PIT + 0.45, zc, mat(ironD)); uvq(b, [s * 3.0, PIT + 0.905, zc], [1, 0, 0], [0, 0, -1], 0.7, GM, stripeMat, 1, 8); }
    for (const dz of [1, 5]) b.box(5.6, 0.25, 0.5, 0, PIT + 0.8, z + dz, mat(dark, { paint: 0 }));
  }
  scene.add(b.build());

  // ---- what moves ---------------------------------------------------------------------------------------------------
  const pistons = [], wheels = [], rods = [];
  const pistonProto = (r) => { const p = kit.builder(); p.cyl(r * 0.36, 9, 0, -4.5, 0, mat(cream), "y", 10); p.cyl(r * 0.92, 1.3, 0, 0.65, 0, mat(ox), "y", 14); p.cyl(r * 0.98, 0.3, 0, 1.2, 0, mat(haz), "y", 14); p.cyl(r * 0.5, 0.5, 0, 1.6, 0, mat(ironD), "y", 10); return p.build(); };
  const protoS = pistonProto(1.7), protoL = pistonProto(2.2);
  const wheelProto = (() => { const p = kit.builder(), R = 5.2;
    p.add(new THREE.TorusGeometry(R, 0.42, 6, 36).rotateY(Math.PI / 2), mat(teal)); p.add(new THREE.TorusGeometry(R - 0.5, 0.2, 5, 36).rotateY(Math.PI / 2), mat(ironD));
    for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3; p.box(0.3, 0.34, 2 * R - 0.6, 0, 0, 0, mat(k % 3 ? iron : haz), { rx: a }); }
    p.cyl(0.9, 0.9, 0, 0, 0, mat(ox), "x", 14); p.cyl(0.45, 1.3, 0, 0, 0, mat(cream), "x", 10); p.cyl(0.5, 1.0, 0.4, 0, R * 0.62, mat(haz), "x", 10);      // the crank pin
    p.box(0.5, 1.4, 2.2, 0, 0, -R + 1.0, mat(ox));                                                                                                       // a counterweight
    return p.build(); })();
  const rodProto = (() => { const p = kit.builder(); p.box(0.3, 0.4, 9.0, 0, 0, 4.5, mat(cream)); p.cyl(0.42, 0.5, 0, 0, 9.0, mat(ironD), "x", 10); return p.build(); })();
  for (let z = Z0; z <= Z1; z += GM) for (const s of [1, -1]) {
    const i = Math.round(z / GM);
    for (const [px, proto, top, amp] of [[7.2, protoS, -11, 2.6], [14.5, protoL, -9.5, 3.2]]) for (const dz of [2, 6]) {
      if (px > 10 && dz === 6) continue;
      const g = proto.clone(); g.position.set(s * px, top, z + dz); scene.add(g); pistons.push({ g, top, amp, ph: hash(i, s, px, dz) * 6.28 + (dz === 6 ? Math.PI : 0) });
    }
    if (((i % 2) + 2) % 2 === 1) {
      const g = wheelProto.clone(); g.position.set(s * 20.6, -7.5, z + 4); scene.add(g); const r = rodProto.clone(); scene.add(r);
      wheels.push({ g, r, s, at: [s * 20.6, -7.5, z + 4], ph: hash(i, s, 7) * 6.28 });
    }
  }
  // steam: flat two-tone puffs that rise from between the cylinder blocks and thin out
  const puffTex = canvasTex(128, 128, (c) => { c.fillStyle = "#fff"; for (const [x, y, r] of [[64, 70, 40], [38, 60, 26], [92, 62, 28], [60, 40, 28]]) { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); } c.fillStyle = "#d9b9a8"; for (const [x, y, r] of [[70, 84, 26], [44, 72, 16], [94, 74, 18]]) { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); } });
  const puffs = Array.from({ length: 18 }, () => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), null); m.layers.set(FX); m.renderOrder = 9; m.frustumCulled = false; scene.add(m); return m; });
  const drones = createDrones(kit, scene), shadows = createShadows(kit, scene, "#120a18");
  // how far the engine has turned by frame f: the bass env summed, so the machinery speeds and slows with it and is
  // still a pure function of the frame
  const turned = [0];
  const engineAt = (sync, f, wire) => { f = Math.max(0, Math.round(f)); for (let k = turned.length; k <= f; k++) turned[k] = turned[k - 1] + sync.drive(wire, k) / sync.fps; return turned[f]; };

  function update(cam, frame, sync, opt = {}) {
    const w = driveAll(sync, WIRING, frame, opt.wiring), t = frame / sync.fps, alert = opt.alert ?? 0;
    aim(camera, cam, W / H);
    kit.shared.uCam.value.copy(camera.position); kit.shared.uFrame.value = frame;
    U.uHull.value = clamp(w.lamps, 0, 1.2); U.uFurn.value = clamp(w.furnace, 0, 1.4); U.uAlarm.value = clamp(alert * 0.7 + w.klaxon * (alert > 0 ? 0.7 : 0), 0, 1.1); U.uAlarmAng.value = t * 4.4;
    G.screens.value = w.screens;
    const key = (opt.sign?.text ?? "") + "|" + (opt.sign?.small ?? ""); if (!signs.has(key)) signs.set(key, signTex(opt.sign?.text ?? "", opt.sign?.small ?? "")); signMat.uniforms.uMap.value = signs.get(key);
    const e = engineAt(sync, frame, opt.wiring?.engine ?? WIRING.engine) * 2.6;
    for (const p of pistons) p.g.position.y = p.top + p.amp * (0.5 + 0.5 * Math.sin(e + p.ph));
    for (const wl of wheels) {
      const a = e * 0.8 + wl.ph; wl.g.rotation.x = a;
      // the rod from the crank pin toward the gantry, rocking as the wheel turns
      const pin = [wl.at[0] - wl.s * 0.9, wl.at[1] - Math.sin(a) * 3.22, wl.at[2] + Math.cos(a) * 3.22];
      wl.r.position.set(...pin); wl.r.rotation.set(0, 0, 0); wl.r.lookAt(wl.at[0] - wl.s * 8.6, -9.2, wl.at[2]);
    }
    puffs.forEach((m, i) => {
      const period = 52 + 30 * hash(i, 3), age = ((frame + hash(i, 5) * 400) % period) / period, n = Math.floor((frame + hash(i, 5) * 400) / period);
      const s = hash(i, 1) > 0.5 ? 1 : -1, zb = Math.round((cam.pos[2] + (hash(i, n, 2) - 0.4) * 70) / GM) * GM + 4;
      m.position.set(s * (15.5 + 4 * hash(i, n, 4)), -10 + age * 13, zb); m.quaternion.copy(camera.quaternion);
      const k = (2.5 + 5.5 * age) * (0.7 + 0.6 * hash(i, 6)); m.scale.set(k * 1.25, k, 1); const al = Math.round(clamp(w.steam * 0.4 * Math.sin(Math.PI * Math.min(1, age * 1.15))) * 8) / 8; m.visible = al > 0; m.material = mat("#ffd9b0", { kind: 7, flag: 2, map: puffTex, alpha: al, fog: 0.5 });
    });
    drones.update(opt.drones ?? [], frame, sync, camera, { thrust: w.thrust }); shadows.update(opt.shadows);
    return { scene, camera, wires: w, clear: opt.clear ?? 0x0a1014, post: { bloom: 1.0, bloomThreshold: 0.6, shadowTint: [0.035, 0.0, 0.03], ...opt.post } };
  }
  // The light on a figure on the gantry: the furnace from below (a hot rim on every edge that faces down), the hall's
  // dark above. One light the whole length: nothing to strobe as they run.
  const light = () => ({ tint: [0.98, 0.88, 0.86], rim: [1.0, 0.62, 0.26], from: [0, -1, 0], fogK: kit.shared.uFogK.value * 0.5, fogColor: kit.shared.uFogCol.value.toArray(), gradient: 0 });
  const floorAt = (x, z) => Math.abs(x) < HALF + 0.1 ? 0 : null;
  return { name: "gantry", scene, camera, kit, update, light, floorAt, WIRING, GM };
}
