// The shortest complete shot: one character, no set, under three seconds.   node render.mjs examples/shot.js   -> out/example_shot.mp4
// A shot is a module whose default export says what is in it and, for any frame number, what the picture is.
// frame(f, sync) must be a PURE function of f: frames are rendered one by one, in any order, and must come out the same.
import { orbit } from "../engine/body.js";
import { ground, shadows } from "../engine/scenery.js";
import { CAST, STRIDE } from "../kits/cast.js";

const FPS = 24, CYCLE = 16;      // frames to a cycle of the run: its eight drawings, two frames each ("on twos")
export default {
  name: "example_shot",          // names out/example_shot/ and out/example_shot.mp4
  start: 51.55,                  // seconds into the song that frame 0 is at (render.mjs lays the song under from here); omit for silence
  frames: 64, fps: FPS,
  cast: { juno: CAST.juno },     // who is in it: a name for each, and their kit's folder
  frame(f, sync) {               // sync: the song at any frame (engine/sync.js): beats, bars, stems, words
    const kick = sync.drive({ stem: "kick", mode: "pulse", decay: 0.12 }, this.start * FPS + f);      // 1 on a kick, dying away
    const z = -7 + STRIDE.juno * f / CYCLE;      // where she is: one stride of ground for each cycle of her legs, so a planted foot stays put
    const cam = orbit([0, 0.85, z], 90, 7.4 - 0.5 * kick, { elev: 4, fov: 17 });      // a camera on her left (90 degrees round her), travelling with her, pushed in on each kick
    return {
      camera: { pos: cam.pos, target: cam.target, fov: 17 },
      // what she is doing: an action from engine/actions.js and how far through it (phase counts cycles)
      actors: [{ who: "juno", action: "run", phase: f / CYCLE, z }],
      // no set, so the shot paints its own background on a 2D canvas: a floor grid and posts for her to pass
      backdrop(g, c, bodies) { ground(g, c); shadows(g, c, bodies[0]); },
    };
  },
};
