// Wins 2, 63.54-64.71 s: TANE, CORNERED. From among the three machines that have him: the blast door shut behind him,
// nowhere to go, and the station's screens tell him so, a word at a time as the voice does. He has not stopped grinning.
import { FPS, CUT, CAST, startOf, corridor, ease, wob, SAY_MARKS } from "./wins_cast.js";
import { tane, trio, TX } from "./wins_tane.js";
import { pipe } from "./wins_fx.js";
const FRAMES = CUT.crack - CUT.corner;
export const PIPE = [[0.95, 0.035, 20.25], [0.8, 0.035, 21.15]];      // where the pipe lies
function frame(f, sync) {
  const F = CUT.corner + f, k = ease(f / FRAMES), drums = sync.drive({ stem: "kick", mode: "pulse", decay: 0.1 }, F);
  return { set: "corridor",
    camera: { pos: [0.3 - 0.1 * k + 0.02 * drums * wob(f, 9, 14, 1), 1.05 + 0.02 * drums * wob(f, 11, 17, 2), 14.9 + 1.0 * k], target: [0.1, 1.75, 22.6], fov: 36 - 2 * k },
    options: corridor(F, { drones: trio(F, sync), post: { ca: 0.0014 + 0.003 * drums, bloom: 0.95 } }),
    actors: [tane(F)],
    under(g, cam) { pipe(g, cam, PIPE[0], PIPE[1]); } };
}
export default { name: "wins_corner", start: startOf("corner"), frames: FRAMES, fps: FPS, cutOn: "kick", held: (f) => f,
  marks: SAY_MARKS(CUT.corner, CUT.crack), sets: ["corridor"], cast: CAST, frame };
