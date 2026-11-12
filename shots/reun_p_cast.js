// THE REUNION'S SPLIT SCREEN, L 0-208 (song 119.42-128.08 s): what each of its four panels shows. A panel is a whole
// picture of its own (engine/stage.js `panels`): one of the four, alone, in a place we know, going flat out toward the
// others. content(who, L) is that picture, composed with its subject in the MIDDLE of the frame; shots/reun_split.js
// lays the four into the frame through its panels, and shots/reun_p_WHO.js plays one by itself, full frame, so that
// engine/motion.mjs can watch each figure move.
//   TANE  the corridor, ploughing straight on           IFE   the coolant plant, scurrying
//   NOOR  the duct out of the core, at their own lope   JUNO  the service tunnel, on the board
// The picture changes with the layout, on the kick (LAYOUT):
//   front   0   coming at us, whole figure, the camera backing away ahead
//   side   40   from the side, knees up, tracking: two of them head right and two left, toward each other
//   eyes   79   the eyes, close (one drawing each, on the run's bob), the wall streaming behind
//   mid   119   coming at us again, nearer, the camera canted
//   rush  159   and nearer, until the face is the picture
// THE STATION SAYS WHAT THE VOICES CHANT, in every place at once, on boards of its own hung in the way (WORDS; each
// lights on its onset): "we're in DEEP" three times, then TROUBLE.
import { CAST, COLOR, FPS, F0, W, H, PW, PH, clamp, lerp, ease, wob, rnd } from "./reun_cast.js";
import { STRIDE, RUN } from "./open_cast.js";
import { edit } from "../engine/edit.js";
import { kana, latin, kanaWidth } from "../sets/sign.js";
export { CAST, COLOR, FPS, F0, W, H };
export const LAYOUT = [0, 40, 79, 119, 159, 208], MODE = ["front", "side", "eyes", "mid", "rush"], KIDS = ["tane", "ife", "noor", "juno"];
export const modeAt = (L) => { let i = 0; while (i < 4 && L >= LAYOUT[i + 1]) i++; return { i, name: MODE[i], t: L - LAYOUT[i], n: LAYOUT[i + 1] - LAYOUT[i] }; };
// what the boards say, and the onset each lights on (L; analysis/stems.json: lead and backing vocals)
const T = { text: "TROUBLE", small: "" }, TK = { text: "", small: "トラブル" };
export const WORDS = [{ at: 0, text: "DEEP", small: "ディープ" }, { at: 19, text: "WE'RE IN", small: "" }, { at: 40, text: "DEEP", small: "ディープ" }, { at: 58, text: "WE'RE IN", small: "" }, { at: 79, text: "DEEP", small: "ディープ" },
  { at: 92, ...T }, { at: 143, ...T }, { at: 156, ...TK }, { at: 165, ...T }, { at: 182, ...TK }, { at: 194, ...T }, { at: 207, ...TK }];

// ---- the four places ----------------------------------------------------------------------------------------------------
// dir: the way they go along Z; v: metres a second; x: where across the passage; z0: where each layout's stretch starts;
// hc: how high the head is as they go (leaning, crouched); free: the side of a band of eyes the face leaves clear (1 right);
// zSide: where the stretch seen from the side starts, if not at z0 (the tunnel's wall is cut away only by its door);
// (v: a run's drawings change on twos, eight to a stride, so a stride is made 8, 12 or 16 frames long and each drawing puts the
// planted foot where the one before left it: Ife's quick steps 8, Tane's 12, Noor's long ones 16)
// far: the far wall's face (x) seen from the side, cam: where the side camera stands (x) and its lens;
// board: the board's height hung across the passage, its colours; fog: the place's air, for a board far off
const PLACE = {
  tane: { set: "corridor", dir: 1, v: RUN, x: 0, h: 1.7, hc: 1.6, free: 1, z0: 4, far: 2.2, cam: [-6.4, 24], roof: 2.86, col: "#ffb428", bg: "#1c0d02", house: "#252a52", trim: "#f07a22", fog: [18, 74, 107], fogK: 0.03,
    light: { tint: [0.96, 1.0, 1.1], rim: [0.62, 0.95, 1.0], rimDir: [0, 7] } },
  ife: { set: "plant", dir: 1, v: STRIDE.ife * 3, x: -0.25, h: 1.42, hc: 1.3, z0: 22, far: -1.62, cam: [1.5, 58], free: 1.28, roof: 2.9, col: "#9fe8ff", bg: "#04141f", house: "#cfd6d2", trim: "#f4c21f", fog: [24, 60, 100], fogK: 0.02,
    light: { tint: [0.86, 0.95, 1.03], rim: [0.7, 0.95, 1.0], rimDir: [0, 7] } },
  noor: { set: "core", dir: -1, v: STRIDE.noor * 1.5, x: -0.3, h: 1.82, hc: 1.64, free: 1, z0: -5, far: -1.62, cam: [1.3, 60], roof: 2.62, col: "#f1e6ff", bg: "#1b1136", house: "#2a2247", trim: "#e8d29a", fog: [40, 28, 70], fogK: 0.012,
    light: { tint: [0.88, 0.84, 1.0], rim: [0.95, 0.86, 1.0], rimDir: [5, 2.5] } },
  juno: { set: "tunnel", dir: 1, v: 8.6, x: 0, h: 1.6, hc: 1.42, free: -1, z0: -37, zSide: 48.5, far: -1.3, cam: [6.2, 29], roof: 2.72, col: "#ffb428", bg: "#1c0d02", house: "#10221f", trim: "#f2b21c", fog: [20, 56, 52], fogK: 0.02,
    light: { tint: [0.9, 1.03, 0.97], rim: [0.6, 1.0, 0.85], rimDir: [0, 7] } },
};
export const place = (who) => PLACE[who];
// how far through a stride each is at L (the feet cover the ground the figure does: one cycle to a stride)
const START = { tane: 0.1, ife: 0.7, noor: 0.3, juno: 0 };
const phaseOf = (who, L) => START[who] + PLACE[who].v * modeAt(L).t / FPS / STRIDE[who];
// where each is at L: every layout is a stretch of the place of its own
export function kidAt(who, L) { const p = PLACE[who], m = modeAt(L); const side = m.name === "side" || m.name === "eyes";
  return { x: p.x + (who === "juno" ? (side ? 0 : m.name === "rush" ? 0 : 0.18 * Math.sin(m.t * 0.13)) : 0.06 * Math.sin(L * 0.11 + p.h * 9)), z: (side ? p.zSide ?? p.z0 : p.z0) + p.dir * p.v * m.t / FPS, m }; }

// ---- the cameras ---------------------------------------------------------------------------------------------------------
// from in front: `d` metres ahead, looking back at a point `ty` up, the lens `fov`, canted `roll`
const FRONT = { front: { d: 5, fov: 40, ty: (h) => h + 0.12 }, mid: { d: 3.3, fov: 40, ty: (h) => h - 0.1 } };
function camOf(who, L) {
  const p = PLACE[who], k = kidAt(who, L), m = k.m, s = 0.012, jx = wob(L, 1.9, 3.1, p.h) * s, jy = wob(L, 2.3, 3.7, p.h * 2) * s;
  if (m.name === "side" || m.name === "eyes") {
    const eyes = m.name === "eyes", z = eyes ? (p.zSide ?? p.z0) + 2 + p.dir * 0.6 * m.t / FPS : k.z + p.dir * 0.28, y = eyes ? 1.5 : who === "juno" ? 0.86 : Math.min(1.32, p.h * 0.76);      // (Juno lower: the board is in the picture)
    return { pos: [p.cam[0], y + jy, z + jx], target: [p.far, y, z], fov: eyes ? 52 : p.cam[1] };
  }
  const u = m.name === "rush" ? ease(m.t / (m.n - 6)) : 0, F = m.name === "rush" ? { d: lerp(5, 2.25, u), fov: 40, ty: () => lerp(p.h * 0.62, p.hc - 0.08, u) } : FRONT[m.name];
  const roll = m.name === "mid" ? (["tane", "noor"].includes(who) ? 0.13 : -0.13) : 0, bob = who === "juno" ? 0.2 : 0;
  return { pos: [p.x * 0.4 + jx, 1.0 + jy + (m.name === "front" ? bob : m.name === "rush" && who === "juno" ? 0.05 : 0.2), k.z + p.dir * F.d], target: [k.x * (m.name === "front" ? 0.6 : 0.92) + (who === "juno" ? (m.name === "front" ? 0.1 : m.name === "mid" ? -0.22 : 0.03) : 0),      // (her head is not over the board in the banked drawings)
      F.ty(m.name === "mid" ? p.hc + 0.1 : p.h) + (m.name === "front" ? bob : 0), k.z], fov: F.fov, up: [Math.sin(roll), Math.cos(roll), 0] };
}

// ---- the station's boards -------------------------------------------------------------------------------------------------
// One board per word. Seen from in front it hangs across the passage behind them, 6.5 m from the lens when it lights;
// seen from the side it is on the far wall, just ahead of them when it lights, and they pass it.
function boardAt(who, w) {
  const p = PLACE[who], m = modeAt(w.at), k = kidAt(who, w.at), c = camOf(who, w.at);
  if (m.name === "side") return { c: [p.far, Math.min(1.3, p.h * 0.78), k.z + p.dir * 1.05], u: [0, 0, 1], w: 1.5, h: 0.5 };
  if (m.name === "eyes") { const fw = Math.abs(p.far - p.cam[0]) * 1.734;      // how much of the far wall the lens takes in: the board is a third of it, clear of the face
    return { c: [p.far, 1.5, c.pos[2] + p.free * Math.sign(p.far - p.cam[0]) * 0.3 * fw + p.dir * 0.6 * (w.at - LAYOUT[2]) / FPS * 0.6], u: [0, 0, 1], w: 0.33 * fw, h: 0.11 * fw }; }
  return { c: [0, p.roof - 0.42, c.pos[2] - p.dir * (m.name === "mid" ? 4.9 : m.name === "rush" ? 7.6 : 6.5)], u: [1, 0, 0], w: 2.3, h: 0.76 };
}
function drawBoard(g, cam, who, w, L) {
  const p = PLACE[who], b = boardAt(who, w), age = L - w.at, sg = (b.u[0] * cam.right[0] + b.u[2] * cam.right[2]) < 0 ? -1 : 1;
  const P = (a, e) => cam.project([b.c[0] + sg * b.u[0] * a * b.w / 2, b.c[1] + e * b.h / 2, b.c[2] + sg * b.u[2] * a * b.w / 2]), tl = P(-1, 1), tr = P(1, 1), bl = P(-1, -1), ce = P(0, 0);
  if (Math.min(tl.z, tr.z, bl.z, ce.z) < 0.6) return;
  const fog = 1 - Math.exp(-ce.z * p.fogK), on = age >= 0, flash = age === 0;
  g.save(); g.transform((tr.x - tl.x) / 400, (tr.y - tl.y) / 400, (bl.x - tl.x) / 132, (bl.y - tl.y) / 132, tl.x, tl.y);
  g.fillStyle = "#0b0a1e"; g.fillRect(-20, -30, 440, 182); g.fillStyle = p.house; g.fillRect(-14, -16, 428, 162); g.fillStyle = p.trim; g.fillRect(-14, -24, 428, 10);
  g.fillStyle = "#0b0a1e"; for (const x of [70, 330]) g.fillRect(x - 5, -70, 10, 44);      // its hangers
  g.fillStyle = !on ? "#07070f" : flash ? p.col : p.bg; g.fillRect(0, 0, 400, 132);
  const ink = flash ? p.bg : p.col;
  if (on) {
    g.strokeStyle = ink; g.lineWidth = 5; g.strokeRect(7, 7, 386, 118);
    if (w.text) { const px = Math.min(w.small ? 80 : 92, 356 / (w.text.length * 0.602)), y = w.small ? 78 : 66 + px * 0.36; latin(g, w.text, 200, y, px, ink, { align: "center" }); }
    if (w.small) { const s = w.text ? 26 : 74, ww = kanaWidth(w.small, s); kana(g, w.small, 200 - ww / 2, w.text ? 90 : 29, s, w.text ? 4 : 11, ink); }
  } else { g.fillStyle = "#23233a"; for (let i = 0; i < 5; i++) g.fillRect(40 + i * 68, 60, 40, 10); }
  g.fillStyle = "rgba(0,0,0,0.32)"; for (let y = 0; y < 132; y += 8) g.fillRect(0, y, 400, 3);
  g.fillStyle = `rgba(${p.fog[0]},${p.fog[1]},${p.fog[2]},${fog.toFixed(3)})`; g.fillRect(-20, -70, 440, 222);
  g.restore();
}
// the word a place's own little screens show at L (the tunnel's)
const wordAt = (L) => WORDS.filter((w) => w.at <= L).pop();

// ---- the eyes (one close drawing each: kits/WHO/closeup/reun_eyes_N.jpg) -------------------------------------------------
// eye: the point between the eyes in the drawing (pixels of 2752 x 1536); k: its size on the frame
export const EYES = { tane: { n: 1, eye: [1645, 609], k: 0.8 }, ife: { n: 1, eye: [1820, 545], k: 1.2 }, noor: { n: 2, eye: [1970, 584], k: 0.64 }, juno: { n: 1, eye: [927, 622], k: 0.8 } };
// (Tane's came back with black bars above and below it: lifted off its ground at design time, pipeline/key.py, and the bars taken off)
export const PLATES = Object.fromEntries(KIDS.map((who) => ["eyes_" + who, who === "tane" ? { src: "/kits/tane/closeup/reun_eyes_1_key.png" } : { src: `/kits/${who}/closeup/reun_eyes_${EYES[who].n}.jpg`, key: "magenta" }]));

// ---- the picture ----------------------------------------------------------------------------------------------------------
export function content(who, L) {
  const p = PLACE[who], k = kidAt(who, L), m = k.m, cam = camOf(who, L), F = F0 + L, side = m.name === "side", eyes = m.name === "eyes";
  const say = wordAt(L), near = (zz) => Math.round(zz / 24);
  const options = who === "tane" ? { alert: 0.7, doors: Object.fromEntries([-1, 0, 1, 2].map((i) => [near(k.z) + i, 0])), ...(side || eyes ? { cut: "left", clearStruts: [cam.pos[2] - 7, cam.pos[2] + 7] } : {}) }
    : who === "ife" ? {} : who === "noor" ? { drones: [], far: 0.9 }
    : { door: 0, alert: 0.8, sign: say && say.text ? { text: say.text === "WE'RE IN" ? "IN" : say.text, small: say.small || "トラブル" } : undefined, ...(side || eyes ? { cut: true, cutFrom: cam.pos[2] - 16, cutTo: cam.pos[2] + 16 } : {}) };
  const boards = (g, c) => { for (const w of WORDS) if (modeAt(w.at).i === m.i && L >= w.at) drawBoard(g, c, who, w, L); };
  const speed = side ? 0.05 : eyes ? 0.085 : 0, post = { bgStreak: [speed * (cam.pos[0] < 0 ? -1 : 1) * p.dir * -1, 0], bgBlur: side || eyes ? 0 : m.name === "rush" ? 0.03 : 0.014, focus: [0.5, 0.5] };
  if (eyes) {
    const e = EYES[who], f2 = L - L % 2, bob = who === "juno" ? 5 * Math.sin(f2 * 0.21) : -9 * Math.abs(Math.sin(Math.PI * phaseOf(who, f2) * 2)), sc = e.k * (1 + 0.03 * ease(m.t / m.n));
    return { set: p.set, camera: cam, options, under: boards, post,
      cels: [{ plate: "eyes_" + who, x: W / 2 + (PW / 2 - e.eye[0]) * sc, y: H / 2 + (PH / 2 - e.eye[1]) * sc + bob, scale: sc, layer: { ...p.light, warp: who === "noor" ? 5 : 3, warpStill: [0.5, 0.5], warpRadius: 0.2, warpDir: [who === "ife" || who === "juno" ? 1 : -1, 0.1], warpTime: f2 * 0.8 } }] };
  }
  const yaw = p.dir > 0 ? 0 : 180, view = side ? "side" : "front";
  const actor = who === "juno"
    ? (side ? { who, action: "ride", phase: 0.5, hero: "reun_side_a", view, yaw, x: k.x, y: 0.05 * Math.sin((L - L % 2) * 0.4), z: k.z, steady: 4 }
      // (from in front she is one drawing a stretch, afloat: banked one way, then the other, then level as her face comes to fill the strip)
      : (() => { const lean = m.name === "front" ? 0 : m.name === "mid" ? 2 : 1; return { who, action: "ride", phase: [0, 0.5, 1][lean], hero: ["front_left", "front_mid", "front_right"][lean], view, yaw, x: k.x, y: 0.04 * Math.sin((L - L % 2) * 0.4), z: k.z, steady: 4 }; })())
    : { who, action: "run", phase: phaseOf(who, L), view, yaw, x: k.x, z: k.z, steady: 4 };
  return { set: p.set, camera: cam, options, under: boards, post, actors: [actor] };
}
// one panel's picture by itself, full frame (for engine/motion.mjs and for looking at)
// As engine/edit.js cuts shots: one for each stretch, so each cut is a cut (drawings held on twos from it, no drawing carried over it).
export const solo = (who) => edit("reun_p_" + who, MODE.map((mode, i) => ({ name: `reun_p_${who}_${mode}`, start: (F0 + LAYOUT[i]) / FPS, frames: LAYOUT[i + 1] - LAYOUT[i], fps: FPS, cutOn: "kick", sets: [PLACE[who].set],
  cast: { [who]: CAST[who] }, plates: { ["eyes_" + who]: PLATES["eyes_" + who] }, frame: (f) => content(who, LAYOUT[i] + f) })));
