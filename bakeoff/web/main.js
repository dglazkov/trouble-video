// Bake-off shot, web side: three.js corridor + Canvas2D cel character + GLSL photography pass.
// Pure function of frame number: window.renderFrame(f). No wall-clock, seeded randomness only.
import * as THREE from 'three';
import { drawCharacter } from './character.js';
import { buildCorridor, shared, ndMaterial } from './corridor.js';
import { Post } from './post.js';

const W = 1920, H = 1080, FPS = 24, DROP = 35;
THREE.ColorManagement.enabled = false;
const canvas = document.getElementById('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(1); renderer.setSize(W, H, false);
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.autoClear = true;
const gl = renderer.getContext();
const dbg = gl.getExtension('WEBGL_debug_renderer_info');
window.gpuInfo = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);

const scene = new THREE.Scene();
buildCorridor(scene);
const camera = new THREE.PerspectiveCamera(50, W / H, 0.05, 200);

const mkCanvas = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
const charCv = mkCanvas(), fxCv = mkCanvas();
// willReadFrequently forces CPU (software Skia) rasterisation: bit-exact regardless of frame order
const cctx = charCv.getContext('2d', { willReadFrequently: true }), fctx = fxCv.getContext('2d', { willReadFrequently: true });
const mkTex = c => { const t = new THREE.CanvasTexture(c); t.premultiplyAlpha = true; t.minFilter = t.magFilter = THREE.LinearFilter; t.generateMipmaps = false; return t; };
const charTex = mkTex(charCv), fxTex = mkTex(fxCv);
const post = new Post(renderer, W, H, charTex, fxTex);

function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const sst = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;
const BEATS = [45, 55, 65];

function timeline(f) {
  const post_ = f >= DROP;
  const fh = f - ((f + 1) % 2);              // character held on twos (new pose on odd frames; 35+36 share)
  const v1 = 6.9, v2 = 10.6;
  const zc = post_ ? v1 * DROP / FPS + v2 * (f - DROP) / FPS : v1 * f / FPS;
  const phase = fh < DROP ? 0.25 + (fh - DROP) / 16 : 0.25 + (fh - DROP) / 12;
  let pulse = 0; for (const b of BEATS) if (f >= b) pulse = Math.max(pulse, Math.exp(-(f - b) / 2.2));
  const hit = post_ ? Math.exp(-(f - DROP) / 3.5) : 0;
  let d;
  if (!post_) d = mix(6.4, 3.0, Math.pow(f / DROP, 0.85));
  else if (f < 62) d = mix(2.0, 1.8, (f - DROP) / 27) - 0.1 * pulse - 0.3 * hit;
  else { const u = (f - 62) / 9; d = 1.8 - 2.05 * u * u; }
  const r = rng(1000 + f);
  const shake = 0.004 + 0.05 * hit + 0.018 * pulse;
  const cam = {
    x: mix(-0.85, -0.12, sst(31, 37, f)) + (r() - 0.5) * shake,
    y: mix(0.34, 0.2, sst(33, 38, f)) + (r() - 0.5) * shake,
    z: zc + d,
    fov: (post_ ? 64 + 5 * hit : mix(46, 50, f / DROP)) + 2.5 * pulse,
    roll: (post_ ? 9 : mix(-3, -6, f / DROP)) * Math.PI / 180 + (r() - 0.5) * shake * 0.8,
  };
  const charX = 0.3;
  const dl = Math.max(d, 1.7);
  cam.target = [mix(charX, cam.x, 0.25), mix(1.22, 0.98, sst(33, 37, f)) + (r() - 0.5) * shake * 2, cam.z - dl];
  const mode = f === DROP ? 1 : f === DROP + 1 ? 2 : 0;
  return {
    f, fh, cam, mode, pulse, hit, post: post_, d,
    chr: {
      root: [charX, 0, zc], phase, mode,
      lean: post_ ? 36 : 22, headPitch: post_ ? 20 : 12, energy: post_ ? 1.08 : 0.92,
      wind: post_ ? 1.5 : 1, scarfLen: post_ ? 1.9 : 1.35, flap: fh * 1.45, hairJit: fh * 2.1,
      shout: post_, inkScale: 1,
    },
    fx: {
      lines: mode ? 1 : post_ ? Math.min(1, 0.42 + 0.6 * hit + 0.5 * pulse) : 0,
      bgBlur: mode ? 0 : post_ ? 0.02 + 0.06 * hit + 0.035 * pulse : 0.005,
      bloom: mode === 1 ? 0.15 : mode === 2 ? 1.0 : post_ ? 1.05 + 0.5 * hit + 0.5 * pulse : 0.85,
      flash: f === DROP + 2 ? 0.45 : f === DROP + 3 ? 0.15 : 0.1 * pulse,
      charBlur: f === DROP + 2 ? 0.05 : 0.22 * sst(63, 69, f),
      ca: 0.0012 + 0.004 * hit + 0.002 * pulse,
      sat: post_ ? 1.18 : 1.05,
      dark: sst(31, 34.5, f) * (post_ ? 0 : 0.25),
    },
  };
}

function speedLines(ctx, tl, focus) {
  ctx.clearRect(0, 0, W, H);
  const a = tl.fx.lines; if (a <= 0) return;
  const r = rng(77 + tl.f * 13);
  const R = Math.hypot(W, H) * 0.62;
  const heavy = tl.mode !== 0;
  const n = heavy ? 150 : Math.round(26 + 60 * a);
  ctx.fillStyle = tl.mode === 1 ? '#000' : tl.mode === 2 ? '#fff' : `rgba(255,255,255,${0.55 + 0.4 * a})`;
  for (let i = 0; i < n; i++) {
    const ang = r() * Math.PI * 2;
    const inner = heavy ? 0.28 + r() * 0.4 : (0.95 - 0.38 * a) - r() * 0.22 + 0.1;
    const w = (heavy ? 0.006 + r() * 0.022 : 0.002 + r() * 0.007);
    const r0 = R * inner, r1 = R * 1.25;
    ctx.beginPath();
    ctx.moveTo(focus.x + Math.cos(ang) * r0, focus.y + Math.sin(ang) * r0);
    ctx.lineTo(focus.x + Math.cos(ang - w) * r1, focus.y + Math.sin(ang - w) * r1);
    ctx.lineTo(focus.x + Math.cos(ang + w) * r1, focus.y + Math.sin(ang + w) * r1);
    ctx.fill();
  }
  if (tl.mode === 0 && tl.post) { // wind streak ticks around the runner
    const r2 = rng(900 + tl.fh);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const ang = r2() * Math.PI * 2, r0 = 230 + r2() * 260, len = 50 + r2() * 110;
      ctx.lineWidth = 2 + r2() * 3.5; ctx.beginPath();
      ctx.moveTo(focus.x + Math.cos(ang) * r0, focus.y + Math.sin(ang) * r0 * 0.9);
      ctx.lineTo(focus.x + Math.cos(ang) * (r0 + len), focus.y + Math.sin(ang) * (r0 + len) * 0.9); ctx.stroke();
    }
  }
}

const vv = new THREE.Vector3();
window.renderFrame = function (f) {
  const t0 = performance.now();
  const tl = timeline(f);
  const c = tl.cam;
  camera.fov = c.fov; camera.updateProjectionMatrix();
  camera.position.set(c.x, c.y, c.z);
  camera.up.set(0, 1, 0); camera.lookAt(c.target[0], c.target[1], c.target[2]);
  camera.rotateZ(c.roll);
  camera.updateMatrixWorld(true);
  const focal = (H / 2) / Math.tan(c.fov * Math.PI / 360);
  const proj = p => {
    vv.set(p[0], p[1], p[2]).applyMatrix4(camera.matrixWorldInverse);
    const z = -vv.z, s = focal / Math.max(z, 1e-3);
    return { x: W / 2 + vv.x * s, y: H / 2 - vv.y * s, s, z };
  };
  for (const x of [cctx, fctx]) { x.setTransform(1, 0, 0, 1, 0, 0); x.lineCap = 'round'; x.lineJoin = 'round'; x.lineWidth = 1; x.globalAlpha = 1; }
  cctx.clearRect(0, 0, W, H);
  const chest = drawCharacter(cctx, tl.chr, proj);
  const focus = { x: Math.min(W * 0.85, Math.max(W * 0.15, chest.x)), y: Math.min(H * 0.8, Math.max(H * 0.2, chest.y - 0.25 * chest.s)) };
  speedLines(fctx, tl, focus);
  charTex.needsUpdate = true; fxTex.needsUpdate = true;

  shared.uCam.value.copy(camera.position);
  post.render(scene, camera, ndMaterial, {
    mode: tl.mode, focus: [focus.x / W, 1 - focus.y / H], bgBlur: tl.fx.bgBlur, bloom: tl.fx.bloom,
    flash: tl.fx.flash, ca: tl.fx.ca, sat: tl.fx.sat, seed: f * 1.618 + 3.1, dark: tl.fx.dark,
    charBlur: tl.fx.charBlur, charFog: Math.min(0.3, Math.max(0, (tl.d - 3) * 0.045)),
  });
  gl.finish();
  return performance.now() - t0;
};
window.canvasPNG = () => canvas.toDataURL('image/png');
console.log('renderer: ' + window.gpuInfo);
window.ready = true;
