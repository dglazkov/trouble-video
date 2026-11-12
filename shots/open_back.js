// Opening 8, 14.71-18.42 s: they back into each other, back to back, under the drones: Tane in front with his fists
// up and his grin back, Juno low and delighted, Ife behind him thinking, Noor looking up, unimpressed. From "deep"
// (15.09 s) the voice is chopped and held, and the picture with it: the same half second, the last step back and the
// bump, is played again on every beat, each time photographed differently (nearer, on one of them, canted, redder).
import { FPS, CUT, CAST, KIDS, HUDDLE, startOf, cues, kid, boil, ease, wob, rnd } from "./open_cast.js";
import { swarm } from "./open_drones.js";
import { edit } from "../engine/edit.js";
const FRAMES = CUT.title - CUT.back, BUMP = 4;
export const PLAYS = [353, 362, 372, 381, 391, 400, 410, 420, 430, 439].map((f) => f - CUT.back);      // each on a beat
const playOf = (f) => { let i = PLAYS.length - 1; while (PLAYS[i] > f) i--; return i; };
// how each play is photographed: what it looks at (a point in the huddle), how long the lens, how far canted
const LOOK = [
  { at: [0.3, 1.25, 2.95], fov: 40, cant: 0 }, { at: [0.3, 1.25, 2.95], fov: 33, cant: -0.05 }, { at: [-0.55, 1.2, 3.0], fov: 21, cant: 0.06 }, { at: [0.85, 1.2, 2.9], fov: 21, cant: -0.07 },
  { at: [0.3, 2.3, 2.95], fov: 52, cant: 0.1, low: 0.5 }, { at: [HUDDLE.tane[0] + 0.05, 1.46, HUDDLE.tane[1]], fov: 13, cant: -0.04 }, { at: [HUDDLE.ife[0] - 0.12, 1.16, HUDDLE.ife[1]], fov: 11, cant: 0.05 }, { at: [HUDDLE.noor[0] + 0.1, 1.6, HUDDLE.noor[1]], fov: 12, cant: -0.06 },
  { at: [HUDDLE.juno[0] + 0.05, 1.2, HUDDLE.juno[1]], fov: 13, cant: 0.07 }, { at: [0.3, 1.3, 2.95], fov: 30, cant: 0 },
];
export const backCamera = (i, u) => { const L = LOOK[i], push = 1 - 0.06 * u / 9; return { pos: [0.45 + 0.25 * Math.sin(i * 2.4), L.low ?? 1.12, 9.3 - 0.12 * i], target: L.at, fov: L.fov * push, up: [Math.sin(L.cant), Math.cos(L.cant), 0] }; };
function frame(f, sync) {
  const F = CUT.back + f, i = playOf(f), u = f - PLAYS[i], cel = u >= BUMP ? 3 : 2, jolt = u >= BUMP ? Math.exp(-(u - BUMP) / 1.6) : 0, c = cues(F), cam = backCamera(i, u), last = i === PLAYS.length - 1;
  cam.pos = [cam.pos[0] + 0.03 * jolt * wob(f, 9, 14, 1), cam.pos[1] + 0.03 * jolt * wob(f, 11, 17, 2), cam.pos[2]];
  return { set: "vault", camera: cam,
    options: { ...c, speech: { ...c.speech, glitch: i ? 0.3 + 0.05 * i : 0 }, drones: swarm(F, { drop: 1.2 + 0.25 * i + 0.4 * (u / 9) }) },
    post: { ca: 0.0016 + 0.005 * jolt + (u === 0 && i ? 0.01 : 0), flash: u === 0 && i ? 0.14 : last ? 0.22 * u : 0, bloom: 1.1 + 0.4 * jolt, sat: 1.05 + 0.03 * i, contrast: 0.3 + 0.02 * i },
    actors: KIDS.map((who, n) => kid(who, cel, { layer: boil(f + n, 1.4) })) };
}
// each play is a shot of its own (a cut: the stage forgets the drawings, and engine/motion.mjs does not take the jump back for a slide)
export const plays = PLAYS.map((p, i) => { const n = (PLAYS[i + 1] ?? FRAMES) - p; return { name: `open_back_${i}`, start: (CUT.back + p) / FPS, frames: n, fps: FPS, cutOn: "beat", sets: ["vault"], cast: CAST, frame: (f, sync) => frame(p + f, sync) }; });
export default edit("open_back", plays);
