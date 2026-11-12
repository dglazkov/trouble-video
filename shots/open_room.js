// Opening 2, 1.88-3.54 s: the hit. Every screen in the vault is on and turning to face the four, who are frozen in
// the middle of a sneaking step, in a line for the way out: Tane, Ife, Noor, Juno. The first screen's back is in the
// foreground; whatever is in the ring behind them is only its gold light.
import { FPS, CUT, CAST, KIDS, startOf, cues, kid, ease } from "./open_cast.js";
const FRAMES = CUT.faces - CUT.room;
export const roomCamera = (k) => ({ pos: [-0.75 + 0.35 * k, 1.22, 9.25 - 0.55 * ease(k)], target: [0.35, 1.72, 2.9], fov: 49 - 4 * ease(k) });
function frame(f, sync) {
  const F = CUT.room + f, k = f / FRAMES;
  return { set: "vault", camera: roomCamera(k), options: { ...cues(F) },
    post: { flash: f === 0 ? 0.16 : f === 1 ? 0.05 : 0, bloom: 1.1 + 0.5 * Math.exp(-f / 5), ca: 0.0014 + 0.004 * Math.exp(-f / 3) },
    actors: KIDS.map((who) => kid(who, 0)) };
}
export default { name: "open_room", start: startOf("room"), frames: FRAMES, fps: FPS, cutOn: "beat", sets: ["vault"], cast: CAST, frame };
