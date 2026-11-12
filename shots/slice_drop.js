// Slice 3, 51.54-53.00 s: THE DROP, on the song's first kick, and one event on each of the three kicks after it.
//   kick 1 (51.55 s)  two impact frames tight on the four from straight above; for a beat they are all there is in
//                     the picture, each one a figure, starting to part
//   kick 2 (51.97 s)  they break: a crash zoom out opens the hub round them as they go, one down each arm, each
//                     leaving a streak of their colour, and the swarm pours in from the arm they came down
//   kick 3 (52.38 s)  the swarm stalls over the centre
//   kick 4 (52.80 s)  the swarm splits four ways
//   Tane straight on (arm A, +Z), Juno to the market (B, +X), Noor to the ring (D, -X), and Ife doubles back down
//   the wall of the arm they came by (C, -Z), under the swarm.
import { FPS, CUT, CAST, COLORS, cadence, startOf, ease, rnd } from "./slice_cast.js";
import { speedLines } from "./slice_fx.js";
const FRAMES = CUT.tane - CUT.drop, BREAK = 10, STALL = 20, SPLIT = 30, PACE = 25;      // frames of this shot: the three kicks after the drop; PACE: the frames their legs are timed to cover `far` in
// way: [x, z] out of the hub; yaw: the way they face; side: how far off the arm's centre line they run; far: how far
// they get by the cut (the frame is wider than it is tall, and nobody leaves it); they gather speed as they go, so
// for the first beat they are still at the centre and large in the frame, and from the break they are where a run
// of 1.35's power over the 25 frames after it would have them (the stall and the split find them where they did). The arms' shutters are 8 m out and
// three quarters shut: at the cut Juno and Noor are just short of theirs, not through them.
const WAYS = { tane: { way: [0, 1], yaw: 0, side: 0.3, lag: 0, far: 5.4 }, juno: { way: [1, 0], yaw: 90, side: -0.4, lag: 1, far: 6.9 }, noor: { way: [-1, 0], yaw: -90, side: 0.2, lag: 2, far: 6.8 }, ife: { way: [0, -1], yaw: 180, side: 1.55, lag: 3, far: 5.2 } };
const where = (who, f) => { const w = WAYS[who], d = 0.75 + w.far * Math.pow(Math.max(0, f - w.lag * 0.6) / FRAMES, 2.2), s = w.side * ease((d - 0.7) / 2.5); return [w.way[0] * d + w.way[1] * s, w.way[1] * d - w.way[0] * s]; };

function frame(f, sync) {
  const F = startOf("drop") * FPS + f, k = f / FRAMES, a = -0.14 + 0.2 * k, drums = sync.drive({ stem: "drums", mode: "pulse", decay: 0.12 }, F);
  // the swarm: in through the C mouth to a ring over the centre, a held breath, then out, two to an arm
  const arms = [[0, 1, 0], [1, 0, 90], [-1, 0, -90], [0, -1, 180], [1, 0, 90], [0, 1, 0], [-1, 0, -90], [0, -1, 180]];
  const drones = arms.map(([dx, dz, yaw], i) => {
    const ring = [Math.sin(i * 2.4 + 0.5) * (1.1 + 0.5 * (i % 3)), -1.2 + Math.cos(i * 2.4 + 0.5) * (1.0 + 0.4 * (i % 2))], inT = ease((f - BREAK - 1 - i * 0.7) / (STALL - BREAK - 2)), start = [Math.sin(i * 1.9) * 1.4, -12.5 - i * 0.9];
    const out = Math.max(0, f - SPLIT - (i % 3) * 0.7), go = out * out * 0.22 + out * 0.5, t = ease(out / 3), scan = f >= STALL && f < SPLIT ? Math.sin((f - STALL) * 1.1 + i * 2) * 55 * (1 - t) : 0;
    return { type: "chaser", pos: [start[0] + (ring[0] - start[0]) * inT + dx * go, 1.7 + 0.35 * Math.sin(i * 1.7 + F * 0.3), start[1] + (ring[1] - start[1]) * inT + dz * go], yaw: yaw * t + scan, roll: -yaw * 0.3 * Math.sin(t * Math.PI), pitch: -6 * (1 - inT) - 10 * t, thrust: t > 0 ? 1 : drums, eye: 1 + drums + (f >= STALL && f < SPLIT ? 0.6 : 0), seed: 30 + i };
  });
  drones.push({ type: "enforcer", pos: [-0.3, 2.3, -13 + 5.5 * ease((f - BREAK) / (FRAMES - BREAK) * 1.3)], yaw: 0, beam: 1, thrust: drums, seed: 5 });
  const impact = f === 0 ? { mode: 1, impact: { dark: [0.02, 0, 0.06], mid: [0.02, 0, 0.06], light: [1, 1, 1], ink: [1, 1, 1], thresholds: [0.24, 0.24], cel: [[0.02, 0, 0.06], [0.02, 0, 0.06]] } }
    : f === 1 ? { mode: 1, impact: { dark: [0.05, 0.0, 0.14], mid: [1.0, 0.12, 0.42], light: [1.0, 0.95, 0.3], ink: [0.02, 0, 0.06], thresholds: [0.16, 0.34], cel: [[0.02, 0, 0.06], [1, 1, 1]] } } : null;
  // from high above on a long lens (the kids are drawn in plan, so nothing is seen from the side): tight on the four
  // as the drop lands and for the beat after it, each one a figure, then on the break a crash zoom out, which opens the
  // hub and its four arms round them. `half` is half the frame's height in metres on the floor: it stays just ahead of
  // Tane and Ife (up and down the screen), and Juno and Noor have the width. The crash: over the four frames from the
  // break the frame opens to what it would be seven frames on, and the kids then gain on it until the cut.
  const since = f - BREAK, ahead = Math.min(FRAMES, f + 7 * ease(since / 4) * (1 - ease((since - 4) / (FRAMES - BREAK - 4)))), kick = since >= 0 ? Math.exp(-since / 3) : 0;
  const lead = Math.hypot(...where("tane", ahead)) + 0.95, half = Math.hypot(1.95, Math.max(0, lead - 1.2) * 1.12), HIGH = 22;
  return { set: "corridor", camera: { pos: [0, HIGH, 0.01], target: [0, 0, 0], fov: 2 * Math.atan(half / HIGH) * 180 / Math.PI, up: [Math.sin(a), 0, Math.cos(a)] },
    options: { junction: { z: 0 }, cut: "top", alert: 1, hubDoors: { A: 0.75, B: 0.75, D: 0.75, C: 0.1 }, drones },
    post: impact ?? { flash: f === 2 ? 0.45 : f === 3 ? 0.15 : f === BREAK ? 0.3 : f === BREAK + 1 ? 0.1 : 0, ca: 0.0012 + 0.006 * Math.exp(-f / 4) + 0.004 * kick, bloom: 0.85 + 0.6 * Math.exp(-f / 4) + 0.35 * kick, wrap: 0.3 },
    actors: Object.keys(WAYS).map((who, i) => { const [x, z] = where(who, f); return { who, action: "runtop", view: "top", phase: i * 0.3 + f / cadence(who, WAYS[who].far * FPS / PACE), yaw: WAYS[who].yaw, x, z }; }),      // each at the cadence of the speed they leave at
    // the streaks: each kid's colour laid on the floor from where they were at the drop to where they are, a hot core in it
    under(g, cam) {
      if (impact) return;
      for (const who of Object.keys(WAYS)) {
        const n = 16, pts = Array.from({ length: n + 1 }, (_, j) => { const [x, z] = where(who, f * j / n); return cam.project([x, 0.02, z]); }), col = COLORS[who];
        // a streak is as wide as it is long until it is a metre and a half long: in the beat before the break it is a lick at their heels, not a collar round them
        const p0 = where(who, 0), p1 = where(who, f), grow = Math.min(1, Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) / 1.5);
        for (const [wd, c] of [[0.36 * grow, col.main], [0.13 * grow, col.hot]]) {
          g.fillStyle = c; g.beginPath();
          const side = (sg) => pts.map((p, j) => { const q = pts[Math.min(n, j + 1)], o = pts[Math.max(0, j - 1)], dx = q.x - o.x, dy = q.y - o.y, l = Math.hypot(dx, dy) || 1, w = wd * p.s * (j / n) ** 0.7 * (1 + 0.25 * (rnd(j, f - f % 2, sg) - 0.5)); return [p.x - dy / l * w * sg, p.y + dx / l * w * sg]; });
          [...side(1), ...side(-1).reverse()].forEach(([x, y], j) => j ? g.lineTo(x, y) : g.moveTo(x, y)); g.closePath(); g.fill();
        }
      }
    },
    overlay(g) {
      if (f === 0) speedLines(g, 1920, 1080, { n: 110, seed: 1, inner: 250, color: "#fff", width: 0.02 });
      else if (f === 1) speedLines(g, 1920, 1080, { n: 90, seed: 2, inner: 300, color: "#07020f", width: 0.026 });
      else if (f < 6) speedLines(g, 1920, 1080, { n: 60, seed: f, inner: 420 + f * 60, color: "rgba(255,255,255,0.85)", width: 0.008 });
      else if (f >= BREAK && f < BREAK + 4) speedLines(g, 1920, 1080, { n: 70, seed: f, inner: 380 + (f - BREAK) * 90, color: "rgba(255,255,255,0.85)", width: 0.009 });      // the break
    } };
}
export default { name: "slice_drop", start: startOf("drop"), frames: FRAMES, fps: FPS, cutOn: "kick",
  marks: [{ at: 0, what: "the drop: impact frames", on: "kick" }, { at: BREAK, what: "the four break, the crash zoom", on: "kick" }, { at: STALL, what: "the swarm stalls over the centre", on: "kick" }, { at: SPLIT, what: "the swarm splits", on: "kick" }], sets: ["corridor"], cast: CAST, frame };
