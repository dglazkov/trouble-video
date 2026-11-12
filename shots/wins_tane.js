// Tane's fight (song frames 1525-1724): what its six shots share. He stands at the dead end with his back to the
// blast door (z = 24), facing down the corridor (-Z); three chasers, A, B and C, have him.
//   A comes in first: he bats it on 1595 and it goes up into the roof, where it breaks on 1605.
//   B dives at his head: he takes it out of the air by its tail on 1634 and it is in his fist until 1674.
//   C hangs back, then comes in low: on 1674 he puts B through it.
// The machines are the set's (machines/drones.js); B, while he has it, is hung on the fist of the drawing that is
// showing (FIST: where that fist is, measured off each drawing).
import { FPS, CUT, DEAD, TZ, T, ease, wob, rnd, lerp, mix3 } from "./wins_cast.js";
export const TX = 0.2, HIT1 = 1595, ROOF = 1605, CATCH = 1634, HIT3 = 1674, STAMP = 1575, GRAB = 1581, SHOULDER = 1694;
export const BAT_AT = [0.25, 1.3, TZ - 1.05], ROOF_AT = [-0.5, 3.05, 17.5], SLAM_AT = [0.15, 0.72, TZ - 1.7];
// which drawing he is on at song frame F (wins_tane's cels), and where he stands
export function tane(F, o = {}) {
  const i = F < STAMP ? 0 : F < GRAB ? 1 : F < HIT1 ? 2 : F < HIT1 + 2 ? 3 : F < CUT.catch ? 4 : F < CATCH ? 5 : F < CUT.slam ? 6 : F < 1660 ? 7 : F < HIT3 ? 8 : F < CUT.rest ? 9 : F < SHOULDER ? 10 : 11;
  const lunge = i === 9 ? 0.55 : i >= 10 ? 0.3 : i === 3 || i === 4 ? 0.12 : 0;
  return { who: "tane", action: "wins_tane", phase: T(i), hero: HERO[i], view: "side", yaw: 180, x: TX, z: TZ - lunge, light: { tint: [0.96, 1.0, 1.1], rim: [0.62, 0.95, 1.0] }, ...o };
}
export const HERO = ["cornered", "stamp", "windup", "contact", "follow", "ready", "catch", "weigh", "coil", "slam", "rise", "rest"];
// where the left fist is in drawings 6-9, from his ground point in the set (measured off each drawing as its shot
// frames it), and the way the machine in it points: [yaw, pitch] of its nose, the tail being in the fist
export const FIST = { 6: [-0.294, 1.902, -0.12], 7: [0, 1.366, -0.667], 8: [0, 1.592, 0.443], 9: [0, 0.687, -0.907] }, HELD = { 6: [180, 78], 7: [180, 4], 8: [0, 34], 9: [180, -20] };
const hover = (F, i, at) => [at[0] + 0.1 * Math.sin(F * 0.23 + i * 2), at[1] + 0.12 * Math.sin(F * 0.31 + i), at[2] + 0.12 * Math.sin(F * 0.17 + i * 3)];
const nose = (yaw, pitch) => { const y = yaw * Math.PI / 180, p = pitch * Math.PI / 180; return [Math.sin(y) * Math.cos(p), Math.sin(p), Math.cos(y) * Math.cos(p)]; };
// a machine held by the tail at `at`, pointing yaw/pitch: where its middle is
const held = (at, yaw, pitch) => { const n = nose(yaw, pitch); return [at[0] + n[0] * 0.44 - 0.12, at[1] + n[1] * 0.44, at[2] + n[2] * 0.44]; };
export function trio(F, sync) {
  const drums = sync.drive({ stem: "drums", mode: "pulse", decay: 0.12 }, F), out = [];
  // A
  if (F < ROOF) {
    const home = hover(F, 0, [1.2, 1.5, 18.9]);
    if (F < 1583) out.push({ type: "chaser", pos: home, yaw: 0, pitch: -4, roll: 8 * Math.sin(F * 0.3), eye: 1.2 + 0.5 * drums, thrust: 0.3 + drums, seed: 31 });
    else if (F < HIT1) { const k = ((F - 1583) / (HIT1 - 1583)) ** 2; out.push({ type: "chaser", pos: mix3(home, [BAT_AT[0], BAT_AT[1], BAT_AT[2] - 0.35], k), yaw: 0, pitch: -14 * k, roll: 20 * Math.sin(F * 0.8), eye: 1.9, thrust: 1, seed: 31 }); }
    else { const k = (F - HIT1) / (ROOF - HIT1); out.push({ type: "chaser", pos: mix3(BAT_AT, ROOF_AT, k), yaw: 180 + 700 * k, pitch: 500 * k, roll: 900 * k, eye: 0.4, thrust: 0, seed: 31 }); }
  } else out.push({ type: "chaser", pos: ROOF_AT, yaw: 200, broken: (F - ROOF) / FPS, carry: -1.5, smoke: false, seed: 31 });
  // B
  if (F < HIT3) {
    // it comes up over him as the first goes into the roof, and circles there
    const up = ease((F - 1606) / 10), home = hover(F, 1, [-1.3 + 1.0 * up + 0.45 * up * Math.sin(F * 0.42), 2.5 + 0.35 * up, 17.7 + 2.0 * up + 0.4 * up * Math.cos(F * 0.42)]), DIVE = 1623;
    if (F < DIVE) out.push({ type: "chaser", pos: home, yaw: 0, pitch: -8, roll: 10 * Math.sin(F * 0.27 + 1), eye: 1.2 + 0.5 * drums, thrust: 0.3 + drums, seed: 32 });
    else if (F < CATCH) {      // down at his head in a curve, and past it: it is going away up when he gets its tail
      const k = (F - DIVE) / (CATCH - DIVE), end = held(fistAt(6), ...HELD[6]), via = [0.1, 1.75, TZ - 0.9], a = mix3(home, via, k), b = mix3(via, end, k), p = mix3(a, b, k);
      out.push({ type: "chaser", pos: p, yaw: 180 * ease((k - 0.45) / 0.4), pitch: -34 + 112 * ease((k - 0.5) / 0.5), roll: 30 * Math.sin(F * 0.9), eye: 1.9, thrust: 1, seed: 32 }); }
    else if (F >= HIT3 - 2) { /* in the smear: the swing's own shape is drawn (wins_slam) */ }
    else { const a = tane(F), i = Math.round(a.phase * 12 - 0.5), buck = 0.35 + 0.65 * Math.exp(-(F - CATCH) / 10), yw = HELD[i][0] + 16 * buck * wob(F, 2.1, 3.7, 2), pt = HELD[i][1] + 22 * buck * wob(F, 3.1, 4.9, 3);
      out.push({ type: "chaser", pos: held(fistAt(i), yw, pt), yaw: yw, pitch: pt, roll: 70 * buck * wob(F, 2.3, 4.1, 4), eye: 0.9 + 0.9 * rnd(F - F % 2), thrust: 0.3 + 0.7 * rnd(F - F % 3, 2), seed: 32 }); }
  } else out.push({ type: "chaser", pos: [SLAM_AT[0], SLAM_AT[1], SLAM_AT[2] + 0.1], yaw: 180, broken: (F - HIT3) / FPS, carry: -3.2, smoke: false, seed: 32 });
  // C
  if (F < HIT3) {
    const back = F > 1650 ? 0.9 * ease((F - 1650) / 12) : 0, home = hover(F, 2, [-1.45 + 1.3 * ease((F - 1640) / 14), 0.85, 17.6 - back]);
    if (F < 1668) out.push({ type: "chaser", pos: home, yaw: F > 1650 ? 14 * Math.sin(F * 0.9) * ease((F - 1650) / 8) : 0, pitch: -6 + (F > 1650 ? 10 : 0), roll: 10 * Math.sin(F * 0.33 + 2), eye: F > 1650 ? 0.7 + 0.6 * rnd(F - F % 2, 5) : 1.2 + 0.5 * drums, thrust: 0.3 + drums, seed: 33 });
    else { const k = ((F - 1668) / (HIT3 - 1668)) ** 1.5; out.push({ type: "chaser", pos: mix3(home, [SLAM_AT[0], SLAM_AT[1], SLAM_AT[2] - 0.3], k), yaw: 0, pitch: -6, roll: 25 * Math.sin(F), eye: 1.9, thrust: 1, seed: 33 }); }
  } else out.push({ type: "chaser", pos: [SLAM_AT[0], SLAM_AT[1], SLAM_AT[2] - 0.2], yaw: 0, broken: (F - HIT3) / FPS, carry: -4.5, smoke: false, seed: 33 });
  return out;
}
// his left fist in the set while drawing i shows
const fistAt = (i) => { const o = FIST[i], lunge = i === 9 ? 0.55 : 0; return [TX + o[0], o[1], TZ - lunge + o[2]]; };
export const fist = () => fistAt(6);
