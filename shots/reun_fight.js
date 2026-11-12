// THE REUNION, parts 3 and 4: THE FIGHT and THE END, section frames L 298-646 (song 131.83-146.33 s). Every cut and hit
// is on a kick of reun_cast.js K (or on the brass / strings where it says so); `node engine/marks.mjs shots/reunion.js`.
// The chain, each move causing the next:
//   rise    298  the brass: the warden comes up over the gantry's side (a claw on the rail on 303, 308, 310, 315) and its
//                weight comes down on the kick at 318
//   land    318  from behind the four: it is on the bridge; a step on 328
//   ready   338  the four, from in front and below: Tane draws the pipe, Juno drops to her board; its pincer comes over them (348)
//   jgo     357  JUNO goes straight up at it;  snap 367: the pincer shuts on the air behind her
//   orbit   377  she rings its head, it slashes (377), rears after her (387) and comes DOWN with both forefeet (397, the
//                brass) on the one length of deck that IFE is at the controls of
//   ibox    407  Ife at the pedestal, the forefoot beside her; ikey 417: her CRT says LOCKED; her finger comes down on 427: OPEN
//   blow    437  seen from the side and above, the plate alone in frame: its four clamps pop off (437), the plate drops out from
//                under the forefeet that stand on it, the forelegs go down the hole after it, and its trunk hits the deck (447)
//   tcharge 457  TANE, the pipe out;  tleap 467 up its neck;  thit 477 (kick and brass): the pipe through its back
//   chain   487  it comes apart on 487, 496, 506, a blast each
//   nwalk   516  NOOR, who strolled up under its jaws to the lip of the hole while all this went on (she is in the wides:
//                orbit, blow, chain; noorAt), comes back at the same pace while it falls round them (526, 536)
//   nover   546  its head comes down in front of them; they step over it (556); its last eye goes out (566)
//   gone    576  what is left goes over the side; far below, on 586, it blows
//   grin    596  the four, breathless, grinning (606, 616)
//   unlock  636  THE LAST KICK: the deck's clamps let go under them; they look down. Cut.
// THE LAST FRAME (L 645, song frame 3511), for the fall: camera pos [0.35, 1.85, 55.4], target [0, 0.95, 62], fov 30, looking +Z along
// the gantry (night, alarm red). The four stand in a row across the deck at z = 62, facing the camera (-Z, yaw 180),
// from screen left to right: TANE x = +1.25 (pipe over his right shoulder), JUNO x = +0.45 (board under her arm, off
// it), IFE x = -0.35, NOOR x = -1.15. All four look DOWN at the deck. The deck has dropped 0.3 m and a seam has opened
// across it just in front of their feet (z 60.85-61.65, still widening); the first hole (z 67.2-73.2) is still open behind them.
import { camera } from "../engine/body.js";
import { stance } from "../machines/warden.js";
import { dentAt } from "../sets/atrium.js";
import { fireBlast, FIRE } from "../engine/fx.js";
import { speedLines } from "./slice_fx.js";
import { kana, latin } from "../sets/sign.js";
import { FPS, F0, W, H, PW, PH, K, CAST, NIGHT, MEET, clamp, lerp, ease, wob, rnd, mix3, kickAt, stand, plateLight } from "./reun_cast.js";

export const CUT = { rise: 298, land: 318, ready: 338, jgo: 357, snap: 367, orbit: 377, ibox: 407, ikey: 417, blow: 437, tcharge: 457, tleap: 467, thit: 477, chain: 487, nwalk: 516, nover: 546, gone: 576, grin: 596, unlock: 636, end: 646 };
const ORDER = Object.keys(CUT), lengthOf = (n) => CUT[ORDER[ORDER.indexOf(n) + 1]] - CUT[n];
const shot = (name, o) => ({ name: "reun_" + name, start: (F0 + CUT[name]) / FPS, frames: lengthOf(name), fps: FPS, cutOn: "kick", sets: ["atrium"], cast: CAST, held: (f) => f, ...o });
const src = (who, n) => ({ src: `/kits/${who}/closeup/${n}`, key: "magenta" });
const cam2 = (c) => camera({ fov: 30, ...c, w: W, h: H });
const INK = "#140a16";

// ---- the warden ------------------------------------------------------------------------------------------------------
const WZ = 82, HATCH = [67.2, 73.2], DECK = { y: 0, half: 2.25, x: 0 }, S0 = stance([0, 0, WZ], 180);
const at = (i, z, y = 0) => [S0[i][0], y, z];
// each foot: where it is before the shot, then [L it comes down, where, frames of swing, height of the swing]
const FEET = [
  { from: [9, -10, 76], steps: [[315, at(0, 77.4), 6, 3], [328, at(0, 73.9), 6, 1.6], [357, at(0, 71.6), 6, 1.6], [397, at(0, 70.0), 14, 6.5], [446, [-1.7, -9.5, 70.6], 8, 0]] },
  { from: [8, -9, 77], steps: [[303, at(1, 77.4), 6, 2.5], [328, at(1, 73.9), 6, 1.6], [357, at(1, 71.6), 6, 1.6], [397, at(1, 70.2), 14, 6.5], [446, [1.7, -9.5, 70.9], 8, 0]] },
  { from: [9, -10, 81], steps: [[318, at(2, 81.8), 6, 3], [348, at(2, 75.6), 6, 1.6]] },
  { from: [8, -9, 82], steps: [[308, at(3, 81.8), 6, 2.5], [348, at(3, 75.6), 6, 1.6]] },
  { from: [9, -10, 87], steps: [[318, at(4, 86.4), 6, 3], [338, at(4, 81.0), 6, 1.6]] },
  { from: [8, -9, 87], steps: [[310, at(5, 86.4), 6, 2.5], [338, at(5, 81.0), 6, 1.6]] },
];
const footAt = (leg, L) => {
  let p = leg.from;
  for (const [t, q, sw, arc] of leg.steps) { if (L >= t) { p = q; continue; } if (L > t - sw) { const u = ease((L - (t - sw)) / sw); return [lerp(p[0], q[0], u), lerp(p[1], q[1], u) + Math.sin(Math.PI * u) * arc, lerp(p[2], q[2], u)]; } break; }
  return p;
};
const hitE = (L, t, tau) => L >= t ? Math.exp(-(L - t) / tau) : 0;
const STEPS = [328, 338, 348, 357], TZ = [82, 80, 78, 76, 74.5];
const trunkZ = (L) => { let z = TZ[0]; STEPS.forEach((t, i) => { z = lerp(z, TZ[i + 1], ease((L - (t - 7)) / 7)); }); return z - 1.3 * ease((L - 437) / 10); };
// Juno's way round its head (357-402): up from the deck, twice round, and down past Ife
const HEADC = [0, 5.2, 69.5];
export const junoAt = (L) => {
  const u = clamp((L - 357) / 10), a = -1.2 + (L - 367) * 0.21, r = 5.2, orbit = [HEADC[0] + Math.sin(a) * r, HEADC[1] + 1.6 + 1.3 * Math.sin((L - 367) * 0.33), HEADC[2] - Math.cos(a) * r * 0.75];
  const start = [0.65, 0.3, MEET + 1.5], go = [lerp(start[0], 2.6, u), lerp(start[1], 7, u * u), lerp(start[2], 66, u)];
  if (L < 367) return go;
  if (L >= 377) { const v = (L - 377) / 18; return [-8 + Math.sin(Math.PI * clamp(v)), 6.6 - 4.6 * v * v, 73.5 - 11.5 * v]; }      // one pass across its face, right under its eyes, and away down the deck
  const d = ease((L - 389) / 9), down = [-0.4, 0.5, 61];
  return mix3(L < 370 ? mix3(go, orbit, (L - 367) / 3) : orbit, down, d);
};
const IFE = [1.25, 0, 64.75], PED = [1.3, 0, 63.7], HEADREST = [0.95, 1.3, 66.7];
// what the warden is told at L
export function wardenAt(L) {
  const rise = ease((L - 298) / 18), kb = STEPS.reduce((a, t) => a + hitE(L, t, 2.5) * 0.4, 0);
  const rear = ease((L - 380) / 9) * (1 - ease((L - 392) / 5)), fall = ease((L - 438) / 9), sl = hitE(L, 397, 2.5), cr = hitE(L, 447, 3);
  const pos = [lerp(8.5, 0, rise), lerp(-12, 0, rise), trunkZ(L)], strug = L >= 447 && L < 477 ? 1 : 0;
  const s = { pos, yaw: 180, deck: DECK, feet: FEET.map((f) => footAt(f, L)),
    height: 5.6 + 1.3 * rear - 3.1 * fall, bob: 1.2 * Math.sin(Math.PI * clamp((L - 306) / 12)) * (L < 318 ? 1 : 0) - 0.9 * hitE(L, 318, 2.5) - kb - 1.0 * sl - 0.6 * cr + strug * 0.12 * wob(L, 1.9, 3.1, 1),
    pitch: -24 * rear + 7 * ease((L - 397) / 6) + 22 * fall, roll: 32 * (1 - rise) + strug * 3 * wob(L, 1.3, 2.3, 2),
    eye: L < 300 ? 0.2 : L < 447 ? 1.3 + 0.5 * hitE(L, 318, 4) : L < 477 ? 0.9 + 0.5 * wob(L, 2.1, 3.3, 4) : 0.5, sway: L >= 377 && L < 397 ? 1 : 0.2 };
  // what it looks at, and its head thrown at it
  s.look = L < 357 ? [0, 1.4, 63] : L < 400 ? junoAt(L) : L < 447 ? [IFE[0], 0.8, IFE[2]] : [0, 1, 62];
  // from the moment the plate goes its head comes down too: its chin on the deck at the hole's near lip (447), its neck a ramp across the hole
  if (L >= 438) { const u = ease((L - 438) / 9), b = hitE(L, 447, 2.5); s.head = mix3([IFE[0] - 0.3, 2.9, 66.9], HEADREST, u); s.head[1] += 0.25 * b * Math.abs(Math.cos((L - 447) * 0.9)) + (L >= 447 && L < 477 ? 0.05 * wob(L, 1.7, 2.9, 5) : 0); }
  s.reach = L < 357 ? 0.25 * ease((L - 338) / 12) : L < 397 ? 0.1 : L < 437 ? 0.9 * ease((L - 408) / 22) : 1;
  // the pincer: over the four (348), after Juno (snaps shut on 367 and 377), then cocked
  if (L >= 357 && L < 397) { const j = junoAt(L - 2), sn = Math.max(hitE(L, 367, 30) > 0 && L < 372 ? 1 : 0, L >= 377 && L < 382 ? 1 : 0); s.arm = { to: [j[0] * 0.8, j[1] - 0.5, Math.max(j[2], 66.2)], open: sn ? 0 : 1 }; }
  else if (L >= 397 && L < 437) s.arm = { to: [2.6, 4.2 - 1.6 * ease((L - 410) / 20), 68.5], open: 0.9 };
  if (L >= 477) s.broken = { back: (L - 477) / FPS, ...(L >= 487 ? { leg2: (L - 487) / FPS, leg3: (L - 487) / FPS, fan: (L - 487) / FPS } : {}), ...(L >= 496 ? { arm: (L - 496) / FPS, leg4: (L - 496) / FPS, leg5: (L - 496) / FPS } : {}),
    ...(L >= 506 ? { neck: (L - 506) / FPS, head: (L - 506) / FPS, leg0: (L - 506) / FPS, leg1: (L - 506) / FPS } : {}), ...(L >= 516 ? { trunk: (L - 516) / FPS } : {}) };
  return s;
}
// ---- blasts (engine/fx.js, drawn on the frame at their place in the world) --------------------------------------------
const BLASTS = [
  { at: 477, p: [0, 4.6, 73.9], R: 3.2, seed: 11, big: 1 }, { at: 487, p: [-3.5, 6, 74.5], R: 3.4, seed: 13, big: 1 }, { at: 496, p: [3.2, 5, 78], R: 3.6, seed: 17, big: 1 }, { at: 506, p: [0.3, 2.5, 69], R: 4.2, seed: 19, big: 1 },
  { at: 516, p: [0, 2.4, 73.5], R: 4.4, seed: 23, big: 1 }, { at: 526, p: [-2.5, 3, 77], R: 3.4, seed: 29, big: 1 }, { at: 536, p: [2.4, 1.5, 71], R: 3.2, seed: 31, big: 1 },
];
const KICKS_HIT = [318, 397, 447, 477, 487, 496, 506, 516, 526, 536, 546, 586, 636];
function blasts(g, c, L, o = {}) {
  for (const b of BLASTS) { const age = L - b.at; if (age < 0 || age > 60 || (o.only && !o.only(b))) continue; const p = c.project(b.p); if (p.z < 0.5) continue; fireBlast(g, { cx: p.x, cy: p.y, s: p.s }, age, { R: b.R * (o.k ?? 1), seed: b.seed, floor: (DECK.y - b.p[1]) < -4 ? -30 : -(b.p[1] - DECK.y) - 0.1, wrecks: b.big ? 2 : 0, debris: b.big ? 12 : 6 }); }
}
const newest = (L) => { const t = KICKS_HIT.filter((x) => x <= L).pop(); return t == null ? { age: 99, jolt: 0 } : { at: t, age: L - t, jolt: Math.exp(-(L - t) / 3) }; };
const shake = (L, k = 1) => { const j = newest(L).jolt * k; return [wob(L, 2.9, 4.3, 1) * 0.12 * j, wob(L, 3.3, 5.1, 2) * 0.1 * j, wob(L, 2.1, 3.7, 3) * 0.02 * j]; };
const FIREIMP = { dark: [0.07, 0.0, 0.03], mid: [1.0, 0.36, 0.05], light: [1.0, 0.96, 0.62], ink: [0.05, 0, 0.02], thresholds: [0.14, 0.42], cel: [[0.05, 0, 0.02], [1, 0.92, 0.55]] };
const REDIMP = { dark: [0.05, 0.0, 0.05], mid: [0.9, 0.08, 0.1], light: [1, 0.9, 0.86], ink: [0.03, 0, 0.03], thresholds: [0.1, 0.34], cel: [[0.03, 0, 0.03], [1, 0.95, 0.9]] };
// what the film does on a hit at L: the impact frame, then a flash dying, a jolt
function hitPost(L, o = {}) {
  const h = newest(L); if (h.age > 12) return {};
  if (h.age === 0 && o.impact !== false) return { mode: 1, impact: o.red ? REDIMP : FIREIMP };
  return { flash: h.age === 1 ? 0.34 : h.age === 2 ? 0.12 : 0.004, ca: 0.0012 + 0.006 * h.jolt, bloom: 0.55 + 0.5 * h.jolt };
}
const lines = (g, L, cx = W / 2, cy = H / 2, col = "#fff3c0") => { const h = newest(L); if (h.age === 0) speedLines(g, W, H, { n: 100, seed: L, inner: 300, color: col, width: 0.02, cx, cy }); else if (h.age < 4) speedLines(g, W, H, { n: 56, seed: L, inner: 420 + h.age * 70, color: "rgba(255,255,255,0.85)", width: 0.008, cx, cy }); };
// a stay cable let go: a black whip across the frame from (x0, top), for 14 frames
function whip(g, x0, age, dir = 1, seed = 1) {
  if (age < 0 || age > 16) return; const a2 = age - age % 2, n = 14, pts = [];
  for (let i = 0; i <= n; i++) { const u = i / n, sw = Math.sin(u * 3.1 + a2 * 0.9 + seed) * 240 * u * Math.exp(-a2 / 9); pts.push([x0 + dir * (u * 420 + a2 * 46 * u) + sw, -40 + u * (H * 1.25) + a2 * a2 * 1.6 * u]); }
  for (const [col, w] of [[INK, 22], ["#3a2a4a", 9]]) { g.strokeStyle = col; g.lineWidth = w; g.lineCap = "round"; g.lineJoin = "round"; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke(); }
  if (age < 4) { g.fillStyle = "#fff6d0"; const [x, y] = pts[1]; g.beginPath(); for (let i = 0; i < 14; i++) { const a = i / 14 * 6.283, r = i % 2 ? 26 : 90 - age * 16; g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } g.fill(); }
}
// ---- its weight on the bridge ------------------------------------------------------------------------------------------
// Every foot that comes down on the deck bends it there (sets/atrium.js `dents`: the deck, its rails and posts dip and
// spring back, the beacons rock); while it stands the deck sags under its trunk; its fall onto the deck (447) is the hardest.
export const dentsAt = (L) => {
  const by = new Map(), put = (z, d, rock = 0) => { const k = Math.round(z * 2) / 2, q = by.get(k) ?? { z, d: 0, w: 5.5, rock: 0 }; q.d += d; q.rock += rock; by.set(k, q); };
  for (const leg of FEET) for (const [t, q] of leg.steps) { const a = L - t; if (a < 0 || a > 30 || q[1] !== 0) continue; put(q[2], 0.2 * Math.exp(-a / 5) * Math.cos(a * 0.85), 0.012 * Math.exp(-a / 7) * Math.cos(a * 1.4)); }
  if (L >= 447 && L < 487) { const a = L - 447; put(73.6, 0.45 * Math.exp(-a / 6) * Math.cos(a * 0.7) + 0.14, 0.02 * Math.exp(-a / 8) * Math.cos(a * 1.2)); }
  const out = [...by.values()].filter((q) => Math.abs(q.d) > 0.004).sort((a, b) => Math.abs(b.d) - Math.abs(a.d)).slice(0, 3);
  if (L >= 318 && L < 447) out.push({ z: trunkZ(L) - 1, d: 0.1 * ease((L - 318) / 5), w: 11, rock: 0 });
  return out;
};
// the stays it tears out as it comes down: [L, the stay's foot (z), its side]. Once cut a stay is gone for the rest of the film.
const CUTS = [[318, 80, 1], [320, 80, -1], [397, 64, -1], [399, 64, 1], [447, 96, 1], [496, 96, -1], [506, 112, 1]];
const cutAt = (L) => CUTS.filter(([t]) => L >= t).map(([t, z, side]) => ({ z, side, age: L - t }));
// the set at L
const scene = (L, o = {}) => ({ ...NIGHT, alert: 1.2, warden: o.warden === undefined ? wardenAt(L) : o.warden, dents: dentsAt(L), cut: cutAt(L), drop: 0.35 * hitE(L, 318, 3) * Math.cos((L - 318) * 0.9) + 0.4 * hitE(L, 397, 3) * Math.cos((L - 397) * 0.9) + 0.5 * hitE(L, 447, 3.5) * Math.cos((L - 447) * 0.8) + (L >= 636 ? 0.3 * (1 - Math.exp(-(L - 636) / 1.5)) : 0),
  hatch: [L < 437 ? { z0: HATCH[0], z1: HATCH[1], closed: true, clamps: null } : { z0: HATCH[0], z1: HATCH[1], ...(L < 480 ? { clamps: L - 437 } : {}), ...(L < 470 ? { fall: plateFall(L), tilt: 0.9 * ((L - 439) / FPS) * (L > 439 ? 1 : 0), roll: 0.25 * (L - 437) / FPS } : {}) },
    ...(L >= 636 ? [{ z0: 61.25 - 0.05 - 0.35 * (1 - Math.exp(-(L - 636) / 2.5)), z1: 61.25 + 0.05 + 0.35 * (1 - Math.exp(-(L - 636) / 2.5)) }] : [])], ...o.opt });
// the plate under its forefeet once its clamps are off: it goes down under their weight, faster than a thing merely dropped
const plateFall = (L) => { const t = (L - 437) / FPS; return 0.02 + 7 * t + 4.9 * t * t; };
// dust and grit shaken off the deck where a foot has just come down: lobes of dust low along the deck either side of it
// (on twos, hard-edged), and flecks dropping away under the bridge
// dust as it is drawn: the union of its lobes inked round, one flat tone of the night's own violet (no modelling: a shape, not balls)
function dustLobes(g, lobes) {
  for (const [col, grow, k, dx] of [[INK, 3, 1, 0], ["#3b2542", 0, 1, 0]]) { g.fillStyle = col; g.beginPath(); for (const [x, y, r] of lobes) { const rr = Math.max(0.5, r * k + grow); g.moveTo(x + r * dx + rr, y + r * dx); g.arc(x + r * dx, y + r * dx, rr, 0, 7); } g.fill(); }
}
function stomp(g, c, L, o = {}) {
  for (const [li, leg] of FEET.entries()) for (const [t, q] of leg.steps) {
    const a = L - t; if (a < 0 || a > 16 || q[1] !== 0 || (o.from && t < o.from)) continue; const p = c.project([q[0], 0, q[2]]); if (p.z < 0.5) continue;
    const a2 = a - a % 2, k = Math.max(0, 1 - a2 / 16), lobes = [];
    for (let i = 0; i < 12; i++) { const dir = i % 2 ? 1 : -1, d = (0.3 + 1.7 * rnd(i, t, li)) * (1 - Math.exp(-(a2 + 1) / 3)); lobes.push([p.x + dir * d * p.s * 0.8, p.y - (0.12 + 0.5 * rnd(i, t, li, 2) * (1 - Math.exp(-a2 / 5))) * p.s, (0.07 + 0.17 * rnd(i, t, li, 3)) * (0.5 + 0.5 * k) * p.s * (a2 > 10 ? k * 2.6 : 1)]); }
    dustLobes(g, lobes);
    if (o.flecks) { g.fillStyle = INK; for (let i = 0; i < 7; i++) { const tt = a / FPS, x = p.x + (rnd(i, t, li, 5) - 0.5) * 2.4 * p.s, y = p.y + (0.5 + (1 + 3 * rnd(i, t, li, 6)) * tt + 4.9 * tt * tt) * p.s, w = (0.05 + 0.08 * rnd(i, t, li, 7)) * p.s; g.save(); g.translate(x, y); g.rotate(a * (rnd(i, t, 8) - 0.5) * 1.4); g.fillRect(-w, -w * 0.5, w * 2, w); g.restore(); } }
  }
}
// a clamp letting go: a small hard star on its frame and the two after, a few sparks thrown out; no fire, no smoke
function pop(g, p, age, seed) {
  if (age < 0 || age > 5) return; const a2 = age - age % 2;
  if (age < 4) { g.fillStyle = age < 2 ? "#fffbe6" : "#ffd83a"; g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283 + seed + a2, r = (i % 2 ? 0.22 : 0.75 + 0.5 * rnd(i, a2, seed)) * p.s * (1 - age / 6); g.lineTo(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r * 0.85); } g.closePath(); g.fill(); g.stroke(); }
  g.strokeStyle = "#fff3c0"; g.lineWidth = 4; g.lineCap = "round"; for (let i = 0; i < 6; i++) { const a = rnd(i, seed) * 6.283, r0 = (0.5 + age * 0.3) * p.s, r1 = r0 + (0.25 + 0.3 * rnd(i, seed, 2)) * p.s; g.beginPath(); g.moveTo(p.x + Math.cos(a) * r0, p.y + Math.sin(a) * r0 * 0.8); g.lineTo(p.x + Math.cos(a) * r1, p.y + Math.sin(a) * r1 * 0.8); g.stroke(); }
}
// ---- Noor, all this while ---------------------------------------------------------------------------------------------
// From the moment Juno goes (357) she strolls up the deck along its left rail, under the machine's jaws, to the lip of the
// plate, is standing there when it drops (437), and from 506 turns back (nwalk, nover are her own shots). Where she is at L:
export const noorAt = (L) => { const u = clamp((L - 357) / 78); return [-1.7, 0, lerp(64.2, 65.9, u)]; };
const NSIDE = { foot: [1400, 1478], m: 0.00141 }, NEDGE = { foot: [1410, 1496], m: 0.00138 };
// a small figure standing in a wide: hung by its feet on the deck where it is (bent as the deck is), hidden by what is nearer
const small = (name, cam, at, K, L, o = {}) => { const h = stand(cam, [at[0], -dentAt(at[2], dentsAt(L)) - (o.drop ?? 0), at[2]], K.foot, K.m); return { plate: name, ...h, y: h.y + (o.bob ?? 0), layer: { ...plateLight(o), depth: Math.max(0.1, h.depth - 0.35), ...o.layer } }; };
const plate = (name, hung, o = {}) => ({ plate: name, ...hung, layer: { ...plateLight(o), depth: 0, ...o.layer } });
const boil = (f, k = 1.6) => ({ warp: k, warpStill: [0.5, 0.6], warpRadius: 0.3, warpDir: [1, 0.2], warpTime: (f - f % 2) * 0.55 });

// ---- 298: it comes up over the side ------------------------------------------------------------------------------------
export const rise = shot("rise", { cutOn: "brass", marks: [{ at: 0, what: "the brass: something is coming up over the side", on: "brass" }, { at: 5, what: "a claw on the rail", on: "strings" }, { at: 10, what: "another", on: "strings" }, { at: 17, what: "the far side", on: "strings" }],
  frame(f) {
    const L = CUT.rise + f, j = Math.max(hitE(L, 303, 2), hitE(L, 308, 2), hitE(L, 310, 2), hitE(L, 315, 2)), cam = { pos: [-1.3 + wob(L, 2.9, 4.3, 1) * 0.05 * j, 1.25 + wob(L, 3.3, 5.1, 2) * 0.05 * j, 66.5 - 0.03 * f], target: [1.2 - 0.06 * f, 4.4 + 0.12 * f, 82], fov: 52 };
    return { set: "atrium", camera: cam, options: scene(L), actors: [], overlay(g) { stomp(g, cam2(cam), L); }, post: { vignette: 0.5, flash: [303, 308, 310, 315].includes(L) ? 0.06 : 0, ca: 0.0012 + 0.004 * j } };
  } });
// ---- 318: on the bridge, from behind the four ---------------------------------------------------------------------------
const BACKS = { foot: [1376, 1492], m: 0.00144 }, READY = { foot: [1392, 1500], m: 0.00133 };
export const land = shot("land", { plates: { reun_backs: src("tane", "reun_backs_1.jpg") }, marks: [{ at: 0, what: "its weight comes down on the gantry", on: "kick" }, { at: 10, what: "a step", on: "kick" }],
  frame(f) {
    const L = CUT.land + f, s = shake(L, 1.3), cam = { pos: [0.5 + s[0], 0.62 + s[1], 56.6 - 0.02 * f], target: [0.1, 4.3 + 0.02 * f, 80], fov: 50, up: [Math.sin(-0.05 + s[2]), 1, 0] }, o = scene(L);
    return { set: "atrium", camera: cam, options: o, cels: [plate("reun_backs", stand(cam, [0, -o.drop, 61.6], BACKS.foot, BACKS.m), { layer: boil(f, 1.2) })],
      overlay(g) { lines(g, L, W * 0.5, H * 0.3, "#ffd0c0"); },
      post: { ...hitPost(L, { red: true }), vignette: 0.5 } };
  } });
// ---- 338: the four ----------------------------------------------------------------------------------------------------
export const ready = shot("ready", { plates: { reun_ready: src("tane", "reun_ready_1.jpg") }, marks: [{ at: 0, what: "the four: Tane draws the pipe", on: "kick" }, { at: 10, what: "it takes a step: the deck jumps under them", on: "kick" }],
  frame(f) {
    const L = CUT.ready + f, n = hitE(L, 348, 3), cam = { pos: [0.2, 0.55 + 0.004 * f, 67.6 - 0.01 * f + wob(L, 2.9, 4.3, 1) * 0.03 * n], target: [0, 1.2, 62], fov: 33 - 0.06 * f };
    return { set: "atrium", camera: cam, options: scene(L, { opt: { post: { bgBlur: 0.004, focus: [0.5, 0.45] } } }), cels: [plate("reun_ready", stand(cam, [0, 0, 62.3], READY.foot, READY.m), { layer: boil(f, 1.2) })],
      post: { flash: f === 0 ? 0.08 : L === 348 ? 0.1 : 0, vignette: 0.5, dark: 0.12 * ease((f - 6) / 6) } };
  } });
// ---- 357: Juno goes up at it; 367: the pincer shuts on the air -----------------------------------------------------------
export const jgo = shot("jgo", { plates: { reun_juno_go: src("juno", "reun_juno_go_1.jpg") }, marks: [{ at: 0, what: "Juno goes straight up at it", on: "kick" }],
  frame(f) {
    const L = CUT.jgo + f, u = f / 10, cam = { pos: [2.2, 9.5, 69.5], target: [0.5, 0, 63.5 + 1.5 * u], fov: 50, up: [0.25, 1, 0.6] }, k = 0.36 + 0.5 * u * u;
    return { set: "atrium", camera: cam, options: scene(L, { opt: { post: { bgBlur: 0.05 + 0.1 * u, focus: [0.46, 0.56] } } }),
      cels: [plate("reun_juno_go", { x: W * (0.47 + 0.02 * u), y: H * (0.66 - 0.2 * u), scale: k }, { layer: { rim: [0.6, 0.95, 1.0], rimDir: [4, -7] } })],
      overlay(g) { if (f < 3) speedLines(g, W, H, { n: 70, seed: f, inner: 380, color: "rgba(255,255,255,0.8)", width: 0.01, cx: W * 0.46, cy: H * 0.6 }); },
      post: { flash: f === 0 ? 0.14 : 0, charBlur: 0, vignette: 0.44 } };
  } });
export const snap = shot("snap", { plates: { reun_juno_taunt: src("juno", "reun_juno_taunt_1.jpg") }, marks: [{ at: 0, what: "the pincer shuts on the air behind her", on: "kick" }],
  frame(f) {
    const L = CUT.snap + f, w = wardenAt(L), j = junoAt(L), s = Math.exp(-f / 2.5), cam = { pos: [5.5 + wob(L, 2.9, 4.3, 1) * 0.1 * s, 6.3 + wob(L, 3.3, 5.1, 2) * 0.08 * s, 62.2], target: [w.arm.to[0] + 1.6, w.arm.to[1] + 0.3, w.arm.to[2] + 2], fov: 40 };
    const c = cam2(cam), p = c.project([j[0] - 1.6 - 0.16 * f, j[1] + 0.2 + 0.02 * f, j[2] - 1.2]);
    return { set: "atrium", camera: cam, options: scene(L, { opt: { post: { bgBlur: 0.012, focus: [0.5, 0.5] } } }),
      cels: [plate("reun_juno_taunt", { x: W * (0.36 - 0.03 * f), y: H * (0.44 - 0.018 * f), scale: 0.4 }, { layer: { rim: [0.6, 0.95, 1.0], rimDir: [5, -6] } })],
      overlay(g) { const q = c.project(w.arm.to); if (f < 5) { const a2 = f - f % 2; g.fillStyle = f < 2 ? "#fff6d0" : "#ffd83a"; g.beginPath(); for (let i = 0; i < 18; i++) { const a = i / 18 * 6.283 + a2, r = (i % 2 ? 0.5 : 2.2 + rnd(i, a2)) * q.s * (1 - f / 6); g.lineTo(q.x + Math.cos(a) * r, q.y + 60 + Math.sin(a) * r * 0.8); } g.fill(); } },
      post: f === 0 ? { mode: 1, impact: REDIMP } : { flash: f === 1 ? 0.2 : 0, ca: 0.0012 + 0.005 * s, vignette: 0.46 } };
  } });
// ---- 377: she rings its head; it rears (387) and comes down on the deck (397) --------------------------------------------
export const orbit = shot("orbit", { plates: { reun_juno_taunt: src("juno", "reun_juno_taunt_1.jpg"), reun_noor_side: src("noor", "reun_noor_side_1.jpg"), reun_ife_box: src("ife", "reun_ife_box_1.jpg") }, marks: [{ at: 0, what: "she crosses its face", on: "kick" }, { at: 10, what: "it rears after her", on: "kick" }, { at: 20, what: "both forefeet come down on the deck", on: "kick" }, { at: 20, what: "the slam (the brass too)", on: "brass" }],
  frame(f) {
    const L = CUT.orbit + f, s = shake(L, 1.6), j = junoAt(L), a = (L - 367) * 0.21 - 1.2, cam = { pos: [-15 + s[0], 2.2 + s[1], 60.5], target: [0, 5.2 - 1.6 * ease((f - 16) / 8), 72.5], fov: 44, up: [Math.sin(0.04 + s[2]), 1, 0] }, o = scene(L);
    return { set: "atrium", camera: cam, options: o,
      cels: [small("reun_noor_side", cam, noorAt(L), NSIDE, L, { drop: o.drop, bob: -3 * Math.abs(Math.sin((L - 357) * Math.PI / 13)) }), small("reun_ife_box", cam, [IFE[0], 0, IFE[2] - 0.1], IBOX, L, { drop: o.drop }),
        ...(L < 397 ? [(() => { const p = cam2(cam).project(j), k = p.s * 0.00073; return plate("reun_juno_taunt", { x: p.x + (PW / 2 - 1700) * k, y: p.y + (PH / 2 - 1000) * k, scale: k, turn: -0.25 }, { layer: { rim: [0.6, 0.95, 1.0], rimDir: [4, -5], tint: [1, 0.9, 0.88] } }); })()] : [])],
      under(g) { const c = cam2(cam); g.save(); g.translate(0, o.drop * c.project(PED).s); pedestal(g, c, 1); g.restore(); stomp(g, c, L, { from: 390, flecks: true }); },
      overlay(g) { lines(g, L, W * 0.52, H * 0.72, "#ffd0c0"); },
      post: { ...hitPost(L, { red: true }), vignette: 0.46 } };
  } });
// ---- 407: Ife at the pedestal -------------------------------------------------------------------------------------------
// the gantry's control pedestal, drawn on the frame at PED: a post, a sloped box, a socket, three lamps, a hazard band
function pedestal(g, c, lamps = 0) {
  const P = (x, y, z) => { const p = c.project([PED[0] + x, y, PED[2] + z]); return [p.x, p.y]; }, poly = (pts, col) => { g.fillStyle = col; g.strokeStyle = INK; g.lineWidth = 5; g.lineJoin = "round"; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.fill(); g.stroke(); };
  poly([P(0, 0, -0.12), P(0, 0, 0.12), P(0, 0.62, 0.12), P(0, 0.62, -0.12)], "#3a3550"); poly([P(0, 0, -0.2), P(0, 0, 0.2), P(0, 0.08, 0.2), P(0, 0.08, -0.2)], "#b88a1e");
  poly([P(0, 0.6, -0.3), P(0, 0.6, 0.3), P(0, 1.06, 0.26), P(0, 1.16, -0.3)], "#6a6788"); poly([P(0, 0.66, -0.24), P(0, 0.66, 0.24), P(0, 0.74, 0.24), P(0, 0.74, -0.24)], "#c8961e");
  [["#ff5a3c", 0], ["#ffd83a", 1], ["#5dff8c", 2]].forEach(([col, i]) => { const [x, y] = P(0, 1.02 - i * 0.085, -0.2), r = c.project(PED).s * 0.035; g.fillStyle = lamps > i ? col : "#2a2438"; g.strokeStyle = INK; g.lineWidth = 3; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.stroke(); });
  poly([P(0, 0.8, -0.08), P(0, 0.8, 0.22), P(0, 0.98, 0.21), P(0, 1.0, -0.08)], "#2a2438"); for (let i = 0; i < 3; i++) poly([P(0, 0.83 + i * 0.05, -0.04), P(0, 0.83 + i * 0.05, 0.18), P(0, 0.85 + i * 0.05, 0.18), P(0, 0.85 + i * 0.05, -0.04)], "#6dff9c");
}
const IBOX = { foot: [1500, 1486], m: 0.0008 };
export const ibox = shot("ibox", { plates: { reun_ife_box: src("ife", "reun_ife_box_1.jpg") }, marks: [{ at: 0, what: "Ife at the gantry's controls, its forefoot beside her", on: "kick" }],
  frame(f) {
    const L = CUT.ibox + f, cam = { pos: [-2.0, 0.5, 65.3 - 0.01 * f], target: [1.2, 1.05 + 0.01 * f, 64.4], fov: 40, up: [Math.sin(-0.06), 1, 0] }, c = cam2(cam);
    return { set: "atrium", camera: cam, options: scene(L), cels: [plate("reun_ife_box", stand(cam, [IFE[0], 0, IFE[2] - 0.1], IBOX.foot, IBOX.m), { layer: boil(f, 1.0) })],
      under(g) { pedestal(g, c, 1); },
      post: { flash: f === 0 ? 0.1 : 0, vignette: 0.5 } };
  } });
// her CRT: what the gantry's deck says. quad: the screen's corners on the frame [TL, BL, BR, TR]
function readout(g, quad, open, t) {
  const [tl, bl, br, tr] = quad, fg = open ? "#ffd83a" : "#6dff9c", bg = open ? "#2a1602" : "#04160b", inv = open && t < 4 && t % 2 === 0;
  g.save(); g.transform((tr[0] - tl[0]) / 400, (tr[1] - tl[1]) / 400, (bl[0] - tl[0]) / 300, (bl[1] - tl[1]) / 300, tl[0], tl[1]);
  g.beginPath(); g.roundRect(4, 4, 392, 292, 22); g.clip(); g.fillStyle = inv ? fg : bg; g.fillRect(0, 0, 400, 300); const col = inv ? bg : fg;
  kana(g, open ? "カイホウ" : "ロック", 34, 30, 54, 8, col); latin(g, open ? "OPEN" : "DECK 07", 366, 150, 46, col, { align: "right" });
  // the deck's plate between its four clamps
  g.strokeStyle = col; g.lineWidth = 7; g.strokeRect(70, 176, 260, 84);
  for (const [x, y] of [[70, 176], [330, 176], [70, 260], [330, 260]]) { g.fillStyle = col; if (open) { g.fillRect(x - 26 + (x < 200 ? -14 : 14), y - 6, 20, 12); } else g.fillRect(x - 16, y - 14, 32, 28); }
  g.fillStyle = "rgba(0,0,0,0.3)"; for (let y = 0; y < 300; y += 8) g.fillRect(0, y, 400, 3);
  g.restore();
}
const KEYQ = [[1894, 426], [1894, 838], [2372, 838], [2372, 426]];
export const ikey = shot("ikey", { plates: { reun_ife_key: src("ife", "reun_ife_key_1.png") }, marks: [{ at: 0, what: "her screen: the deck is locked", on: "kick" }, { at: 10, what: "her finger comes down: OPEN", on: "kick" }],
  frame(f) {
    const L = CUT.ikey + f, hit = hitE(L, 427, 2.2), cam = { pos: [-1.0, 1.0, 62.6], target: [1.2, 1.3, 66], fov: 40 }, k = 0.74 + 0.0012 * f + 0.02 * hit, x = W / 2 - 30, y = H / 2 + 30 + 22 * hit + Math.sin(f * 0.5) * 2;
    const q = KEYQ.map(([px, py]) => [x + (px - PW / 2) * k, y + (py - PH / 2) * k]);
    return { set: "atrium", camera: cam, options: scene(L, { opt: { post: { bgBlur: 0.01, focus: [0.4, 0.5], dark: 0.25 } } }), cels: [plate("reun_ife_key", { x, y, scale: k }, { layer: { tint: [0.9, 0.84, 0.86], ...boil(f, 0.8) } })],
      overlay(g) { readout(g, q, L >= 427, L - 427); if (L >= 427 && L < 431) speedLines(g, W, H, { n: 60, seed: L, inner: 520, color: "rgba(255,240,180,0.8)", width: 0.008, cx: q[0][0] + 170, cy: q[0][1] + 140 }); },
      post: { flash: f === 0 ? 0.08 : L === 427 ? 0.24 : L === 428 ? 0.08 : 0, vignette: 0.5, ca: 0.0012 + 0.004 * hit } };
  } });
// ---- 437: the clamps blow ------------------------------------------------------------------------------------------------
// From the side and a storey up, close on the one length of deck: the plate with a hazard band across each end and a clamp
// at each corner, its two forefeet standing on it, Noor at its lip. 437: the four clamps pop off (four small stars, no
// fire). The plate goes down flat under the feet, then tumbles; the hole is the deep's red. The forelegs go after it,
// straight down; the trunk, with nothing under its front, comes down on the deck's edge on 447.
export const blow = shot("blow", { plates: { reun_noor_side: src("noor", "reun_noor_side_1.jpg") }, marks: [{ at: 0, what: "the deck's clamps blow; the plate drops; its forelegs go through", on: "kick" }, { at: 10, what: "its trunk hits the deck", on: "kick" }],
  frame(f) {
    const L = CUT.blow + f, j2 = hitE(L, 447, 3), sh = [wob(L, 2.9, 4.3, 1) * 0.16 * j2, wob(L, 3.3, 5.1, 2) * 0.13 * j2, wob(L, 2.1, 3.7, 3) * 0.02 * j2], cam = { pos: [40 + sh[0] * 2, 0.9 + sh[1] * 2, 71.2 + 0.02 * f], target: [0, -0.7 + 1.9 * ease((f - 5) / 5), 72.0 + 0.8 * ease((f - 5) / 5)], fov: 11.5 + 1.5 * ease((f - 5) / 5), up: [Math.sin(-0.02 + sh[2]), 1, 0] }, c = cam2(cam), o = scene(L);
    return { set: "atrium", camera: cam, options: o, cels: [{ ...small("reun_noor_side", cam, noorAt(L), NSIDE, L, { drop: o.drop }), flip: true }],
      overlay(g) {
        for (const [i, [x, z]] of [[2.2, HATCH[0] + 0.3], [-2.2, HATCH[0] + 0.3], [2.2, HATCH[1] - 0.3], [-2.2, HATCH[1] - 0.3]].entries()) pop(g, c.project([x, 0.2, z]), L - 437, 3 + i * 2);
        if (L >= 447) { const p = c.project([0, 0, 73.6]), a = L - 447, a2 = a - a % 2, k = Math.max(0, 1 - a2 / 14), lobes = [];      // dust off the deck where the trunk came down on it
          for (let i = 0; i < 16; i++) { const dir = i % 2 ? 1 : -1, d = (0.6 + 3.2 * rnd(i, 7)) * (1 - Math.exp(-(a2 + 1) / 3)); lobes.push([p.x + dir * d * p.s, p.y - (0.1 + 0.7 * rnd(i, 8) * (1 - Math.exp(-(a2 + 1) / 4))) * p.s, (0.14 + 0.26 * rnd(i, 9)) * p.s * (0.4 + 0.6 * k)]); }
          dustLobes(g, lobes); }
        if (L >= 447) lines(g, L, W * 0.5, H * 0.55, "#ffd0c0"); else if (f > 0 && f < 9) { g.strokeStyle = "rgba(255,240,225,0.75)"; g.lineCap = "round"; for (let i = 0; i < 16; i++) { const x = W * (0.3 + 0.42 * rnd(i, f - f % 2)), y = H * (0.5 + 0.4 * rnd(i, f - f % 2, 2)), len = 90 + 190 * rnd(i, 3); g.lineWidth = 2 + 3 * rnd(i, 4); g.beginPath(); g.moveTo(x, y); g.lineTo(x - 6, y + len); g.stroke(); } }      // the fall is drawn: strokes straight down, over the hole
        stomp(g, c, L, { from: 440, flecks: true }); },
      post: { ...(f === 0 ? { mode: 1, impact: FIREIMP } : L === 447 ? { mode: 1, impact: REDIMP } : { flash: f === 1 ? 0.16 : L === 448 ? 0.25 : L === 449 ? 0.08 : 0, ca: 0.0012 + 0.006 * Math.max(hitE(L, 437, 2), j2), bloom: 0.6 }), vignette: 0.46 } };
  } });
// ---- 457: Tane ---------------------------------------------------------------------------------------------------------
export const tcharge = shot("tcharge", { plates: { reun_tane_charge: src("tane", "reun_tane_charge_1.jpg") }, marks: [{ at: 0, what: "Tane, the pipe out", on: "kick" }],
  frame(f) {
    const L = CUT.tcharge + f, cam = { pos: [0.3, 1.3, 70 - 0.5 * f], target: [0, 1.25, 40], fov: 34 }, bob = Math.abs(Math.sin(f * Math.PI / 5)) * 16, k = 0.72 + 0.012 * f;
    return { set: "atrium", camera: cam, options: scene(L, { warden: null, opt: { post: { bgBlur: 0.1, focus: [0.5, 0.42] } } }), cels: [plate("reun_tane_charge", { x: W / 2 + 40, y: H / 2 + 120 - bob, scale: k }, { fire: 0.5, layer: boil(f, 2.2) })],
      overlay(g) { speedLines(g, W, H, { n: 44, seed: f - f % 2, inner: 560, color: "rgba(255,225,200,0.5)", width: 0.006, cx: W * 0.5, cy: H * 0.42 }); },
      post: { flash: f === 0 ? 0.12 : 0, vignette: 0.5 } };
  } });
export const tleap = shot("tleap", { plates: { reun_tane_leap: src("tane", "reun_tane_leap_1.jpg") }, marks: [{ at: 0, what: "he goes up its neck", on: "kick" }],
  frame(f) {
    const L = CUT.tleap + f, u = f / 10, cam = { pos: [0.6, 0.5, 64.6 + 0.05 * f], target: [0.1, 4.2 + 0.1 * f, 73], fov: 56, up: [Math.sin(0.08), 1, 0] }, arc = 1 - (1 - u) * (1 - u);
    return { set: "atrium", camera: cam, options: scene(L, { opt: { post: { bgBlur: 0.02, focus: [0.5, 0.3] } } }), cels: [plate("reun_tane_leap", { x: W * (0.42 + 0.1 * u), y: H * (0.95 - 0.52 * arc), scale: 0.62 - 0.14 * u }, { fire: 0.3, layer: { rimDir: [0, -7], ...boil(f, 2.0) } })],
      overlay(g) { if (f < 3) speedLines(g, W, H, { n: 60, seed: f, inner: 420, color: "rgba(255,255,255,0.7)", width: 0.01, cx: W * 0.5, cy: H * 0.3 }); },
      post: { flash: f === 0 ? 0.1 : 0, vignette: 0.48 } };
  } });
const THIT = [0.4, 5.1, 73.6];
export const thit = shot("thit", { plates: { reun_tane_hit: src("tane", "reun_tane_hit_1.jpg") }, marks: [{ at: 0, what: "the pipe goes through its back", on: "kick" }, { at: 0, what: "(the brass lands with it)", on: "brass" }],
  frame(f) {
    const L = CUT.thit + f, s = shake(L, 2), cam = { pos: [-3.6 + s[0] * 0.5, 5.9 + s[1] * 0.5, 70.3], target: [0.3, 5.0, 73.5], fov: 50, up: [Math.sin(0.1 + s[2]), 1, 0] }, c = cam2(cam), p = c.project(THIT), k = p.s * 0.00092 * 1.7;      // (drawn larger than life against the machine: the blow has to read)
    return { set: "atrium", camera: cam, options: scene(L), cels: [plate("reun_tane_hit", { x: p.x + (PW / 2 - 1790) * k + (f > 1 ? -f * 5 : 0), y: p.y + (PH / 2 - 1500) * k - (f > 1 ? f * 9 - f * f * 0.5 : 0), scale: k }, { fire: 1.2 * Math.exp(-f / 5), layer: { rimDir: [5, -8] } })],
      under(g) { blasts(g, c, L, { only: (b) => b.at === 477 }); },
      overlay(g) { lines(g, L, p.x + 40, p.y + 40); },
      post: { ...(f < 2 ? { mode: 1, impact: FIREIMP } : { flash: f === 2 ? 0.4 : f === 3 ? 0.14 : 0.004, ca: 0.0012 + 0.007 * Math.exp(-f / 3), bloom: 0.9 }), vignette: 0.44 } };
  } });
// ---- 487: it comes apart -----------------------------------------------------------------------------------------------
export const chain = shot("chain", { plates: { reun_noor_edge: src("noor", "reun_noor_edge_1.jpg") }, marks: [{ at: 0, what: "a blast: its middle legs and its blades go", on: "kick" }, { at: 9, what: "a blast: its arm, its hind legs", on: "kick" }, { at: 19, what: "a blast: its neck and its head", on: "kick" }],
  frame(f) {
    const L = CUT.chain + f, s = shake(L, 2), cam = { pos: [17 + s[0] - 0.05 * f, 9 + s[1] + 0.05 * f, 92 + 0.1 * f], target: [0, 3.4, 74], fov: 46, up: [Math.sin(-0.07 + s[2]), 1, 0] }, c = cam2(cam);
    return { set: "atrium", camera: cam, options: scene(L), cels: [small("reun_noor_edge", cam, noorAt(L), NEDGE, L, { fire: 0.4 })],
      overlay(g) { blasts(g, c, L, { only: (b) => b.at >= 477 }); lines(g, L, W * 0.5, H * 0.5); whip(g, 400, L - 496, 1, 6); whip(g, 1400, L - 506, -1, 7); },
      post: { ...hitPost(L), vignette: 0.44 } };
  } });
// ---- 516: Noor comes on at the same pace ---------------------------------------------------------------------------------
export const nwalk = shot("nwalk", { plates: { reun_noor_walk: src("noor", "reun_noor_walk_1.jpg") }, marks: [{ at: 0, what: "Noor, at the same pace, as it falls round them", on: "kick" }, { at: 10, what: "a piece comes down behind", on: "kick" }, { at: 20, what: "another, beside", on: "kick" }],
  frame(f) {
    const L = CUT.nwalk + f, s = shake(L, 0.5), z = 67.5 - 0.045 * f, cam = { pos: [0.5 + s[0], 1.45 + s[1], z - 4.2], target: [0.1, 1.5, z + 6], fov: 38 }, c = cam2(cam), step = Math.sin(f * Math.PI / 14);
    return { set: "atrium", camera: cam, options: scene(L, { opt: { post: { bgBlur: 0.006, focus: [0.5, 0.5] } } }),
      cels: [plate("reun_noor_walk", { x: W / 2 - 60 + 5 * step, y: H / 2 + 170 - 7 * Math.abs(step), scale: 0.82 }, { fire: 0.6 * newest(L).jolt + 0.25, layer: { rimDir: [6, 4], ...boil(f, 2.4), warpStill: [0.47, 0.72], warpRadius: 0.2, warpDir: [-1, 0.1] } })],
      under(g) { blasts(g, c, L, { only: (b) => b.at >= 506 }); },
      overlay(g) { const a = L - 526; if (a >= -6 && a < 30) { const y = Math.min(1, (a + 6) / 6), yy = H * (-0.5 + 1.42 * y * y); g.save(); g.translate(W * 0.84, yy); g.rotate(0.5 + 0.02 * Math.max(0, a)); g.fillStyle = INK; g.fillRect(-90, -700, 180, 760); g.fillStyle = "#2a2f55"; g.fillRect(-74, -690, 148, 740); g.fillStyle = "#f07a22"; g.fillRect(-74, -80, 148, 60); g.fillStyle = "#14152b"; g.fillRect(-74, -690, 40, 740); g.restore(); } },
      post: { ...hitPost(L, { impact: f !== 0 }), ...(f === 0 ? { flash: 0.2 } : {}), vignette: 0.5 } };
  } });
// ---- 546: its head; they step over it ------------------------------------------------------------------------------------
const GUIDE = typeof location !== "undefined" && /warden_plate/.test(location.search);      // (rendering the plate's guide: the model itself)
const HEADZ = 64.2, NOVER = { foot: [1010, 1490], m: 0.00138 };
const headSpec = (L) => { const u = clamp((L - 540) / 6), y = 9 * (1 - u * u) + 0.5 * hitE(L, 546, 2.5) * Math.abs(Math.cos((L - 546) * 0.8)); return { pos: [0.1, y - 3.55, HEADZ + 5.4], yaw: 180, height: 5.6, pitch: 0, roll: -9, deck: { y: -400, half: 0 }, broken: { trunk: 9, back: 9, neck: 9, arm: 9, fan: 9, leg0: 9, leg1: 9, leg2: 9, leg3: 9, leg4: 9, leg5: 9 },
  look: [1.3, 1.5, HEADZ - 3.2], eye: L < 566 ? 1.4 - 0.5 * clamp((L - 556) / 10) + 0.3 * wob(L, 2.3, 3.1, 1) : 0.02, reach: 0 }; };
// From 556 its head is a DRAWING (machines/warden/head_lit.webp, head_out.webp; pipeline/warden_plate.py): painted over the
// set's own picture of the 3D head from this camera (shots/warden_plate.js), so it sits on the deck where the model fell;
// its eyes gutter twice and go out on 566 (the second drawing).
const HEADCEL = (L) => ({ plate: L >= 566 || L === 561 || L === 564 ? "warden_head_out" : "warden_head_lit", x: W / 2, y: H / 2, scale: W / 3840, depth: 90, layer: { depth: 0, tint: [0.72, 0.58, 0.72], rim: [0, 0, 0], rimDir: [0, 0], gradient: 0 } });
export const nover = shot("nover", { plates: { reun_noor_walk: src("noor", "reun_noor_walk_1.jpg"), reun_noor_over: src("noor", "reun_noor_over_1.jpg"), warden_head_lit: { src: "/machines/warden/head_lit.webp" }, warden_head_out: { src: "/machines/warden/head_out.webp" } }, marks: [{ at: 0, what: "its head comes down in front of them", on: "kick" }, { at: 10, what: "Noor steps over it", on: "kick" }, { at: 20, what: "its last eye goes out", on: "kick" }],
  frame(f) {
    const L = CUT.nover + f, s = shake(L, 1.2), near = f >= 10, cam = near ? { pos: [1.75, 0.3, HEADZ - 3.4], target: [-0.2, 1.4, HEADZ + 0.2], fov: 52, up: [Math.sin(-0.06), 1, 0] } : { pos: [-0.9 + s[0], 0.5 + s[1], HEADZ - 4.6], target: [0.3, 1.3, HEADZ + 1], fov: 44 }, c = cam2(cam);
    const far = c.project([0.2, 0, HEADZ + 4.6 - 0.05 * f]), g2 = f - 10, nx = 0.25 - 0.012 * g2;
    return { set: "atrium", camera: cam, options: scene(L, { warden: near && !GUIDE ? null : headSpec(L), opt: { post: { bgBlur: 0.004 } } }),
      cels: near ? [HEADCEL(L), plate("reun_noor_over", stand(cam, [nx + 0.45, 0, HEADZ - 0.75 - 0.02 * g2], NOVER.foot, NOVER.m), { layer: { rimDir: [-6, 4], ...boil(f, 1.6), warpStill: [0.4, 0.5], warpDir: [1, 0.1] } })]
        : [plate("reun_noor_walk", { x: far.x, y: far.y - 0.9 * far.s + 4 * Math.sin(f * 0.45), scale: far.s * 0.00125, depth: far.z }, { layer: { depth: far.z - 0.4 } })],
      overlay(g) { lines(g, L, W * 0.5, H * 0.62, "#ffd0c0"); if (L >= 546 && L < 556) { const p = c.project([0.4, 0, HEADZ]); fireBlast(g, { cx: p.x, cy: p.y, s: p.s }, L - 546 + 14, { R: 0.55, seed: 61, floor: 0, wrecks: 0, debris: 8 }); } },
      post: { ...(L === 546 ? { mode: 1, impact: REDIMP } : L === 566 ? { flash: 0.1 } : { flash: L === 547 ? 0.2 : f === 10 ? 0.08 : 0, ca: 0.0012 + 0.004 * newest(L).jolt }), vignette: 0.5, dark: L >= 566 ? 0.12 * ease((L - 566) / 6) : 0 } };
  } });
// ---- 576: what is left goes over the side ------------------------------------------------------------------------------
const huskSpec = (L) => { const t = (L - 570) / FPS; return { pos: [0, 0, 73.2], yaw: 180, height: 2.5, pitch: 22, deck: { y: -400, half: 0 }, carry: [3.2, 1.5, 0], eye: 0, broken: { trunk: t, back: t + 0.1, neck: 9, head: 9, arm: 9, fan: 9, leg0: t, leg1: t + 0.05, leg2: 9, leg3: 9, leg4: t + 0.2, leg5: 9 } }; };
export const gone = shot("gone", { marks: [{ at: 0, what: "what is left of it goes over the side", on: "kick" }, { at: 10, what: "far below, it blows", on: "kick" }],
  frame(f) {
    const L = CUT.gone + f, b = hitE(L, 586, 4), cam = { pos: [4.6, 13 + 0.03 * f, 66 + wob(L, 2.9, 4.3, 1) * 0.06 * b], target: [5.5, -40, 73.5], fov: 50, up: [0, 0, 1] }, c = cam2(cam);
    return { set: "atrium", camera: cam, options: scene(L, { warden: huskSpec(L), opt: { alert: 1.2 + 2 * b } }), actors: [],
      overlay(g) { if (L >= 586) { const p = c.project([9, -150, 73]); fireBlast(g, { cx: p.x, cy: p.y, s: p.s }, L - 586, { R: 26, seed: 71, floor: -200, wrecks: 0, debris: 10 }); } },
      post: { ...(L === 586 ? { mode: 1, impact: FIREIMP } : { flash: L === 587 ? 0.3 : L === 588 ? 0.1 : f === 0 ? 0.08 : 0, bloom: 0.5 + 0.6 * b }), vignette: 0.46 } };
  } });
// ---- 596: breathless, grinning; 636: the last kick --------------------------------------------------------------------------
const GRIN = { foot: [1400, 1493], m: 0.00131 }, ENDCAM = (L) => { const n = hitE(L, 606, 3) + hitE(L, 616, 3); return { pos: [0.35, 1.85, 55.4 + 1.2 * ease((596 + 40 - L) / 40) - 0.05 * n], target: [0, 0.95, 62], fov: 30 }; };
const endCel = (L, cam, name, drop = 0) => plate(name, stand(cam, [0.05, -drop, 62], GRIN.foot, GRIN.m), { layer: { ...boil(L - 596, 1.3), warpStill: [0.5, 0.66], warpRadius: 0.36 } });
export const grin = shot("grin", { plates: { reun_grin: src("tane", "reun_grin_1.jpg") }, marks: [{ at: 0, what: "the four, breathless, grinning", on: "kick" }, { at: 10, what: "a breath", on: "kick" }, { at: 20, what: "a breath", on: "kick" }],
  frame(f) {
    const L = CUT.grin + f, cam = ENDCAM(L), br = Math.sin(f * 0.5) * 3;
    const cel = endCel(L, cam, "reun_grin"); cel.y += br;
    return { set: "atrium", camera: cam, options: scene(L, { warden: null, opt: { alert: 0.6, post: { bgBlur: 0.004, focus: [0.5, 0.5], dark: 0.2 } } }), cels: [cel], post: { flash: f === 0 ? 0.1 : 0, vignette: 0.5 } };
  } });
export const unlock = shot("unlock", { plates: { reun_grin_down: src("tane", "reun_grin_2.png") }, marks: [{ at: 0, what: "THE LAST KICK: the deck's clamps let go under them; they look down", on: "kick" }],
  frame(f) {
    const L = CUT.unlock + f, cam0 = ENDCAM(L), j = Math.exp(-f / 2), cam = { ...cam0, pos: [cam0.pos[0] + wob(L, 2.9, 4.3, 1) * 0.05 * j, cam0.pos[1] + wob(L, 3.3, 5.1, 2) * 0.05 * j, cam0.pos[2]] }, o = scene(L, { warden: null, opt: { alert: 2, post: { bgBlur: 0.004, focus: [0.5, 0.5], dark: 0.2 } } }), c = cam2(cam);
    return { set: "atrium", camera: cam, options: o, cels: [endCel(L, cam, "reun_grin_down", o.drop)],
      overlay(g) { for (const x of [-2.25, 2.25]) { const p = c.project([x, -o.drop, 61.25]); if (f < 7) { const a2 = f - f % 2; g.fillStyle = f < 2 ? "#fff6d0" : "#ffd83a"; g.beginPath(); for (let i = 0; i < 16; i++) { const a = i / 16 * 6.283 + a2, r = (i % 2 ? 0.25 : 0.9 + 0.5 * rnd(i, a2, x)) * p.s * (1 - f / 8); g.lineTo(p.x + Math.cos(a) * r, p.y + Math.sin(a) * r * 0.8); } g.fill(); } } },
      post: { ...(f === 0 ? { mode: 1, impact: REDIMP } : { flash: f === 1 ? 0.3 : f === 2 ? 0.1 : 0, ca: 0.0012 + 0.006 * j }), vignette: 0.5 } };
  } });
export const FIGHT_SHOTS = [rise, land, ready, jgo, snap, orbit, ibox, ikey, blow, tcharge, tleap, thit, chain, nwalk, nover, gone, grin, unlock];
export default FIGHT_SHOTS;
