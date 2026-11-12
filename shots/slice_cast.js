// The slice (song 48.0-62.0 s): what its six shots share. Frames here are frames of the slice (0 at 48.0 s); each
// shot counts its own from its cut. Every cut and hit is on a beat or an onset of analysis/ (engine/sync.js): each
// shot lists its own as `marks`, and `node engine/marks.mjs shots/slice.js` holds them to the song.
export const FPS = 24, T0 = 48;
export const CUT = { run: 0, faces: 54, drop: 95, tane: 120, ride: 194, leap: 289, black: 334, end: 336 };
export const startOf = (name) => T0 + CUT[name] / FPS;
export const CAST = { tane: "/kits/tane", ife: "/kits/ife", noor: "/kits/noor", juno: "/kits/juno" };
// Each kid's colours: the streak they leave, the ground of their card, the accent
export const COLORS = {
  tane: { main: "#e8242c", deep: "#5a0a14", hot: "#ffd9a0" },
  ife: { main: "#3dff8a", deep: "#04301c", hot: "#eaffd0" },
  noor: { main: "#a45cff", deep: "#1a0a3c", hot: "#ffffff" },
  juno: { main: "#ff8a1e", deep: "#073c44", hot: "#3fe0d8" },
};
// Frames per run cycle: each runs at their own cadence (the drawings change on twos)
export const CADENCE = { tane: 16, ife: 12, noor: 18, juno: 14 };
export const ease = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
export const wob = (f, a, b, c) => Math.sin(f * a + c) * 0.6 + Math.sin(f * b + c * 2.3) * 0.4;
export const rnd = (...n) => { let h = 2166136261; for (const x of n) { h ^= Math.round(x * 1000) | 0; h = Math.imul(h, 16777619); h ^= h >>> 13; } return ((Math.imul(h, 2246822519) ^ (h >>> 15)) >>> 0) / 4294967296; };
