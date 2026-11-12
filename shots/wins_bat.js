// Wins 4, 65.63-67.25 s: THE FIRST HIT. Side-on, the near wall cut away, the board behind him saying WE'RE IN DEEP.
// His geta comes down on the end of the pipe on the fill (1575) and it jumps; it is in his hands on the next hit (1581)
// and cocked back over his shoulder as the first machine comes at him. On "deep" and the kick (1595) he swings up
// through it: impact frames, and it goes away up the corridor end over end into the roof, where it breaks on the next
// kick (1605).
import { FPS, CUT, CAST, TZ, startOf, corridor, ease, wob, rnd, IMPACT, SAY_MARKS } from "./wins_cast.js";
import { tane, trio, TX, HIT1, ROOF, STAMP, GRAB, BAT_AT, ROOF_AT } from "./wins_tane.js";
import { PIPE } from "./wins_corner.js";
import { speedLines } from "./slice_fx.js";
import { pipe, burst, sparks, smoke, shards, shardsOf, smear } from "./wins_fx.js";
const FRAMES = CUT.catch - CUT.bat, HIT = HIT1 - CUT.bat, CRASH = ROOF - CUT.bat, GOT = GRAB - CUT.bat;
const BITS = shardsOf(22, 4, ROOF_AT, [0, -1, 2.5], 7, ["#2a2f55", "#d9cfb0", "#f07a22", "#14152b", "#2a2f55", "#ff2a1e"]);
function frame(f, sync) {
  const F = CUT.bat + f, since = f - HIT, crash = f - CRASH, jolt = since >= 0 ? Math.exp(-since / 2.5) : 0, bang = crash >= 0 ? Math.exp(-crash / 2.5) : 0, shake = 0.006 + 0.1 * jolt + 0.07 * bang;
  // the camera holds on him through the swing, then goes up the corridor after the machine
  const go = ease((since - 1) / 9), cz = TZ - 0.75 - 1.9 * go, push = ease(f / HIT);
  return { set: "corridor",
    camera: { pos: [7.6 - 0.5 * push + 0.8 * go + shake * wob(f, 9, 14, 1), 1.15 + 0.1 * go + shake * wob(f, 11, 17, 2), cz - 0.3 * go], target: [0, 1.28 + 0.55 * go, cz], fov: 27 - 1.5 * push + 6 * go },
    options: corridor(F, { cut: "right", clearStruts: [12, 24], drones: trio(F, sync) }),
    post: since === 0 ? IMPACT.ink : since === 1 ? IMPACT.red : { ca: 0.0012 + 0.006 * Math.max(jolt, bang), flash: since === 2 ? 0.4 : since === 3 ? 0.12 : crash === 0 ? 0.25 : 0, bloom: 0.9 + 0.5 * jolt },
    actors: [tane(F, { over: true })],
    under(g, cam) { if (f < 1) pipe(g, cam, PIPE[0], PIPE[1]); },
    overlay(g, cam, bodies) {
      const hit = cam.project(BAT_AT), sh = cam.project(bodies[0].J.neckBase);
      // the pipe, kicked up: it turns end over end from the floor to his hand
      if (f >= 1 && f < GOT) { const k = f / GOT, c = [0.85 - 0.45 * k, 0.05 + 1.25 * k + 0.5 * Math.sin(Math.PI * k), 20.7 + 0.35 * k], a = 0.2 + k * 7.5, h = 0.45; pipe(g, cam, [c[0], c[1] - Math.sin(a) * h, c[2] - Math.cos(a) * h], [c[0], c[1] + Math.sin(a) * h, c[2] + Math.cos(a) * h]); }
      if (f < 3) { const p = cam.project([0.6, 0.03, 20.8]); burst(g, p.x, p.y, 46, f + 1, 3, 9); }
      if (f === GOT || f === GOT + 1) { const p = cam.project([TX, 1.45, TZ + 0.2]); burst(g, p.x, p.y, 40, f - GOT + 1, 5, 8); }
      // the swing: one frame of the pipe's whole sweep, low and up through the ball
      if (since === -2) smear(g, sh.x, sh.y, 0.5 * sh.s, 1.25 * sh.s, 3.6, 1.75, ["#e9eef2", "#9aa7b4"]);
      if (since === -1) smear(g, sh.x, sh.y, 0.5 * sh.s, 1.3 * sh.s, 1.75, -0.1, ["#e9eef2", "#9aa7b4"]);
      if (since === 0) speedLines(g, 1920, 1080, { cx: hit.x, cy: hit.y, n: 120, seed: 21, inner: 150, color: "#07020f", width: 0.024, reach: 0.9 });
      else if (since === 1) speedLines(g, 1920, 1080, { cx: hit.x, cy: hit.y, n: 100, seed: 22, inner: 220, color: "#fff", width: 0.02, reach: 0.9 });
      if (since >= 1) { burst(g, hit.x, hit.y, 120, since, 7); sparks(g, cam, BAT_AT, [0, 3, -9], since - 1, { n: 16, seed: 2, life: 10 }); }
      // where it meets the roof
      if (crash >= 0) { const p = cam.project(ROOF_AT); burst(g, p.x, p.y, 130, crash, 9); smoke(g, cam, [ROOF_AT[0], ROOF_AT[1] - 0.25, ROOF_AT[2]], crash - 1, { size: 0.7, life: 30, seed: 6, up: -0.5, drift: [0, 0, -0.6], hot: true }); sparks(g, cam, ROOF_AT, [0, -3, -3], crash, { n: 18, seed: 8, life: 12 }); shards(g, cam, BITS, crash); }
    } };
}
export default { name: "wins_bat", start: startOf("bat"), frames: FRAMES, fps: FPS, cutOn: "drums", held: (f) => f,
  marks: [{ at: 0, what: "his foot comes down on the pipe", on: "drums" }, { at: GOT, what: "the pipe is in his hands", on: "drums" }, { at: HIT, what: "Tane bats the first machine: impact frames", on: "kick" }, { at: CRASH, what: "it breaks on the roof", on: "kick" }, ...SAY_MARKS(CUT.bat, CUT.catch)],
  sets: ["corridor"], cast: CAST, frame };
