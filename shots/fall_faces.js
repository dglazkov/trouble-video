// Fall 9-12, 159.54-162.7 s: FOUR FACES, one to each phrase of the synth, still falling. TANE grins. IFE screams,
// her tears going up. NOOR looks at their nails, and then, for a moment, at us. JUNO whoops, and the film is cut
// off in the middle of it. The screen that went past is above them now: its green is on the first of them from over
// their heads and has gone by the third; and from under them, where there was nothing, something warm is coming up.
// Each is one drawing and one or two edits of it (the hair and cloth a moment on; the eyes), swapped on threes.
import { CUT, W, H, Yg, shot, plates, at2d, ease, clamp, rnd, wob, mix3 } from "./fall_cast.js";
import { wind } from "./fall_fx.js";
// green: how much of the screen's light is still on them; warm: how much of what is below. looks(f): which drawing
const FACES = {
  tane: { key: "tane.face", cutOn: "other", green: 0.9, warm: 0.12, face: [0.5, 0.47], scale: 0.74, looks: (f) => [0, 1][Math.floor(f / 3) % 2], shake: 2 },
  ife: { key: "ife.face", cutOn: "other", green: 0.5, warm: 0.34, face: [0.5, 0.5], scale: 0.76, looks: (f) => [0, 1][Math.floor(f / 2) % 2], shake: 6 },
  noor: { key: "noor.face", cutOn: "guitar", green: 0.12, warm: 0.62, face: [0.5, 0.52], scale: 0.74, looks: (f) => (f >= 10 ? 2 : [0, 1][Math.floor(f / 3) % 2]), shake: 0.6 },
  juno: { key: "juno.face", cutOn: "other", green: 0.0, warm: 1.0, face: [0.5, 0.5], scale: 0.75, looks: (f, n) => (f >= n - 7 ? 2 : [0, 1][Math.floor(f / 3) % 2]), shake: 3 },
};
const face = (name) => { const o = FACES[name], S = 1536; return shot(name, { cutOn: o.cutOn, plates: plates(o.key),
  frame(f, sync) {
    const F = CUT[name] + f, y = Yg(F), n = CUT[Object.keys(CUT)[Object.keys(CUT).indexOf(name) + 1]] - CUT[name], f2 = f - (f % 2), k = o.scale * (1 + 0.0022 * f);
    const lunge = f < 3 ? [26, 9, 2][f] : 0, sx = (rnd(f2, F) - 0.5) * 2 * o.shake, sy = (rnd(f2, F + 9) - 0.5) * 2 * o.shake;
    const tint = mix3(mix3([0.7, 0.74, 0.9], [0.72, 1.02, 0.86], o.green * 0.6), [1.1, 0.95, 0.8], o.warm * 0.8);
    const rim = o.warm > o.green ? [1.0, 0.62, 0.3].map((v) => v * (0.5 + 0.6 * o.warm)) : [0.36, 1.0, 0.62].map((v) => v * o.green);
    return { set: "shaft", camera: { pos: [0.4, y + 0.2, -2.2], target: [-0.3, y + 0.25, 8], fov: 40 }, options: { fog: 0.012 },
      cels: [{ ...at2d(o.key, o.looks(f, n), W * 0.5 + (0.5 - o.face[0]) * 2752 * k + sx, H * 0.5 + (0.5 - o.face[1]) * S * k + lunge + sy + 4 * wob(F, 0.2, 0.33, 1), S * k), layer: { tint, rim, rimDir: o.warm > o.green ? [0, -8] : [0, 8] } }],
      under(g) {
        // what is coming up from below: a warm glow off the bottom of the frame
        if (o.warm > 0) { const a = o.warm * (0.5 + 0.5 * f / n), gr = g.createLinearGradient(0, H * 0.05, 0, H); gr.addColorStop(0, "rgba(255,140,60,0)"); gr.addColorStop(0.6, `rgba(255,130,60,${0.3 * a})`); gr.addColorStop(1, `rgba(255,190,110,${0.85 * a})`); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
        if (o.green > 0) { const gr = g.createLinearGradient(0, 0, 0, H * 0.6); gr.addColorStop(0, `rgba(93,255,168,${0.3 * o.green * (1 - 0.5 * f / n)})`); gr.addColorStop(1, "rgba(93,255,168,0)"); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
      },
      overlay(g) { wind(g, F, { n: 12, alpha: 0.3, speed: 260, len: 300, width: 6, color: o.warm > 0.3 ? "#ffe2c0" : "#dff0ff" }); },
      post: { bgStreak: [0, 0.05], flash: f === 0 ? 0.1 : 0, bloom: 0.75, vignette: 0.5, wrap: 0.35 } };
  } }); };
export const tane = face("tane"), ife = face("ife"), noor = face("noor"), juno = face("juno");
export default tane;
