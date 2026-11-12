// Camera agreement. The character layer is drawn by engine/body.js's camera and the set by three.js; both must put a
// point of the world on the same pixel. A set draws these markers (flat magenta balls, unlit, unfogged, over everything)
// at the 3D points it is given, and expected() says where engine/body.js's camera puts the same points.
import * as THREE from "three";
import { camera as bodyCamera } from "../engine/body.js";
import { FX } from "./kit.js";

export const MARKER_COLOR = [255, 0, 255], MARKER_RADIUS = 0.045;
export function createMarkers(scene) {
  const g = new THREE.SphereGeometry(MARKER_RADIUS, 16, 12), m = new THREE.MeshBasicMaterial({ color: 0xff00ff, depthTest: false, depthWrite: false, fog: false }), list = [];
  return { update(points = []) {
    while (list.length < points.length) { const o = new THREE.Mesh(g, m); o.layers.set(FX); o.renderOrder = 999; o.frustumCulled = false; scene.add(o); list.push(o); }
    list.forEach((o, i) => { o.visible = i < points.length; if (o.visible) o.position.set(...points[i]); });
  } };
}
// Where the engine's camera puts each point: [{ p, x, y, z }] in pixels of a w x h frame (y down).
export const expected = (cam, points, w = 1920, h = 1080) => { const c = bodyCamera({ fov: 30, ...cam, w, h }); return points.map((p) => { const q = c.project(p); return { p, x: q.x, y: q.y, z: q.z }; }); };
