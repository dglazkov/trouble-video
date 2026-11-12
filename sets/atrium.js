// The atrium: the hollow middle of the station, and the only place the film shows how big the station is. A shaft
// three hundred metres across and deeper than the eye goes, ring upon ring of decks round its wall; at its axis the
// CORE, an eight-sided tower with decks of its own (the archive vault is inside it); bridges from the core to the
// wall on many levels, screens the size of buildings, small craft crossing, and a floor of light far below that fills
// the depths with mist. Daylight from the upper left: ivory where it lands, periwinkle and indigo in the shade, aqua
// below; and when the alarm goes, red, band by band of decks, outward from the gantry's level.
//
// THE VISTA IS PAINTED (sets/painted.js says how; sets/atrium/*.webp are the paintings, each with its sidecar): the
// far plate (the wall, the mist) and the tower with its bridges, each by day and in alarm, projected from the camera
// they were painted for (HERO, sets/atriumplan.js) onto stand-ins at the right distances, so that they slide against
// each other when the camera moves. What is geometry, lit and inked like the rest of the film: the gantry the four
// run on (out along +Z from the doorway at the origin), its cable stays and beacons, the doorway and the core's face
// round it (which turns into the painting of itself as the camera lets go: `vista`), the drones, the craft. What
// animates over the paintings: which windows are lit (the strings), the alarm's bands and their blink (the brass),
// the screens (the paintings' blank panels; the set draws what they say), the craft's lamps (the keyboard), the haze.
// The old geometry of the place is still here as the BLOCKOUT: the guide the paintings were made over (`guide`), and
// what stands round the stair tower's doorway (door: "stairs"), which is not in the paintings.
//
//   const set = await createAtrium(renderer, { width, height });
//   const { scene, camera, clear, post } = set.update(camera, frame, sync, options);
//   set.light([x, y, z], options) -> the light a figure there is in;  set.floorAt(x, z) -> 0 on the gantry
//
// Cue options (all optional; every one is a plain value for this frame):
//   door      "vault" | "stairs"   which doorway is at the origin: the vault's (red inside, its shutter up) or the
//                                  stair tower's on a lower gantry (default "vault")
//   vista     0..1                 how far the camera has let go of the doorway: at 1 the core's face is the painting
//                                  (and the picture is photographed as a painting: less bloom), at 0 it is built
//   alarm     { gantry, rings }    how far along the gantry (metres from the door) its beacons have come on, and how
//                                  many bands of decks (twelve metres each) above and below this level have turned
//   screens   { text, small, alarm }   what the great screens say (default: the station's idle listings)
//   alert     0..1                 how hard lit beacons burn (the klaxon wire adds to it)
//   drones    [...]                machines/drones.js specs
//   warden    {...}                machines/warden.js spec: the one enormous machine (the reunion)
//   guide     true | "wall"        the blockout instead of the paintings (shots/atrium_plate.js); "wall": without the core
//   gantry    false                no gantry (a guide to paint over)
//   wiring    { name: wire }       replace wires of WIRING for this frame
//   markers, shadows, post, clear  as in the other sets
import * as THREE from "three";
import { createKit, createShadows, canvasTex, quadGeometry, aim, hash, rng, clamp, lerp, FX } from "./kit.js";
import { kana, latin, scanlines, hazard, chevrons, kanaWidth, FONT } from "./sign.js";
import { driveAll } from "../engine/sync.js";
import { createDrones } from "../machines/drones.js";
import { createWarden } from "../machines/warden.js";
import { createMarkers } from "./markers.js";
import { HERO } from "./atriumplan.js";
import { projector, loadPainting, painted, paintedScreen, PROJECT_VS } from "./painted.js";

export const RA = 150, RC = 14, DECK = 6, GANTRY = { w: 4.4, len: RA - RC }, DOOR = { w: 3.4, h: 4.2 }, POSTS = 8;      // the shaft's radius and the core's (the axis is at z = -RC); a storey; the gantry; the vault's doorway; metres between beacon posts
export { HERO } from "./atriumplan.js";
export const floorAt = (x, z) => (Math.abs(x) <= GANTRY.w / 2 + 0.1 && z > -9 && z < GANTRY.len ? 0 : null);
// The station plays the song: each system is one wire from a stem (engine/sync.js drive()).
export const WIRING = {
  klaxon: { stem: "brass", mode: "env", gain: 1.6 },                               // lit beacons burn harder with the brass
  note: { stem: "brass", mode: "pulse", decay: 0.18, gain: 1 },                    // and jump on each note of it
  windows: { stem: "strings", mode: "env", floor: 0.8, gain: 0.7 },                // the far windows' light
  twinkle: { stem: "strings", mode: "count", gain: 1 },                            // which of them are lit changes on each note
  hull: { stem: "bass", mode: "env", floor: 0.7, gain: 0.9 },                      // the deck lights round every ring, and the light on the structure
  screens: { stem: "synth", mode: "pulse", decay: 0.2, floor: 0.85, gain: 0.4 },   // the great screens flare
  traffic: { stem: "keyboard", mode: "env", floor: 0.6, gain: 0.8 },               // the craft's lamps
  thrust: { stem: "drums", mode: "pulse", decay: 0.15, gain: 1 },                  // drones
};

const CHUNK = `
uniform float uHull, uWin, uTwinkle, uRings, uGantry, uAlarm, uBlink, uGuide, uVista; uniform sampler2D tMid; uniform mat4 uPaintProj;
const float RA = 150.0, RC = 14.0;
vec2 polar(vec3 W){ return vec2(atan(W.x, W.z+RC), length(vec2(W.x, W.z+RC))); }  // the angle round the axis from the gantry's line, and how far out
// a storey of windows, painted: arc metres round, w metres to a window. Some are lit, warm or pale; which, changes with the strings.
vec3 storeys(vec3 col, float arc, float y, float w, float lit){
  float st = floor(y/6.0), fy = fract(y/6.0); vec2 cell = vec2(floor(arc/w), st); float fx = fract(arc/w);
  float big = hash(vec2(floor(arc/(w*4.0)), st)*1.7+3.1);
  col *= big > 0.8 ? 0.84 : (big < 0.2 ? 1.1 : 1.0);
  float service = step(4.5, mod(st+100.0, 5.0));
  if(service > 0.5) return col*0.68;
  if(fx > 0.18 && fx < 0.82 && fy > 0.34 && fy < 0.68){
    float h = hash(cell*1.3+7.7), flip = hash(cell+floor(uTwinkle*0.5+h*3.0)*0.37);
    float on = step(lit, h)*step(0.25, flip);
    vec3 glow = h > 0.9 ? vec3(0.55,0.95,1.0) : (h > 0.8 ? vec3(1.0,0.8,0.56) : vec3(1.0,0.92,0.66));
    col = mix(col*0.46, glow*(0.85+0.3*uWin), on);
  }
  return col;
}
float setTone(vec3 W, vec3 N){
  vec2 p = polar(W);
  if((p.y > RA-1.2 || (p.y < RC+0.6 && W.z < -0.05)) && abs(N.y) < 0.5){ float fy = fract(W.y/6.0); return fy > 0.84 ? 0.0 : 1.0; }      // the wall and the core: in the shade under each deck
  if(N.y > 0.6) return 2.0;
  if(N.y < -0.5) return 0.0;
  return 1.0;
}
vec3 setExtra(vec3 col, vec3 W, vec3 N, float tone){
  vec2 p = polar(W);
  // the core's face round the doorway, as the camera lets go of it: it becomes the painting of itself (the doorway's own frame does not)
  if(uVista > 0.0 && W.z < 2.75 && W.z > -1.3 && abs(W.x) < 8.7 && !(abs(W.x) < 2.45 && W.y > -0.2 && W.y < 5.75)){
    vec4 q = uPaintProj*vec4(W, 1.0); return mix(col, texture2D(tMid, q.xy/q.w*0.5+0.5).rgb, uVista);
  }
  if(abs(N.y) < 0.5 && uGuide < 0.5){
    if(p.y > RA-1.2) return storeys(col, p.x*RA, W.y, 3.4, 0.6);
    if(p.y < RC+0.6 && W.z < -0.05) return storeys(col, p.x*RC+0.65, W.y, 2.9, 0.5);
  }
  col *= 0.86+0.14*uHull;
  return col;
}
float setEmit(vec3 W, int flag){
  if(flag == 0) return 1.0;
  if(flag == 1 || flag == 2){
    // lamps round a deck's edge: white deck lights (1), and red ones (2) that come on ring by ring, outward from this level
    vec2 p = polar(W); float st = floor(W.y/6.0+0.5), a = p.x*p.y, pitch = p.y > 100.0 ? 5.0 : 2.0, dot = step(fract(a/pitch), 0.36), lit = step(abs(st), uRings-0.5);
    if(flag == 1) return dot*(0.35+0.75*uHull)*(1.0-lit);
    return dot*lit*(0.5+1.3*uAlarm)*(0.55+0.45*step(0.5, fract(uBlink+st*0.5+floor(a/pitch)*0.5)));
  }
  if(flag == 3){ float i = floor(W.z/8.0+0.5), lit = step(W.z, uGantry); return 0.1+lit*(0.7+1.5*uAlarm)*(0.45+0.55*step(0.5, fract(uBlink+i*0.5))); }   // the gantry's beacons
  if(flag == 4) return 0.6+0.6*uHull;                                              // strip lights
  return 1.0;
}
vec3 setSpecial(vec3 W, vec3 d, vec2 uv){ return vec3(0.0); }`;

// ---- the great screens ---------------------------------------------------------------------------------------------
const SW = 512, SH = 288;
function drawScreen(c, o, frame, kind) {
  const alarm = o.alarm ?? 0, ink = alarm > 0.5 ? "#ff5040" : "#62ffb0", bg = alarm > 0.5 ? "#3c0705" : "#073a25", dim = alarm > 0.5 ? "#b02a1e" : "#2c9c64", f2 = Math.floor(frame / 2);
  c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = bg; c.fillRect(0, 0, SW, SH); c.strokeStyle = dim; c.lineWidth = 6; c.strokeRect(12, 12, SW - 24, SH - 24);
  if (o.text) {
    let px = 132; c.font = FONT(px); const w = c.measureText(o.text).width; if (w > SW - 60) px = Math.floor(px * (SW - 60) / w);
    latin(c, o.text, SW / 2, 150, px, ink, { align: "center" });
    if (o.small) kana(c, o.small, SW / 2 - kanaWidth(o.small, 50) / 2, 180, 50, 8, ink);
    if (alarm > 0.5) hazard(c, 12, SH - 46, SW - 24, 30, ink, bg, 40);
  } else if (kind === 0) { for (let i = 0; i < 8; i++) { c.fillStyle = i === 2 ? "#ffb428" : dim; c.fillRect(34, 36 + i * 28, 80 + hash(i, 2, f2 >> 3) * 330, 13); } }
  else if (kind === 1) { kana(c, "アトリウム", 40, 40, 78, 11, ink); latin(c, "RING 07 // ALL DECKS", 40, 190, 34, dim); c.fillStyle = ink; for (let i = 0; i < 14; i++) c.fillRect(40 + i * 31, 256 - (8 + ((i * 37 + f2) % 40)), 20, 8 + ((i * 37 + f2) % 40)); }
  else { c.strokeStyle = ink; c.lineWidth = 6; c.beginPath(); c.arc(256, 140, 92, 0, 7); c.stroke(); c.beginPath(); c.arc(256, 140, 30, 0, 7); c.stroke(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + f2 * 0.01; c.beginPath(); c.moveTo(256 + Math.cos(a) * 30, 140 + Math.sin(a) * 30); c.lineTo(256 + Math.cos(a) * 92, 140 + Math.sin(a) * 92); c.stroke(); } c.fillStyle = "#ffb428"; c.fillRect(330, 132, 16, 16); }
  scanlines(c, SW, SH, 0.3, 8);
}

function textures() {
  const T = {};
  T.grate = canvasTex(256, 256, (c) => { c.fillStyle = "#868eb2"; c.fillRect(0, 0, 256, 256); c.fillStyle = "#6d7499"; for (let i = 0; i < 8; i++) c.fillRect(0, i * 32 + 10, 256, 12); c.fillStyle = "#7a82a6"; for (let i = 0; i < 4; i++) c.fillRect(i * 64 + 26, 0, 10, 256); c.fillStyle = "#f0b81e"; c.fillRect(0, 0, 10, 256); c.fillRect(246, 0, 10, 256); }, { repeat: true });
  T.hazard = canvasTex(256, 64, (c) => hazard(c, 0, 0, 256, 64, "#f0b81e", "#1c1d2a", 64), { repeat: true });
  const sign = (w, h, col, bg, draw) => canvasTex(w, h, (c) => { c.fillStyle = bg; c.fillRect(0, 0, w, h); c.strokeStyle = col; c.lineWidth = 6; c.strokeRect(10, 10, w - 20, h - 20); draw(c); scanlines(c, w, h); });
  T.vault = sign(512, 128, "#ffb428", "#1c0d02", (c) => { latin(c, "V-01", 24, 94, 84, "#ffb428"); kana(c, "アーカイブ", 270, 38, 44, 7, "#ffb428"); });
  T.stairs = sign(512, 128, "#62ffb0", "#052a1a", (c) => { latin(c, "S8", 30, 96, 92, "#62ffb0"); kana(c, "カイダン", 190, 28, 70, 11, "#62ffb0"); });
  const st = (str) => canvasTex(Math.ceil(kanaWidth(str, 104) + 28), 128, (c) => kana(c, str, 14, 12, 104, 17, "#fff"));
  T.sector = st("セクター"); T.keep = st("タチイリ キンシ"); T.code = canvasTex(420, 128, (c) => latin(c, "R7-D0", 4, 104, 104, "#fff"));
  T.down = canvasTex(256, 256, (c) => chevrons(c, 20, 40, 216, 176, 2, 30, "#fff"));
  return T;
}

export async function createAtrium(renderer, o = {}) {
  const W = o.width ?? 1920, H = o.height ?? 1080;
  // the vista's paintings (sets/atrium/*.webp, each with its sidecar): the far plate and the tower with its bridges, by day and in alarm
  const PJ = projector({ pos: HERO.pos, target: HERO.target, fov: HERO.wide }), art = (n, o) => loadPainting(`/sets/atrium/${n}.webp`, o);
  const [farDay, farAlarm, midDay, midAlarm] = await Promise.all([art("far_day", { mirror: true }), art("far_alarm", { mirror: true }), art("mid_day"), art("mid_alarm")]);
  const U = { uVista: { value: 0 }, tMid: { value: midDay }, uPaintProj: { value: PJ.matrix }, uHull: { value: 1 }, uWin: { value: 1 }, uTwinkle: { value: 0 }, uRings: { value: 0 }, uGantry: { value: -1 }, uAlarm: { value: 0 }, uBlink: { value: 0 }, uGuide: { value: 0 } };
  const kit = createKit(CHUNK, U), { shared } = kit, T = textures(), mat = (c, o) => kit.mat(c, o);
  const HAZE = [0.7, 0.9, 0.93], HIGH = [0.3, 0.47, 0.74];
  shared.uFogCol.value.setRGB(...HAZE); shared.uFogDeep.value.setRGB(...HAZE); shared.uFogTop.value.setRGB(...HIGH); shared.uFogH.value.set(4, 150); shared.uFogK.value = 0.002;
  shared.uTintLit.value.setRGB(1.03, 1.03, 1.0); shared.uTintMid.value.setRGB(0.72, 0.76, 0.96); shared.uTintShade.value.setRGB(0.4, 0.42, 0.7); shared.uRim.value.setRGB(0.85, 0.97, 1.0);
  shared.uKey.value.set(0.25, 0.9, 0.3).normalize();
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(50, W / H, 0.08, 1200);
  const wallC = "#7c82ae", rib = "#5f6592", coreC = "#8086b2", cream = "#cfccc6", cream2 = "#a5a3ae", steel = "#9aa1bc", steel2 = "#6f7698", dark = "#2c2f4c", yellow = "#f0b81e", orange = "#e8742c", teal = "#58b8b0", lamp = "#fbfff0";
  let b = kit.builder(); const X = [1, 0, 0], Y = [0, 1, 0], TOPY = 156, LOWY = -432, HY = TOPY - LOWY, MY = (TOPY + LOWY) / 2;
  const rod = (bb, a, c, r, m, seg = 6) => { const A = new THREE.Vector3(...a), C = new THREE.Vector3(...c), d = C.clone().sub(A), len = d.length(); bb.add(new THREE.CylinderGeometry(r, r, len, seg), m, new THREE.Matrix4().compose(A.clone().add(C).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()), new THREE.Vector3(1, 1, 1))); };
  // round the axis: a matrix that puts something built facing +Z at the gantry's line (out along +Z from the axis) at angle t
  const round = (t) => new THREE.Matrix4().makeTranslation(0, 0, -RC).multiply(new THREE.Matrix4().makeRotationY(t));
  const at = (t, r, y) => [Math.sin(t) * r, y, -RC + Math.cos(t) * r];
  const OCT = 1 / Math.cos(Math.PI / 8), FACE = 2 * RC * Math.tan(Math.PI / 8);      // an octagon's corner radius for a flat-to-flat of 1; the width of one of the core's faces
  const oct = (r, h, y, open = false) => new THREE.CylinderGeometry(r * OCT, r * OCT, h, 8, 1, open).rotateY(Math.PI / 8).translate(0, y, -RC);

  // ---- the wall, its rings of decks, its ribs -------------------------------------------------------------------------
  const cylG = (r, y0, y1, seg = 144) => new THREE.CylinderGeometry(r, r, y1 - y0, seg, 1, true).translate(0, (y0 + y1) / 2, -RC);
  b.add(cylG(RA, LOWY, TOPY), mat(wallC, { paint: 0.6 }));
  const ringG = (r0, r1, y) => new THREE.RingGeometry(r0, r1, 144, 1).rotateX(-Math.PI / 2).translate(0, y, -RC);
  for (let j = Math.ceil(LOWY / DECK); j * DECK < TOPY; j++) {
    const y = j * DECK, wide = ((j % 5) + 5) % 5 === 0, r0 = RA - (wide ? 5.5 : 3.0), garden = ((j % 10) + 10) % 10 === 5;
    b.add(ringG(r0, RA, y), mat(garden ? "#6fae7c" : cream)); b.add(ringG(r0, RA, y - 0.5), mat(cream2));
    b.add(cylG(r0, y - 0.5, y), mat(cream2)); b.add(cylG(r0 + 0.02, y + 0.95, y + 1.05), mat(steel2));
    b.add(cylG(r0 - 0.03, y - 0.36, y - 0.12), mat(lamp, { kind: 1, flag: 1, fog: 0.85 })); b.add(cylG(r0 - 0.06, y - 0.4, y - 0.08), mat("#ff3a2c", { kind: 1, flag: 2, fog: 0.6 }));
  }
  const NRIB = 30;
  for (let i = 0; i < NRIB; i++) {
    const t = (i + 0.5) / NRIB * 2 * Math.PI;
    b.add(new THREE.BoxGeometry(5, HY, 4.6).translate(0, MY, RA - 2.2), mat(rib, { paint: 0.5 }), round(t));
    b.add(new THREE.BoxGeometry(1.2, HY, 0.3).translate(0, MY, RA - 4.6), mat(i % 3 ? lamp : "#ffd9a0", { kind: 1, flag: 4, fog: 0.85 }), round(t));
  }
  b.add(new THREE.CircleGeometry(RA, 64).rotateX(-Math.PI / 2).translate(0, LOWY + 1, -RC), mat("#fffbe0", { kind: 1, fog: 1 }));
  const wallB = b; b = kit.builder();
  // ---- the core: eight faces (the one with the doorway is built by hand, below), a fin up each corner, a deck every storey --
  for (let k = 0; k < 8; k++) {
    const t = k * Math.PI / 4, m = round(t);
    if (k) b.add(new THREE.BoxGeometry(FACE + 0.02, HY, 0.6).translate(0, MY, RC - 0.3), mat(coreC, { paint: 0.5 }), m);
    else { b.add(new THREE.BoxGeometry(FACE + 0.02, TOPY - 21, 0.6).translate(0, (TOPY + 21) / 2, RC - 0.3), mat(coreC, { paint: 0.5 }), m); b.add(new THREE.BoxGeometry(FACE + 0.02, -9 - LOWY, 0.6).translate(0, (LOWY - 9) / 2, RC - 0.3), mat(coreC, { paint: 0.5 }), m); }
    b.add(new THREE.BoxGeometry(1.7, HY, 1.7).translate(0, MY, RC * OCT + 0.2), mat(rib, { paint: 0.5 }), round(t + Math.PI / 8));
    b.add(new THREE.BoxGeometry(0.5, HY, 0.2).translate(0, MY, RC * OCT + 1.1), mat(k % 2 ? lamp : "#ffd9a0", { kind: 1, flag: 4, fog: 0.7 }), round(t + Math.PI / 8));
  }
  for (let j = Math.ceil(LOWY / DECK); j * DECK < TOPY; j++) {
    const y = j * DECK, r = RC + (((j % 5) + 5) % 5 === 0 ? 4.2 : 2.7);
    b.add(oct(r, 0.5, y - 0.25), mat(cream)); if (j) b.add(oct(r - 0.05, 0.1, y + 1.0, true), mat(steel2));      // (this level's rail is built by hand, with the gantry's mouth in it)
    b.add(oct(r + 0.03, 0.2, y - 0.24, true), mat(lamp, { kind: 1, flag: 1, fog: 0.7 })); b.add(oct(r + 0.06, 0.26, y - 0.24, true), mat("#ff3a2c", { kind: 1, flag: 2, fog: 0.5 }));
  }
  // ---- the bridges, core to wall -----------------------------------------------------------------------------------------
  const BRIDGES = [[-24, 0.9], [-42, 2.3], [-66, -1.4], [-84, 0.35], [-108, -2.6], [-132, 1.6], [-162, -0.7], [-198, 2.9], [-240, 0.2], [-288, -1.9], [-342, 1.1], [30, 2.0], [54, -1.0], [84, 0.6], [-12, 3.3], [-54, -3.0], [-30, -2.1], [-90, 2.6], [18, -2.7], [-150, -1.9]];
  for (const [y, t] of BRIDGES) {
    const len = RA - RC, w = 5 + 3 * hash(y, 1), zc = RC + len / 2, m = round(t), put = (g, mt) => b.add(g, mt, m);
    put(new THREE.BoxGeometry(w, 0.8, len).translate(0, y - 0.4, zc), mat("#b4b8cc")); put(new THREE.BoxGeometry(w + 0.6, 0.3, len).translate(0, y - 1.0, zc), mat(steel2)); put(new THREE.BoxGeometry(w * 0.4, 1.8, len).translate(0, y - 2.0, zc), mat(rib));
    for (const s of [1, -1]) { put(new THREE.BoxGeometry(0.12, 1.0, len).translate(s * w / 2, y + 0.5, zc), mat(steel2)); put(new THREE.BoxGeometry(0.2, 0.16, len).translate(s * (w / 2 + 0.1), y - 0.2, zc), mat(lamp, { kind: 1, flag: 4, fog: 0.85 })); }
    for (let z = RC + 18; z < RA - 6; z += 24) { put(new THREE.BoxGeometry(w + 2.4, 2.2, 2.2).translate(0, y - 1.6, z), mat(steel)); put(new THREE.BoxGeometry(1.4, 9, 1.4).translate(0, y - 6, z), mat(rib)); }
  }
  // ---- the gantry: a deck on a truss, pipe rails, a beacon post every eight metres, cables up to the core ---------------
  const blockoutB = b; b = kit.builder();
  {
    const w = GANTRY.w, L = GANTRY.len, g = new THREE.BoxGeometry(w, 0.1, L), uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i), uv.getY(i) * L / w);
    b.add(g, mat("#fff", { kind: 10, map: T.grate }), new THREE.Matrix4().makeTranslation(0, -0.05, L / 2 + 2.6));
    for (const s of [1, -1]) {
      b.box(0.24, 0.5, L, s * (w / 2 + 0.06), -0.3, L / 2 + 2.6, mat(steel)); b.box(0.26, 0.12, L, s * (w / 2 + 0.07), -0.02, L / 2 + 2.6, mat(yellow));
      rod(b, [s * (w / 2), 1.05, 2.7], [s * (w / 2), 1.05, L], 0.04, mat(yellow), 7); rod(b, [s * (w / 2), 0.55, 2.7], [s * (w / 2), 0.55, L], 0.025, mat(steel2), 5);
      for (let z = 2.7; z <= L; z += 2) rod(b, [s * (w / 2), 0, z], [s * (w / 2), 1.05, z], 0.028, mat(steel2), 5);
      rod(b, [s * 1.4, -2.2, 2.6], [s * 1.4, -2.2, L], 0.09, mat(steel2), 6);
      for (let z = 2.6; z < L; z += 4) { rod(b, [s * (w / 2), -0.5, z], [s * 1.4, -2.2, z + 2], 0.05, mat(steel2), 5); rod(b, [s * 1.4, -2.2, z + 2], [s * (w / 2), -0.5, z + 4], 0.05, mat(steel2), 5); }
      for (let z = POSTS; z <= L; z += POSTS) {
        b.box(0.14, 2.3, 0.14, s * (w / 2 + 0.1), 1.15, z, mat(dark)); b.box(0.3, 0.12, 0.3, s * (w / 2 + 0.1), 2.32, z, mat(dark));
        b.cyl(0.15, 0.3, s * (w / 2 + 0.1), 2.52, z, mat("#ff3426", { kind: 1, flag: 3, fog: 0.5 }), "y", 10); b.box(0.34, 0.06, 0.34, s * (w / 2 + 0.1), 2.7, z, mat(dark));
      }
      for (let z = 16; z < L; z += 16) rod(b, [s * (w / 2 + 0.1), 0, z], [s * 4.6, 24 + z * 0.62, 0.3], 0.07, mat(dark), 5);
    }
    for (let z = 4; z < L; z += 4) b.box(w + 0.3, 0.16, 0.2, 0, -0.5, z, mat(steel)); for (let z = 4; z <= L; z += 2) rod(b, [-1.4, -2.2, z], [1.4, -2.2, z], 0.04, mat(steel2), 5);
    b.quad([0, 0.012, 3.2], X, [0, 0, -1], w - 0.4, 0.7, mat("#fff", { kind: 10, map: T.hazard, offset: 1 }));
    b.quad([0, 0.012, 7], X, [0, 0, 1], 1.8, 1.8, mat("#d9d5c8", { kind: 4, map: T.down }));
  }
  // ---- the core's face with the doorway in it: built to be seen from two metres ------------------------------------------
  const face = kit.builder();
  {
    const c = face, FW = FACE, Y0 = -9, Y1 = 21, FH = Y1 - Y0, wm = mat("#858bb6", { seam: [1.93, 1.5], seamMode: 2 }), wm2 = mat("#7177a4", { seam: [1.93, 1.5], seamMode: 2 });
    for (const s of [1, -1]) c.box((FW - DOOR.w) / 2, FH, 1.2, s * (DOOR.w / 2 + (FW - DOOR.w) / 4), (Y0 + Y1) / 2, -0.6, wm);
    c.box(DOOR.w, Y1 - 4.6, 1.2, 0, (Y1 + 4.6) / 2, -0.6, wm2); c.box(DOOR.w, -Y0 - 0.1, 1.2, 0, (Y0 - 0.1) / 2, -0.6, wm2);
    // the deck here: the core's balcony either side of the gantry's root, its rail
    for (const s of [1, -1]) { rod(c, [s * (GANTRY.w / 2), 1.05, 2.7], [s * (FW / 2 + 1), 1.05, 2.7], 0.04, mat(yellow), 7); rod(c, [s * (GANTRY.w / 2), 0.55, 2.7], [s * (FW / 2 + 1), 0.55, 2.7], 0.025, mat(steel2), 5); for (let x = GANTRY.w / 2; x <= FW / 2 + 1; x += 1.2) rod(c, [s * x, 0, 2.7], [s * x, 1.05, 2.7], 0.028, mat(steel2), 5); }
    // pipes, a stencil either side, the level's code high up, a strip light under each deck above
    for (const [x, r, col] of [[-4.9, 0.16, orange], [-4.55, 0.09, teal], [4.7, 0.14, orange], [5.05, 0.08, cream2]]) { c.cyl(r, FH, x, (Y0 + Y1) / 2, r + 0.05, mat(col), "y", 9); for (let y = -6; y < Y1; y += 3) c.box(r * 2 + 0.2, 0.16, r * 2 + 0.14, x, y, r + 0.05, mat(dark)); }
    c.quad([-3.55, 3.3, 0.02], X, Y, 2.3, 0.55, mat("#d6daf0", { kind: 4, map: T.sector })); c.quad([3.6, 1.7, 0.02], X, Y, 2.5, 0.44, mat("#d6daf0", { kind: 4, map: T.keep })); c.quad([0, 9.6, 0.02], X, Y, 5.4, 1.6, mat("#a9aed4", { kind: 4, map: T.code }));
    for (const s of [1, -1]) { c.box(0.9, 1.5, 0.3, s * 3.3, 1.0, 0.15, mat(cream2)); c.box(0.7, 0.2, 0.32, s * 3.3, 1.45, 0.16, mat(yellow)); for (let i = 0; i < 3; i++) c.box(0.1, 0.06, 0.05, s * 3.3 - 0.2 + i * 0.2, 0.75, 0.31, mat(["#ff5a3c", "#5dffa8", yellow][i], { kind: 1 })); }
    for (let y = 6; y < Y1; y += 6) c.box(FW, 0.14, 0.16, 0, y - 0.6, 0.1, mat(lamp, { kind: 1, flag: 4, fog: 0.5 }));
    c.box(FW + 5.4, 0.06, 2.72, 0, 0.0, 1.36, mat("#7a82a8", { seam: [1.2, 0.9], seamMode: 2 }));      // the deck at the doorway: dark plate, so feet and their shadows read on it
  }
  const wallG = wallB.build(), coreG = blockoutB.build(), gantryG = b.build(); const faceG = face.build(); scene.add(wallG, coreG, gantryG, faceG);
  // the two doorways (one is shown): the vault's, red inside, and the stair tower's
  const doors = { vault: new THREE.Group(), stairs: new THREE.Group() };
  {
    const c = kit.builder(), ci = kit.builder(), cf = kit.builder(), w = DOOR.w, h = DOOR.h, red = (col) => mat(col, { kind: 1, fog: 0.3 });
    for (const s of [1, -1]) { c.box(0.34, h + 0.3, 0.6, s * (w / 2 + 0.17), (h + 0.3) / 2, 0.05, mat(cream)); c.box(0.1, h, 0.62, s * (w / 2 + 0.36), h / 2, 0.05, mat(yellow)); }
    c.box(w + 0.9, 0.5, 0.7, 0, h + 0.25, 0.07, mat(cream)); c.box(w + 0.9, 0.08, 0.74, 0, h - 0.02, 0.07, mat(dark)); c.box(w + 0.3, 0.7, 0.22, 0, h - 0.3, -0.5, mat("#8a7f60"));      // the frame, and the shutter's foot, up in its slot
    ci.box(0.2, h, 9, -w / 2 - 0.1, h / 2, -5.7, red("#6a0a10")); ci.box(0.2, h, 9, w / 2 + 0.1, h / 2, -5.7, red("#5c080e")); ci.box(w, 0.2, 9, 0, h + 0.1, -5.7, red("#40060a")); ci.box(w, 0.1, 10.4, 0, -0.05, -5, red("#7a1014"));
    ci.box(w, h, 0.2, 0, h / 2, -10.3, red("#d02018"));
    for (let i = 0; i < 3; i++) { ci.box(0.3, h, 0.3, -w / 2 + 0.1, h / 2, -3.2 - i * 2.4, red("#2a0406")); ci.box(0.3, h, 0.3, w / 2 - 0.1, h / 2, -3.2 - i * 2.4, red("#2a0406")); ci.box(w, 0.3, 0.3, 0, h - 0.1, -3.2 - i * 2.4, red("#2a0406")); }
    ci.box(1.4, 2.6, 0.2, -0.5, 1.9, -10.1, red("#3a0508")); ci.box(0.9, 1.5, 0.2, 0.9, 1.0, -10.1, red("#3a0508")); ci.box(2.4, 0.4, 0.2, 0.2, 3.5, -10.1, red("#ff5a40"));
    c.box(3.3, 0.74, 0.2, 0, h + 1.0, 0.25, mat(dark)); c.quad([0, h + 1.0, 0.36], X, Y, 3.1, 0.62, mat("#fff", { kind: 2, map: T.vault }));
    for (const s of [1, -1]) c.cyl(0.14, 0.24, s * 2.2, h + 1.0, 0.4, mat("#ff3426", { kind: 1, fog: 0.4 }), "y", 10);
    // from far off (the face is the painting by then) the way in is flat: the same reds, one inside the other
    for (const [k, col, z] of [[1, "#6a0a10", -0.3], [0.74, "#40060a", -0.29], [0.5, "#d02018", -0.28], [0.3, "#3a0508", -0.27]]) cf.quad([0, h * k / 2, z], X, Y, w * k, h * k, red(col));
    ci.box(w, 0.02, 10.4, 0, 0, -5, mat(cream));      // the core's deck goes on through the doorway (as the blockout's did, when it was the set)
    doors.inside = ci.build(); doors.flat = cf.build(); doors.vault.add(c.build(), doors.inside, doors.flat);
    const d = kit.builder(), w2 = 1.9, h2 = 2.4;
    for (const s of [1, -1]) d.box((w - w2) / 2 + 0.2, h + 0.4, 1.0, s * (w2 / 2 + (w - w2) / 4 + 0.1), (h + 0.4) / 2, -0.4, mat("#8a8fb8", { seam: [1.3, 1.0], seamMode: 2 }));
    d.box(w + 0.4, h - h2 + 0.4, 1.0, 0, (h + h2 + 0.4) / 2, -0.4, mat("#757aa6", { seam: [1.3, 1.0], seamMode: 2 }));
    for (const s of [1, -1]) d.box(0.24, h2 + 0.3, 0.4, s * (w2 / 2 + 0.12), (h2 + 0.3) / 2, 0.1, mat(cream)); d.box(w2 + 0.7, 0.34, 0.44, 0, h2 + 0.2, 0.12, mat(cream)); d.box(w2 + 0.7, 0.1, 0.46, 0, h2, 0.12, mat(yellow));
    d.box(0.15, h2, 5, -w2 / 2 - 0.07, h2 / 2, -2.9, mat("#3d4a30", { kind: 1, fog: 0.3 })); d.box(0.15, h2, 5, w2 / 2 + 0.07, h2 / 2, -2.9, mat("#343f2a", { kind: 1, fog: 0.3 })); d.box(w2, 0.1, 5, 0, -0.05, -2.9, mat("#55604a", { kind: 1, fog: 0.3 })); d.box(w2, 0.15, 5, 0, h2 + 0.07, -2.9, mat("#262e20", { kind: 1, fog: 0.3 }));
    d.box(w2, h2, 0.2, 0, h2 / 2, -5.4, mat("#7c8760", { kind: 1, fog: 0.3 })); d.box(1.2, 0.1, 0.1, 0, 2.0, -5.2, mat("#f1ffdc", { kind: 1, fog: 0.3 })); d.box(0.7, 0.9, 0.3, 0.3, 0.6, -5.2, mat("#9a9478", { kind: 1, fog: 0.3 }));
    d.box(2.6, 0.74, 0.2, 0, h2 + 1.0, 0.25, mat(dark)); d.quad([0, h2 + 1.0, 0.36], X, Y, 2.4, 0.6, mat("#fff", { kind: 2, map: T.stairs }));
    d.box(w2, 0.02, 5, 0, 0, -2.9, mat(cream));
    doors.stairs.add(d.build());
    scene.add(doors.vault, doors.stairs);
  }
  // ---- the great screens: one over the doorway (geometry, part of the face), the rest the blank panels of the paintings -----
  const screens = [0, 1, 2].map(() => { const cv = document.createElement("canvas"); cv.width = SW; cv.height = SH; const t = new THREE.CanvasTexture(cv); t.anisotropy = 8; return { g: cv.getContext("2d"), t }; }), G = { screens: { value: 1 }, craft: { value: 1 }, strobe: { value: 1 } };
  {
    const c = kit.builder(), w = 9.6, h = w * 9 / 16, k = 0.25, m4 = new THREE.Matrix4().makeTranslation(0, 15.2, 0.75), put = (g, m) => c.add(g.applyMatrix4(m4), m);
    put(new THREE.BoxGeometry(w + 1.6 * k, h + 1.6 * k, 1.4 * k).translate(0, 0, -0.75 * k), mat(dark)); put(new THREE.BoxGeometry(w + 2.4 * k, 0.8 * k, 1.8 * k).translate(0, -h / 2 - 1.0 * k, -0.6 * k), mat(cream2));
    put(new THREE.PlaneGeometry(w, h), mat("#fff", { kind: 2, map: screens[0].t, gain: G.screens, fog: 0.6 }));
    faceG.add(c.build());
  }
  // ---- the painted vista (sets/painted.js): each painting projected from HERO onto stand-ins at the right distances ------
  // The far plate is on the blockout's own wall and floor. The tower is on a card through the axis that faces HERO; each
  // bridge on a slab at its own level, so that its far end stays on the wall. Every pixel of the tower's painting is on
  // one stand-in only: the nearest bridge slab its hero ray meets before the tower, else the card.
  const BAND = 12, CARD = new THREE.Vector3(HERO.pos[0], 0, HERO.pos[2] + RC).normalize(), AXIS = new THREE.Vector3(0, 0, -RC), vista = new THREE.Group(), frameU = { value: 0 };
  // half the width of a bridge's slab: its deck and a margin for the girders and posts under it as HERO sees them. Only the two bridges whose
  // far end the vista shows on the wall, with nothing crossing them, have one; the rest stay on the tower's card (a slab under another
  // bridge takes pieces of the one above it, and tears it: tried, and worse than a far end that slides a little)
  const MARGIN = { [-66]: 3, [-30]: 3 }, SLAB = (y) => MARGIN[y] ? (5 + 3 * hash(y, 1)) / 2 + MARGIN[y] : 0;
  const LU = { uProj: { value: PJ.matrix }, uHero: { value: PJ.pos }, uRings: U.uRings, uAlarm: U.uAlarm, uBlink: U.uBlink, uTwinkle: U.uTwinkle, uWin: U.uWin, uHaze: { value: new THREE.Color(...HAZE) },
    uBr: { value: BRIDGES.map(([y, t]) => new THREE.Vector4(y, t, SLAB(y), RC - 0.5)) }, uExpose: { value: 0.93 } };
  const LAYER_FS = `
#define NB ${BRIDGES.length}
uniform sampler2D tDay, tAlarm; uniform mat4 uProj; uniform vec3 uHero, uHaze; uniform float uRings, uAlarm, uBlink, uTwinkle, uWin, uKeyed, uCard, uExpose; uniform vec4 uBr[NB]; varying vec3 vW;
const float RC = ${RC.toFixed(1)}, RT = ${(RC - 0.5).toFixed(1)}, BAND = ${BAND.toFixed(1)};
float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*0.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
void main(){
  vec4 p = uProj*vec4(vW, 1.0);
  if(p.w <= 0.0){ if(uKeyed > 0.5) discard; gl_FragColor = vec4(uHaze, 1.0); return; }
  vec2 uv = p.xy/p.w*0.5+0.5;
  float level = vW.y;
  if(uKeyed > 0.5){
    if(uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) discard;
    // whose pixel this is: the hero ray against the tower (a cylinder) and every bridge's slab
    vec3 d = normalize(vW-uHero); vec2 o = vec2(uHero.x, uHero.z+RC);
    float A = dot(d.xz, d.xz), B = dot(o, d.xz), disc = B*B-A*(dot(o, o)-RT*RT), tTower = disc > 0.0 ? (-B-sqrt(disc))/A : 1e9;
    float tSelf = uCard > 0.5 ? 1e9 : length(vW-uHero);
    if(uCard < 0.5 && tSelf > tTower) discard;
    for(int i = 0; i < NB; i++){
      vec4 b = uBr[i]; float t = (b.x-uHero.y)/d.y;
      if(t > 0.0 && t < tSelf-0.05 && t < tTower){ vec3 q = uHero+d*t; vec2 r = vec2(q.x, q.z+RC); float sa = sin(b.y), ca = cos(b.y), along = r.x*sa+r.y*ca, across = r.x*ca-r.y*sa; if(along > b.w && along < 152.0 && abs(across) < b.z) discard; }
    }
    if(uCard > 0.5 && disc > 0.0) level = uHero.y+d.y*tTower;      // on the tower: the level the ray meets it at (beside it, a bridge: about the card's own)
  }
  vec4 day = texture2D(tDay, uv), red = texture2D(tAlarm, uv);
  float alpha = uKeyed > 0.5 ? day.a : 1.0; if(alpha < 0.004) discard;
  vec3 col = day.rgb;
  // lit windows: which are on changes with the strings
  if(day.r > 0.7 && day.b < day.r*0.66 && day.g > day.r*0.62){ vec2 cell = floor(uv*vec2(560.0, 312.0)); float h = hash(cell), flip = hash(cell+floor(uTwinkle*0.5+h*3.0)*0.37); col = flip < 0.32 ? col*vec3(0.36, 0.36, 0.6) : col*(0.92+0.2*uWin); }
  // the alarm: band by band (a band is two storeys), outward from the gantry's level; a band flares as it turns
  float st = floor(level/BAND+0.5), reach = uRings-abs(st), lit = step(0.5, reach);
  float bl = 0.84+0.16*step(0.5, fract(uBlink+st*0.5));
  col = mix(col, red.rgb*(0.94+0.1*uAlarm), lit*bl);
  col += vec3(1.0, 0.42, 0.3)*0.4*lit*clamp(1.0-(reach-0.5)/1.6, 0.0, 1.0);
  gl_FragColor = vec4(col*uExpose*alpha, alpha);
}`;
  const layerMat = (day, alarm, keyed, card) => new THREE.ShaderMaterial({ vertexShader: PROJECT_VS, fragmentShader: LAYER_FS, uniforms: { ...LU, tDay: { value: day }, tAlarm: { value: alarm }, uKeyed: { value: keyed }, uCard: { value: card } } });
  const lay = (geom, material, order) => { const m = new THREE.Mesh(geom, material); painted(material, m, order); vista.add(m); return m; };
  {
    const far = layerMat(farDay, farAlarm, 0, 0), mid = layerMat(midDay, midAlarm, 1, 0), card = layerMat(midDay, midAlarm, 1, 1);
    lay(cylG(RA, LOWY, TOPY + 300, 96), far, -30); lay(new THREE.CircleGeometry(RA, 48).rotateX(-Math.PI / 2).translate(0, LOWY, -RC), far, -30);
    lay(quadGeometry([0, MY, -RC], [CARD.z, 0, -CARD.x], Y, 700, HY + 400), card, -20);
    for (const [y, t] of BRIDGES) if (SLAB(y)) lay(new THREE.PlaneGeometry(2 * SLAB(y), 152 - RC + 0.5).rotateX(-Math.PI / 2).translate(0, y, (152 + RC - 0.5) / 2).applyMatrix4(round(t)), mid, -19);
    // where a point of the paintings is in the world: on the wall (far), or on the tower's card
    const onWall = (u, v) => { const { o, d } = PJ.ray(u, v), ox = o.x, oz = o.z + RC, A = d.x * d.x + d.z * d.z, B = ox * d.x + oz * d.z, C = ox * ox + oz * oz - RA * RA; return o.addScaledVector(d, (-B + Math.sqrt(B * B - A * C)) / A); };
    const onCard = (u, v) => { const { o, d } = PJ.ray(u, v); return o.clone().addScaledVector(d, AXIS.clone().sub(o).dot(CARD) / d.dot(CARD)); };
    // the blank panels: [layer, which picture, the panel's corners in the 4096 x 2286 painting: TL, TR, BR, BL]
    const PW = 4096, PH = 2286, PANELS = [
      ["mid", 0, [2172, 925], [2491, 991], [2452, 1218], [2164, 1136]], ["mid", 1, [2572, 957], [2820, 936], [2800, 1030], [2562, 1060]], ["mid", 2, [2267, -40], [2625, -40], [2598, 172], [2255, 185]],
      ["far", 1, [647, 1250], [950, 1112], [1037, 1322], [772, 1470]], ["far", 0, [1000, 1095], [1180, 1025], [1242, 1227], [1080, 1302]], ["far", 0, [3305, 135], [4130, 92], [4110, 583], [3185, 495]], ["far", 2, [1345, -30], [1790, -30], [1800, 162], [1377, 149]]];
    for (const [layer, kind, ...px] of PANELS) vista.add(paintedScreen(PJ, px.map(([x, y]) => [x / PW, 1 - y / PH]), layer === "far" ? onWall : onCard, screens[kind].t, G.screens, frameU, layer === "far" ? -25 : -15));
  }
  // drifting haze: flat pale wisps on two levels down the shaft, behind the tower
  const hazeU = { uCol: { value: new THREE.Color(...HAZE) }, uTurn: { value: 0 } };
  {
    const tex = canvasTex(1024, 1024, (c) => { const r = rng(7); for (let i = 0; i < 46; i++) { const x = r() * 1024, y = r() * 1024, w = 120 + r() * 260, h = 16 + r() * 34; for (const [k, a] of [[1, 0.5], [0.62, 1]]) { c.fillStyle = `rgba(255,255,255,${a})`; for (const dx of [-1024, 0, 1024]) for (const dy of [-1024, 0, 1024]) { c.beginPath(); c.ellipse(x + dx, y + dy, w * k, h * k, 0, 0, 7); c.fill(); } } } }, { repeat: true });
    const fs = `uniform sampler2D tMap; uniform vec3 uCol; uniform float uTurn, uAlpha, uScale; varying vec3 vW;
void main(){ vec2 r = vec2(vW.x, vW.z+${RC.toFixed(1)}); float a = uTurn, c = cos(a), s = sin(a); vec2 q = vec2(r.x*c-r.y*s, r.x*s+r.y*c)/uScale; float w = texture2D(tMap, q).a; w = (w > 0.75 ? 1.0 : (w > 0.25 ? 0.55 : 0.0))*uAlpha*smoothstep(${(RA - 4).toFixed(1)}, ${(RA - 40).toFixed(1)}, length(r)); gl_FragColor = vec4(uCol*w, w); }`;
    for (const [y, r0, alpha, scale, order] of [[-150, 18, 0.3, 330, -22], [-260, 18, 0.22, 420, -23]]) lay(new THREE.RingGeometry(r0, RA, 64, 1).rotateX(-Math.PI / 2).translate(0, y, -RC), new THREE.ShaderMaterial({ vertexShader: PROJECT_VS, fragmentShader: fs, uniforms: { ...hazeU, tMap: { value: tex }, uAlpha: { value: alpha }, uScale: { value: scale } } }), order);
  }
  scene.add(vista);
  // ---- small craft crossing the shaft: a hull, a canopy, two pods, running lights. Each goes straight for the few seconds
  // the vista is on: [where it is at CRAFT_T (seconds into the song), metres a second, size]. None passes behind the tower.
  const craft = [], CRAFT_T = 21.6;
  {
    // drawn in plan, since the vista looks down on them: a dart of a hull, a cabin on it, swept stub wings, a fin
    const c = kit.builder(), glow = (col) => mat(col, { kind: 1, fog: 0.4, gain: G.craft }), up = { rx: Math.PI / 2 }, both = (pts) => [...pts, ...pts.slice().reverse().map(([x, y]) => [-x, y])];
    c.slab(both([[0.25, 4.0], [0.95, 2.2], [1.1, -0.5], [2.7, -2.5], [2.7, -3.3], [0.95, -3.0], [0.8, -3.6]]), 0.9, 0, 0.45, 0, mat(cream), up);
    c.slab(both([[0.2, 2.7], [0.62, 1.6], [0.7, -2.5]]), 0.5, 0, 0.95, 0, mat(cream2), up); c.slab(both([[0.15, 2.6], [0.5, 1.7], [0.52, 0.9]]), 0.52, 0, 0.98, 0, mat(dark), up);      // the cabin, its glass
    for (const s of [1, -1]) {
      c.slab([[s * 1.25, -1.1], [s * 2.6, -2.75], [s * 2.6, -3.15], [s * 1.25, -2.9]], 0.06, 0, 0.5, 0, mat(orange), up);
      c.cyl(0.36, 1.6, s * 0.5, 0, -3.4, mat(steel2), "z", 8); c.cyl(0.26, 0.12, s * 0.5, 0, -4.24, glow("#9feaff"), "z", 8);
      c.box(0.2, 0.2, 0.2, s * 2.7, 0.1, -2.9, glow(s > 0 ? "#5dffa8" : "#ff4a36")); c.box(0.26, 0.16, 0.1, s * 0.5, -0.1, 3.3, glow("#fff4c0"));
    }
    c.slab([[-3.5, 0.9], [-2.3, 0.9], [-3.0, 2.0], [-3.6, 2.0]], 0.14, 0.07, 0, 0, mat(orange), { ry: -Math.PI / 2 });      // the fin
    c.box(0.2, 0.2, 0.2, 0, 2.1, -3.3, mat("#ffffff", { kind: 1, fog: 0.4, gain: G.strobe }));
    const proto = c.build();
    for (const [p, v, sc] of [[[-50, -10, -10], [-3, 0, 14], 1.3], [[-75, -35, -35], [12, 0, 2], 1.5], [[-40, -60, 5], [-10, 0, -6], 1.4], [[-95, 5, -70], [8, 0, 10], 2.0], [[-110, -50, -20], [4, 0, -13], 2.0], [[48, 22, -30], [-3, 0, 12], 1.4], [[-100, -150, -60], [-6, 0, 12], 2.2]]) {
      const g = proto.clone(); g.traverse((m) => { m.frustumCulled = false; }); scene.add(g); craft.push({ g, p, v, sc });
    }
  }
  // a red halo on each of the gantry's beacons, shown once it is lit
  const haloTex = canvasTex(128, 128, (c) => { c.fillStyle = "rgba(255,255,255,0.2)"; c.beginPath(); c.arc(64, 64, 60, 0, 7); c.fill(); c.fillStyle = "rgba(255,255,255,0.45)"; c.beginPath(); c.arc(64, 64, 34, 0, 7); c.fill(); c.fillStyle = "rgba(255,255,255,0.9)"; c.beginPath(); c.arc(64, 64, 15, 0, 7); c.fill(); });
  const haloMat = kit.mat("#ff3a28", { kind: 7, flag: 1, map: haloTex, alpha: 0.85, fog: 0.25 }), halos = [];
  for (let z = POSTS; z <= GANTRY.len; z += POSTS) for (const s of [1, -1]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), haloMat); m.layers.set(FX); m.renderOrder = 12; m.frustumCulled = false; m.position.set(s * (GANTRY.w / 2 + 0.1), 2.52, z); scene.add(m); halos.push(m); }
  const drones = createDrones(kit, scene), markers = createMarkers(scene), shadows = createShadows(kit, scene, "#252a52");
  let warden = null;      // the reunion's machine (machines/warden.js), built the first time a shot asks for it

  function update(cam, frame, sync, opt = {}) {
    const w = driveAll(sync, WIRING, frame, opt.wiring), t = frame / sync.fps, A = opt.alarm ?? {}, alert = opt.alert ?? 0;
    aim(camera, { far: 1200, ...cam }, W / H); shared.uCam.value.copy(camera.position); shared.uFrame.value = frame;
    U.uHull.value = clamp(w.hull, 0, 1.3); U.uWin.value = clamp(w.windows, 0, 1.4); U.uTwinkle.value = w.twinkle; U.uRings.value = A.rings ?? 0; U.uGantry.value = A.gantry ?? -1;
    U.uAlarm.value = clamp(0.45 + alert * 0.4 + w.klaxon * 0.5 + 0.5 * w.note, 0, 1.6); U.uBlink.value = t * 3.6;
    G.screens.value = clamp(w.screens, 0, 1.4); G.craft.value = clamp(w.traffic, 0, 1.4) * 1.3;
    const sp = opt.screens ?? {}; screens.forEach((s, i) => { drawScreen(s.g, sp, frame, i); s.t.needsUpdate = true; });
    const guide = !!opt.guide, V = clamp(opt.vista ?? 0), reds = clamp((A.rings ?? 0) / 3) * V;      // (close to, at a doorway, the place keeps its own light)
    gantryG.visible = opt.gantry !== false; const block = guide || opt.door === "stairs";      // the stair tower's doorway is not in the paintings: round it, the blockout still stands in
    wallG.visible = block; coreG.visible = block && opt.guide !== "wall"; vista.visible = !block; U.uGuide.value = guide ? 1 : 0;
    U.uVista.value = V; faceG.visible = V < 1; frameU.value = frame; hazeU.uTurn.value = t * 0.012; { const k = clamp((A.rings ?? 0) / 12); hazeU.uCol.value.setRGB(lerp(HAZE[0], 1.0, k), lerp(HAZE[1], 0.62, k), lerp(HAZE[2], 0.66, k)); }
    // the geometry in front of the painting takes the alarm's light as the rings turn
    shared.uTintLit.value.setRGB(lerp(1.03, 1.1, reds), lerp(1.03, 0.86, reds), lerp(1.0, 0.8, reds)); shared.uTintMid.value.setRGB(lerp(0.72, 0.82, reds), lerp(0.76, 0.52, reds), lerp(0.96, 0.7, reds)); shared.uTintShade.value.setRGB(lerp(0.4, 0.5, reds), lerp(0.42, 0.24, reds), lerp(0.7, 0.42, reds));
    doors.inside.visible = V < 1; doors.flat.visible = V >= 1;
    doors.vault.visible = !guide && (opt.door ?? "vault") === "vault"; doors.stairs.visible = !guide && !doors.vault.visible;
    G.strobe.value = (frame % 12) < 2 ? 2.2 : 0.15;
    for (const c of craft) { const dt = t - CRAFT_T; c.g.visible = !guide; c.g.position.set(c.p[0] + c.v[0] * dt, c.p[1] + c.v[1] * dt + 0.5 * Math.sin(t * 1.3 + c.p[0]), c.p[2] + c.v[2] * dt); c.g.rotation.set(0, Math.atan2(c.v[0], c.v[2]), 0.1 * Math.sin(t * 0.9 + c.p[2])); c.g.scale.setScalar(c.sc); }
    halos.forEach((m, i) => { const on = m.position.z <= U.uGantry.value, k = Math.floor(m.position.z / POSTS + 0.5), bl = ((U.uBlink.value + k * 0.5) % 1) >= 0.5 ? 1 : 0.5; m.visible = on; if (on) { m.quaternion.copy(camera.quaternion); m.scale.setScalar((0.9 + 0.8 * U.uAlarm.value) * bl * (1 + camera.position.distanceTo(m.position) * 0.012)); } });
    drones.update(opt.drones ?? [], frame, sync, camera, { thrust: w.thrust });
    if (opt.warden || warden) (warden ??= createWarden(kit, scene)).update(opt.warden ?? null, frame, sync, camera);
    markers.update(opt.markers); shadows.update(opt.shadows);
    return { scene, camera, wires: w, clear: opt.clear ?? 0xb3e6ed, post: { inkColor: [0.1, 0.1, 0.3], shadowTint: [0.01, 0.012, 0.04], bloom: lerp(0.55, 0.3, V), bloomThreshold: lerp(0.78, 0.9, V), diffusion: lerp(0.16, 0.07, V), contrast: lerp(0.42, 0.3, V), sat: lerp(1.14, 1.08, V), inkFar: 0.022, ...opt.post } };
  }
  // The light on a figure at p: the atrium's daylight from above, cool and even; in the doorway, the red of whatever is
  // behind them (the vault), fading over the first few metres of the gantry.
  function light(p, opt = {}) {
    const red = (opt.door ?? "vault") === "vault" ? clamp(1 - (p[2] - 0.5) / 5) : 0;
    const al = clamp((opt.alarm?.rings ?? 0) / 3) * (1 - red) * clamp(opt.vista ?? 0);
    return { tint: [lerp(0.98, 1.0, red) + 0.04 * al, lerp(1.0, 0.72, red) - 0.14 * al, lerp(1.04, 0.72, red) - 0.2 * al], rim: red > 0.5 ? [1.0, 0.3, 0.2] : [0.85, 0.97, 1.0], from: red > 0.5 ? [0, 0.3, -1] : [0, 1, 0],
      fogK: shared.uFogK.value, fogColor: HAZE, gradient: 0.16 };
  }
  return { name: "atrium", scene, camera, kit, update, light, floorAt, WIRING, RA, RC };
}
