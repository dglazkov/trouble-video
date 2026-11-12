// Slice 3, 51.96-53.00 s: THE DROP. Two impact frames, then the hub from straight above: the four split, one down
// each arm, each leaving a streak of their colour; the swarm pours in after them from the arm they came down,
// stalls over the centre on the next beat, and on the drum hit after it splits four ways.
//   Tane straight on (arm A, +Z), Juno to the market (B, +X), Noor to the ring (D, -X), and Ife doubles back down
//   the wall of the arm they came by (C, -Z), under the swarm.
import { FPS, CUT, CAST, CADENCE, COLORS, startOf, ease, rnd } from "./slice_cast.js";
import { speedLines } from "./slice_fx.js";
const FRAMES = CUT.tane - CUT.drop, STALL = 10, SPLIT = 20;      // frames of this shot: the beat (52.38 s) and the drum hit (52.78 s)
// way: [x, z] out of the hub; yaw: the way they face; side: how far off the arm's centre line they run; far: how far
// they get by the cut (the frame is wider than it is tall, and nobody leaves it)
const WAYS = { tane: { way: [0, 1], yaw: 0, side: 0.3, lag: 0, far: 5.4 }, juno: { way: [1, 0], yaw: 90, side: -0.4, lag: 1, far: 9.6 }, noor: { way: [-1, 0], yaw: -90, side: 0.2, lag: 2, far: 9.2 }, ife: { way: [0, -1], yaw: 180, side: 1.55, lag: 3, far: 5.2 } };
const where = (who, f) => { const w = WAYS[who], d = 0.75 + w.far * Math.pow(Math.max(0, f - w.lag * 0.6) / FRAMES, 0.92), s = w.side * ease((d - 0.7) / 2.5); return [w.way[0] * d + w.way[1] * s, w.way[1] * d - w.way[0] * s]; };

function frame(f, sync) {
  const F = startOf("drop") * FPS + f, k = f / FRAMES, a = -0.14 + 0.2 * k, drums = sync.drive({ stem: "drums", mode: "pulse", decay: 0.12 }, F);
  // the swarm: in through the C mouth to a ring over the centre, a held breath, then out, two to an arm
  const arms = [[0, 1, 0], [1, 0, 90], [-1, 0, -90], [0, -1, 180], [1, 0, 90], [0, 1, 0], [-1, 0, -90], [0, -1, 180]];
  const drones = arms.map(([dx, dz, yaw], i) => {
    const ring = [Math.sin(i * 2.4 + 0.5) * (1.1 + 0.5 * (i % 3)), -1.2 + Math.cos(i * 2.4 + 0.5) * (1.0 + 0.4 * (i % 2))], inT = ease((f - 1 - i * 0.7) / (STALL - 2)), start = [Math.sin(i * 1.9) * 1.4, -12.5 - i * 0.9];
    const out = Math.max(0, f - SPLIT - (i % 3) * 0.7), go = out * out * 0.22 + out * 0.5, t = ease(out / 3), scan = f >= STALL && f < SPLIT ? Math.sin((f - STALL) * 1.1 + i * 2) * 55 * (1 - t) : 0;
    return { type: "chaser", pos: [start[0] + (ring[0] - start[0]) * inT + dx * go, 1.7 + 0.35 * Math.sin(i * 1.7 + F * 0.3), start[1] + (ring[1] - start[1]) * inT + dz * go], yaw: yaw * t + scan, roll: -yaw * 0.3 * Math.sin(t * Math.PI), pitch: -6 * (1 - inT) - 10 * t, thrust: t > 0 ? 1 : drums, eye: 1 + drums + (f >= STALL && f < SPLIT ? 0.6 : 0), seed: 30 + i };
  });
  drones.push({ type: "enforcer", pos: [-0.3, 2.3, -13 + 5.5 * ease(k * 1.3)], yaw: 0, beam: 1, thrust: drums, seed: 5 });
  const impact = f === 0 ? { mode: 1, impact: { dark: [0.02, 0, 0.06], mid: [0.02, 0, 0.06], light: [1, 1, 1], ink: [1, 1, 1], thresholds: [0.24, 0.24], cel: [[1, 1, 1], [1, 1, 1]] } }
    : f === 1 ? { mode: 1, impact: { dark: [0.05, 0.0, 0.14], mid: [1.0, 0.12, 0.42], light: [1.0, 0.95, 0.3], ink: [0.02, 0, 0.06], thresholds: [0.16, 0.34], cel: [[0.02, 0, 0.06], [1, 1, 1]] } } : null;
  return { set: "corridor", camera: { pos: [0, 17 - 3.5 * ease(k), 0.01], target: [0, 0, 0], fov: 50, up: [Math.sin(a), 0, Math.cos(a)] },
    options: { junction: { z: 0 }, cut: "top", alert: 1, hubDoors: { A: 0.75, B: 0.75, D: 0.75, C: 0.1 }, drones },
    post: impact ?? { flash: f === 2 ? 0.45 : f === 3 ? 0.15 : 0, ca: 0.0012 + 0.006 * Math.exp(-f / 4), bloom: 0.85 + 0.6 * Math.exp(-f / 4), wrap: 0.3 },
    actors: Object.keys(WAYS).map((who, i) => { const [x, z] = where(who, f); return { who, action: "runtop", view: "top", phase: i * 0.3 + f / CADENCE[who], yaw: WAYS[who].yaw, x, z }; }),
    // the streaks: each kid's colour laid on the floor from where they were at the drop to where they are, a hot core in it
    under(g, cam) {
      if (impact) return;
      for (const who of Object.keys(WAYS)) {
        const n = 16, pts = Array.from({ length: n + 1 }, (_, j) => { const [x, z] = where(who, f * j / n); return cam.project([x, 0.02, z]); }), col = COLORS[who];
        for (const [wd, c] of [[0.36, col.main], [0.13, col.hot]]) {
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
    } };
}
export default { name: "slice_drop", start: startOf("drop"), frames: FRAMES, fps: FPS, cutOn: "bar",
  marks: [{ at: 0, what: "the drop: impact frames", on: "bar" }, { at: STALL, what: "the swarm stalls over the centre", on: "beat" }, { at: SPLIT, what: "the swarm splits", on: "drums" }], sets: ["corridor"], cast: CAST, frame };
