// The gantry and the blast doors (song 29.83-48.0 s): what its shots share. Frames here are frames of the SONG; each
// shot counts its own from its cut. Every cut and hit is on a beat or an onset of analysis/ (engine/sync.js): each
// shot lists its own as `marks`, and `node engine/marks.mjs shots/gantry.js` holds them to the song.
// No words are sung in this stretch (the vocal stems are silent from 20 s to 42.6 s); the brass plays the three-note
// figure of "We're in deep" three times over (760/766/780, 825/840/845, 899/904/919), and the station's screens say a
// word on each note.
//   wide    716  the machine level: the four on the gantry, the first drones behind them
//   fire    737  the drums come in: the drones open fire, a hit on the rail or the frame on every drum hit; a cable goes
//   haul    785  Ife trips; on the next beat Noor hooks her pack's handle without looking and carries her on
//   front   825  from in front: another shot lands, and the lead drone takes aim at Juno
//   duck    840  it fires on the drum: she is under it, laughing
//   tane    866  Tane turns, drops his shoulder and puts a drone over the rail (the hit on 899)
//   fall    909  it goes down into the machinery and bursts on 919
//   doors   929  the passage: blast doors ahead come down a notch on every drum hit
//   slam    959  from in front: the doors behind them land one after another, the last a hair behind Tane (999)
//   door   1009  the last door, coming down steadily
//   sprint 1029  the four flat out for it
//   slide  1059  under it in a row, one on each hit of the fill; it lands on 1078, a hair behind Tane's coat
//   dent   1083  the door from their side: something hits it from behind, twice; on the third it starts back up
//   out    1118  up and running at the camera, the swarm pouring under the door behind: the slice's first shot begins here
import { RUN, CADENCE, STRIDE } from "./slice_cast.js";
export { RUN, CADENCE, STRIDE };
export const FPS = 24;
export const CUT = { wide: 716, fire: 737, haul: 785, front: 825, duck: 840, tane: 866, fall: 909, doors: 929, slam: 959, door: 1009, sprint: 1029, slide: 1059, dent: 1083, out: 1118, end: 1152 };
export const startOf = (name) => CUT[name] / FPS;
export const CAST = { tane: "/kits/tane", ife: "/kits/ife", noor: "/kits/noor", juno: "/kits/juno" };
export const KIDS = ["tane", "ife", "noor", "juno"];
export const ease = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
export const wob = (f, a, b, c) => Math.sin(f * a + c) * 0.6 + Math.sin(f * b + c * 2.3) * 0.4;
export const rnd = (...n) => { let h = 2166136261; for (const x of n) { h ^= Math.round(x * 1000) | 0; h = Math.imul(h, 16777619); h ^= h >>> 13; } return ((Math.imul(h, 2246822519) ^ (h >>> 15)) >>> 0) / 4294967296; };
// ---- on the gantry (sets/gantry.js: it runs along +Z, deck at y = 0, 1.4 m either side) -----------------------------
// where the group's leader is at song frame F, and each of the four in it: [across, behind the leader, where in the cycle]
export const gz = (F) => RUN * (F - CUT.wide) / FPS;
export const PLACE = { juno: [0.55, 0, 0.55], tane: [-0.5, -1.3, 0.1], noor: [0.45, -2.7, 0.3], ife: [-0.45, -4.0, 0.8] };
export const runner = (who, F, o = {}) => { const [x, dz, ph] = PLACE[who]; return { who, action: "run", phase: ph + (F - CUT.wide) / STEP[who], x, z: gz(F) + dz, yaw: 0, ...o }; };
// frames per cycle on the gantry: Ife's is held to eight (her own stride would make it 8.5), so that on twos each of her
// planted feet is one drawing and none is seen to slip
export const STEP = { ...CADENCE, ife: 8, juno: 12 };
// what the screens say at song frame F: a word on each note of the brass figure, held a while after the third
const WORDS = [[760, "WE'RE", "ウィーア"], [766, "IN", "イン"], [780, "DEEP", "ディープ"], [802, ""], [825, "WE'RE", "ウィーア"], [840, "IN", "イン"], [845, "DEEP", "ディープ"], [868, ""], [899, "WE'RE", "ウィーア"], [904, "IN", "イン"], [919, "DEEP", "ディープ"]];
export const sign = (F) => { let w = null; for (const x of WORDS) if (F >= x[0]) w = x; return w && w[1] ? { text: w[1], small: w[2] } : null; };
export const SIGN_MARKS = (cut, end) => WORDS.filter((w) => w[1] && w[0] > cut && w[0] < end).map((w) => ({ at: w[0] - cut, what: `the screens say ${w[1]}`, on: "brass" }));
// ---- the drones' fire -------------------------------------------------------------------------------------------------
// A shot is { at: the song frame it lands on (a drum hit), from: [x, y, z] the muzzle when it is fired, to: [x, y, z] }.
// It is in the air for FLY frames before it lands. A drone that fires it turns on its target and its eye burns up
// over the half second before, kicks back as it fires and settles.
export const FLY = 2;
// a chaser at `home` (a function of F) that fires the shots of `mine`: its spec for the frame
export function gunner(F, home, mine, o = {}) {
  const p = home(F); let yaw = o.yaw ?? 0, pitch = o.pitch ?? -6, eye = 1, back = 0, thrust = o.thrust ?? 0.4;
  for (const s of mine) {
    const u = F - (s.at - FLY);                                  // frames since it fired
    if (u >= -12 && u < 10) {
      const k = u < 0 ? ease((u + 12) / 9) : Math.exp(-u / 4), ay = Math.atan2(s.to[0] - p[0], s.to[2] - p[2]) * 180 / Math.PI, ap = Math.atan2(s.to[1] - p[1], Math.hypot(s.to[0] - p[0], s.to[2] - p[2])) * 180 / Math.PI;
      yaw += (ay - yaw) * k; pitch += (ap - pitch) * k; eye = u < 0 ? 1 + 0.9 * ease((u + 12) / 12) : 1 + 1.4 * Math.exp(-u / 2.5);
      if (u >= 0) { back = 0.55 * Math.exp(-u / 3); pitch += 16 * Math.exp(-u / 2.5); thrust = 1; }
    }
  }
  const yr = yaw * Math.PI / 180;
  return { type: "chaser", pos: [p[0] - Math.sin(yr) * back, p[1] + 0.12 * Math.sin(F * 0.31 + (o.seed ?? 0)), p[2] - Math.cos(yr) * back], yaw, pitch, roll: (o.roll ?? 8) * Math.sin(F * 0.23 + (o.seed ?? 0) * 2), eye, thrust, seed: o.seed ?? 0, scale: o.scale ?? 1 };
}
export const muzzle = (d) => { const y = d.yaw * Math.PI / 180, p = (d.pitch ?? 0) * Math.PI / 180, k = 0.4 * (d.scale ?? 1); return [d.pos[0] + Math.sin(y) * Math.cos(p) * k, d.pos[1] + Math.sin(p) * k, d.pos[2] + Math.cos(y) * Math.cos(p) * k]; };
// the three that catch up first: where each flies (behind the group, closing through the wide shot), and what it shoots at
const close = (F) => 9 * (1 - ease((F - CUT.wide) / 26));
export const SQUAD = [
  { seed: 11, home: (F) => [0.2, 2.45 + 0.1 * Math.sin(F * 0.17), gz(F) - 7.4 - close(F)] },
  { seed: 12, scale: 1.1, home: (F) => [2.75, 1.5 + 0.12 * Math.sin(F * 0.21 + 1), gz(F) - 6.3 - close(F) * 1.3] },      // outside the rail, on the camera's side
  { seed: 13, home: (F) => [-2.6, 1.95 + 0.1 * Math.sin(F * 0.19 + 2), gz(F) - 8.6 - close(F) * 0.8] },
];
const SHOT_LIST = [
  { at: 737, by: 0, to: [1.4, 1.1, gz(737) - 5.1], kick: [1.5, 0, 0] },                 // the rail behind Ife
  { at: 742, by: 1, to: [1.82, 1.9, 8], kick: [1, 0, -1] },                             // the portal's leg as Juno passes it
  { at: 750, by: 2, to: [-1.4, 1.1, gz(750) - 1.9], kick: [0, 1, 0] },                  // the far rail beside Tane
  { at: 761, by: 0, to: [0.3, 2.9, 16.8], kick: [0, -1, -2], size: 1.3 },               // the CRT over the gantry, as it says WE'RE
  { at: 766, by: 1, to: [1.9, 2.86, 20], kick: [0, 0, 0], size: 1.2 },                  // the cable
  { at: 835, by: 2, to: [-1.4, 1.1, gz(835) - 2.0], kick: [-1, 1, 0] },                 // from in front: the far rail by Tane
  { at: 840, by: 0, to: [0.6, 2.45, gz(840) + 9], kick: [0, 0, 2], miss: true },         // over Juno's head as she drops, and on up the gantry
];
export const CABLE = { a: [1.9, 3.72, 16], b: [1.9, 3.72, 24], sag: 0.86, at: 766 };
export const squadOf = (F, o = {}) => SQUAD.map((d, i) => gunner(F, d.home, SHOT_LIST.filter((s) => s.by === i), { seed: d.seed, scale: d.scale, ...o }));
export const SHOTS = SHOT_LIST.map((s) => ({ ...s, from: muzzle(gunner(s.at - FLY, SQUAD[s.by].home, SHOT_LIST.filter((x) => x.by === s.by), SQUAD[s.by])) }));
// the furnace on a drawing laid over the set whole (a plate): the hall's dim warm light, a hot rim on what faces down
export const PLATE_LIGHT = { tint: [0.98, 0.9, 0.88], rim: [1.0, 0.62, 0.26], rimDir: [0, -7] };
// ---- in the passage (sets/corridor.js; the slice's own corridor: they run along +Z to the hub at z = 0) ---------------
// The blast doors (the corridor's `slabs` cue) at the bulkheads z = 24k, k = -5..-2: every drum hit of the run brings
// each down a notch; those behind the four land one after another (-5 on 959, -4 on 969, -3 on 999, a hair behind
// the last of them); the last, -2, comes on down steadily from 1000 and lands on 1078 behind Tane's coat. It is
// struck from behind (1093, 1104), jumps on the third blow (1113) and is run back up for the machines.
export const HITS = [930, 936, 938, 950, 959, 969, 974, 977, 989, 999];
const notch = (F, steps) => { let s = 0; HITS.forEach((h, i) => { if (F >= h) s += steps[i] ?? 0; else if (F === h - 1) s += (steps[i] ?? 0) * 0.5; }); return s; };
const land = (F, hit, from) => { const u = F - hit; return u < -3 ? from : u < 0 ? from + (1 - from) * [0.12, 0.45, 0.8][u + 3] : u === 1 ? 0.975 : 1; };      // falls for three frames, lands, jars once
export function slabs(F) {
  const d5 = land(F, 959, notch(Math.min(F, 955), [0.2, 0.1, 0.1, 0.1])), d4 = land(F, 969, notch(Math.min(F, 965), [0.14, 0.08, 0.08, 0.1, 0.05])), d3 = land(F, 999, notch(Math.min(F, 995), [0.2, 0.1, 0.1, 0.05]));
  let d2 = notch(F, [0.04, 0.03, 0.03, 0.03, 0.03, 0.03, 0.02, 0.02, 0.03, 0.04]);
  if (F > 999) d2 = 0.3 + 0.42 * ease((F - 999) / 69) ** 0.9;
  if (F >= 1068) d2 = land(F, 1078, 0.72 + 0.05 * Math.min(1, (F - 1068) / 8));
  if (F >= 1113) d2 = F < 1116 ? [0.9, 0.94, 0.93][F - 1113] : 0.93 * (1 - ease((F - 1115) / 21));
  return { [-5]: d5, [-4]: d4, [-3]: d3, [-2]: d2 };
}
export const gapOf = (s) => 3.46 * (1 - s);
// the leader's z: under door -3 (z = -72) on 990; and the order they run in here, as they will go under the last door
export const cz = (F) => -72 + RUN * (F - 990) / FPS;
export const ORDER = { juno: [0.95, 0, 0.55], noor: [-0.95, -0.55, 0.3], ife: [0.15, -1.15, 0.8], tane: [-0.3, -1.85, 0.1] };
export const sprinter = (who, F, o = {}) => { const [x, dz, ph] = ORDER[who]; return { who, action: "run", view: "front", phase: ph + (F - 929) / STEP[who], x: x + 0.08 * Math.sin(F * 0.11 + ph * 9), z: cz(F) + dz, yaw: 0, ...o }; };
