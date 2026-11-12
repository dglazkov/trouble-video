// THE REUNION (song frames 2866-3510, 119.42-146.29 s): what its shots share. Frames here are frames of the SECTION
// (L = 0 at song frame 2866); each shot counts its own from its cut.
// The music, measured (analysis/stems.json): the kick is on every beat from L 0 to 268, once more at 283 (late), then
// NOTHING until 318 (the held breath; the brass comes in at 298), then every beat to 616, a beat missed, and the LAST
// KICK OF THE SONG at 636. Lead and backing vocals chant to about 300: "we're in DEEP" (deep on 0, 40, 79),
// "TROUBLE" (92), and from 143 the chant again and again; after 300 nobody sings: brass, keyboard, synth.
//   split   0-208    four routes at once in panels (shots/reun_split.js)
//   meet    208-298  the panels break; the four on the atrium's gantry from both ends; they see each other (shots/reun_meet.js)
//   fight   298-596  the warden comes up over the gantry's side on the brass and lands on the kick at 318; the chain
//                    (Juno baits, Ife rewires, Tane hits, Noor walks through it); it comes apart (shots/reun_fight.js)
//   end     596-645  breathless, grinning; the last kick: the deck unlocks under them (shots/reun_end.js)
export const FPS = 24, F0 = 2866, FRAMES = 645, W = 1920, H = 1080, PW = 2752, PH = 1536;
export const K = [0, 10, 20, 30, 40, 50, 60, 69, 79, 89, 99, 109, 119, 129, 139, 149, 159, 169, 179, 189, 199, 208, 218, 228, 238, 248, 258, 268, 283,
  318, 328, 338, 348, 357, 367, 377, 387, 397, 407, 417, 427, 437, 447, 457, 467, 477, 487, 496, 506, 516, 526, 536, 546, 556, 566, 576, 586, 596, 606, 616, 636];
export const BRASS = 298;      // the brass comes in (with keyboard, synth and strings)
export const PART = { split: 0, meet: 208, fight: 298, end: 596, out: 645 };
export const CAST = { tane: "/kits/tane", ife: "/kits/ife", noor: "/kits/noor", juno: "/kits/juno" };
export const COLOR = { tane: "#e8322a", ife: "#5dff8c", noor: "#b48cff", juno: "#ff8a1c" }, TEAL = "#3fd0c0";
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), lerp = (a, b, t) => a + (b - a) * t;
export const ease = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
export const wob = (f, a, b, c) => Math.sin(f * a + c) * 0.6 + Math.sin(f * b + c * 2.3) * 0.4;
export const rnd = (...n) => { let h = 2166136261; for (const x of n) { h ^= Math.round(x * 1000) | 0; h = Math.imul(h, 16777619); h ^= h >>> 13; } return ((Math.imul(h, 2246822519) ^ (h >>> 15)) >>> 0) / 4294967296; };
export const mix3 = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
// the newest kick at or before L, and how long ago
export const kickAt = (L) => { let i = K.length - 1; while (i > 0 && K[i] > L) i--; return { i, at: K[i], age: L - K[i] }; };

// ---- the place: the atrium's gantry (sets/atrium.js), built and dark (block, night), out along +Z from the core's door --
// The four meet at MEET. TANE and IFE come from the core's end (running +Z), JUNO and NOOR from the wall's end (-Z).
// The warden comes up over the side beyond Juno and Noor (at WARDEN_Z) and the fight is between there and MEET.
export const MEET = 62, WARDEN_Z = 82;
export const NIGHT = { block: true, night: 1, vista: 1, alert: 1, alarm: { gantry: 200, rings: 60 } };
// where each stands when they have stopped and seen each other (L 268-298), the way each faces (yaw; 0 faces +Z)
export const STAND = { tane: { x: -0.75, z: MEET - 1.7, yaw: 0 }, ife: { x: 0.7, z: MEET - 2.1, yaw: 0 }, juno: { x: 0.65, z: MEET + 1.5, yaw: 180 }, noor: { x: -0.7, z: MEET + 2.2, yaw: 180 } };
// a plate (a whole drawing on the key colour, 2752 x 1536) hung with its `foot` pixel on the world point `at`: m metres per pixel
import { camera } from "../engine/body.js";
export function stand(cam, at, foot, m, k = 1) {
  const c = camera({ fov: 30, ...cam, w: W, h: H }), p = c.project(at), scale = p.s * m * k;
  return { x: p.x + (PW / 2 - foot[0]) * scale, y: p.y + (PH / 2 - foot[1]) * scale, scale, depth: p.z };
}
// the night's light on a plate laid over the set whole: dim violet, a hard red rim from the alarm; o.fire 0..1.5 a blast near them
export function plateLight(o = {}) {
  const fire = o.fire ?? 0, m = (a, b, t) => a.map((v, i) => v + (b[i] - v) * Math.min(1, t));
  let tint = [0.84, 0.7, 0.8], rim = [1.0, 0.42, 0.32];
  if (fire > 0.02) { tint = m(tint, [1.0, 0.82, 0.62], fire * 0.7); rim = m(rim, [1.0, 0.86, 0.4], fire * 1.5); }
  return { tint, rim, rimDir: o.rimDir ?? [0, 7], gradient: 0.16, gradientY: [0, 0.5] };
}
