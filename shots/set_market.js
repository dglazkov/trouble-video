// 0:56-1:02, camera and machines only: the chase down the market deck behind the hoverboard (56-60), then the leap over
// the gap seen from above and behind (60-62). `kid(f)` is where the character layer should put the rider.
import { chase } from "../machines/drones.js";
const FPS = 24, START = 56, LEAP = 96, SPEED = 15, GAP0 = 66, GAP1 = 76;
const ease = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
const wob = (f, a, b, c) => Math.sin(f * a + c) * 0.6 + Math.sin(f * b + c * 2.3) * 0.4;
const rideZ = (f) => GAP0 + SPEED * (f - LEAP) / FPS, rideX = (f) => 1.1 * Math.sin(f * 0.085 + 0.6) * Math.min(1, Math.max(0, (GAP0 - 5 - rideZ(f)) / 8));
// the leap is stretched: 10 m of gap in 40 frames, a metre and a half of height at the top
const leapT = (f) => (f - LEAP) / 40, leapPos = (f) => { const t = leapT(f); return [0, 0.85 + 6.6 * t * (1 - t) - 0.85 * Math.max(0, t) * t, GAP0 + (GAP1 - GAP0 + 1.5) * t]; };
export const kid = (f) => f < LEAP ? [rideX(f), rideZ(f) > GAP0 - 3.6 ? 0.8 * (rideZ(f) - (GAP0 - 3.6)) / 3.6 : 0, rideZ(f)] : leapPos(f);

function frame(f, sync) {
  const F = START * FPS + f, drums = sync.drive({ stem: "drums", mode: "pulse", decay: 0.12 }, F);
  if (f < LEAP) {
    const z = rideZ(f), x = rideX(f), xc = rideX(f - 5) * 0.8, bank = (rideX(f + 2) - rideX(f - 2)) * 0.22, shake = 0.015 + 0.03 * drums;
    const pack = chase(F, sync, { n: 6, lead: [x * 0.6, 1.8, z + 1.2], spread: [5.0, 1.6, 4.2], seed: 11, lurch: 1.0, weave: 1.4 });
    pack.push({ type: "enforcer", pos: [0.6 + 0.4 * Math.sin(F * 0.05), 6.6 - 3.2 * ease((f - 20) / 50), 55 + 6 * ease((f - 60) / 36)], yaw: 180, pitch: 14, beam: 1, beamTilt: 0.25, thrust: drums, seed: 5 });
    return { set: "market", camera: { pos: [xc + 0.35 + wob(f, 2.1, 3.3, 1) * shake, 1.85 + wob(f, 2.6, 3.9, 2) * shake, z - 4.6], target: [x * 0.7, 1.45, z + 5], fov: 62 + 3 * drums, up: [Math.sin(bank), Math.cos(bank), 0] },
      options: { alert: 0.6, drones: pack, post: { bgBlur: 0.02 + 0.02 * drums, focus: [0.5, 0.52], ca: 0.0016 + 0.002 * drums } } };
  }
  const t = leapT(f), p = leapPos(f), k = (f - LEAP) / 47;
  const broke = 112, drones = [0, 1, 2, 3, 4].map((i) => {
    const d = 0.18 + i * 0.14, tt = t - d, q = [0.9 * Math.sin(i * 2.2), 1.4 + 6.0 * tt * (1 - tt) + 0.5 * Math.sin(i * 1.3), GAP0 + (GAP1 - GAP0 + 1.5) * tt];
    if (i === 2 && f >= broke) return { type: "chaser", pos: [0.9 * Math.sin(i * 2.2), 1.9, GAP0 + 0.4], broken: (f - broke) / FPS, carry: 3, seed: 70 + i };
    return { type: "chaser", pos: q, yaw: 0, pitch: -20 + 50 * tt, roll: 14 * Math.sin(F * 0.3 + i), thrust: drums, eye: 1 + drums, seed: 70 + i };
  });
  return { set: "market", camera: { pos: [0.5 - 0.4 * k, 5.5 - 0.5 * k, 58.6 + 3.0 * k], target: [0.1, -0.6 + p[1] * 0.25, 70.5 + 2 * k], fov: 56 },
    options: { alert: 0.6, drones, post: { ca: 0.0016, bloom: 1.0 } } };
}
export default { name: "set_market", start: START, frames: 144, fps: FPS, sets: ["market"], frame, kid };
