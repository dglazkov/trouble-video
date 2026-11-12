// The archive vault: a tall eight-sided silo of the station's memory. Tape-reel racks in the piers, banks of CRTs up
// the walls, galleries, cable trunks rising out of a ring of consoles at the centre into the dark, and dozens of
// monitors on jointed arms. It is lit by its screens alone (cold phosphor on near-black teal) and by whatever is
// inside the console ring, which is never seen: only its gold light, fanning over the floor through the ring's gaps
// and climbing the trunks. Then it turns on whoever is in it: a guillotine shutter per bay, a rack of folded drones
// lowered from the ceiling, floor lights that go red. Nothing like the corridor (indigo, cyan) or the market (amber).
//
//   const set = await createVault(renderer, { width, height });
//   const { scene, camera, clear, post } = set.update(camera, frame, sync, options);   // camera = engine/body.js's { pos, target, fov, up }
//   set.light([x, y, z], options) -> the light a figure standing there is in;  set.floorAt(x, z) -> 0
//
// Cue options (all optional; every one is a plain value for this frame):
//   wake       { first, rest }    seconds since the first screen, and since all the others, were switched on (a
//                                 negative number or null: still dark). Each of the others comes on a little after
//                                 `rest`, in its own time, with a flicker. Default: all long on.
//   swivel     0..1               how far the monitors on arms have turned from where they idled to face `focus`
//                                 (each in its own time, overshooting; default 1)
//   focus      [x, y, z]          what they face (default: the middle of the floor in front of the ring, FOCUS)
//   tilt       degrees            the first screen cocks its head
//   speech     { text, small, level, alarm: 0..1, glitch: 0..1 }
//                                 what the screens say: one word, large, in the station's lettering, over the voice's
//                                 waveform and level bars (level: 0..1, default the `speak` wire); `small` is a
//                                 line under it; alarm turns the phosphor red; glitch tears the picture
//   doors      { [k]: 0..1 }      how far shut bay k's shutter is (1 = down). Bay 0 is the way to the corridors, in the
//                                 wall toward +X and a little +Z; they count round through the two back walls
//                                 (toward -Z: 2 on the +X side, 3 on the -X side) and -X (4, 5) to +Z (6, 7).
//   racks      0..1               the drone racks lowered out of the ceiling (0: up in the dark)
//   drones     [...]              machines/drones.js specs; hanging(i, { racks, unfold, eye }) gives the spec of the
//                                 drone in rack slot i, folded under the rack or unfolding from it
//   red        0..3               the floor's three rings of light turned red, the outermost first; the room's
//                                 light goes with them
//   gold       0..1               the light from inside the console ring (default 1)
//   alert      0..1               beacons over the bays and a red sweep round the walls (the klaxon wire adds to it)
//   wiring     { name: wire }     replace wires of WIRING for this frame
//   markers, shadows, post, clear as in the other sets
// Geometry worth knowing: the floor is y = 0, the walls' faces 10 m from the centre (R), each bay's doorway 3.4 m wide
// and 4.2 m high; the console ring is 1.5 m in radius round (0, 0, 0); galleries at 5.2 m and 10 m; the first screen
// stands at FIRST.
import * as THREE from "three";
import { createKit, createShadows, canvasTex, aim, hash, rng, clamp, lerp, sstep, FX } from "./kit.js";
import { kana, latin, scanlines, hazard, chevrons, kanaWidth, FONT } from "./sign.js";
import { driveAll } from "../engine/sync.js";
import { createDrones } from "../machines/drones.js";
import { createMarkers } from "./markers.js";

export const R = 10, HEIGHT = 17, DOOR = { w: 3.4, h: 4.2 }, RING = 1.5, FIRST = [-2.3, 1.42, 6.3], FOCUS = [0.2, 1.3, 2.7], RACK = { r: 3.9, n: 12, up: 13.5, down: 6.4 };
export const floorAt = () => 0;
// bay k's outward direction, and the point of its doorway's threshold
export const bayAngle = (k) => (k - 0.5) * Math.PI / 4;
export const bayDir = (k) => [Math.cos(bayAngle(k)), 0, -Math.sin(bayAngle(k))];
export const bayAt = (k, back = 0) => { const d = bayDir(k); return [d[0] * (R + back), 0, d[2] * (R + back)]; };
// The drone of rack slot i. o: { racks: how far the racks are lowered, unfold: 0 hanging folded .. 1 let go and level,
// eye: how hard its eye burns, look: [x, y, z] what it turns to as it unfolds, drop: metres it sinks under the rack }
export function hanging(i, o = {}) {
  const a = (i + 0.5) / RACK.n * 2 * Math.PI, y = lerp(RACK.up, RACK.down, sstep(0, 1, o.racks ?? 1)), u = clamp(o.unfold ?? 0), e = sstep(0, 1, u), x = Math.cos(a) * RACK.r, z = Math.sin(a) * RACK.r;
  const look = o.look ?? FOCUS, yawTo = Math.atan2(look[0] - x, look[2] - z) * 180 / Math.PI, yawOut = Math.atan2(x, z) * 180 / Math.PI, dy = y - 0.95 - (o.drop ?? 0.8) * e - look[1], pitch = Math.atan2(dy, Math.hypot(look[0] - x, look[2] - z)) * 180 / Math.PI;
  let dyaw = ((yawTo - yawOut + 540) % 360) - 180;
  return { type: "chaser", pos: [x, y - 0.95 - (o.drop ?? 0.8) * e, z], yaw: yawOut + dyaw * e, pitch: lerp(-90, -pitch, e), roll: (1 - e) * 0, fold: 1 - sstep(0.15, 0.9, u), eye: o.eye ?? 0, thrust: e > 0.5 ? undefined : 0, scale: o.scale ?? 1.25, seed: 200 + i };
}
// The station plays the song: each system is one wire from a stem (engine/sync.js drive()).
export const WIRING = {
  glow: { stem: "strings", mode: "env", floor: 0.86, gain: 0.32 },                 // the screens' light on the room swells with the strings
  flicker: { stem: "strings", mode: "pulse", decay: 0.07, gain: 1 },               // and every screen jumps on each note of them
  twitch: { stem: "strings", mode: "count", gain: 1 },                             // the monitors' servos tick round a step on each note
  speak: { stem: "lead_vocals", mode: "env", gain: 1.25 },                         // the waveform and bars on the screens: the voice
  chorus: { stem: "backing_vocals", mode: "env", gain: 1 },
  klaxon: { stem: "brass", mode: "env", gain: 1.6 },                               // beacons and the red sweep
  floor: { stem: "bass", mode: "env", floor: 0.6, gain: 1.4 },                     // the floor's rings of light, and the gold in the ring
  reels: { stem: "keyboard", mode: "env", floor: 0.3, gain: 1.0 },                 // tape reels
  meters: { stem: "percussion", mode: "env", floor: 0.15, gain: 1.0 },             // level meters on the racks
  thrust: { stem: "drums", mode: "pulse", decay: 0.15, gain: 1 },                  // drones
};

const CHUNK = `
uniform float uGlow, uFirst, uGold, uRed, uAlarm, uAlarmAng, uFloor; uniform vec3 uFirstPos; uniform float uDoor[8];
float bayOf(vec3 W){ return mod(floor(atan(-W.z, W.x)/0.7853982+1.0), 8.0); }
float doorShut(vec3 W){ int k = int(bayOf(W)); float s = 0.0; for(int i=0;i<8;i++) if(i==k) s = uDoor[i]; return s; }
float setTone(vec3 W, vec3 N){
  float r = length(W.xz), wob = (vnoise(surf(W, N)*1.3)-0.5);
  if(r > 10.6) return W.y+wob*0.3 < 1.6 ? 1.0 : 0.0;                          // the passages beyond the bays
  if(N.y > 0.7 && W.y < 0.3){
    // the floor: a pool at each ring of light, the rest in the dark
    float d = min(min(abs(r-3.0), abs(r-5.4)), abs(r-7.8))+wob*0.22;
    return d < 0.42*uFloor ? 2.0 : (d < 1.05*uFloor ? 1.0 : 0.0);
  }
  // everything standing: what faces the middle of the room is lit, low down; higher up it steps into the dark
  float c = dot(N, normalize(vec3(-W.x, 0.35, -W.z))), h = W.y+wob*0.9;
  float t = c > 0.45 ? 2.0 : (c > -0.25 ? 1.0 : 0.0);
  if(h > 4.4) t -= 1.0; if(h > 9.3) t -= 1.0;
  if(N.y > 0.7 && h < 4.4) t = max(t, 1.0);
  return max(t, 0.0);
}
vec3 setExtra(vec3 col, vec3 W, vec3 N, float tone){
  float r = length(W.xz), ang = atan(W.z, W.x), wob = (vnoise(surf(W, N)*1.3)-0.5);
  // value steps up the silo
  col *= W.y > 12.0 ? 0.45 : (W.y > 8.0 ? 0.68 : 1.0);
  vec3 ring = mix(vec3(0.55,0.95,0.9), vec3(1.0,0.12,0.1), 1.0);
  if(N.y > 0.7 && W.y < 0.3 && r < 10.6){
    // the floor's rings: their light is cold until they are turned red, the outermost first
    float i = r > 6.6 ? 0.0 : (r > 4.2 ? 1.0 : 2.0), red = step(i+0.5, uRed);
    float d = min(min(abs(r-3.0), abs(r-5.4)), abs(r-7.8))+wob*0.22;
    vec3 lc = mix(vec3(0.5,0.95,0.9), vec3(1.0,0.1,0.08), red);
    col += lc*(step(d, 0.42*uFloor)*0.2 + step(d, 1.05*uFloor)*0.1)*uFloor*(0.4+0.6*max(uGlow, red));
    // gold from inside the console ring, through its eight gaps: hard fans over the floor
    float fan = abs(fract(ang/0.7853982+0.5)-0.5);
    float reach = 6.4+wob*0.8;
    if(r > 1.2 && fan < 0.12-0.008*r && r < reach) col += vec3(1.0,0.62,0.16)*(r < 3.6 ? 0.5 : 0.26)*uGold;
    if(r < 2.15+wob*0.2) col += vec3(1.0,0.62,0.16)*0.12*uGold;
  } else if(r < 10.6){
    // gold on whatever looks down into the ring or faces it from close by
    float c = dot(N, normalize(vec3(-W.x, 0.0, -W.z)));
    if(r < 1.32 && W.y < 1.15) col = col*0.4 + vec3(1.0,0.66,0.2)*0.85*uGold;
    else if(r < 1.6 && W.y >= 1.15){ col *= 0.35; if(c > 0.55 && W.y < 6.5+wob*2.0) col += vec3(1.0,0.6,0.15)*(W.y < 3.2+wob ? 0.55 : 0.22)*uGold; }
    else if(r < 3.4 && W.y > 1.1 && W.y < 7.5+wob*2.0 && (N.y < -0.2 || c > 0.3)) col += vec3(1.0,0.6,0.15)*(W.y < 4.0 ? 0.3 : 0.16)*uGold;
    if(r > 9.2) col *= 0.66;                                                    // the walls sit a step behind what stands in the room
    // red from the floor on what stands over a red ring
    float red = clamp(uRed/3.0, 0.0, 1.0);
    if(W.y < 2.2+wob && red > 0.0) col = mix(col, col*vec3(1.5,0.5,0.5)+vec3(0.14,0.0,0.01), red*0.7);
  }
  // the first screen, alone in the dark: its light on what is near it
  if(uFirst > 0.0){ float d = distance(W, uFirstPos)+wob*0.15; col += vec3(0.25,0.9,0.6)*(step(d, 0.75)*0.2+step(d, 1.6)*0.1)*uFirst*(1.0-min(1.0, uGlow*1.3)); }
  if(uAlarm > 0.0 && r < 10.6){
    float on = step(fract((ang+uAlarmAng+W.y*0.22)/3.14159), 0.11);
    col = mix(col, col*vec3(1.6,0.4,0.45)+vec3(0.2,0.0,0.02), on*clamp(uAlarm, 0.0, 1.0));
  }
  return col;
}
float setEmit(vec3 W, int flag){
  if(flag == 0) return 1.0;
  if(flag == 1) return 0.02+1.2*uFloor;                                                  // the floor's rings
  if(flag == 2) return 0.12+1.5*step(0.97, doorShut(W));                                  // the lamp over a bay: lit when its shutter is down
  if(flag == 3) return 0.2+1.3*clamp(uAlarm, 0.0, 1.0)*step(0.5, fract(uAlarmAng/3.14159+bayOf(W)*0.37));   // beacons
  if(flag == 4) return (0.5+0.5*uFloor)*uGold;                                            // the gold inside the ring
  if(flag == 5) return 0.22+0.78*uGlow;                                                     // pilot lights
  return 1.0;
}
vec3 setSpecial(vec3 W, vec3 d, vec2 uv){ return vec3(0.0); }`;

// ---- what the screens say -----------------------------------------------------------------------------------------
// One picture for every screen, redrawn each frame, in three layouts (the word; the voice's trace; its level bars).
const SW = 384, SH = 288;
function drawSpeech(c, kind, o, frame) {
  const alarm = o.alarm ?? 0, level = clamp(o.level ?? 0, 0, 1.2), ink = alarm > 0.5 ? "#ff4a3a" : "#5dffa8", bg = alarm > 0.5 ? "#3a0606" : "#06331f", dim = alarm > 0.5 ? "#a8261c" : "#2a9a60";
  const f2 = Math.floor(frame / 2);
  c.setTransform(1, 0, 0, 1, 0, 0); c.fillStyle = bg; c.fillRect(0, 0, SW, SH);
  c.strokeStyle = dim; c.lineWidth = 4; c.strokeRect(10, 10, SW - 20, SH - 20);
  const trace = (y, h, n = 64) => {      // the voice: a trace that is flat when it is silent
    c.strokeStyle = ink; c.lineWidth = 7; c.lineJoin = "miter"; c.beginPath();
    for (let i = 0; i <= n; i++) { const x = 22 + i * (SW - 44) / n, a = level * h * (0.25 + 0.75 * hash(i, f2, 3)) * Math.sin(i * 1.9 + f2 * 2.1) * Math.sin(Math.PI * i / n); i ? c.lineTo(x, y + a) : c.moveTo(x, y); }
    c.stroke();
  };
  const bars = (x, y, w, h, n) => { for (let i = 0; i < n; i++) { const v = clamp(level * (0.35 + 0.9 * hash(i, f2, 7))), cells = 7, bw = w / n; for (let j = 0; j < cells; j++) { c.fillStyle = j / cells < v ? (j >= cells - 2 ? "#ff5a48" : ink) : dim; c.globalAlpha = j / cells < v ? 1 : 0.35; c.fillRect(x + i * bw + 2, y + h - (j + 1) * h / cells + 2, bw - 5, h / cells - 4); } } c.globalAlpha = 1; };
  if (kind === 0) {
    const t = o.text ?? "";
    if (t) { let px = 118; c.font = FONT(px); const w = c.measureText(t).width; if (w > SW - 52) px = Math.floor(px * (SW - 52) / w); latin(c, t, SW / 2, 150, px, ink, { align: "center" }); }
    else { c.fillStyle = hash(f2 >> 2, 1) > 0.5 ? ink : dim; c.fillRect(SW / 2 - 14, 96, 28, 44); }      // a waiting cursor
    if (o.small) kana(c, o.small, SW / 2 - kanaWidth(o.small, 34) / 2, 176, 34, 5, ink);
    trace(o.small ? 244 : 216, 34);
    c.fillStyle = hash(f2 >> 1, 5) > 0.3 ? "#ff5a48" : dim; c.beginPath(); c.arc(34, 34, 9, 0, 7); c.fill(); latin(c, "VOX", 52, 43, 24, dim);
  } else if (kind === 1) { trace(SH / 2, 96, 80); latin(c, "CH-1", 24, 44, 24, dim); c.fillStyle = dim; for (let i = 0; i < 9; i++) c.fillRect(22 + i * 40, SH - 34, 3, 12); }
  else { bars(26, 34, SW - 52, SH - 70, 9); }
  scanlines(c, SW, SH, 0.38, 6);
  const g = o.glitch ?? 0;
  if (g > 0) for (let i = 0; i < 5; i++) { if (hash(i, frame, 11) > g) continue; const y = Math.floor(hash(i, frame, 12) * (SH - 30)), h = 8 + Math.floor(hash(i, frame, 13) * 30), dx = Math.round((hash(i, frame, 14) - 0.5) * 120); c.drawImage(c.canvas, 0, y, SW, h, dx, y, SW, h); }
}

function textures() {
  const T = {};
  // a shutter: the painting on its room-side face
  T.shutter = canvasTex(680, 860, (c) => {
    c.fillStyle = "#b9ad8a"; c.fillRect(0, 0, 680, 860);
    c.fillStyle = "#a59974"; for (let i = 0; i < 9; i++) c.fillRect(0, i * 96 + 40, 680, 10);
    c.fillStyle = "#8a7f60"; for (let i = 0; i < 9; i++) c.fillRect(0, i * 96 + 50, 680, 4);
    c.fillStyle = "#16181c"; c.fillRect(0, 0, 680, 28); hazard(c, 0, 730, 680, 130, "#f2a81d", "#16181c", 92); c.fillStyle = "#16181c"; c.fillRect(0, 722, 680, 10);
    c.fillStyle = "#16181c"; c.fillRect(60, 150, 560, 300); c.strokeStyle = "#c8261c"; c.lineWidth = 10; c.strokeRect(74, 164, 532, 272);
    kana(c, "フウサ", 122, 190, 132, 20, "#e8402e"); latin(c, "VAULT SEALED", 340, 404, 46, "#e8402e", { align: "center" });
    c.fillStyle = "#16181c"; for (const x of [90, 590]) for (const y of [86, 640]) { c.beginPath(); c.arc(x, y, 18, 0, 7); c.fill(); }
    chevrons(c, 170, 520, 340, 150, 3, 26, "#16181c", 1); c.save(); c.translate(340, 595); c.rotate(Math.PI / 2); c.restore();
  });
  const sign = (w, h, col, bg, draw) => canvasTex(w, h, (c) => { c.fillStyle = bg; c.fillRect(0, 0, w, h); c.strokeStyle = col; c.lineWidth = 6; c.strokeRect(10, 10, w - 20, h - 20); draw(c); scanlines(c, w, h); });
  const names = ["ロウカ", "テープ", "キロク", "ホカン", "コア", "アーカイブ", "デンゲン", "レイキャク"];
  T.bays = names.map((n, k) => sign(512, 128, "#ffb428", "#1c0d02", (c) => { latin(c, `V-0${k + 1}`, 24, 94, 84, "#ffb428"); kana(c, n, 270, 30, n.length > 4 ? 44 : 64, n.length > 4 ? 7 : 10, "#ffb428"); }));
  const st = (str, col = "#fff") => canvasTex(Math.ceil(kanaWidth(str, 104) + 28), 128, (c) => kana(c, str, 14, 12, 104, 17, col));
  T.stencils = ["アーカイブ", "キロク ホカン", "タチイリ キンシ", "テープ", "キケン"].map((s) => ({ tex: st(s), w: kanaWidth(s, 104) / 104 * 0.62 }));
  T.codes = [1, 2, 3, 4, 5, 6, 7, 8].map((k) => canvasTex(288, 128, (c) => latin(c, `V-0${k}`, 4, 104, 104, "#fff")));
  T.cassette = canvasTex(256, 160, (c) => { c.fillStyle = "#d9d2b8"; c.fillRect(0, 0, 256, 160); c.fillStyle = "#16181c"; c.fillRect(20, 22, 216, 84); c.fillStyle = "#f2a81d"; c.fillRect(20, 22, 216, 14); c.fillStyle = "#d9d2b8"; for (const x of [84, 172]) { c.beginPath(); c.arc(x, 72, 20, 0, 7); c.fill(); } c.fillStyle = "#16181c"; for (const x of [84, 172]) { c.beginPath(); c.arc(x, 72, 8, 0, 7); c.fill(); } latin(c, "REC 00", 24, 142, 28, "#16181c"); });
  // wall screens that never speak: archive listings, the bay map, a level trace
  T.idle = [
    sign(384, 288, "#5dffa8", "#02160d", (c) => { for (let i = 0; i < 9; i++) { c.fillStyle = i === 3 ? "#ffb428" : "#2ea86a"; c.fillRect(28, 34 + i * 26, 60 + hash(i, 2) * 240, 12); } }),
    sign(384, 288, "#ffb428", "#1c0d02", (c) => { c.strokeStyle = "#ffb428"; c.lineWidth = 5; c.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 + Math.PI / 8; i ? c.lineTo(192 + Math.cos(a) * 96, 132 + Math.sin(a) * 96) : c.moveTo(192 + Math.cos(a) * 96, 132 + Math.sin(a) * 96); } c.closePath(); c.stroke(); c.beginPath(); c.arc(192, 132, 26, 0, 7); c.stroke(); c.fillStyle = "#ff5a48"; c.fillRect(276, 122, 20, 20); kana(c, "アーカイブ", 76, 238, 40, 6, "#ffb428"); }),
    sign(384, 288, "#5dffa8", "#02160d", (c) => { kana(c, "キロク", 40, 40, 92, 13, "#5dffa8"); latin(c, "REEL 0144 / 2051", 40, 196, 28, "#5dffa8"); c.fillStyle = "#5dffa8"; for (let i = 0; i < 12; i++) c.fillRect(40 + i * 26, 250 - (8 + ((i * 37) % 34)), 16, 8 + ((i * 37) % 34)); }),
  ];
  return T;
}

// The floor, painted: 2048 px for 22 m. Canvas x is world x, canvas y is world z.
function floorTex(T) {
  return canvasTex(2048, 2048, (c) => {
    const S = 2048 / 22, C = 1024, m = (v) => v * S;
    c.fillStyle = "#27444a"; c.fillRect(0, 0, 2048, 2048);
    for (let r = 0; r < 6; r++) for (let k = 0; k < 24; k++) {      // plates, a step darker or lighter by hand
      const h = hash(r, k, 31); if (h > 0.3 && h < 0.74) continue;
      c.fillStyle = h <= 0.3 ? "#213b41" : "#2e4e54"; c.beginPath(); const a0 = k * Math.PI / 12, a1 = a0 + Math.PI / 12, r0 = m(1.9 + r * 1.4), r1 = m(1.9 + (r + 1) * 1.4);
      c.arc(C, C, r1, a0, a1); c.arc(C, C, r0, a1, a0, true); c.fill();
    }
    c.strokeStyle = "#132529"; c.lineWidth = 5;
    for (let r = 0; r < 7; r++) { c.beginPath(); c.arc(C, C, m(1.9 + r * 1.4), 0, 7); c.stroke(); }
    for (let k = 0; k < 24; k++) { const a = k * Math.PI / 12 + Math.PI / 24; c.beginPath(); c.moveTo(C + Math.cos(a) * m(1.9), C + Math.sin(a) * m(1.9)); c.lineTo(C + Math.cos(a) * m(11), C + Math.sin(a) * m(11)); c.stroke(); }
    // cable channels from the ring to each pier, under gratings
    for (let k = 0; k < 8; k++) { c.save(); c.translate(C, C); c.rotate(k * Math.PI / 4); c.fillStyle = "#101d20"; c.fillRect(m(1.7), -m(0.2), m(9), m(0.4)); c.fillStyle = "#34555b"; for (let x = 1.8; x < 10.4; x += 0.24) c.fillRect(m(x), -m(0.17), m(0.09), m(0.34)); c.restore(); }
    // each bay's threshold: its code, a hazard sill, chevrons pointing in
    for (let k = 0; k < 8; k++) {
      c.save(); c.translate(C, C); c.rotate(-bayAngle(k) - Math.PI / 2);      // local +y runs out to bay k
      hazard(c, -m(1.7), m(9.25), m(3.4), m(0.5), "#f2a81d", "#16181c", 44);
      c.strokeStyle = "#9db8b4"; c.lineWidth = 22; c.lineJoin = "miter"; for (let i = 0; i < 2; i++) { c.beginPath(); c.moveTo(-m(0.5), m(8.0 + i * 0.5)); c.lineTo(0, m(8.36 + i * 0.5)); c.lineTo(m(0.5), m(8.0 + i * 0.5)); c.stroke(); }
      c.translate(0, m(7.1)); c.rotate(Math.PI); latin(c, `V-0${k + 1}`, 0, m(0.3), 96, "#9db8b4", { align: "center" });
      c.restore();
    }
    // scuffs and old stains: hard patches
    for (let k = 0; k < 22; k++) { const a = hash(k, 1) * 6.28, r = m(2.4 + hash(k, 2) * 7); c.fillStyle = "rgba(12,26,30,0.4)"; c.beginPath(); c.ellipse(C + Math.cos(a) * r, C + Math.sin(a) * r, 24 + hash(k, 3) * 70, 9 + hash(k, 4) * 16, hash(k, 5) * 3, 0, 7); c.fill(); }
    c.fillStyle = "#0e1a1d"; c.beginPath(); c.arc(C, C, m(1.02), 0, 7); c.fill();
  });
}

export async function createVault(renderer, o = {}) {
  const W = o.width ?? 1920, H = o.height ?? 1080;
  const U = { uGlow: { value: 1 }, uFirst: { value: 0 }, uFirstPos: { value: new THREE.Vector3(...FIRST) }, uGold: { value: 1 }, uRed: { value: 0 }, uAlarm: { value: 0 }, uAlarmAng: { value: 0 }, uFloor: { value: 1 }, uDoor: { value: [0, 0, 0, 0, 0, 0, 0, 0] } };
  const kit = createKit(CHUNK, U), { shared } = kit, T = textures(), mat = (c, o) => kit.mat(c, o);
  shared.uFogCol.value.setRGB(0.015, 0.05, 0.055); shared.uFogTop.value.setRGB(0.004, 0.012, 0.016); shared.uFogDeep.value.setRGB(0.01, 0.03, 0.035); shared.uFogH.value.set(4.5, 13); shared.uFogK.value = 0.028;
  shared.uRim.value.setRGB(1.0, 0.3, 0.2);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(50, W / H, 0.08, 500);
  const G = { wall: { value: 1 }, meters: { value: 0.5 }, reels: { value: 0 }, beam: { value: 1 } };
  // reels and meters are drawn unlit by the kit: while the room is dark they are sunk into its air instead (see update)
  const unlit = [], mat0 = kit.mat, um = (c, o) => { const m = mat0(c, o); if ((o?.kind === 8 || o?.kind === 9) && !unlit.includes(m)) unlit.push(m); return m; };
  kit.mat = um;
  const wall = "#4f8088", wall2 = "#3f6c75", dark = "#1a2a30", cream = "#cfc4a2", cream2 = "#a89e80", iron = "#2b3d44", amber = "#f2a81d", pipe = "#b0562a";
  const b = kit.builder();
  // a rod between two points
  const rod = (bb, a, c, r, m, seg = 6) => { const A = new THREE.Vector3(...a), C = new THREE.Vector3(...c), d = C.clone().sub(A), len = d.length(); bb.add(new THREE.CylinderGeometry(r, r, len, seg), m, new THREE.Matrix4().compose(A.clone().add(C).multiplyScalar(0.5), new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()), new THREE.Vector3(1, 1, 1))); };
  // a cable hanging between two points
  const swag = (bb, a, c, sag, r, m, n = 9) => { let p = a; for (let i = 1; i <= n; i++) { const t = i / n, q = [lerp(a[0], c[0], t), lerp(a[1], c[1], t) - sag * 4 * t * (1 - t), lerp(a[2], c[2], t)]; rod(bb, p, q, r, m, 5); p = q; } };

  // ---- floor, ring lights, ceiling ---------------------------------------------------------------------------------
  b.quad([0, 0, 0], [1, 0, 0], [0, 0, -1], 22, 22, mat("#fff", { kind: 10, map: floorTex(T) }));
  b.cyl(R * 1.09, 0.4, 0, HEIGHT + 0.2, 0, mat("#0c1518"), "y", 8, R * 1.09, { ry: Math.PI / 8 });
  const rings = [7.8, 5.4, 3.0].map((r, i) => ["#bff5ea", "#ff2a1e"].map((col) => {
    const g = new THREE.Group(), bb = kit.builder(), n = Math.round(r * 5);
    for (let k = 0; k < n; k++) { const a0 = (k + 0.12) / n * 2 * Math.PI, a1 = (k + 0.88) / n * 2 * Math.PI; bb.add(new THREE.RingGeometry(r - 0.07, r + 0.07, 5, 1, a0, a1 - a0).rotateX(-Math.PI / 2), mat(col, { kind: 1, flag: 1, offset: 1, fog: 0.4 }), new THREE.Matrix4().makeTranslation(0, 0.012, 0)); }
    g.add(bb.build()); scene.add(g); return g;
  }));

  // ---- the eight walls -----------------------------------------------------------------------------------------------
  const shutters = [], shutterGeo = new THREE.BoxGeometry(DOOR.w + 0.3, DOOR.h + 0.1, 0.22), shutterMats = [mat("#8a7f60"), mat("#8a7f60"), mat("#8a7f60"), mat("#16181c"), mat("#fff", { kind: 10, map: T.shutter }), mat("#8a7f60")];
  for (let k = 0; k < 8; k++) {
    const d = bayDir(k), base = new THREE.Matrix4().makeBasis(new THREE.Vector3(-d[2], 0, d[0]), new THREE.Vector3(0, 1, 0), new THREE.Vector3(-d[0], 0, -d[2])).setPosition(d[0] * R, 0, d[2] * R);
    const c = kit.builder(), FW = 2 * R * Math.tan(Math.PI / 8), pw = (FW - DOOR.w) / 2, px = DOOR.w / 2 + pw / 2, X = [1, 0, 0], Y = [0, 1, 0];
    // piers and the wall above the doorway
    for (const s of [1, -1]) c.box(pw, DOOR.h, 1.4, s * px, DOOR.h / 2, -0.7, mat(wall, { seam: [1.22, 1.05], seamMode: 2 }));
    c.box(FW, HEIGHT - DOOR.h, 1.4, 0, (HEIGHT + DOOR.h) / 2, -0.7, mat(wall2, { seam: [2.07, 1.6], seamMode: 2 }));
    // the doorway's frame, its sill, the slot the shutter drops from
    for (const s of [1, -1]) { c.box(0.34, DOOR.h + 0.3, 0.5, s * (DOOR.w / 2 + 0.17), (DOOR.h + 0.3) / 2, 0.1, mat(cream)); c.box(0.1, DOOR.h, 0.52, s * (DOOR.w / 2 + 0.36), DOOR.h / 2, 0.1, mat(amber)); }
    c.box(DOOR.w + 0.9, 0.5, 0.6, 0, DOOR.h + 0.25, 0.12, mat(cream)); c.box(DOOR.w + 0.9, 0.08, 0.64, 0, DOOR.h - 0.02, 0.12, mat("#16181c"));
    c.box(DOOR.w, 0.05, 1.4, 0, 0.025, -0.7, mat(iron));
    // the passage beyond: a dim stub with a light at its end (bay 0's is the corridor's indigo and cyan)
    const way = k === 0 ? ["#2f3a72", "#7ffcff", "#dff"] : ["#1d3238", "#2c6a70", "#3d8a8c"], wm = (col, lit) => k === 0 ? mat(lit, { kind: 1, fog: 0.3 }) : mat(col);
    c.box(0.2, DOOR.h, 7, -DOOR.w / 2 - 0.1, DOOR.h / 2, -4.9, wm(way[0], "#232c66")); c.box(0.2, DOOR.h, 7, DOOR.w / 2 + 0.1, DOOR.h / 2, -4.9, wm(way[0], "#222a60"));
    c.box(DOOR.w, 0.2, 7, 0, DOOR.h + 0.1, -4.9, wm(way[0], "#1b2150")); c.box(DOOR.w, 0.1, 7, 0, -0.05, -4.9, wm("#1a2c31", "#3a4690"));
    c.box(DOOR.w, DOOR.h, 0.2, 0, DOOR.h / 2, -8.4, wm("#0f1b1f", "#5a6cc8"));
    if (k === 0) for (let i = 0; i < 3; i++) { c.box(0.3, DOOR.h, 0.3, -DOOR.w / 2 + 0.1, DOOR.h / 2, -2.2 - i * 2.4, mat("#b85a1c", { kind: 1, fog: 0.3 })); c.box(0.3, DOOR.h, 0.3, DOOR.w / 2 - 0.1, DOOR.h / 2, -2.2 - i * 2.4, mat("#8f4420", { kind: 1, fog: 0.3 })); c.box(DOOR.w, 0.3, 0.3, 0, DOOR.h - 0.1, -2.2 - i * 2.4, mat("#3c4a8c", { kind: 1, fog: 0.3 })); }
    for (const s of [1, -1]) c.box(0.06, 0.09, 6.6, s * (DOOR.w / 2 - 0.04), k === 0 ? 2.6 : 3.6, -4.9, mat(way[1], { kind: 1, gain: k === 0 ? undefined : G.beam }));
    if (k === 0) { c.box(1.5, 0.05, 1.3, 0, DOOR.h - 0.03, -3.4, mat(way[2], { kind: 1 })); c.box(1.5, 0.05, 1.3, 0, DOOR.h - 0.03, -6.6, mat(way[2], { kind: 1 })); for (const s of [1, -1]) c.box(0.07, 0.07, 6.6, s * (DOOR.w / 2 - 0.05), 0.1, -4.9, mat("#ff3fa8", { kind: 1 })); }
    // over the doorway: the bay's name in lights, its lamp, a beacon
    c.box(3.3, 0.74, 0.2, 0, DOOR.h + 1.0, 0.1, mat("#16181c")); c.quad([0, DOOR.h + 1.0, 0.21], X, Y, 3.1, 0.62, mat("#fff", { kind: 2, map: T.bays[k], gain: G.wall }));
    for (const s of [1, -1]) { c.box(0.3, 0.22, 0.2, s * 2.15, DOOR.h + 1.0, 0.1, mat(dark)); c.box(0.22, 0.14, 0.1, s * 2.15, DOOR.h + 1.0, 0.2, mat("#ff2a1e", { kind: 1, flag: 2 })); }
    c.cyl(0.13, 0.2, 0, DOOR.h + 1.6, 0.25, mat("#ff3030", { kind: 1, flag: 3 }), "y", 10);
    // the piers: a tape rack each (reels, meters, a row of keys, a cassette slot), a stencil on one, a placard
    for (const s of [1, -1]) {
      c.box(pw - 0.5, 2.9, 0.36, s * px, 2.0, 0.18, mat(cream)); c.box(pw - 0.44, 0.1, 0.4, s * px, 3.5, 0.18, mat(cream2)); c.box(pw - 0.44, 0.1, 0.4, s * px, 0.52, 0.18, mat(cream2));
      for (let j = 0; j < 2; j++) c.quad([s * px, 2.9 - j * 0.86, 0.365], X, Y, 1.5, 0.72, mat(j ? "#f2a81d" : "#e8dcc0", { kind: 9, gain: G.reels }));
      c.quad([s * px - 0.42, 1.28, 0.365], X, Y, 0.72, 0.5, mat("#5dffa8", { kind: 8, seam: [9, 7], gain: G.meters }));
      c.quad([s * px + 0.42, 1.28, 0.365], X, Y, 0.62, 0.4, mat("#fff", { kind: 10, map: T.cassette, offset: 1 }));
      for (let i = 0; i < 7; i++) c.box(0.12, 0.07, 0.08, s * px - 0.66 + i * 0.22, 0.82, 0.38, mat(i === 2 ? "#ff5a3c" : i === 5 ? amber : "#16181c", { kind: i === 2 ? 1 : 0, flag: 5 }));
      c.box(0.5, 0.5, 0.5, s * (FW / 2 - 0.1), 0.25, 0.3, mat(iron));
    }
    const st = T.stencils[k % T.stencils.length]; c.quad([(k % 2 ? 1 : -1) * px, 3.92, 0.01], X, Y, Math.min(pw - 0.3, st.w * 1.0), 0.6 * Math.min(1, (pw - 0.3) / st.w), mat("#9ac4c4", { kind: 4, map: st.tex }));
    // above: a bank of CRTs, the first gallery, archive drawers, the second gallery, more drawers into the dark
    for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) {
      const x = -2.7 + i * 1.8, y = 6.45 + j * 1.25; c.box(1.5, 1.1, 0.5, x, y, 0.2, mat(cream2));
      const sp = hash(k, i, j, 3) < 0.55; c.quad([x, y + 0.02, 0.46], X, Y, 1.22, 0.86, sp ? { speech: Math.floor(hash(k, i, j, 5) * 3) } : mat("#fff", { kind: 2, map: T.idle[Math.floor(hash(k, i, j, 6) * 3)], gain: G.wall }));
    }
    for (const y of [5.2, 10]) {
      c.box(FW, 0.14, 1.3, 0, y, 0.65, mat(iron)); c.box(FW, 0.06, 0.06, 0, y + 1.0, 1.26, mat(amber)); c.box(FW, 0.04, 0.04, 0, y + 0.55, 1.26, mat(iron));
      for (let i = -3; i <= 3; i++) c.box(0.05, 1.0, 0.05, i * FW / 6.2, y + 0.5, 1.26, mat(iron));
      for (const s of [1, -1]) c.box(0.14, 0.9, 0.14, s * (FW / 2 - 0.5), y - 0.5, 1.0, mat(iron), { rx: 0.7 });
    }
    for (let j = 0; j < 5; j++) for (let i = 0; i < 6; i++) { const h = hash(k, i, j, 9); if (h < 0.2) continue; c.box(1.16, 0.5, 0.12, -3.25 + i * 1.3, 11.3 + j * 0.8, 0.06, mat(h > 0.8 ? cream2 : "#3a6068")); if (h > 0.55) c.box(0.3, 0.07, 0.05, -3.25 + i * 1.3, 11.3 + j * 0.8, 0.14, mat(h > 0.9 ? "#ff5a3c" : "#16181c", { kind: h > 0.9 ? 1 : 0, flag: 5 })); }
    c.quad([0, 9.05, 0.01], X, Y, 2.4, 1.0, mat("#75a8aa", { kind: 4, map: T.codes[k] }));
    // the corner between this bay and the next: a trunk of pipes and cables up the whole silo
    const cx = FW / 2;
    c.box(0.9, HEIGHT, 0.7, cx, HEIGHT / 2, 0.25, mat(iron, { seam: [0.9, 2.1], seamMode: 2 }));
    c.cyl(0.13, HEIGHT, cx - 0.22, HEIGHT / 2, 0.72, mat(pipe), "y", 8); c.cyl(0.08, HEIGHT, cx + 0.12, HEIGHT / 2, 0.7, mat("#2e8f8c"), "y", 8); c.cyl(0.05, HEIGHT, cx + 0.32, HEIGHT / 2, 0.66, mat(cream2), "y", 6);
    for (let y = 2.2; y < HEIGHT; y += 3.1) c.box(0.8, 0.2, 0.4, cx, y, 0.66, mat(amber));
    for (const [m_, list] of c.bins) {
      if (m_.speech !== undefined) { for (const g of list) (b.speech ??= [[], [], []])[m_.speech].push(g.applyMatrix4(base)); continue; }
      for (const g of list) b.add(g.applyMatrix4(base), m_);
    }
    const sg = new THREE.Mesh(shutterGeo, shutterMats); sg.frustumCulled = false; const hold = new THREE.Group(); hold.applyMatrix4(base); sg.position.set(0, 0, -0.35); hold.add(sg); scene.add(hold); shutters.push(sg);
  }

  // ---- the console ring and what is inside it --------------------------------------------------------------------
  for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4 + Math.PI / 8, r = { ry: -a + Math.PI / 2 }, x = Math.cos(a), z = Math.sin(a);      // the gaps are at k * 45 degrees
    b.box(0.92, 1.0, 0.42, x * 1.36, 0.5, z * 1.36, mat(cream), r); b.box(1.04, 0.12, 0.6, x * 1.44, 1.03, z * 1.44, mat(cream2), { ...r, rx: 0 });
    b.box(0.96, 0.05, 0.4, x * 1.6, 0.93, z * 1.6, mat(dark), r);
    for (let i = 0; i < 4; i++) { const t = (i - 1.5) * 0.2; b.box(0.1, 0.05, 0.1, x * 1.62 - z * t, 0.97, z * 1.62 + x * t, mat(i === k % 4 ? "#ff5a3c" : i === (k + 2) % 4 ? "#5dffa8" : amber, { kind: 1, flag: 5 }), r); }
    b.box(0.7, 0.3, 0.05, x * 1.58, 0.55, z * 1.58, mat(iron), r);
  }
  b.cyl(1.16, 0.05, 0, 0.32, 0, mat("#ffc04a", { kind: 1, flag: 4, fog: 0.2 }), "y", 24);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 1.05, 12, 24, 1, true).translate(0, 6.6, 0), mat("#ffb03a", { kind: 7, alpha: 0.085, additive: true, fog: 0.2, gain: G.beam }));
  beam.layers.set(FX); beam.renderOrder = 9; beam.frustumCulled = false; scene.add(beam);
  // trunks of cable rising out of the ring into the dark, and roots of it over the floor to the piers
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2 + Math.PI / 8, x = Math.cos(a), z = Math.sin(a);
    for (let j = 0; j < 4; j++) { const rr = 0.92 + 0.12 * (j % 2), aa = a + (j - 1.5) * 0.16, r0 = 0.07 + 0.03 * hash(k, j), top = [Math.cos(aa) * (0.5 + 0.2 * j), HEIGHT, Math.sin(aa) * (0.5 + 0.2 * j)]; swag(b, [Math.cos(aa) * rr, 1.0, Math.sin(aa) * rr], top, -0.5 - 0.3 * hash(k, j, 2), r0, mat([dark, "#31484f", pipe, "#16181c"][j]), 7); }
    b.box(0.5, 0.3, 0.4, x * 0.9, 4.6, z * 0.9, mat(amber), { ry: -a }); b.box(0.56, 0.2, 0.46, x * 0.75, 8.8, z * 0.75, mat(iron), { ry: -a });
  }
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4 + 0.07; for (let j = 0; j < 2; j++) { const aa = a + j * 0.05, col = mat([dark, pipe, "#2e8f8c"][(k + j) % 3]); let p = [Math.cos(aa) * 1.75, 0.05, Math.sin(aa) * 1.75]; for (let i = 1; i <= 8; i++) { const r = 1.75 + i * 0.98, w = Math.sin(i * 1.7 + k * 2 + j) * 0.018, q = [Math.cos(aa + w) * r, 0.05, Math.sin(aa + w) * r]; rod(b, p, q, 0.045, col, 5); p = q; } } }

  // ---- reel towers -------------------------------------------------------------------------------------------------
  const TOWERS = [[-5.3, -5.5], [5.5, -5.3], [-7.6, 0.4], [7.7, -0.5], [-5.4, 5.6], [5.7, 5.5]];      // in front of the corners between bays
  TOWERS.forEach(([x, z], n) => {
    const ry = Math.atan2(-x, -z), h = 6.4 + 1.4 * hash(n, 1), c = kit.builder(), X = [1, 0, 0], Y = [0, 1, 0];
    c.box(1.3, h, 1.1, 0, h / 2, 0, mat(cream, { seam: [1.3, 0.92], seamMode: 2 })); c.box(1.4, 0.3, 1.2, 0, 0.15, 0, mat(iron)); c.box(1.4, 0.16, 1.2, 0, h, 0, mat(cream2));
    for (let j = 0; j * 0.92 + 1.4 < h; j++) { const y = 1.0 + j * 0.92, hh = hash(n, j, 4); if (hh < 0.62) c.quad([0, y, 0.555], X, Y, 1.08, 0.66, mat(hh < 0.3 ? "#f2a81d" : "#e8dcc0", { kind: 9, gain: G.reels })); else if (hh < 0.82) c.quad([0, y, 0.555], X, Y, 1.0, 0.6, mat("#5dffa8", { kind: 8, seam: [12, 7], gain: G.meters })); else c.quad([0, y, 0.555], X, Y, 0.9, 0.56, mat("#fff", { kind: 10, map: T.cassette, offset: 1 })); }
    c.cyl(0.07, 5, 0.3, h + 2.5, 0, mat(dark), "y", 6); c.cyl(0.05, 5, -0.2, h + 2.5, 0.2, mat(pipe), "y", 6);
    const base = new THREE.Matrix4().makeRotationY(ry).setPosition(x, 0, z);
    for (const [m_, list] of c.bins) for (const g of list) b.add(g.applyMatrix4(base), m_);
    swag(b, [x * 0.98, h + 0.1, z * 0.98], [x * 1.42, 5.3 + 4.7 * (n % 2), z * 1.42], 0.9, 0.05, mat(dark));
  });
  // long swags of cable across the upper silo
  for (let i = 0; i < 9; i++) { const a = hash(i, 51) * 6.28, a2 = a + 2.2 + hash(i, 52) * 1.6, y = 7.5 + hash(i, 53) * 6; swag(b, [Math.cos(a) * 9.3, y, Math.sin(a) * 9.3], [Math.cos(a2) * 9.3, y + (hash(i, 54) - 0.5) * 3, Math.sin(a2) * 9.3], 1.2 + hash(i, 55) * 1.6, 0.05, mat(i % 3 ? dark : pipe), 10); }

  // ---- monitors on jointed arms --------------------------------------------------------------------------------------
  // speech textures: three layouts of one picture
  const speech = [0, 1, 2].map(() => { const cv = document.createElement("canvas"); cv.width = SW; cv.height = SH; const t = new THREE.CanvasTexture(cv); t.anisotropy = 8; return { g: cv.getContext("2d"), t }; });
  const wallSpeech = [0, 1, 2].map((i) => mat("#fff", { kind: 2, map: speech[i].t, gain: G.wall }));
  if (b.speech) b.speech.forEach((list, i) => list.forEach((g) => b.add(g, wallSpeech[i])));
  const head = (() => {      // one monitor, its screen toward +Z, hung at its middle
    const c = kit.builder();
    c.box(0.64, 0.52, 0.34, 0, 0, 0.1, mat(cream)); c.box(0.5, 0.4, 0.3, 0, 0.0, -0.2, mat(cream2)); c.box(0.36, 0.28, 0.14, 0, 0, -0.4, mat(cream2));
    c.box(0.58, 0.46, 0.03, 0, 0.01, 0.275, mat("#16181c")); c.box(0.64, 0.07, 0.36, 0, -0.29, 0.1, mat(cream2));
    for (let i = 0; i < 4; i++) c.box(0.3, 0.012, 0.03, 0, 0.262, -0.22 + i * 0.07, mat(dark));
    c.box(0.05, 0.03, 0.02, 0.24, -0.29, 0.285, mat("#ff5a3c", { kind: 1, flag: 5 })); c.box(0.12, 0.03, 0.02, -0.2, -0.29, 0.285, mat("#16181c"));
    for (const s of [1, -1]) c.box(0.04, 0.3, 0.1, s * 0.345, -0.06, -0.02, mat(iron));
    c.box(0.74, 0.05, 0.1, 0, -0.34, -0.02, mat(iron)); c.cyl(0.03, 0.26, 0.2, 0.36, -0.3, mat(dark), "y", 5, 0.012, { rz: -0.3 });
    return c.build();
  })();
  const screenGeo = new THREE.PlaneGeometry(0.5, 0.385).translate(0, 0.012, 0.293);
  const rnd = rng(77), monitors = [];
  const place = (at, from, scale, o = {}) => {
    // the arm: from where it is fixed, by an elbow, to the yoke under the monitor
    const el = from && [lerp(from[0], at[0], 0.5) + (rnd() - 0.5) * 0.9, lerp(from[1], at[1], 0.45) + (from[1] > at[1] ? 0.5 : -0.1), lerp(from[2], at[2], 0.5) + (rnd() - 0.5) * 0.9], yoke = [at[0], at[1] - 0.36 * scale, at[2]];
    if (o.stand) { rod(b, [at[0], 0, at[2]], [at[0], at[1] - 0.5 * scale, at[2]], 0.045, mat(iron), 7); b.cyl(0.3, 0.06, at[0], 0.03, at[2], mat(iron), "y", 10); b.cyl(0.07, 0.16, at[0], at[1] - 0.44 * scale, at[2], mat(amber), "y", 8); }
    else { rod(b, from, el, 0.05, mat(iron), 6); rod(b, el, yoke, 0.04, mat(iron), 6); b.ball(0.085, el[0], el[1], el[2], mat(amber), null, 8); b.ball(0.07, yoke[0], yoke[1], yoke[2], mat(dark), null, 8); swag(b, [from[0] + 0.05, from[1], from[2]], [at[0], at[1] + 0.1, at[2] - 0.2], 0.35, 0.018, mat(dark), 6); }
    const g = new THREE.Group(), h = head.clone(), gain = { value: 0 }, kind = o.kind ?? (rnd() < 0.62 ? 0 : rnd() < 0.5 ? 1 : 2);
    const sc = new THREE.Mesh(screenGeo, mat("#fff", { kind: 2, map: speech[kind].t, gain })); sc.frustumCulled = false;
    g.add(h, sc); g.position.set(...at); g.scale.setScalar(scale); scene.add(g);
    const idle = new THREE.Euler((rnd() - 0.5) * 0.9 + 0.25, rnd() * 6.28, (rnd() - 0.5) * 0.5, "YXZ");
    monitors.push({ g, gain, at, idle: new THREE.Quaternion().setFromEuler(idle), delay: o.delay ?? rnd(), late: rnd(), seed: monitors.length });
  };
  place(FIRST, null, 1.0, { stand: true, kind: 0, delay: 0 });
  // hung from above, in rings round the middle of the room; on stands round the floor; on the towers and the galleries
  for (let i = 0; i < 26; i++) {
    const a = rnd() * 6.28, r = 3.6 + rnd() * 5, y = 2.9 + rnd() * 4.2, at = [Math.cos(a) * r, y, Math.sin(a) * r];
    if (at[2] > 3.4 && Math.abs(at[0]) < 3.2 && y < 4.2) { i--; continue; }      // not across the room's own view of its middle
    place(at, [at[0] * 0.8 + (rnd() - 0.5), y + 3 + rnd() * 3.5, at[2] * 0.8 + (rnd() - 0.5)], 0.9 + rnd() * 0.9);
  }
  for (let i = 0; i < 13; i++) {
    const a = rnd() * 6.28, r = 4.6 + rnd() * 4.2, at = [Math.cos(a) * r, 1.0 + rnd() * 1.3, Math.sin(a) * r];
    if ((at[2] > 2.2 && Math.abs(at[0]) < 3.6) || Math.hypot(at[0] - 6, at[2] - 3.5) < 3.0 || Math.hypot(at[0] - 3, at[2] - 3.2) < 2 || TOWERS.some(([x, z]) => Math.hypot(at[0] - x, at[2] - z) < 1.3) || Math.hypot(at[0] - FIRST[0], at[2] - FIRST[2]) < 1.4) { i--; continue; }   // not in the way out, a tower, or the first screen
    place(at, null, 0.8 + rnd() * 0.5, { stand: true });
  }
  TOWERS.forEach(([x, z], n) => { for (let j = 0; j < 2; j++) { const y = 2.4 + j * 2.6 + hash(n, j, 8), s = (n + j) % 2 ? 1 : -1, d = Math.hypot(x, z), at = [x * (1 - 1.5 / d) - s * z / d * 1.0, y, z * (1 - 1.5 / d) + s * x / d * 1.0]; place(at, [x * (1 - 0.6 / d), y + 0.9, z * (1 - 0.6 / d)], 0.9 + rnd() * 0.5); } });
  for (let k = 0; k < 8; k++) { const a = bayAngle(k) + 0.25, at = [Math.cos(a) * 8.0, 6.6 + (k % 2) * 4.6, -Math.sin(a) * 8.0]; place(at, [at[0] * 1.1, at[1] + 0.2, at[2] * 1.1], 1.2 + rnd() * 0.6); }

  // ---- the drone racks: a ring of clamps on four rods, lowered out of the ceiling -------------------------------------
  const rack = new THREE.Group();
  {
    const c = kit.builder();
    c.add(new THREE.TorusGeometry(RACK.r, 0.11, 6, 36).rotateX(Math.PI / 2), mat(iron)); c.add(new THREE.TorusGeometry(RACK.r, 0.05, 5, 36).rotateX(Math.PI / 2), mat(amber), new THREE.Matrix4().makeTranslation(0, 0.2, 0));
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + Math.PI / 4, x = Math.cos(a) * RACK.r, z = Math.sin(a) * RACK.r; c.cyl(0.06, 14, x, 7, z, mat(dark), "y", 6); c.box(0.4, 0.3, 0.4, x, 0.1, z, mat(amber)); rod(c, [x, 0, z], [-x, 0, -z].map((v, j) => j === 1 ? 0 : v * 0.2), 0.05, mat(iron)); }
    for (let i = 0; i < RACK.n; i++) { const a = (i + 0.5) / RACK.n * 2 * Math.PI, x = Math.cos(a) * RACK.r, z = Math.sin(a) * RACK.r; c.box(0.3, 0.34, 0.3, x, -0.2, z, mat(cream2), { ry: -a }); c.box(0.08, 0.3, 0.34, x, -0.48, z, mat(dark), { ry: -a }); c.box(0.12, 0.06, 0.06, x * 1.04, -0.12, z * 1.04, mat("#ff2a1e", { kind: 1, flag: 3 }), { ry: -a }); }
    rack.add(c.build()); scene.add(rack);
  }
  scene.add(b.build());
  const drones = createDrones(kit, scene), markers = createMarkers(scene), shadows = createShadows(kit, scene, "#03090b");
  const qT = new THREE.Quaternion(), qI = new THREE.Quaternion(), mL = new THREE.Matrix4(), vF = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0), eT = new THREE.Euler();
  const state = { glow: 1, red: 0, gold: 1, first: 0 };

  function update(cam, frame, sync, opt = {}) {
    const w = driveAll(sync, WIRING, frame, opt.wiring), t = frame / sync.fps, alert = opt.alert ?? 0, wake = opt.wake ?? { first: 99, rest: 99 }, red = opt.red ?? 0, k3 = clamp(red / 3);
    aim(camera, cam, W / H); shared.uCam.value.copy(camera.position); shared.uFrame.value = frame;
    // each screen: when it came on (a flicker, a flash, then steady), and the strings' notes on its brightness
    const first = wake.first ?? -1, rest = wake.rest ?? -1;
    const lit = (age, seed) => age < 0 ? 0 : age < 0.5 ? [0.55, 0.2, 1.15, 0.6, 0.95, 1.1, 0.9, 1.04, 1.0, 0.95, 1.03, 1][Math.min(11, Math.floor(age * 24))] : 1;
    let sum = 0;
    monitors.forEach((m, i) => { const on = lit(i === 0 ? first : rest - m.delay * 0.3, i); m.on = on; sum += i ? Math.min(1, on * 3) : 0; m.gain.value = on * (0.92 + 0.25 * w.flicker * (hash(i, w.twitch) > 0.4 ? 1 : 0) + 0.1 * (hash(i, frame >> 1) - 0.5)); });
    // the room's light: how many screens have come on (each one adds its light once: their flicker is their own)
    const glow = sum / (monitors.length - 1), wl = rest < 0.12 ? 0 : lit(rest - 0.12, 0);
    G.wall.value = wl * (0.85 + 0.3 * w.flicker); G.meters.value = wl * w.meters; G.reels.value = t * 1.5 + sync.drive({ stem: "keyboard", mode: "count" }, frame) * 0.7;
    U.uGlow.value = glow * clamp(w.glow, 0, 1.3) * (1 - 0.35 * k3); U.uFirst.value = clamp(lit(first, 0)); U.uFloor.value = clamp(w.floor, 0, 1.3) * Math.max(glow, k3, 0.0);
    U.uGold.value = (opt.gold ?? 1) * clamp(0.75 + 0.5 * (w.floor - 0.6), 0.5, 1.2) * Math.max(glow, 0.0); G.beam.value = U.uGold.value;
    U.uRed.value = red; U.uAlarm.value = clamp(alert * 0.8 + w.klaxon * (alert > 0 ? 1 : 0), 0, 1.2); U.uAlarmAng.value = t * 4.4;
    // the room's three tones: cold phosphor, and red as the floor turns
    const g = U.uGlow.value;
    shared.uTintLit.value.setRGB(lerp(0.72, 1.25, k3) * g, lerp(1.08, 0.5, k3) * g, lerp(1.0, 0.5, k3) * g);
    shared.uTintMid.value.setRGB(lerp(0.36, 0.72, k3) * g, lerp(0.62, 0.24, k3) * g, lerp(0.64, 0.27, k3) * g);
    shared.uTintShade.value.setRGB(lerp(0.1, 0.26, k3) * g, lerp(0.2, 0.06, k3) * g, lerp(0.24, 0.09, k3) * g);
    shared.uFogCol.value.setRGB(lerp(0.015, 0.09, k3) * g, lerp(0.05, 0.012, k3) * g, lerp(0.055, 0.02, k3) * g);
    for (const m of unlit) m.uniforms.uFogMul.value = 1 + 600 * Math.pow(1 - clamp(wl * glow), 2);
    rings.forEach(([cool, hot], i) => { cool.visible = !(red > i + 0.5); hot.visible = red > i + 0.5; });
    // the picture on the screens
    const sp = { level: Math.max(w.speak, w.chorus), ...(opt.speech ?? {}) };
    speech.forEach((s, i) => { drawSpeech(s.g, i, sp, frame); s.t.needsUpdate = true; });
    // the monitors turn from where they idled to face the focus, each in its own time, past it and back; then a
    // servo's tick on each note of the strings
    const sw = opt.swivel ?? 1, focus = opt.focus ?? FOCUS;
    monitors.forEach((m, i) => {
      const u = i === 0 ? 1 : clamp((sw * 1.5 - m.late * 0.5)), e = u >= 1 ? 1 : 1 - Math.pow(1 - u, 3) * Math.cos(u * 7.5);      // an overshoot that settles
      vF.set(...focus); mL.lookAt(vF, m.g.position, UP); qT.setFromRotationMatrix(mL);
      const tick = (hash(i, w.twitch) - 0.5) * 0.07 * Math.exp(-sync.at(frame).stems.strings.since / 0.1);
      qT.multiply(qI.setFromEuler(eT.set(tick * 0.6, tick, i === 0 ? (opt.tilt ?? 0) * Math.PI / 180 : 0)));
      m.g.quaternion.copy(m.idle).slerp(qT, e);
    });
    shutters.forEach((s, k) => { const v = clamp(opt.doors?.[k] ?? 0); U.uDoor.value[k] = v; s.position.y = DOOR.h / 2 + 0.05 + (DOOR.h + 0.5) * (1 - v); });
    rack.position.y = lerp(RACK.up, RACK.down, sstep(0, 1, opt.racks ?? 0)); rack.visible = (opt.racks ?? 0) > 0.001;
    drones.update(opt.drones ?? [], frame, sync, camera, { thrust: w.thrust });
    markers.update(opt.markers); shadows.update(opt.shadows);
    Object.assign(state, { glow: glow * (1 - 0.35 * k3),      // (a figure's light does not swell with the strings: on a whole figure that is a strobe)
      red: k3, gold: U.uGold.value, first: U.uFirst.value });
    return { scene, camera, wires: w, clear: opt.clear ?? 0x010405, post: { inkColor: [0.01, 0.04, 0.05], shadowTint: [0.0, 0.012, 0.016], bloom: 1.0, bloomThreshold: 0.6, ...opt.post } };
  }
  // The light on a figure at p: the screens' cold light from all round, less of it far from the middle; the gold from
  // the ring on the side of them that faces it; and red from under them once the floor has turned.
  function light(p) {
    if (Math.hypot(p[0], p[2]) > R + 0.4) return { tint: [0.8, 0.84, 1.06], rim: [0.5, 0.9, 1.0], from: [0, 1, 0], fogK: 0, fogColor: [0, 0, 0], gradient: 0.2 };      // out in the passage to the corridors
    const { glow, red, gold } = state, d = Math.hypot(p[0], p[2]), near = d < 5 ? 1 : 0.8, toRing = [-p[0], 0.5, -p[2]], l = Math.hypot(...toRing) || 1;
    const lift = 1 + 0.75 * red, tint = [lerp(0.7, 1.0, red) * glow * near * lift + 0.03, lerp(0.88, 0.62, red) * glow * near * lift + 0.03, lerp(0.9, 0.62, red) * glow * near * lift + 0.04];      // (the room's own light drops as it reddens: a face must still read)
    const rim = red > 0.5 ? [1.0, 0.25, 0.18].map((v) => v * glow) : [1.0, 0.72, 0.3].map((v) => v * gold);
    // near the way out, the corridor's light comes up on them
    const out = bayAt(0), w = clamp(1 - (Math.hypot(p[0] - out[0], p[2] - out[2]) - 1.5) / 4.5);
    return { tint: tint.map((v, i) => lerp(v, [0.86, 0.9, 1.08][i], w)), rim: w > 0.5 ? [0.5, 0.9, 1.0] : rim, from: w > 0.5 ? [0, 1, 0] : red > 0.5 ? [0, -1, 0] : toRing.map((v) => v / l), fogK: shared.uFogK.value * 0.5 * (1 - w), fogColor: shared.uFogCol.value.toArray(), gradient: red > 0.5 ? 0 : 0.3 };
  }
  return { name: "vault", scene, camera, kit, update, light, floorAt, hanging, WIRING, R, FIRST, FOCUS, RACK };
}
