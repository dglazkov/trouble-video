// Wins 1, 62.0-63.54 s: OUT OF BLACK. Where the slice left her: at the top of the leap, seen from behind and above. She
// comes down on the far side on the kick (1495): impact frames, the board bites and goes broadside, she skids to a
// stop, sparks and dust off its edge, and looks back over her shoulder at us. On the kick (1515) the swarm comes past
// the camera over the gap without slowing, and she is already going.
import { FPS, CUT, CAST, J, startOf, ease, wob, rnd, lerp, mix3, IMPACT } from "./wins_cast.js";
import { speedLines } from "./slice_fx.js";
import { burst, sparks, smoke } from "./wins_fx.js";
const FRAMES = CUT.corner - CUT.land, LAND = 1495 - CUT.land, STOP = LAND + 14, SWARM = 1515 - CUT.land, GO = SWARM + 3, V = 15 / FPS, Z_LAND = 78.0, SKID = V * 14 / 2;
// where she is: down out of the air to the deck, a skid that dies away, a breath, and off
function at(f) {
  if (f < LAND) { const u = LAND - f; return [0, 0.02 * u + 0.036 * u * u, Z_LAND - V * u]; }
  if (f < GO) { const u = Math.min(1, (f - LAND) / (STOP - LAND)); return [0.55 * u * (2 - u), 0, Z_LAND + SKID * u * (2 - u)]; }
  const u = f - GO; return [0.55 - 0.008 * u * u, 0, Z_LAND + SKID + 0.045 * u * u];
}
function juno(f) {
  const p = at(f), base = { who: "juno", x: p[0], y: p[1], z: p[2], steady: 4 };
  if (f < LAND) return { ...base, action: "leap", phase: 1, hero: "leap_apex", view: "back34" };
  if (f < LAND + 4) return { ...base, action: "wins_juno", phase: J(0), hero: "land", view: "back34" };
  // broadside, the board's near edge is drawn below where she stands: the deck is not to cut it off
  if (f < STOP + 1) return { ...base, action: "wins_juno", phase: J(1), hero: "skid", yaw: 90, view: "side", over: true };
  if (f < GO) return { ...base, action: "wins_juno", phase: J(2), hero: "lookback", yaw: 90, view: "side", over: true };
  return { ...base, action: "ride", phase: 0.5, hero: "ride_mid", view: "back34" };
}
// the swarm: over the gap in a stream, past the camera on SWARM, flat out
const pack = (f, drums) => Array.from({ length: 9 }, (_, i) => { const u = f - SWARM - i * 1.1 + 1, z = 76.2 + 0.72 * u, over = Math.max(0, Math.min(1, (z - 64) / 13)), x = 2.3 * (rnd(i, 1) - 0.5) + 0.9, y = 1.25 + 0.9 * rnd(i, 2) + 1.6 * Math.sin(Math.PI * over) * (1 - over);
  return { type: "chaser", pos: [x + 0.2 * Math.sin(f * 0.5 + i), y, z], yaw: 0, pitch: -10, roll: 22 * Math.sin(f * 0.45 + i * 2), thrust: 1, eye: 1.5 + drums, seed: 80 + i }; });
function frame(f, sync) {
  const F = CUT.land + f, p = at(f), since = f - LAND, drums = sync.drive({ stem: "kick", mode: "pulse", decay: 0.1 }, F), jolt = since >= 0 ? Math.exp(-since / 2.5) : 0, rush = f >= SWARM ? Math.exp(-(f - SWARM) / 5) : 0, shake = 0.01 + 0.1 * jolt + 0.05 * rush;
  // from where the leap left us, down to the deck's edge behind her
  const e = ease((f - 1) / 13), cam = mix3([0.9, 4.75, 69.6], [2.1, 1.1, 78.5], e), stop = at(STOP), tgt = mix3([p[0] * 0.5, p[1] + 0.5, p[2] + 0.5], [stop[0] - 0.4, 0.8, stop[2]], ease((f - LAND) / 10));
  const skid = f >= LAND && f < STOP;
  return { set: "market",
    camera: { pos: [cam[0] + shake * wob(f, 9, 14, 1), cam[1] + shake * wob(f, 11, 17, 2), cam[2]], target: tgt, fov: 54 - 12 * e + 3 * rush },
    options: { alert: 0.6, drones: pack(f, drums), crowd: false, steam: 0.5 },
    post: f < 1 ? { black: 1 } : since === 0 ? IMPACT.black : since === 1 ? IMPACT.orange : { ca: 0.0016 + 0.006 * Math.max(jolt, rush), flash: since === 2 ? 0.45 : since === 3 ? 0.14 : 0, bloom: 1.0, bgBlur: f >= GO ? 0.02 : 0, focus: [0.5, 0.5] },
    actors: [juno(f)],
    under(g, cam2) {      // the dust the skid leaves along the deck, behind her
      for (let i = 0; i < 4; i++) { const born = LAND + 4 + i * 3, q = at(born); smoke(g, cam2, [q[0], 0.15, q[2] - 0.2], f - born, { size: 0.22 + 0.03 * i, life: 20, n: 10, seed: 70 + i, base: "#cbb999", shade: "#9a7b5d", up: 0.35, drift: [0, 0, 1.2], squash: 0.6 }); }
    },
    overlay(g, cam2) {
      if (since < 0) { if (f > 0) { const c = cam2.project([p[0], p[1] + 0.8, p[2]]); speedLines(g, 1920, 1080, { cx: c.x, cy: c.y, n: 70, seed: f - f % 2, inner: 300, color: "rgba(255,255,255,0.9)", width: 0.007, reach: 0.9 }); } return; }
      const hit = cam2.project([0, 0.1, Z_LAND]);
      if (since === 0) speedLines(g, 1920, 1080, { cx: hit.x, cy: hit.y, n: 130, seed: 51, inner: 190, color: "#07020f", width: 0.03, reach: 0.7 });
      else if (since === 1) speedLines(g, 1920, 1080, { cx: hit.x, cy: hit.y, n: 110, seed: 52, inner: 240, color: "#07020f", width: 0.022, reach: 0.8 });
      if (since >= 1) burst(g, hit.x, hit.y, 110, since, 53, 12);
      // the skid: sparks off the board's leading edge, and the dust it leaves along the deck
      if (skid && since >= 2) sparks(g, cam2, [p[0] + 0.2, 0.08, p[2] + 0.35], [1.5, 2.5, 5], (since - 2) % 4, { n: 9, seed: 60 + (since >> 1), life: 6, width: 4 });
    } };
}
export default { name: "wins_land", start: startOf("land"), frames: FRAMES, fps: FPS, held: (f) => f,
  marks: [{ at: LAND, what: "Juno lands: impact frames", on: "kick" }, { at: SWARM, what: "the swarm comes over the gap, past the camera", on: "kick" }], sets: ["market"], cast: CAST, frame };
