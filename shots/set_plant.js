// The coolant plant looked at from a few places, and its effects: a set test (not in the film).
// node render.mjs shots/set_plant.js --frames 0,8,16,24,32
import { fireBlast, iceBlast } from "../engine/fx.js";
const VIEWS = [
  { camera: { pos: [0.2, 1.5, -1.5], target: [0, 1.3, 30], fov: 50 }, o: {} },
  { camera: { pos: [1.6, 1.2, -1.2], target: [-2.4, 1.2, 0.8], fov: 44 }, o: { box: 2, armed: 30 } },
  { camera: { pos: [0.4, 1.0, 40], target: [0, 1.4, 80], fov: 30 }, o: { red: { z: 60, k: 0.7 }, drones: Array.from({ length: 12 }, (_, i) => ({ type: "chaser", pos: [Math.sin(i * 2.1) * 1.6, 1 + (i % 4) * 0.6, 52 + i * 2.5], yaw: 180, seed: i })) } },
  { camera: { pos: [0.2, 1.5, -1.5], target: [0, 1.3, 30], fov: 50 }, o: {}, blast: 1 },
  { camera: { pos: [0.2, 1.5, -1.5], target: [0, 1.3, 30], fov: 50 }, o: { wreck: 1 } },
];
export default { name: "set_plant", start: 2230 / 24, frames: 40 + 48, fps: 24, sets: ["plant"],
  frame(f) {
    if (f >= 40) {      // a fire blast and an ice blast side by side, 24 frames each, then both ageing
      const age = f - 40;
      return { set: "plant", camera: { pos: [0.2, 1.5, -1.5], target: [0, 1.5, 30], fov: 50 }, options: { blasts: [{ z: 14, r: 8 + age, k: Math.exp(-age / 6) }],
        cards: [{ at: [0, 1.6, 30], size: 16, res: 1024, paint: (g, v) => iceBlast(g, v, age + 6, { R: 2.6, seed: 5 }) }, { at: [0, 1.6, 14], size: 16, res: 2048, paint: (g, v) => fireBlast(g, v, age, { R: 2.6, seed: 3 }) }] } };
    }
    const v = VIEWS[Math.floor(f / 8) % VIEWS.length]; return { set: "plant", camera: v.camera, options: v.o };
  } };
