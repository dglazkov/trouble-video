// Look-development stills: each frame is a different view of a set at a fixed moment of the song, to be read at full size.
import { chase } from "../machines/drones.js";
const V = [
  (s, F) => ({ set: "corridor", camera: { pos: [-0.85, 0.36, 6.4], target: [0.2, 1.2, 0], fov: 48 }, options: { alert: 1, drones: [...chase(F, s, { n: 9, lead: [0.2, 1.7, -5], spread: [3.6, 1.8, 16], seed: 3 }), ...chase(F, s, { type: "enforcer", n: 1, lead: [-0.6, 1.9, -12], seed: 5 })] } }),
  (s, F) => ({ set: "corridor", camera: { pos: [0, 15, 0.01], target: [0, 0, 0], fov: 50, up: [0, 0, 1] }, options: { junction: { z: 0 }, cut: "top", alert: 1, drones: chase(F, s, { n: 6, lead: [0, 1.6, -5], spread: [3, 1, 9], seed: 2 }) } }),
  (s, F) => ({ set: "corridor", camera: { pos: [-8.5, 1.5, 20], target: [0, 1.5, 22.5], fov: 34 }, options: { cut: "left", doors: { 1: 0.55 }, alert: 1, drones: chase(F, s, { n: 5, lead: [0, 1.5, 17], spread: [3, 1.4, 8], seed: 4 }) } }),
  (s, F) => ({ set: "corridor", camera: { pos: [1.6, 1.4, 4.6], target: [-0.2, 1.75, 0], fov: 40 }, options: { drones: [{ type: "enforcer", pos: [-0.2, 1.85, 0], yaw: 14, pitch: -4, thrust: 0.3 }, { type: "chaser", pos: [1.3, 1.25, 2.6], yaw: 30, roll: 14, thrust: 0.7 }, { type: "chaser", pos: [-1.5, 2.5, 1.2], yaw: -10, roll: -20 }] } }),
  (s, F) => ({ set: "corridor", camera: { pos: [-4.5, 2.0, 0.5], target: [0, 1.6, 0], fov: 40 }, options: { cut: "left", drones: [{ type: "enforcer", pos: [-0.2, 1.85, 0], yaw: 0, beam: 1 }, { type: "chaser", pos: [-1.2, 1.0, 1.4], yaw: 0, thrust: 0.7 }, { type: "chaser", pos: [0.5, 2.7, -1.6], yaw: 0, pitch: -10 }, { type: "chaser", pos: [-0.5, 1.2, -2.2], broken: 0.25, seed: 4 }, { type: "enforcer", pos: [0.6, 1.8, -5], broken: 0.5, seed: 2 }] } }),
  (s, F) => ({ set: "corridor", camera: { pos: [0.6, 1.6, 30], target: [0, 1.6, 0], fov: 50 }, options: { junction: { z: 0 }, hubDoors: { A: 0.5 } } }),
  (s, F) => ({ set: "market", camera: { pos: [0.5, 1.7, 8], target: [0, 1.9, 30], fov: 50 }, options: {} }),
  (s, F) => ({ set: "market", camera: { pos: [-1.6, 1.3, 44], target: [1.5, 2.2, 54], fov: 42 }, options: { drones: [{ type: "chaser", pos: [0.4, 1.8, 47.5], yaw: 10, roll: 12, thrust: 0.6 }, { type: "enforcer", pos: [0.5, 4.2, 60], yaw: 180, pitch: 8, beam: 1 }] } }),
  (s, F) => ({ set: "market", camera: { pos: [0.6, 3.6, 59], target: [0, -1.5, 72], fov: 52 }, options: {} }),
  (s, F) => ({ set: "market", camera: { pos: [2.4, 1.5, 21], target: [-4.5, 1.5, 26], fov: 40 }, options: {} }),
];
export default { name: "set_look", start: 49.5, frames: V.length, sets: [], frame(f, sync) { return V[f](sync, Math.round(49.5 * 24) + f); } };
