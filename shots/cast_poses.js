// Tripwire: every character doing every action the slice asks of them, on the plain ground, from the camera each is
// drawn for. What a kit has no drawing of yet shows as the posing dummy. One second per panel.
//   0 the four running at the camera · 1 the four from above, heading four ways · 2 Tane's run from the side ·
//   3 his charge · 4 Juno riding (banking left, level, right) · 5 her leap
import { orbit } from "/engine/body.js";
import { ground, shadows } from "/engine/scenery.js";

const CAST = ["tane", "juno", "ife", "noor"], SEG = 24, FPC = 16;
const PANELS = [
  (f) => ({ cam: orbit([0, 0.8, 0], 0, 9, { elev: 2, fov: 24 }), actors: CAST.map((who, i) => ({ who, action: "run", phase: ((f + i * 3) % FPC) / FPC, x: (i - 1.5) * 1.15 })) }),
  (f) => ({ cam: { pos: [0, 9, 0], target: [0, 0, 0], up: [0, 0, 1], fov: 30 }, actors: CAST.map((who, i) => ({ who, action: "runtop", phase: ((f + i * 3) % FPC) / FPC, yaw: i * 90, x: [0, 1.4, 0, -1.4][i], z: [1.4, 0, -1.4, 0][i] })) }),
  (f) => ({ cam: orbit([0, 0.85, 0], 90, 7.4, { elev: 4, fov: 17 }), actors: [{ who: "tane", action: "run", phase: (f % FPC) / FPC }] }),
  (f) => ({ cam: orbit([0, 0.85, 0], 90, 7.4, { elev: 4, fov: 17 }), actors: [{ who: "tane", action: "charge", phase: f < SEG / 2 ? 0 : 0.6 }] }),
  (f) => ({ cam: orbit([0, 0.9, 0], 135, 7.4, { elev: 14, fov: 17 }), actors: [{ who: "juno", action: "ride", phase: Math.min(0.999, f / SEG) }] }),
  (f) => ({ cam: orbit([0, 1.4, 0], 135, 8, { elev: 32, fov: 17 }), actors: [{ who: "juno", action: "leap", phase: f < SEG / 2 ? 0 : 0.6, y: f < SEG / 2 ? 0.3 : 1.1 }] }),
];
export default {
  name: "cast_poses", frames: SEG * PANELS.length, fps: 24, cast: Object.fromEntries(CAST.map((w) => [w, "/kits/" + w])),
  frame(f) {
    const p = PANELS[Math.floor(f / SEG)](f % SEG);
    return { camera: p.cam, actors: p.actors, backdrop(g, cam, bodies) { ground(g, cam, {}); for (const b of bodies) shadows(g, cam, b); } };
  },
};
