// The coolant plant: one long straight service passage between banks of lagged coolant mains, forty below. White and
// frost-blue pipework rimed with ice, pale steel walls, hazard-yellow valve wheels and edge stripes, a cold mist on the
// floor and deep blue air that swallows the far end. Nothing warm in it until something burns: no indigo and no neon
// (the corridor's), no teal-green (the vault's), no furnace (the machine hall's).
// The passage runs along +Z from a dead end at z = -3 (a sealed hatch); floor at y = 0, walls at x = +-HALF, a rib and
// a lamp every PM metres. On the -X wall at the dead end (z = 0.5; screen right, looking down the passage) is a junction box: the plant's control bus.
//
//   const set = await createPlant(renderer, { width, height });
//   set.update(camera, frame, sync, options) -> { scene, camera, clear, post };   set.light(p, options) -> the light on a figure
//
// The station plays the song here too (WIRING): the bass is the pumps (the flow marks racing along the mains' sight
// glasses), the kick the lamps and their pools on the floor, the drums the floor vents' breath of vapour, the keyboard
// the wall screens, the synth the rime's glitter.
// Cue options (all optional, plain values for this frame):
//   box      0..4                how many of the junction box's lamps are lit (a plug is home in it at >= 1)
//   armed    metres              the charge lamps on the mains' flanges are lit from the dead end out to this z
//   blasts   [{ z, r, k, ice }]  up to 4 lights slamming the walls: at z, reaching r metres, strength k, fire or ice-white
//   dusk     metres              the lamps are dead beyond this z (the dark comes down the passage with the swarm)
//   red      { z, k }            the swarm's own red on everything beyond z
//   wreck    0..1                after the blast: lamps dead, the walls scorched and rimed, smoke for air
//   cards    [{ at, size, res, paint(g, v) }]   effects drawings standing in the passage (engine/fx.js): a square card
//                                `size` metres across at `at`, facing the camera, painted each frame by paint(g, v) on
//                                a canvas `res` pixels across (v = { cx, cy, s }: its centre and pixels per metre);
//                                whatever of the set or the drones is nearer hides it, and no ink line crosses it
//   drones   [...]               machines/drones.js specs
//   wiring   { name: wire }      replace wires of WIRING
//   shadows  [...]               contact shadows (the stage's)
//   post     { ... }             engine/post.js parameters
import * as THREE from "three";
import { createKit, createShadows, canvasTex, aim, hash, clamp, FX } from "./kit.js";
import { kana, latin, scanlines, hazard } from "./sign.js";
import { driveAll } from "../engine/sync.js";
import { createDrones } from "../machines/drones.js";

export const PM = 8, Z0 = -3, Z1 = 176, HALF = 2.4, ROOF = 4.0, BOX = [-(HALF - 0.14), 1.25, 0.5];      // module; the passage's ends; half width; ceiling; the junction box's socket
export const WIRING = {
  pump: { stem: "bass", mode: "env", floor: 0.35, gain: 1.5 },                      // how fast the flow marks run
  lamps: { stem: "kick", mode: "pulse", decay: 0.22, floor: 0.72, gain: 0.4 },      // ceiling lamps and their pools
  vents: { stem: "drums", mode: "pulse", decay: 0.45, floor: 0.4, gain: 0.6 },      // floor vents breathe
  screens: { stem: "keyboard", mode: "pulse", decay: 0.2, floor: 0.85, gain: 0.5 }, // wall screens flare
  rime: { stem: "synth", mode: "env", floor: 0.2, gain: 1.2 },                      // the frost glitters
  thrust: { stem: "drums", mode: "pulse", decay: 0.15, gain: 1 },                   // drones
};

const CHUNK = `
uniform float uLamp, uFlow, uPump, uArm, uBoxN, uWreck, uRime, uRedZ, uRedK, uDusk; uniform vec4 uBlast[4];
float setTone(vec3 W, vec3 N){
  float wob = (vnoise(surf(W, N)*1.3)-0.5)*0.2, tone;
  if(N.y > 0.7 && W.y < 0.3){                                        // the floor: a pool under each lamp
    float dz = abs(fract(W.z/8.0)-0.5)*8.0 + wob*1.5;
    tone = dz < 1.5*(0.55+0.45*uLamp) && abs(W.x) < 1.7 ? 2.0 : (dz < 2.9 ? 1.0 : 0.0);
    tone = min(tone, 2.0-uWreck*1.2);
  } else { float d = N.y + wob*0.6; tone = d > 0.62 ? 2.0 : (d > -0.3 ? 1.0 : 0.0); if(uWreck > 0.5 && tone > 1.5) tone = 1.0; }
  if(W.z > uDusk + wob*3.0) tone = max(0.0, tone-1.0);                // the lamps are dead beyond here
  for(int i=0;i<4;i++){ float d = abs(W.z-uBlast[i].x) + wob*3.0; if(uBlast[i].w > 0.02 && d < uBlast[i].y*(N.y < -0.5 ? 0.7 : 1.0)) tone = max(tone, d < uBlast[i].y*0.5 ? 2.0 : 1.0); }
  return tone;
}
vec3 setExtra(vec3 col, vec3 W, vec3 N, float tone){
  vec2 sv = surf(W, N);
  if(uWreck > 0.0){                                                  // scorch low down, rime high up, in hard patches
    float b = vnoise(sv*0.7+3.1) + 0.5*vnoise(sv*2.3);
    if(b > 1.25-0.5*uWreck) col *= vec3(0.34,0.32,0.38);
    else if(b < 0.25+0.4*uWreck && W.y > 0.9) col = mix(col, vec3(0.86,0.95,1.0), 0.75);
    col *= 1.0-0.35*uWreck;
  }
  vec2 gc = floor(sv*70.0); float gl = step(0.993-0.004*uRime, hash(gc)) * step(0.45, hash(gc+floor(uFrame/3.0)));
  if(tone > 0.5 && W.y > 0.2 && length(W-uCam) < 14.0) col += vec3(0.5,0.65,0.75)*gl*uRime;    // glints in the rime
  for(int i=0;i<4;i++){
    vec4 B = uBlast[i]; if(B.w <= 0.0) continue;
    float d = abs(W.z-B.x) + (vnoise(sv*1.3)-0.5)*0.6, k = d < B.y*0.45 ? 1.0 : (d < B.y ? 0.5 : 0.0);
    vec3 hot = B.z > 0.5 ? vec3(0.75,0.95,1.1) : vec3(1.25,0.62,0.16);
    col = mix(col, col*hot*1.7 + hot*0.34, clamp(k*B.w*1.3, 0.0, 1.0));
  }
  if(uRedK > 0.0 && W.z > uRedZ + (vnoise(sv*0.9)-0.5)*2.0) col = mix(col, col*vec3(1.5,0.42,0.45)+vec3(0.12,0.0,0.02), uRedK);
  return col;
}
float setEmit(vec3 W, int flag){
  if(flag == 1){ float m = step(0.5, fract(W.z*0.9 - uFlow)); return (0.35+0.55*uPump)*(0.45+0.75*m)*(1.0-0.9*uWreck)*(W.z > uDusk ? 0.25 : 1.0); }   // sight glass: flow marks
  if(flag == 2) return W.z > uDusk ? 0.05 : (0.35+0.75*uLamp)*(1.0-0.94*uWreck);                                                               // ceiling lamps
  if(flag == 3) return W.z < uArm ? 1.5 : 0.1;                                                                            // charge lamps on the flanges
  if(flag >= 4 && flag <= 7) return float(flag-3) <= uBoxN + 0.01 ? 1.6 : 0.12;                                           // the junction box's four lamps
  return 1.0;
}
vec3 setSpecial(vec3 W, vec3 d, vec2 uv){ return vec3(0.0); }`;

function signTex() {
  return canvasTex(1024, 384, (c) => {
    const col = "#9fe8ff", bg = "#04141f";
    c.fillStyle = bg; c.fillRect(0, 0, 1024, 384); c.strokeStyle = col; c.lineWidth = 10; c.strokeRect(18, 18, 988, 348);
    hazard(c, 40, 40, 944, 44, "#ffc21e", bg, 56); kana(c, "レイキャク", 60, 112, 112, 15, col); latin(c, "-40", 700, 214, 120, "#ffffff");
    latin(c, "COOLANT PLANT 07 // MAINS A-D", 62, 322, 38, col); scanlines(c, 1024, 384, 0.4, 8);
  });
}

export async function createPlant(renderer, o = {}) {
  const W = o.width ?? 1920, H = o.height ?? 1080;
  const U = { uLamp: { value: 1 }, uFlow: { value: 0 }, uPump: { value: 1 }, uArm: { value: -99 }, uBoxN: { value: 0 }, uWreck: { value: 0 }, uRime: { value: 0.5 }, uRedZ: { value: 999 }, uRedK: { value: 0 }, uDusk: { value: 9999 },
    uBlast: { value: [0, 1, 2, 3].map(() => new THREE.Vector4(0, 0, 0, 0)) } };
  const kit = createKit(CHUNK, U), { mat } = kit, S = kit.shared;
  const AIR = [0.03, 0.085, 0.17], AIR_TOP = [0.015, 0.04, 0.1], SMOKE = [0.30, 0.31, 0.38], SMOKE_TOP = [0.12, 0.12, 0.17];
  S.uFogK.value = 0.02; S.uFogH.value.set(0.6, 3.8);
  S.uKey.value.set(0.2, 0.9, -0.35).normalize(); S.uTintLit.value.setRGB(0.98, 1.06, 1.14); S.uTintMid.value.setRGB(0.42, 0.57, 0.8); S.uTintShade.value.setRGB(0.16, 0.25, 0.5); S.uRim.value.setRGB(0.7, 0.95, 1.0);
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(50, W / H, 0.08, 500);
  const G = { screens: { value: 1 } };
  const steel = "#7fa6c0", steelD = "#4a6a86", slate = "#2c4258", white = "#e9f3f7", ice = "#a9d9ee", haz = "#f4c21f", dark = "#12202e", navy = "#1d3550";
  const stripes = canvasTex(256, 64, (c) => hazard(c, 0, 0, 256, 64, "#f4c21f", "#131c28", 64), { repeat: true });
  const grate = canvasTex(256, 256, (c) => { c.fillStyle = "#3c566e"; c.fillRect(0, 0, 256, 256); c.fillStyle = "#1f3247"; for (let y = 6; y < 256; y += 16) c.fillRect(10, y, 236, 7); c.fillStyle = "#5a7a94"; c.fillRect(0, 0, 256, 5); c.fillRect(0, 0, 5, 256); c.fillRect(124, 0, 8, 256); }, { repeat: true });
  const stencil = (text, color = "#eaf6fb") => canvasTex(1024, 256, (c) => { kana(c, text, 24, 28, 200, 26, color); });
  const stripeMat = mat("#fff", { kind: 10, map: stripes }), grateMat = mat("#fff", { kind: 10, map: grate }), signMat = mat("#fff", { kind: 2, map: signTex(), gain: G.screens });
  const uvq = (b, c, u, v, w, h, m, ru, rv) => { b.quad(c, u, v, w, h, m); const list = b.bins.get(m), uv = list[list.length - 1].attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * ru, uv.getY(i) * rv); };
  const glass = mat("#7fe9ff", { kind: 1, flag: 1 }), lampM = mat("#eefaff", { kind: 1, flag: 2 }), armM = mat("#ffb020", { kind: 1, flag: 3 });

  const b = kit.builder();
  for (let z = Z0 - 5; z < Z1; z += PM) {
    const zc = z + PM / 2, i = Math.round((z - Z0 + 5) / PM);
    // floor: a grated walkway between two hazard edges, plate either side; ceiling: dark, a lamp over the middle
    uvq(b, [0, 0, zc], [1, 0, 0], [0, 0, -1], 2.6, PM, grateMat, 2, 6);
    for (const s of [1, -1]) {
      uvq(b, [s * 1.42, 0.004, zc], [1, 0, 0], [0, 0, -1], 0.24, PM, stripeMat, 1, 8);
      b.quad([s * 1.97, 0, zc], [1, 0, 0], [0, 0, -1], 0.86, PM, mat(slate, { seam: [0.86, 2], seamMode: 2 }));
    }
    b.quad([0, ROOF, zc], [1, 0, 0], [0, 0, 1], 2 * HALF, PM, mat(dark, { paint: 0 }));
    b.box(1.5, 0.14, 2.6, 0, ROOF - 0.08, zc, mat(steelD)); b.box(1.2, 0.05, 2.2, 0, ROOF - 0.17, zc, lampM);
    b.box(0.7, 0.34, PM, 0, ROOF - 0.19, zc + 0.01, mat(navy), { s: [1, 1, 0.34] }); b.cyl(0.13, PM, 0.75, ROOF - 0.2, zc, mat(ice), "z", 8); b.cyl(0.09, PM, -0.8, ROOF - 0.16, zc, mat(haz), "z", 6);
    // the rib: a frame round the passage with hazard stripes on its inner faces
    for (const s of [1, -1]) { b.box(0.3, ROOF, 0.4, s * (HALF - 0.15), ROOF / 2, z, mat(steelD)); uvq(b, [s * (HALF - 0.302), 0.7, z], [0, 0, -s], [0, 1, 0], 0.4, 1.4, stripeMat, 1, 3); }
    b.box(2 * HALF, 0.3, 0.4, 0, ROOF - 0.15, z, mat(steelD));
    for (const s of [1, -1]) {
      const x = s * HALF;
      // the wall: plate below, a dark recess above that the mains run in
      b.quad([x, 0.55, zc], [0, 0, -s], [0, 1, 0], PM, 1.1, mat(steel, { seam: [2, 1.1] }));
      b.quad([x + s * 0.5, 2.55, zc], [0, 0, -s], [0, 1, 0], PM, 2.9, mat(navy, { seam: [4, 1.45] }));
      b.box(0.5, 0.08, PM, x + s * 0.25, 1.1, zc, mat(steelD));
      // the mains: a white lagged one, a frost-blue one with its sight glass, a yellow service line, two low returns
      b.cyl(0.44, PM, x + s * 0.02, 3.05, zc, mat(white, { seam: [1.4, 2] }), "z", 14);
      b.cyl(0.29, PM, x - s * 0.08, 1.98, zc, mat(ice), "z", 12); b.box(0.03, 0.1, PM - 1.2, x - s * 0.375, 1.98, zc, glass);
      b.cyl(0.07, PM, x - s * 0.1, 1.42, zc, mat(haz), "z", 6);
      b.cyl(0.15, PM, x - s * 0.16, 0.42, zc, mat(white), "z", 8); b.cyl(0.11, PM, x - s * 0.2, 0.14, zc, mat(steelD), "z", 8);
      for (const dz of [0, 4]) {
        b.cyl(0.5, 0.16, x + s * 0.02, 3.05, z + dz + 0.6, mat(steelD), "z", 14); b.cyl(0.35, 0.14, x - s * 0.08, 1.98, z + dz + 0.6, mat(steel), "z", 12);
        b.box(0.1, 0.1, 0.1, x - s * 0.4, 2.36, z + dz + 0.6, armM);
        // rime on the flange and icicles under it
        b.ball(0.3, x - s * 0.12, 3.42, z + dz + 0.9, mat(white, { paint: 0 }), { s: [1, 0.35, 1.8] }, 8);
        for (let k = 0; k < 3; k++) { const l = 0.18 + 0.3 * hash(i, s, dz, k); b.cyl(0.001, l, x - s * (0.1 + 0.12 * k), 1.69 - l / 2 + 0.02, z + dz + 0.45 + 0.13 * k, mat(white, { paint: 0 }), "y", 5, 0.035); }
      }
      // a riser with a valve wheel, one side each module
      if ((i + (s > 0 ? 1 : 0)) % 2 === 0) {
        b.cyl(0.16, ROOF - 1.1, x - s * 0.22, (ROOF + 1.1) / 2, z + 2.6, mat(white), "y", 10); b.cyl(0.2, 0.12, x - s * 0.22, 1.5, z + 2.6, mat(steelD), "y", 10);
        b.add(new THREE.TorusGeometry(0.24, 0.035, 6, 18).rotateY(Math.PI / 2), mat(haz), new THREE.Matrix4().makeTranslation(x - s * 0.5, 1.72, z + 2.6)); b.cyl(0.03, 0.3, x - s * 0.38, 1.72, z + 2.6, mat(steelD), "x", 6);
        for (const a of [0, 1, 2]) b.box(0.03, 0.44, 0.03, x - s * 0.5, 1.72, z + 2.6, mat(haz), { rx: a * Math.PI / 3 });
      } else if (s < 0 && i % 4 === 1) {      // a wall screen and the plant's name stencilled by it
        b.box(0.3, 0.78, 1.9, x + 0.2, 1.72, z + 5.6, mat("#cfd6d2")); b.quad([x + 0.355, 1.72, z + 5.6], [0, 0, -1], [0, 1, 0], 1.72, 0.64, signMat);
      } else b.quad([x - s * 0.006, 0.62, z + 5.4], [0, 0, s], [0, 1, 0], 2.6, 0.65, mat("#eaf6fb", { kind: 4, map: (b.st ??= stencil("レイキャク")) }));
      // a floor vent
      b.box(0.5, 0.06, 0.9, s * 1.95, 0.03, z + 6.6, mat(dark, { paint: 0 }));
    }
  }
  // the dead end: a sealed hatch in a hazard ring
  b.box(2 * HALF + 1, ROOF, 0.4, 0, ROOF / 2, Z0 - 0.2, mat(steelD, { seam: [1.6, 1.33], seamMode: 2 }));
  b.cyl(1.5, 0.2, 0, 1.75, Z0 + 0.05, mat(haz), "z", 24); b.cyl(1.3, 0.24, 0, 1.75, Z0 + 0.06, mat(steel), "z", 24); b.cyl(0.4, 0.3, 0, 1.75, Z0 + 0.08, mat(steelD), "z", 12);
  for (const a of [0, 1, 2]) b.box(2.2, 0.12, 0.3, 0, 1.75, Z0 + 0.1, mat(steelD), { rz: a * Math.PI / 3 });
  b.quad([0, 3.55, Z0 + 0.01], [1, 0, 0], [0, 1, 0], 1.9, 0.48, mat("#f4c21f", { kind: 4, map: stencil("キケン  ", "#f4c21f") }));
  // the junction box on the right wall: a yellow-framed cabinet, a socket, four lamps, armoured conduit up to the mains
  { const [bx, by, bz] = BOX, m = (c, o2) => mat(c, o2), wx = -HALF;
    b.box(0.3, 1.5, 1.3, wx + 0.02, by + 0.1, bz, m(haz)); b.box(0.3, 1.3, 1.1, wx + 0.06, by + 0.1, bz, m("#cfd6d2")); b.box(0.06, 0.34, 1.1, wx + 0.2, by + 0.72, bz, stripeMat);
    b.cyl(0.17, 0.12, bx + 0.04, by, bz, m(steelD), "x", 16); b.cyl(0.11, 0.14, bx + 0.05, by, bz, m(dark, { paint: 0 }), "x", 14);
    [0, 1, 2, 3].forEach((k) => { b.box(0.06, 0.1, 0.13, bx + 0.05, by + 0.27, bz + 0.33 - k * 0.22, mat(k === 3 ? "#ff3b30" : "#58ff8e", { kind: 1, flag: 4 + k })); });
    b.box(0.05, 0.2, 0.5, bx + 0.05, by - 0.42, bz, m(dark, { paint: 0 }));
    b.cyl(0.07, ROOF - by - 1.6, wx + 0.12, (ROOF + by - 0.1) / 2 + 0.25, bz - 0.5, m(haz), "y", 8);
  }
  scene.add(b.build());

  // vapour: flat two-tone puffs off the floor vents, and a mist that lies along the floor
  const puffTex = canvasTex(128, 128, (c) => { c.fillStyle = "#fff"; for (const [x, y, r] of [[64, 70, 40], [38, 60, 26], [92, 62, 28], [60, 40, 28]]) { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); } c.fillStyle = "#b9d6ea"; for (const [x, y, r] of [[70, 84, 26], [44, 72, 16], [94, 74, 18]]) { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); } });
  const puffs = Array.from({ length: 22 }, () => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), null); m.layers.set(FX); m.renderOrder = 9; m.frustumCulled = false; scene.add(m); return m; });
  const drones = createDrones(kit, scene), shadows = createShadows(kit, scene, "#0a1626");
  // effects cards: canvases the shot paints, standing in the scene at their own depth
  const cards = [], card = (i, res) => {
    let c = cards[i]; if (c && c.res !== res) { scene.remove(c.mesh); c.tex.dispose(); c = null; }
    if (!c) {
      const cv = new OffscreenCanvas(res, res), tex = new THREE.CanvasTexture(cv); tex.premultiplyAlpha = true; tex.generateMipmaps = false; tex.minFilter = tex.magFilter = THREE.LinearFilter;
      const m = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, toneMapped: false, side: THREE.DoubleSide, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), m); mesh.layers.set(FX); mesh.frustumCulled = false; scene.add(mesh); c = cards[i] = { cv, g: cv.getContext("2d"), tex, mesh, res };
    }
    return c;
  };
  const flowed = [0], flowAt = (sync, f, wire) => { f = Math.max(0, Math.round(f)); for (let k = flowed.length; k <= f; k++) flowed[k] = flowed[k - 1] + sync.drive(wire, k) / sync.fps; return flowed[f]; };

  function update(cam, frame, sync, opt = {}) {
    const w = driveAll(sync, WIRING, frame, opt.wiring), wreck = clamp(opt.wreck ?? 0);
    aim(camera, cam, W / H);
    S.uCam.value.copy(camera.position); S.uFrame.value = frame;
    S.uFogCol.value.setRGB(...AIR.map((v, i) => v + (SMOKE[i] - v) * wreck)); S.uFogTop.value.setRGB(...AIR_TOP.map((v, i) => v + (SMOKE_TOP[i] - v) * wreck)); S.uFogDeep.value.copy(S.uFogCol.value); S.uFogK.value = (opt.fogK ?? 0.02) + 0.025 * wreck;
    U.uLamp.value = clamp(w.lamps, 0, 1.2); U.uPump.value = clamp(w.pump, 0, 1.4); U.uFlow.value = flowAt(sync, frame, opt.wiring?.pump ?? WIRING.pump) * 2.2; U.uRime.value = clamp(w.rime, 0, 1.2);
    U.uDusk.value = opt.dusk ?? 9999; U.uArm.value = opt.armed ?? -99; U.uBoxN.value = opt.box ?? 0; U.uWreck.value = wreck; U.uRedZ.value = opt.red?.z ?? 999; U.uRedK.value = clamp(opt.red?.k ?? 0);
    G.screens.value = w.screens * (1 - 0.9 * wreck);
    U.uBlast.value.forEach((v, i) => { const B = opt.blasts?.[i]; if (B) v.set(B.z, B.r ?? 12, B.ice ? 1 : 0, B.k ?? 1); else v.set(0, 0, 0, 0); });
    puffs.forEach((m, i) => {
      const low = i >= 8, period = low ? 150 + 60 * hash(i, 3) : 44 + 26 * hash(i, 3), ph = frame + hash(i, 5) * 400, age = (ph % period) / period, n = Math.floor(ph / period);
      const s = hash(i, 1) > 0.5 ? 1 : -1, zb = Math.round((cam.pos[2] + 4 + (hash(i, n, 2)) * 44) / PM) * PM + Z0 - 5 + 6.6 - Math.round((Z0 - 5) / PM) * PM;
      if (low) { m.position.set((hash(i, n, 4) - 0.5) * 3.6, 0.22 + 0.2 * hash(i, 7), cam.pos[2] + 3 + hash(i, n, 2) * 50 + age * 2.5); const k = 1.6 + 1.6 * hash(i, 6); m.scale.set(k * 2.6, k * 0.55, 1); }
      else { m.position.set(s * (1.95 - 0.5 * age), 0.1 + age * 2.1, zb); const k = (0.5 + 1.7 * age) * (0.7 + 0.6 * hash(i, 6)); m.scale.set(k * 1.25, k, 1); }
      m.quaternion.copy(camera.quaternion);
      const al = Math.round(clamp((low ? 0.3 : w.vents * 0.55) * Math.sin(Math.PI * Math.min(1, age * 1.15)) * (1 - wreck)) * 8) / 8; m.visible = al > 0; m.material = mat("#e4f4ff", { kind: 7, flag: 2, map: puffTex, alpha: al, fog: 0.6 });
    });
    drones.update(opt.drones ?? [], frame, sync, camera, { thrust: w.thrust }); shadows.update(opt.shadows);
    const list = (opt.cards ?? []).slice().sort((a, b2) => Math.hypot(b2.at[0] - cam.pos[0], b2.at[1] - cam.pos[1], b2.at[2] - cam.pos[2]) - Math.hypot(a.at[0] - cam.pos[0], a.at[1] - cam.pos[1], a.at[2] - cam.pos[2]));
    list.forEach((cd, i) => { const res = cd.res ?? 1024, c = card(i, res); c.g.setTransform(1, 0, 0, 1, 0, 0); c.g.clearRect(0, 0, res, res); cd.paint(c.g, { cx: res / 2, cy: res / 2, s: res / cd.size }); c.tex.needsUpdate = true;
      c.mesh.visible = true; c.mesh.position.set(...cd.at); c.mesh.quaternion.copy(camera.quaternion); c.mesh.scale.set(cd.size, cd.size, 1); c.mesh.renderOrder = 20 + i; });
    for (let i = list.length; i < cards.length; i++) if (cards[i]) cards[i].mesh.visible = false;
    const air = S.uFogCol.value;
    return { scene, camera, wires: w, clear: opt.clear ?? new THREE.Color(air.r * 0.8, air.g * 0.8, air.b * 0.8).getHex(), post: { bloom: 0.7, bloomThreshold: 0.76, shadowTint: [0.0, 0.02, 0.06], ...opt.post } };
  }
  // The light on a figure in the passage: cold and even, a pale rim from the lamps overhead.
  const light = () => ({ tint: [0.84, 0.94, 1.02], rim: [0.75, 0.95, 1.0], from: [0, 1, 0], fogK: S.uFogK.value * 0.5, fogColor: S.uFogCol.value.toArray(), gradient: 0.12 });
  const floorAt = () => 0;
  return { name: "plant", scene, camera, kit, update, light, floorAt, WIRING, PM };
}
