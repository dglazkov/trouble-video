// The machine level looked at from a few places: a set test (not in the film). node render.mjs shots/gant_look.js --frames 0,1,2,3,4
const VIEWS = [
  { pos: [9, 2.2, -4], target: [0, 1.0, 8], fov: 50 },
  { pos: [0.4, 0.5, 14], target: [0, 1.2, 0], fov: 50 },
  { pos: [16, 9, -10], target: [0, -3, 12], fov: 55 },
  { pos: [0, 9.5, 3.9], target: [0, 0, 4], fov: 60, up: [1, 0, 0] },
  { pos: [-11, 1.4, 30], target: [0, 1.1, 20], fov: 32 },
];
export default { name: "gant_look", start: 716 / 24, frames: VIEWS.length * 8, fps: 24, sets: ["gantry"], cast: { tane: "/kits/tane", juno: "/kits/juno" },
  frame(f, sync) { const v = VIEWS[Math.floor(f / 8) % VIEWS.length]; return { set: "gantry", camera: v, options: { sign: f % 2 ? { text: "DEEP", small: "ディープ" } : null, alert: 0.4,
    drones: [{ type: "chaser", pos: [0.5, 2.0, -6], yaw: 0, seed: 1 }, { type: "chaser", pos: [-3, 1.2, 2], yaw: 60, seed: 2 }] },
    actors: [{ who: "tane", action: "run", phase: 0.1, x: -0.5, z: 4, yaw: 0 }, { who: "juno", action: "run", phase: 0.5, x: 0.6, z: 2, yaw: 0 }] }; } };
