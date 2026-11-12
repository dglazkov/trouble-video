// Slice 6, 60.04-62.00 s: JUNO'S LEAP, from above and behind. Up the buckled plate, off its top on the bar line
// (60.25 s), over the shaft; at the top of the arc, on the beat (61.07 s), an impact frame, and the moment hangs:
// time runs at a tenth while the lines rush in. On the last bar line (61.92 s) the picture cuts to black.
import { FPS, CUT, CAST, startOf, ease } from "./slice_cast.js";
import { rideZ } from "./slice_ride.js";
import { speedLines } from "./slice_fx.js";
const FRAMES = CUT.end - CUT.leap, LAUNCH = 5, APEX = 25, BLACK = CUT.black - CUT.leap, GAP0 = 66, GAP1 = 76, AIR = 40;      // frames of this shot; the leap takes AIR frames, stretched
// how far through the leap she is at frame f: real time to the apex, a tenth of it after
const leapT = (f) => f < APEX ? (f - LAUNCH) / AIR : (APEX - LAUNCH + (f - APEX) * 0.1) / AIR;
const arc = (t) => [0, 0.85 + 6.6 * t * (1 - t) - 0.85 * t * t, GAP0 + (GAP1 - GAP0 + 1.5) * t];

function frame(f, sync) {
  const F = startOf("leap") * FPS + f, t = leapT(f), air = f >= LAUNCH, since = f - APEX, drums = sync.drive({ stem: "drums", mode: "pulse", decay: 0.12 }, F);
  const z0 = rideZ(CUT.leap + f), p = air ? arc(t) : [0, Math.max(0, 0.85 * (z0 - 62.4) / 3.6), z0];
  const drones = [0, 1, 2, 3, 4].map((i) => {
    const d = 0.2 + i * 0.13, tt = t - d, x = 1.3 * Math.sin(i * 2.2 + 1);
    if (tt < 0) return { type: "chaser", pos: [x, 1.7 + 0.4 * Math.sin(i * 1.3), GAP0 + tt * AIR * 15 / FPS], yaw: 0, pitch: -8, roll: 10 * Math.sin(F * 0.3 + i), thrust: drums, eye: 1 + drums, seed: 70 + i };
    return { type: "chaser", pos: [x, 1.7 + 5.6 * tt * (1 - tt) + 0.4 * Math.sin(i * 1.3), GAP0 + (GAP1 - GAP0 + 1.5) * tt], yaw: 0, pitch: -24 + 50 * tt, roll: 14 * Math.sin(F * 0.3 + i), thrust: 1, eye: 1.6, seed: 70 + i };
  });
  const impact = since === 0 ? { mode: 1, impact: { dark: [1, 1, 1], mid: [1, 1, 1], light: [1, 1, 1], ink: [0.02, 0, 0.05], thresholds: [0.3, 0.5], cel: [[0.02, 0, 0.05], [0.02, 0, 0.05]] } }
    : since === 1 ? { mode: 1, impact: { dark: [0.03, 0.1, 0.14], mid: [1.0, 0.45, 0.08], light: [1.0, 0.92, 0.6], ink: [0.02, 0, 0.05], thresholds: [0.2, 0.5], cel: [[0.02, 0, 0.05], [1, 1, 1]] } } : null;
  return { set: "market",
    // behind her on the deck, then up over her shoulder as she leaves it, so that the shaft opens under her
    camera: (() => { const e = ease((f - 2) / 20); return { pos: [p[0] + 0.9, p[1] + 1.4 + 1.3 * e, p[2] - 4.2 + 1.6 * e], target: [p[0] * 0.5, p[1] - 0.1 - 0.6 * e, p[2] + 2.5 - 1.9 * e], fov: 56 - (since > 0 ? 3 * ease(since / 18) : 0) }; })(),
    options: { alert: 0.6, drones, crowd: { flee: [0, z0] }, steam: 1.4 },
    post: f >= BLACK ? { black: 1 } : impact ?? { ca: 0.0016 + (since > 1 ? 0.004 * Math.exp(-(since - 2) / 3) : 0), bloom: 1.0, flash: since === 2 ? 0.5 : since === 3 ? 0.15 : 0 },
    actors: [{ who: "juno", action: air ? "leap" : "ride", view: "back34", phase: air ? (f >= APEX - 7 ? 1 : 0) : 0.5, x: p[0], y: p[1], z: p[2] }],
    overlay(g, cam) {
      if (since < 0 || f >= BLACK) return;
      const c = cam.project([p[0], p[1] + 0.8, p[2]]);
      if (since === 0) speedLines(g, 1920, 1080, { cx: c.x, cy: c.y, n: 130, seed: 8, inner: 190, color: "#07020f", width: 0.03, reach: 0.7 });
      else if (since === 1) speedLines(g, 1920, 1080, { cx: c.x, cy: c.y, n: 110, seed: 9, inner: 230, color: "#07020f", width: 0.022, reach: 0.8 });
      else speedLines(g, 1920, 1080, { cx: c.x, cy: c.y, n: 70, seed: since - since % 2, inner: 330 + 4 * since, color: "rgba(255,255,255,0.9)", width: 0.007, reach: 0.9 });
    } };
}
export default { name: "slice_leap", start: startOf("leap"), frames: FRAMES, fps: FPS, cutOn: "drums",
  marks: [{ at: LAUNCH, what: "Juno leaves the ramp", on: "bar" }, { at: APEX, what: "the apex: impact frames, time hangs", on: "beat" }, { at: BLACK, what: "cut to black", on: "bar" }], sets: ["market"], cast: CAST, frame };
