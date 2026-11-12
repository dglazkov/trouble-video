// The stairwell: a service shaft off the atrium, eight flights deep. A bolted steel stair tower stands free in a
// concrete shaft (sets/stairplan.js has its numbers): open treads zig-zagging down between landings, pipe handrails,
// and beside it an open lift cage with a folding gate, running in its own frame. Olive concrete and bone-coloured
// steel, yellow nosings and rails, rust pipes; daylight from the atrium falls in slabs through slots in the right-hand
// wall, and every level has its number on the back wall, a light bar and a beacon. Nothing like the vault (black teal,
// phosphor), the corridor (indigo, cyan) or the market (amber).
//
//   const set = await createStairwell(renderer, { width, height });
//   const { scene, camera, clear, post } = set.update(camera, frame, sync, options);
//   set.light([x, y, z], options) -> the light a figure there is in;  set.floorAt(x, z, y) -> the tread or deck under them
//
// Cue options (all optional; every one is a plain value for this frame):
//   lift     { y, gate, lamp, ding }   the cage: its floor's height; how far shut its gate is (1 shut, 0 folded back);
//                                      the lamp over the gate at the level it is at (0..1); frames since it rang (the
//                                      lamp flares), or -1
//   alert    0..1                      beacons and the red sweep (the klaxon wire adds to it), level by level from the top
//   front    true                      build the shaft's front wall too (seen from above; from the side it is cut away)
//   valueFrom y                        the height the shaft's value steps are counted down from (default: the camera's)
//   drones   [...]                     machines/drones.js specs
//   wiring   { name: wire }            replace wires of WIRING for this frame
//   markers, shadows, post, clear      as in the other sets
import * as THREE from "three";
import { createKit, createShadows, canvasTex, aim, hash, clamp, lerp, FX } from "./kit.js";
import { kana, latin, hazard, chevrons, kanaWidth, scanlines } from "./sign.js";
import { driveAll } from "../engine/sync.js";
import { createDrones } from "../machines/drones.js";
import { createMarkers } from "./markers.js";
import { H, STEPS, RISE, TREAD, X0, X1, FLIGHTS, BOTTOM, NEAR, FAR, LANE, RAIL, LEFT, RIGHT, LIFT, BALCONY, WALK, BACK, SHAFT, lane, dir, railZ, floorAt } from "./stairplan.js";
export { floorAt };

// The station plays the song: each system is one wire from a stem (engine/sync.js drive()).
export const WIRING = {
  hull: { stem: "bass", mode: "env", floor: 0.62, gain: 1.0 },                     // the light bars on every level, and the pools under them
  klaxon: { stem: "brass", mode: "env", gain: 1.5 },                               // beacons and the red sweep
  ignite: { stem: "brass", mode: "count", gain: 1 },                               // one more level's beacon comes on with each note of the brass
  sky: { stem: "strings", mode: "env", floor: 0.8, gain: 0.6 },                    // the atrium's light in the slots
  twinkle: { stem: "strings", mode: "count", gain: 1 },                            // and its far windows, which change on each note
  hum: { stem: "synth", mode: "env", floor: 0.5, gain: 0.8 },                      // the lift's lamps and the terminal under the stairs
  thrust: { stem: "drums", mode: "pulse", decay: 0.15, gain: 1 },                  // drones
};

const CHUNK = `
uniform float uHull, uAlarm, uAlarmAng, uAlarmLevels, uSky, uTwinkle, uValueY, uLampY, uLamp;
// daylight through the slots in the right-hand wall: the point is lit if the ray back up the light reaches a slot
bool sun(vec3 W){
  float t = 6.2-W.x; if(t < 0.02) return false;
  vec2 q = vec2(W.y+0.5*t, W.z+0.32*t); float fy = fract(-q.x/3.0);
  bool slot = (q.y > -5.7 && q.y < -4.3) || (q.y > -2.5 && q.y < -1.1) || (q.y > 1.0 && q.y < 2.4);
  return slot && fy > 0.14 && fy < 0.7;
}
float setTone(vec3 W, vec3 N){
  float wob = (vnoise(surf(W, N)*1.3)-0.5);
  if(N.y > 0.7) return sun(W) ? 2.0 : 1.0;
  if(N.y < -0.5) return 0.0;
  if(W.z < -6.9){                                         // the back wall: a pool under each level's light bar
    float fy = fract(-W.y/3.0)*3.0, dx = abs(W.x-1.2)+wob*0.5;
    if(sun(W)) return 2.0;
    return fy > 0.62 && fy < 0.62+1.5*uHull && dx < 2.3-0.5*(fy-0.62) ? 2.0 : (fy < 0.5 ? 0.0 : 1.0);
  }
  if(N.x > 0.5) return 2.0;                               // what faces the slots
  if(N.x < -0.5) return W.x > 6.0 ? 1.0 : 0.0;
  return N.z > 0.3 ? 1.0 : 0.0;
}
vec3 setExtra(vec3 col, vec3 W, vec3 N, float tone){
  float dy = uValueY-W.y;
  col *= dy > 14.0 ? 0.48 : (dy > 9.0 ? 0.62 : (dy > 4.6 ? 0.8 : 1.0));          // value steps down the shaft
  if(tone > 1.5 && sun(W)) col = col*1.06+vec3(0.07,0.13,0.16)*uSky;
  if(W.z < -6.9 || W.x < -8.5 || W.x > 6.1) col = mix(col, vec3(0.3,0.36,0.3), 0.34)*0.86;      // the shaft's walls sit a step behind the tower
  return col;
}
float setEmit(vec3 W, int flag){
  if(flag == 0) return 1.0;
  if(flag == 1) return 0.25+0.95*uHull;                                            // light bars
  if(flag == 3){ float m = floor(-W.y/3.0+0.9); return 0.16+1.5*clamp(uAlarm, 0.0, 1.0)*step(m, uAlarmLevels-0.5)*step(0.4, fract(uAlarmAng/3.14159+m*0.37)); }   // beacons
  if(flag == 4) return 0.2+1.6*uLamp*step(abs(W.y-uLampY), 1.2);                     // the lamp over the lift's gate, at the level the cage is at
  if(flag == 5) return 0.5+0.5*uHull;
  return 1.0;
}
// the slots: the atrium outside, far off in its haze (decks as pale bands, a few windows)
vec3 setSpecial(vec3 W, vec3 d, vec2 uv){
  float y = W.y*0.5+W.z*0.07;
  vec3 c = mix(vec3(0.63,0.84,0.9), vec3(0.9,0.97,0.94), 0.5+0.5*sin(W.y*0.21+1.0));
  float band = step(0.72, fract(y)); c = mix(c, c*vec3(0.8,0.88,0.94), band*0.75);
  vec2 g = floor(vec2(W.z*5.0, y)*vec2(1.0, 1.0)); float h = hash(g+floor(uTwinkle)*0.37);
  if(band > 0.5 && h > 0.78) c = mix(c, vec3(1.0,0.93,0.66), 0.8);
  return c*(0.82+0.3*uSky);
}`;

function textures() {
  const T = {};
  // a level's mark on the back wall: its number, large, and what the level is
  const names = ["ガントリー", "ハイカン", "デンセン", "ポンプ", "レイキャク", "ソウコ", "キカイ", "タンク", "サイカソウ"];      // the bottom level: "saikasou", lowest level (kasou alone is also the word for a cremation)
  T.levels = names.map((n, m) => canvasTex(1024, 384, (c) => {
    latin(c, `S${m}`, 20, 300, 330, "#fff"); c.fillStyle = "#fff"; c.fillRect(470, 60, 14, 264);
    kana(c, n, 520, 70, n.length > 4 ? 92 : 120, n.length > 4 ? 14 : 18, "#fff"); latin(c, `SHAFT 7 // LEVEL ${String(m).padStart(2, "0")}`, 522, 300, 44, "#fff");
  }));
  T.stairs = canvasTex(Math.ceil(kanaWidth("カイダン", 104) + 28), 128, (c) => kana(c, "カイダン", 14, 12, 104, 17, "#fff"));
  T.down = canvasTex(256, 512, (c) => { c.save(); c.translate(128, 256); c.rotate(Math.PI / 2); chevrons(c, -240, -100, 480, 200, 3, 38, "#fff"); c.restore(); });
  T.hazard = canvasTex(256, 64, (c) => hazard(c, 0, 0, 256, 64, "#f0b81e", "#1c1d16", 64), { repeat: true });
  // the cage's sides: a grille of flat bars
  T.grille = canvasTex(256, 256, (c) => { c.strokeStyle = "#fff"; c.lineWidth = 9; for (let i = -4; i <= 8; i++) { c.beginPath(); c.moveTo(i * 64, 0); c.lineTo(i * 64 + 256, 256); c.stroke(); c.beginPath(); c.moveTo(i * 64, 0); c.lineTo(i * 64 - 256, 256); c.stroke(); } c.lineWidth = 16; c.strokeRect(0, 0, 256, 256); }, { repeat: true });
  // decks: a grating
  T.grate = canvasTex(256, 256, (c) => { c.fillStyle = "#bdb694"; c.fillRect(0, 0, 256, 256); c.fillStyle = "#8f8a6c"; for (let i = 0; i < 8; i++) c.fillRect(0, i * 32 + 10, 256, 12); c.fillStyle = "#a39d7c"; for (let i = 0; i < 4; i++) c.fillRect(i * 64 + 26, 0, 10, 256); }, { repeat: true });
  // the floor of the shaft: a slab, 1024 px for the shaft's 14.8 x 11.6 m
  T.floor = canvasTex(2048, 1600, (c) => {
    const sx = 2048 / (SHAFT.x1 - SHAFT.x0), sz = 1600 / (SHAFT.z1 - SHAFT.z0), X = (x) => (x - SHAFT.x0) * sx, Z = (z) => (z - SHAFT.z0) * sz;
    c.fillStyle = "#55604a"; c.fillRect(0, 0, 2048, 1600);
    for (let i = 0; i < 9; i++) for (let j = 0; j < 7; j++) { const h = hash(i, j, 3); if (h > 0.3 && h < 0.72) continue; c.fillStyle = h <= 0.3 ? "#4c5642" : "#5e6a52"; c.fillRect(i * 228, j * 229, 228, 229); }
    c.strokeStyle = "#39412f"; c.lineWidth = 5; for (let i = 0; i <= 9; i++) { c.beginPath(); c.moveTo(i * 228, 0); c.lineTo(i * 228, 1600); c.stroke(); } for (let j = 0; j <= 7; j++) { c.beginPath(); c.moveTo(0, j * 229); c.lineTo(2048, j * 229); c.stroke(); }
    hazard(c, X(LIFT.x0 - 0.1), Z(LIFT.z1), (LIFT.x1 - LIFT.x0 + 0.2) * sx, 0.34 * sz, "#f0b81e", "#1c1d16", 52);
    c.strokeStyle = "#d8d2b0"; c.lineWidth = 12; c.strokeRect(X(-4.2), Z(1.9), 6.6 * sx, 2.3 * sz);
    c.save(); c.translate(X(-0.9), Z(3.05)); latin(c, "S8", -150, 60, 170, "#d8d2b0"); kana(c, "サイカソウ", 84, -34, 66, 10, "#d8d2b0"); c.restore();
    c.save(); c.translate(X(-3.5), Z(-4.2)); c.rotate(-Math.PI / 2); chevrons(c, -200, -70, 400, 140, 3, 26, "#d8d2b0"); c.restore();
    for (let k = 0; k < 16; k++) { c.fillStyle = "rgba(30,36,24,0.42)"; c.beginPath(); c.ellipse(hash(k, 1) * 2048, hash(k, 2) * 1600, 30 + hash(k, 3) * 90, 10 + hash(k, 4) * 22, hash(k, 5) * 3, 0, 7); c.fill(); }
  });
  // an old terminal's screen, under the stairs
  T.term = canvasTex(256, 192, (c) => { c.fillStyle = "#06331f"; c.fillRect(0, 0, 256, 192); for (let i = 0; i < 7; i++) { c.fillStyle = i === 2 ? "#ffb428" : "#5dffa8"; c.fillRect(18, 20 + i * 22, 40 + hash(i, 7) * 170, 9); } scanlines(c, 256, 192, 0.35, 6); });
  return T;
}

export async function createStairwell(renderer, o = {}) {
  const W = o.width ?? 1920, Hh = o.height ?? 1080;
  const U = { uHull: { value: 1 }, uAlarm: { value: 0 }, uAlarmAng: { value: 0 }, uAlarmLevels: { value: 9 }, uSky: { value: 1 }, uTwinkle: { value: 0 }, uValueY: { value: 0 }, uLampY: { value: 99 }, uLamp: { value: 0 } };
  const kit = createKit(CHUNK, U), { shared } = kit, T = textures(), mat = (c, o) => kit.mat(c, o);
  shared.uFogCol.value.setRGB(0.1, 0.13, 0.11); shared.uFogTop.value.setRGB(0.1, 0.13, 0.11); shared.uFogDeep.value.setRGB(0.1, 0.13, 0.11); shared.uFogK.value = 0.013;
  shared.uTintLit.value.setRGB(1.12, 1.1, 0.98); shared.uTintMid.value.setRGB(0.74, 0.78, 0.7); shared.uTintShade.value.setRGB(0.4, 0.46, 0.44); shared.uRim.value.setRGB(0.75, 0.92, 1.0);
  shared.uKey.value.set(0.8, 0.5, 0.3).normalize();
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(50, W / Hh, 0.08, 500);
  const wall = "#7c8760", wall2 = "#6b7654", band = "#cfc8a4", steel = "#c6bf9c", steel2 = "#9a9478", dark = "#2f3a36", iron = "#44524c", yellow = "#f0b81e", rust = "#a9552f", teal = "#3f8f86", brass = "#b89544";
  const b = kit.builder(), X = [1, 0, 0], Y = [0, 1, 0], Z = [0, 0, 1], TOP = 15, DEPTH = TOP - BOTTOM;
  const rod = (bb, a, c, r, m, seg = 6) => { const A = new THREE.Vector3(...a), C = new THREE.Vector3(...c), d = C.clone().sub(A), len = d.length(); bb.add(new THREE.CylinderGeometry(r, r, len, seg), m, new THREE.Matrix4().compose(A.clone().add(C).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()), new THREE.Vector3(1, 1, 1))); };
  // a pipe rail between two points at deck height: the handrail, a mid rail, and posts
  const rail = (bb, a, c, o = {}) => {
    const n = Math.max(1, Math.round(Math.hypot(c[0] - a[0], c[2] - a[2]) / 1.2)), up = (p, h) => [p[0], p[1] + h, p[2]];
    rod(bb, up(a, RAIL), up(c, RAIL), 0.035, mat(yellow), 7); rod(bb, up(a, RAIL * 0.52), up(c, RAIL * 0.52), 0.022, mat(steel2), 5);
    for (let i = o.open ? 1 : 0; i <= n; i++) { const p = a.map((v, j) => lerp(v, c[j], i / n)); rod(bb, p, up(p, RAIL), 0.026, mat(steel2), 5); }
  };

  // ---- the shaft ---------------------------------------------------------------------------------------------------
  const wm = mat(wall, { seam: [1.85, 1.5], seamMode: 2 }), wm2 = mat(wall2, { seam: [1.85, 1.5], seamMode: 2 }), cy = (TOP + BOTTOM) / 2;
  b.box(SHAFT.x1 - SHAFT.x0 + 1, DEPTH, 0.5, (SHAFT.x0 + SHAFT.x1) / 2, cy, BACK - 0.25, wm);
  b.box(0.5, DEPTH, SHAFT.z1 - SHAFT.z0, SHAFT.x0 - 0.25, cy, (SHAFT.z0 + SHAFT.z1) / 2, wm2); b.box(0.5, DEPTH, SHAFT.z1 - SHAFT.z0, SHAFT.x1 + 0.25, cy, (SHAFT.z0 + SHAFT.z1) / 2, wm2);
  b.quad([(SHAFT.x0 + SHAFT.x1) / 2, BOTTOM, (SHAFT.z0 + SHAFT.z1) / 2], X, [0, 0, -1], SHAFT.x1 - SHAFT.x0, SHAFT.z1 - SHAFT.z0, mat("#fff", { kind: 10, map: T.floor }));
  b.box(SHAFT.x1 - SHAFT.x0 + 1, 0.4, 14, (SHAFT.x0 + SHAFT.x1) / 2, BOTTOM - 0.21, SHAFT.z1 + 7, mat("#4c5642", { seam: [1.85, 1.85], seamMode: 2 }));      // the floor goes on toward us, where the front wall is cut away
  const front = new THREE.Mesh(new THREE.BoxGeometry(SHAFT.x1 - SHAFT.x0 + 1, DEPTH, 0.5), wm); front.position.set((SHAFT.x0 + SHAFT.x1) / 2, cy, SHAFT.z1 + 0.25); front.frustumCulled = false; scene.add(front);
  for (let m = 0; m <= FLIGHTS; m++) {
    const y = -m * H;
    // the back wall: a pale band with the level's mark, a light bar, a beacon, a junction box
    b.box(SHAFT.x1 - SHAFT.x0, 0.9, 0.06, (SHAFT.x0 + SHAFT.x1) / 2, y + 1.55, BACK + 0.03, mat(band)); b.box(SHAFT.x1 - SHAFT.x0, 0.07, 0.08, (SHAFT.x0 + SHAFT.x1) / 2, y + 1.07, BACK + 0.04, mat(rust)); b.box(SHAFT.x1 - SHAFT.x0, 0.05, 0.08, (SHAFT.x0 + SHAFT.x1) / 2, y + 2.03, BACK + 0.04, mat(dark));
    b.quad([0.1, y + 1.55, BACK + 0.07], X, Y, 2.1, 0.79, mat(rust, { kind: 4, map: T.levels[m] }));
    b.box(3.0, 0.2, 0.16, 1.2, y + 2.42, BACK + 0.1, mat(dark)); b.box(2.8, 0.1, 0.1, 1.2, y + 2.36, BACK + 0.16, mat("#f1ffdc", { kind: 1, flag: 1, fog: 0.4 }));
    b.box(0.3, 0.2, 0.2, -1.5, y + 2.45, BACK + 0.12, mat(dark)); b.cyl(0.13, 0.22, -1.5, y + 2.24, BACK + 0.14, mat("#ff3a30", { kind: 1, flag: 3, fog: 0.4 }), "y", 10);
    b.box(0.7, 0.9, 0.24, 3.6, y + 0.6, BACK + 0.12, mat(steel2)); b.box(0.5, 0.12, 0.26, 3.6, y + 0.85, BACK + 0.13, mat(yellow));
    for (let i = 0; i < 3; i++) b.box(0.08, 0.05, 0.05, 3.42 + i * 0.18, y + 0.45, BACK + 0.26, mat(["#ff5a3c", "#5dffa8", yellow][i], { kind: 1, flag: 5 }));
    // the right-hand wall: three slots on the atrium, in heavy frames
    for (const [z0, z1] of [[-5.7, -4.3], [-2.5, -1.1], [1.0, 2.4]]) {
      const zc = (z0 + z1) / 2, yc = y - 1.26;      // the slot is from 0.42 to 2.1 m under the level
      b.quad([SHAFT.x1 - 0.02, yc, zc], [0, 0, 1], Y, z1 - z0, 1.68, mat("#fff", { kind: 3 }));
      b.box(0.14, 1.9, 0.12, SHAFT.x1 - 0.07, yc, z0 - 0.06, mat(iron)); b.box(0.14, 1.9, 0.12, SHAFT.x1 - 0.07, yc, z1 + 0.06, mat(iron)); b.box(0.16, 0.12, z1 - z0 + 0.24, SHAFT.x1 - 0.08, yc + 0.9, zc, mat(iron)); b.box(0.2, 0.14, z1 - z0 + 0.3, SHAFT.x1 - 0.1, yc - 0.9, zc, mat(band));
      b.box(0.06, 1.7, 0.05, SHAFT.x1 - 0.05, yc, zc, mat(iron)); b.box(0.06, 0.05, z1 - z0, SHAFT.x1 - 0.05, yc + 0.2, zc, mat(iron));
    }
    // the left-hand wall: a cable tray, and the stairs' own sign on every other level
    b.box(0.3, 0.1, SHAFT.z1 - SHAFT.z0, SHAFT.x0 + 0.17, y + 2.3, (SHAFT.z0 + SHAFT.z1) / 2, mat(iron));
    if (m % 2 === 0) b.quad([SHAFT.x0 + 0.02, y + 1.4, 1.2], [0, 0, 1], Y, 2.5, 0.62, mat(band, { kind: 4, map: T.stairs }));
  }
  // pipes and cables up the back wall and the right-hand corner
  for (const [x, r, col] of [[4.7, 0.16, rust], [5.1, 0.09, teal], [5.42, 0.06, band], [-7.9, 0.12, rust], [-7.55, 0.07, teal]]) { b.cyl(r, DEPTH, x, cy, BACK + r + 0.06, mat(col), "y", 9); for (let yy = BOTTOM + 1.2; yy < TOP; yy += H) b.box(r * 2 + 0.16, 0.14, r * 2 + 0.1, x, yy, BACK + r + 0.06, mat(iron)); }
  for (let i = 0; i < 4; i++) b.cyl(0.035, DEPTH, 2.9 + i * 0.11, cy, BACK + 0.06, mat(i % 2 ? dark : "#2c5a56"), "y", 5);
  // the doors in the back wall, top and bottom: the atrium's light in them
  for (const y of [0, BOTTOM]) {
    const xc = (WALK.x0 + WALK.x1) / 2;
    b.quad([xc, y + 1.2, BACK + 0.05], X, Y, 1.9, 2.4, mat("#a9d8de", { kind: 1, fog: 0.2 }));
    for (const s of [1, -1]) b.box(0.24, 2.7, 0.3, xc + s * 1.07, y + 1.35, BACK + 0.15, mat(steel)); b.box(2.5, 0.34, 0.32, xc, y + 2.6, BACK + 0.16, mat(steel)); b.box(2.5, 0.1, 0.34, xc, y + 2.4, BACK + 0.17, mat(yellow));
    b.quad([xc, y + 2.62, BACK + 0.33], X, Y, 1.5, 0.22, mat("#1c1d16", { kind: 4, map: T.stairs }));
  }

  // ---- the stair tower -------------------------------------------------------------------------------------------------
  const deck = mat("#fff", { kind: 10, map: T.grate }), ang = Math.atan(H / (X1 - X0)), LEN = Math.hypot(X1 - X0, H);
  const plate = (r, y, t = 0.08) => { const g = new THREE.BoxGeometry(r.x1 - r.x0, t, r.z1 - r.z0); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (r.x1 - r.x0) / 0.9, uv.getY(i) * (r.z1 - r.z0) / 0.9); b.add(g, deck, new THREE.Matrix4().makeTranslation((r.x0 + r.x1) / 2, y - t / 2, (r.z0 + r.z1) / 2)); b.box(r.x1 - r.x0 + 0.04, 0.16, r.z1 - r.z0 + 0.04, (r.x0 + r.x1) / 2, y - t - 0.08, (r.z0 + r.z1) / 2, mat(steel2)); };
  for (let k = 0; k < FLIGHTS; k++) {
    const d = dir(k), zc = lane(k), y0 = -k * H, xs = d > 0 ? X0 : X1, xe = d > 0 ? X1 : X0;
    for (let i = 0; i < STEPS - 1; i++) { const x = xs + d * (i + 0.5) * TREAD, y = y0 - (i + 1) * RISE; b.box(TREAD - 0.04, 0.045, LANE, x, y - 0.022, zc, mat(steel)); b.box(0.06, 0.05, LANE, x + d * (TREAD / 2 - 0.03), y - 0.02, zc, mat(yellow)); }
    for (const inner of [true, false]) {
      const z = railZ(k, inner);
      b.box(LEN + 0.1, 0.24, 0.05, 0, y0 - H / 2 - RISE - 0.2, z, mat(iron), { rz: -d * ang });
      rail(b, [xs, y0, z], [xe, y0 - H, z]);
    }
  }
  for (let m = 0; m <= FLIGHTS; m++) {
    const y = -m * H;
    if (m % 2 === 0 && m < FLIGHTS) {
      plate(LEFT, y); plate(BALCONY, y);
      if (m) rail(b, [BALCONY.x0, y, LEFT.z1], [LEFT.x1, y, LEFT.z1]); else rail(b, [LIFT.x1 + 0.2, y, LEFT.z1], [LEFT.x1, y, LEFT.z1]);      // (the top balcony is open in front of the lift: the shot of its gate is from there) rail(b, [LEFT.x1, y, LEFT.z1], [LEFT.x1, y, 1.43]); rail(b, [BALCONY.x0, y, LEFT.z1], [BALCONY.x0, y, BALCONY.z0]);
      if (m) rail(b, [LEFT.x0, y, LEFT.z0], [LEFT.x1, y, LEFT.z0]); else { plate(WALK, y); rail(b, [WALK.x0, y, WALK.z1], [WALK.x0, y, WALK.z0]); rail(b, [WALK.x1, y, WALK.z1], [WALK.x1, y, WALK.z0]); }
      b.box(0.3, 0.06, LEFT.z1 - LEFT.z0, LEFT.x1 - 0.15, y + 0.005, (LEFT.z0 + LEFT.z1) / 2, mat("#fff", { kind: 10, map: T.hazard }));
    }
    if (m % 2 === 1) { plate(RIGHT, y); rail(b, [RIGHT.x1, y, RIGHT.z0], [RIGHT.x1, y, RIGHT.z1]); rail(b, [RIGHT.x0, y, RIGHT.z1], [RIGHT.x1, y, RIGHT.z1]); rail(b, [RIGHT.x0, y, RIGHT.z0], [RIGHT.x1, y, RIGHT.z0]); }
  }
  // its columns, the frames that tie them at every level, and bracing on the far side
  const cols = [[X0 - 0.1, 1.52], [X0 - 0.1, -1.52], [RIGHT.x1 + 0.1, 1.52], [RIGHT.x1 + 0.1, -1.52]];
  for (const [x, z] of cols) { b.box(0.18, 3.4 - BOTTOM, 0.18, x, (3.4 + BOTTOM) / 2, z, mat(steel2, { seam: [0.5, 1.5], seamMode: 2 })); b.box(0.5, 0.06, 0.5, x, BOTTOM + 0.03, z, mat(iron)); }
  for (let m = -1; m < FLIGHTS; m++) {
    const y = -m * H - 0.3;
    for (const z of [1.52, -1.52]) b.box(RIGHT.x1 - X0 + 0.38, 0.16, 0.1, (X0 + RIGHT.x1) / 2, y + (m < 0 ? 0.6 : 0), z, mat(steel2));
    for (const x of [X0 - 0.1, RIGHT.x1 + 0.1]) b.box(0.1, 0.16, 3.04, x, y + (m < 0 ? 0.6 : 0), 0, mat(steel2));
    if (m >= 0) { rod(b, [X0 - 0.1, y, -1.56], [RIGHT.x1 + 0.1, y - H, -1.56], 0.03, mat(iron), 5); rod(b, [X0 - 0.1, y - H, -1.56], [RIGHT.x1 + 0.1, y, -1.56], 0.03, mat(iron), 5); }
  }
  // ---- the lift's frame --------------------------------------------------------------------------------------------
  for (const x of [LIFT.x0, LIFT.x1]) for (const z of [LIFT.z0, LIFT.z1]) b.box(0.14, TOP - BOTTOM, 0.14, x, cy, z, mat(brass, { seam: [0.5, 1.5], seamMode: 2 }));
  for (let m = 0; m <= FLIGHTS; m += 2) {
    const y = -m * H;
    b.box(LIFT.x1 - LIFT.x0 + 0.3, 0.34, 0.2, LIFT.x, y + LIFT.h + 0.32, LIFT.z1, mat(brass)); b.box(LIFT.x1 - LIFT.x0 + 0.3, 0.08, 0.22, LIFT.x, y + LIFT.h + 0.12, LIFT.z1, mat(dark));
    b.box(0.5, 0.26, 0.12, LIFT.x, y + LIFT.h + 0.34, LIFT.z1 + 0.1, mat(dark)); b.cyl(0.085, 0.08, LIFT.x, y + LIFT.h + 0.34, LIFT.z1 + 0.18, mat("#ffe07a", { kind: 1, flag: 4, fog: 0.3 }), "z", 12);
    for (const s of [1, -1]) b.box(0.07, 0.1, 0.04, LIFT.x + s * 0.17, y + LIFT.h + 0.34, LIFT.z1 + 0.17, mat(s > 0 ? "#5dffa8" : "#ff5a3c", { kind: 1, flag: 5 }));
    b.box(LIFT.x1 - LIFT.x0, 0.12, 0.1, LIFT.x, y - 0.06, LIFT.z0, mat(brass)); for (const x of [LIFT.x0, LIFT.x1]) b.box(0.1, 0.12, LIFT.z1 - LIFT.z0, x, y - 0.06, (LIFT.z0 + LIFT.z1) / 2, mat(brass));
  }
  // ---- under the stairs, at the bottom: crates, a tape cabinet, an old terminal --------------------------------------
  {
    const y = BOTTOM;
    b.box(1.1, 0.8, 0.9, 1.6, y + 0.4, -0.5, mat("#8c6a3e", { seam: [0.55, 0.4], seamMode: 2 })); b.box(0.9, 0.7, 0.8, 1.75, y + 1.15, -0.55, mat("#a07a48", { seam: [0.45, 0.35], seamMode: 2 })); b.box(1.0, 1.0, 1.0, 2.9, y + 0.5, -0.3, mat("#7a8a7c", { seam: [0.5, 0.5], seamMode: 2 }));
    b.box(0.9, 1.9, 0.6, 4.6, y + 0.95, -1.0, mat(band)); for (let j = 0; j < 2; j++) b.quad([4.6, y + 1.45 - j * 0.6, -0.69], X, Y, 0.74, 0.46, mat(j ? yellow : "#e8dcc0", { kind: 9, gain: (kit.reels = kit.reels ?? { value: 0 }) }));
    b.box(0.74, 0.56, 0.6, 0.3, y + 1.08, -0.9, mat(band)); b.box(0.8, 0.8, 0.66, 0.3, y + 0.4, -0.9, mat(steel2)); b.quad([0.3, y + 1.1, -0.59], X, Y, 0.56, 0.42, mat("#fff", { kind: 2, map: T.term, gain: (kit.term = kit.term ?? { value: 1 }) }));
    b.cyl(0.3, 0.9, 5.3, y + 0.45, 2.4, mat(rust), "y", 12); b.cyl(0.31, 0.06, 5.3, y + 0.7, 2.4, mat(yellow), "y", 12);
  }
  scene.add(b.build());

  // ---- the cage ------------------------------------------------------------------------------------------------------
  const cage = new THREE.Group(), gateBars = [], gateLinks = [], GZ = LIFT.z1 - 0.08, GX0 = LIFT.x0 + 0.16, GW = LIFT.x1 - LIFT.x0 - 0.32, NB = 9;
  {
    const c = kit.builder(), w = LIFT.x1 - LIFT.x0 - 0.2, dpt = LIFT.z1 - LIFT.z0 - 0.2, zc = (LIFT.z0 + LIFT.z1) / 2, gr = (rep) => { const t = T.grille; return mat(brass, { kind: 4, map: t, flag: rep }); };
    c.box(w, 0.1, dpt, LIFT.x, -0.05, zc, mat(steel2)); c.box(w + 0.06, 0.14, dpt + 0.06, LIFT.x, LIFT.h + 0.07, zc, mat(brass)); c.box(w * 0.5, 0.2, dpt * 0.5, LIFT.x, LIFT.h + 0.24, zc, mat(dark));
    for (const x of [LIFT.x0 + 0.13, LIFT.x1 - 0.13]) for (const z of [LIFT.z0 + 0.13, LIFT.z1 - 0.13]) c.box(0.07, LIFT.h, 0.07, x, LIFT.h / 2, z, mat(brass));
    const side = (center, u, wd) => { const g = new THREE.PlaneGeometry(wd, LIFT.h - 0.1), uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * wd / 0.62, uv.getY(i) * (LIFT.h - 0.1) / 0.62); const m4 = new THREE.Matrix4().makeBasis(new THREE.Vector3(...u), new THREE.Vector3(0, 1, 0), new THREE.Vector3(...u).cross(new THREE.Vector3(0, 1, 0))).setPosition(...center); c.add(g, mat(brass, { kind: 4, map: T.grille }), m4); };
    side([LIFT.x0 + 0.13, LIFT.h / 2, zc], [0, 0, 1], dpt - 0.1); side([LIFT.x1 - 0.13, LIFT.h / 2, zc], [0, 0, 1], dpt - 0.1); side([LIFT.x, LIFT.h / 2, LIFT.z0 + 0.13], [1, 0, 0], w - 0.1);
    for (const y of [0.95, 0.06, LIFT.h - 0.06]) { for (const x of [LIFT.x0 + 0.13, LIFT.x1 - 0.13]) c.box(0.05, 0.06, dpt - 0.1, x, y, zc, mat(brass)); c.box(w - 0.1, 0.06, 0.05, LIFT.x, y, LIFT.z0 + 0.13, mat(brass)); }
    c.box(0.5, 0.05, 0.5, LIFT.x, LIFT.h - 0.03, zc, mat("#ffe6a8", { kind: 1, fog: 0.3 }));      // the cage's own lamp
    for (const x of [LIFT.x - 0.25, LIFT.x + 0.25]) c.cyl(0.022, 60, x, LIFT.h + 30.3, zc, mat(dark), "y", 5);
    c.box(0.16, 0.4, 0.08, LIFT.x1 - 0.2, 1.3, LIFT.z1 - 0.2, mat(dark)); for (let i = 0; i < 3; i++) c.box(0.05, 0.05, 0.03, LIFT.x1 - 0.2, 1.42 - i * 0.12, LIFT.z1 - 0.15, mat(["#5dffa8", yellow, "#ff5a3c"][i], { kind: 1, flag: 5 }));
    cage.add(c.build());
    // the folding gate: upright bars that close up like a concertina, and the lattice between them
    const barG = new THREE.BoxGeometry(0.035, LIFT.h - 0.12, 0.03), linkG = new THREE.BoxGeometry(1, 0.022, 0.016), bm = mat(steel), lm = mat(steel2);
    for (let i = 0; i <= NB; i++) { const m = new THREE.Mesh(barG, bm); m.frustumCulled = false; cage.add(m); gateBars.push(m); }
    for (let i = 0; i < NB; i++) for (let j = 0; j < 3; j++) for (const s of [1, -1]) { const m = new THREE.Mesh(linkG, lm); m.frustumCulled = false; cage.add(m); gateLinks.push({ m, i, j, s }); }
    scene.add(cage);
  }
  const weight = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.6, 0.3), mat(iron)); weight.frustumCulled = false; scene.add(weight);
  // a red halo round each level's beacon, shown while it is lit
  const haloTex = canvasTex(128, 128, (c) => { c.fillStyle = "rgba(255,255,255,0.22)"; c.beginPath(); c.arc(64, 64, 60, 0, 7); c.fill(); c.fillStyle = "rgba(255,255,255,0.5)"; c.beginPath(); c.arc(64, 64, 32, 0, 7); c.fill(); });
  const haloMat = kit.mat("#ff3a28", { kind: 7, flag: 1, map: haloTex, alpha: 0.8, fog: 0.3 }), halos = [];
  for (let m = 0; m <= FLIGHTS; m++) { const h = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), haloMat); h.layers.set(FX); h.renderOrder = 12; h.frustumCulled = false; h.position.set(-1.5, -m * H + 2.24, BACK + 0.3); scene.add(h); halos.push(h); }
  const drones = createDrones(kit, scene), markers = createMarkers(scene), shadows = createShadows(kit, scene, "#1a2016");
  const state = { lift: 0 };

  function update(cam, frame, sync, opt = {}) {
    const w = driveAll(sync, WIRING, frame, opt.wiring), t = frame / sync.fps, alert = opt.alert ?? 0, L = opt.lift ?? {};
    aim(camera, cam, W / Hh); shared.uCam.value.copy(camera.position); shared.uFrame.value = frame;
    U.uHull.value = clamp(w.hull, 0, 1.3); U.uSky.value = clamp(w.sky, 0, 1.4); U.uTwinkle.value = w.twinkle; U.uValueY.value = opt.valueFrom ?? cam.pos[1];
    U.uAlarm.value = clamp(alert * 0.8 + w.klaxon * (alert > 0 ? 1 : 0), 0, 1.2); U.uAlarmAng.value = t * 4.4; U.uAlarmLevels.value = opt.alarmLevels ?? 9;
    if (kit.reels) kit.reels.value = t * 1.5; if (kit.term) kit.term.value = 0.8 + 0.3 * w.hum;
    // the cage, its gate, its counterweight, the lamp at its level
    const ly = L.y ?? 0, g = clamp(L.gate ?? 1), ding = L.ding ?? -1; state.lift = ly;
    cage.position.y = ly; weight.position.set(LIFT.x, BOTTOM - ly + 0.8, LIFT.z0 + 0.3);
    const pitch = GW * (0.05 + 0.95 * g) / NB;
    gateBars.forEach((m, i) => m.position.set(GX0 + i * pitch, LIFT.h / 2, GZ));
    for (const { m, i, j, s } of gateLinks) { const hh = (LIFT.h - 0.3) / 3, len = Math.hypot(pitch, hh); m.position.set(GX0 + (i + 0.5) * pitch, 0.15 + (j + 0.5) * hh, GZ + 0.022 * s); m.rotation.z = s * Math.atan2(hh, pitch); m.scale.x = len; }
    U.uLampY.value = ly + LIFT.h + 0.34; U.uLamp.value = clamp((L.lamp ?? 0) * (0.75 + 0.25 * w.hum) + (ding >= 0 ? 1.2 * Math.exp(-ding / 3) : 0), 0, 2.2);
    front.visible = !!opt.front;
    halos.forEach((h, m) => { const on = U.uAlarm.value > 0.05 && m < U.uAlarmLevels.value && ((t * 1.4 + m * 0.37) % 1) > 0.4; h.visible = on; if (on) { h.quaternion.copy(camera.quaternion); h.scale.setScalar(0.8 + 0.5 * U.uAlarm.value); } });
    drones.update(opt.drones ?? [], frame, sync, camera, { thrust: w.thrust });
    markers.update(opt.markers); shadows.update(opt.shadows);
    return { scene, camera, wires: w, clear: opt.clear ?? 0x10150f, post: { inkColor: [0.07, 0.09, 0.06], shadowTint: [0.01, 0.016, 0.01], bloom: 0.8, bloomThreshold: 0.66, ...opt.post } };
  }
  // The light on a figure at p: the shaft's flat olive light, a cold rim from the slots on its right; warm under the
  // cage's own lamp; the atrium's light by the doors.
  function light(p) {
    const inCage = p[0] > LIFT.x0 && p[0] < LIFT.x1 && p[2] > LIFT.z0 && p[2] < LIFT.z1 + 0.1 && Math.abs(p[1] - state.lift) < 0.6;
    if (inCage) return { tint: [1.02, 0.93, 0.78], rim: [1.0, 0.86, 0.5], from: [0, 1, 0], fogK: 0, fogColor: [0, 0, 0], gradient: 0.22 };
    return { tint: [0.95, 0.96, 0.9], rim: [0.72, 0.9, 1.0], from: [1, 0.35, 0], fogK: shared.uFogK.value * 0.4, fogColor: shared.uFogCol.value.toArray(), gradient: 0.2 };
  }
  return { name: "stairwell", scene, camera, kit, update, light, floorAt, WIRING };
}
