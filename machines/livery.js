// The paint of the station's machines, drawn: what a 1990s mecha's surfaces carry. Flat colours and ink only: panel
// lines, rivets, vent slots, hatch covers, a cel's two tones of sheen across a plate, hazard bands, stencilled codes
// and katakana (sets/sign.js, the station's own hand; every word is one the film already shows elsewhere), and what
// has happened to it since: scrapes down to the metal, soot in hard shapes, cuts that are still hot.
// TILES repeat (4 m to a tile, laid on by a piece's own box: sets/kit.js kind 12); DECALS are one-offs with alpha.
//   const L = liveries();   L.enf, L.navy, L.gun, L.scorch, L.rust, L.black (tiles); L.hazard, L.band (strips, by uv);
//   L.code(text), L.word(kana), L.door, L.soot(seed), L.slice, L.crt(n), L.star (decals and screens)
import { canvasTex, rng } from "../sets/kit.js";
import { kana, latin, kanaWidth, hazard, chevrons, scanlines } from "../sets/sign.js";

const INK = "#1a1838", S = 1024;
const poly = (c, pts, fill) => { c.fillStyle = fill; c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); c.fill(); };
// a blot with a hard, pointed edge (soot, a scrape): n points round (x, y)
const blot = (c, r, x, y, rx, ry, n, fill, spike = 0.45, rot = 0) => { const pts = []; for (let i = 0; i < n; i++) { const a = i / n * 6.283 + rot, k = 1 - spike * (i % 2 ? r() : r() * 0.3); pts.push([x + Math.cos(a) * rx * k * Math.cos(rot) - Math.sin(a) * ry * k * Math.sin(rot), y + Math.cos(a) * rx * k * Math.sin(rot) + Math.sin(a) * ry * k * Math.cos(rot)]); } poly(c, pts, fill); };
// one tile of plating. o: { base, ink, dark, light, sheen, accent, seed, min: least panel (px), busy 0..1 }
function plating(o) {
  return canvasTex(S, S, (c) => {
    const r = rng(o.seed ?? 1), lw = o.lw ?? 9; c.fillStyle = o.base; c.fillRect(0, 0, S, S);
    const cells = []; (function split(x, y, w, h, d) {
      const min = o.min ?? 200; if (d > 0 && (w > min * 2 || h > min * 2) && (d > 2 || r() < 0.8)) { const vert = w > h * 1.15 ? true : h > w * 1.15 ? false : r() < 0.5, u = 0.34 + 0.32 * r(); if (vert) { split(x, y, w * u, h, d - 1); split(x + w * u, y, w * (1 - u), h, d - 1); } else { split(x, y, w, h * u, d - 1); split(x, y + h * u, w, h * (1 - u), d - 1); } } else cells.push([x, y, w, h]);
    })(0, 0, S, S, 4);
    for (const [x, y, w, h] of cells) {
      const k = r(); c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
      if (k < 0.2) { c.fillStyle = o.dark; c.fillRect(x, y, w, h); } else if (k > 0.88) { c.fillStyle = o.light; c.fillRect(x, y, w, h); }
      // a cel's sheen: two parallel bars of the lighter tone, slanting, hard-edged
      if (r() < 0.55) { const sx = x + w * (0.2 + 0.5 * r()), sw = 26 + 60 * r(); for (const [dx, ww] of [[0, sw], [sw + 22, sw * 0.3]]) poly(c, [[sx + dx, y + h], [sx + dx + ww, y + h], [sx + dx + ww + h * 0.55, y], [sx + dx + h * 0.55, y]], o.sheen); }
      const kind = r();
      if (kind < 0.16 * (1 + (o.busy ?? 0)) && w > 150 && h > 110) { const n = Math.floor((h - 60) / 34), vw = Math.min(w - 70, 190); c.fillStyle = INK; for (let i = 0; i < n; i++) c.fillRect(x + 36, y + 34 + i * 34, vw, 16); }      // vent slots
      else if (kind < 0.36 && w > 130 && h > 130) { const q = Math.min(w, h) * 0.5, hx = x + w * 0.5 - q / 2 + (r() - 0.5) * (w - q) * 0.4, hy = y + h * 0.5 - q / 2; c.strokeStyle = INK; c.lineWidth = lw * 0.7; c.beginPath(); c.roundRect(hx, hy, q, q * 0.8, 14); c.stroke(); c.fillStyle = INK; for (const [a, b] of [[0.12, 0.14], [0.88, 0.14], [0.12, 0.86], [0.88, 0.86]]) { c.beginPath(); c.arc(hx + q * a, hy + q * 0.8 * b, 6, 0, 7); c.fill(); } }      // a hatch cover, four screws
      else if (kind < 0.5 && o.accent) { c.fillStyle = o.accent; if (w > h) c.fillRect(x, y + h * 0.62, w, Math.min(40, h * 0.2)); else c.fillRect(x + w * 0.62, y, Math.min(40, w * 0.2), h); }      // a band of the trim colour
      if (r() < 0.6) { c.fillStyle = INK; const top = r() < 0.5; for (let px = x + 30; px < x + w - 16; px += 46) { c.beginPath(); c.arc(px, top ? y + 22 : y + h - 22, 5.5, 0, 7); c.fill(); } }      // a row of rivets
      c.restore();
    }
    // scrapes down to the metal: thin slanted slivers of the light tone, a darker one beside each
    for (let i = 0; i < (o.scrapes ?? 5); i++) { const x = r() * S, y = r() * S, len = 70 + r() * 160, a = -0.9 + r() * 0.5, w = 5 + r() * 9, dx = Math.cos(a) * len, dy = Math.sin(a) * len; poly(c, [[x, y], [x + dx, y + dy], [x + dx * 0.96 + w, y + dy * 0.96 + w * 0.6], [x + w * 0.4, y + w]], o.light); poly(c, [[x + w, y + w * 1.4], [x + dx * 0.7 + w, y + dy * 0.7 + w * 1.4], [x + dx * 0.68 + w * 1.5, y + dy * 0.68 + w * 2], [x + w * 1.3, y + w * 2.1]], o.dark); }
    for (let i = 0; i < (o.soot ?? 0); i++) blot(c, r, r() * S, r() * S, 60 + r() * 110, 40 + r() * 70, 14, o.sootCol ?? "#2a2230", 0.5, r() * 3);
    c.strokeStyle = o.ink ?? INK; c.lineWidth = lw; for (const [x, y, w, h] of cells) c.strokeRect(x, y, w, h); c.strokeRect(0, 0, S, S);
  }, { repeat: true });
}
export function liveries() {
  const L = {};
  L.enf = plating({ base: "#cfc5a3", dark: "#b0a583", light: "#e6ddc0", sheen: "#ddd3b3", accent: "#f07a22", seed: 11, soot: 2, sootCol: "#5a4d50" });
  L.navy = plating({ base: "#2c3260", dark: "#20244a", light: "#4a5290", sheen: "#353c72", accent: "#f07a22", seed: 23, min: 240, scrapes: 7, ink: "#0e0d22" });
  L.gun = plating({ base: "#3d4270", dark: "#2c3058", light: "#5a6198", sheen: "#474d80", seed: 37, min: 170, busy: 1, ink: "#111028" });
  L.black = plating({ base: "#191a34", dark: "#111126", light: "#34365c", sheen: "#22234a", seed: 41, min: 260, ink: "#07061a", scrapes: 8 });
  L.rust = plating({ base: "#84503f", dark: "#633a30", light: "#b06c50", sheen: "#8f5946", seed: 53, min: 260, soot: 3, sootCol: "#3b2630", scrapes: 9 });
  // burnt plate: what Ife's blasts left. Soot in hard shapes over what the paint was, blisters of bare metal, an edge still glowing
  L.scorch = canvasTex(S, S, (c) => {
    const r = rng(7); c.fillStyle = "#3d3140"; c.fillRect(0, 0, S, S);
    for (let i = 0; i < 9; i++) blot(c, r, r() * S, r() * S, 120 + r() * 200, 70 + r() * 120, 16, i % 3 ? "#251c2c" : "#57475a", 0.55, r() * 3);
    for (let i = 0; i < 12; i++) blot(c, r, r() * S, r() * S, 16 + r() * 44, 10 + r() * 24, 9, i % 2 ? "#8d7f8a" : "#c9bf9d", 0.5, r() * 3);
    for (let i = 0; i < 5; i++) { const x = r() * S, y = r() * S; c.strokeStyle = "#16101c"; c.lineWidth = 8; c.lineJoin = "miter"; c.beginPath(); c.moveTo(x, y); let px = x, py = y; for (let k = 0; k < 5; k++) { px += (r() - 0.3) * 90; py += (r() - 0.5) * 110; c.lineTo(px, py); } c.stroke(); }      // cracks
    c.strokeStyle = "#16101c"; c.lineWidth = 9; c.strokeRect(0, 0, S, S); c.beginPath(); c.moveTo(0, 420); c.lineTo(S, 420); c.moveTo(610, 420); c.lineTo(610, S); c.stroke();
  }, { repeat: true });
  // hazard strip (by uv, repeating along u) and a drum's band: trim colour between two ink lines, a tick every so often
  L.hazard = canvasTex(256, 64, (c) => { hazard(c, 0, 0, 256, 64, "#f0b81e", "#1c1d2a", 64); c.fillStyle = INK; c.fillRect(0, 0, 256, 5); c.fillRect(0, 59, 256, 5); }, { repeat: true });
  L.band = canvasTex(256, 128, (c) => { c.fillStyle = "#f07a22"; c.fillRect(0, 0, 256, 128); c.fillStyle = "#ffa04a"; c.fillRect(0, 12, 256, 22); c.fillStyle = INK; c.fillRect(0, 0, 256, 9); c.fillRect(0, 119, 256, 9); for (let i = 0; i < 4; i++) c.fillRect(20 + i * 64, 44, 10, 50); }, { repeat: true });
  L.drum = canvasTex(512, 256, (c) => {      // a shoulder drum's side, round its axis: plate breaks, a ring of bolts, a filler cap
    c.fillStyle = "#3d4270"; c.fillRect(0, 0, 512, 256); c.fillStyle = "#474d80"; c.fillRect(0, 70, 512, 44); c.fillStyle = "#2c3058"; c.fillRect(0, 186, 512, 70);
    c.fillStyle = "#111028"; for (let i = 0; i < 8; i++) { c.fillRect(i * 64, 0, 7, 256); c.beginPath(); c.arc(i * 64 + 32, 30, 8, 0, 7); c.fill(); c.beginPath(); c.arc(i * 64 + 32, 226, 8, 0, 7); c.fill(); }
    c.fillRect(0, 0, 512, 8); c.fillRect(0, 248, 512, 8); c.fillRect(0, 180, 512, 6); c.fillStyle = "#f07a22"; c.fillRect(140, 128, 90, 34);
  }, { repeat: true });
  // stencils, as the wrecks had them: a code or a word in the station's hand, alone on clear
  const codes = new Map();
  L.code = (text, col = "#1a1838") => { const k = text + col; if (!codes.has(k)) codes.set(k, canvasTex(64 + text.length * 62, 128, (c) => latin(c, text, 16, 100, 100, col))); return codes.get(k); };
  L.word = (str, col = "#1a1838") => { const k = str + col; if (!codes.has(k)) codes.set(k, canvasTex(Math.ceil(kanaWidth(str, 104) + 28), 128, (c) => kana(c, str, 14, 12, 104, 17, col))); return codes.get(k); };
  L.codeAspect = (text) => (64 + text.length * 62) / 128; L.wordAspect = (str) => Math.ceil(kanaWidth(str, 104) + 28) / 128;
  // a length of blast door (the one that came down behind Juno): bone plate, its word, chevrons at the floor, a hazard
  // band along its foot; dented where the swarm hit it, one corner burnt
  L.door = canvasTex(1024, 768, (c) => {
    const r = rng(5); c.fillStyle = "#d8d2bc"; c.fillRect(0, 0, 1024, 768); c.fillStyle = "#c2bba2"; c.fillRect(0, 0, 1024, 150); c.fillStyle = "#e9e4d0"; poly(c, [[120, 620], [220, 620], [560, 150], [460, 150]], "#e9e4d0"); poly(c, [[250, 620], [280, 620], [620, 150], [590, 150]], "#e9e4d0");
    kana(c, "キケン", 300, 220, 190, 30, "#b3261c"); latin(c, "07", 60, 330, 190, "#2a2a44");
    chevrons(c, 700, 420, 280, 170, 2, 34, "#2a2a44", 1); hazard(c, 0, 640, 1024, 128, "#f0b81e", "#1c1d2a", 110);
    c.strokeStyle = INK; c.lineWidth = 10; c.strokeRect(0, 0, 1024, 768); c.beginPath(); c.moveTo(0, 150); c.lineTo(1024, 150); c.moveTo(0, 640); c.lineTo(1024, 640); c.stroke();
    c.fillStyle = INK; for (let x = 40; x < 1024; x += 82) { c.beginPath(); c.arc(x, 40, 9, 0, 7); c.fill(); c.beginPath(); c.arc(x, 112, 9, 0, 7); c.fill(); }
    for (const [x, y, rx, ry] of [[760, 300, 110, 70], [200, 500, 80, 50], [540, 560, 60, 36]]) { blot(c, r, x, y, rx, ry, 12, "#b9b299", 0.25, 0.4); c.strokeStyle = INK; c.lineWidth = 7; c.beginPath(); c.ellipse(x, y, rx * 0.8, ry * 0.8, 0.4, 0.6, 3.4); c.stroke(); }      // dents: a shade and a crescent of ink
    blot(c, r, 990, 30, 330, 230, 16, "#3a2c38", 0.5, 0.3); blot(c, r, 1010, 10, 200, 140, 12, "#1e1624", 0.5, 1.1);
  });
  // soot and scrape decals (alpha), to lay where a plate was hit
  const soots = new Map();
  L.soot = (seed) => { if (!soots.has(seed)) soots.set(seed, canvasTex(256, 256, (c) => { const r = rng(seed * 13 + 1); blot(c, r, 128, 128, 120, 96, 16, "#2a2030", 0.55, r() * 3); blot(c, r, 118 + r() * 20, 122 + r() * 20, 70, 52, 12, "#15101c", 0.5, r() * 3); blot(c, r, 150, 150, 26, 16, 8, "#8d7f8a", 0.5, r() * 3); })); return soots.get(seed); };
  // a slice of enforcer, seen on the cut: the shell's hot edge, what was inside it
  L.slice = canvasTex(512, 400, (c) => {
    c.fillStyle = "#ffb04a"; c.fillRect(0, 0, 512, 400); c.fillStyle = "#3a1420"; c.beginPath(); c.roundRect(34, 34, 444, 332, 26); c.fill(); c.fillStyle = "#6a1c1c"; c.beginPath(); c.roundRect(60, 60, 392, 280, 18); c.fill();
    c.fillStyle = "#200a14"; for (const [x, y, w, h] of [[84, 84, 150, 110], [260, 84, 168, 60], [260, 164, 76, 150], [356, 164, 72, 70], [84, 214, 150, 100], [356, 254, 72, 60]]) c.fillRect(x, y, w, h);
    c.strokeStyle = "#ffd070"; c.lineWidth = 7; for (const [x, y, w, h] of [[84, 84, 150, 110], [260, 164, 76, 150], [84, 214, 150, 100]]) c.strokeRect(x, y, w, h);
    c.fillStyle = "#fff0b0"; for (const [x, y] of [[130, 130], [300, 110], [296, 240], [392, 200], [150, 262], [390, 284]]) { c.beginPath(); c.arc(x, y, 12, 0, 7); c.fill(); }
    c.fillStyle = "#ff7a2a"; for (let i = 0; i < 6; i++) c.fillRect(100 + i * 22, 96, 10, 86);
  });
  // what the dead screens still show: an eye, a word, noise. Red, as the machines speak when they mean harm
  L.crt = [0, 1, 2, 3].map((n) => canvasTex(256, 192, (c) => {
    const r = rng(n * 5 + 2); c.fillStyle = "#2a0406"; c.fillRect(0, 0, 256, 192); const fg = "#ff4a36";
    if (n === 0) { c.strokeStyle = fg; c.lineWidth = 12; c.beginPath(); c.moveTo(30, 96); c.quadraticCurveTo(128, 10, 226, 96); c.quadraticCurveTo(128, 182, 30, 96); c.stroke(); c.fillStyle = fg; c.beginPath(); c.arc(128, 96, 34, 0, 7); c.fill(); c.fillStyle = "#2a0406"; c.beginPath(); c.arc(128, 96, 13, 0, 7); c.fill(); }
    else if (n === 1) { kana(c, "キケン", 26, 30, 64, 11, fg); c.fillStyle = fg; for (let i = 0; i < 9; i++) c.fillRect(26 + i * 23, 170 - (10 + r() * 50), 15, 10 + r() * 50); }
    else if (n === 2) { for (let y = 8; y < 192; y += 14) { let x = 6; while (x < 250) { const w = 6 + r() * 46; if (r() < 0.55) { c.fillStyle = r() < 0.2 ? "#ffd0a0" : fg; c.fillRect(x, y, w, 8); } x += w + 4; } } }
    else { latin(c, "E-02", 22, 84, 76, fg); kana(c, "キカイ", 30, 104, 58, 10, fg); }
    scanlines(c, 256, 192, 0.35, 8); c.strokeStyle = "#0c0204"; c.lineWidth = 12; c.strokeRect(0, 0, 256, 192);
  }));
  // an eye's glint: a drawn four-pointed star, hard-edged, hot in the middle (not a soft disc)
  L.star = canvasTex(512, 512, (c) => {
    const star = (rx, ry, w, a) => { c.fillStyle = `rgba(255,255,255,${a})`; c.beginPath(); c.moveTo(256 - rx, 256); c.quadraticCurveTo(256 - w, 256 - w, 256, 256 - ry); c.quadraticCurveTo(256 + w, 256 - w, 256 + rx, 256); c.quadraticCurveTo(256 + w, 256 + w, 256, 256 + ry); c.quadraticCurveTo(256 - w, 256 + w, 256 - rx, 256); c.fill(); };
    star(250, 70, 12, 0.2); star(150, 48, 12, 0.42); star(80, 30, 10, 0.95);
  });
  return L;
}
