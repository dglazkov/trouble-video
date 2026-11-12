// Passage 6, 45.13-46.58 s: the door, from their side. Shut. Then something hits it from behind (1093), and again
// (1104): two dents the shape of a drone's nose. On the third blow (1113) it jumps a hand off the floor, red light
// comes under it, and it starts back up: the station opens its doors for its own.
import { FPS, CUT, startOf, slabs, gapOf, wob, rnd, ease } from "./gant_cast.js";
const FRAMES = CUT.out - CUT.dent, GATE = -48, BLOWS = [{ at: 1093, p: [0.7, 1.55] }, { at: 1104, p: [-0.85, 1.05] }, { at: 1113, p: [0.1, 0.5] }];
function frame(f, sync) {
  const F = CUT.dent + f, since = Math.min(...BLOWS.map((b) => F >= b.at ? F - b.at : 99)), jolt = Math.exp(-since / 2.2), shake = 0.008 + 0.09 * jolt, s = slabs(F)[-2], gap = gapOf(s), k = f / FRAMES;
  // what is behind it: eyes, low, waiting for the gap
  const drones = F < 1108 ? [] : [-1.6, -0.9, -0.2, 0.5, 1.2, 1.8].map((x, i) => ({ type: "chaser", pos: [x, Math.max(0.16, Math.min(0.2 + 0.5 * rnd(i, 3), gap - 0.2)), GATE - 0.9 - 0.5 * rnd(i, 4)], yaw: 0, pitch: 0, roll: 12 * Math.sin(F * 0.5 + i), eye: 1.8, thrust: 0.6, seed: 70 + i }));
  return { set: "corridor",
    camera: { pos: [0.9 - 0.5 * k + shake * wob(f, 9, 14, 1), 0.7 + shake * wob(f, 11, 17, 2), GATE + 7.2 - 1.6 * ease(k)], target: [0, 1.3 - 0.3 * ease((F - 1108) / 8), GATE], fov: 44 - 3 * jolt, up: [Math.sin(-0.05), Math.cos(-0.05), 0] },
    options: { alert: 1, slabs: { [-2]: s }, doors: { [-2]: 0, [-1]: 0 }, drones, post: { ca: 0.0014 + 0.007 * jolt, flash: since === 0 ? 0.22 : 0, bloom: 0.9 + 0.5 * jolt } },
    overlay(g, cam) {
      const lift = gap;      // the dents ride up with the slab
      for (const b of BLOWS.slice(0, 2)) {
        const age = F - b.at; if (age < 0) continue;
        const c = cam.project([b.p[0], b.p[1] + lift, GATE + 0.24]), R = 0.36 * c.s, blob = (r, col, dx = 0, dy = 0, seed = 0) => { g.fillStyle = col; g.beginPath(); for (let i = 0; i < 11; i++) { const a = i / 11 * 6.283, rr = r * (0.82 + 0.3 * rnd(i, b.at, seed)); g.lineTo(c.x + dx + Math.cos(a) * rr, c.y + dy + Math.sin(a) * rr * 0.9); } g.closePath(); g.fill(); };
        blob(R * 1.08, "#15162c"); blob(R, "#59639a", 0, 0, 1); blob(R * 0.88, "#3c4575", R * 0.08, R * 0.08, 2); blob(R * 0.6, "#4a5384", -R * 0.08, -R * 0.1, 3);      // a bulge toward us: a light rim, its shaded side, a glint
        g.strokeStyle = "#15162c"; g.lineWidth = 4; for (let i = 0; i < 5; i++) { const a = i / 5 * 6.283 + rnd(i, b.at) * 0.8, l = R * (1.5 + rnd(i, b.at, 5)); g.beginPath(); g.moveTo(c.x + Math.cos(a) * R, c.y + Math.sin(a) * R * 0.9); g.lineTo(c.x + Math.cos(a + 0.2) * l * 0.8, c.y + Math.sin(a + 0.2) * l * 0.75); g.lineTo(c.x + Math.cos(a) * l, c.y + Math.sin(a) * l * 0.9); g.stroke(); }
        if (age < 3) { g.fillStyle = age ? "#ffd23c" : "#fff6d8"; g.beginPath(); for (let i = 0; i < 18; i++) { const a = i / 18 * 6.283 + age, rr = i % 2 ? R * 0.9 : R * (1.8 + 1.2 * rnd(i, age, b.at)); g.lineTo(c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr); } g.closePath(); g.fill(); }
        if (age >= 1 && age < 12) { const t = (age - age % 2 + 1) / 24; g.fillStyle = "#cfd8ff"; for (let i = 0; i < 9; i++) { const q = cam.project([b.p[0] + (rnd(i, b.at, 1) - 0.5) * 2.4 * t * 4, b.p[1] + lift + (rnd(i, b.at, 2) - 0.2) * 3 * t - 4.9 * t * t, GATE + 0.3 + 3 * t * rnd(i, b.at, 3)]), w = 5 + 8 * rnd(i, b.at, 4); g.fillRect(q.x, q.y, w, w * 0.7); } }      // flakes of paint
      }
      if (gap > 0.02) {      // the red that comes under it
        const a = cam.project([-2.3, 0.01, GATE + 0.3]), b2 = cam.project([2.3, 0.01, GATE + 0.3]), c = cam.project([2.9, 0.01, GATE + 3.4]), d = cam.project([-2.9, 0.01, GATE + 3.4]);
        g.fillStyle = `rgba(255,40,40,${(0.28 + 0.1 * (F % 2)).toFixed(2)})`; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b2.x, b2.y); g.lineTo(c.x, c.y); g.lineTo(d.x, d.y); g.closePath(); g.fill();
      }
    } };
}
export default { name: "gant_dent", start: startOf("dent"), frames: FRAMES, fps: FPS, cutOn: "backing_vocals",
  marks: [{ at: 1093 - CUT.dent, what: "a blow dents the door", on: "percussion" }, { at: 1104 - CUT.dent, what: "another", on: "percussion" }, { at: 1113 - CUT.dent, what: "the third lifts it", on: "percussion" }], sets: ["corridor"], frame };
