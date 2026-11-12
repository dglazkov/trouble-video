// Opening 3, 3.54-7.25 s: along the four faces, from the front of the line to the back, as the strings climb: Tane's
// grin going stiff and then gone; Ife swallowing, then thinking; Noor rolling their eyes; Juno mouthing "oops". Each
// is one drawing lifted off its magenta, and its changes of expression are edits of that drawing (graded back to it:
// pipeline/match.py), swapped on twos.
// The camera never stops trucking down the line, the vault passing behind; a monitor's back wipes each cut, on a beat
// (two dark frames, and a glint as it clears the lens).
import { FPS, CUT, LINE, startOf, cues, ease, rnd } from "./open_cast.js";
const FRAMES = CUT.shut - CUT.faces, W = 1920, H = 1080, PW = 2752, PH = 1536;
// at: the cut (frames of this shot); face: where the face is in the drawing (0..1); size: how big the drawing is hung;
// looks: [from frame of the face's own time, which drawing], in order; dip: frames on which the head ducks; shiver
const FACES = [
  { who: "tane", at: 0, face: [0.535, 0.37], size: 0.76, looks: [[0, 1], [8, 2], [13, 3]] },
  { who: "ife", at: 20, face: [0.55, 0.43], size: 0.74, looks: [[0, 2], [8, 3], [14, 4]], dip: [8, 13], shiver: 1.5 },
  { who: "noor", at: 40, face: [0.5, 0.4], size: 1.0, looks: [[0, 2], [10, 4], [12, 3], [24, 4], [26, 2]] },
  { who: "juno", at: 70, face: [0.5, 0.4], size: 0.73, looks: [[0, 3], [6, 4], [10, 5], [14, 3]] },
];
const plateOf = (who, n) => `open_face_${who}_${n}`;
function frame(f, sync) {
  let i = FACES.length - 1; while (FACES[i].at > f) i--;
  const c = FACES[i], age = f - c.at, len = (FACES[i + 1]?.at ?? FRAMES) - c.at, k = age / len, F = CUT.faces + f, a2 = age - age % 2;
  let look = c.looks[0][1]; for (const [from, n] of c.looks) if (a2 >= from) look = n;
  // the drawing: drifting across as the camera trucks down the line, pushed in a little, ducking or shivering as it acts
  const scale = c.size * (1 + 0.035 * k), dip = c.dip && a2 >= c.dip[0] && a2 < c.dip[1] ? 12 * Math.sin(Math.PI * (a2 - c.dip[0] + 1) / (c.dip[1] - c.dip[0] + 1)) : 0, shv = c.shiver ? (rnd(a2, i) - 0.5) * 2 * c.shiver : 0;
  // (a drawing that runs off its own top or bottom edge is hung so that the edge stays outside the frame)
  const lo = H - PH * scale / 2 + 3, hi = PH * scale / 2 - 3, y = lo < hi ? Math.min(hi, Math.max(lo, H * 0.46 + (0.5 - c.face[1]) * PH * scale + dip)) : H * 0.46 + (0.5 - c.face[1]) * PH * scale + dip;
  const fx = W * 0.5 - 46 + 92 * k + shv, fy = y - (0.5 - c.face[1]) * PH * scale, x = fx + (0.5 - c.face[0]) * PW * scale;
  const kx = LINE[c.who][0] + 0.22 - 0.44 * k, q = cues(F);
  // the wipe: a monitor's back passing close to the lens, over the cut
  const cutIn = age, cutOut = len - age, wipe = i > 0 && cutIn < 2 ? cutIn + 2 : i < FACES.length - 1 && cutOut <= 2 ? 2 - cutOut : null;
  return { set: "vault", camera: { pos: [kx, 1.5, 6.6], target: [kx, 1.62, 0], fov: 21 }, options: { ...q },
    cels: [{ plate: plateOf(c.who, look), x, y, scale, layer: { tint: [0.84, 0.98, 0.96], rim: [1.0, 0.7, 0.28], rimDir: [-13, 2], gradient: 0.32, gradientY: [0, 0.5],
      warp: 1.6, warpDir: [0.2, -1], warpTime: a2 * 0.5, warpStill: [fx / W, 1 - fy / H], warpRadius: 0.2 } }],
    overlay(g) {
      if (wipe === null) return;
      const x0 = -2500 + wipe * 1080; g.fillStyle = "#020809"; g.beginPath(); g.moveTo(x0, -40); g.lineTo(x0 + 2300, -40); g.lineTo(x0 + 2420, 1120); g.lineTo(x0 - 120, 1120); g.closePath(); g.fill();
      g.fillStyle = "#0c2a2a"; g.fillRect(x0 + 2300, -40, 26, 1200); g.fillStyle = "#061314"; for (let j = 0; j < 5; j++) g.fillRect(x0 + 1700, 180 + j * 46, 420, 16);
    },
    post: { flash: i > 0 && age === 2 ? 0.07 : 0, dark: 0.42, bgStreak: [0.0035, 0], ink: 0.7, bloom: 0.8, bloomThreshold: 0.6, wrap: 0.35, ca: 0.0012, vignette: 0.5, focus: [0.5, 0.5] } };
}
const used = FACES.flatMap((c) => [...new Set(c.looks.map((l) => l[1]))].map((n) => [plateOf(c.who, n), { src: `/kits/${c.who}/closeup/open_face_${n}.${n === c.looks[0][1] ? "jpg" : "png"}`, key: "magenta" }]));
export default { name: "open_faces", start: startOf("faces"), frames: FRAMES, fps: FPS, cutOn: "beat", marks: FACES.slice(1).map((c) => ({ at: c.at, what: `to ${c.who}'s face`, on: "beat" })), sets: ["vault"], plates: Object.fromEntries(used), frame };
