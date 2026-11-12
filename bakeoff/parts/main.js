// Parts-on-a-rig test: generated body-part drawings (out/bakeoff/parts/kit) hung on the projected 3D run rig.
// Every part is a small textured mesh, so it can be stretched along its bone, bowed, and warped (hair, hem).
// The character is built facing screen-right (as the kit was drawn) and the finished cel is mirrored to run left.
import { rig } from "/bakeoff/web/character.js";

const W = 1920, H = 1080, PU = 385, K = PU / 820;       // px per rig unit; kit was drawn at 820 px per unit
const Q = new URLSearchParams(location.search);
const OPT = { anti: Q.get("anti") !== "0", debug: Q.get("debug") === "1", ones: Q.get("ones") === "1" };
const KIT = "/out/bakeoff/parts/kit/";
// pivots in part pixels: a = proximal joint, b = distal joint
const PARTS = {
  head: { a: [237, 262], b: [237, 62] },
  torso: { a: [222, 575], b: [210, 245], sh: [140, 262] },
  pelvis: { a: [165, 250], b: [165, 30] },
  uarm: { a: [118, 105], b: [122, 395] },
  farm: { a: [100, 90], b: [116, 455] },
  shoe: { a: [95, 80], b: [330, 80] },
  thighN: { a: [133, 130], b: [133, 480] },
  shinN: { a: [125, 118], b: [121, 540] },
  thighF: { a: [133, 130], b: [133, 480] },
  shinF: { a: [125, 118], b: [107, 535] },
  torsoFr: { a: [285, 767], b: [269, 323], sh: [125, 338], k: 0.742 }, torsoBk: { a: [302, 768], b: [286, 324], sh: [440, 338], k: 0.742 },
};

const out = document.getElementById("c"), g2 = out.getContext("2d");
const glc = new OffscreenCanvas(W, H);
const gl = glc.getContext("webgl2", { premultipliedAlpha: true, antialias: true, preserveDrawingBuffer: true });
const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
const prog = gl.createProgram();
gl.attachShader(prog, sh(gl.VERTEX_SHADER, `#version 300 es
in vec2 p; in vec2 uv; out vec2 v; out vec2 sp;
void main(){ v = uv; sp = p; gl_Position = vec4(p.x / ${W / 2}. - 1., 1. - p.y / ${H / 2}., 0., 1.); }`));
gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, `#version 300 es
precision highp float; in vec2 v; in vec2 sp; out vec4 o;
uniform sampler2D t; uniform vec3 tint; uniform vec3 clip; // clip: centre xy, radius (0 = none)
void main(){ vec4 c = texture(t, v); float m = 1.;
  if (clip.z > 0.) m = 1. - smoothstep(clip.z - 2., clip.z, distance(sp, clip.xy));
  o = vec4(c.rgb * tint, c.a) * m; }`));
gl.linkProgram(prog); gl.useProgram(prog);
const U = n => gl.getUniformLocation(prog, n);
const vbuf = gl.createBuffer(), ibuf = gl.createBuffer();
const GX = 10, GY = 18;
{ const idx = []; for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) { const a = j * (GX + 1) + i, b = a + 1, c = a + GX + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibuf); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW); }
gl.bindBuffer(gl.ARRAY_BUFFER, vbuf);
gl.enableVertexAttribArray(0); gl.enableVertexAttribArray(1);
gl.bindAttribLocation(prog, 0, "p");
const lp = gl.getAttribLocation(prog, "p"), luv = gl.getAttribLocation(prog, "uv");
gl.enableVertexAttribArray(lp); gl.enableVertexAttribArray(luv);
gl.vertexAttribPointer(lp, 2, gl.FLOAT, false, 16, 0); gl.vertexAttribPointer(luv, 2, gl.FLOAT, false, 16, 8);
gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const TEX = {};
async function load(name) {
  const im = new Image(); im.src = KIT + name + ".png"; await im.decode();
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im); gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_LOD_BIAS ?? 0x8501, -0.6);
  TEX[name] = { t, w: im.width, h: im.height };
}
const kitNames = await (await fetch(KIT + "kit.json")).json();
for (const n of Object.keys(kitNames)) { await load(n); await load(n + "_in"); }

// ---- drawing one part ------------------------------------------------------------------------------------------
const verts = new Float32Array((GX + 1) * (GY + 1) * 4);
// A2, B2: screen positions of the part's two pivots. o: {ws width scale, bow [x,y], warp(lx,ly,x,y)->[dx,dy], tint, inner, clip}
function part(name, A2, B2, o = {}) {
  const P = PARTS[name], T = TEX[name + (o.inner ? "_in" : "")], PK = K * (P.k ?? 1), ws = (o.ws ?? 1) * PK, ls = o.ls ?? null;
  const ex = P.b[0] - P.a[0], ey = P.b[1] - P.a[1], L = Math.hypot(ex, ey), ux = ex / L, uy = ey / L;
  let fx = B2[0] - A2[0], fy = B2[1] - A2[1]; let L2 = Math.hypot(fx, fy); fx /= L2; fy /= L2;
  if (ls != null) L2 = L * PK * ls;                    // fixed length scale: only direction comes from B2
  const capK = Math.min(PK, Math.max(L2 / L, PK * 0.75)); // caps keep their drawn size unless the bone is very foreshortened
  let n = 0;
  for (let j = 0; j <= GY; j++) for (let i = 0; i <= GX; i++) {
    const lx = i / GX * T.w, ly = j / GY * T.h, dx = lx - P.a[0], dy = ly - P.a[1];
    const t = dx * ux + dy * uy, s = -dx * uy + dy * ux;
    const al = t < 0 ? t * capK : t > L ? L2 + (t - L) * capK : t / L * L2;
    let x = A2[0] + fx * al - fy * s * ws, y = A2[1] + fy * al + fx * s * ws;
    if (o.bow) { const k = Math.sin(Math.PI * Math.min(1, Math.max(0, t / L))); x += o.bow[0] * k; y += o.bow[1] * k; }
    if (o.warp) { const d = o.warp(lx, ly, x, y); x += d[0]; y += d[1]; }
    verts[n++] = x; verts[n++] = y; verts[n++] = lx / T.w; verts[n++] = ly / T.h;
  }
  gl.bufferData(gl.ARRAY_BUFFER, verts, gl.DYNAMIC_DRAW);
  gl.bindTexture(gl.TEXTURE_2D, T.t);
  gl.uniform3fv(U("tint"), o.tint ?? [1, 1, 1]);
  gl.uniform3fv(U("clip"), o.clip ?? [0, 0, 0]);
  gl.drawElements(gl.TRIANGLES, GX * GY * 6, gl.UNSIGNED_SHORT, 0);
  // where a part-local point lands (no bow/warp): used to hang children off drawn landmarks
  return (lx, ly) => { const dx = lx - P.a[0], dy = ly - P.a[1], t = dx * ux + dy * uy, s = -dx * uy + dy * ux;
    const al = t < 0 ? t * capK : t > L ? L2 + (t - L) * capK : t / L * L2; return [A2[0] + fx * al - fy * s * ws, A2[1] + fy * al + fx * s * ws]; };
}

// A whole bent-leg drawing skinned to two bones: each vertex follows the thigh or the shin frame (both hinged at the knee),
// blended across the knee, so one drawing covers a range of knee angles.
const BENT = { bentN: { hip: [237, 229], knee: [767, 823], ankle: [343, 1459] }, bentF: { hip: [236, 250], knee: [766, 823], ankle: [332, 1469] } };
function bent(name, hip2, knee2, ankle2, o = {}) {
  const P = BENT[name], T = TEX[name + (o.inner ? "_in" : "")];
  const un = (a, b) => { const d = [b[0] - a[0], b[1] - a[1]], l = Math.hypot(d[0], d[1]); return [d[0] / l, d[1] / l, l]; };
  const ut = un(P.hip, P.knee), us = un(P.knee, P.ankle), vt = un(hip2, knee2), vs = un(knee2, ankle2);
  const kt = vt[2] / ut[2], ks = vs[2] / us[2], kw = (kt + ks) / 2 * (o.ws ?? 1);
  const nn = un([0, 0], [ut[0] + us[0], ut[1] + us[1]]);
  const xf = (dx, dy, u, v, kl) => { const t = dx * u[0] + dy * u[1], s = -dx * u[1] + dy * u[0]; return [knee2[0] + v[0] * t * kl - v[1] * s * kw, knee2[1] + v[1] * t * kl + v[0] * s * kw]; };
  let n = 0;
  for (let j = 0; j <= GY; j++) for (let i = 0; i <= GX; i++) {
    const lx = i / GX * T.w, ly = j / GY * T.h, dx = lx - P.knee[0], dy = ly - P.knee[1];
    let w = clamp((dx * nn[0] + dy * nn[1]) / 260 + 0.5); w = w * w * (3 - 2 * w);
    const a = xf(dx, dy, ut, vt, kt), b = xf(dx, dy, us, vs, ks);
    verts[n++] = a[0] + (b[0] - a[0]) * w; verts[n++] = a[1] + (b[1] - a[1]) * w; verts[n++] = lx / T.w; verts[n++] = ly / T.h;
  }
  gl.bufferData(gl.ARRAY_BUFFER, verts, gl.DYNAMIC_DRAW); gl.bindTexture(gl.TEXTURE_2D, T.t);
  gl.uniform3fv(U("tint"), o.tint ?? [1, 1, 1]); gl.uniform3fv(U("clip"), o.clip ?? [0, 0, 0]);
  gl.drawElements(gl.TRIANGLES, GX * GY * 6, gl.UNSIGNED_SHORT, 0);
}

// ---- pose --------------------------------------------------------------------------------------------------------
const YAW = 80 * Math.PI / 180, PITCH = 3 * Math.PI / 180, CX = 960, GROUND = 930;
const proj = v => { const X = v[0] * Math.cos(YAW) + v[2] * Math.sin(YAW), Z = -v[0] * Math.sin(YAW) + v[2] * Math.cos(YAW), Y = v[1];
  const Y2 = Y * Math.cos(PITCH) - Z * Math.sin(PITCH), Z2 = Y * Math.sin(PITCH) + Z * Math.cos(PITCH); const k = 5 / (5 - Z2);
  return [CX + X * PU * k, GROUND - 0.2 * PU - Y2 * PU * k, Z2]; };
const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const RO = { lean: 14, energy: 1, headPitch: 0 };
function pose(p) {
  const J = rig(p, RO), S = {};
  const P3 = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  S.hips = proj(J.hips); S.chest = proj(J.chest);
  S.up = sub(proj([J.hips[0] + J.S[0], J.hips[1] + J.S[1], J.hips[2] + J.S[2]]), S.hips); const ul = Math.hypot(...S.up); S.up = [S.up[0] / ul, S.up[1] / ul];
  S.head = add(add(proj(J.head), S.up, 0.195 * PU), [0.03 * PU, 0]);
  S.tw = 0.3 * Math.cos(2 * Math.PI * (p - 0.8));
  S.legs = {}; S.arms = {};
  for (const s of [1, -1]) {
    const l = J.legs[s], a = J.arms[s];
    S.legs[s] = { hip: proj(l.hip), knee: proj(l.knee), ankle: proj(l.ankle), toe: proj(l.toe), heel: proj(l.heel) };
    const elbow = P3(a.sh, a.elbow, 1.12), hand = [elbow[0] + (a.hand[0] - a.elbow[0]) * 1.3, elbow[1] + (a.hand[1] - a.elbow[1]) * 1.3, elbow[2] + (a.hand[2] - a.elbow[2]) * 1.3];
    S.arms[s] = { sh: proj(a.sh), elbow: proj(elbow), hand: proj(hand) };
  }
  return S;
}

// ---- the character -------------------------------------------------------------------------------------------------
const TW = 0.88, BENDMIN = (Number(Q.get('bendmin') ?? 80)) * Math.PI / 180;
const FAR = [0.74, 0.72, 0.82], NEAR = -1; // the character's left side faces the camera at this yaw
function character(p, tick) {
  const S = pose(p), dp = 1 / 8, S0 = pose(p - dp * 0.6), anti = OPT.anti;
  gl.viewport(0, 0, W, H); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
  const perpOf = (a, b) => { const d = sub(b, a), l = Math.hypot(...d) || 1; return [-d[1] / l, d[0] / l]; };
  // bow: the middle of a fast-swinging lower limb lags behind its ends
  const bowOf = (a, b, a0, b0, k) => { if (!anti) return null; const rel = sub(sub(b, a), sub(b0, a0)); const n = perpOf(a, b); const d = clamp((rel[0] * n[0] + rel[1] * n[1]) * k, -16, 16); return [-n[0] * d, -n[1] * d]; };
  const stretchOf = (a, b, a0, b0) => { if (!anti) return 1; const v = Math.hypot(...sub(sub(b, a), sub(b0, a0))); return 1 + clamp(v / 900, 0, 0.1); };

  const leg = s => {
    const l = S.legs[s], l0 = S0.legs[s], near = s === NEAR, tint = near ? [1, 1, 1] : FAR, sfx = near ? "N" : "F";
    const kneeAng = Math.acos(clamp(((l.hip[0] - l.knee[0]) * (l.ankle[0] - l.knee[0]) + (l.hip[1] - l.knee[1]) * (l.ankle[1] - l.knee[1])) / (Math.hypot(...sub(l.hip, l.knee)) * Math.hypot(...sub(l.ankle, l.knee))), -1, 1));
    const st = stretchOf(l.knee, l.ankle, l0.knee, l0.ankle);
    const ankle = add(l.knee, sub(l.ankle, l.knee), st);
    const toeDir = sub(l.toe, l.heel);
    part("shoe", ankle, add(ankle, toeDir), { ls: 0.88, ws: 0.88, tint });
    if (anti && Q.get("bent") !== "0" && Math.PI - kneeAng > BENDMIN) { bent("bent" + sfx, l.hip, l.knee, ankle, { tint, ws: 1.0 }); return; }
    part("thigh" + sfx, l.hip, l.knee, { tint, ws: 0.92 });
    part("shin" + sfx, l.knee, ankle, { tint, ws: 0.92, bow: bowOf(l.knee, l.ankle, l0.knee, l0.ankle, 0.22) });
    if (anti) part("thigh" + sfx, l.hip, l.knee, { tint, ws: 0.92, inner: true, clip: [l.knee[0], l.knee[1], 0.2 * PU] });
  };
  const arm = (s, shP) => {
    const a = S.arms[s], a0 = S0.arms[s], near = s === NEAR, tint = near ? [1, 1, 1] : FAR;
    const el = add(shP, sub(a.elbow, a.sh)), hd = add(el, sub(a.hand, a.elbow));
    part("uarm", shP, el, { tint, ws: 0.9 });
    part("farm", el, hd, { tint, ws: 0.9, bow: bowOf(a.elbow, a.hand, a0.elbow, a0.hand, 0.25) });
    if (anti) part("uarm", shP, el, { tint, ws: 0.9, inner: true, clip: [el[0], el[1], 0.085 * PU] });
  };

  // torso frame first (not drawn yet) to find the drawn shoulder
  const hipsA = S.hips, chestB = S.chest;
  const tw = S.tw, twS = anti ? 1 + 0.05 * tw : 1;
  // lagging offsets for secondary motion: where the head / hips were a moment ago, relative to now
  const lagH = sub(S0.head, S.head), lagT = sub(S0.hips, S.hips);
  const wave = (ph) => Math.sin(tick * Math.PI / 2 * 1.0 + ph);
  const hairWarp = (lx, ly) => { if (!anti) return [0, 0];
    const w = Math.pow(clamp((235 - lx) / 220), 1.4) * clamp((ly - 40) / 120) + 0.5 * clamp((90 - ly) / 90) * clamp((300 - lx) / 300);
    return [w * (lagH[0] * 1.2 - 9 + 5 * wave(lx * 0.02 + ly * 0.012)), w * (lagH[1] * 1.6 + 7 * wave(lx * 0.025 + 1.3))]; };
  const hemWarp = (lx, ly) => { if (!anti) return [0, 0];
    lx *= tk; ly *= tk; const w = clamp((ly - 430) / 230) * (0.5 + 0.5 * clamp((330 - lx) / 300));
    const c = clamp((120 - ly) / 110) * 0.5;
    return [w * (lagT[0] - 5 + 5 * wave(lx * 0.02)) + c * (lagH[0] - 3), w * (lagT[1] * 1.3 + 4 * wave(lx * 0.03 + 2)) + c * lagH[1]]; };

  const tn = !anti || Q.get('swap') === '0' ? 'torso' : tw > 0.14 ? 'torsoBk' : tw < -0.14 ? 'torsoFr' : 'torso', tk = PARTS[tn].k ?? 1;
  const torsoMap = (() => { const P = PARTS[tn], K = PU / 820 * tk; const ex = P.b[0] - P.a[0], ey = P.b[1] - P.a[1], L = Math.hypot(ex, ey), ux = ex / L, uy = ey / L;
    let fx = chestB[0] - hipsA[0], fy = chestB[1] - hipsA[1]; const L2 = Math.hypot(fx, fy); fx /= L2; fy /= L2;
    return (lx, ly) => { const dx = lx - P.a[0], dy = ly - P.a[1], t = dx * ux + dy * uy, s = -dx * uy + dy * ux; const al = t / L * L2; return [hipsA[0] + fx * al - fy * s * K * twS * TW, hipsA[1] + fy * al + fx * s * K * twS * TW]; }; })();
  const shBase = torsoMap(...PARTS[tn].sh);
  const shOf = s => add(shBase, sub(S.arms[s].sh, S.chest), 1.0);

  arm(-NEAR, shOf(-NEAR));
  const pel = { ws: 0.86 };
  // the pelvis is inked behind the far leg, then its ink-free interior goes over the leg tops so no outline crosses the hips
  if (anti) part("pelvis", add(S.hips, S.up, -0.02 * PU), add(S.hips, S.up, 0.2 * PU), { ...pel, ls: 0.62 });
  leg(-NEAR);
  part("pelvis", add(S.hips, S.up, -0.02 * PU), add(S.hips, S.up, 0.2 * PU), { ...pel, ls: 0.62, inner: anti });
  leg(NEAR);
  if (anti) part("pelvis", add(S.hips, S.up, -0.02 * PU), add(S.hips, S.up, 0.2 * PU), { ...pel, ls: 0.62, inner: true, clip: [S.legs[NEAR].hip[0], S.legs[NEAR].hip[1], 0.26 * PU] });
  const nod = anti ? clamp(lagH[1] / 60, -0.08, 0.08) : 0;
  const hu = [S.up[0] * 0.75 + 0.03 - nod, S.up[1]];
  part("head", S.head, add(S.head, hu, 100), { ls: 0.8, ws: 0.8, warp: hairWarp });
  part(tn, hipsA, chestB, { ws: twS * TW, warp: hemWarp });
  arm(NEAR, shOf(NEAR));
  return S;
}

// ---- background + frame -------------------------------------------------------------------------------------------
function background(tt) {
  const g = g2; const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, "#0b1026"); gr.addColorStop(0.75, "#1a1f44"); gr.addColorStop(1, "#0d0f22");
  g.fillStyle = gr; g.fillRect(0, 0, W, H);
  const layer = (speed, gap, w, y0, y1, col) => { g.fillStyle = col; const off = (tt * speed) % gap; for (let x = -gap + off; x < W + gap; x += gap) g.fillRect(x, y0, w, y1 - y0); };
  layer(260, 520, 150, 0, GROUND - 60, "#141a3a"); layer(520, 760, 60, 0, GROUND - 20, "#202857");
  g.fillStyle = "#262c5c"; g.fillRect(0, GROUND - 20, W, 6);
  g.fillStyle = "#10132c"; g.fillRect(0, GROUND - 14, W, H);
  layer(2500, 430, 170, GROUND + 28, GROUND + 38, "#3a4285"); layer(3300, 610, 260, GROUND + 90, GROUND + 106, "#2b3270");
}
window.renderFrame = (f) => {
  const step = OPT.ones ? f / 2 : Math.floor(f / 2), p = (step / 8) % 1;
  background(f / 24);
  const S = character(p, step);
  const feet = Math.max(S.legs[1].ankle[1], S.legs[-1].ankle[1]); const air = clamp((GROUND - 0.2 * PU + 0.05 * PU - feet) / 40 + 1, 0, 1);
  g2.save(); g2.translate(W, 0); g2.scale(-1, 1);
  g2.fillStyle = "rgba(4,5,16,0.55)"; g2.beginPath(); g2.ellipse(S.hips[0], GROUND + 6, 150 - 40 * (1 - air), 16, 0, 0, 7); g2.fill();
  g2.drawImage(glc, 0, 0);
  if (OPT.debug) { g2.strokeStyle = "#0f0"; g2.lineWidth = 2; const ln = (a, b) => { g2.beginPath(); g2.moveTo(a[0], a[1]); g2.lineTo(b[0], b[1]); g2.stroke(); };
    for (const s of [1, -1]) { const l = S.legs[s], a = S.arms[s]; g2.strokeStyle = s > 0 ? "#f44" : "#4af"; ln(l.hip, l.knee); ln(l.knee, l.ankle); ln(l.heel, l.toe); ln(a.sh, a.elbow); ln(a.elbow, a.hand); }
    g2.strokeStyle = "#0f0"; ln(S.hips, S.chest); ln(S.chest, S.head); }
  g2.restore();
};
window.ready = true;
