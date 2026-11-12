// Descent 5, 27.33-29.29 s: THE BOTTOM, in three cuts.
//   (a) square on the foot of the shaft, and nobody there: the lift comes down into the picture and lands on the hit
//       (27.77 s) with a ding;
//   (b) on the next note, close on its gate: it folds back, and there is Noor, examining their nails as they have
//       been the whole way down;
//   (c) wide again: Noor has stepped out and gone on examining them. On the next hit (28.38 s) Tane and Juno arrive
//       from above in one piece, and on the one after (28.61 s) Ife lands on top. Noor does not look up.
import { FPS, CUT, CAST, startOf, boil, wob, rnd, facing } from "./desc_cast.js";
import { LIFT, BOTTOM as B } from "../sets/stairplan.js";
import { kana } from "../sets/sign.js";
const FRAMES = CUT.exit - CUT.ding, DING = 10, CLOSE = 13, WIDE = 21, CRASH = 25, IFE = 31;      // frames from the first cut: the ding, the cut in to the gate, the cut back out, the two landings      // frames of this shot
const CAM = { pos: [-2.75, B + 1.5, 11.6], target: [-2.6, B + 1.28, 0], fov: 26 };
// Noor: in the cage until the cut back out, then a step and a half in front of it
const YAW = 12, IN = [LIFT.x + 0.1, 0.12], AT = [LIFT.x + 0.5, 1.55], NEAR = { pos: [LIFT.x + 0.75, B + 1.5, 5.3], target: [LIFT.x + 0.08, B + 1.3, 0.12], fov: 23 };
// the heap: where each lies, how high, the way they face, and the frame they land on
const HEAP = { tane: { at: [-1.2, 0, 1.05], yaw: -90, on: CRASH }, juno: { at: [-0.95, 0, 1.36], yaw: -20, on: CRASH }, ife: { at: [-0.07, 0, 1.44], yaw: 14, on: IFE } };
const FROM = { tane: [5.0, 3.0], juno: [5.9, 3.5], ife: [1.0, 3.3] };      // how far across and up each is, four frames before landing (they come in at one speed: the floor stops them)
const liftY = (f) => f >= DING - 1 ? 0 : 2.5 * (1 - f / (DING - 1)) ** 2;
const gate = (f) => f <= CLOSE ? 1 : Math.max(0, 1 - (f - CLOSE) / 4);
function frame(f, sync) {
  const since = f - CRASH, s2 = f - IFE, jolt = (since >= 0 ? Math.exp(-since / 2.2) : 0) + (s2 >= 0 ? 0.6 * Math.exp(-s2 / 2) : 0) + (f >= DING - 1 ? 0.25 * Math.exp(-(f - DING + 1) / 1.5) : 0);
  const ly = liftY(f), close = f >= CLOSE && f < WIDE, out = f >= WIDE, at = out ? AT : IN, cam = close ? { ...NEAR, pos: [NEAR.pos[0], NEAR.pos[1], NEAR.pos[2] - 0.03 * (f - CLOSE)] } : CAM;
  const actors = [{ who: "noor", action: out ? "desc_wait" : "desc_cage", phase: 2 / 3, hero: "nails", x: at[0], y: B + (out ? 0 : ly), z: at[1], yaw: close ? facing([at[0], 0, at[1]], cam.pos) + 20 : YAW, shadow: out, layer: boil(f, close ? 1.3 : 0.9) }];
  for (const [who, h] of Object.entries(HEAP)) {
    const u = f - h.on; if (u < -4) continue;
    if (u < 0) {      // coming down: the drawings of the shaft (Ife's is this shot's own), on the way to where they will lie
      const k = -u / 4, p = [h.at[0] + FROM[who][0] * k, B + h.at[1] + FROM[who][1] * k, h.at[2]];
      actors.push(who === "tane" ? { who, action: "desc_vault", view: "side", phase: 1 / 3, x: p[0], y: p[1], z: p[2], yaw: -90, shadow: false }
        : who === "juno" ? { who, action: "desc_slide", view: "side", phase: 1 / 3, x: p[0], y: p[1], z: p[2], yaw: -90, shadow: false }
        : { who, action: "desc_heap", phase: 0, hero: "fall", x: p[0], y: p[1], z: p[2], yaw: 8, shadow: false });
      continue;
    }
    // landed: one bounce, and the ones underneath give when Ife lands on them
    const bounce = [0, 0.05, 0.02][u] ?? 0, give = who !== "ife" && s2 >= 0 ? -[0.05, 0.02][s2] || 0 : 0;
    actors.push({ who, action: "desc_heap", phase: 0.5, hero: "heap", x: h.at[0], y: B + h.at[1] + bounce + give, z: h.at[2], yaw: h.yaw, layer: boil(f + who.length, 1.1) });
  }
  const impact = since === 0 ? { mode: 1, impact: { dark: [0.02, 0, 0.05], mid: [0.02, 0, 0.05], light: [1, 1, 1], ink: [1, 1, 1], thresholds: [0.3, 0.3], cel: [[1, 1, 1], [1, 1, 1]] } }
    : since === 1 ? { mode: 1, impact: { dark: [0.05, 0.08, 0.02], mid: [0.98, 0.78, 0.1], light: [1, 0.97, 0.8], ink: [0.03, 0.02, 0], thresholds: [0.14, 0.4], cel: [[0.03, 0.02, 0], [1, 1, 1]] } } : null;
  return { set: "stairwell",
    camera: { ...cam, pos: [cam.pos[0] + 0.05 * jolt * wob(f, 9, 14, 1), cam.pos[1] + 0.06 * jolt * wob(f, 11, 17, 2), cam.pos[2]] },
    options: { lift: { y: B + ly, gate: gate(f), lamp: f >= DING ? 1 : 0, ding: f >= DING ? f - DING : -1 }, alert: 1, level: "bottom" },
    post: impact ?? { ca: 0.0012 + 0.005 * jolt, flash: since === 2 ? 0.35 : since === 3 ? 0.1 : s2 === 0 ? 0.3 : s2 === 1 ? 0.1 : f === DING ? 0.12 : 0, bloom: 0.9 + 0.4 * jolt },
    actors,
    overlay(g, cam) {
      const P = (p) => cam.project(p);
      // the ding: ticks round the lamp over the gate, and the word, for a third of a second
      const d = f - DING;
      if (d >= 0 && d < 9) {
        const c = P([LIFT.x, B + LIFT.h + 0.42, LIFT.z1 + 0.1]), d2 = d - d % 2, r0 = c.s * (0.3 + 0.05 * d2), r1 = c.s * (0.52 + 0.09 * d2);
        g.strokeStyle = "#fff3c4"; g.lineWidth = Math.max(3, c.s * 0.028); g.lineCap = "butt"; g.beginPath();
        for (let i = 0; i < 9; i++) { const a = Math.PI * (1.08 + 0.84 * i / 8); g.moveTo(c.x + Math.cos(a) * r0, c.y + Math.sin(a) * r0 * 0.9); g.lineTo(c.x + Math.cos(a) * r1, c.y + Math.sin(a) * r1 * 0.9); }
        g.stroke();
        const s = c.s * 0.3 * ([1.5, 1.5, 1.1, 1.1][d] ?? 1), x = c.x + c.s * 0.75, y = c.y - c.s * 0.95;
        g.save(); g.translate(x, y); g.rotate(-0.16); kana(g, "チーン", 0, 0, s, s * 0.3, "#16130c", { pitch: 1.0 }); kana(g, "チーン", 0, 0, s, s * 0.15, "#ffd84a", { pitch: 1.0 }); g.restore();
      }
      if (impact) return;
      // dust thrown out along the floor from under the heap: hard puffs, on twos, in two tones
      for (const [t0, at, n] of [[CRASH, HEAP.tane.at, 9], [IFE, HEAP.ife.at, 5]]) {
        const u = f - t0; if (u < 1 || u > 13) continue; const u2 = u - u % 2, k = u2 / 13;
        for (let i = 0; i < n; i++) {
          const sgn = i % 2 ? 1 : -1, sp = 0.5 + rnd(i, t0, 1) * 1.5, p = P([at[0] + (t0 === CRASH ? 0.4 : 0) + sgn * (0.5 + sp * (1 - (1 - k) ** 2) * 1.5), B + 0.12 + 0.5 * k * rnd(i, t0, 2), at[2] + 0.3]), r = p.s * (0.1 + 0.13 * rnd(i, t0, 3)) * (1 - k * 0.75);
          if (at === HEAP.tane.at && sgn < 0 && i < 6) continue;      // none across his face
          for (const [dx, col] of [[0, "#2c3024"], [-0.14, "#aeb08c"]]) { g.fillStyle = col; g.beginPath(); g.arc(p.x + dx * r, p.y + dx * r, r * (dx ? 0.86 : 1), 0, 7); g.arc(p.x + r * 0.8 * sgn + dx * r, p.y + r * 0.2 + dx * r, r * 0.62, 0, 7); g.fill(); }
        }
      }
      // and, once they have all landed, stars going round over Ife's head
      if (s2 >= 3) {
        const c = P([HEAP.ife.at[0] + 0.02, B + HEAP.ife.at[1] + 1.2, HEAP.ife.at[2]]), t = (f - f % 2) * 0.42;
        for (let i = 0; i < 3; i++) {
          const a = t + i * 2.094, x = c.x + Math.cos(a) * c.s * 0.3, y = c.y + Math.sin(a) * c.s * 0.085, r = c.s * (0.075 + 0.02 * Math.sin(a)); if (Math.sin(a) < -0.35) continue;      // behind her head
          g.fillStyle = "#16130c"; star(g, x, y, r * 1.45, a); g.fillStyle = i === 1 ? "#fff3c4" : "#ffd84a"; star(g, x, y, r, a);
        }
      }
    } };
}
function star(g, x, y, r, a) { g.beginPath(); for (let i = 0; i < 10; i++) { const t = a + i * Math.PI / 5, q = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.sin(t) * q, y - Math.cos(t) * q); } g.closePath(); g.fill(); }
// three shots of one clock: (a) the lift arrives, (b) the gate, (c) the heap. Drawings on twos, counted so that a new
// one lands on the crash.
const cut = (name, from, to, o) => ({ name, start: (CUT.ding + from) / FPS, frames: to - from, fps: FPS, sets: ["stairwell"], cast: CAST, frame: (f, sync) => frame(from + f, sync), held: (f) => Math.max(0, f - (f + from + CRASH) % 2), ...o });
export const arrive = cut("desc_ding", 0, CLOSE, { cutOn: "beat", marks: [{ at: DING, what: "the lift arrives: ding", on: "brass" }] });
export const nails = cut("desc_nails", CLOSE, WIDE, { cutOn: "backing_vocals" });
export const heap = cut("desc_heap", WIDE, FRAMES, { cutOn: "guitar", marks: [{ at: CRASH - WIDE, what: "Tane and Juno arrive in a heap: impact frames", on: "brass" }, { at: IFE - WIDE, what: "Ife lands on top", on: "bar" }] });
export default arrive;
