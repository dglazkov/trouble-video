// Wins 13, 76.79-78.92 s: HER SIDE. She has stopped a few metres on, sitting on the board with her back to the door,
// and looks round at it as it jumps: something hits it on every drum hit, and every blow is a bulge toward us, creased,
// the hazard stripes going out of true. She turns back, pulls her goggles down (1863), and throws it a salute over her
// shoulder without looking (1873). The last blow, the biggest, lands on the last kick (1883). She has not looked round.
import { FPS, CUT, CAST, J, DOORZ, HITS, BLOWS, startOf, dentsAt, ease, wob, rnd } from "./wins_cast.js";
import { swarm } from "./wins_juno.js";
import { sparks, shards, shardsOf } from "./wins_fx.js";
const FRAMES = CUT.end - CUT.salute, GOGGLES = 1863 - CUT.salute, SALUTE = 1873 - CUT.salute, LAST = 1883 - CUT.salute, JZ = DOORZ + 2.5, MINE = HITS.map((h, i) => [h, i]).filter(([h]) => h >= CUT.salute);
const at = (i) => [BLOWS[i][0], BLOWS[i][1], DOORZ + 0.12 + BLOWS[i][3]], FLAKES = MINE.map(([h, i]) => shardsOf(7, 110 + i, at(i), [0, 1.0, 1.6], 3.0, ["#cfc8a6", "#f2b21c", "#1a1810", "#cfc8a6", "#d8462a"]));
function frame(f, sync) {
  const F = CUT.salute + f, since = Math.min(...MINE.map(([h]) => F >= h ? F - h : 99)), kick = MINE.some(([h, i]) => F >= h && F - h === since && (i % 2 === 0)), jolt = Math.exp(-since / 2) * (kick ? 1 : 0.55) * (F >= 1883 ? 1.8 : 1), shake = 0.004 + 0.035 * jolt, k = ease(f / FRAMES);
  const cel = f < GOGGLES ? 5 : f < SALUTE ? 6 : 7;
  return { set: "tunnel",
    camera: { pos: [0.02 + shake * wob(f, 9, 14, 1), 0.78 + shake * wob(f, 11, 17, 2), JZ + 3.25 - 0.3 * k], target: [0.02, 0.86, DOORZ + 1.0], fov: 40 - 2 * k },
    options: { alert: 0.5, door: 1, dents: dentsAt(F), drones: [], post: { ca: 0.0012 + 0.005 * jolt, bloom: 0.9 + 0.3 * jolt, flash: F === 1883 ? 0.2 : 0 } },
    actors: [{ who: "juno", action: "wins_juno", view: "front34", phase: J(cel), hero: ["sit", "goggles", "salute"][cel - 5], over: true, yaw: -52, x: -0.32, z: JZ }],
    under(g, cam) {      // at the door, behind her
      MINE.forEach(([h, i], n) => { const age = F - h; if (age < 0) return; shards(g, cam, FLAKES[n].map((s) => ({ ...s, size: s.size * 0.45 })), age); if (age < 6) sparks(g, cam, at(i), [0, 1, 3], age, { n: 5, seed: 130 + i, life: 6, width: 3, spread: 0.4 }); });
    } };
}
export default { name: "wins_salute", start: startOf("salute"), frames: FRAMES, fps: FPS, cutOn: "kick", held: (f) => f,
  marks: [...MINE.map(([h, i]) => ({ at: h - CUT.salute, what: `the door bulges: blow ${i + 1}`, on: "drums" })), { at: GOGGLES, what: "her goggles come down", on: "kick" }, { at: SALUTE, what: "the salute", on: "kick" }, { at: LAST, what: "the last blow", on: "kick" }], sets: ["tunnel"], cast: CAST, frame };
