// Procedural retro-future station corridor: flat cel-shaded surfaces with hard light cones,
// chunky ribs, neon strips, space windows, CRT signage and katakana stencils.
import * as THREE from 'three';

export const M = 4; // module length (m)
export const shared = {
  uCam: { value: new THREE.Vector3() },
  uFogCol: { value: new THREE.Color(0.07, 0.27, 0.42) },
  uFogK: { value: 0.03 },
};
const VERT = `
varying vec3 vW; varying vec3 vN; varying vec2 vUv;
void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; vN = normalize(mat3(modelMatrix)*normal); vUv = uv; gl_Position = projectionMatrix*viewMatrix*w; }`;
const FRAG = `
uniform int uKind; uniform vec3 uBase; uniform vec2 uSeam; uniform sampler2D uMap; uniform vec3 uCam; uniform vec3 uFogCol; uniform float uFogK;
varying vec3 vW; varying vec3 vN; varying vec2 vUv;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
void main(){
  vec3 col = uBase; float alpha = 1.0;
  float dist = length(vW-uCam);
  float fog = 1.0-exp(-dist*uFogK);
  if(uKind==0 || uKind==4){
    if(uKind==4){ alpha = texture2D(uMap, vUv).a; if(alpha<0.02) discard; }
    float dz = abs(fract(vW.z/4.0)-0.5)*4.0;
    float hh = 3.4-vW.y;
    float tone = dz < 0.45+hh*0.36 ? 2.0 : (dz < 0.95+hh*0.5 ? 1.0 : 0.0);
    vec3 n = normalize(vN);
    if(n.y > 0.7 && vW.y < 0.2) tone = max(tone, 1.0);
    vec3 lit = tone>1.5 ? vec3(1.18,1.22,1.25) : (tone>0.5 ? vec3(0.66,0.68,0.92) : vec3(0.36,0.33,0.66));
    col = uBase*lit;
    col *= mix(1.0, 0.7, abs(n.z));
    float dc = length(vec2(abs(vW.x)-2.62, vW.y-2.5));
    col += vec3(0.1,0.85,1.0)*(step(dc,0.75)*0.10 + step(dc,0.3)*0.16);
    float dm = length(vec2(abs(vW.x)-2.25, vW.y-0.06));
    col += vec3(1.0,0.15,0.6)*(step(dm,0.9)*0.09 + step(dm,0.35)*0.16);
    if(uSeam.x > 0.0){
      vec2 s = vUv/uSeam; vec2 fw = fwidth(s);
      vec2 dI = 0.5-abs(fract(s)-0.5);
      vec2 ln = (1.0-smoothstep(fw*0.7, fw*1.9, dI))*(1.0-smoothstep(0.12,0.4,fw));
      col *= 1.0-0.6*max(ln.x, ln.y);
      // sparse darker panels for painted-background variety
      float h = hash(floor(s));
      col *= h > 0.8 ? 0.8 : (h < 0.12 ? 1.15 : 1.0);
    }
  } else if(uKind==2){
    col = texture2D(uMap, vUv).rgb;
  } else if(uKind==3){
    vec3 d = normalize(vW-uCam);
    vec2 p = vec2(d.z, d.y)/max(-d.x, 0.04);
    col = mix(vec3(0.02,0.01,0.07), vec3(0.10,0.03,0.22), smoothstep(-0.5,1.2,p.y+0.15*p.x));
    vec2 sp = vec2(atan(d.z, -d.x), d.y)*42.0;
    vec2 c = floor(sp); float h = hash(c);
    vec2 o = vec2(hash(c+3.1), hash(c+7.7))*0.6+0.2;
    col += vec3(1.0,0.95,0.85)*step(0.86,h)*(1.0-smoothstep(0.05,0.16*h,length(fract(sp)-o)));
    vec2 pc = vec2(-2.6, 0.62); float pr = 0.62;
    vec2 q = (p-pc)/pr; q.x *= 0.6; float r = length(q);
    if(r < 1.0){
      float z = sqrt(1.0-r*r);
      float l = dot(normalize(vec3(q, z)), normalize(vec3(0.7,0.5,0.35)));
      float band = sin(q.y*11.0+sin(q.x*3.0)*1.5);
      vec3 pcA = band>0.2 ? vec3(1.0,0.55,0.22) : vec3(0.95,0.36,0.3);
      col = l>0.05 ? pcA : vec3(0.26,0.08,0.3);
      if(l>0.72) col += 0.18;
    }
    float ring = abs(length(vec2(q.x*0.42, q.y*1.9 + q.x*0.5))-0.62);
    if(ring < 0.05 && (r>1.0 || q.y+q.x*0.26<0.0)) col = vec3(0.6,0.95,1.0);
    fog *= 0.25;
  }
  if(uKind==1 || uKind==2) fog *= 0.75;
  col = mix(col, uFogCol, fog);
  gl_FragColor = vec4(col, alpha);
}`;

export const ndMaterial = new THREE.ShaderMaterial({
  side: THREE.DoubleSide,
  vertexShader: `varying vec3 vN; varying float vD; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); vD = -mv.z; vN = normalize(normalMatrix*normal); gl_Position = projectionMatrix*mv; }`,
  fragmentShader: `varying vec3 vN; varying float vD; void main(){ vec3 n = normalize(vN); if(!gl_FrontFacing) n = -n; gl_FragColor = vec4(n*0.5+0.5, vD); }`,
});

const mats = new Map();
function mat(color, kind = 0, seam = [0, 0], map = null) {
  const key = [color, kind, seam, map ? map.uuid : ''].join('|');
  if (mats.has(key)) return mats.get(key);
  const m = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, side: THREE.DoubleSide,
    uniforms: { ...shared, uKind: { value: kind }, uBase: { value: new THREE.Color(color) }, uSeam: { value: new THREE.Vector2(seam[0], seam[1]) }, uMap: { value: map } },
  });
  if (kind === 4) { m.polygonOffset = true; m.polygonOffsetFactor = -2; m.polygonOffsetUnits = -2; }
  mats.set(key, m); return m;
}
function quad(center, u, v, w, h, uvMetric) {
  const g = new THREE.BufferGeometry();
  const C = new THREE.Vector3(...center), U = new THREE.Vector3(...u).multiplyScalar(w / 2), V = new THREE.Vector3(...v).multiplyScalar(h / 2);
  const P = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) => C.clone().addScaledVector(U, a).addScaledVector(V, b));
  const n = new THREE.Vector3(...u).cross(new THREE.Vector3(...v)).normalize();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P.flatMap(p => [p.x, p.y, p.z]), 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 2, 3].flatMap(() => [n.x, n.y, n.z]), 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvMetric ? [0, 0, w, 0, w, h, 0, h] : [0, 0, 1, 0, 1, 1, 0, 1], 2));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  return g;
}
// ---- katakana, hand-stroked (font independent)
const KANA = {
  'ト': [[[0.35, 0.08], [0.35, 0.92]], [[0.35, 0.38], [0.78, 0.6]]],
  'ラ': [[[0.25, 0.12], [0.75, 0.12]], [[0.15, 0.38], [0.85, 0.38], [0.78, 0.62], [0.6, 0.8], [0.35, 0.92]]],
  'ブ': [[[0.12, 0.22], [0.72, 0.22], [0.66, 0.5], [0.5, 0.74], [0.25, 0.92]], [[0.76, 0.02], [0.83, 0.13]], [[0.9, 0.0], [0.97, 0.11]]],
  'ル': [[[0.32, 0.12], [0.32, 0.55], [0.26, 0.75], [0.1, 0.92]], [[0.6, 0.08], [0.6, 0.88], [0.76, 0.8], [0.93, 0.55]]],
  'キ': [[[0.15, 0.32], [0.85, 0.22]], [[0.12, 0.6], [0.88, 0.5]], [[0.42, 0.05], [0.58, 0.95]]],
  'ケ': [[[0.38, 0.08], [0.3, 0.3], [0.12, 0.5]], [[0.3, 0.3], [0.9, 0.3]], [[0.62, 0.3], [0.58, 0.65], [0.4, 0.92]]],
  'ン': [[[0.15, 0.2], [0.36, 0.34]], [[0.12, 0.88], [0.5, 0.78], [0.88, 0.3]]],
};
function kana(ctx, str, x, y, size, lw, color) {
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'square'; ctx.lineJoin = 'miter';
  [...str].forEach((ch, i) => {
    for (const st of KANA[ch]) { ctx.beginPath(); st.forEach((p, j) => { const px = x + (i * 1.08 + p[0]) * size, py = y + p[1] * size; j ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.stroke(); }
  });
}
function canvasTex(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.anisotropy = 8; return t;
}
function signTex(variant) {
  return canvasTex(512, 256, (ctx, w, h) => {
    const cols = ['#ffb428', '#3dffb0', '#ff4fb0'], col = cols[variant];
    ctx.fillStyle = ['#1c0d02', '#02170f', '#1a0314'][variant]; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = col; ctx.lineWidth = 6; ctx.strokeRect(14, 14, w - 28, h - 28);
    ctx.fillStyle = col; ctx.font = 'bold 30px "DejaVu Sans Mono", monospace';
    if (variant === 0) { kana(ctx, 'トラブル', 44, 40, 100, 15, col); ctx.fillText('SECTOR 07 // RING-C', 46, 212); }
    else if (variant === 1) {
      kana(ctx, 'キケン', 40, 34, 78, 12, col);
      ctx.lineWidth = 4; ctx.beginPath(); for (let x = 0; x <= 200; x += 4) { const y = 76 + Math.sin(x * 0.11) * 30 * Math.sin(x * 0.02 + 1); x ? ctx.lineTo(300 + x * 0.9, y) : ctx.moveTo(300, y); } ctx.stroke();
      for (let i = 0; i < 11; i++) ctx.fillRect(44 + i * 40, 222 - (20 + ((i * 37) % 60)), 26, 20 + ((i * 37) % 60));
    } else {
      for (let i = 0; i < 4; i++) { ctx.lineWidth = 18; ctx.beginPath(); ctx.moveTo(60 + i * 70, 50); ctx.lineTo(120 + i * 70, 105); ctx.lineTo(60 + i * 70, 160); ctx.stroke(); }
      ctx.font = 'bold 84px "DejaVu Sans Mono", monospace'; ctx.fillText('07', 368, 136); ctx.font = 'bold 30px "DejaVu Sans Mono", monospace'; ctx.fillText('DOCK >> 144', 46, 214);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.42)'; for (let y = 0; y < h; y += 6) ctx.fillRect(0, y, w, 3);
  });
}

export function buildCorridor(scene) {
  const addMesh = (g, m) => { const o = new THREE.Mesh(g, m); o.frustumCulled = false; scene.add(o); return o; };
  const box = (w, h, d, x, y, z, color, kind = 0, rz = 0, seam = [0, 0]) => { const o = addMesh(new THREE.BoxGeometry(w, h, d), mat(color, kind, seam)); o.position.set(x, y, z); o.rotation.z = rz; o.updateMatrixWorld(); return o; };
  const Z0 = -80, Z1 = 40, ZL = Z1 - Z0, ZC = (Z0 + Z1) / 2;
  const prof = [[-2.2, 0], [2.2, 0], [2.7, 0.9], [2.7, 2.5], [1.7, 3.4], [-1.7, 3.4], [-2.7, 2.5], [-2.7, 0.9]];
  const stripCol = ['#232a55', '#2f3a72', '#3c4a8c', '#2c3468', '#222853', '#2c3468', '#3c4a8c', '#2f3a72'];
  const stripSeam = [[2, 1.1], [4, 0.52], [1, 0.8], [2, 0.67], [4, 0.85], [2, 0.67], [1, 0.8], [4, 0.52]];
  const segs = prof.map((a, i) => {
    const b = prof[(i + 1) % prof.length];
    const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
    const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    let n = [-dy / len, dx / len]; if (n[0] * (0 - mid[0]) + n[1] * (1.7 - mid[1]) < 0) n = [-n[0], -n[1]];
    return { a, b, len, mid, n, ang: Math.atan2(dy, dx), t: [dx / len, dy / len] };
  });
  segs.forEach((s, i) => addMesh(quad([s.mid[0], s.mid[1], ZC], [0, 0, 1], [s.t[0], s.t[1], 0], ZL, s.len, true), mat(stripCol[i], 0, stripSeam[i])));
  // end wall glow
  addMesh(quad([0, 1.7, Z0], [1, 0, 0], [0, 1, 0], 6, 4), mat('#9ffcff', 1));
  // continuous neon strips, pipes, lane paint
  for (const s of [1, -1]) {
    box(0.07, 0.09, ZL, s * 2.64, 2.5, ZC, '#7ffcff', 1);
    box(0.07, 0.07, ZL, s * 2.24, 0.08, ZC, '#ff3fa8', 1);
    const p1 = addMesh(new THREE.CylinderGeometry(0.1, 0.1, ZL, 10), mat('#c25a2c')); p1.rotation.x = Math.PI / 2; p1.position.set(s * 2.0, 3.02, ZC);
    const p2 = addMesh(new THREE.CylinderGeometry(0.06, 0.06, ZL, 8), mat('#3fa3a8')); p2.rotation.x = Math.PI / 2; p2.position.set(s * 2.28, 2.84, ZC);
    box(0.09, 0.006, ZL, s * 1.45, 0.004, ZC, '#8fb6e8');
  }
  const signs = [0, 1, 2].map(signTex);
  const stencil = canvasTex(512, 128, (ctx) => { kana(ctx, 'トラブル', 14, 12, 104, 17, '#fff'); });
  const stencil2 = canvasTex(256, 128, (ctx) => { ctx.fillStyle = '#fff'; ctx.font = 'bold 110px "DejaVu Sans Mono", monospace'; ctx.fillText('C-07', -6, 104); });
  const arrow = canvasTex(128, 256, (ctx) => { ctx.strokeStyle = '#fff'; ctx.lineWidth = 26; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(14, 30 + i * 80); ctx.lineTo(64, 76 + i * 80); ctx.lineTo(114, 30 + i * 80); ctx.stroke(); } });
  for (let i = Math.ceil(Z0 / M) + 1; i < Z1 / M; i++) {
    const z = i * M, zc = z + M / 2, ev = ((i % 2) + 2) % 2 === 0;
    // chunky rib
    segs.forEach((s, k) => {
      if (k === 0) { box(4.4, 0.05, 0.5, 0, 0.025, z, '#3d456f'); box(4.4, 0.012, 0.12, 0, 0.056, z, '#ffc21e'); return; }
      const col = (k === 1 || k === 7) ? '#f07a22' : (k === 4 ? '#39416f' : '#4a5490');
      box(s.len + 0.18, 0.26, 0.46, s.mid[0] + s.n[0] * 0.13, s.mid[1] + s.n[1] * 0.13, z, col, 0, s.ang);
      if (k === 2 || k === 6) { box(0.12, 0.5, 0.56, s.mid[0] + s.n[0] * 0.3, 1.7, z, '#2a3060'); box(0.03, 0.22, 0.08, s.mid[0] + s.n[0] * 0.37, 1.7, z + 0.2, k === 2 ? '#ff5a3c' : '#5dffb0', 1); }
    });
    // ceiling light panel + housing
    box(1.7, 0.1, 1.5, 0, 3.36, zc, '#2a3060');
    box(1.45, 0.04, 1.25, 0, 3.3, zc, '#eaffff', 1);
    // floor lane dashes
    box(0.16, 0.006, 1.6, 0, 0.004, zc, '#ffc21e');
    for (const s of [1, -1]) box(0.3, 0.18, 0.3, s * 2.0, 2.98, z + 1, '#2a3060');
    if (ev) {
      // window (left wall) with chunky frame
      addMesh(quad([-2.69, 1.72, zc], [0, 0, -1], [0, 1, 0], 2.9, 1.25), mat('#000', 3));
      for (const dy of [-0.66, 0.66]) box(0.16, 0.12, 3.1, -2.64, 1.72 + dy, zc, '#565fa0');
      for (const dz of [-1.5, 0, 1.5]) box(0.16, 1.42, dz ? 0.14 : 0.08, -2.64, 1.72, zc + dz, '#565fa0');
      // CRT sign (right wall)
      const v = (((i / 2) % 3) + 3) % 3;
      box(0.3, 1.2, 2.3, 2.6, 1.78, zc, '#252a52');
      addMesh(quad([2.44, 1.78, zc], [0, 0, 1], [0, 1, 0], 2.0, 0.98), mat('#fff', 2, [0, 0], signs[v]));
      box(0.2, 0.08, 0.5, 2.5, 1.12, zc - 0.6, '#ff5a3c', 1);
    } else {
      // left: wall stencil ; right: door alcove
      addMesh(quad([-2.69, 1.75, zc], [0, 0, -1], [0, 1, 0], 2.2, 0.55), mat('#c9d4ff', 4, [0, 0], stencil));
      box(0.14, 2.1, 1.7, 2.66, 1.95, zc, '#1a1d40');
      for (const dz of [-0.9, 0.9]) box(0.2, 2.2, 0.14, 2.62, 1.95, zc + dz, '#f07a22');
      box(0.2, 0.14, 1.94, 2.62, 3.0 - 0.02, zc, '#f07a22');
      addMesh(quad([2.585, 1.9, zc], [0, 0, 1], [0, 1, 0], 1.2, 0.6), mat('#8f98d8', 4, [0, 0], stencil2));
      box(0.05, 0.1, 0.3, 2.56, 2.75, zc, '#ff3050', 1);
      // floor stencil
      addMesh(quad([-0.75, 0.006, zc], [1, 0, 0], [0, 0, -1], 0.7, 1.4), mat('#a8b4ee', 4, [0, 0], arrow));
    }
    // lower slant vents
    for (const s of [1, -1]) box(0.06, 0.5, 1.2, s * 2.42, 0.48, zc, '#1c2046', 0, s * -0.5);
  }
}
