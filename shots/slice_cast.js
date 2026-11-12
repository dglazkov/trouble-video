// The slice (song 48.0-62.0 s): what its six shots share. Frames here are frames of the slice (0 at 48.0 s); each
// shot counts its own from its cut. Every cut and hit is on a beat or an onset of analysis/ (engine/sync.js): each
// shot lists its own as `marks`, and `node engine/marks.mjs shots/slice.js` holds them to the song.
// The drop is the song's first kick, 51.55 s (the stem `kick`, analysis/kicks.py): a beat BEFORE the bar line the
// section starts on (51.97 s), which is only the second kick. The four faces are on the four beats before it.
import { proportions } from "../engine/body.js";
import { strideOf } from "../engine/actions.js";
export const FPS = 24, T0 = 48;
export const CUT = { run: 0, faces: 45, drop: 85, tane: 120, ride: 194, leap: 289, black: 334, end: 336 };
export const startOf = (name) => T0 + CUT[name] / FPS;
export const CAST = { tane: "/kits/tane", ife: "/kits/ife", noor: "/kits/noor", juno: "/kits/juno" };
// Each kid's colours: the streak they leave, the ground of their card, the accent
export const COLORS = {
  tane: { main: "#e8242c", deep: "#5a0a14", hot: "#ffd9a0" },
  ife: { main: "#3dff8a", deep: "#04301c", hot: "#eaffd0" },
  noor: { main: "#a45cff", deep: "#1a0a3c", hot: "#ffffff" },
  juno: { main: "#ff8a1e", deep: "#073c44", hot: "#3fe0d8" },
};
// Frames per run cycle for a kid covering `speed` m/s: the ground their own stride covers in a cycle is what passes
// under them in it, so a planted foot stays where it was planted (engine/motion.mjs measures it). Each runs in their
// own manner, so at one speed each has their own cadence: Ife's short legs go fastest, Noor's long ones slowest.
// The legs of each (kits/NAME/character.json: what of the body the stride depends on).
const LEGS = { tane: { height: 1.7, hipW: 0.102 }, ife: { height: 1.42 }, noor: { height: 1.82 }, juno: { height: 1.6 } };
export const STRIDE = Object.fromEntries(Object.entries(LEGS).map(([who, b]) => [who, strideOf(who, proportions(b))]));
export const cadence = (who, speed) => STRIDE[who] * FPS / speed;
// The speed they run at together: the one at which Tane's cycle is twelve frames (his own shot is on that cycle)
export const RUN = STRIDE.tane * FPS / 12;
export const CADENCE = Object.fromEntries(Object.keys(LEGS).map((who) => [who, cadence(who, RUN)]));
export const ease = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
export const wob = (f, a, b, c) => Math.sin(f * a + c) * 0.6 + Math.sin(f * b + c * 2.3) * 0.4;
export const rnd = (...n) => { let h = 2166136261; for (const x of n) { h ^= Math.round(x * 1000) | 0; h = Math.imul(h, 16777619); h ^= h >>> 13; } return ((Math.imul(h, 2246822519) ^ (h >>> 15)) >>> 0) / 4294967296; };
