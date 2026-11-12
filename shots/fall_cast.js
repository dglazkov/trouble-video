// THE FALL (song frames 3512-3955, 146.33 s to the end of the file): what its shots share. Frames here are frames of
// the SONG; each shot counts its own from its cut. It is the film's ending: the bridge's deck lets go and the four
// fall down a shaft through the whole station, past every place the film has been, and are still falling when it stops.
// The music, measured (analysis/stems.json): the song's last kick is at 3502, before this begins; from here there are
// no drums and nobody sings. The BASS is one loud held note throughout (onsets 3582, 3663) to about 3915; the STRINGS
// play a run on every half beat and swell from 3706 to a crest at 3732-3746, dip, crest again to 3794 and are gone
// by 3805; a SYNTH comes up from 3816 and holds to 3900, dying away by 3945 (its notes are the `other` and `guitar`
// stems' onsets: 3807 ... 3905); the file is silent from about 3936 and ends at 3955. So the cuts hang on the bass
// and brass onsets, the events inside the shots on the strings', and the last close-ups on the synth's phrases:
//   hang    3512  the deck is gone and there is a shaft's mouth where it was: the four stand on nothing, looking
//                 down. They look up at us (3519). Each makes the face they will fall with (3525).
//   drop    3532  (brass) from the hatch, straight down: they drop away into the shaft and the camera lets go after them
//   side    3582  (bass) beside them, falling at their speed: each falls in their own way, the station going up past
//                 them: the plant, the core, the tunnel
//   glass   3632  (brass) close: Ife's glasses lift off her nose; she catches them (3652)
//   below   3663  (bass) from under them, looking up at four spread figures and the light they came from, far off.
//                 Juno lets the board go (3684). They drift together and reach (3705)
//   ring    3732  (the strings' crest) from above: a ring of hands, turning slowly, over the dark. The atrium's
//                 daylight is on them on the hardest note (3748); then the vault's green, the last place there is
//   dark    3783  (brass) higher above them: nothing below is lit. One green light comes up out of it, through the ring
//   deep    3807  (the synth's pick-up) the station's last screen tumbles past: DEEP
//   tane    3829, ife 3849, noor 3866, juno 3886   a face to each phrase of the synth: he grins, she screams, they
//                 look at their nails, she whoops
//   black   3905  (the last note) cut to black in the middle of the whoop; a small "to be continued", and black
// The place is sets/shaft.js. Nobody here is on the skeleton: a falling figure has no ground to hang a cel from, so
// every figure is a PLATE, a whole drawing made for its shot's camera (kits/*/fall/, cut by pipeline/sprites.py from
// the plates in kits/*/closeup/fall_*), and the hair and cloth that stream are drawn again for each drawing of a set
// (edits of the plate, registered to it), swapped on threes.
import { camera } from "../engine/body.js";
import { SPRITES } from "./fall_sprites.js";
import { glowAt } from "../sets/shaftplan.js";
export const FPS = 24, W = 1920, H = 1080;
export const CUT = { hang: 3512, drop: 3532, side: 3582, glass: 3632, below: 3663, ring: 3732, dark: 3783, deep: 3807, tane: 3829, ife: 3849, noor: 3866, juno: 3886, black: 3905, end: 3956 };
const ORDER = Object.keys(CUT);
export const lengthOf = (name) => CUT[ORDER[ORDER.indexOf(name) + 1]] - CUT[name];
export const EV = { down: 3519, out: 3525, caught: 3652, letgo: 3684, reach: 3705, day: 3748, flick: 3818 };
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), lerp = (a, b, t) => a + (b - a) * t;
export const ease = (t) => { t = clamp(t); return t * t * (3 - 2 * t); };
export const wob = (f, a, b, c) => Math.sin(f * a + c) * 0.6 + Math.sin(f * b + c * 2.3) * 0.4;
export const rnd = (...n) => { let h = 2166136261; for (const x of n) { h ^= Math.round(x * 1000) | 0; h = Math.imul(h, 16777619); h ^= h >>> 13; } return ((Math.imul(h, 2246822519) ^ (h >>> 15)) >>> 0) / 4294967296; };
export const mix3 = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
// a shot of the fall: its name, where it starts and how long it is come from CUT
export const shot = (name, o) => ({ name: "fall_" + name, start: CUT[name] / FPS, frames: lengthOf(name), fps: FPS, sets: ["shaft"], ...o });

// ---- the fall ------------------------------------------------------------------------------------------------------------
// How high the four are (the middle of the group; the hatch is y = 0) at song frame F: they leave from just under the
// hatch on 3532 and gather speed for fifty frames.
// Each stretch of it is a shot, with a speed of its own (a cut hides the change): quick past the first places, slower
// seen from below, quickest of all under the ring, so that the ring forms beside the stairwell with three lit
// storeys still under it, has the atrium's daylight on it on the strings' hardest note (3748), the vault's green
// after that, and nothing by the time the brass comes in (3783).
const FALL = [[CUT.side, -15.75], [CUT.below, -60.3], [CUT.ring, -84], [CUT.dark, -128]], LAST = 0.86;      // [song frame, height]; then LAST metres a frame
export const Yg = (F) => { if (F <= CUT.drop) return -3.4; if (F <= CUT.side) return -3.4 - 12.35 * ((F - CUT.drop) / 50) ** 2;
  for (let i = 0; i + 1 < FALL.length; i++) if (F <= FALL[i + 1][0]) return lerp(FALL[i][1], FALL[i + 1][1], (F - FALL[i][0]) / (FALL[i + 1][0] - FALL[i][0]));
  return FALL[FALL.length - 1][1] - LAST * (F - CUT.dark); };
// the strings' loudness (the places' light answers it, as the set's own wire does)
export const strings = (sync, F) => sync.at(F).stems.strings.env, bass = (sync, F) => sync.at(F).stems.bass.env;
// The light a drawing at height y is laid in: the glow of the place it is passing (sets/shaftplan.js), as much of it as
// the strings give. o.base: the tint with no place beside it.
export function lit(y, sync, F, o = {}) {
  const { glow, k } = glowAt(y), s = 0.72 + 0.5 * strings(sync, F), a = clamp(k * s);
  const tint = mix3(o.base ?? [0.6, 0.62, 0.8], glow.map((v) => 0.62 + 0.42 * v), a);
  return { tint, rim: glow.map((v) => v * a * (o.rim ?? 1)), rimDir: o.rimDir ?? [7, 2] };
}

// ---- the drawings --------------------------------------------------------------------------------------------------------
// plates("tane.side", ...): a shot's `plates`, every drawing of each set named
export const plates = (...keys) => Object.fromEntries(keys.flatMap((k) => { const S = SPRITES[k]; if (!S) throw new Error("no such sprite: " + k); return S.files.map((src, i) => [`${k}/${i}`, { src }]); }));
// which drawing of a set of n is on at frame f: there and back on threes (0 1 2 1 ...), from a different place for each `seed`
export const flut = (f, n = 3, seed = 0, hold = 3) => { const seq = n === 3 ? [0, 1, 2, 1] : n === 2 ? [0, 1] : [0]; return seq[(Math.floor(f / hold) + seed) % seq.length]; };
// a drawing on the frame: its box's middle at (x, y) pixels, its box `hpx` pixels high
export function at2d(key, i, x, y, hpx, o = {}) { const S = SPRITES[key]; return { plate: `${key}/${i}`, x, y, scale: hpx / S.h, depth: 0, ...o }; }
// a drawing in the shaft: its box's middle at the world point `p`, `mpp` metres to a pixel of the picture it was painted in
export function at3d(cam, key, i, p, mpp, o = {}) {
  const S = SPRITES[key], c = cam.project ? cam : camera({ fov: 30, ...cam, w: W, h: H }), q = c.project(p);
  return { plate: `${key}/${i}`, x: q.x, y: q.y, scale: q.s * mpp / S.k, depth: q.z, ...o };
}
// metres to a painted pixel, for each picture (so that the four keep their sizes against each other)
export const MPP = { above: 0.002, below: 0.00125, "tane.side": 0.00086, "ife.side": 0.00112, "noor.side": 0.00182, "juno.side": 0.00098, props: 0.0011 };
export const WHO = ["tane", "ife", "noor", "juno"];
// the loose things: which drawing of the prop sheet each is
export const PROP = { geta: 0, pipe: 1, board: 2, head: 3, rotor: 4, geta2: 5, tape: 6, phones: 7, plate: 8 };
export const propPlates = (...names) => plates(...names.map((n) => "tane.props_" + PROP[n]));
// a loose thing in the shaft at p, turned `turn` radians, k times its size
export const prop = (cam, name, p, turn, k = 1, layer = {}) => at3d(cam, "tane.props_" + PROP[name], 0, p, MPP.props * k, { turn, layer });
