// The station's corridors: a ribbed octagonal corridor that goes on for ever along Z (modules re-placed round the
// camera), bulkhead frames with toothed shutters every 24 m, and a four-way junction hub it can open into, with
// cutaways so the hub can be seen from above and a run can be tracked from the side. Cold indigo and cyan, orange
// hazard paint. Tone is drawn in the shader as hard shapes (the pools under each ceiling panel), not lit by lamps.
//
//   const set = await createCorridor(renderer, { width, height, post });   // post: an engine/post.js Post to share
//   set.render(camera, frame, sync, options);      // camera = engine/body.js's { pos, target, fov, up }
//
// Cue options (all optional; every one is a plain value for this frame):
//   junction   null | { z }       the hub's centre is at (0, 0, z); z must be a multiple of 4. Arms run along +-Z and +-X.
//   cut        null | "top" | "left" | "right"   remove the ceiling (view from above) or one wall (side-on tracking;
//                                 left is x < 0). The cut shows the structure's section and passing struts.
//   doors      { [k]: 0..1 }      how far shut the bulkhead shutter at z = k * 24 is (1 = shut), or [top, bottom] for
//                                 its two leaves apart. Unlisted shutters rest open and twitch with the `doorChomp` wire.
//   hubDoors   { A, B, C, D }     the shutters at the hub's mouths: A is the +Z arm, B +X, C -Z, D -X.
//   alert      0..1               the alarm state: beacons turn and a red wedge sweeps the walls (the klaxon wire adds to it)
//   drones     [...]              machines/drones.js specs: { type, pos, yaw, ... }
//   wiring     { name: wire }     replace wires of WIRING for this frame (engine/sync.js drive())
//   markers    [[x, y, z], ...]   camera-agreement crosses (see sets/markers.js)
//   post       { ... }            engine/post.js parameters; char / fx layers go here
//   clear      colour             what is outside the structure (cutaways)
import * as THREE from "three";
import { createKit, ndMaterial, Pool, canvasTex, aim, hash, clamp, FX } from "./kit.js";
import { kana, latin, scanlines, hazard, chevrons, kanaWidth } from "./sign.js";
import { Post } from "../engine/post.js";
import { driveAll } from "../engine/sync.js";
import { createDrones } from "../machines/drones.js";
import { createMarkers } from "./markers.js";

export const M = 4, BULK = 6, HUB = 8;      // module length; modules between bulkheads; the hub's half-width
// The station plays the song: each system is one wire from a stem (engine/sync.js drive()). Change the data, not the set.
export const WIRING = {
  doorChomp: { stem: "drums", mode: "pulse", decay: 0.1, gain: 0.3 },             // bulkhead shutters bite on each drum hit
  hull: { stem: "bass", mode: "env", floor: 0.35, gain: 0.8 },                    // ceiling panels and the pools under them
  run: { stem: "bass", mode: "count", gain: 1 },                                   // neon strips step along on each bass note
  klaxon: { stem: "brass", mode: "env", gain: 1.6 },                               // beacons and the red sweep
  stars: { stem: "strings", mode: "env", floor: 0.25, gain: 1.2 },                 // the starfield and the light from the windows
  screens: { stem: "synth", mode: "pulse", decay: 0.2, floor: 0.85, gain: 0.5 },   // CRT signage flares
  meters: { stem: "drums", mode: "env", floor: 0.1, gain: 1.0 },                   // level meters on the hardware panels
  reels: { stem: "keyboard", mode: "env", floor: 0.3, gain: 1.0 },                 // tape reels turn faster
  thrust: { stem: "drums", mode: "pulse", decay: 0.15, gain: 1 },                  // drones: thrusters and eyes kick
};

const CHUNK = `
uniform vec4 uJunc; uniform float uHull, uAlarm, uAlarmAng, uStars, uRun, uSpin;
// a point in corridor terms: x across, y up, z along; kind 0 the Z arms, 1 the X arms, 2 the hub
vec3 local(vec3 W, out float kind){
  kind = 0.0; if(uJunc.w < 0.5) return W;
  vec2 q = W.xz-uJunc.xy;
  if(max(abs(q.x), abs(q.y)) < uJunc.z){ kind = 2.0; return vec3(q.x, W.y, q.y); }
  if(abs(q.x) > abs(q.y)){ kind = 1.0; return vec3(q.y, W.y, q.x); }
  return vec3(q.x, W.y, q.y);
}
float setTone(vec3 W, vec3 N){
  float k; vec3 L = local(W, k);
  float wob = (vnoise(surf(W, N)*1.6)-0.5)*0.14;
  if(k > 1.5){
    float r = length(L.xz)+wob*2.0;
    float t = r < 3.1*(0.6+0.4*uHull) ? 2.0 : (r < 5.7 ? 1.0 : 0.0);
    vec2 a = abs(L.xz); float mo = min(length(a-vec2(0.0, 7.2)), length(a-vec2(7.2, 0.0)))+wob;
    if(N.y > 0.7){ if(mo < 1.5) t = 2.0; else if(mo < 2.5) t = max(t, 1.0); if(W.y > 2.0) t = 0.0; }
    else { float hh = W.y+wob; t = hh < 0.9 ? 1.0 : (hh < 2.6 && r < 7.4 ? 1.0 : 0.0); if(hh > 1.2 && hh < 2.3 && r < 7.4) t = 2.0; }
    return t;
  }
  float dz = abs(fract(L.z/4.0)-0.5)*4.0+wob;
  float hh = 3.4-W.y, wide = 0.55+0.45*uHull;
  float t = dz < (0.45+hh*0.36)*wide ? 2.0 : (dz < (0.95+hh*0.5)*wide ? 1.0 : 0.0);
  if(N.y > 0.7 && W.y < 0.2) t = max(t, 1.0);
  if(W.y > 3.45 || W.y < -0.02 || abs(L.x) > 2.95) t = min(t, 0.0);       // the section a cutaway shows: always in shade
  return t;
}
vec3 setExtra(vec3 col, vec3 W, vec3 N, float tone){
  float k; vec3 L = local(W, k);
  if(k < 1.5){
    vec3 along = k > 0.5 ? vec3(1.0,0.0,0.0) : vec3(0.0,0.0,1.0);
    col *= mix(1.0, 0.7, abs(dot(N, along)));
    if(abs(L.x) < 2.9 && W.y < 3.44){
      float dc = length(vec2(abs(L.x)-2.62, W.y-2.5));
      col += vec3(0.1,0.85,1.0)*(step(dc,0.75)*0.10 + step(dc,0.3)*0.16);
      float dm = length(vec2(abs(L.x)-2.25, W.y-0.06));
      col += vec3(1.0,0.15,0.6)*(step(dm,0.9)*0.09 + step(dm,0.35)*0.16);
    }
  }
  if(uAlarm > 0.0){
    float on;
    if(k > 1.5){ float ang = atan(L.z, L.x); on = step(fract((ang+uAlarmAng*0.7)/3.14159), 0.12); }
    else { float bz = (fract(L.z/24.0+0.5)-0.5)*24.0; float ang = atan(W.y-1.7, L.x); on = step(fract((ang+uAlarmAng+bz*0.3)/6.28318), 0.13)*step(abs(bz), 8.0); }
    col = mix(col, col*vec3(1.5,0.45,0.55)+vec3(0.17,0.0,0.03), on*clamp(uAlarm, 0.0, 1.0));
  }
  return col;
}
float setEmit(vec3 W, int flag){
  if(flag == 0) return 1.0;
  float k; vec3 L = local(W, k);
  if(flag == 1){ float m = floor(L.z/4.0); return fract((m-uRun)/6.0) < 0.34 ? 1.25 : 0.5; }       // strips stepping along
  if(flag == 2) return 0.5+0.62*uHull;                                                          // ceiling panels
  if(flag == 3) return 0.25+1.2*clamp(uAlarm, 0.0, 1.0)*step(0.5, fract(uAlarmAng/3.14159+floor(L.z/24.0+0.5)*0.37));   // beacons
  return 1.0;
}
vec3 setSpecial(vec3 W, vec3 d, vec2 uv){
  float ca = cos(uSpin), sa = sin(uSpin); d = vec3(d.x*ca-d.y*sa, d.x*sa+d.y*ca, d.z);
  vec3 col = mix(vec3(0.02,0.01,0.07), vec3(0.10,0.03,0.22), smoothstep(-0.5,0.9,d.y+0.3*d.z));
  vec2 sp = vec2(atan(d.z, d.x), asin(clamp(d.y,-1.0,1.0)))*36.0;
  vec2 c = floor(sp); float h = hash(c);
  vec2 o = vec2(hash(c+3.1), hash(c+7.7))*0.6+0.2;
  float tw = step(0.35, fract(h*17.0+floor(uFrame/3.0)*0.37*h));
  float star = step(0.86-0.12*uStars, h)*step(length(fract(sp)-o), (0.05+0.13*h)*(0.6+0.5*uStars*tw));
  col += vec3(1.0,0.95,0.85)*star*(0.55+0.6*uStars);
  // the planet, toward -X; flat bands and a hard terminator
  vec3 P = normalize(vec3(-1.0,0.2,0.3)), U = normalize(cross(vec3(0.0,1.0,0.0), P)), Vv = cross(P, U);
  float f = dot(d, P);
  if(f > 0.0){
    vec2 q = vec2(dot(d, U), dot(d, Vv))/f/0.5; float r = length(q);
    if(r < 1.0){
      float z = sqrt(1.0-r*r), l = dot(normalize(vec3(q, z)), normalize(vec3(0.7,0.5,0.35)));
      float band = sin(q.y*11.0+sin(q.x*3.0)*1.5);
      col = l > 0.05 ? (band > 0.2 ? vec3(1.0,0.55,0.22) : vec3(0.95,0.36,0.3)) : vec3(0.26,0.08,0.3);
      if(l > 0.72) col += 0.18;
    }
    float ring = abs(length(vec2(q.x*0.42, q.y*1.9+q.x*0.5))-0.62);
    if(ring < 0.05 && (r > 1.0 || q.y+q.x*0.26 < 0.0)) col = vec3(0.6,0.95,1.0);
  }
  // a pale moon toward +X
  vec3 Q = normalize(vec3(1.0,0.28,-0.5)); float g = dot(d, Q);
  if(g > 0.985){ col = dot(normalize(d-Q), normalize(vec3(0.5,0.6,0.2))) > -0.2 ? vec3(0.8,0.9,1.0) : vec3(0.2,0.2,0.42); }
  return col;
}`;

const PROF = [[-2.2, 0], [2.2, 0], [2.7, 0.9], [2.7, 2.5], [1.7, 3.4], [-1.7, 3.4], [-2.7, 2.5], [-2.7, 0.9]];
const SEGS = PROF.map((a, i) => {
  const b = PROF[(i + 1) % PROF.length], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy), mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let n = [-dy / len, dx / len]; if (n[0] * (0 - mid[0]) + n[1] * (1.7 - mid[1]) < 0) n = [-n[0], -n[1]];
  return { a, b, len, mid, n, ang: Math.atan2(dy, dx), t: [dx / len, dy / len] };
});
const STRIP = ["#232a55", "#2f3a72", "#3c4a8c", "#2c3468", "#222853", "#2c3468", "#3c4a8c", "#2f3a72"];
const SEAM = [[2, 1.1], [4, 0.52], [1, 0.8], [2, 0.67], [4, 0.85], [2, 0.67], [1, 0.8], [4, 0.52]];
const VARIANTS = ["window", "crt", "door", "stencil", "deck", "crt2"];
const variantOf = (i, s, arm = 0) => { if (((i % BULK) + BULK) % BULK === 0) return "stencil"; const h = hash(i, s, arm, 5); return VARIANTS[Math.floor(h * VARIANTS.length)]; };

function textures() {
  const T = {};
  const sign = (w, h, col, bg, draw) => canvasTex(w, h, (ctx) => { ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = col; ctx.lineWidth = 6; ctx.strokeRect(14, 14, w - 28, h - 28); draw(ctx); scanlines(ctx, w, h); });
  T.signs = [
    sign(512, 256, "#ffb428", "#1c0d02", (c) => { kana(c, "トラブル", 44, 40, 100, 15, "#ffb428"); latin(c, "SECTOR 07 // RING-C", 46, 212, 30, "#ffb428"); }),
    sign(512, 256, "#3dffb0", "#02170f", (c) => { kana(c, "キケン", 40, 34, 78, 12, "#3dffb0"); c.strokeStyle = "#3dffb0"; c.lineWidth = 4; c.beginPath(); for (let x = 0; x <= 200; x += 4) { const y = 76 + Math.sin(x * 0.11) * 30 * Math.sin(x * 0.02 + 1); x ? c.lineTo(300 + x * 0.9, y) : c.moveTo(300, y); } c.stroke(); c.fillStyle = "#3dffb0"; for (let i = 0; i < 11; i++) c.fillRect(44 + i * 40, 222 - (20 + ((i * 37) % 60)), 26, 20 + ((i * 37) % 60)); }),
    sign(512, 256, "#ff4fb0", "#1a0314", (c) => { chevrons(c, 40, 50, 300, 110, 4, 18, "#ff4fb0"); latin(c, "07", 368, 136, 84, "#ff4fb0"); latin(c, "DOCK >> 144", 46, 214, 30, "#ff4fb0"); }),
    sign(512, 256, "#ff5a48", "#1c0403", (c) => { kana(c, "ドローン", 40, 36, 84, 13, "#ff5a48"); c.fillStyle = "#ff5a48"; c.beginPath(); c.arc(436, 78, 34, 0, 7); c.fill(); c.fillStyle = "#1c0403"; c.beginPath(); c.arc(436, 78, 15, 0, 7); c.fill(); latin(c, "PATROL ACTIVE", 44, 180, 34, "#ff5a48"); latin(c, "UNIT K-9 / K-12 / E-02", 44, 220, 24, "#ff5a48"); }),
    sign(512, 256, "#5fe8ff", "#021420", (c) => { kana(c, "ゲート", 40, 34, 96, 14, "#5fe8ff"); latin(c, "12", 370, 124, 96, "#5fe8ff"); hazard(c, 40, 150, 432, 26, "#5fe8ff", "#021420", 40); latin(c, "SEALING  00:04", 44, 222, 32, "#5fe8ff"); }),
    sign(512, 256, "#ffd23c", "#141003", (c) => { c.strokeStyle = "#ffd23c"; c.lineWidth = 5; c.beginPath(); c.ellipse(140, 128, 92, 92, 0, 0, 7); c.stroke(); c.beginPath(); c.ellipse(140, 128, 56, 56, 0, 0, 7); c.stroke(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; c.beginPath(); c.moveTo(140 + Math.cos(a) * 56, 128 + Math.sin(a) * 56); c.lineTo(140 + Math.cos(a) * 92, 128 + Math.sin(a) * 92); c.stroke(); } c.fillStyle = "#ff5a48"; c.fillRect(196, 80, 22, 22); kana(c, "ノクス", 262, 44, 62, 10, "#ffd23c"); kana(c, "リング", 262, 118, 62, 10, "#ffd23c"); latin(c, "YOU ARE HERE", 262, 222, 26, "#ffd23c"); }),
  ];
  const st = (str, col = "#fff") => canvasTex(Math.ceil(kanaWidth(str, 104) + 28), 128, (c) => kana(c, str, 14, 12, 104, 17, col));
  T.stencils = [["トラブル", 2.2], ["ガンマ デッキ", 3.0], ["シャッター", 2.6], ["キケン", 1.7], ["ノクス リング", 3.0]].map(([s, w]) => ({ tex: st(s), w }));
  const code = (s) => canvasTex(288, 128, (c) => latin(c, s, 4, 104, 104, "#fff"));
  T.codes = ["C-07", "B-12", "D-31", "A-02", "K-44"].map(code);
  T.arrow = canvasTex(128, 256, (c) => { c.strokeStyle = "#fff"; c.lineWidth = 26; for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(14, 30 + i * 80); c.lineTo(64, 76 + i * 80); c.lineTo(114, 30 + i * 80); c.stroke(); } });
  T.grate = canvasTex(256, 256, (c) => { c.fillStyle = "#171b3c"; c.fillRect(0, 0, 256, 256); c.fillStyle = "#2f376b"; for (let y = 10; y < 256; y += 28) c.fillRect(12, y, 232, 12); c.strokeStyle = "#3d4680"; c.lineWidth = 8; c.strokeRect(4, 4, 248, 248); });
  T.placard = canvasTex(256, 256, (c) => { c.fillStyle = "#e9e3cf"; c.fillRect(0, 0, 256, 256); hazard(c, 0, 0, 256, 44, "#ffc21e", "#15162c", 40); kana(c, "キケン", 22, 60, 66, 10, "#c8261c"); latin(c, "HIGH VOLTAGE", 20, 176, 27, "#15162c"); latin(c, "PANEL 7G-204", 20, 212, 22, "#15162c", { bold: false }); c.fillStyle = "#15162c"; c.fillRect(20, 226, 216, 6); });
  T.cassette = canvasTex(256, 160, (c) => { c.fillStyle = "#d9d2b8"; c.fillRect(0, 0, 256, 160); c.fillStyle = "#15162c"; c.fillRect(20, 22, 216, 84); c.fillStyle = "#f07a22"; c.fillRect(20, 22, 216, 14); c.fillStyle = "#d9d2b8"; for (const x of [84, 172]) { c.beginPath(); c.arc(x, 72, 20, 0, 7); c.fill(); } c.fillStyle = "#15162c"; for (const x of [84, 172]) { c.beginPath(); c.arc(x, 72, 8, 0, 7); c.fill(); } latin(c, "LOG 144", 24, 142, 28, "#15162c"); for (let i = 0; i < 4; i++) c.fillRect(164 + i * 20, 122, 12, 22); });
  // the shutter's two leaves share one painting, laid over the corridor's section
  T.shutter = canvasTex(1024, 640, (c) => {
    c.fillStyle = "#3a426f"; c.fillRect(0, 0, 1024, 640);
    c.fillStyle = "#2c335c"; for (let i = 0; i < 6; i++) c.fillRect(0, i * 110 + 8, 1024, 6);
    c.fillStyle = "#46507f"; for (let i = 0; i < 9; i++) c.fillRect(i * 128 - 4, 0, 6, 640);
    hazard(c, 0, 250, 1024, 130, "#f6a81c", "#15162c", 86);
    c.fillStyle = "#15162c"; c.fillRect(0, 244, 1024, 8); c.fillRect(0, 378, 1024, 8);
    kana(c, "シャッター", 250, 70, 100, 15, "#cfd8ff"); latin(c, "24", 130, 190, 150, "#f6a81c", { align: "center" });
    latin(c, "KEEP CLEAR", 512, 500, 74, "#cfd8ff", { align: "center" }); latin(c, "AUTO-SEAL  //  NOX RING  //  GATE 24", 512, 560, 30, "#8f98d8", { align: "center" });
    c.fillStyle = "#15162c"; for (const x of [70, 954]) for (const y of [60, 580]) { c.beginPath(); c.arc(x, y, 14, 0, 7); c.fill(); }
  });
  T.stripes = canvasTex(256, 64, (c) => hazard(c, 0, 0, 256, 64, "#f6a81c", "#15162c", 64), { repeat: true });
  return T;
}

// The hub's floor, painted: 2048 px for 16 m. Canvas x is world x, canvas y is world z, from the hub's centre.
function hubFloorTex() {
  return canvasTex(2048, 2048, (c) => {
    const S = 128, C = 1024, m = (v) => v * S;
    c.fillStyle = "#2a3263"; c.fillRect(0, 0, 2048, 2048);
    // plating: a ring of plates, darker and lighter by hand
    for (let r = 0; r < 4; r++) for (let k = 0; k < 16; k++) {
      const h = hash(r, k, 3); if (h > 0.34 && h < 0.72) continue;
      c.fillStyle = h <= 0.34 ? "#252c58" : "#303a70"; c.beginPath(); const a0 = k * Math.PI / 8, a1 = a0 + Math.PI / 8, r0 = m(2.7 + r * 1.45), r1 = m(2.7 + (r + 1) * 1.45);
      c.arc(C, C, r1, a0, a1); c.arc(C, C, r0, a1, a0, true); c.fill();
    }
    c.strokeStyle = "#181c40"; c.lineWidth = 5;
    for (let r = 0; r < 5; r++) { c.beginPath(); c.arc(C, C, m(2.7 + r * 1.45), 0, 7); c.stroke(); }
    for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8 + Math.PI / 16; c.beginPath(); c.moveTo(C + Math.cos(a) * m(2.7), C + Math.sin(a) * m(2.7)); c.lineTo(C + Math.cos(a) * m(11), C + Math.sin(a) * m(11)); c.stroke(); }
    // the hazard ring, broken at the four mouths
    c.save(); c.beginPath(); c.arc(C, C, m(6.95), 0, 7); c.arc(C, C, m(6.45), 0, 7, true); c.clip("evenodd");
    for (let k = 0; k < 96; k++) { const a0 = k * Math.PI / 48, a1 = a0 + Math.PI / 48; c.fillStyle = k % 2 ? "#15162c" : "#f6a81c"; c.beginPath(); c.moveTo(C, C); c.arc(C, C, m(7.2), a0 + 0.05, a1 + 0.05); c.fill(); }
    c.restore();
    for (let r = 0; r < 4; r++) {
      c.save(); c.translate(C, C); c.rotate(-r * Math.PI / 2);      // local +y of the canvas is the +Z arm; each turn is the next arm
      c.fillStyle = "#2a3263"; c.fillRect(-m(2.2), m(6.3), m(4.4), m(0.8));
      c.fillStyle = "#8fb6e8"; for (const s of [-1, 1]) c.fillRect(s * m(1.45) - 6, m(2.9), 12, m(5.2));
      c.fillStyle = "#ffc21e"; for (let k = 0; k < 4; k++) c.fillRect(-10, m(3.2 + k * 1.3), 20, m(0.8));
      c.strokeStyle = "#a8b4ee"; c.lineWidth = 30; c.lineJoin = "miter";
      for (let k = 0; k < 3; k++) for (const s of [-1, 1]) { c.beginPath(); c.moveTo(s * m(0.42), m(3.5 + k * 0.62)); c.lineTo(s * m(0.82), m(3.95 + k * 0.62)); c.lineTo(s * m(1.22), m(3.5 + k * 0.62)); c.stroke(); }
      // the arm's name, read by someone walking out of the hub into it
      c.save(); c.translate(0, m(5.6)); c.rotate(Math.PI);
      const names = ["A-01", "B-02", "C-03", "D-04"], kn = ["ドック", "マーケット", "コア", "リング"];
      latin(c, names[r], 0, m(0.1), 150, "#cfd8ff", { align: "center" }); kana(c, kn[r], -kanaWidth(kn[r], 54) / 2, -m(1.7), 54, 9, "#f6a81c");
      c.restore(); c.restore();
    }
    // the centre: a grate with the station's mark
    c.fillStyle = "#1a1e44"; c.beginPath(); c.arc(C, C, m(2.5), 0, 7); c.fill();
    c.strokeStyle = "#39427c"; c.lineWidth = 12; for (let k = 0; k < 36; k++) { const a = k * Math.PI / 18; c.beginPath(); c.moveTo(C + Math.cos(a) * m(1.25), C + Math.sin(a) * m(1.25)); c.lineTo(C + Math.cos(a) * m(2.35), C + Math.sin(a) * m(2.35)); c.stroke(); }
    c.strokeStyle = "#5fe8ff"; c.lineWidth = 16; c.beginPath(); c.arc(C, C, m(2.5), 0, 7); c.stroke();
    c.fillStyle = "#39427c"; c.beginPath(); c.arc(C, C, m(1.15), 0, 7); c.fill();
    c.strokeStyle = "#f6a81c"; c.lineWidth = 26; c.beginPath(); c.arc(C, C, m(0.72), 0.5, 5.4); c.stroke();
    c.fillStyle = "#f6a81c"; c.beginPath(); c.arc(C, C, m(0.26), 0, 7); c.fill();
    // scuffs: a few hard patches
    for (let k = 0; k < 14; k++) { const a = hash(k, 1) * 6.28, r = m(3 + hash(k, 2) * 4); c.fillStyle = "rgba(20,22,54,0.35)"; c.beginPath(); c.ellipse(C + Math.cos(a) * r, C + Math.sin(a) * r, 30 + hash(k, 3) * 70, 10 + hash(k, 4) * 16, hash(k, 5) * 3, 0, 7); c.fill(); }
  });
}

export async function createCorridor(renderer, o = {}) {
  const W = o.width ?? 1920, H = o.height ?? 1080, post = o.post ?? new Post(renderer, W, H);
  const U = { uJunc: { value: new THREE.Vector4(0, 0, HUB, 0) }, uHull: { value: 1 }, uAlarm: { value: 0 }, uAlarmAng: { value: 0 }, uStars: { value: 1 }, uRun: { value: 0 }, uSpin: { value: 0 } };
  const kit = createKit(CHUNK, U), { mat } = kit, T = textures();
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(50, W / H, 0.08, 500);
  const G = { screens: { value: 1 }, meters: { value: 0.5 }, reels: { value: 0 }, stars: { value: 1 }, beam: { value: 1 } };
  const dark = "#1a1d40", housing = "#2a3060", orange = "#f07a22";

  // ---- one module, in parts that a cutaway can take away ---------------------------------------------------------
  const strip = (b, k) => { const s = SEGS[k]; b.quad([s.mid[0], s.mid[1], M / 2], [0, 0, 1], [s.t[0], s.t[1], 0], M, s.len, mat(STRIP[k], { seam: SEAM[k] }), true); };
  const ribSeg = (b, k, bulk) => {
    const s = SEGS[k], col = (k === 1 || k === 7) ? orange : (k === 4 ? "#39416f" : "#4a5490");
    if (!bulk) { b.box(s.len + 0.18, 0.26, 0.46, s.mid[0] + s.n[0] * 0.13, s.mid[1] + s.n[1] * 0.13, 0, mat(col), { rz: s.ang }); return; }
    // a bulkhead frame: deeper, heavier, hazard-striped on its inner face
    b.box(s.len + 0.4, 0.5, 1.0, s.mid[0] + s.n[0] * 0.22, s.mid[1] + s.n[1] * 0.22, 0, mat(k % 2 ? orange : "#525c9a"), { rz: s.ang });
    b.box(s.len + 0.3, 0.06, 0.3, s.mid[0] + s.n[0] * 0.5, s.mid[1] + s.n[1] * 0.5, 0.36, mat("#15162c"), { rz: s.ang });
    b.box(s.len + 0.3, 0.06, 0.3, s.mid[0] + s.n[0] * 0.5, s.mid[1] + s.n[1] * 0.5, -0.36, mat("#15162c"), { rz: s.ang });
  };
  function floorPart(bulk) {
    const b = kit.builder(); strip(b, 0);
    if (bulk) { b.box(4.4, 0.08, 1.0, 0, 0.04, 0, mat("#525c9a")); b.box(4.4, 0.012, 0.22, 0, 0.088, 0.3, mat("#ffc21e")); b.box(4.4, 0.012, 0.22, 0, 0.088, -0.3, mat("#ffc21e")); }
    else { b.box(4.4, 0.05, 0.5, 0, 0.025, 0, mat("#3d456f")); b.box(4.4, 0.012, 0.12, 0, 0.056, 0, mat("#ffc21e")); }
    b.box(0.16, 0.006, 1.6, 0, 0.004, M / 2, mat("#ffc21e"));
    for (const s of [1, -1]) b.box(0.09, 0.006, M, s * 1.45, 0.004, M / 2, mat("#8fb6e8"));
    b.quad([1.0, 0.007, 3.1], [1, 0, 0], [0, 0, -1], 0.8, 0.8, mat("#fff", { kind: 10, map: T.grate, offset: 1 }));
    return b.build();
  }
  const floorArrow = (() => { const b = kit.builder(); b.quad([-0.75, 0.006, M / 2], [1, 0, 0], [0, 0, -1], 0.7, 1.4, mat("#a8b4ee", { kind: 4, map: T.arrow })); return b.build(); })();
  function ceilPart(bulk) {
    const b = kit.builder(); strip(b, 4); ribSeg(b, 4, bulk);
    b.box(1.7, 0.1, 1.5, 0, 3.36, M / 2, mat(housing));
    b.box(1.45, 0.04, 1.25, 0, 3.3, M / 2, mat("#eaffff", { kind: 1, flag: 2 }));
    b.box(0.22, 0.05, M, -1.2, 3.37, M / 2, mat("#1c2046")); b.box(0.05, 0.05, M, 1.25, 3.37, M / 2, mat("#f6a81c"));
    return b.build();
  }
  function slantPart(s, bulk) {      // the upper slant with its pipes; goes with the ceiling or with its wall
    const b = kit.builder(), k = s > 0 ? 3 : 5; strip(b, k); ribSeg(b, k, bulk);
    b.cyl(0.1, M, s * 2.0, 3.02, M / 2, mat("#c25a2c"), "z"); b.cyl(0.06, M, s * 2.28, 2.84, M / 2, mat("#3fa3a8"), "z", 8);
    b.box(0.3, 0.18, 0.3, s * 2.0, 2.98, 1, mat(housing)); b.cyl(0.13, 0.12, s * 2.0, 3.02, 2.6, mat("#8a3e1c"), "z");
    return b.build();
  }
  function wallBase(s, bulk) {       // the wall and lower slant, rib, neon strips, vent
    const b = kit.builder(), kw = s > 0 ? 2 : 6, kl = s > 0 ? 1 : 7; strip(b, kw); strip(b, kl); ribSeg(b, kw, bulk); ribSeg(b, kl, bulk);
    if (!bulk) { const w = SEGS[kw]; b.box(0.12, 0.5, 0.56, w.mid[0] + w.n[0] * 0.3, 1.7, 0, mat(housing)); b.box(0.03, 0.22, 0.08, w.mid[0] + w.n[0] * 0.37, 1.7, 0.2, mat(s > 0 ? "#ff5a3c" : "#5dffb0", { kind: 1 })); }
    else for (const y of [2.2, 1.2]) { b.box(0.16, 0.2, 0.2, s * 2.32, y, 0.62, mat(dark)); b.box(0.1, 0.14, 0.14, s * 2.24, y, 0.62, mat("#ff3030", { kind: 1, flag: 3 })); }
    b.box(0.07, 0.09, M, s * 2.64, 2.5, M / 2, mat("#7ffcff", { kind: 1, flag: 1 }));
    b.box(0.07, 0.07, M, s * 2.24, 0.08, M / 2, mat("#ff3fa8", { kind: 1, flag: 1 }));
    b.box(0.06, 0.5, 1.2, s * 2.42, 0.48, M / 2, mat("#1c2046"), { rz: s * -0.5 });
    for (const dz of [-0.4, -0.2, 0, 0.2, 0.4]) b.box(0.02, 0.4, 0.05, s * 2.39, 0.48, M / 2 + dz, mat("#3d456f"), { rz: s * -0.5 });
    return b.build();
  }
  function wallVariant(s, v, n) {
    const b = kit.builder(), zc = M / 2, u = [0, 0, s], up = [0, 1, 0], X = s * 2.69;
    if (v === "window") {
      b.quad([X, 1.72, zc], u, up, 2.9, 1.25, mat("#000", { kind: 3 }));
      for (const dy of [-0.66, 0.66]) b.box(0.16, 0.12, 3.1, s * 2.64, 1.72 + dy, zc, mat("#565fa0"));
      for (const dz of [-1.5, 0, 1.5]) b.box(0.16, 1.42, dz ? 0.14 : 0.08, s * 2.64, 1.72, zc + dz, mat("#565fa0"));
      // the light the window lets in: a hard patch on the floor, as bright as the stars are loud
      b.quad([s * 0.9, 0.012, zc + 0.3], [1, 0, 0.25], [0, 0, -1], 1.5, 2.5, mat("#9ad8ff", { kind: 7, alpha: 0.2, additive: true, gain: G.stars }));
    } else if (v === "crt" || v === "crt2") {
      const k = (n + (v === "crt2" ? 3 : 0)) % T.signs.length;
      b.box(0.3, 1.2, 2.3, s * 2.6, 1.78, zc, mat("#252a52"));
      b.quad([s * 2.44, 1.78, zc], u, up, 2.0, 0.98, mat("#fff", { kind: 2, map: T.signs[k], gain: G.screens }));
      b.box(0.2, 0.08, 0.5, s * 2.5, 1.12, zc - 0.6, mat("#ff5a3c", { kind: 1 }));
      b.cyl(0.035, 0.7, s * 2.6, 2.74, zc + 0.8, mat("#15162c"), "y"); b.cyl(0.035, 0.7, s * 2.6, 2.74, zc - 0.8, mat("#15162c"), "y");
      if (v === "crt2") b.quad([s * 2.685, 1.3, zc + 1.55], u, up, 0.42, 0.42, mat("#fff", { kind: 10, map: T.placard, offset: 1 }));
    } else if (v === "door") {
      b.box(0.14, 2.1, 1.7, s * 2.66, 1.95, zc, mat(dark));
      for (const dz of [-0.9, 0.9]) b.box(0.2, 2.2, 0.14, s * 2.62, 1.95, zc + dz, mat(orange));
      b.box(0.2, 0.14, 1.94, s * 2.62, 2.98, zc, mat(orange));
      b.quad([s * 2.585, 1.9, zc], u, up, 1.2, 0.53, mat("#8f98d8", { kind: 4, map: T.codes[n % T.codes.length] }));
      b.box(0.05, 0.1, 0.3, s * 2.56, 2.75, zc, mat("#ff3050", { kind: 1 }));
      b.box(0.08, 0.3, 0.2, s * 2.62, 1.5, zc + 1.2, mat("#d9d2b8")); b.box(0.03, 0.06, 0.1, s * 2.57, 1.56, zc + 1.2, mat("#5dffb0", { kind: 1 }));
    } else if (v === "stencil") {
      const st = T.stencils[n % T.stencils.length];
      b.quad([X, 1.75, zc], u, up, Math.min(3.2, st.w), 0.55 * Math.min(1, 3.2 / st.w), mat("#8e9fe6", { kind: 4, map: st.tex }));
      b.box(0.1, 0.5, 0.36, s * 2.64, 1.2, zc - 1.5, mat("#d9d2b8")); b.cyl(0.03, 1.6, s * 2.66, 1.7 + 0.55, zc - 1.5, mat("#15162c"), "y");
      b.quad([s * 2.685, 2.2, zc + 1.45], u, up, 0.42, 0.42, mat("#fff", { kind: 10, map: T.placard, offset: 1 }));
    } else if (v === "deck") {
      // the station's own hi-fi: reels that turn, meters that jump, a cassette slot nobody asked for
      b.box(0.34, 1.46, 3.0, s * 2.58, 1.72, zc, mat("#a9a288"));
      b.box(0.36, 0.1, 3.06, s * 2.58, 2.48, zc, mat("#8d8770")); b.box(0.36, 0.1, 3.06, s * 2.58, 0.96, zc, mat("#8d8770"));
      b.quad([s * 2.405, 2.0, zc - 0.7], u, up, 1.3, 0.66, mat("#f07a22", { kind: 9, gain: G.reels }));
      b.quad([s * 2.405, 2.0, zc + 0.8], u, up, 1.1, 0.66, mat("#5dffb0", { kind: 8, seam: [14, 9], gain: G.meters }));
      b.quad([s * 2.405, 1.3, zc - 0.85], u, up, 0.9, 0.56, mat("#fff", { kind: 10, map: T.cassette, offset: 1 }));
      for (let i = 0; i < 6; i++) b.box(0.06, 0.1, 0.14, s * 2.4, 1.4, zc + 0.05 + i * 0.22, mat(i === 1 ? "#ff5a3c" : i === 4 ? "#ffc21e" : "#15162c", { kind: i === 1 || i === 4 ? 1 : 0 }));
      for (let i = 0; i < 6; i++) b.box(0.04, 0.05, 0.14, s * 2.4, 1.16, zc + 0.05 + i * 0.22, mat("#3d456f"));
      b.cyl(0.05, 0.9, s * 2.5, 2.95, zc + 1.2, mat("#15162c"), "y"); b.cyl(0.05, 0.9, s * 2.5, 2.95, zc + 1.0, mat("#c25a2c"), "y");
    }
    return b.build();
  }
  function cutPart(s, top) {         // what a cutaway shows of the structure: its section, and struts in front of it
    const b = kit.builder(), sec = mat("#0e1030", { paint: 0 });
    if (top) { b.box(1.6, 0.5, M, s * 3.5, 2.3, M / 2, sec); b.box(0.5, 0.12, M, s * 3.1, 2.58, M / 2, mat("#2a3060")); b.cyl(0.11, M, s * 3.75, 2.62, M / 2, mat("#c25a2c"), "z"); b.box(0.5, 0.2, 0.5, s * 3.6, 2.62, 0, mat("#f07a22")); }
    else {
      b.box(1.3, 0.5, M, s * 2.85, -0.25, M / 2, sec); b.box(1.3, 0.5, M, s * 2.35, 3.66, M / 2, sec);
      b.box(1.34, 0.06, M, s * 2.85, 0.0, M / 2, mat("#5a2c14", { paint: 0 })); b.box(0.2, 4.4, 0.34, s * 3.3, 1.7, 0, sec);
      b.cyl(0.07, M, s * 3.3, 3.2, M / 2, sec, "z"); b.cyl(0.05, M, s * 3.3, 0.4, M / 2, sec, "z");
    }
    return b.build();
  }
  const P = { floor: [floorPart(false), floorPart(true)], ceil: [ceilPart(false), ceilPart(true)], slant: {}, wall: {}, vari: {}, cutSide: {}, cutTop: {} };
  for (const s of [1, -1]) {
    P.slant[s] = [slantPart(s, false), slantPart(s, true)]; P.wall[s] = [wallBase(s, false), wallBase(s, true)];
    P.cutSide[s] = cutPart(s, false); P.cutTop[s] = cutPart(s, true); P.vari[s] = {};
    for (const v of VARIANTS) P.vari[s][v] = [0, 1, 2, 3, 4].map((n) => (v === "window" || v === "deck") && n ? null : wallVariant(s, v, n));
  }
  // ---- a shutter: two toothed leaves over the corridor's section ---------------------------------------------------
  const TEETH = 6, tooth = (i) => 1.7 + (i % 2 ? 0.26 : -0.26), zig = Array.from({ length: TEETH * 2 + 1 }, (_, i) => [-2.7 + i * 5.4 / (TEETH * 2), tooth(i)]);
  const leafGeom = (pts) => {
    const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map((p) => new THREE.Vector2(p[0], p[1]))), { depth: 0.36, bevelEnabled: false }).toNonIndexed();
    const p = g.attributes.position, uv = g.attributes.uv; const nz = g.attributes.normal; for (let i = 0; i < p.count; i++) { const u = (p.getX(i) + 2.7) / 5.4; uv.setXY(i, nz.getZ(i) < -0.5 ? 1 - u : u, p.getY(i) / 3.4); }     // read the right way round from both sides
    g.translate(0, 0, -0.18); return g;
  };
  const leafMat = mat("#fff", { kind: 10, map: T.shutter });
  const leaves = { top: leafGeom([...zig, [2.7, 2.5], [1.7, 3.4], [-1.7, 3.4], [-2.7, 2.5]]), bottom: leafGeom([...zig.slice().reverse(), [-2.7, 0.9], [-2.2, 0], [2.2, 0], [2.7, 0.9]]) };
  const shutterProto = new THREE.Group();
  for (const k of ["top", "bottom"]) { const m = new THREE.Mesh(leaves[k], leafMat); m.frustumCulled = false; m.name = k; shutterProto.add(m); }
  const setShutter = (g, c) => { const [a, b] = Array.isArray(c) ? c : [c, c]; g.children[0].position.y = 1.52 * (1 - clamp(a)); g.children[1].position.y = -1.98 * (1 - clamp(b)); };

  // ---- the hub ----------------------------------------------------------------------------------------------------
  const hub = new THREE.Group(), hubRoof = new THREE.Group(), hubShutters = [];
  {
    const b = kit.builder(), r = kit.builder(), rotY = (k) => new THREE.Matrix4().makeRotationY(k * Math.PI / 2);
    b.quad([0, 0.002, 0], [1, 0, 0], [0, 0, -1], 16, 16, mat("#fff", { kind: 10, map: hubFloorTex() }));
    b.cyl(2.5, 0.02, 0, 0.012, 0, mat("#5fe8ff", { kind: 7, alpha: 0.1, additive: true, gain: G.beam }), "y", 40);
    for (let k = 0; k < 4; k++) {
      // a corner wall: x along the wall, y up, z into the room
      const base = rotY(k).multiply(new THREE.Matrix4().makeBasis(new THREE.Vector3(-0.7071, 0, 0.7071), new THREE.Vector3(0, 1, 0), new THREE.Vector3(-0.7071, 0, -0.7071)).setPosition(5.35, 0, 5.35));
      const c = kit.builder(), L = 7.5;
      c.box(L, 4.6, 1.4, 0, 2.3, -0.7, mat("#2f3a72", { seam: [1.5, 1.15], seamMode: 2 }));
      c.box(L - 0.6, 0.9, 0.9, 0, 0.45, 0.45, mat("#3c4a8c")); c.box(L - 0.5, 0.08, 1.0, 0, 0.94, 0.46, mat("#d9d2b8"));
      c.box(L - 0.6, 0.12, 0.06, 0, 0.3, 0.92, mat("#ff3fa8", { kind: 1 }));
      for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
        const x = -2.3 + i * 1.5, y = 1.75 + j * 0.92; c.box(1.36, 0.84, 0.3, x, y, 0.12, mat("#252a52"));
        c.quad([x, y, 0.275], [1, 0, 0], [0, 1, 0], 1.2, 0.68, mat("#fff", { kind: 2, map: T.signs[(k + i * 2 + j * 3) % T.signs.length], gain: G.screens }));
      }
      c.quad([2.55, 2.2, 0.02], [1, 0, 0], [0, 1, 0], 1.3, 1.5, mat("#5dffb0", { kind: 8, seam: [12, 16], gain: G.meters }));
      c.box(1.5, 1.7, 0.1, 2.55, 2.2, -0.02, mat("#15162c"));
      c.quad([-3.2, 3.9, 0.02], [1, 0, 0], [0, 1, 0], 0.8, 0.8, mat("#fff", { kind: 10, map: T.placard, offset: 1 }));
      c.quad([0, 3.95, 0.02], [1, 0, 0], [0, 1, 0], 3.0, 0.5, mat("#c9d4ff", { kind: 4, map: T.stencils[(k + 1) % T.stencils.length].tex }));
      for (const [x, z, h, col] of [[-2.9, 1.4, 0.9, "#f07a22"], [-2.2, 1.55, 0.6, "#3fa3a8"], [3.0, 1.35, 1.1, "#525c9a"]]) c.cyl(0.32, h, x, h / 2, z, mat(col), "y", 12);
      c.box(0.8, 0.6, 0.6, 1.9, 0.3, 1.45, mat("#d9d2b8")); c.box(0.82, 0.1, 0.62, 1.9, 0.42, 1.45, mat("#f6a81c"));
      c.box(L + 0.2, 0.25, 0.3, 0, 4.4, 0.15, mat(orange));
      for (const [m_, list] of c.bins) for (const g of list) b.add(g.applyMatrix4(base), m_);
      // a mouth: the portal wall round the corridor's section, its frame, its name in lights
      const mth = kit.builder(), hole = new THREE.Path(PROF.map((p) => new THREE.Vector2(p[0], p[1]))), sh = new THREE.Shape([[-2.75, 0], [2.75, 0], [2.75, 4.6], [-2.75, 4.6]].map((p) => new THREE.Vector2(p[0], p[1])));
      sh.holes.push(hole);
      mth.add(new THREE.ExtrudeGeometry(sh, { depth: 0.8, bevelEnabled: false }), mat("#39416f"), new THREE.Matrix4().makeTranslation(0, 0, 7.6));
      for (let q = 1; q < 8; q++) { const s = SEGS[q]; mth.box(s.len + 0.4, 0.5, 0.9, s.mid[0] + s.n[0] * 0.22, s.mid[1] + s.n[1] * 0.22, 7.95, mat(q % 2 ? orange : "#525c9a"), { rz: s.ang }); }
      mth.box(4.4, 0.08, 0.9, 0, 0.04, 7.95, mat("#525c9a"));
      mth.box(3.3, 0.74, 0.2, 0, 4.02, 7.52, mat("#15162c"));
      const name = canvasTex(512, 128, (cx) => { cx.fillStyle = "#1c0d02"; cx.fillRect(0, 0, 512, 128); latin(cx, ["A-01", "B-02", "C-03", "D-04"][k], 20, 96, 92, "#ffb428"); kana(cx, ["ドック", "マーケット", "コア", "リング"][k], 280, 30, k === 1 ? 42 : 64, k === 1 ? 7 : 10, "#ffb428"); scanlines(cx, 512, 128); });
      mth.quad([0, 4.02, 7.41], [-1, 0, 0], [0, 1, 0], 3.1, 0.62, mat("#fff", { kind: 2, map: name, gain: G.screens }));
      for (const s of [1, -1]) { mth.box(0.2, 0.2, 0.16, s * 2.2, 3.7, 7.5, mat(dark)); mth.box(0.14, 0.14, 0.1, s * 2.2, 3.7, 7.42, mat("#ff3030", { kind: 1, flag: 3 })); }
      for (const [m_, list] of mth.bins) for (const g of list) b.add(g.applyMatrix4(rotY(k)), m_);
      const sg = shutterProto.clone(); sg.position.set(0, 0, 7.95).applyMatrix4(rotY(k)); sg.rotation.y = k * Math.PI / 2; hub.add(sg); hubShutters.push(sg);
    }
    // roof: a ring of light under a dark dome plate
    r.cyl(8.6, 0.3, 0, 4.75, 0, mat("#222853"), "y", 8, 8.6, { ry: Math.PI / 8 });
    r.add(new THREE.TorusGeometry(3.4, 0.16, 6, 40).rotateX(Math.PI / 2), mat("#eaffff", { kind: 1, flag: 2 }), new THREE.Matrix4().makeTranslation(0, 4.52, 0));
    r.add(new THREE.TorusGeometry(3.4, 0.3, 6, 40).rotateX(Math.PI / 2), mat(housing), new THREE.Matrix4().makeTranslation(0, 4.62, 0));
    hub.add(b.build()); hubRoof.add(r.build()); hub.add(hubRoof); scene.add(hub);
  }
  const pool = new Pool(scene), armX = new THREE.Group(); armX.rotation.y = Math.PI / 2; scene.add(armX); const poolX = new Pool(armX);
  const drones = createDrones(kit, scene), markers = createMarkers(scene);

  function module(pl, i, z, cut, doors, chomp, arm) {
    const bulk = ((i % BULK) + BULK) % BULK === 0 ? 1 : 0, put = (proto) => { const g = pl.use(proto); g.position.z = z; return g; };
    put(P.floor[bulk]); if (hash(i, arm, 9) > 0.5) put(floorArrow);
    if (cut !== "top") put(P.ceil[bulk]);
    for (const s of [1, -1]) {
      const gone = (cut === "left" && s < 0) || (cut === "right" && s > 0);
      if (cut === "top") put(P.cutTop[s]); else if (!gone) put(P.slant[s][bulk]);
      if (gone) { put(P.cutSide[s]); continue; }
      put(P.wall[s][bulk]);
      const v = variantOf(i, s, arm), n = Math.floor(hash(i, s, arm, 77) * 5); put(P.vari[s][v][n] ?? P.vari[s][v][0]);
    }
    if (bulk) { const g = put(shutterProto); setShutter(g, doors?.[i / BULK] ?? chomp); }
  }

  function render(cam, frame, sync, opt = {}) {
    const w = driveAll(sync, WIRING, frame, opt.wiring), t = frame / sync.fps, J = opt.junction, alert = opt.alert ?? 0;
    aim(camera, cam, W / H);
    kit.shared.uCam.value.copy(camera.position); kit.shared.uFrame.value = frame;
    U.uJunc.value.set(0, J ? J.z : 0, HUB, J ? 1 : 0); U.uHull.value = clamp(w.hull, 0, 1.2); U.uAlarm.value = clamp(alert * 0.8 + w.klaxon * (alert > 0 ? 1 : 0.6), 0, 1.2);
    U.uAlarmAng.value = t * 5.2; U.uStars.value = w.stars; U.uSpin.value = t * 0.02;
    // the strips step on each bass note and glide to the step over 3 frames
    const prev = sync.drive(opt.wiring?.run ?? WIRING.run, frame - 3), since = sync.at(frame).stems.bass.since;
    U.uRun.value = w.run - (w.run > prev ? 1 - clamp(since * 8) : 0);
    G.screens.value = w.screens; G.meters.value = w.meters; G.stars.value = clamp(w.stars, 0, 1.6); G.beam.value = 0.6 + w.hull; G.reels.value = (G.reelAngle = t * 2 + sync.drive({ stem: "keyboard", mode: "count" }, frame) * 0.7);
    pool.begin(); poolX.begin();
    const i0 = Math.floor(cam.pos[2] / M), span = opt.span ?? 24;
    for (let i = i0 - span; i <= i0 + span; i++) { const z = i * M; if (J && Math.abs(z + M / 2 - J.z) < HUB) continue; module(pool, i, z, opt.cut, opt.doors, w.doorChomp, 0); }
    if (J) { armX.position.set(0, 0, J.z); for (let k = 2; k < 16; k++) for (const sgn of [1, -1]) { const i = sgn > 0 ? k : -k - 1; module(poolX, i, i * M, opt.cut === "top" ? "top" : null, null, w.doorChomp, 1); } }
    pool.end(); poolX.end();
    hub.visible = !!J; if (J) { hub.position.set(0, 0, J.z); hubRoof.visible = opt.cut !== "top"; ["A", "B", "C", "D"].forEach((n, k) => setShutter(hubShutters[k], opt.hubDoors?.[n] ?? w.doorChomp)); }
    drones.update(opt.drones ?? [], frame, sync, camera, { thrust: w.thrust });
    markers.update(opt.markers);
    post.capture(scene, camera, ndMaterial, { clear: opt.clear ?? (opt.cut ? 0x0a0c22 : 0x124a6b) });
    post.finish({ seed: frame * 1.618 + 3.1, ...opt.post });
    return { wires: w };
  }
  return { name: "corridor", scene, camera, kit, post, render, WIRING, M, BULK, HUB };
}
