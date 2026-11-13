// The opening, song 0:00-0:19.9: what its shots share. Frames here are frames of the song (0 at 0.0 s); each shot
// counts its own from its cut. Every cut and hit is on a beat or an onset of analysis/ (engine/sync.js): each shot
// lists its own as `marks`, and `node engine/marks.mjs shots/open.js` holds them to the song.
//   wake    0   black; the first screen comes on and says the line, a word at a time, as the voice says it
//   room   45   the hit: every screen in the vault comes on, turned to the four, frozen in the middle of a step
//   faces  85   along the four faces
//   shut  174   "We're in deep" (1): four shutters come down behind them, one per hit (the first lands on 178)
//   ring  244   the other three, round the room, in one whip: and the one doorway left open
//   drones 260  "We're in deep" (2): the racks come down out of the ceiling; eyes open, one per hit
//   red   340   "We're in deep" (3): the floor's rings turn red
//   back  353   they back into each other; the half second replays with the chopped voice, each time differently
//   title 442   "Trouble!": the title
//   bolt  458   out of the one open doorway
import { proportions, solve } from "../engine/body.js";
import { strideOf, actorPose } from "../engine/actions.js";
export const FPS = 24;
export const CUT = { wake: 0, room: 45, faces: 85, shut: 174, ring: 244, drones: 260, red: 340, back: 353, title: 442, bolt: 458, end: 478 };
export const startOf = (name) => CUT[name] / FPS;
export const CAST = { tane: "/kits/tane", ife: "/kits/ife", noor: "/kits/noor", juno: "/kits/juno" };
export const KIDS = ["tane", "ife", "noor", "juno"];
// the line they were sneaking out in, toward the way out (+X, screen right): Tane leads, Juno is last
export const LINE = { tane: [2.15, 3.0], ife: [0.95, 2.8], noor: [-0.25, 3.05], juno: [-1.5, 2.85] };
// where each ends up, backs together, and the way each faces then
export const HUDDLE = { tane: [-0.2, 3.4, -35], juno: [0.8, 3.45, 40], ife: [-1.0, 2.95, -105], noor: [0.38, 2.5, 150] };
// the way each faces on the "caught" drawings 0 and 1 (2 and 3 are the huddle's)
const FACING = { tane: [90, 20], ife: [90, 50], noor: [90, 90], juno: [90, 15] };
// an actor on drawing `cel` of "caught" (0 frozen, 1 started, 2 backing, 3 backed), where that drawing stands: 0 in
// the line and 3 in the huddle; 1 and 2 where the foot that stays down through the change of drawing (PLANT: from 0
// to 1, and from 2 to 3) is on the very spot the other drawing has it, so a change of drawing is a step taken, not a slide
const LEGS = { tane: { height: 1.7, hipW: 0.102 }, ife: { height: 1.42 }, noor: { height: 1.82 }, juno: { height: 1.6 } };      // what of each body its feet depend on (kits/NAME/character.json)
const PLANT = { tane: ["L", "L"], ife: ["R", "L"], noor: ["L", "L"], juno: ["L", "L"] };
const NAMES = ["frozen", "started", "backing", "backed"];
const yawOf = (who, cel) => cel >= 2 ? HUDDLE[who][2] : FACING[who][cel];
const ball = (who, cel, side) => { const b = solve(proportions(LEGS[who]), actorPose({ who, action: "caught", phase: cel / 4, yaw: yawOf(who, cel) })).J[side].ball; return [b[0], b[2]]; };
const PLACE = Object.fromEntries(KIDS.map((who) => { const at = [LINE[who], null, null, HUDDLE[who].slice(0, 2)], put = (cel, on, side) => { const a = ball(who, on, side), b = ball(who, cel, side); at[cel] = [at[on][0] + a[0] - b[0], at[on][1] + a[1] - b[1]]; };
  put(1, 0, PLANT[who][0]); put(2, 3, PLANT[who][1]); return [who, at]; }));
export const kid = (who, cel, o = {}) => ({ who, action: "caught", phase: cel / 4, hero: NAMES[cel], yaw: yawOf(who, cel), x: PLACE[who][cel][0], z: PLACE[who][cel][1], ...o });
// a held drawing kept alive: its line boils a little, on threes (engine/post.js LAYER's wobble, over the whole figure)
export const boil = (f, amount = 1.2) => ({ warp: amount, warpStill: [0.5, 0.5], warpRadius: 0.02, warpTime: Math.floor(f / 3) * 1.7, warpDir: [0.3, 1] });
export const ease = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
export const wob = (f, a, b, c) => Math.sin(f * a + c) * 0.6 + Math.sin(f * b + c * 2.3) * 0.4;
export const rnd = (...n) => { let h = 2166136261; for (const x of n) { h ^= Math.round(x * 1000) | 0; h = Math.imul(h, 16777619); h ^= h >>> 13; } return ((Math.imul(h, 2246822519) ^ (h >>> 15)) >>> 0) / 4294967296; };
// a shutter that lands on frame `hit`: it falls for three frames, lands, and jars once
export const slam = (f, hit) => { const u = f - hit; return u < -3 ? 0 : u < 0 ? [0.12, 0.45, 0.8][u + 3] : u === 1 ? 0.965 : 1; };
// the run out: the speed at which Tane's cycle is twelve frames, as in the slice (shots/slice_cast.js)
export const STRIDE = Object.fromEntries(Object.entries(LEGS).map(([who, b]) => [who, strideOf(who, proportions(b))]));
export const RUN = STRIDE.tane * FPS / 12;
export const CADENCE = Object.fromEntries(KIDS.map((who) => [who, STRIDE[who] * FPS / RUN]));
// what the vault is doing at song frame F, whatever shot is looking: the cues every shot starts from
const SHUT = [[3, 178], [2, 204], [4, 227], [1, 234], [5, 244], [6, 249], [7, 254]];      // [bay, the frame its shutter lands on]
export const EYES = [283, 291, 303, 309, 314, 319, 324, 329, 334];                        // the frames the drones' eyes open on
// What the screens say, and the song frame each word comes on: the frame it is SUNG on (analysis/lyrics.json; LYRIC_MARKS
// holds each to it). The last TROUBLE is the title card's cut, a frame after the choir's vowel.
const WORDS = [[0, "YOU'RE"], [6, "IN"], [15, "DEEP"], [22, "TROUBLE,"], [36, "MISTER."], [56, ""], [180, "WE'RE"], [190, "IN"], [203, "DEEP"], [260, "WE'RE"], [270, "IN"], [283, "DEEP"], [340, "WE'RE"], [350, "IN"], [363, "DEEP"], [442, "TROUBLE"]];
export const LYRIC_MARKS = WORDS.filter(([f, w]) => w && f < 442).map(([f, w]) => ({ at: f, what: `the screens say ${w}`, on: "lyric", word: w }));
export function cues(F) {
  let text = ""; for (const [f, w] of WORDS) if (F >= f) text = w;
  const small = { "TROUBLE,": "トラブル", "MISTER.": "ミスター", DEEP: "ディープ", TROUBLE: "トラブル" }[text];      // the station says it twice
  const red = F < CUT.red ? 0 : Math.min(3, 1 + Math.floor((F - CUT.red) / 4)), deep = F >= 363 && F < 442;
  return { wake: { first: F / FPS, rest: F >= 41 ? (F - 41) / FPS : -1 }, swivel: F < 41 ? 0 : Math.min(1, (F - 41) / 16),
    speech: { text, small, alarm: F >= CUT.red ? 1 : 0, glitch: deep ? 0.35 : 0 }, doors: Object.fromEntries(SHUT.map(([k, hit]) => [k, slam(F, hit)])),
    racks: ease((F - 256) / 26), red, alert: F >= CUT.red ? 0.8 : 0 };
}
export const SHUTS = SHUT;
