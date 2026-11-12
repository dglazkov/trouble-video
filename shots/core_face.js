// Core 6, 87.96-89.63 s: NOOR'S FACE, close, adrift: the headphones on, the hair afloat, the eyes half shut. The grid
// is on every side. A beam slashes past in front of the eyes on the strings (2121): its light crosses the face and
// they do not blink. One comes down and stops a hair over the head (2131). One shuts behind the head (2141), and the
// eyes close: not a flinch, the music. One drawing and two edits of it (the light across the eyes; the eyes shut).
import { FPS, CUT, CAST, EV, startOf, ease, clamp, lerp, noorAt, coreOptions } from "./core_cast.js";
import { motes } from "./core_fx.js";
const FRAMES = CUT.close - CUT.face, W = 1920, H = 1080, [S1, S2, S3] = EV.slash.map((s) => s - CUT.face);
const HOT = "#ffffff", SHEATH = "#c79bff", GLOW = "#7a3cff";
// a beam on the picture: through (x, y), at angle a, w pixels of core
function beam(g, x, y, a, w, gain = 1) {
  g.save(); g.translate(x, y); g.rotate(a); g.globalCompositeOperation = "lighter";
  g.globalAlpha = 0.16 * gain; g.fillStyle = GLOW; g.fillRect(-3000, -w * 4.2, 6000, w * 8.4); g.globalAlpha = 0.5 * Math.min(1, gain); g.fillStyle = SHEATH; g.fillRect(-3000, -w * 1.7, 6000, w * 3.4); g.globalAlpha = 1; g.fillStyle = HOT; g.fillRect(-3000, -w / 2, 6000, w);
  g.restore();
}
export const FACE = { scale: 0.78, at: [0.5, 0.52], top: [0.5, 0.085], eyes: 0.493 };      // the plate on the frame; where the head's top is (of the frame, at f = 0)
function frame(f, sync) {
  const F = CUT.face + f, n = noorAt(F), u = f / FRAMES, f2 = f - f % 2;
  const k = FACE.scale * (1 + 0.05 * u), px = W * FACE.at[0] - 14 * u, py = H * FACE.at[1] + 8 * Math.sin(u * 2.4), turn = 0.012 * Math.sin(u * 2.1 - 0.6);
  const near = (s) => Math.exp(-Math.abs(f - s) / 2.2), flare = Math.max(near(S1), near(S2), near(S3));
  const plate = f >= S1 - 1 && f <= S1 ? "lit" : f >= S3 ? "shut" : "face";
  // the slash: across the frame in five frames, in front of the eyes on its note
  const sy = H * ({ [-3]: -0.12, [-2]: 0.17, [-1]: FACE.eyes - 0.012, 0: FACE.eyes + 0.004, 1: 0.8, 2: 1.12 }[f - S1] ?? 2), slashOn = f - S1 >= -3 && f - S1 <= 2;
  // the one that stops over the head: down from above the frame, dead on its note, held, and away
  const topY = H * FACE.top[1] * (1 - 0.05 * u) - 26, dy = f <= S2 ? -520 * (1 - clamp((f - (S2 - 6)) / 6)) ** 3 : f < S2 + 3 ? 0 : -520 * ease((f - S2 - 3) / 22), dropOn = f >= S2 - 6;
  // the one that shuts behind: two that cross behind the head on the note, and stay
  const shut = clamp((f - (S3 - 4)) / 4), sa = lerp(1.25, 0.34, 1 - (1 - shut) ** 3);
  return { set: "core", camera: { pos: [n.x + 3.6, n.y + 1.35, n.z + 2.4], target: [n.x - 3, n.y + 2.0, n.z - 2.2], fov: 30, up: [0.08, 1, 0] }, options: coreOptions(F),
    post: { bgStreak: [0.006, 0], flash: f === S1 ? 0.12 : f === S1 + 1 ? 0.04 : 0, ca: 0.0012 + 0.003 * flare },
    cels: [{ plate, x: px, y: py, scale: k, turn, layer: { tint: [0.97, 0.93, 1.04], rim: [1, 0.95, 1].map((v) => v * (0.55 + 0.6 * flare)), rimDir: [5 + 4 * flare, 4],
      warp: 3.2, warpDir: [0.25, 0.97], warpTime: f2 * 0.16, warpStill: [0.5, 0.47], warpRadius: 0.2 } }],
    under(g) {
      if (f >= S3 - 4) { beam(g, W * 0.56, H * 0.4, sa, 8, 0.9 + 0.7 * near(S3)); beam(g, W * 0.4, H * 0.46, -sa - 0.1, 8, 0.9 + 0.7 * near(S3)); }
    },
    overlay(g, cam) {
      motes(g, cam, F, 60, [8, 6, 8], [n.x, n.y + 1.4, n.z]);
      if (dropOn) beam(g, W * 0.5, topY + dy, -0.05, 7, 0.9 + 0.7 * near(S2));
      if (slashOn) beam(g, W / 2, sy, -0.035, f - S1 === -1 || f === S1 ? 9 : 20, 1.5);
      if (f >= S2 && f < S2 + 6) { const R = [120, 90, 66, 44, 26, 12][f - S2]; g.save(); g.translate(W * 0.5 - 30, topY + 8); g.rotate(0.3); g.fillStyle = HOT; g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, r = i % 2 ? R * 0.13 : R; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.closePath(); g.fill(); g.restore(); }
    } };
}
const src = (n) => ({ src: `/kits/noor/closeup/core_face_${n}`, key: "magenta" });      // 2: the drawing; 3k, 4: edits of it, graded back to it
export default { name: "core_face", start: startOf("face"), frames: FRAMES, fps: FPS, cutOn: "keyboard",
  marks: [{ at: S1, what: "a beam slashes past the eyes", on: "strings" }, { at: S2, what: "a beam stops over the head", on: "keyboard" }, { at: S3, what: "a beam shuts behind; the eyes close", on: "strings" }],
  sets: ["core"], cast: CAST, plates: { face: src("2.jpg"), lit: src("3k.png"), shut: src("4.png") }, frame };
