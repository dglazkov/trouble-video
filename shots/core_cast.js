// The core (song 78.875-92.9 s, frames 1893-2229): what its shots share. Frames here are frames of the SONG; each shot
// counts its own from its cut. This is the song's dip: the kick stops at 78.45 s and is back at 92.93 s (the next
// section's first frame), nobody sings. The brass plays a fanfare with no drums under it (a phrase from the cut to
// 1913, a breath, then from 1932 without a break to about 2064); then strings, keyboard and synth on every beat with
// percussion ticking up toward the kick. Every cut and event is on an onset of analysis/ (engine/sync.js): each shot
// lists its own as `marks`, and `node engine/marks.mjs shots/core.js` holds them to the song.
// The joke: NOOR puts the headphones on and presses PLAY, and from then on what we hear is what is on the tape.
//   duct   1893  Noor walks down a maintenance duct; the headphones go on (they seat on the brass's accent, 1913)
//   play   1923  the cassette player on the hip, close: the thumb presses PLAY on 1932, where the fanfare comes in to
//                stay; the reels are turning by the next note (1938)
//   open   1952  the duct opens on the station's zero-gravity core. Noor steps off the lip on 1972 and is adrift by 1977
//   drift  1992  Noor adrift, hands in pockets, coat and hair afloat. Behind, an eye in the duct (2022): the enforcer comes
//                out after them (2032), and the core's security grid wakes, a bank of emitters on each tick (2036-2061)
//   grid   2071  through the lattice: a beam stops a hair over the head (2081), beside the shoulder (2091), under the
//                boots (2101), each on a note
//   face   2111  close: a beam slashes past in front of the eyes (2121), one drops to a hair over the head (2131), one
//                shuts behind (2141). The eyes stay half closed
//   close  2151  the enforcer follows the same way in and the grid closes on it: a beam bites on each drum hit
//                (2156-2191), they tighten (2196, 2201) and go through it (2211). It comes apart in slices as Noor
//                touches down on the far side (2221), back to it throughout. The kick is the next frame after 2229.
import { proportions } from "../engine/body.js";
import { ISLAND, LAT } from "../sets/coreplan.js";
export const FPS = 24;
export const CUT = { duct: 1893, play: 1923, open: 1952, drift: 1992, grid: 2071, face: 2111, close: 2151, end: 2230 };
export const startOf = (name) => CUT[name] / FPS;
export const CAST = { noor: "/kits/noor" };
export const EV = { phones: 1913, press: 1932, reels: 1938, step: 1972, off: 1977, eye: 2022, emerge: 2032, wake: [2036, 2041, 2046, 2051, 2056, 2061], lit: 2067,
  miss: [2081, 2091, 2101], slash: [2121, 2131, 2141], enter: 2151, bite: [2156, 2161, 2166, 2171, 2176, 2181, 2186, 2191], tighten: [2196, 2201], cut: 2211, land: 2221 };
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const ease = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
export const lerp = (a, b, t) => a + (b - a) * t;
export const wob = (f, a, b, c) => Math.sin(f * a + c) * 0.6 + Math.sin(f * b + c * 2.3) * 0.4;
export const rnd = (...n) => { let h = 2166136261; for (const x of n) { h ^= Math.round(x * 1000) | 0; h = Math.imul(h, 16777619); h ^= h >>> 13; } return ((Math.imul(h, 2246822519) ^ (h >>> 15)) >>> 0) / 4294967296; };
const D = Math.PI / 180;

// ---- the place: sets/coreplan.js (the duct to its lip at z = 0, the lattice, the island's deck from z = ISLAND) ----------
export { ISLAND, LAT } from "../sets/coreplan.js";
export const P = proportions({ height: 1.82, heads: 7.5 });

// ---- Noor ---------------------------------------------------------------------------------------------------------------
// Where Noor is (the point under the feet): at the lip, a step off it on 1972, then adrift at SPEED along +Z, rising
// a little and coming down to the island's deck on 2221. They never turn and never look back.
export const SPEED = 2.0;
export function noorAt(F) {
  const z0 = -0.3, zd = (G) => z0 + SPEED * (G - EV.step) / FPS;
  if (F <= EV.step) return { x: 0, y: 0, z: z0 };
  // coming in to the deck the last half second is slower (a foot reaching down), and then they stand
  const slow = (G) => { const u = clamp((G - (EV.land - 12)) / 12); return zd(Math.min(G, EV.land - 12)) + SPEED * 12 / FPS * (u - 0.3 * u * u); };
  const G = Math.min(F, EV.land), u = clamp((G - EV.off) / (EV.land - EV.off));
  return { x: 0.25 * Math.sin(Math.PI * 2 * u) * Math.sin(Math.PI * u), y: 0.9 * Math.sin(Math.PI * u) ** 1.15, z: slow(G) };
}
// The drift is drawn four times over for each camera that sees it (the hair and the coat at four moments of one slow
// billow; the body does not move). From in front the four are a cycle, each held six frames; from behind they are a
// swell, played there and back, each held four.
export const driftCel = (F, sheet) => sheet === "front" ? Math.floor((F - EV.off) / 6) % 4 : [0, 1, 2, 3, 2, 1][Math.floor((F - EV.off) / 4) % 6];
export const asDrawn = (f) => f;      // a shot's `held`: its figures' drawings are already stepped by the shot itself

// ---- the enforcer ---------------------------------------------------------------------------------------------------------
// It comes down the duct after them (its eye shows in the dark on 2022, its face is at the lip by 2046), follows the
// same line across, and is inside the lattice when the grid closes: held from the second bite (2161) at z = HELD.
export const HELD = 9.6;
const EKEYS = [[1960, -38], [2000, -30], [2022, -8], [2032, -5], [2050, -1.2], [2071, 1.3], [2151, 8.2], [2163, HELD], [2400, HELD]];
const ezRaw = (F) => { let i = 0; while (i < EKEYS.length - 2 && F > EKEYS[i + 1][0]) i++; const [a, za] = EKEYS[i], [b, zb] = EKEYS[i + 1]; return lerp(za, zb, clamp((F - a) / (b - a))); };
const ez = (F) => { let s = 0; for (let k = -6; k <= 6; k++) s += ezRaw(F + k); return s / 13; };
const pathY = (z) => 0.9 * Math.sin(Math.PI * clamp((z - 0.1) / 20.3)) ** 1.15;
export function enforcerAt(F) {
  const z = ez(F), out = ease((z + 1) / 3), y = lerp(1.62, pathY(z) + 1.05, out), held = clamp((F - EV.bite[0]) / 6), cutT = (F - EV.cut) / FPS;
  const strain = held * (F < EV.cut ? 1 : 0), j = (a, b, c) => strain * 0.035 * wob(F, a, b, c);
  return { type: "enforcer", pos: [j(1.9, 2.7, 1) + 0.12 * Math.sin(F * 0.05) * (1 - held), y + j(2.3, 3.1, 2) + 0.06 * Math.sin(F * 0.11) * (1 - held), z + j(1.7, 2.9, 3)],
    yaw: 5 * Math.sin(F * 0.043) * (1 - held) + strain * 2.5 * wob(F, 1.3, 2.1, 4), pitch: -4 * (1 - held) + strain * 3 * wob(F, 1.1, 1.9, 5), roll: 2 * Math.sin(F * 0.06) * (1 - held) + strain * 3.5 * wob(F, 0.9, 1.7, 6),
    eye: F < EV.eye ? 0 : F >= EV.cut ? 0 : 1 + 0.8 * strain * (0.5 + 0.5 * wob(F, 2.1, 3.3, 7)), thrust: 0.25 + 0.9 * strain, beam: F >= EV.cut ? 0 : 0.9 * ease((F - EV.eye) / 8) * (1 - 0.6 * held), beamTilt: 0.06 * Math.sin(F * 0.07),
    sway: strain, seed: 77, cut: cutT >= 0 ? cutT : null };
}
// What is left of it after 2211: five slices (back to front), each sliding off in its own plane. CUTS: the planes, as
// distances along its length from its middle. slabAt(j, t) -> [dx, dy, dz, roll] t seconds after the cut.
export const CUTS = [-0.42, -0.14, 0.14, 0.42];
// They go like a pushed deck of cards: each slice a little further down the same slant than the one behind it.
const SLIDE = [-0.78, -0.62];
export function slabAt(j, t) { const u = Math.max(0, t - 0.13), d = (j - 2) * (0.62 * u ** 1.5 + 0.012 * Math.min(1, t * 10)); return [SLIDE[0] * d, SLIDE[1] * d, (j - 2) * 0.1 * u, (j - 2) * 0.07 * u + (j % 2 ? 0.05 : -0.05) * u]; }

// ---- the grid -------------------------------------------------------------------------------------------------------------
// A beam is a straight line across the lattice in a plane z = const, from an emitter on one of the six longerons
// (at `at` degrees round the axis), turning about its emitter: `off` is how far (metres, signed) it passes from a
// point C of that plane. Each beam has its own life:
//   miss     it swings in on a note and stops a hair from Noor as they pass through its plane, then eases away
//   close    it sweeps well clear of the way until the enforcer is in the lattice, then bites on its drum hit: swings
//            in to touch the hull, tightens twice, and on 2211 goes through
//   idle     it sweeps well clear, for the lattice's sake
// Every beam is dark until its bank wakes (EV.wake) and they all go out two frames after the cut.
const hexAt = (deg, z) => [LAT.r * Math.cos(deg * D), LAT.y + LAT.r * Math.sin(deg * D), z];
// the line from emitter E that passes `off` from C (both in the plane): its far end on the cage, and the point of it nearest C
function chord(E, C, off) {
  const dx = C[0] - E[0], dy = C[1] - E[1], Dl = Math.hypot(dx, dy), th = Math.atan2(dy, dx) + Math.asin(clamp(off / Dl, -0.999, 0.999)), d = [Math.cos(th), Math.sin(th)];
  const along = dx * d[0] + dy * d[1], len = 2 * Math.max(0.5, -((E[0]) * d[0] + (E[1] - LAT.y) * d[1]));
  return { a: E, b: [E[0] + d[0] * len, E[1] + d[1] * len, E[2]], near: [E[0] + d[0] * along, E[1] + d[1] * along, E[2]], dir: d };
}
// how far from its middle the enforcer's hull reaches toward a beam that comes at it along the unit normal n (in the plane)
const hull = (n) => Math.abs(n[0]) * 1.2 + Math.abs(n[1]) * (n[1] > 0 ? 0.62 : 0.8) - 0.3 * Math.min(Math.abs(n[0]), Math.abs(n[1]));
const swingIn = (F, on, from, to, n = 5) => F >= on ? to : F <= on - n ? from : lerp(from, to, 1 - (1 - (F - (on - n)) / n) ** 3);
const idleOff = (i, F) => (i % 2 ? 1 : -1) * (3.3 + 1.1 * Math.sin(F * (0.021 + 0.004 * (i % 5)) + i * 1.7) + 0.5 * Math.sin(F * 0.05 + i));
// the three that miss Noor in the wide shot: [the note, emitter's place round the cage, what of Noor it stops by (x, y from the feet), which side it comes from]
const MISS = [[EV.miss[0], 150, [0.0, 1.92], 1], [EV.miss[1], 270, [0.37, 1.2], -1], [EV.miss[2], 30, [0.0, -0.04], 1]];
const BEAMS = [];
MISS.forEach(([on, at, pt, side], i) => { const n = noorAt(on); BEAMS.push({ kind: "miss", i, on, at, z: n.z + 0.1, bank: i, C: [n.x + pt[0], n.y + pt[1]], side }); });
CUTS.forEach((c, p) => [0, 1].forEach((h) => { const k = p * 2 + h, order = [0, 5, 2, 7, 4, 1, 6, 3][k]; BEAMS.push({ kind: "close", i: 3 + k, on: EV.bite[order], at: [90, 270, 330, 150, 30, 210, 270, 90][k] , z: HELD + c, bank: (k + 1) % 6, side: h ? -1 : 1, order }); }));
[[7.6, 30], [11.3, 210], [12.2, 90], [13.1, 330], [14.0, 150], [14.9, 270], [15.8, 30], [16.5, 210], [11.8, 330]].forEach(([z, at], k) => BEAMS.push({ kind: "idle", i: 11 + k, z, at, bank: (k + 3) % 6 }));
export const EMITTERS = BEAMS.map((b) => ({ at: hexAt(b.at, b.z), deg: b.at, bank: b.bank }));
// The lattice at song frame F: [{ a, b (ends), near (the point nearest what it threatens), gain 0..1.6, kind, touch: it is on the hull }]
export function beamsAt(F) {
  const out = [];
  for (const b of BEAMS) {
    const wake = EV.wake[b.bank], E = hexAt(b.at, b.z); if (F < wake) continue;
    if (F >= EV.cut + 3) continue;
    let off, C = [0, LAT.y], gain = 0.8, touch = false, flick = F - wake < 4 ? [1.5, 0.2, 1.2, 0.6][F - wake] : 1;
    if (b.kind === "miss") {
      // clear of the way; in on the note (five frames, stopping dead); held two; away again
      const far = 3.2 + 0.5 * Math.sin(F * 0.03 + b.i), u = F - b.on; C = b.C;
      off = b.side * (u <= 0 ? swingIn(F, b.on, far, 0.085, 6) : u < 3 ? 0.085 : lerp(0.085, far, ease((u - 3) / 26)));
      gain = 0.8 + 0.8 * Math.exp(-Math.abs(u) / 2.5);
    } else if (b.kind === "close") {
      const e = enforcerAt(Math.min(F, EV.cut)), idle = b.side * Math.abs(idleOff(b.i, F)); C = [e.pos[0], e.pos[1] - 0.08];
      if (F < b.on - 5) off = idle;
      else {
        // the hull's reach toward this beam, found for the line it will be on
        let reach = 1; for (let k = 0; k < 3; k++) { const c = chord(E, C, b.side * reach), n = [c.near[0] - C[0], c.near[1] - C[1]], l = Math.hypot(n[0], n[1]) || 1; reach = hull([n[0] / l, n[1] / l]); }
        const t1 = EV.tighten[0], t2 = EV.tighten[1], k = F < t1 ? 1 : F < t2 ? 0.8 : F < EV.cut ? 0.6 : F === EV.cut ? -0.3 : -1.3;
        off = F < b.on ? lerp(idle, b.side * reach, 1 - (1 - (F - (b.on - 5)) / 5) ** 3) : b.side * reach * k;
        touch = F >= b.on && F < EV.cut; gain = 0.9 + 0.7 * Math.exp(-Math.max(0, F - b.on) / 3) + (F >= t1 ? 0.3 : 0) + (F >= EV.cut ? 0.6 : 0);
      }
    } else off = idleOff(b.i, F);
    out.push({ ...chord(E, C, off), gain: gain * flick, kind: b.kind, touch, i: b.i });
  }
  return out;
}
// which emitters are awake at F (the set lights their lenses)
export const awake = (F) => EMITTERS.map((e) => F >= EV.wake[e.bank] && F < EV.cut + 3);
// ---- light on Noor: a hard rim that flares as a beam stops by them -------------------------------------------------------
export function beamRim(F, events = EV.miss) { let k = 0; for (const on of events) k = Math.max(k, Math.exp(-Math.abs(F - on) / 2.2)); return k; }
// ---- what every shot in the core gives the set (sets/core.js) at song frame F ----------------------------------------------
export function coreOptions(F, o = {}) {
  const e = enforcerAt(F), t = (F - EV.cut) / FPS, on = awake(F);
  return { beams: beamsAt(F), emitters: EMITTERS.map((x, i) => ({ ...x, on: on[i] })), drones: F < EV.cut ? [e] : [],
    slabs: F >= EV.cut ? { pos: e.pos, cuts: CUTS, at: CUTS.concat(0).map((_, j) => slabAt(j, t)), heat: clamp(1 - t * 0.75) } : null, ...o };
}
// Noor adrift, as an actor: the drawing is one of the four of `sheet` (hero drawings made for that shot's camera)
export const adrift = (F, sheet, o = {}) => { const n = noorAt(F), k = driftCel(F, sheet); return { who: "noor", action: "core_drift", phase: k / 4, hero: `${sheet}_${k}`, x: n.x, y: n.y, z: n.z, yaw: 0, shadow: false, ...o }; };
