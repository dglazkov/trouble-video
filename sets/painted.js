// Painted backgrounds in a set: a vista that is a painting, not geometry, and still has depth.
//
// The method (sets/atrium.js is the first to use it):
//   1. The set keeps a BLOCKOUT of the place, plain boxes, and one HERO camera the vista is seen from. A guide is
//      rendered from it with a wider lens than the film's (shots/atrium_plate.js), so the painting has margin.
//   2. The view is painted over that guide at design time (sets/paint.py; Nano Banana), then painted again as LAYERS:
//      the far plate with everything nearer taken out, the nearer things cut off the whole painting (paint.py cut),
//      each in every state the shot needs (day, alarm). They are judged at full size and then frozen in sets/NAME/,
//      each with a sidecar saying how it was made. Nothing is generated when the film renders.
//   3. In the set each layer is PROJECTED from the hero camera onto stand-ins at the right distances (the blockout's
//      own wall, a card through the tower, a slab for each bridge). From the hero camera the picture is exactly the
//      painting; from anywhere near it the layers slide against each other as the real place would.
//   4. What moves or must stay crisp is not painted: screens, beacons, craft, haze, and whatever the characters touch
//      (the gantry, the doorway) are the set's own geometry, drawn over the painting with the same camera.
// A painted layer is not in the ink buffer (kit.js FX layer): no ink line is drawn over it and it hides no cel.
import * as THREE from "three";
import { FX } from "./kit.js";

// The hero camera as a projector: { pos, target, fov (vertical, the WIDE lens the painting was made with), aspect }.
// matrix: world -> the painting's clip space; ray(u, v): the world ray through a point of the painting (uv, v up).
export function projector(hero, aspect = 16 / 9) {
  const cam = new THREE.PerspectiveCamera(hero.fov, aspect, 0.1, 2000);
  cam.position.set(...hero.pos); cam.lookAt(...hero.target); cam.updateMatrixWorld(true); cam.updateProjectionMatrix();
  const matrix = new THREE.Matrix4().multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse), inv = matrix.clone().invert(), pos = cam.position.clone();
  const ray = (u, v) => ({ o: pos.clone(), d: new THREE.Vector3(u * 2 - 1, v * 2 - 1, 0.5).applyMatrix4(inv).sub(pos).normalize() });
  return { matrix, pos, ray, dir: new THREE.Vector3(...hero.target).sub(pos).normalize() };
}
// A frozen painting as a texture (straight alpha). mirror: outside the picture it goes on, mirrored (a far plate seen
// from where the hero camera never looked).
export const loadPainting = (url, o = {}) => new Promise((res, rej) => new THREE.TextureLoader().load(url, (t) => {
  t.anisotropy = 8; t.wrapS = t.wrapT = o.mirror ? THREE.MirroredRepeatWrapping : THREE.ClampToEdgeWrapping; t.premultiplyAlpha = false; res(t);
}, undefined, () => rej(new Error("painting not found: " + url))));
// Common to every material drawn into a painted vista: laid down in order (renderOrder), far to near, before the
// set's geometry, with no depth of its own, and kept out of the ink buffer.
export function painted(material, mesh, order) {
  material.depthTest = false; material.depthWrite = false; material.transparent = false; material.side = THREE.DoubleSide;
  material.blending = THREE.CustomBlending; material.blendSrc = THREE.OneFactor; material.blendDst = THREE.OneMinusSrcAlphaFactor; material.blendSrcAlpha = THREE.OneFactor; material.blendDstAlpha = THREE.OneMinusSrcAlphaFactor;
  if (mesh) { mesh.layers.set(FX); mesh.renderOrder = order; mesh.frustumCulled = false; }
  return material;
}
export const PROJECT_VS = `varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`;

// The 3x3 that takes four points to four points (a quadrilateral of the painting to a screen's own picture).
export function homography(from, to) {
  const A = [], b = [];
  for (let i = 0; i < 4; i++) { const [x, y] = from[i], [u, v] = to[i]; A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u); A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v); }
  for (let c = 0; c < 8; c++) {      // Gauss-Jordan
    let p = c; for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
    [A[c], A[p]] = [A[p], A[c]]; [b[c], b[p]] = [b[p], b[c]];
    for (let r = 0; r < 8; r++) { if (r === c) continue; const k = A[r][c] / A[c][c]; for (let j = c; j < 8; j++) A[r][j] -= k * A[c][j]; b[r] -= k * b[c]; }
  }
  const h = b.map((v, i) => v / A[i][i]);
  return new THREE.Matrix3().set(h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1);
}
// A screen that is in the painting as a blank panel: its picture (a texture the set draws) laid exactly over the
// panel, whatever the camera. corners: the panel in the painting, [TL, TR, BR, BL] as uv (v up); at(u, v) -> the
// world point of that uv on the layer's stand-in. gain: a { value } the set drives.
const SCREEN_FS = `uniform sampler2D tMap; uniform mat4 uProj; uniform mat3 uH; uniform float uGain, uFrame; varying vec3 vW;
float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*0.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
void main(){ vec4 p = uProj*vec4(vW,1.0); if(p.w <= 0.0) discard; vec2 uv = p.xy/p.w*0.5+0.5; if(uv.x<0.0||uv.x>1.0||uv.y<0.0||uv.y>1.0) discard;
  vec3 q = uH*vec3(uv,1.0); vec2 s = q.xy/q.z; if(s.x<0.0||s.x>1.0||s.y<0.0||s.y>1.0) discard;
  float roll = step(0.93, fract(s.y*2.0 - uFrame*0.021));
  gl_FragColor = vec4(texture2D(tMap, s).rgb*uGain*(1.0+0.35*roll), 1.0); }`;
export function paintedScreen(proj, corners, at, map, gain, frame, order) {
  const P = corners.map(([u, v]) => at(u, v)), c = P.reduce((a, p) => a.add(p), new THREE.Vector3()).multiplyScalar(0.25), Q = P.map((p) => p.clone().sub(c).multiplyScalar(1.08).add(c));
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute([0, 1, 2, 0, 2, 3].flatMap((i) => Q[i].toArray()), 3));
  const m = new THREE.ShaderMaterial({ vertexShader: PROJECT_VS, fragmentShader: SCREEN_FS, uniforms: { tMap: { value: map }, uProj: { value: proj.matrix }, uH: { value: homography(corners, [[0, 1], [1, 1], [1, 0], [0, 0]]) }, uGain: gain, uFrame: frame } });
  const mesh = new THREE.Mesh(g, m); painted(m, mesh, order); return mesh;
}
