// The market deck: a street of stalls under the station's housing stacks, along Z. Warm amber and red lantern light
// low down, teal shadow above; awnings, noren, blade signs, banners, lantern strings, steam, a crowd of cut-outs, and at
// GAP the deck is gone: a shaft down through the lower levels, with a buckled plate for a ramp on the near side.
// Built once from a seed (it does not repeat); z runs from Z0 to Z1.
//
//   const set = await createMarket(renderer, { width, height });
//   const { scene, camera, clear, post } = set.update(camera, frame, sync, options);   // camera = engine/body.js's { pos, target, fov, up }
//   set.light([x, y, z]) -> the light a figure there is in;  floorAt(x, z) -> the deck's height there, or null over the gap
//
// Cue options:
//   drones     [...]              machines/drones.js specs
//   alert      0..1               beacons on the gantries and a red sweep on the street
//   crowd      true | false | { flee: [x, z] }   the shoppers at the stalls (default true). They shift their weight on
//                                 a slow beat; given what to flee (a rider coming down the street), those it is
//                                 about to reach throw their arms up and jump back toward the stalls
//   steam      0..2               how hard the pots, the vents and the shaft steam (default 1; the `steam` wire adds on drum hits)
//   wiring     { name: wire }     replace wires of WIRING for this frame
//   markers    [[x, y, z], ...]   camera-agreement markers
//   shadows    [...]              contact shadows of the figures (sets/kit.js createShadows)
//   post       { ... }            engine/post.js parameters
// Geometry worth knowing: the walkway is |x| < 3.4 at y = 0; stalls are behind x = +-3.5; lantern rows hang at
// z = 4k + 2, y = 4.4; GAP = { z0: 66, z1: 76 }; the ramp rises from z = 62.4 to 0.85 m at z = 66.
import * as THREE from "three";
import { createKit, createShadows, canvasTex, aim, hash, rng, clamp, FX } from "./kit.js";
import { kana, latin, scanlines, hazard, kanaWidth } from "./sign.js";
import { driveAll } from "../engine/sync.js";
import { createDrones } from "../machines/drones.js";
import { createMarkers } from "./markers.js";

export const Z0 = -28, Z1 = 132, GAP = { z0: 66, z1: 76 }, WX = 3.4, RAMP = { z0: 62.4, h: 0.85 };
// The height of what a figure stands on at (x, z): the deck, the ramp's plate, or nothing over the gap.
export const floorAt = (x, z) => z > GAP.z0 && z < GAP.z1 ? null : z > RAMP.z0 && z <= GAP.z0 && Math.abs(x) < 2.2 ? RAMP.h * (z - RAMP.z0) / (GAP.z0 - RAMP.z0) : 0;
export const WIRING = {
  lamps: { stem: "bass", mode: "env", floor: 0.45, gain: 0.7 },                    // lanterns and the pools under them
  blink: { stem: "drums", mode: "count", gain: 1 },                                // which neon signs are lit changes on every drum hit
  screens: { stem: "synth", mode: "pulse", decay: 0.2, floor: 0.85, gain: 0.5 },   // screens and lit box signs flare
  steam: { stem: "drums", mode: "pulse", decay: 0.25, gain: 1 },                   // pots and vents puff
  floods: { stem: "bass", mode: "pulse", decay: 0.18, floor: 0.5, gain: 0.7 },     // floodlights on the gantries
  klaxon: { stem: "brass", mode: "env", gain: 1.6 },
  thrust: { stem: "drums", mode: "pulse", decay: 0.15, gain: 1 },
};

const CHUNK = `
uniform float uLamp, uBlink, uAlarm, uAlarmAng, uFlood; uniform vec2 uGap;
float setTone(vec3 W, vec3 N){
  float wob = (vnoise(surf(W, N)*1.3)-0.5)*0.22;
  float dz = abs(fract(W.z/4.0)-0.5)*4.0, ax = abs(W.x);
  if(W.y < -0.25) return W.y > -2.2+wob*3.0 && N.y < 0.5 ? 1.0 : 0.0;             // the shaft: the deck's light dies quickly
  if(N.y > 0.7 && W.y < 0.5){                                                     // the ground: a pool under each lantern row
    float r = length(vec2(dz*1.15, max(ax-1.5, 0.0)*0.8))+wob;
    float t = r < 1.25*uLamp+0.35 ? 2.0 : (r < 2.6 ? 1.0 : 0.0);
    if(ax > 2.9) t = max(t, 1.0);
    if(ax > 3.5) t = 2.0;
    return t;
  }
  if(ax > 3.45 && W.y < 3.0){                                                     // in the stalls: their own bulbs
    float f = N.x*-sign(W.x);
    return (f > 0.3 || N.y > 0.5) ? 2.0 : (W.y < 2.2+wob ? 1.0 : 0.0);
  }
  float h = W.y+wob;
  if(h < 3.3) return N.y > 0.4 && dz < 1.5 ? 2.0 : 1.0;                            // awnings and what stands in the street
  if(h < 5.3) return dz < 0.9 && h > 3.7 ? 2.0 : 1.0;                              // the lantern band on the facades
  if(h > 9.6 && h < 11.4 && ax < 4.0) return 1.0;
  return 0.0;
}
vec3 setExtra(vec3 col, vec3 W, vec3 N, float tone){
  col *= mix(1.0, 0.78, abs(N.z));
  if(N.y > 0.7 && W.y < 0.1 && W.y > -0.1){
    // puddles: hard shapes that take the lantern colour
    float p = vnoise(W.xz*0.45+3.0)+0.3*vnoise(W.xz*1.7);
    if(p > 0.93) col = mix(col, tone > 1.5 ? vec3(1.0,0.72,0.42) : vec3(0.16,0.36,0.42), 0.45);
  }
  if(W.y < -0.3 && abs(N.y) < 0.5){
    // the shaft's walls: the levels below, one every three metres, each a lit ledge over its own shadow with a row
    // of windows, every level down a step paler in the glow that comes up from the bottom. Depth is drawn, in
    // steps, the way a background painter lays a receding tower.
    float d = -W.y, band = floor(d/3.0), f = fract(d/3.0), u = abs(N.x) > 0.5 ? W.z : W.x;
    vec3 wall = mix(vec3(0.05,0.12,0.17), vec3(0.16,0.62,0.6), clamp(band/11.0, 0.0, 1.0));
    col = col*0.12 + wall*(0.85+0.15*mod(band, 2.0));
    vec2 cell = vec2(floor(u/1.3), band); float h = hash(cell), fu = fract(u/1.3);
    if(f > 0.3 && f < 0.78 && fu > 0.16 && fu < 0.84 && band > 0.5){
      vec3 win = h > 0.62 ? vec3(1.0,0.74,0.38) : (h > 0.47 ? vec3(0.4,0.95,0.88) : wall*0.55);
      col = mix(win, wall*1.25, clamp(band/13.0, 0.0, 0.85));
      if(abs(fu-0.5) < 0.03) col *= 0.6;                         // the mullion
    }
    if(f < 0.1) col = wall*1.7+0.06; else if(f < 0.2) col *= 0.55;    // the ledge, and the shadow under it
    if(fract(u/5.2+0.3) < 0.035) col *= 0.5;                     // a downpipe
  }
  if(uAlarm > 0.0 && W.y < 6.0){
    float gz = (fract(W.z/16.0+0.5)-0.5)*16.0, ang = atan(W.x, gz);
    float on = step(fract((ang+uAlarmAng)/6.28318), 0.1);
    col = mix(col, col*vec3(1.5,0.4,0.45)+vec3(0.2,0.0,0.03), on*clamp(uAlarm, 0.0, 1.0));
  }
  return col;
}
float setEmit(vec3 W, int flag){
  if(flag == 1){ float id = floor(W.z/4.0)*3.0+floor(W.y/1.5)*7.0+step(0.0, W.x)*13.0; return hash(vec2(id, uBlink)) > 0.3 ? 1.1 : 0.32; }   // neon: some dark on each hit
  if(flag == 2) return uFlood;
  if(flag == 3) return 0.25+1.2*clamp(uAlarm, 0.0, 1.0)*step(0.5, fract(uAlarmAng/3.14159));
  if(flag == 4){ float row = floor(W.z/4.0); return (0.5+0.55*uLamp)*(hash(vec2(row, floor(uFrame/3.0))) > 0.06 ? 1.0 : 0.6); }                 // lanterns, with a guttering one now and then
  if(flag == 5) return 0.85;
  return 1.0;
}
vec3 setSpecial(vec3 W, vec3 d, vec2 uv){
  // the lower city, far below: a grid of lit dots in teal dark
  vec2 g = uv*vec2(70.0, 70.0); vec2 c = floor(g), f = fract(g); float h = hash(c);
  vec3 col = vec3(0.02,0.07,0.09);
  if(h > 0.62 && abs(f.x-0.5) < 0.22 && abs(f.y-0.5) < 0.3) col = h > 0.9 ? vec3(1.0,0.75,0.4) : (h > 0.8 ? vec3(0.3,0.9,0.85) : vec3(0.5,0.3,0.2));
  if(fract(g.x/7.0) < 0.06 || fract(g.y/9.0) < 0.05) col = vec3(0.9,0.5,0.2);
  return col;
}`;

const PAPER = "#e9e0c8", INK = "#1a1420";
const WORDS = ["ソバ", "メシ", "ヤミイチ", "カセット", "テープ", "デンキ", "ネジ", "キカイ", "ホシ", "サケ", "クスリ", "トケイ", "ラジオ", "ミセ", "タコ", "カニ", "ニク", "コメ", "アメ", "ハナ", "ノクス", "マーケット"];
const LATIN = ["NOX MARKET", "DECK 4", "OPEN 25H", "TAPES", "PARTS", "NOODLE", "RADIO", "24", "No.7", "KEY CUT", "REPAIR"];
const NEON = [["#ff5a3c", "#240604"], ["#ffc23c", "#211503"], ["#5fe8d8", "#03191a"], ["#ff5fa8", "#22051a"], ["#f4f0d8", "#141418"], ["#8dff6a", "#081a04"]];
const CLOTH = [["#b3261e", PAPER], ["#1f3a5c", PAPER], ["#d9a521", INK], [PAPER, "#b3261e"], ["#2a6a5e", PAPER], ["#5a2a4a", "#ffc23c"]];

function textures() {
  const T = {};
  T.stripes = CLOTH.map(([a, b], i) => canvasTex(256, 64, (c) => { c.fillStyle = a; c.fillRect(0, 0, 256, 64); c.fillStyle = b; const n = i % 2 ? 8 : 5; for (let k = 0; k < n; k++) c.fillRect(k * 256 / n, 0, 128 / n, 64); c.fillStyle = "rgba(0,0,0,0.25)"; c.fillRect(0, 0, 256, 7); }));
  T.fascia = Array.from({ length: 10 }, (_, i) => canvasTex(512, 96, (c) => {
    const [fg, bg] = NEON[i % NEON.length], w = WORDS[(i * 5 + 1) % WORDS.length], kw = kanaWidth(w, 64);
    c.fillStyle = bg; c.fillRect(0, 0, 512, 96); c.strokeStyle = fg; c.lineWidth = 5; c.strokeRect(8, 8, 496, 80);
    kana(c, w, 26, 16, 64, 10, fg); latin(c, LATIN[i % LATIN.length], 44 + kw, 64, 34, fg); scanlines(c, 512, 96, 0.3);
  }));
  T.blade = Array.from({ length: 10 }, (_, i) => canvasTex(128, 512, (c) => {
    const [fg, bg] = NEON[(i + 2) % NEON.length], w = WORDS[(i * 3) % WORDS.length], n = [...w].length, size = Math.min(92, 440 / n / 1.08);
    c.fillStyle = bg; c.fillRect(0, 0, 128, 512); c.strokeStyle = fg; c.lineWidth = 6; c.strokeRect(8, 8, 112, 496);
    kana(c, w, 64 - size / 2, 256 - n * size * 0.54, size, size * 0.15, fg, { vertical: true });
  }));
  T.banner = Array.from({ length: 6 }, (_, i) => canvasTex(128, 384, (c) => {
    const [bg, fg] = CLOTH[i % CLOTH.length], w = WORDS[(i * 7 + 2) % WORDS.length].slice(0, 3), n = [...w].length;
    c.fillStyle = bg; c.fillRect(0, 0, 128, 384); c.fillStyle = fg; c.fillRect(0, 0, 128, 18); c.fillRect(0, 352, 128, 10);
    kana(c, w, 24, 192 - n * 46, 80, 13, fg, { vertical: true, pitch: 1.12 });
  }));
  T.noren = [0, 1, 2].map((i) => canvasTex(512, 128, (c) => {
    const [bg, fg] = CLOTH[[0, 1, 4][i]], w = ["ソバ　メシ", "サケ　タコ", "ラジオ　"][i];
    c.fillStyle = bg; c.fillRect(0, 0, 512, 128); [...w].slice(0, 5).forEach((ch, k) => kana(c, ch, 20 + k * 102, 26, 66, 11, fg)); c.fillStyle = INK; for (let k = 1; k < 5; k++) c.fillRect(k * 102.4 - 2, 30, 4, 98);
  }));
  T.cassettes = canvasTex(256, 256, (c) => { c.fillStyle = "#2a2230"; c.fillRect(0, 0, 256, 256); const cols = ["#e9e0c8", "#f07a22", "#5fe8d8", "#b3261e", "#ffc23c", "#3a426f"]; for (let y = 0; y < 8; y++) for (let x = 0; x < 12; x++) { c.fillStyle = cols[Math.floor(hash(x, y, 2) * cols.length)]; c.fillRect(6 + x * 21, 6 + y * 31, 17, 25); c.fillStyle = "rgba(0,0,0,0.45)"; c.fillRect(6 + x * 21, 22 + y * 31, 17, 4); } });
  T.menu = canvasTex(256, 256, (c) => { c.fillStyle = "#2a2230"; c.fillRect(0, 0, 256, 256); ["ソバ", "メシ", "サケ", "タコ", "ニク"].forEach((w, k) => { c.fillStyle = k === 2 ? "#ffc23c" : PAPER; c.fillRect(12 + k * 49, 14, 38, 228); kana(c, w, 15 + k * 49, 22, 32, 5, k === 3 ? "#b3261e" : INK, { vertical: true }); latin(c, String(40 + k * 15), 31 + k * 49, 226, 22, INK, { align: "center" }); }); });
  T.shutter = [0, 1].map((i) => canvasTex(256, 256, (c) => { c.fillStyle = i ? "#6c7a82" : "#8a7f6e"; c.fillRect(0, 0, 256, 256); c.fillStyle = "rgba(0,0,0,0.3)"; for (let y = 0; y < 256; y += 16) c.fillRect(0, y, 256, 4); kana(c, i ? "ヤミイチ" : "キケン", 20, 80, i ? 52 : 68, 9, i ? "#b3261e" : INK); latin(c, i ? "NO ENTRY" : "CLOSED", 128, 200, 30, INK, { align: "center" }); hazard(c, 0, 232, 256, 24, "#ffc21e", INK, 32); }));
  T.vend = [0, 1].map((i) => canvasTex(128, 256, (c) => { c.fillStyle = i ? "#f4f0d8" : "#5fe8d8"; c.fillRect(0, 0, 128, 256); c.fillStyle = i ? "#b3261e" : "#12303a"; c.fillRect(0, 0, 128, 46); kana(c, i ? "サケ" : "アメ", 26, 6, 34, 6, "#f4f0d8"); for (let y = 0; y < 3; y++) for (let x = 0; x < 4; x++) { c.fillStyle = ["#b3261e", "#ffc23c", "#3a426f", "#2a6a5e"][Math.floor(hash(x, y, i) * 4)]; c.fillRect(12 + x * 28, 60 + y * 48, 18, 32); } c.fillStyle = INK; c.fillRect(10, 212, 108, 30); }));
  T.pegboard = canvasTex(256, 256, (c) => { c.fillStyle = "#9a7a52"; c.fillRect(0, 0, 256, 256); c.strokeStyle = INK; c.lineCap = "round"; for (let k = 0; k < 9; k++) { const x = 28 + (k % 3) * 80, y = 30 + Math.floor(k / 3) * 80; c.lineWidth = 9; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 30 * Math.cos(k), y + 52); c.stroke(); c.lineWidth = 16; c.beginPath(); c.moveTo(x - 6, y); c.lineTo(x + 12, y + 8 * Math.sin(k)); c.stroke(); } });
  T.screens = [0, 1, 2, 3].map((i) => canvasTex(128, 96, (c) => { const [fg, bg] = NEON[[2, 0, 5, 1][i]]; c.fillStyle = bg; c.fillRect(0, 0, 128, 96); if (i === 0) kana(c, "テープ", 8, 24, 34, 6, fg); else if (i === 1) { c.fillStyle = fg; c.beginPath(); c.arc(64, 48, 26, 0, 7); c.fill(); c.fillStyle = bg; c.beginPath(); c.arc(64, 48, 11, 0, 7); c.fill(); } else if (i === 2) { c.fillStyle = fg; for (let k = 0; k < 9; k++) c.fillRect(8 + k * 13, 86 - (10 + ((k * 29) % 60)), 9, 10 + ((k * 29) % 60)); } else { latin(c, "144", 64, 66, 54, fg, { align: "center" }); } scanlines(c, 128, 96, 0.35, 4); }));
  T.gantry = [["ノクス マーケット", "DECK 4  //  OPEN 25H", 0], ["ヤミイチ", "NO DRONES BEYOND THIS POINT", 3], ["キケン", "DECK PLATE MISSING  >>  66-76", 0]].map(([w, sub, n]) => canvasTex(1024, 256, (c) => {
    const [fg, bg] = NEON[n], size = Math.min(150, 940 / ([...w].length * 1.08)); c.fillStyle = bg; c.fillRect(0, 0, 1024, 256); c.strokeStyle = fg; c.lineWidth = 8; c.strokeRect(12, 12, 1000, 232);
    kana(c, w, 512 - kanaWidth(w, size) / 2, 28, size, size * 0.15, fg); latin(c, sub, 512, 226, 34, fg, { align: "center" }); scanlines(c, 1024, 256, 0.3);
  }));
  // shoppers: flat figures in two tones, seen from behind; no faces, the way a background crowd is painted
  // each is two drawings: at the stall, and startled (arms thrown up, leaning away)
  // Each is drawn like a background character: an ink outline, a coat in two tones with the stall's warm light down the
  // side that faces it, hair with a shine, a collar or scarf, the nape of the neck, trousers and shoes, sometimes a
  // bag, a hat or a hood. Twice the size they are seen at, so the line stays a line.
  T.crowd = Array.from({ length: 8 }, (_, i) => [false, true].map((startled) => canvasTex(320, 512, (c) => {
    c.scale(2, 2); c.translate(16, 0); if (startled) { c.translate(64, 256); c.rotate(i % 2 ? 0.16 : -0.16); c.translate(-64, -256); }
    const r = rng(i * 91 + 7), coat = ["#5d7896", "#b45a48", "#8a8a5c", "#4a6f8c", "#c49a52", "#7a5a9a", "#6f9a86", "#d0623c"][i], shade = ["#3a4c66", "#7a3430", "#5a5a3c", "#2e4a62", "#8a6a34", "#4c3868", "#466a5c", "#8e3c26"][i], hair = ["#2a2434", "#4a2c22", "#5a4a58", "#1e1a28"][i % 4];
    const INK = "#17111f", hgt = 216 + r() * 34, top = 256 - hgt, cx = 64, sw = 25 + r() * 7, hem = top + hgt * (0.5 + r() * 0.22), lean = (r() - 0.5) * 6;
    c.lineJoin = "round"; c.lineCap = "round";
    const path = (pts) => { c.beginPath(); pts.forEach((p, k) => k ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); };
    const fill = (pts, col, ink = 2.2) => { path(pts); if (ink) { c.strokeStyle = INK; c.lineWidth = ink * 2; c.stroke(); } c.fillStyle = col; c.fill(); };
    const trousers = ["#3a3850", "#4a4038", "#2e3444", "#54463e"][i % 4];
    fill([[cx - 11, hem - 6], [cx - 12, 250], [cx - 2, 250], [cx - 1, hem - 6]], trousers); fill([[cx + 1, hem - 6], [cx + 3, 250], [cx + 13, 250], [cx + 11, hem - 6]], trousers);
    fill([[cx - 16, 255], [cx - 1, 255], [cx - 1, 248], [cx - 13, 248]], "#241c28"); fill([[cx + 2, 255], [cx + 17, 255], [cx + 14, 248], [cx + 2, 248]], "#241c28");
    const t0 = top + 30;
    fill([[cx - 5 + lean, t0 - 12], [cx + 5 + lean, t0 - 12], [cx + 6 + lean, t0], [cx - 6 + lean, t0]], "#c89a78");      // the nape
    const body = startled ? [[cx - 7 + lean, t0 - 4], [cx + 7 + lean, t0 - 4], [cx + sw, t0 + 8], [cx + sw - 4, hem], [cx - sw + 4, hem], [cx - sw, t0 + 8]]
      : [[cx - 7 + lean, t0 - 4], [cx + 7 + lean, t0 - 4], [cx + sw, t0 + 8], [cx + sw + 5, t0 + 70], [cx + sw - 3, t0 + 74], [cx + sw - 4, hem], [cx - sw + 4, hem], [cx - sw + 3, t0 + 74], [cx - sw - 5, t0 + 70], [cx - sw, t0 + 8]];
    if (startled) for (const sg of [1, -1]) { fill([[cx + sg * (sw - 9), t0 + 4], [cx + sg * sw, t0 + 16], [cx + sg * (sw + 24), t0 - 30], [cx + sg * (sw + 14), t0 - 38]], coat); fill([[cx + sg * (sw + 13), t0 - 36], [cx + sg * (sw + 25), t0 - 30], [cx + sg * (sw + 30), t0 - 46], [cx + sg * (sw + 19), t0 - 50]], "#c89a78"); }
    fill(body, coat);
    c.save(); path(body); c.clip();      // the coat's shade tone and the stall's light, inside its outline
    fill([[cx + 2, t0 - 6], [cx + sw + 8, t0], [cx + sw + 8, hem + 4], [cx + 9, hem + 4]], shade, 0);
    fill([[cx - sw - 6, t0], [cx - sw + 9, t0 + 4], [cx - sw + 12, hem + 2], [cx - sw - 6, hem + 2]], "#ffc47a", 0);
    c.strokeStyle = INK; c.lineWidth = 1.4; c.beginPath(); c.moveTo(cx + lean * 0.5, t0 + 6); c.lineTo(cx, hem - 8); c.stroke();      // the back seam
    c.restore();
    if (!startled) for (const sg of [1, -1]) { c.strokeStyle = INK; c.lineWidth = 1.4; c.beginPath(); c.moveTo(cx + sg * (sw - 7), t0 + 22); c.lineTo(cx + sg * (sw - 4), t0 + 70); c.stroke(); fill([[cx + sg * (sw - 2), t0 + 70], [cx + sg * (sw + 5), t0 + 70], [cx + sg * (sw + 4), t0 + 81], [cx + sg * (sw - 2), t0 + 80]], "#c89a78", 1.5); }      // sleeves and hands
    fill([[cx - 9 + lean, t0 - 5], [cx + 9 + lean, t0 - 5], [cx + 11 + lean, t0 + 2], [cx - 11 + lean, t0 + 2]], i % 2 ? "#e8dcc0" : shade, 1.6);      // collar or scarf
    c.beginPath(); c.ellipse(cx + lean, top + 14, 11, 14, 0, 0, 7); c.strokeStyle = INK; c.lineWidth = 4.4; c.stroke(); c.fillStyle = hair; c.fill();
    c.strokeStyle = "#8a7a96"; c.lineWidth = 2; c.beginPath(); c.arc(cx + lean, top + 14, 7, 3.6, 4.9); c.stroke();      // the shine on the hair
    if (i % 4 === 1) fill([[cx - 22 + lean, top + 8], [cx + 22 + lean, top + 8], [cx + 10 + lean, top - 1], [cx - 10 + lean, top - 1]], "#d8b04a");
    if (i % 4 === 2) { c.beginPath(); c.ellipse(cx + lean, top + 16, 15, 17, 0, 0, 7); c.strokeStyle = INK; c.lineWidth = 4.4; c.stroke(); c.fillStyle = coat; c.fill(); }
    if (i % 4 === 3) { c.beginPath(); c.arc(cx + lean, top + 2, 6, 0, 7); c.strokeStyle = INK; c.lineWidth = 4.4; c.stroke(); c.fillStyle = hair; c.fill(); }
    if (i % 3 === 0) fill(startled ? [[cx + sw + 18, t0 - 20], [cx + sw + 38, t0 - 12], [cx + sw + 30, t0 + 18], [cx + sw + 10, t0 + 10]] : [[cx + sw + 1, t0 + 62], [cx + sw + 19, t0 + 64], [cx + sw + 17, t0 + 96], [cx + sw - 1, t0 + 94]], "#e0b24a");
  })));
  return T;
}

export async function createMarket(renderer, o = {}) {
  const W = o.width ?? 1920, H = o.height ?? 1080;
  const U = { uLamp: { value: 1 }, uBlink: { value: 0 }, uAlarm: { value: 0 }, uAlarmAng: { value: 0 }, uFlood: { value: 1 }, uGap: { value: new THREE.Vector2(GAP.z0, GAP.z1) } };
  const kit = createKit(CHUNK, U), { mat } = kit, T = textures(), sh = kit.shared;
  sh.uFogCol.value.setRGB(0.42, 0.2, 0.17); sh.uFogTop.value.setRGB(0.04, 0.15, 0.19); sh.uFogDeep.value.setRGB(0.14, 0.55, 0.54); sh.uFogH.value.set(2.5, 9); sh.uFogK.value = 0.017;
  sh.uTintLit.value.setRGB(1.3, 1.02, 0.7); sh.uTintMid.value.setRGB(0.78, 0.56, 0.6); sh.uTintShade.value.setRGB(0.24, 0.4, 0.5); sh.uRim.value.setRGB(1.0, 0.7, 0.35);
  sh.uKey.value.set(0.1, 0.8, -0.5).normalize();
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(50, W / H, 0.08, 500), G = { screens: { value: 1 } };
  const b = kit.builder(), people = [], steamAt = [];
  const wood = mat("#9a6a44"), steel = mat("#7d8790"), darkm = mat("#2c2a36"), paper = mat(PAPER), red = mat("#b3261e"), tealm = mat("#3a7a78"), rust = mat("#9a4a2a"), crate = mat("#a8854e", { seam: [0.4, 0.2], seamMode: 2 });
  const bulb = mat("#ffe2a0", { kind: 1, flag: 5 }), lanternR = mat("#ff4a26", { kind: 1, flag: 4 }), lanternA = mat("#ffb23c", { kind: 1, flag: 4 });
  const neon = (i) => mat("#fff", { kind: 2, map: T.fascia[i % T.fascia.length], gain: G.screens }), bladeM = (i) => mat("#fff", { kind: 2, map: T.blade[i % T.blade.length], gain: G.screens });
  const facadeCols = ["#8d8f9a", "#a0907e", "#7d8c8c", "#96887a", "#84808e"];

  // ---- the deck, and the shaft where it is missing ------------------------------------------------------------------
  const deckM = mat("#8f8a86", { seam: [1.7, 2], seamMode: 2 });
  for (const [a, c] of [[Z0, GAP.z0], [GAP.z1, Z1]]) { b.quad([0, 0, (a + c) / 2], [1, 0, 0], [0, 0, -1], WX * 2, c - a, deckM); b.box(0.12, 0.012, c - a, 0, 0.006, (a + c) / 2, mat("#d9c9a0")); for (const s of [1, -1]) b.box(0.3, 0.014, c - a, s * 2.75, 0.007, (a + c) / 2, mat("#c9a23a")); }
  for (const s of [1, -1]) { b.box(3.0, 0.16, Z1 - Z0, s * 4.95, 0.08, (Z0 + Z1) / 2, mat("#7a7470", { seam: [1, 1], seamMode: 2 })); b.box(0.14, 0.18, Z1 - Z0, s * 3.43, 0.09, (Z0 + Z1) / 2, mat("#5a5660")); }
  {
    const zc = (GAP.z0 + GAP.z1) / 2, len = GAP.z1 - GAP.z0, wallM = mat("#7d8c8c", { seam: [1.75, 1.4], seamMode: 2 });
    for (const s of [1, -1]) { b.quad([s * WX, -20, zc], [0, 0, s], [0, 1, 0], len, 40, wallM); for (let k = 0; k < 9; k++) { const y = -3 - k * 4.2, z = GAP.z0 + 1.2 + hash(k, s, 1) * (len - 2.4); b.quad([s * (WX - 0.02), y, z], [0, 0, s], [0, 1, 0], 1.3, 0.9, mat(hash(k, s) > 0.5 ? "#ffd08a" : "#5fe8d8", { kind: 1, flag: 5 })); b.box(0.3, 0.1, 1.6, s * (WX - 0.15), y - 0.55, z, steel); } }
    for (const [z, n] of [[GAP.z0, 1], [GAP.z1, -1]]) {
      b.quad([0, -20.3, z], [n, 0, 0], [0, 1, 0], WX * 2, 39.4, wallM); b.box(WX * 2, 0.6, 0.5, 0, -0.3, z - n * 0.25, mat("#4a4650"));
      // torn edge: girders and plate sticking out over the drop
      for (let k = 0; k < 7; k++) { const x = -3 + k, L = 0.5 + hash(k, n, 4) * 1.4; b.box(0.16, 0.22, L, x, -0.14, z + n * L / 2, rust, { rx: n * (0.05 + hash(k, n) * 0.3) }); if (k % 2) b.box(0.9, 0.05, L * 0.7, x + 0.4, -0.02, z + n * L * 0.35, deckM, { rx: n * 0.12 * (k - 3) * 0.3 }); }
      b.box(WX * 2, 0.04, 0.5, 0, 0.022, z - n * 0.6, mat("#ffc21e")); b.box(WX * 2, 0.045, 0.12, 0, 0.022, z - n * 0.6, mat(INK));
    }
    for (let k = 0; k < 6; k++) { const y = -4 - k * 5.5, z = GAP.z0 + 0.8 + hash(k, 8) * (len - 1.6); b.cyl(0.22 + hash(k, 3) * 0.2, WX * 2, 0, y, z, k % 2 ? rust : tealm, "x", 10); b.box(WX * 2, 0.12, 0.7, 0, y - 2, z + (hash(k, 2) - 0.5) * 3, steel); }
    b.quad([0, -40, zc], [1, 0, 0], [0, 0, -1], WX * 2, len, mat("#000", { kind: 3 }));
    // the ramp: a deck plate buckled upward on the near side, and knocked-over barriers
    b.box(4.4, 0.1, 3.75, 0, 0.42, GAP.z0 - 1.8, mat("#9a948e", { seam: [1.1, 1.2], seamMode: 2 }), { rx: -0.232 });
    b.slab([[-(GAP.z0 - 3.6), 0], [-GAP.z0, 0.8], [-GAP.z0, 0]], 4.3, -2.15, 0, 0, mat("#5a5660"), { ry: Math.PI / 2 });
    // light coming up the shaft, and sheets of mist lying across it at three depths: each hides more of what is under it
    for (const [x, z, w, r] of [[0.6, zc + 1, 2.6, 0.3], [-1.6, zc - 2.5, 1.5, -0.5], [1.9, zc + 3.2, 1.1, 0.9]]) b.quad([x, -18, z], [-1, 0, r], [0, 1, 0], w, 36, mat("#3fd8c8", { kind: 7, alpha: 0.09, additive: true, fog: 0.2 }));
    for (const y of [-9, -18, -28]) b.quad([0, y, zc], [1, 0, 0], [0, 0, -1], WX * 2, len, mat("#8fe6dc", { kind: 7, alpha: 0.16, fog: 0 }));
    b.quad([0, -39.5, zc], [1, 0, 0], [0, 0, -1], WX * 2, len, mat("#9ffff0", { kind: 7, alpha: 0.35, additive: true, fog: 0 }));
    b.box(0.2, 0.84, 0.2, -2.0, 0.42, GAP.z0 - 0.15, rust); b.box(0.2, 0.84, 0.2, 2.0, 0.42, GAP.z0 - 0.15, rust); b.box(4.4, 0.16, 0.16, 0, 0.74, GAP.z0 - 0.1, mat("#ffc21e"));
    for (const [x, z, r] of [[-2.9, GAP.z0 - 3.4, 0.5], [2.95, GAP.z0 - 2.2, -0.9], [2.7, GAP.z1 + 1.6, 0.3], [-2.8, GAP.z1 + 2.4, -0.4]]) { b.box(1.3, 0.5, 0.08, x, 0.55, z, mat("#ffc21e"), { ry: r }); b.box(1.32, 0.16, 0.09, x, 0.55, z, mat(INK), { ry: r }); b.box(0.08, 0.8, 0.3, x - 0.5 * Math.cos(r), 0.4, z + 0.5 * Math.sin(r), darkm, { ry: r }); b.box(0.08, 0.8, 0.3, x + 0.5 * Math.cos(r), 0.4, z - 0.5 * Math.sin(r), darkm, { ry: r }); }
  }
  // ---- stalls ---------------------------------------------------------------------------------------------------------
  const KINDS = ["noodle", "tapes", "produce", "parts", "shut", "noodle", "tapes", "produce"];
  function stall(s, k) {
    const z0 = k * 4, zc = z0 + 2, r = rng(k * 131 + (s > 0 ? 7 : 19)), near = zc > GAP.z0 - 3 && zc < GAP.z1 + 3, v = near ? "shut" : KINDS[Math.floor(r() * KINDS.length)], n = Math.floor(r() * 100), u = [0, 0, s], up = [0, 1, 0];
    for (const z of [z0 + 0.08, z0 + 3.92]) b.box(0.14, 3.2, 0.14, s * 3.55, 1.6, z, mat("#4a4650"));
    b.box(0.34, 0.5, 4, s * 3.62, 3.06, zc, darkm); b.quad([s * 3.44, 3.06, zc], u, up, 3.5, 0.42, mat("#fff", { kind: 2, map: T.fascia[n % T.fascia.length], gain: G.screens, flag: 0 }));
    b.quad([s * 6.2, 1.6, zc], u, up, 4, 3.2, mat(["#8a6a5a", "#6a7a7a", "#8a7a5a"][n % 3], { seam: [1, 0.8] }), true);
    b.box(0.1, 3.2, 2.7, s * 4.85, 1.6, z0 + 0.02, mat("#6a625e"), { ry: Math.PI / 2 });
    for (const dz of [1, 3]) { b.cyl(0.012, 0.5, s * 4.3, 2.75, z0 + dz, darkm, "y", 4); b.ball(0.08, s * 4.3, 2.46, z0 + dz, bulb); }
    if (v !== "shut") {
      // awning: striped cloth out over the walkway, a valance on its edge
      const a = T.stripes[(n >> 1) % T.stripes.length], am = mat("#fff", { kind: 10, map: a });
      b.quad([s * 2.85, 2.68, zc], [0, 0, 1], [s * 1.3, 0.5, 0], 3.8, 1.42, am); b.quad([s * 2.19, 2.3, zc], [0, 0, 1], [0, 1, 0], 3.8, 0.26, am);
      for (const z of [z0 + 0.2, z0 + 3.8]) b.cyl(0.018, 1.45, s * 2.85, 2.66, z, darkm, "x", 5, 0.018, { rz: s * 0.367 });
    }
    if (v === "noodle") {
      b.box(0.7, 1.0, 3.3, s * 4.0, 0.66, zc, wood); b.box(0.86, 0.06, 3.4, s * 3.96, 1.19, zc, mat("#c9a878"));
      for (let i = 0; i < 3; i++) { b.cyl(0.035, 0.55, s * 3.05, 0.28, z0 + 0.9 + i * 1.1, darkm, "y", 6); b.cyl(0.19, 0.07, s * 3.05, 0.59, z0 + 0.9 + i * 1.1, red, "y", 12); }
      b.quad([s * 3.47, 2.52, zc], u, up, 3.4, 0.62, mat("#fff", { kind: 10, map: T.noren[n % 3] }));
      b.cyl(0.3, 0.42, s * 4.7, 1.43, z0 + 1.1, steel, "y", 14); b.cyl(0.33, 0.05, s * 4.7, 1.66, z0 + 1.1, darkm, "y", 14); steamAt.push([s * 4.7, 1.75, z0 + 1.1]);
      b.box(0.6, 0.06, 3.4, s * 5.85, 1.7, zc, wood); for (let i = 0; i < 9; i++) b.box(0.1, 0.24 + 0.1 * hash(i, k), 0.1, s * 5.85, 1.87, z0 + 0.5 + i * 0.36, mat(["#2a6a5e", "#b3261e", "#c9a23a", "#e9e0c8"][i % 4]));
      b.quad([s * 6.18, 2.5, zc + 0.6], u, up, 1.5, 1.1, mat("#fff", { kind: 10, map: T.menu }));
      for (let i = 0; i < 4; i++) b.cyl(0.09, 0.07, s * 3.95, 1.26, z0 + 0.7 + i * 0.85, paper, "y", 10);
    } else if (v === "tapes") {
      b.box(1.0, 0.8, 3.4, s * 4.2, 0.56, zc, mat("#5a5660")); b.quad([s * 6.18, 2.05, zc], u, up, 3.6, 1.9, mat("#fff", { kind: 10, map: T.cassettes }));
      for (let i = 0; i < 5; i++) { const x = s * (4.1 + (i % 2) * 0.5), y = 1.3 + Math.floor(i / 2) * 0.62, z = z0 + 0.7 + (i % 3) * 1.25; b.box(0.7, 0.58, 0.74, x, y, z, mat(i % 2 ? "#b9b095" : "#4a4650")); b.quad([x - s * 0.36, y, z], u, up, 0.56, 0.42, mat("#fff", { kind: 2, map: T.screens[(n + i) % 4], gain: G.screens })); }
      for (let i = 0; i < 3; i++) { b.box(0.6, 0.3, 0.8, s * 3.75, 0.3, z0 + 0.6 + i * 1.3, crate); for (let j = 0; j < 4; j++) b.box(0.4, 0.12, 0.12, s * 3.75, 0.5, z0 + 0.35 + i * 1.3 + j * 0.17, mat(["#f07a22", "#5fe8d8", "#e9e0c8", "#b3261e"][(i + j) % 4])); }
      b.cyl(0.02, 3.6, s * 3.9, 2.84, zc, darkm, "z", 5); for (let i = 0; i < 5; i++) b.box(0.02, 0.5 + 0.3 * hash(i, k, 2), 0.02, s * 3.9, 2.55, z0 + 0.5 + i * 0.75, darkm);
    } else if (v === "produce") {
      b.box(1.5, 0.08, 3.4, s * 4.3, 0.95, zc, wood, { rz: s * 0.3 }); b.box(0.1, 0.9, 3.3, s * 4.85, 0.6, zc, wood); b.box(0.1, 0.55, 3.3, s * 3.75, 0.42, zc, wood);
      const fr = ["#f08a22", "#c9261e", "#8dbb3a", "#f2d24a", "#7a3a8a"];
      for (let i = 0; i < 5; i++) for (let j = 0; j < 9; j++) b.ball(0.11, s * (3.75 + i * 0.26), 0.84 + i * 0.082, z0 + 0.55 + j * 0.36 + (i % 2) * 0.1, mat(fr[(Math.floor(j / 3) + i + n) % fr.length]), null, 8);
      for (let i = 0; i < 3; i++) b.box(0.6, 0.4, 0.5, s * 5.6, 0.36 + i * 0.4, z0 + 0.7 + (i % 2) * 0.1, crate);
      b.box(0.5, 0.36, 0.04, s * 3.62, 1.5, z0 + 3.4, paper, { ry: 0.3 }); b.cyl(0.012, 1.0, s * 4.4, 2.4, z0 + 2.6, darkm, "y", 4); b.cyl(0.2, 0.04, s * 4.4, 1.9, z0 + 2.6, steel, "y", 12);
    } else if (v === "parts") {
      b.quad([s * 6.18, 1.9, zc], u, up, 3.6, 2.0, mat("#fff", { kind: 10, map: T.pegboard }));
      for (let i = 0; i < 3; i++) { b.cyl(0.3, 0.9, s * (3.95 + (i % 2) * 0.62), 0.6, z0 + 0.6 + i * 0.5, i === 1 ? tealm : rust, "y", 12); }
      b.box(0.9, 0.9, 1.7, s * 4.6, 0.6, z0 + 2.8, mat("#5a5660")); b.box(1.0, 0.06, 1.8, s * 4.6, 1.08, z0 + 2.8, steel);
      // a dead chaser on the bench, and its blades for sale on hooks
      b.cyl(0.19, 0.12, s * 4.5, 1.2, z0 + 2.9, mat("#14152b"), "y", 12); b.ball(0.1, s * 4.5, 1.27, z0 + 2.9, mat("#5a1410"));
      for (let i = 0; i < 4; i++) { b.box(0.02, 0.5, 0.13, s * 3.75, 2.3, z0 + 0.8 + i * 0.5, mat("#2a2f55"), { rx: 0.2 * (i - 1.5) }); b.box(0.022, 0.14, 0.135, s * 3.75, 2.08, z0 + 0.8 + i * 0.5 + 0.04 * (i - 1.5), mat("#f07a22")); }
      b.box(0.5, 0.7, 0.5, s * 3.85, 0.5, z0 + 3.5, crate);
    } else {
      b.quad([s * 3.7, 1.52, zc], u, up, 3.8, 2.76, mat("#fff", { kind: 10, map: T.shutter[n % 2] }));
      if (!near) for (let i = 0; i < 2; i++) { b.box(0.7, 1.9, 0.9, s * 3.25, 1.1, z0 + 0.7 + i * 1.0, mat(i ? "#b3261e" : "#2a6a5e")); b.quad([s * 2.89, 1.2, z0 + 0.7 + i * 1.0], u, up, 0.74, 1.5, mat("#fff", { kind: 2, map: T.vend[(n + i) % 2], gain: G.screens })); }
      for (let i = 0; i < 3; i++) b.box(0.55, 0.42, 0.6, s * 3.2, 0.36 + (i === 2 ? 0.42 : 0), z0 + 2.9 + (i === 1 ? 0.62 : 0.05), crate);
    }
    // shoppers
    if (v !== "shut") { const cnt = 1 + Math.floor(r() * 3); for (let i = 0; i < cnt; i++) { const x = s * (2.6 + r() * 0.6), z = z0 + 0.5 + r() * 3; people.push({ x, z, hgt: 1.5 + r() * 0.25, who: Math.floor(r() * T.crowd.length), turn: (r() - 0.5) * 0.5, seed: Math.floor(r() * 97) }); } }
    // street clutter at the kerb
    if (r() > 0.55) { const z = z0 + r() * 4; b.box(0.5, 0.5, 0.5, s * 2.95, 0.25, z, crate, { ry: r() }); if (r() > 0.5) b.box(0.4, 0.36, 0.4, s * 2.95, 0.68, z, crate, { ry: r() }); }
    if (r() > 0.7) { const z = z0 + r() * 4; b.box(0.5, 0.9, 0.05, s * 2.7, 0.45, z, paper, { rx: 0.25 }); b.box(0.5, 0.9, 0.05, s * 2.7, 0.45, z + 0.3, darkm, { rx: -0.25 }); }
    if (r() > 0.8) { const z = z0 + r() * 4; b.cyl(0.07, 0.2, s * 2.6, 0.05, z, steel, "y", 8); steamAt.push([s * 2.6, 0.15, z]); }
  }
  // ---- the housing stacks above the stalls ------------------------------------------------------------------------------
  function facade(s, k) {
    const z0 = k * 4, zc = z0 + 2, r = rng(k * 71 + (s > 0 ? 3 : 11)), base = facadeCols[Math.floor(r() * facadeCols.length)], u = [0, 0, s], up = [0, 1, 0], X = s * 3.62, set = r() > 0.75 ? 0.5 : 0;
    b.quad([X + s * set, 9.3, zc], u, up, 4, 12, mat(base, { seam: [2, 1.4] }), true);
    if (set) { b.quad([X + s * set / 2, 9.3, z0], [s, 0, 0], up, set, 12, mat(base)); b.quad([X + s * set / 2, 9.3, z0 + 4], [s, 0, 0], up, set, 12, mat(base)); }
    b.box(0.2, 0.2, 4, X - s * 0.02, 3.4, zc, mat("#4a4650"));
    for (let f = 0; f < 4; f++) {
      const y = 4.9 + f * 2.8;
      for (const dz of [1, 3]) {
        const h = r(); b.box(0.1, 1.5, 1.2, X + s * (set - 0.03), y, z0 + dz, mat("#4a4650"));
        b.quad([X + s * (set - 0.085), y, z0 + dz], u, up, 1.0, 1.3, h > 0.62 ? mat("#ffd08a", { kind: 1, flag: 5 }) : h > 0.47 ? mat("#5fe8d8", { kind: 1, flag: 5 }) : mat("#1a2a34"));
        b.box(0.12, 0.06, 1.3, X + s * (set - 0.1), y, z0 + dz, mat("#4a4650")); if (h > 0.62 && r() > 0.5) b.quad([X + s * (set - 0.09), y - 0.3, z0 + dz], u, up, 1.0, 0.7, mat(["#b3261e", "#2a6a5e", "#c9a23a"][f % 3]));
      }
      if (r() > 0.6) { b.box(0.9, 0.1, 3.4, X - s * (0.45 - set), y - 1.0, zc, mat("#5a5660")); for (let i = 0; i < 8; i++) b.box(0.04, 0.8, 0.04, X - s * (0.88 - set), y - 0.6, z0 + 0.4 + i * 0.46, darkm); b.box(0.05, 0.05, 3.4, X - s * (0.88 - set), y - 0.2, zc, darkm); if (r() > 0.4) b.box(0.5, 0.5, 0.7, X - s * (0.4 - set), y - 0.7, z0 + 0.8 + r() * 2, mat("#b9b095")); }
      else if (r() > 0.6) { b.box(0.5, 0.5, 0.8, X - s * (0.28 - set), y - 0.9, z0 + 1 + r() * 2, mat("#b9b095")); }
    }
    b.cyl(0.09, 12, X - s * (0.12 - set), 9.3, z0 + 0.05, r() > 0.5 ? rust : tealm, "y", 8);
    // blade signs out over the street, one or two a module, at any height
    const nb = r() > 0.35 ? (r() > 0.6 ? 2 : 1) : 0;
    for (let i = 0; i < nb; i++) {
      const y = 4.6 + r() * 5.5, hgt = 1.8 + r() * 1.4, wd = hgt * 0.26, out = 0.5 + r() * 0.9, z = z0 + 0.6 + r() * 2.8, x = X - s * (out + wd / 2 - set), m = bladeM(Math.floor(r() * 10)), lit = mat("#fff", { kind: 2, map: m.uniforms.uMap.value, gain: G.screens });
      b.box(wd + 0.1, hgt + 0.1, 0.16, x, y, z, darkm); b.box(out, 0.06, 0.06, X - s * (out / 2 - set), y + hgt * 0.3, z, darkm); b.box(out, 0.06, 0.06, X - s * (out / 2 - set), y - hgt * 0.3, z, darkm);
      b.quad([x, y, z - 0.085], [-1, 0, 0], up, wd, hgt, r() > 0.4 ? mat("#fff", { kind: 2, map: m.uniforms.uMap.value, flag: 0, gain: G.screens }) : lit); b.quad([x, y, z + 0.085], [1, 0, 0], up, wd, hgt, lit);
    }
    if (r() > 0.7) { const y = 5 + r() * 4; b.box(0.14, 0.7, 2.6, X - s * (0.09 - set), y, zc, darkm); b.quad([X - s * (0.17 - set), y, zc], u, up, 2.4, 0.5, neon(Math.floor(r() * 10))); }
  }
  for (let k = Math.floor(Z0 / 4); k < Z1 / 4; k++) for (const s of [1, -1]) { stall(s, k); facade(s, k); }
  // ---- what hangs across the street ----------------------------------------------------------------------------------------
  for (let k = Math.floor(Z0 / 4); k < Z1 / 4; k++) {
    const z = k * 4 + 2, r = rng(k * 53 + 1), over = z > GAP.z0 - 1 && z < GAP.z1 + 1;
    // a lantern string with a sag
    const N = 6, sag = (x) => 4.55 - 0.35 * (1 - (x / 3.6) ** 2);
    if (!over) for (let i = 0; i < 12; i++) { const x0 = -3.6 + i * 0.6, x1 = x0 + 0.6; b.box(0.61, 0.018, 0.018, (x0 + x1) / 2, (sag(x0) + sag(x1)) / 2, z, darkm, { rz: Math.atan2(sag(x1) - sag(x0), 0.6) }); }
    if (!over) for (let i = 0; i < N; i++) { const x = -2.75 + i * 1.1, y = sag(x) - 0.3, m = (k + i) % 3 === 0 ? lanternA : lanternR; b.ball(0.2, x, y, z, m, { s: [1, m === lanternA ? 1.35 : 0.85, 1] }, 10); b.cyl(0.09, 0.05, x, y + (m === lanternA ? 0.27 : 0.17), z, darkm, "y", 8); b.cyl(0.09, 0.05, x, y - (m === lanternA ? 0.27 : 0.17), z, darkm, "y", 8); }
    if (k % 3 === 1 && !over) for (let i = 0; i < 3; i++) { const x = -2.2 + i * 2.2 + (r() - 0.5) * 0.6, top = 6.6 + r() * 0.5; b.quad([x, top - 1.05, z + 0.4], [-1, 0, 0], [0, 1, 0], 0.7, 2.1, mat("#fff", { kind: 10, map: T.banner[Math.floor(r() * 6)] })); b.box(0.8, 0.04, 0.04, x, top, z + 0.4, darkm); b.box(7.4, 0.02, 0.02, 0, top + 0.02, z + 0.4, darkm); }
    if (k % 4 === 2) { const y = 8.3 + r(); b.box(7.4, 0.015, 0.015, 0, y, z - 0.7, darkm); for (let i = 0; i < 7; i++) if (r() > 0.3) b.quad([-2.7 + i * 0.9, y - 0.3, z - 0.7], [-1, 0, 0], [0, 1, 0], 0.5 + r() * 0.3, 0.6, mat(["#e9e0c8", "#b3261e", "#3a7a78", "#c9a23a", "#8d8f9a"][Math.floor(r() * 5)], { noInk: false })); }
    if (((k % 4) + 4) % 4 === 0) {       // a gantry every 16 m: a beam, floodlights, a beacon
      b.box(7.4, 0.7, 0.5, 0, 10.6, z - 2, mat("#3a3640")); b.box(7.4, 0.12, 0.9, 0, 10.2, z - 2, mat("#4a4650"));
      for (let i = 0; i < 6; i++) b.box(0.08, 1.0, 0.08, -3 + i * 1.2, 10.9, z - 2, darkm, { rz: i % 2 ? 0.6 : -0.6 });
      for (const x of [-2, 2]) { b.box(0.5, 0.3, 0.4, x, 10.0, z - 2, darkm); b.quad([x, 9.84, z - 2], [1, 0, 0], [0, 0, 1], 0.4, 0.3, mat("#dffcff", { kind: 1, flag: 2 })); }
      b.box(0.24, 0.24, 0.24, 0, 10.0, z - 2.3, darkm); b.box(0.16, 0.16, 0.1, 0, 10.0, z - 2.45, mat("#ff3030", { kind: 1, flag: 3 }));
    }
  }
  [[14, 0], [38, 1], [58, 2], [94, 0]].forEach(([z, i]) => {      // big signs across the street
    b.box(6.0, 1.6, 0.3, 0, 6.9, z, darkm); b.quad([0, 6.9, z - 0.16], [-1, 0, 0], [0, 1, 0], 5.7, 1.42, mat("#fff", { kind: 2, map: T.gantry[i], gain: G.screens }));
    for (const x of [-2.6, 2.6]) b.cyl(0.03, 3.0, x, 9.1, z, darkm, "y", 5);
    if (i === 2) { hazardBar(b, mat, 0, 5.95, z - 0.16); }
  });
  function hazardBar(bb, mt, x, y, z) { for (let i = 0; i < 12; i++) bb.box(0.24, 0.2, 0.05, x - 2.76 + i * 0.5, y, z, mt(i % 2 ? INK : "#ffc21e")); }
  // roof and the far end
  b.quad([0, 15.4, (Z0 + Z1) / 2], [1, 0, 0], [0, 0, 1], 7.3, Z1 - Z0, mat("#1c2a30"));
  for (let z = Z0 + 4; z < Z1; z += 8) b.quad([0, 15.36, z], [1, 0, 0], [0, 0, 1], 2.2, 3.4, mat("#3fb8b0", { kind: 1, fog: 0.4 }));
  b.quad([0, 7.7, Z1], [-1, 0, 0], [0, 1, 0], 7.3, 15.4, mat("#6a4a44")); b.add(new THREE.RingGeometry(1.9, 2.5, 40), mat("#ffb23c", { kind: 1, fog: 0.3 }), new THREE.Matrix4().makeTranslation(0, 6, Z1 - 0.1).multiply(new THREE.Matrix4().makeRotationY(Math.PI)));
  b.quad([0, 7.7, Z0], [1, 0, 0], [0, 1, 0], 7.3, 15.4, mat("#6a4a44"));
  const world = b.build(), crowd = new THREE.Group(); scene.add(world); scene.add(crowd);
  // ---- the shoppers: flat figures, each its own cel so that it can be held, shifted and swapped ----------------------------------
  const cardG = new THREE.PlaneGeometry(1, 1), cardM = T.crowd.map((pair) => pair.map((map) => mat("#fff", { kind: 10, flag: 1, map, noInk: true })));
  for (const p of people) { p.mesh = new THREE.Mesh(cardG, cardM[p.who][0]); p.mesh.layers.set(FX); p.mesh.frustumCulled = false; crowd.add(p.mesh); }
  // ---- steam: flat puffs on twos ---------------------------------------------------------------------------------------------
  // a puff is painted like a cel of smoke: a hard-edged cluster in a shade tone with its lit tone laid over, up and to one side
  const puffT = canvasTex(256, 256, (c) => { const blob = (col, k, dx, dy) => { c.fillStyle = col; for (let i = 0; i < 7; i++) { c.beginPath(); c.arc(128 + dx + Math.cos(i * 0.9) * 52 * (i ? 1 : 0), 128 + dy + Math.sin(i * 0.9) * 46 * (i ? 1 : 0), (i ? 44 + (i * 37 % 22) : 70) * k, 0, 7); c.fill(); } }; blob("#8e6c6e", 1, 0, 0); blob("#c4aa96", 0.8, -9, -13); c.globalCompositeOperation = "destination-out"; c.fillStyle = "#000"; for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(128 + Math.cos(i * 1.9 + 0.6) * 96, 128 + Math.sin(i * 1.9 + 0.6) * 92, 15 + (i * 7) % 9, 0, 7); c.fill(); } c.globalCompositeOperation = "source-over"; });      // two tones that stay under the bloom (steam is lit, not a lamp), bites out of the rim
  const puffG = new THREE.PlaneGeometry(1, 1), puffM = mat("#ffffff", { kind: 7, flag: 2, map: puffT, alpha: 0.92, fog: 0.6 }), puffs = [];
  for (let k = 0; k < 4; k++) steamAt.push([-2.4 + k * 1.6, -1.5, GAP.z0 + 1.5 + (k * 2.7) % 7]);      // the shaft breathes
  for (let i = 0; i < 72; i++) { const m = new THREE.Mesh(puffG, puffM); m.layers.set(FX); m.renderOrder = 9; m.frustumCulled = false; scene.add(m); puffs.push(m); }
  const drones = createDrones(kit, scene), markers = createMarkers(scene), shadows = createShadows(kit, scene, "#2a1420");

  function update(cam, frame, sync, opt = {}) {
    const w = driveAll(sync, WIRING, frame, opt.wiring), t = frame / sync.fps, alert = opt.alert ?? 0;
    aim(camera, cam, W / H); sh.uCam.value.copy(camera.position); sh.uFrame.value = frame;
    U.uLamp.value = clamp(w.lamps, 0, 1.3); U.uBlink.value = w.blink; U.uFlood.value = w.floods; U.uAlarm.value = clamp(alert * 0.8 + w.klaxon * (alert > 0 ? 1 : 0.6), 0, 1.2); U.uAlarmAng.value = t * 5.2; G.screens.value = w.screens;
    // the shoppers, on twos: a slow shift of weight; those the rider is about to reach (or has just passed) are on
    // their startled drawing, jumped back toward the stalls, with a hop as it happens
    const f2 = Math.floor(frame / 2), flee = opt.crowd?.flee;
    crowd.visible = (opt.crowd ?? true) !== false;
    for (const p of people) {
      const ahead = flee ? p.z - flee[1] : 1e9, scared = ahead > -2 && ahead < 10, fresh = scared ? Math.max(0, 1 - (10 - ahead) / 2.5) : 0, sway = Math.floor((f2 + p.seed) / 6) % 2, sx = Math.sign(p.x);
      p.mesh.material = cardM[p.who][scared ? 1 : 0];
      p.mesh.position.set(p.x + (scared ? sx * 0.45 : 0) + (sway ? 0.02 : 0), p.hgt / 2 + (Math.abs(p.x) > 3.45 ? 0.16 : 0) + (scared ? 0.16 * fresh + 0.02 * ((f2 + p.seed) % 2) : 0), p.z);
      p.mesh.rotation.set(0, Math.PI + p.turn, (sway ? 0.02 : -0.02) + (scared ? -sx * 0.1 : 0)); p.mesh.scale.set(p.hgt * 0.625, p.hgt, 1);
    }
    // the nearest emitters ahead of the camera get the puffs
    const amt = (opt.steam ?? 1), near = steamAt.filter((p) => p[2] > cam.pos[2] - 6 && p[2] < cam.pos[2] + 70).slice(0, 12); let n = 0;
    near.forEach((p, e) => { for (let j = 0; j < 6; j++) { const m = puffs[n++], sd = hash(p[0], p[2], j), age = ((f2 * 0.045 + j / 6 + sd) % 1 + 1) % 1, born = f2 - Math.floor(age / 0.045), big = 1 + 0.5 * hash(born, e, j), shaft = p[1] < 0 ? 1.8 : 1;
      m.visible = amt > 0 && Math.hypot(p[0] - cam.pos[0], p[2] - cam.pos[2]) > 6.5;      // none in the camera's lap: one puff would fill a third of the frame m.position.set(p[0] + Math.sin(sd * 40 + age * 3) * 0.3 * age - Math.sign(p[0]) * age * 0.5 * (2 - shaft), p[1] + age * 2.9 * shaft, p[2] + (sd - 0.5) * 0.5 + age * 0.4);
      m.quaternion.copy(camera.quaternion); m.rotateZ(sd * 6.28 + born); m.scale.setScalar((0.35 + age * 0.85) * big * shaft * (0.6 + 0.3 * amt + 0.3 * w.steam) * (age > 0.75 ? (1 - age) / 0.25 : 1)); } });
    for (; n < puffs.length; n++) puffs[n].visible = false;
    drones.update(opt.drones ?? [], frame, sync, camera, { thrust: w.thrust });
    markers.update(opt.markers); shadows.update(opt.shadows);
    return { scene, camera, wires: w, clear: opt.clear ?? 0x3a2622, post: { inkColor: [0.1, 0.05, 0.1], shadowTint: [0.0, 0.02, 0.03], ...opt.post } };
  }
  // The light on a figure at p: amber under a lantern row (one every 4 m), dusk rose between; the lanterns rim it.
  function light(p) {
    const lit = Math.abs(((p[2] / 4) % 1 + 1) % 1 - 0.5) * 4 < 1.1 * U.uLamp.value + 0.3;
    return { tint: lit ? [1.1, 0.99, 0.84] : [0.86, 0.74, 0.76], rim: lit ? [1.0, 0.8, 0.45] : [0.95, 0.5, 0.3], from: [0, 1, 0.4], fogK: sh.uFogK.value * 0.7, fogColor: sh.uFogCol.value.toArray(), gradient: 0.18 };
  }
  return { name: "market", scene, camera, kit, update, light, floorAt, WIRING, GAP, Z0, Z1 };
}
