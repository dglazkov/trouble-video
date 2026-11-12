// The shaft: what is under the bridge when its floor lets go. A square well straight down through the whole station,
// its four walls cut open on one storey after another, so that falling down it is a vertical tracking shot through the
// film in reverse: the frost-blue plant, the violet core, the sea-green tunnel, the market's lanterns, the corridor,
// the machine hall's furnaces, the stairwell, the atrium's rings, the vault's green screens; under them a place nobody
// has been, twice, the second time nearly dark; and under that nothing (sets/shaftplan.js has the plan).
//
// THE PLACES ARE PAINTED (sets/painted.js says why; sets/shaft/NAME.webp are the paintings, each with its sidecar:
// one cross-section a place, painted over a still of that place for its palette and its shapes). A painting is not
// stuck on the wall: each opening is a ROOM behind the wall, DEPTH deep, with the painting on its back wall and its
// floor, ceiling and sides carried forward from the painting's own edges, and the wall's shader finds, for every pixel
// of an opening, where the line of sight lands in that room. So a room slides behind its opening as the camera
// passes, and from above one looks down onto a stack of lit floors. Nearer than the paintings, and sliding against
// them: the slabs' ledges, the corner posts, cable runs with a bracket every few metres (what still passes when the
// places have stopped), all plain flat shapes. Nothing here is in the ink buffer: the place is a painting with a
// rostrum camera falling past it, and the four are laid over it.
//
//   const set = await createShaft(renderer, { width, height });
//   const { scene, camera, clear, post } = set.update(camera, frame, sync, options);
//   set.light([x, y, z]) -> the light a figure there is in
//
// The station plays the song here too (WIRING): the strings drive the places' light (every room glows with them, and
// throws that light on whoever passes); the bass drives the shaft itself: a slow heavy pulse in the lamps along every slab.
// Cue options (all optional, plain values for this frame):
//   rooms    0..2    the places' light, instead of the strings' wire
//   lamps    0..2    the slabs' lamps, instead of the bass's wire
//   fog      per metre: how fast the shaft sinks into the dark with distance (default 0.011)
//   hatch    0..1    how bright the hatch at the top is (default 1; 0: no deck over the shaft at all, it is open to whatever the shot paints above it);  sky [r, g, b]: what shows through it (default SKY)
//   wiring, post, clear   as in the other sets
import * as THREE from "three";
import { aim, clamp, FX } from "./kit.js";
import { driveAll } from "../engine/sync.js";
import { R, OPEN, SLAB, L, TOP, DEPTH, PLACES, N, glowAt } from "./shaftplan.js";
export * from "./shaftplan.js";

export const WIRING = {
  rooms: { stem: "strings", mode: "env", floor: 0.72, gain: 0.5 },      // the places' light
  lamps: { stem: "bass", mode: "env", floor: 0.15, gain: 1.1 },         // the shaft's own pulse
};
export const DARK = [0.012, 0.016, 0.04];
export const SKY = [0.95, 0.5, 0.62];      // what shows through the hatch: the atrium at night with its alarm on
const COLS = 2, ROWS = Math.ceil(N / COLS), CW = 2048, CH = 1152;
const f = (x) => x.toFixed(3);

const WALL_VS = `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`;
const COMMON = `uniform vec3 uDark, uSky; uniform float uFog, uRooms, uLamps, uFrame;
float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*0.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
vec3 sink(vec3 c, float dist){ return mix(uDark, c, exp(-dist*uFog)); }`;
const WALL_FS = `${COMMON}
uniform sampler2D tMap; uniform vec3 uT, uN; varying vec3 vW;
vec3 room(float i, vec2 uv, vec2 gx, vec2 gy){
  vec2 cell = vec2(mod(i, ${f(COLS)}), floor(i/${f(COLS)}));
  vec2 a = (cell + clamp(uv, 0.004, 0.996))/vec2(${f(COLS)}, ${f(ROWS)}); a.y = 1.0-a.y;
  return textureGrad(tMap, a, gx/vec2(${f(COLS)}, ${f(ROWS)}), gy/vec2(${f(COLS)}, ${f(ROWS)})).rgb;
}
void main(){
  vec3 d = normalize(vW - cameraPosition); float dist = length(vW - cameraPosition);
  float u = dot(vW, uT), lv = (-vW.y - ${f(TOP)})/${f(L)}, i = floor(lv), fy = (lv - i)*${f(L)};
  vec3 col;
  if(i >= 0.0 && i < ${f(N + 1)} && fy < ${f(OPEN)}){
    // an opening: the room behind it
    float b = ${f(OPEN)} - fy, dn = max(dot(d, uN), 1e-4); vec2 s = vec2(dot(d, uT), d.y)/dn;
    float zs = s.x > 1e-5 ? (${f(R)} - u)/s.x : (s.x < -1e-5 ? (-${f(R)} - u)/s.x : 1e9);
    float zf = s.y < -1e-5 ? -b/s.y : (s.y > 1e-5 ? (${f(OPEN)} - b)/s.y : 1e9);
    float z = min(${f(DEPTH)}, min(zs, zf)), k = 1.0 - z/${f(DEPTH)};
    vec2 h = vec2(u, b) + s*z, uv = vec2(h.x/${f(2 * R)} + 0.5, 1.0 - h.y/${f(OPEN)});      // v down the painting
    float shade = 1.0;
    if(z < ${f(DEPTH)} - 1e-4){
      if(zf < zs){ if(s.y < 0.0){ uv.y = 1.0 - 0.1*k; shade = 0.95 - 0.2*k; } else { uv.y = 0.1*k; shade = 0.7 - 0.25*k; } }
      else { uv.x = s.x > 0.0 ? 1.0 - 0.06*k : 0.06*k; shade = 0.78 - 0.25*k; }
    }
    vec2 flat_ = vec2(u/${f(2 * R)}, fy/${f(OPEN)}), gx = dFdx(flat_), gy = dFdy(flat_);
    float j = min(i, ${f(N - 1)});
    if(i > ${f(N - 0.5)}) uv.x = 1.0 - uv.x;      // the last place again, the other way round and nearly dark
    col = room(j, uv, gx, gy)*shade*uRooms*(i > ${f(N - 0.5)} ? 0.34 : 1.0);
    col += col*col*0.25*uRooms;      // what is bright in a room burns a little
  } else {
    // the shaft's own wall: plates, a seam every four metres; on a slab a lip of light metal and a row of lamps
    float below = clamp((i - ${f(N)})/3.0, 0.0, 1.0);
    vec3 steel = mix(vec3(0.085, 0.095, 0.16), vec3(0.03, 0.035, 0.07), below);
    float seam = step(0.97, fract(u/4.0 + 0.5)) + step(0.985, fract(vW.y/2.75));
    col = steel*(1.0 - 0.45*min(1.0, seam)) * (0.75 + 0.5*hash(floor(vec2(u/4.0 + 0.5, vW.y/2.75))));
    if(i < 0.0){ float t = smoothstep(-${f(TOP)}, 0.0, vW.y); col = mix(col, col*2.6 + uSky*0.1, t);      // the collar: the atrium's light down it from the hatch
      if(vW.y > -0.45) col = fract((u + vW.y)/1.6) < 0.5 ? vec3(0.88, 0.69, 0.16) : vec3(0.09, 0.08, 0.16); }
    else if(i < ${f(N + 1)}){
      float sy = fy - ${f(OPEN)};      // 0 at the slab's top edge (a room's floor), SLAB at its foot (the next room's ceiling)
      if(sy < 0.22) col = vec3(0.36, 0.38, 0.5); else if(sy > ${f(SLAB)} - 0.16) col = vec3(0.05, 0.05, 0.1);
      float lx = fract(u/2.0 + 0.5), lamp = step(0.3, lx)*step(lx, 0.7)*step(0.82, sy)*step(sy, 1.2);
      col = mix(col, vec3(1.0, 0.86, 0.6)*(0.18 + uLamps), lamp);
      col += vec3(1.0, 0.8, 0.5)*0.05*uLamps*exp(-abs(sy - 1.0)*2.2);
    } else {
      // below the last of them: no rooms; a lamp here and there, most of them out
      vec2 c = floor(vec2(u/2.0 + 0.5, vW.y/2.75)); float r = hash(c + 7.0);
      vec2 q = fract(vec2(u/2.0 + 0.5, vW.y/2.75)); float lamp = step(0.955, r)*step(0.42, q.x)*step(q.x, 0.58)*step(0.44, q.y)*step(q.y, 0.56);
      col = mix(col, (r > 0.985 ? vec3(1.0, 0.25, 0.2) : vec3(0.3, 0.9, 0.8))*(0.5 + 0.5*uLamps), lamp);
    }
  }
  gl_FragColor = vec4(sink(col, dist), 1.0);
}`;
// plain flat shapes nearer than the walls: a colour per vertex, sunk into the dark with distance
const FLAT_VS = `attribute vec3 color; varying vec3 vC; varying vec3 vW; void main(){ vC = color; vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`;
const FLAT_FS = `${COMMON} varying vec3 vC; varying vec3 vW;
void main(){ vec3 c = vC; if(c.r > 1.5) c = vec3(1.0, 0.86, 0.6)*(0.18 + uLamps); gl_FragColor = vec4(sink(c, length(vW - cameraPosition)), 1.0); }`;
// the hatch: the underside of the bridge's deck, and the square of the atrium's light they fell through
const HATCH_FS = `${COMMON} uniform float uHatch; varying vec3 vW;
void main(){ if(uHatch <= 0.0) discard; vec2 p = abs(vW.xz); float in_ = step(max(p.x, p.y), 3.4), rim = step(max(p.x, p.y), 3.9);
  vec3 deck = vec3(0.07, 0.08, 0.14)*(0.8 + 0.4*step(0.9, fract(vW.x/2.0)));
  vec3 c = mix(deck, vec3(0.2, 0.22, 0.3), rim); c = mix(c, uSky*1.25*uHatch, in_);
  float dist = length(vW - cameraPosition); gl_FragColor = vec4(mix(sink(c, dist), c, in_*0.85), 1.0); }`;

export async function createShaft(renderer, o = {}) {
  const W = o.width ?? 1920, H = o.height ?? 1080;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(40, W / H, 0.08, 3000);
  const U = { uDark: { value: new THREE.Vector3(...DARK) }, uFog: { value: 0.011 }, uRooms: { value: 1 }, uLamps: { value: 1 }, uFrame: { value: 0 }, uHatch: { value: 1 }, uSky: { value: new THREE.Vector3(...SKY) } };
  // the paintings, in one sheet
  const sheet = document.createElement("canvas"); sheet.width = COLS * CW; sheet.height = ROWS * CH;
  const g = sheet.getContext("2d");
  await Promise.all(PLACES.map(async (p, i) => { const im = new Image(); im.src = `/sets/shaft/${p.name}.webp`; await im.decode(); g.drawImage(im, (i % COLS) * CW, Math.floor(i / COLS) * CH, CW, CH); }));
  const map = new THREE.CanvasTexture(sheet); map.generateMipmaps = true; map.minFilter = THREE.LinearMipmapLinearFilter; map.magFilter = THREE.LinearFilter; map.anisotropy = 8;
  const YT = 0, YB = -1400, fx = (m, order = 0) => { m.layers.set(FX); m.frustumCulled = false; m.renderOrder = order; scene.add(m); return m; };
  // the four walls
  for (let k = 0; k < 4; k++) {
    const a = k * Math.PI / 2, Nn = new THREE.Vector3(Math.sin(a), 0, Math.cos(a)), T = new THREE.Vector3(Math.cos(a), 0, -Math.sin(a));
    const P = (u, y) => [Nn.x * R + T.x * u, y, Nn.z * R + T.z * u], geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute([P(-R, YT), P(R, YT), P(R, YB), P(-R, YT), P(R, YB), P(-R, YB)].flat(), 3));
    fx(new THREE.Mesh(geo, new THREE.ShaderMaterial({ vertexShader: WALL_VS, fragmentShader: WALL_FS, side: THREE.DoubleSide, uniforms: { ...U, tMap: { value: map }, uT: { value: T }, uN: { value: Nn } } })));
  }
  // flat shapes: ledges at every slab, corner posts, cable runs and their brackets
  {
    const pos = [], col = [], box = (cx, cy, cz, sx, sy, sz, c, top = c) => {
      const x0 = cx - sx / 2, x1 = cx + sx / 2, y0 = cy - sy / 2, y1 = cy + sy / 2, z0 = cz - sz / 2, z1 = cz + sz / 2;
      const q = (a, b, c2, d, cc) => { for (const p of [a, b, c2, a, c2, d]) { pos.push(...p); col.push(...cc); } };
      q([x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], c); q([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], c);
      q([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], c); q([x1, y0, z0], [x1, y0, z1], [x1, y1, z1], [x1, y1, z0], c);
      q([x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], top); q([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], c.map((v) => v * 0.5));
    };
    const steel = [0.07, 0.08, 0.14], lip = [0.3, 0.32, 0.44], post = [0.05, 0.055, 0.1], LAMP = [2, 2, 2];
    for (let i = 0; i <= N + 1; i++) {
      const y = -(TOP + i * L) + SLAB / 2 + (i ? 0 : 0);      // the slab over level i's opening
      for (const s of [1, -1]) { box(0, y - 0.2, s * (R - 0.35), 2 * R, 0.5, 0.7, steel, lip); box(s * (R - 0.35), y - 0.2, 0, 0.7, 0.5, 2 * R, steel, lip); }
      for (const s of [1, -1]) for (let x = -6; x <= 6; x += 4) { box(x, y - 0.2, s * (R - 0.72), 1.1, 0.16, 0.06, LAMP); box(s * (R - 0.72), y - 0.2, x, 0.06, 0.16, 1.1, LAMP); }
    }
    for (const sx of [1, -1]) for (const sz of [1, -1]) box(sx * (R - 0.45), (YT + YB) / 2, sz * (R - 0.45), 0.9, YT - YB, 0.9, post);
    // cable runs down two walls, a rail down the other two; a bracket every 5.5 m
    const runs = [[-3.1, R - 0.55, 0.16], [-2.7, R - 0.5, 0.1], [4.6, R - 0.6, 0.22], [2.2, -(R - 0.55), 0.14], [-5.2, -(R - 0.5), 0.2]];
    for (const [x, z, t] of runs) { box(x, (YT + YB) / 2, z, t, YT - YB, t, [0.03, 0.03, 0.06]); box(z, (YT + YB) / 2, x, t, YT - YB, t, [0.03, 0.03, 0.06]); }
    for (let y = -3; y > -700; y -= 5.5) for (const [x, z] of [[-2.9, R - 0.5], [4.6, R - 0.55], [2.2, -(R - 0.5)], [-5.2, -(R - 0.45)]]) { box(x, y, z, 0.9, 0.22, 0.5, [0.16, 0.17, 0.26], [0.3, 0.32, 0.44]); box(z, y - 2.2, x, 0.5, 0.22, 0.9, [0.16, 0.17, 0.26], [0.3, 0.32, 0.44]); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    const m = new THREE.ShaderMaterial({ vertexShader: FLAT_VS, fragmentShader: FLAT_FS, uniforms: U, side: THREE.DoubleSide });
    fx(new THREE.Mesh(geo, m), 1);
  }
  fx(new THREE.Mesh(new THREE.PlaneGeometry(2 * R, 2 * R).rotateX(Math.PI / 2), new THREE.ShaderMaterial({ vertexShader: WALL_VS, fragmentShader: HATCH_FS, uniforms: U, side: THREE.DoubleSide })), 2);

  function update(cam, frame, sync, opt = {}) {
    const w = driveAll(sync, WIRING, frame, opt.wiring);
    aim(camera, { near: 0.08, far: 3000, ...cam }, W / H);
    U.uRooms.value = clamp(opt.rooms ?? w.rooms, 0, 2); U.uLamps.value = clamp(opt.lamps ?? w.lamps, 0, 2); U.uFog.value = opt.fog ?? 0.011; U.uFrame.value = frame; U.uHatch.value = opt.hatch ?? 1; U.uSky.value.set(...(opt.sky ?? SKY));
    return { scene, camera, wires: w, clear: opt.clear ?? 0x03040a, post: { ink: 0, bloom: 0.8, bloomThreshold: 0.7, diffusion: 0.2, contrast: 0.3, sat: 1.08, shadowTint: [0.012, 0.012, 0.045], ...opt.post } };
  }
  // The light on a figure at p: the glow of the place it is passing, as much of it as the strings give.
  function light(p, opt = {}) {
    const { glow, k } = glowAt(p[1]), a = clamp(0.55 + 0.45 * k * (opt.rooms ?? 1));
    return { tint: glow.map((v) => a * (0.55 + 0.45 * v)), rim: glow.map((v) => v * k), from: [0, -0.3, 1], fogK: 0, gradient: 0 };
  }
  return { name: "shaft", scene, camera, update, light, floorAt: () => null, WIRING };
}
