// Passage 2, 39.96-42.04 s: from in front, backing down the passage ahead of the four, the pack behind them. The door
// far behind lands as we cut (959) and the next on 969; shots hit the floor and the walls round them (974, 977); we go
// under door -3, it drops another notch (989), they come under it one after another and it lands a hair behind
// Tane (999) on a drone that was not quick enough. Three of the pack get under.
import { FPS, CUT, CAST, KIDS, startOf, cz, slabs, gapOf, sprinter, HITS, wob, ease, FLY } from "./gant_cast.js";
import { chase } from "../machines/drones.js";
import { bolts, impacts } from "./gant_fx.js";
const FRAMES = CUT.door - CUT.slam;
const FIRE = [{ at: 969, to: [0.9, 0.02, cz(969) - 2.6], kick: [0, 2, 1] }, { at: 974, to: [-2.6, 1.6, cz(974) - 0.4], kick: [2, 0, 0] }, { at: 977, to: [1.4, 3.3, cz(977) + 1.5], kick: [0, -2, 1], size: 1.2 }].map((s, i) => ({ ...s, from: [[-0.6, 1.9], [0.8, 2.3], [0.1, 1.6]][i].concat(cz(s.at - FLY) - 7.5) }));
// the pack: six chasers; the three that get under door -3 before it lands, the one it lands on, the two left behind it
export function pack(F, sync) {
  const list = chase(F, sync, { n: 6, lead: [0.1, 1.75, cz(F) - 6.2], spread: [3.4, 1.2, 5.5], seed: 8, lurch: 0.7 }), g = gapOf(slabs(F)[-3]);
  return list.map((d, i) => {
    const p = d.pos.slice(); let broken = null;
    if (i >= 3) { const back = (i - 3) * 1.1; p[2] = Math.min(p[2], cz(F) - 9.5 - back); if (i === 3 && F >= 999) { p[2] = -72.1; p[1] = 0.5; broken = (F - 999) / FPS; } else if (F >= 996) p[2] = Math.min(p[2], -73.2 - back); }      // late: one under the door as it lands, two pulled up short
    if (Math.abs(p[2] + 72) < 1.6) p[1] = Math.min(p[1], Math.max(0.3, g - 0.4));      // under the slab's edge
    return { ...d, pos: p, broken, carry: 2 };
  });
}
function frame(f, sync) {
  const F = CUT.slam + f, z = cz(F), hit = Math.min(...HITS.map((h) => F >= h ? F - h : 99)), jolt = Math.exp(-hit / 2.2) * (F >= 999 ? 1.8 : 1), shake = 0.012 + 0.05 * jolt, k = f / FRAMES;
  return { set: "corridor",
    camera: { pos: [-0.7 + 1.2 * k + wob(f, 1.9, 3.1, 1) * shake, 0.5 + wob(f, 2.3, 3.7, 2) * shake, z + 5.8 - 0.8 * k], target: [0, 1.2, z - 1.4], fov: 49 + 2 * jolt, up: [Math.sin(0.06), Math.cos(0.06), 0] },
    options: { junction: { z: 0 }, alert: 0.8, slabs: slabs(F), doors: Object.fromEntries([-4, -3, -2, -1, 0].filter((k) => k * 24 > z - 5).map((k) => [k, 0])), hubDoors: { A: 0, B: 0, C: 0, D: 0 }, drones: pack(F, sync), post: { bgBlur: 0.012 + 0.02 * jolt, focus: [0.5, 0.55], ca: 0.0014 + 0.004 * jolt, flash: F === 999 ? 0.3 : F === 959 || F === 969 ? 0.12 : 0 } },
    actors: KIDS.map((who) => sprinter(who, F, { steady: 4 })),
    under(g, cam) { impacts(g, cam, FIRE, F, "scorch"); },
    overlay(g, cam) { bolts(g, cam, FIRE, F); impacts(g, cam, FIRE, F);
      for (const [k2, at] of [[-4, 969], [-3, 999]]) { const u = F - at; if (u < 0 || u > 12) continue;      // where a door lands: a line of sparks along its foot
        impacts(g, cam, [-1.6, -0.5, 0.6, 1.7].map((x, i) => ({ at: at, to: [x, 0.06, k2 * 24 + 0.3], size: 0.8, sparks: 7, kick: [0, 1.5, 3] })), F); } } };
}
export default { name: "gant_slam", start: startOf("slam"), frames: FRAMES, fps: FPS, cutOn: "drums",
  marks: [{ at: 969 - CUT.slam, what: "door -4 lands", on: "drums" }, { at: 974 - CUT.slam, what: "a shot hits the wall", on: "drums" }, { at: 977 - CUT.slam, what: "a shot hits the ceiling", on: "drums" }, { at: 989 - CUT.slam, what: "door -3 drops a notch over them", on: "drums" }, { at: 999 - CUT.slam, what: "door -3 lands behind Tane", on: "drums" }], sets: ["corridor"], cast: CAST, frame };
