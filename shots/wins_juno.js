// Juno in the service tunnel (song frames 1724-1892): what its shots share. She rides +Z at SPEED and goes under the
// blast door (z = 64) on 1813; the swarm is strung out behind her and goes into the door, one on every drum hit.
import { FPS, CUT, DOORZ, SPEED, UNDER, HITS, BLOWS, jz, jx, rnd, ease, wob } from "./wins_cast.js";
export const N = 9;
// how far behind her member i flies while the chase is on: the first three in a row she can count, the rest a pack
const GAP = (i) => i < 3 ? 2.6 + i * 1.5 : 6.4 + (i - 3) * 1.15;
// The swarm at song frame F. Each member holds its place behind her until the tunnel is the door's, then flies
// straight at the place on the slab where it will hit (BLOWS), arriving on its drum hit (HITS); after it, it is
// broken there. A member whose hit is still to come when it gets to the door hangs back in the queue.
export function swarm(F, sync, o = {}) {
  const drums = sync.drive({ stem: "drums", mode: "pulse", decay: 0.12 }, F), z0 = jz(F), x0 = jx(F), out = [];
  for (let i = 0; i < N; i++) {
    const hit = HITS[i], b = BLOWS[i], aim = [-b[0], b[1], DOORZ - 0.32];      // the slab's x runs the other way seen from here
    if (F >= hit) { out.push({ type: "chaser", pos: [aim[0], Math.max(0.5, aim[1]), aim[2] - 0.05], yaw: 0, broken: (F - hit) / FPS, carry: o.carry ?? (-3.5 - 2 * rnd(i, 7)), smoke: false, seed: 90 + i }); continue; }
    const lag = jx(F - 4 - i * 2) * 0.7, w = Math.max(0.5, 2.2 - 1.45 * Math.min(1, Math.max(0, z0 / 60)));
    let p = [lag + (rnd(i, 1) - 0.5) * w + 0.14 * Math.sin(F * 0.31 + i * 2), 0.95 + 0.75 * rnd(i, 2) + 0.1 * Math.sin(F * 0.27 + i), z0 - GAP(i) - 0.5 * drums * (i % 2)], roll = 18 * Math.sin(F * 0.33 + i * 2);
    const u = hit - F, run = 14;      // frames to its hit; the last `run` of them are its run at the door
    if (u <= run) { const k = 1 - u / run, from = [p[0], p[1], Math.min(p[2], DOORZ - 0.32 - SPEED * 1.15 * run / FPS)]; p = [from[0] + (aim[0] - from[0]) * k, from[1] + (aim[1] - from[1]) * k, from[2] + (aim[2] - from[2]) * k]; roll += 40 * k * Math.sin(F * 1.3 + i); }
    else if (p[2] > DOORZ - 3.2 - 0.9 * (i % 4)) p = [p[0], p[1], DOORZ - 3.2 - 0.9 * (i % 4) - 0.3 * Math.sin(F * 0.5 + i)];      // nowhere to go: they mill
    out.push({ type: "chaser", pos: p, yaw: 0, pitch: -8, roll, thrust: 0.5 + drums, eye: 1.3 + 0.6 * drums, seed: 90 + i });
  }
  return out;
}
