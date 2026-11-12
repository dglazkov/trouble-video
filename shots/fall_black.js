// Fall 13, 162.7 s to the end of the file: BLACK, cut on the synth's last note in the middle of Juno's whoop: no
// fade. The note dies away under it. Half a second in, small in the lower right corner, "to be continued" in the
// film's display face (fonts/DelaGothicOne-Regular.ttf); it is held for as long as there is sound and a little longer,
// and the last quarter second of the file is black.
import { CUT, shot } from "./fall_cast.js";
import { tsuzuku } from "./fall_fx.js";
export const SIGN = { on: 12, off: 44 };      // frames of this shot the sign-off is up (3917-3948 of the song; the file is silent from about 3936)
export default shot("black", { cutOn: "other", sets: [], frame: (f) => ({ set: null, camera: { pos: [0, 0, -5], target: [0, 0, 0], fov: 30 }, post: { grain: 0 },
  backdrop(g) { g.fillStyle = "#000"; g.fillRect(0, 0, 1920, 1080); if (f >= SIGN.on && f < SIGN.off) tsuzuku(g, 1); } }) });
