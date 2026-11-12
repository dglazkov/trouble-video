// Passage 5, 44.13-45.13 s: under the last door. Side-on, the near wall cut away (as the slice will cut it for Tane).
// The door is a metre off the floor and still coming. They drop and go under it feet first in a row, one on each hit
// of the drum fill: Juno (1068), Noor (1071), Ife (1073), Tane (1076), flat on his back with his belly held in; it
// lands on 1078, a hair behind his coat, on the drone that was on it.
import { FPS, CUT, CAST, CADENCE, RUN, startOf, slabs, wob, rnd } from "./gant_cast.js";
import { impacts } from "./gant_fx.js";
const FRAMES = CUT.dent - CUT.slide, GATE = -48, LAND = 1078, V = 10.5;
const CROSS = { juno: [1068, 0.55, 0.55], noor: [1071, -0.35, 0.3], ife: [1073, 0.3, 0.8], tane: [1076, -0.1, 1 / 6] };      // the frame each goes under; across; where in the run cycle
// each runs in, drops DROP frames before the door and slides at V; the drawing lies back as they go under and sits up after
const DROP = 6;
function kid(who, F) {
  const [tc, x, ph] = CROSS[who], u = F - tc;
  const zr = GATE - V * DROP / FPS + RUN * (u + DROP) / FPS, zs = GATE + V * u / FPS, w = Math.min(1, Math.max(0, (u + DROP + 3) / 6)), z = zr + (zs - zr) * w * w * (3 - 2 * w);      // the run's pace gives way to the slide's over six frames
  if (u < -DROP) return { who, action: "run", view: "side", phase: ph + (u + DROP) / (who === "ife" ? 8 : CADENCE[who]), x, z, yaw: 0, steady: 6 };
  return { who, action: "gant_slide", view: "side", phase: u >= -3 && u < 4 ? 0.5 : 0, x, z, yaw: 0, over: true, steady: 6 };
}
const SPARKS = [-1.5, -0.4, 0.7, 1.8].map((x) => ({ at: LAND, to: [x, 0.05, GATE + 0.35], size: 0.9, sparks: 9, kick: [0, 1.5, 3] }));
function frame(f, sync) {
  const F = CUT.slide + f, since = F - LAND, jolt = since >= 0 ? Math.exp(-since / 2.5) : 0, shake = 0.01 + 0.1 * jolt, s = slabs(F)[-2];
  const drones = [2.4, 3.6, 4.8].map((gap, i) => {
    const y = 0.75 + 0.3 * Math.sin(i * 2.1) + 0.08 * Math.sin(F * 0.4 + i), x = 0.7 * Math.sin(i * 1.3 + 0.5), z = GATE + V * (F - 1076) / FPS - gap;
    if (i === 0 && F >= LAND) return { type: "chaser", pos: [x, 0.35, GATE - 0.1], yaw: 0, scale: 1.2, broken: since / FPS, carry: -1.5, seed: 60 };      // under the door as it lands
    if (i > 0 && z > GATE - 1.2) return { type: "chaser", pos: [x, y + 0.4, GATE - 1.2 - 0.3 * i], yaw: 20 * Math.sin(i * 3 + f * 0.5), pitch: 14, roll: 30 * Math.sin(i * 2 + f * 0.6), thrust: 0, eye: 1.6, seed: 60 + i };
    return { type: "chaser", pos: [x, y, z], yaw: 0, pitch: -8, roll: 10 * Math.sin(F * 0.3 + i), thrust: 1, eye: 1.5, seed: 60 + i };
  });
  return { set: "corridor",
    camera: { pos: [9.2 + shake * wob(f, 9, 14, 1), 0.78 + shake * wob(f, 11, 17, 2), GATE - 1.5 + 1.2 * Math.min(1, f / 19)], target: [0, 0.95, GATE - 1.5 + 1.6 * Math.min(1, f / 19)], fov: 29 },
    options: { cut: "right", clearStruts: [GATE - 9, GATE + 7], alert: 0.9, slabs: { [-2]: s }, doors: { [-2]: 0 }, drones },
    post: { bgStreak: [0.003, 0], ca: 0.0012 + 0.006 * jolt, flash: since === 0 ? 0.3 : since === 1 ? 0.1 : 0, bloom: 0.85 + 0.5 * jolt },
    actors: Object.keys(CROSS).map((who) => kid(who, F)),
    overlay(g, cam) { if (since >= 0) impacts(g, cam, SPARKS, F);
      for (const who of Object.keys(CROSS)) { const [tc, x] = CROSS[who], u = F - tc; if (u < -DROP || u > 5 || (u + 100) % 2) continue;      // what their heels and coats strike off the floor, on twos
        const p = cam.project([x, 0.03, GATE + V * u / FPS - 0.5]); g.fillStyle = "#fff6d8"; for (let i = 0; i < 4; i++) { const a = 0.15 + 0.5 * rnd(i, u, tc), l = (30 + 60 * rnd(i, tc, u, 2)); g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x + Math.cos(a) * l, p.y - Math.sin(a) * l - 3); g.lineTo(p.x + Math.cos(a) * l * 0.9, p.y - Math.sin(a) * l + 5); g.closePath(); g.fill(); } } } };
}
export default { name: "gant_slide", start: startOf("slide"), frames: FRAMES, fps: FPS, cutOn: "beat",
  marks: [...Object.entries(CROSS).map(([who, [tc]]) => ({ at: tc - CUT.slide, what: `${who} goes under the door`, on: "drums" })), { at: LAND - CUT.slide, what: "the last door lands behind Tane's coat", on: "drums" }], sets: ["corridor"], cast: CAST, frame };
