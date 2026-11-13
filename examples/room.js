// Two of the cast in the smallest set (sets/example.js).   node render.mjs examples/room.js   -> out/example_room.mp4
// Juno stands and watches; Tane runs across the room behind the pool of light. Under two seconds, to be read, not watched.
import { CAST, STRIDE } from "../kits/cast.js";

const FPS = 24, CYCLE = 16;      // frames to a cycle of his run: its eight drawings, two frames each, so a planted foot holds
export default {
  name: "example_room", start: 51.55, frames: 40, fps: FPS,
  sets: ["example"],                                   // built before the first frame (a set first named in frame() is built when met)
  cast: { tane: CAST.tane, juno: CAST.juno },
  frame(f) {
    return {
      set: "example",
      camera: { pos: [0, 1.5, 9], target: [0, 1.1, 0], fov: 34 },
      actors: [
        // yaw: the way a figure faces, in degrees: 0 is toward +z (this camera), 90 toward +x. The stage shows whichever
        // of the kit's views is nearest the camera's line of sight (here her three-quarter front), mirrored when the
        // camera is on the side the view was not drawn from. node render.mjs ... --debug prints which drawing each is on.
        { who: "juno", action: "idle", x: -4.3, z: 0, yaw: 50 },
        // He faces -x and covers one stride a cycle. The camera is on his left, the side his side view was drawn from,
        // so the drawing is not mirrored (a mirrored drawing puts buttons, a streak of hair, a patch on the wrong side).
        { who: "tane", action: "run", phase: f / CYCLE, x: 5.5 - STRIDE.tane * f / CYCLE, z: -1.2, yaw: -90 },
      ],
    };
  },
};
