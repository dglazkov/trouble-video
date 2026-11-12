// Passage 1, 38.71-39.96 s, and 3, 42.04-42.88 s: what the four see. Down the passage every bulkhead has a blast door,
// and every drum hit brings each one down a notch (its jaws biting with it): the nearest is head-high already. The
// second look, after the drums stop: one door left, far down, coming on down steadily.
import { FPS, CUT, startOf, cz, slabs, HITS, wob } from "./gant_cast.js";
import { chase } from "../machines/drones.js";
const view = (name, o) => {
  const C0 = CUT[name], FRAMES = o.end - C0;
  function frame(f, sync) {
    const F = C0 + f, z = cz(F), hit = Math.min(...HITS.map((h) => F >= h ? F - h : 99)), jolt = Math.exp(-hit / 2), bob = Math.abs(Math.sin(Math.PI * f / 6)) * 0.05, shake = 0.012 + 0.06 * jolt;
    return { set: "corridor",
      camera: { pos: [o.x + wob(f, 1.9, 3.1, 1) * shake, o.y + bob + wob(f, 2.3, 3.7, 2) * shake, z + 1.5], target: [0, o.ty, z + 30], fov: o.fov - 1.5 * jolt, up: [Math.sin(o.cant), Math.cos(o.cant), 0] },
      options: { junction: { z: 0 }, alert: 0.8, slabs: slabs(F), hubDoors: { A: 0, B: 0, C: 0, D: 0 }, post: { bgBlur: 0.02 + 0.02 * jolt, focus: [0.5, 0.5], ca: 0.0014 + 0.004 * jolt, flash: o.flash && hit === 0 ? 0.16 : 0 } } };
  }
  return { name: "gant_" + name, start: startOf(name), frames: FRAMES, fps: FPS, cutOn: o.cutOn, marks: HITS.filter((h) => h > C0 && h < o.end).map((h) => ({ at: h - C0, what: "every door comes down a notch", on: "drums" })), sets: ["corridor"], frame };
};
export const doors = view("doors", { end: CUT.slam, x: 0.35, y: 1.25, ty: 1.55, fov: 30, cant: -0.04, flash: true, cutOn: "drums" });
export const door = view("door", { end: CUT.sprint, x: -0.3, y: 0.85, ty: 1.0, fov: 22, cant: 0.05, cutOn: "beat" });
export default doors;
