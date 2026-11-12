// The service tunnel looked at from a few places: a set test (not in the film). node render.mjs shots/set_tunnel.js --frames 0,8,16,24,32,40,48
const D = (x, y, r, d, seed) => ({ x, y, r, d, seed });
const VIEWS = [
  { camera: { pos: [0.3, 1.5, -6], target: [0, 1.2, 20], fov: 54 }, o: {} },
  { camera: { pos: [-0.5, 1.2, 30], target: [0, 1.0, 60], fov: 54 }, o: { door: 0.4 } },
  { camera: { pos: [0.2, 1.0, 55], target: [0, 0.9, 64], fov: 50 }, o: { door: 1, dents: [D(0.45, 1.15, 0.3, 0.2, 1), D(-0.5, 0.7, 0.24, 0.17, 2), D(-0.35, 1.45, 0.18, 0.12, 3)] } },
  { camera: { pos: [0.5, 0.9, 70], target: [0, 0.9, 64], fov: 46 }, o: { door: 1, dents: [D(0.45, 1.15, 0.3, 0.2, 1), D(-0.5, 0.7, 0.24, 0.17, 2), D(-0.35, 1.45, 0.18, 0.12, 3)] } },
  { camera: { pos: [7, 1.1, 62], target: [0, 1.0, 62.5], fov: 36 }, o: { cut: true, door: 0.5 } },
  { camera: { pos: [0, 1.1, 34], target: [0, 1.1, 10], fov: 56 }, o: {} },
  { camera: { pos: [0.6, 1.3, 61.2], target: [0.1, 1.0, 64], fov: 40 }, o: { door: 1, dents: [D(0.45, 1.15, 0.3, 0.2, 1), D(-0.5, 0.7, 0.24, 0.17, 2), D(-0.35, 1.45, 0.18, 0.12, 3)] } },
];
export default { name: "set_tunnel", start: 1724 / 24, frames: VIEWS.length * 8, fps: 24, sets: ["tunnel"], cast: { juno: "/kits/juno" },
  frame(f) { const v = VIEWS[Math.floor(f / 8) % VIEWS.length]; return { set: "tunnel", camera: v.camera, options: { ...v.o, drones: [{ type: "chaser", pos: [0.5, 1.2, v.camera.pos[2] + (v.camera.target[2] > v.camera.pos[2] ? 5 : -5)], yaw: 0, seed: 1 }] },
    actors: [{ who: "juno", action: "idle", x: -0.3, z: v.camera.pos[2] + (v.camera.target[2] > v.camera.pos[2] ? 4 : -4), yaw: 180 }] }; } };
