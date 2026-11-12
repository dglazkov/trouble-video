// Slice 2, 49.88-51.54 s: four faces, one per beat (the four beats before the first kick, which is the drop; the
// drums roll under the first two and stop for the last two): Tane, Ife, Noor, Juno. Each is
// one drawing lifted off its magenta, on a streaking ground of that kid's colour, with their name slammed on with
// the beat; the drawing bobs with their stride, the camera pushes in, and the wind moves what is far from the face.
import { FPS, CUT, COLORS, startOf } from "./slice_cast.js";
import { streaks, nameCard } from "./slice_fx.js";
// at: the cut (frames of this shot); face: where the face is in the drawing (0..1), which the wind leaves still;
// wind: the way hair and cloth stream (pixels, y up); card: the name card's corner; step: frames per stride
const FACES = [
  { who: "tane", at: 0, src: "/kits/tane/closeup/slice_run.png", kana: "タネ", latin: "TANE", face: [0.36, 0.58], wind: [1, 0.12], card: [1020, 800], step: 8 },
  { who: "ife", at: 10, src: "/kits/ife/closeup/slice_run_2.png", kana: "イフェ", latin: "IFE", face: [0.6, 0.55], wind: [-1, 0.1], card: [130, 830], step: 6 },
  { who: "noor", at: 20, src: "/kits/noor/closeup/slice_run.png", kana: "ヌール", latin: "NOOR", face: [0.33, 0.42], wind: [1, 0.05], card: [1010, 810], step: 9 },
  { who: "juno", at: 30, src: "/kits/juno/closeup/slice_run.png", kana: "ジュノ", latin: "JUNO", face: [0.62, 0.52], wind: [-1, 0.08], card: [120, 300], step: 7, ground: { main: "#0e9aa2", deep: "#04262e", hot: "#ffa030" } },      // teal, so her orange jacket stands off it
];
const FRAMES = CUT.drop - CUT.faces;

function frame(f) {
  let i = FACES.length - 1; while (FACES[i].at > f) i--;
  const c = FACES[i], age = f - c.at, len = (FACES[i + 1]?.at ?? FRAMES) - c.at, col = COLORS[c.who], ground = c.ground ?? col, dir = Math.sign(c.wind[0]), W = 1920, H = 1080;
  // the drawing: pushed in a little more every frame, bobbing on the stride, arriving with a lunge from where the wind goes
  const scale = 0.73 + 0.05 * age / len, bob = Math.abs(Math.sin(Math.PI * age / c.step)) * -16, lunge = age < 3 ? [150, 46, 12][age] * dir : 0;
  const x = W / 2 + lunge + (0.5 - c.face[0]) * 60 - dir * age * 2.2, y = H / 2 + 26 + bob, f2 = age - age % 2;
  return { camera: { pos: [0, 0, 10], target: [0, 0, 0] },
    backdrop(g) { streaks(g, W, H, { colors: ground, angle: -dir * 0.1, t: age * dir, seed: i * 7 + 1 }); },
    cels: [{ plate: c.who, x, y, scale, layer: { warp: 7, warpDir: c.wind, warpTime: f2 * 0.9,
      warpStill: [(x + (c.face[0] - 0.5) * 2752 * scale) / W, 1 - (y + (c.face[1] - 0.5) * 1536 * scale) / H], warpRadius: 0.17 } }],
    overlay(g) { nameCard(g, { kana: c.kana, latin: c.latin, x: c.card[0], y: c.card[1], colors: col, age }); },
    post: { ink: 0, bloom: 0.5, bloomThreshold: 0.8, diffusion: 0.18, ca: 0.0012 + (age < 2 ? 0.004 : 0), vignette: 0.3, grain: 0.035, wrap: 0.2, flash: age === 0 ? 0.55 : age === 1 ? 0.18 : 0, sat: 1.08, contrast: 0.25, shadowTint: [0.01, 0, 0.03], focus: [0.5, 0.5] } };
}
export default { name: "slice_faces", start: startOf("faces"), frames: FRAMES, fps: FPS, cutOn: "beat", marks: FACES.slice(1).map((c) => ({ at: c.at, what: `cut to ${c.who}'s face, the card lands`, on: "beat" })), plates: Object.fromEntries(FACES.map((c) => [c.who, { src: c.src, key: "magenta" }])), frame };
