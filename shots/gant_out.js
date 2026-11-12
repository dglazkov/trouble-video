// Passage 7, 46.58-48.0 s: up and running. This IS the slice's first shot (shots/slice_run.js), begun 34 frames early:
// the same camera, the same four on the same strides, so the slice follows on with no cut at all. What is added
// before its first frame: the last door behind them still going up, the pack pouring under it as the gap opens and
// closing to where the slice finds it, and Tane, last under the door, pounding up the left side to the front.
import run from "./slice_run.js";
import { FPS, CUT, CAST, STRIDE, startOf, slabs, gapOf, ease } from "./gant_cast.js";
const FRAMES = CUT.end - CUT.out, GATE = -48;
function frame(f, sync) {
  const F = CUT.out + f, g = f - FRAMES, base = run.frame(g, sync), k = -g / FRAMES, gap = gapOf(slabs(F)[-2]);      // g: the slice shot's own frame, negative
  const back = 5.5 * ease(k) , dz = -1.0 * ease(k * 1.05);
  return { ...base, options: { ...base.options, slabs: { [-2]: slabs(F)[-2] },
      drones: base.options.drones.map((d) => { const p = [d.pos[0], d.pos[1], d.pos[2] - back * (d.type === "enforcer" ? 1.6 : 1)]; if (p[2] < GATE + 1.6) p[1] = Math.min(p[1], Math.max(0.25, gap - (d.type === "enforcer" ? 1.4 : 0.4))); return { ...d, pos: p }; }).filter((d) => d.type !== "enforcer" || gap > 2.6 || d.pos[2] < GATE - 1.5) },
    // the light on each is the mean of a few frames of their way, a span that closes to nothing by the last frame: no pool
    // strobes on Tane as he overtakes, and the slice's own light is what they are in when it takes over
    actors: base.actors.map((a) => ({ ...(a.who === "tane" ? { ...a, z: a.z + dz } : a), steady: Math.min(4, Math.floor((FRAMES - 1 - f) / 2)) })) };
}
export default { name: "gant_out", start: startOf("out"), frames: FRAMES, fps: FPS, cutOn: "beat", sets: ["corridor"], cast: CAST, frame };
