// Slice 4, 53.00-56.08 s: TANE. Side-on down the corridor (the near wall cut away), tracking him right to left. The
// shutter ahead bites further shut on every drum hit; he drops his shoulder and goes through it on the bar line
// (55.29 s) with an impact frame and its teeth flying; on the next beat it slams behind him and the chaser on his
// heels is cut in two.
import { FPS, CUT, CAST, RUN, startOf, ease, wob, rnd } from "./slice_cast.js";
import { speedLines } from "./slice_fx.js";
const FRAMES = CUT.ride - CUT.tane, HIT = 55, SLAM = 64, GATE = 24;     // frames of this shot; the shutter's z
// side-on, a foot that slides shows: he covers exactly his own stride every cycle of twelve frames (RUN is that speed).
// He runs until WIND frames before the hit, then drops his shoulder and leaves the ground: the wind-up drawing is
// one held pose, so it is in the air (a low bound into the shutter), not sliding along the floor on a planted foot.
const CYCLE = 12, WIND = 6, BOUND = 0.1;
const tz = (f) => GATE + RUN * (f - HIT) / FPS + (f > HIT ? 0.9 * (1 - Math.exp(-(f - HIT) / 3)) : 0);      // he is at the shutter on HIT, and bursts out of it
// the shutter: how far shut it is, biting on each drum hit that has landed (the drum stem's onsets)
function gate(f, sync) {
  const F = startOf("tane") * FPS + f, d = sync.at(F).stems.drums, hits = Math.max(0, d.index - sync.at(startOf("tane") * FPS).stems.drums.index);
  if (f >= SLAM) return [1, 1];
  if (f >= HIT) { const k = Math.min(1, (f - HIT) / 2); return [0.84 - 0.5 * k, 0.8 - 0.42 * k]; }      // knocked open
  const shut = Math.min(0.84, 0.12 + 0.105 * hits + 0.03 * Math.min(1, d.since * 12)), bite = d.since < 0.09 ? 0.05 : 0;
  return [shut + bite, Math.min(0.8, shut * 0.95) + bite];
}
// what flies off the shutter: shards in its colours, thrown ahead of him and falling
const SHARDS = Array.from({ length: 46 }, (_, i) => ({ v: [(rnd(i, 1) - 0.5) * 5, 1.5 + rnd(i, 2) * 5.5, 5 + rnd(i, 3) * 11], at: [(rnd(i, 4) - 0.5) * 1.6, 0.9 + rnd(i, 5) * 1.5, GATE + 0.2], size: 0.05 + 0.17 * rnd(i, 6) ** 2, cut: 0.4 + rnd(i, 8), spin: (rnd(i, 7) - 0.5) * 1.4, col: ["#f6a81c", "#3a426f", "#15162c", "#cfd8ff", "#f6a81c", "#525c9a"][i % 6] }));

function frame(f, sync) {
  const F = startOf("tane") * FPS + f, drums = sync.drive({ stem: "drums", mode: "pulse", decay: 0.12 }, F), z = tz(f), since = f - HIT, slam = f >= SLAM ? Math.exp(-(f - SLAM) / 3) : 0, jolt = since >= 0 ? Math.exp(-since / 2.5) : 0;
  const drones = [1.9, 3.2, 4.6, 6.0, 7.6].map((gap, i) => {
    const y = 1.45 + 0.45 * Math.sin(i * 2.1) + 0.12 * Math.sin(F * 0.4 + i), x = 0.8 * Math.sin(i * 1.3 + 0.5), dz = GATE + RUN * (f - HIT) / FPS - gap;
    if (i === 0 && f >= SLAM) return { type: "chaser", pos: [x, y, GATE + 0.3], yaw: 0, scale: 1.35, broken: (f - SLAM) / FPS, carry: 2.4, seed: 50 };      // caught in the teeth, its nose through on our side, and large enough to read as the machine that was on his heels
    if (i > 0 && dz > GATE - 0.9) return { type: "chaser", pos: [x, y, GATE - 0.9 - 0.25 * i], yaw: 20 * Math.sin(i * 3 + f * 0.5), pitch: 14, roll: 30 * Math.sin(i * 2 + f * 0.6), thrust: 0, eye: 1.6, seed: 50 + i };      // pulled up short
    return { type: "chaser", pos: [x, y, dz], yaw: 0, pitch: -8, roll: 10 * Math.sin(F * 0.3 + i), thrust: drums, eye: 1 + drums, seed: 50 + i };
  });
  // the camera leads him to the shutter and stays there: he runs out of the picture, the shutter and the drone are what is left
  const cz = Math.min(z + 0.9 - 1.3 * ease((f - HIT + 8) / 20), GATE + 1.5 + 0.02 * since), shake = 0.09 * jolt + 0.07 * slam;
  const impact = since === 0 ? { mode: 1, impact: { dark: [0.02, 0, 0.06], mid: [0.02, 0, 0.06], light: [1, 1, 1], ink: [1, 1, 1], thresholds: [0.3, 0.3], cel: [[1, 1, 1], [1, 1, 1]] } }
    : since === 1 ? { mode: 1, impact: { dark: [0.07, 0.0, 0.1], mid: [0.92, 0.1, 0.16], light: [1.0, 0.86, 0.5], ink: [0.02, 0, 0.05], thresholds: [0.15, 0.36], cel: [[0.02, 0, 0.05], [1, 1, 1]] } } : null;
  const charging = f >= HIT - WIND && f < HIT + 7;
  return { set: "corridor",
    // it trails him to the shutter and swings ahead as he goes through: the far face of the shutter, and what comes through it, come at us
    camera: { pos: [7.2 + shake * wob(f, 9, 14, 1), 1.02 + shake * wob(f, 11, 17, 2), cz - 1.6 + 4.4 * ease((f - HIT - 1) / 11)], target: [0, 1.5, cz + 0.4], fov: 37 },
    options: { cut: "right", clearStruts: [26, 30], alert: 0.3, doors: { 1: gate(f, sync) }, drones },
    post: impact ?? { bgStreak: [0.004, 0], ca: 0.0012 + 0.005 * Math.max(jolt, slam), flash: since === 2 ? 0.4 : since === 3 ? 0.12 : f === SLAM ? 0.2 : 0, bloom: 0.85 + 0.5 * jolt },
    actors: [{ who: "tane", action: charging ? "charge" : "run", view: "side", phase: charging ? (f >= HIT ? 1 : 0) : f / CYCLE, over: f >= HIT - 12 && f < HIT + 6, x: 0, z, y: !charging ? 0 : f >= HIT ? 0.12 * Math.sin(Math.PI * Math.min(1, since / 7)) : BOUND * Math.sin(Math.PI * (f - (HIT - WIND) + 0.5) / (WIND + 0.5)) }],
    overlay(g, cam, bodies) {
      const hit = cam.project([0, 1.25, GATE]), face = cam.project(bodies[0].J.head), clear = 0.3 * face.s;      // nothing flies across his face: the grin is the shot
      const off = (p, r) => { const dx = p.x - face.x, dy = p.y - face.y, d = Math.hypot(dx, dy) || 1, m = clear + r; return d >= m ? p : { ...p, x: face.x + dx / d * m, y: face.y + dy / d * m }; };
      if (since === 0) speedLines(g, 1920, 1080, { cx: hit.x, cy: hit.y, n: 120, seed: 4, inner: 170, color: "#07020f", width: 0.024, reach: 0.9 });
      else if (since === 1) speedLines(g, 1920, 1080, { cx: hit.x, cy: hit.y, n: 100, seed: 5, inner: 230, color: "#fff", width: 0.02, reach: 0.9 });
      if (since < 1) return;
      // the shards, on twos
      const t = (since - since % 2 + 1) / FPS;
      for (const s of SHARDS) {
        const y = s.at[1] + s.v[1] * t - 4.9 * t * t; if (y < 0.03) continue;
        const p0 = cam.project([s.at[0] + s.v[0] * t, y, s.at[2] + s.v[2] * t]), r = s.size * p0.s, a = s.spin * since, p = off(p0, r);
        g.save(); g.translate(p.x, p.y); g.rotate(a); g.lineJoin = "miter"; g.lineWidth = 5; g.strokeStyle = "#0b0a1e"; g.fillStyle = s.col;
        g.beginPath(); g.moveTo(-r, -r * 0.35); g.lineTo(r * 1.1, -r * 0.7 * s.cut); g.lineTo(r * 0.2 * s.cut, r * 0.8); g.closePath(); g.stroke(); g.fill(); g.restore();
      }
      // the burst at the shutter: a few frames of hard white spikes
      if (since < 5) { const b = off(hit, (120 + since * 22) * 0.55); g.save(); g.translate(b.x, b.y); g.fillStyle = since < 4 ? "#fff6d8" : "#ff8a2a"; g.beginPath(); const n = 14, R = (120 + since * 22) * (since < 4 ? 1 : 0.6); for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * 2 * Math.PI + since, r = i % 2 ? R * (0.25 + 0.1 * since) : R * (0.7 + 0.6 * rnd(i, since - since % 2)); g.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.85); } g.closePath(); g.fill(); g.restore(); }
    } };
}
// drawings on twos, counted so that a new one lands on the hit (an odd frame): the impact frame shows the impact drawing
export default { name: "slice_tane", start: startOf("tane"), frames: FRAMES, fps: FPS, cutOn: "drums", held: (f) => Math.max(0, f - (f + HIT) % 2),
  marks: [{ at: HIT, what: "Tane goes through the shutter: impact frames", on: "bar" }, { at: SLAM, what: "the shutter slams, the chaser breaks", on: "drums" }], sets: ["corridor"], cast: CAST, frame };
