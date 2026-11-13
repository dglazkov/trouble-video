// Wins 13, 75.96-76.79 s: THE SWARM DOES NOT SLOW. From their side of the door, three-quarters on. They come out of the tunnel
// and go into it one after another, one on every drum hit (1823, 1828, 1833, 1838): a burst, drawn smoke, the machine
// in pieces on the floor, and in the plate a dent for every blow, creased, its paint pulled in with it.
import { FPS, CUT, DOORZ, HITS, BLOWS, startOf, dentsAt, ease, wob, rnd, tunnelSign } from "./wins_cast.js";
import { swarm } from "./wins_juno.js";
import { burst, sparks, smoke, shards, shardsOf } from "./wins_fx.js";
const FRAMES = CUT.salute - CUT.pile, MINE = HITS.filter((h) => h >= CUT.pile && h < CUT.salute);
const at = (i) => [-BLOWS[i][0], BLOWS[i][1], DOORZ - 0.3], BITS = MINE.map((h, i) => shardsOf(12, 30 + i, at(i), [0, 2, -4], 5, ["#2a2f55", "#d9cfb0", "#f07a22", "#14152b", "#cfc8a6", "#f2b21c"]));
function frame(f, sync) {
  const F = CUT.pile + f, since = Math.min(...MINE.map((h) => F >= h ? F - h : 99)), jolt = Math.exp(-since / 2), shake = 0.006 + 0.07 * jolt, k = ease(f / FRAMES);
  return { set: "tunnel",
    camera: { pos: [6.6 + shake * wob(f, 9, 14, 1), 1.0 + shake * wob(f, 11, 17, 2), DOORZ - 3.9 + 0.3 * k], target: [0, 0.92, DOORZ - 0.5], fov: 22 - 1.5 * jolt },
    options: { alert: 1, sign: tunnelSign(F), cut: true, door: 1, dents: dentsAt(F), drones: swarm(F, sync, { carry: -2.2 }), post: { ca: 0.0014 + 0.007 * jolt, flash: since === 0 ? 0.25 : since === 1 ? 0.08 : 0, bloom: 0.9 + 0.4 * jolt } },
    overlay(g, cam) {
      MINE.forEach((h, i) => { const age = F - h; if (age < 0) return; const p = cam.project(at(i));
        smoke(g, cam, [at(i)[0], at(i)[1], at(i)[2] - 0.15], age - 2, { size: 0.34, life: 24, n: 12, seed: 80 + i, up: 0.6, drift: [0, 0, -1.4], hot: true });
        shards(g, cam, BITS[i], age); sparks(g, cam, at(i), [0, 2, -6], age, { n: 12, seed: 70 + i, life: 9 });
        burst(g, p.x, p.y, 0.3 * p.s, age, 60 + i, 12); });
    } };
}
export default { name: "wins_pile", start: startOf("pile"), frames: FRAMES, fps: FPS, cutOn: "kick",
  marks: MINE.map((h, i) => ({ at: h - CUT.pile, what: `a machine goes into the door: blow ${i + 1}`, on: "drums" })), sets: ["tunnel"], frame };
