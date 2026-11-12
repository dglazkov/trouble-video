// 0:48-0:56, camera and machines only: the run down the corridor with the pack behind (48-50), the pack's own view as
// the hub comes up (50-52, where the film cuts to faces), the hub from above on the drop (51.97 s), and the side-on run
// through the closing shutter (53-56). `kid(f)` is where the character layer should put its runner on each frame.
import { chase } from "../machines/drones.js";
const FPS = 24, START = 48, DROP = 95, SIDE = 119, PASS = 143, SLAM = 145, SPEED = 7.5, RUN = 8.5;
const ease = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
const wob = (f, a, b, c) => Math.sin(f * a + c) * 0.6 + Math.sin(f * b + c * 2.3) * 0.4;
const lead = (f) => SPEED * (f - DROP) / FPS;                 // the runners' z before the drop: they reach the hub's centre on it
const sideZ = (f) => 24 + RUN * (f - PASS) / FPS;             // the runner in the side-on shot: through the shutter at z = 24 on PASS
export const kid = (f) => f < DROP ? [0.2, 0, lead(f)] : f < SIDE ? null : [0, 0, sideZ(f)];

function frame(f, sync) {
  const F = START * FPS + f, drums = sync.drive({ stem: "drums", mode: "pulse", decay: 0.12 }, F), junction = { z: 0 };
  if (f < 48) {                 // low, tracking backward ahead of the runners
    const z = lead(f), k = f / 48, shake = 0.012 + 0.03 * drums;
    return { set: "corridor", camera: { pos: [-0.85 + 0.5 * k + wob(f, 1.9, 3.1, 1) * shake, 0.34 + wob(f, 2.3, 3.7, 2) * shake, z + 6.2 - 1.6 * k], target: [0.15, 1.2, z], fov: 48 + 3 * drums, up: [Math.sin(-0.07), Math.cos(-0.07), 0] },
      options: { junction, alert: 1, drones: [...chase(F, sync, { n: 14, lead: [0.2, 1.7, z - 3.2 + 1.2 * k], spread: [3.8, 2.0, 11], seed: 3 }), ...chase(F, sync, { type: "enforcer", n: 1, lead: [-0.4, 1.95, z - 8.5 + 2.5 * k], seed: 5 })],
        post: { bgBlur: 0.012 + 0.02 * drums, focus: [0.5, 0.55], ca: 0.0014 + 0.002 * drums } } };
  }
  if (f < DROP) {               // among the pack, looking ahead: the hub's mouth comes up
    const z = lead(f), k = (f - 48) / (DROP - 48), shake = 0.02 + 0.04 * drums;
    return { set: "corridor", camera: { pos: [0.5 + wob(f, 0.5, 0.9, 3) * 0.25 + wob(f, 2.1, 3.3, 1) * shake, 2.0 + wob(f, 0.6, 1.1, 5) * 0.12, z - 9.5 + 2 * k], target: [0.1, 1.35, z + 4], fov: 58, up: [Math.sin(wob(f, 0.4, 0.7, 2) * 0.08), 1, 0] },
      options: { junction, alert: 1, hubDoors: { A: 0.2 + 0.5 * ease(k * 1.4 - 0.4), B: 0.2 + 0.5 * ease(k * 1.4 - 0.4), D: 0.2 + 0.5 * ease(k * 1.4 - 0.4), C: 0 },
        drones: [...chase(F, sync, { n: 8, lead: [0.2, 1.6, z - 3.5 + 1.5 * k], spread: [3.8, 1.8, 8.5], seed: 7, lurch: 0.9 }), ...chase(F, sync, { type: "enforcer", n: 1, lead: [-0.9, 2.0, z - 4.5], seed: 5 })],
        post: { bgBlur: 0.018 + 0.02 * drums, focus: [0.5, 0.45], ca: 0.002 } } };
  }
  if (f < SIDE) {               // the drop: the hub from directly above, the pack bursting out of the C mouth and splitting
    const g = f - DROP, k = g / (SIDE - DROP), a = (-0.14 + 0.24 * k), out = 2 + 11 * k;
    const dirs = [[0, 1, 0], [1, 0, 90], [-1, 0, -90], [0, 1, 0], [1, 0, 90], [-1, 0, -90], [0, 1, 0], [0.7, 0.7, 45]];
    const drones = dirs.map(([dx, dz, yaw], i) => {      // in through the C mouth to the centre, then out along its own arm
      const d = Math.max(0, out - i * 1.25), t = ease((d - 5) / 3), past = Math.max(0, d - 6.5), side = Math.sin(i * 2.4) * 1.1 * (1 - t);
      return { type: "chaser", pos: [side + dx * past, 1.5 + 0.3 * Math.sin(i * 1.7 + F * 0.3), -6.5 + Math.min(d, 6.5) + dz * past], yaw: yaw * t, roll: -yaw * 0.35 * Math.sin(t * Math.PI), thrust: drums, eye: 1 + drums, seed: 30 + i };
    });
    drones.push({ type: "enforcer", pos: [-0.3, 1.9, -10 + 3.5 * k], yaw: 0, beam: 1, thrust: drums, seed: 5 });
    return { set: "corridor", camera: { pos: [0, 17 - 3.5 * ease(k), 0.01], target: [0, 0, 0], fov: 50, up: [Math.sin(a), 0, Math.cos(a)] },
      options: { junction, cut: "top", alert: 1, hubDoors: { A: 0.7, B: 0.7, D: 0.7, C: 0.1 }, drones,
        post: g === 0 ? { mode: 1, impact: { dark: [0.02, 0, 0.06], mid: [0.02, 0, 0.06], light: [1, 1, 1], ink: [1, 1, 1], thresholds: [0.22, 0.22] } } : g === 1 ? { mode: 1, impact: { dark: [0.05, 0.0, 0.12], mid: [1.0, 0.15, 0.5], light: [0.2, 0.95, 1.0], ink: [1, 1, 1], thresholds: [0.14, 0.3] } } : { flash: g === 2 ? 0.4 : g === 3 ? 0.15 : 0, ca: 0.0012 + 0.006 * Math.exp(-g / 4), bloom: 0.85 + 0.6 * Math.exp(-g / 4) } } };
  }
  // side-on: the wall cut away, the runner left to right through the shutter at z = 24, which bites shut behind
  const z = sideZ(f), top = f < 126 ? 0.12 : 0.12 + 0.5 * ease((f - 126) / (PASS - 126)) + (f >= PASS ? 0.38 * Math.min(1, (f - PASS) / (SLAM - PASS)) : 0), bottom = f < PASS ? 0.05 : Math.min(1, (f - PASS) / (SLAM - PASS));
  const slam = f >= SLAM ? Math.exp(-(f - SLAM) / 3) : 0, gaps = [1.0, 2.9, 4.4, 5.6, 7.4, 9.0];
  const drones = gaps.map((gap, i) => {
    const hit = PASS + gap / RUN * FPS, through = i === 0, y = 1.35 + 0.5 * Math.sin(i * 2.1) + 0.12 * Math.sin(F * 0.4 + i), x = 0.9 * Math.sin(i * 1.3 + 0.5);
    if (through || f < hit) return { type: "chaser", pos: [x, y, z - gap], yaw: 0, pitch: -8, roll: 10 * Math.sin(F * 0.3 + i), thrust: drums, eye: 1 + drums, seed: 50 + i };
    return { type: "chaser", pos: [x, y, 23.45], yaw: 0, broken: (f - hit) / FPS, carry: -2.2, seed: 50 + i };
  });
  drones.push({ type: "enforcer", pos: [-0.2, 1.9, Math.min(z - 12, 21.4)], yaw: 0, pitch: -5, beam: 1, thrust: drums, seed: 5 });
  return { set: "corridor", camera: { pos: [-8.8 + 0.05 * slam * wob(f, 9, 14, 1), 1.45 + 0.08 * slam * wob(f, 11, 17, 2), z - 6.0], target: [0.4, 1.5, z - 0.6], fov: 36 },
    options: { junction, cut: "left", alert: 1, doors: { 1: [top, bottom] }, drones, post: { bgStreak: [0.004, 0], ca: 0.0012 + 0.004 * slam, flash: f === SLAM ? 0.18 : 0 } } };
}
export default { name: "set_corridor", start: START, frames: 192, fps: FPS, sets: ["corridor"], frame, kid };
