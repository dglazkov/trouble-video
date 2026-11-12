// Descent 4, 24.04-27.33 s: DOWN THE SHAFT. Square on the stair tower from the open side, the camera going down at the
// lift's own pace. Each of the four comes down in their own way:
//   Tane vaults the rails, flight to flight: he lands on every other beat (24.45, 25.29, 26.10, 26.94 s) and is over
//   the next rail before the stairs have stopped ringing;
//   Juno rides the handrails on her feet, and hops from one to the next on the same beats;
//   Ife takes every single step, a drawing a frame, and is left behind;
//   Noor goes down in the cage, examining their nails, and is never anywhere but the same place in the picture.
// At the end the first red eyes come down the shaft after them.
import { FPS, CUT, CAST, startOf, boil, wob, ease, clamp, lerp, bones, facing } from "./desc_cast.js";
import { H, X0, X1, TREAD, RAIL, LIFT, stand, railZ as railAt, dir, stepY, slopeY } from "../sets/stairplan.js";
const FRAMES = CUT.ding - CUT.shaft, K0 = 2;                 // frames of this shot; the flight they are on as it opens
const LAND = [10, 30, 49, 69], CYCLE = 19.67;                // the frames Tane lands on (every other beat), and their spacing
const camY = (f) => -K0 * H + 0.1 - H * (f - LAND[0]) / CYCLE;      // the middle of the picture
const liftY = (f) => camY(f) - 1.0;
// ---- Tane: from one flight to the next below it, over the rails between the lanes ------------------------------------
// bounce n is on flight K0 + n, a quarter of the way down it (Juno is at its far end then); he is on it for SQUAT frames, then over the rail
const SQUAT = 3, OVER = 5, spot = (n) => { const k = K0 + n, x = -dir(k) * 1.2; return [x, stepY(k, x), stand(k)]; };
const landAt = (n) => LAND[n] ?? LAND[LAND.length - 1] + Math.round((n - LAND.length + 1) * CYCLE), lastLanding = (f) => { let n = -1; while (landAt(n + 1) <= f) n++; return n; };
function tane(f) {
  const n = lastLanding(f), t0 = landAt(n), t1 = landAt(n + 1), c = f - t0, a = spot(n), b = spot(n + 1), came = dir(K0 + n + 1);      // the way he was going when he landed (-1: toward -X); he goes back the other way
  if (c < SQUAT) return { cel: 2, x: a[0], y: a[1], z: a[2], yaw: 90 * came, land: c };      // landed: still facing the way he came
  const u = (c - SQUAT) / (t1 - t0 - SQUAT), e = (u < 0.25 ? u * u / 0.5 : u - 0.125) / 0.875;      // gathers speed off the rail over the first quarter
  return { cel: c < SQUAT + OVER ? 0 : 1, x: lerp(a[0], b[0], e), y: a[1] + 2.6 * e - (2.6 + a[1] - b[1]) * e * e, z: lerp(a[2], b[2], ease(u * 1.5)), yaw: -90 * came, land: -1 };
}
// ---- Juno: down the handrail of each flight on her feet, a hop from one rail to the next at the landing -----------------
// She is half a flight ahead of Tane, and leaves each rail on the beat he lands on: a low hop out over the landing and
// back (TH frames in the air, falling the whole way), onto the top of the next rail, and down it faster and faster.
// Near flights: the outer rail; far ones: the inner. Everything here is where her SOLES are; her root hangs from them.
const TH = 8, V0 = 0.2, EDGE = 0.3, railZ = (k) => railAt(k, k % 2 === 1), top = (x, k) => slopeY(k, x) + RAIL + 0.04;
const SOLES = (() => { const b = bones({ who: "juno", action: "desc_slide", phase: 0, yaw: -90 }), L = b.J.L.ball, R = b.J.R.ball; return { dx: -(L[0] + R[0]) / 2, dy: (L[1] + R[1]) / 2 }; })();      // her feet's middle ahead of and above her root
function juno(f) {
  const n = lastLanding(f), t0 = landAt(n), t = f - t0, C = landAt(n + 1) - t0, k = K0 + n + 1, d = dir(k), x0 = (d > 0 ? X0 : X1) + d * EDGE;      // the flight she takes after leaving on landing n; where on its rail she comes down
  if (t < TH) {      // in the air: out and back across, down from the end of the last rail to the top of this one
    const y1 = top(x0, k - 1), y2 = top(x0, k), vy = (y2 - y1) / TH + 0.016 * TH, u = t / TH;
    return { cel: 1, sx: x0 - d * (V0 * t - V0 * t * t / TH), sy: y1 + vy * t - 0.016 * t * t, z: lerp(railZ(k - 1), railZ(k), 2 * u - u * u), face: -d * Math.cos(Math.PI * u), yaw: u < 0.5 ? -90 * d : 90 * d, over: true };
  }
  const ts = t - TH, T = C - TH, len = (X1 - X0) - 2 * EDGE, acc = 2 * (len - V0 * T) / (T * T), x = x0 + d * (V0 * ts + acc * ts * ts / 2);
  return { cel: n % 2 ? 2 : 0, sx: x, sy: top(x, k), z: railZ(k), face: d, yaw: 90 * d, over: k % 2 === 0, spark: [x, top(x, k) - 0.04, railZ(k)] };
}
// ---- Ife: every step. A tread a frame; at a landing she slows, turns and starts again ---------------------------------------
const TURN = 10, STEP = 2, NS = (X1 - X0) / TREAD, PER = NS * STEP + TURN, VX = TREAD / STEP;      // frames a turn, a step, a flight and its landing take her; metres a frame on the stairs
function ifeRaw(s) {
  const n = Math.floor(s / PER), c = s - n * PER, k = K0 + n, d = dir(k), from = d > 0 ? X0 : X1, to = d > 0 ? X1 : X0;
  if (c < NS * STEP) { const x = from + d * c * VX; return [x, slopeY(k, x), stand(k), d]; }
  // on the landing: she runs on a little, stops, and comes back, crossing to the other lane (her speed changes evenly)
  const t = c - NS * STEP, h = TURN / 2, x = to + d * (VX * t - VX * t * t / (2 * h)), u = t / TURN;
  return [x, -(k + 1) * H, lerp(stand(k), stand(k + 1), u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u)), u < 0.5 ? d : -d];
}
// her feet are on the nosings' line, a hair smoothed where it meets a landing (the patter's drawings have the steps in them)
function ife(f) {
  const s = f + AHEAD, w = [1, 2, 3, 2, 1], p = [0, 0, 0]; w.forEach((k, i) => { const q = ifeRaw(s + i - 2); for (let j = 0; j < 3; j++) p[j] += q[j] * k / 9; });
  return { x: p[0], y: p[1] - 0.06, z: p[2], yaw: 90 * ifeRaw(s)[3], phase: s / 4 };
}
const AHEAD = 17;      // how far down the first flight she is as the shot opens
export const paths = { tane, juno, ife, camY, liftY, LAND };

function frame(f, sync) {
  const cy = camY(f), T = tane(f), J = juno(f), I = ife(f), ly = liftY(f), since = Math.min(...LAND.map((l) => f >= l ? f - l : 99)), jolt = Math.exp(-since / 1.8);
  const cam = { pos: [-0.95 + 0.02 * jolt * wob(f, 9, 14, 1), cy + 0.9 + 0.05 * jolt * wob(f, 11, 17, 2), 13.4], target: [-0.95, cy - 0.05, 0], fov: 28.5 };
  // the first of the swarm, down the shaft after them
  const drones = f < 50 ? [] : [0, 1, 2, 3, 4, 5].map((i) => { const u = f - 50 - i * 2.5, x = 0.4 + 2.6 * Math.sin(i * 2.3 + 1), z = 2.6 + 0.9 * Math.cos(i * 1.7); return { type: "chaser", pos: [x + 0.5 * Math.sin(f * 0.21 + i), cy + 4.6 + 1.1 * (i % 3) - 0.115 * Math.max(0, u) + 0.2 * Math.sin(f * 0.3 + i * 2), z], yaw: 200 + 40 * Math.sin(i * 3), pitch: 38, roll: 12 * Math.sin(f * 0.25 + i), eye: 1.5, thrust: 0.8, seed: 300 + i }; });
  return { set: "stairwell", camera: cam,
    options: { lift: { y: ly, gate: 1, lamp: 0 }, alert: 0.8, alarmLevels: 1 + Math.floor((f + 20) / CYCLE) + K0, drones },
    post: { ca: 0.001 + 0.0016 * jolt, bgStreak: [0, 0.002] },
    actors: [
      { who: "noor", action: "desc_cage", phase: 2 / 3, hero: "nails", x: LIFT.x + 0.1, y: ly, z: LIFT.z + 0.1, yaw: facing([LIFT.x + 0.1, 0, LIFT.z + 0.1], cam.pos), shadow: false, layer: boil(f, 0.9) },
      { who: "ife", action: "desc_steps", view: "side", phase: I.phase, x: I.x, y: I.y, z: I.z, yaw: I.yaw },
      { who: "juno", action: "desc_slide", view: "side", phase: J.cel / 3, x: J.sx - J.face * SOLES.dx, y: J.sy - SOLES.dy, z: J.z, yaw: J.yaw, over: J.over, shadow: false, layer: boil(f + 3, 1.3) },
      { who: "tane", action: "desc_vault", view: "side", phase: T.cel / 3, x: T.x, y: T.y, z: T.z, yaw: T.yaw, shadow: T.land >= 0, layer: T.land >= 0 ? {} : boil(f + 5, 1.5) },
    ],
    overlay(g, c) {
      // sparks off Juno's shoes on the rail, and a ring of dust where Tane lands: hard shapes, on twos
      if (J.spark) { const p = c.project(J.spark), f2 = f - f % 2, d = J.yaw > 0 ? -1 : 1; g.fillStyle = "#fff3c4"; for (let i = 0; i < 5; i++) { const a = -0.5 + 0.3 * i + 0.4 * Math.sin(f2 * 3.1 + i * 7), r = p.s * (0.16 + 0.22 * Math.abs(Math.sin(f2 * 1.7 + i * 2.3))); g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x + d * Math.cos(a) * r - 3, p.y - Math.sin(a) * r - 5); g.lineTo(p.x + d * Math.cos(a) * r + 2, p.y - Math.sin(a) * r + 3); g.fill(); } }
      if (T.land >= 0 || (since >= SQUAT && since < 7)) {
        const n = lastLanding(f), a = spot(n), p = c.project([a[0], a[1] + 0.05, a[2]]), u = since - since % 2, r = p.s * (0.42 + 0.16 * u);
        g.strokeStyle = "#f4ecc8"; g.lineWidth = Math.max(2, 9 - u * 1.4); g.lineCap = "butt"; g.beginPath();
        for (let i = 0; i < 7; i++) { const t = Math.PI * (1.12 + 0.76 * i / 6), k = 0.72 + 0.28 * ((i * 7) % 3) / 2; g.moveTo(p.x + Math.cos(t) * r * 0.62, p.y + Math.sin(t) * r * 0.26); g.lineTo(p.x + Math.cos(t) * r * (0.62 + 0.5 * k), p.y + Math.sin(t) * r * (0.26 + 0.2 * k)); }
        g.stroke();
      }
    } };
}
// everyone on ones here: Ife's patter is a drawing a frame
export default { name: "desc_shaft", start: startOf("shaft"), frames: FRAMES, fps: FPS, cutOn: "beat", sets: ["stairwell"], cast: CAST, frame, held: (f) => f,
  marks: LAND.map((l, i) => ({ at: l, what: `Tane lands on flight ${K0 + i + 1}; Juno hops rails`, on: i % 2 ? "bar" : "beat" })) };
