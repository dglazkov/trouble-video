// Ife's win: HER FACE, between the bar and the swarm (70, 100, 129, 145, 155, 165). One close-up and its edits (her
// mouth as she counts under her breath, her eyes off the bar and onto the passage, a flinch), swapped on twos and
// threes; one closer still, of her eyes, and its edit; and her collar going up over her nose. The CRT is to her left
// (screen right) and lights that side green; the passage is to screen left, and that side goes red as they come.
import { CUT, W, H, PW, PH, shot, src, keyed, plateLight, plant, wob, ease, rnd } from "./boom_cast.js";
// a close-up: which drawing on each frame (looks: [[from frame, plate], ...]), where its face is (0..1), how big
const close = (name, o) => shot(name, { plates: o.plates, cutOn: o.cutOn ?? "kick", marks: o.marks,
  frame(f, sync) {
    const L = CUT[name] + f, a2 = f - f % 2, red = ease((L - 60) / 100) * (o.red ?? 1);
    let look = o.looks[0][1]; for (const [from, n] of o.looks) if (f >= from) look = n;
    const scale = o.scale * (1 + 0.006 * f), lunge = f < 3 ? [o.lunge ?? 40, (o.lunge ?? 40) * 0.3, 4][f] : 0, shv = (rnd(a2, L) - 0.5) * 2 * (o.shiver ?? 1.5), jerk = o.jerk && f >= o.jerk && f < o.jerk + 3 ? [-22, -8, -2][f - o.jerk] : 0;
    const x = W * 0.5 + (0.5 - o.face[0]) * PW * scale + shv + jerk + (o.dx ?? 0), y = H * (o.fy ?? 0.5) + (0.5 - o.face[1]) * PH * scale + lunge * (o.up ? 3 : 0.4);
    const lit = plateLight({ red: red * 0.6 });
    return { set: "plant", camera: { pos: [-2.1, 1.15, 0.9], target: [2.4, 1.5, 0.2 + 0.01 * f], fov: 34 }, options: plant(L, sync, { drones: false }),
      cels: [{ plate: look, x, y, scale, layer: { ...lit, rim: o.rimRed ? [1.0, 0.22 + 0.1 * rnd(a2, 2), 0.2] : [0.45, 1.0, 0.6], rimDir: o.rimRed ? [-9, 2] : [9, 3], warp: 1.2, warpDir: [0.2, -1], warpTime: a2 * 0.5, warpStill: [0.5, 0.5], warpRadius: 0.3 } }],
      post: { bgBlur: 0.03, dark: 0.45 - 0.1 * red, focus: [0.5, 0.5], flash: f === 0 ? 0.1 : 0, ca: 0.0012 + (f < 2 ? 0.003 : 0) + 0.001 * red, bloom: 0.7, wrap: 0.3, shadowTint: [0.05 * red, 0.01, 0.05] } };
  } });
const F = (n) => "boom_face_" + n, FACES = { [F(1)]: src(F(1)), [F(2)]: src(F(2), "png"), [F(3)]: src(F(3), "png"), [F(4)]: src(F(4), "png") };
export const face1 = close("face1", { plates: FACES, face: [0.5, 0.5], scale: 0.8, looks: [[0, F(1)], [2, F(3)], [5, F(1)], [7, F(3)]] });                                    // counting: "...three... four..."
export const face2 = close("face2", { plates: FACES, face: [0.5, 0.5], scale: 0.9, looks: [[0, F(3)], [2, F(1)], [5, F(2)]], jerk: 5, shiver: 2 });                              // her eyes go to the passage
export const eyes1 = close("eyes1", { plates: { boom_eyes_1: keyed("boom_eyes_1") }, face: [0.5, 0.52], scale: 0.74, looks: [[0, "boom_eyes_1"]], shiver: 2, lunge: 20 });
export const eyes2 = close("eyes2", { plates: { boom_eyes_2: keyed("boom_eyes_2") }, cutOn: "percussion", face: [0.5, 0.52], scale: 0.82, looks: [[0, "boom_eyes_2"]], shiver: 3.5, rimRed: true, lunge: 20 });
export const flinch = close("flinch", { plates: FACES, cutOn: "drums", face: [0.5, 0.52], scale: 1.0, looks: [[0, F(2)], [1, F(4)]], shiver: 5, rimRed: true });
export const collar = close("collar", { plates: { boom_collar_1: src("boom_collar_1") }, cutOn: "percussion", face: [0.5, 0.56], fy: 0.52, scale: 0.74, looks: [[0, "boom_collar_1"]], shiver: 3, rimRed: true, lunge: 60, up: true });
