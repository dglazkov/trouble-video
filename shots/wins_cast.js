// The two wins (song 62.0-78.92 s, frames 1488-1892): what its shots share. Frames here are frames of the SONG; each
// shot counts its own from its cut. Every cut and hit is on a kick, a beat or an onset of analysis/ (engine/sync.js):
// each shot lists its own as `marks`, and `node engine/marks.mjs shots/wins.js` holds them to the song.
// Where the music really is (analysis/stems.json; the words from the vocal stems, by ear of faster-whisper and by
// their envelopes): the "Trouble" chant runs on every beat to 1525; the kick is on 1495, 1505, 1515, 1525, 1535 and
// then STOPS; the lead alone says "You're in deep trouble, mister" over the break (you're 1528, deep 1535, trouble
// 1543, mister 1553-1568); "We're in deep" comes three times, a bar apart (we're 1574 / 1614 / 1654, deep 1594 /
// 1633 / 1673), and the kick comes back ON the first "deep" (1594.7) and is on every beat from there to 1882.7; from
// 1685 the chant is back on every beat to the end.
//   land    1488  out of black: Juno comes down on the far side on the kick (1495), skids broadside, looks back; the
//                 swarm comes over the gap after her on the kick (1515) and she is gone
//   corner  1525  Tane at the dead end, three drones on him; the screens say the line to him, a word at a time
//   crack   1553  close: "mister." He cracks his neck (1565, the bar)
//   bat     1575  his foot comes down on a pipe (the fill, 1575), it is in his hands (1581); the first drone comes in
//                 and he bats it on "deep" and the kick (1595): it goes into the roof on the next (1605)
//   catch   1614  the second dives at his head: he takes it out of the air by the tail on the second "deep" (1634)
//   slam    1644  ... weighs it, looks at the third, and puts the one through the other on the third "deep" (1674)
//   rest    1684  the pipe goes up on his shoulder (1694); bits of machine come down round him
//   tunnel  1724  Juno, from in front, down the service tunnel with the swarm strung out behind her
//   count   1754  she looks back at them (at us: we are one of them) and counts: one, two, three (1754, 1764, 1774)
//   door    1783  from behind her: the tunnel is a crawlway now, and at the end of it a blast door is coming down
//   gate    1793  what she sees: the door, rushing at us, drops another notch on the kick
//   under   1803  from the side and ahead, her face to us: she drops flat on the board, chin up, and goes under it
//                 (1813); it lands on the drum (1818)
//   pile    1823  from the side still: they go into it one after another, one on every drum hit, and each blow
//                 stands out of the far side of the plate
//   salute  1843  her side: the door bulges on every drum hit behind her; goggles down (1863), the salute (1873), the
//                 last and biggest blow on the last kick (1883): she has not looked round, and her goggles go dark
import { ease as E } from "./slice_cast.js";
export const FPS = 24;
export const CUT = { land: 1488, corner: 1525, crack: 1553, bat: 1575, catch: 1614, slam: 1644, rest: 1684, tunnel: 1724, count: 1754, door: 1783, gate: 1793, under: 1803, pile: 1823, salute: 1843, end: 1893 };
export const startOf = (name) => CUT[name] / FPS;
export const CAST = { tane: "/kits/tane", juno: "/kits/juno" };
export const ease = E;
export const wob = (f, a, b, c) => Math.sin(f * a + c) * 0.6 + Math.sin(f * b + c * 2.3) * 0.4;
export const rnd = (...n) => { let h = 2166136261; for (const x of n) { h ^= Math.round(x * 1000) | 0; h = Math.imul(h, 16777619); h ^= h >>> 13; } return ((Math.imul(h, 2246822519) ^ (h >>> 15)) >>> 0) / 4294967296; };
export const lerp = (a, b, t) => a + (b - a) * t, mix3 = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
// which drawing of wins_tane / wins_juno: the phase that picks cel i
export const T = (i) => (i + 0.5) / 12, J = (i) => (i + 0.5) / 8;
// the impact frames: the hit itself in black and white, the frame after it in the kid's colours
export const IMPACT = {
  white: { mode: 1, impact: { dark: [0.02, 0, 0.06], mid: [0.02, 0, 0.06], light: [1, 1, 1], ink: [1, 1, 1], thresholds: [0.3, 0.3], cel: [[1, 1, 1], [1, 1, 1]] } },
  black: { mode: 1, impact: { dark: [1, 1, 1], mid: [1, 1, 1], light: [1, 1, 1], ink: [0.02, 0, 0.05], thresholds: [0.3, 0.5], cel: [[0.02, 0, 0.05], [0.02, 0, 0.05]] } },
  red: { mode: 1, impact: { dark: [0.07, 0.0, 0.1], mid: [0.92, 0.1, 0.16], light: [1.0, 0.86, 0.5], ink: [0.02, 0, 0.05], thresholds: [0.15, 0.36], cel: [[0.02, 0, 0.05], [1, 1, 1]] } },
  ink: { mode: 1, impact: { dark: [0.02, 0, 0.06], mid: [0.02, 0, 0.06], light: [1, 1, 1], ink: [1, 1, 1], thresholds: [0.3, 0.3], cel: [[0.02, 0, 0.05], [1, 1, 1]], celThreshold: 0.2 } },
  orange: { mode: 1, impact: { dark: [0.03, 0.1, 0.14], mid: [1.0, 0.45, 0.08], light: [1.0, 0.92, 0.6], ink: [0.02, 0, 0.05], thresholds: [0.2, 0.5], cel: [[0.02, 0, 0.05], [1, 1, 1]] } },
};
// ---- the dead end (sets/corridor.js): a blast door shut at z = 24; Tane has his back to it -----------------------------
export const DEAD = 24, TZ = 21.3;
// what the screens say at song frame F
const WORDS = [[1528, "YOU'RE", "ユーア"], [1531, "IN", "イン"], [1535, "DEEP", "ディープ"], [1543, "TROUBLE,", "トラブル"], [1553, "MISTER.", "ミスター"], [1575, "WE'RE", "ウィーア"], [1590, "IN", "イン"], [1594, "DEEP", "ディープ"],
  [1615, "WE'RE", "ウィーア"], [1627, "IN", "イン"], [1633, "DEEP", "ディープ"], [1655, "WE'RE", "ウィーア"], [1667, "IN", "イン"], [1673, "DEEP", "ディープ"], [1700, ""]];
export const says = (F) => { let w = null; for (const x of WORDS) if (F >= x[0]) w = x; return { z: DEAD, text: w?.[1] ?? "", small: w?.[2] ?? "" }; };
// the words that have an onset of the voice to be held to
export const SAY_MARKS = (cut, end) => WORDS.filter((w) => w[1] && w[0] >= cut && w[0] < end && !["YOU'RE", "IN"].includes(w[1])).map((w) => ({ at: w[0] - cut, what: `the screens say ${w[1]}`, on: w[0] < 1570 || w[1] === "WE'RE" ? "lead_vocals" : "backing_vocals" }));
export const corridor = (F, o = {}) => ({ alert: 1, slabs: { 1: 1 }, doors: { 1: 0, 0: 0 }, says: says(F), ...o });
// ---- the service tunnel (sets/tunnel.js): she goes under the door (z = 64) on 1813, at SPEED ---------------------------
export const DOORZ = 64, SPEED = 15, UNDER = 1813;
export const jz = (F) => DOORZ + SPEED * (F - UNDER) / FPS;
const half = (z) => { const k = Math.min(1, Math.max(0, z / 60)); return 2.7 + (1.25 - 2.7) * k; };
// her weave: as wide as the tunnel lets her, dying away as it closes in
export const jx = (F) => Math.sin((F - CUT.tunnel) * 0.21 + 0.4) * Math.max(0, half(jz(F)) - 0.95) * 0.8;
// how far shut the door is: a notch on every kick from 1783, then down on the drum behind her (1818)
export const SLAM = 1818;
export const doorAt = (F) => { if (F >= SLAM) return 1; const steps = [[1783, 0.2], [1793, 0.36], [1803, 0.5], [1813, 0.6]]; let s = 0, at = 0; for (const [a, v] of steps) if (F >= a) { at = a; s = v; } return Math.max(0, s - 0.05 * Math.exp(-(F - at) / 1.5)) + (F >= 1815 ? (1 - s) * ((F - 1815) / 3) ** 2 : 0); };
// the swarm: N chasers; member i is `gap(i)` metres behind her down the tunnel, and they go into the door in that order,
// one on every drum hit from 1823
export const HITS = [1823, 1828, 1833, 1838, 1843, 1848, 1853, 1858, 1863, 1868, 1873, 1878, 1883];
// where each blow lands on the slab (x across, y up from its foot), how big, how deep; the kicks hit hardest. Later
// blows land beside earlier ones: no two dents overlap. The first four are the ones the swarm's side sees go in; the
// rest are placed where her side sees them, beside her; the last lands on the fifth's place and drives it twice as deep.
export const BLOWS = [[-0.45, 0.85, 0.16, 0.17], [-0.85, 0.3, 0.13, 0.13], [-0.35, 1.5, 0.14, 0.16], [-0.3, 0.3, 0.12, 0.12],
  [0.5, 1.2, 0.19, 0.2], [0.92, 0.72, 0.12, 0.11], [0.15, 0.58, 0.14, 0.16], [1.0, 1.6, 0.11, 0.1], [0.6, 0.3, 0.13, 0.15], [-0.95, 1.62, 0.13, 0.12], [0.12, 1.68, 0.1, 0.1], [-0.98, 1.05, 0.12, 0.12], [0.5, 1.2, 0.22, 0.4]];
// the dents at song frame F: each goes in over two frames and springs back a little
export const dentsAt = (F) => { const out = []; HITS.forEach((h, i) => { if (F < h) return; const [x, y, r, d] = BLOWS[i], u = F - h, k = u === 0 ? 0.75 : u === 1 ? 1.08 : 1; if (i === 12) { out[4] = { ...out[4], r: BLOWS[4][2] + (r - BLOWS[4][2]) * Math.min(1, k), d: BLOWS[4][3] + (d - BLOWS[4][3]) * k }; return; } out.push({ x, y, r, d, k, seed: i + 3 }); }); return out; };
