// The breakdown's FACES: twelve close-ups, three of each of the four, all made the same way. One head-and-shoulders
// drawing of each kid in the place their win left them, and four edits of it (the eyes and the mouth only, graded back
// to it: pipeline/match.py), swapped on the music:
//   ife / tane / juno / noor   the quiet beat: pleased with themselves (Ife's small smile and her lenses' glint, Tane's
//                              grin, Juno's laugh, Noor's nothing); the lamps flicker on a note of the strings; they look up
//   v_*                        in the dark, lit by one screen, which says its word of the line: afraid, each in their way
//   m_*                        the same screen draws the map: they look at it (relief: the other three), and are decided
// The place behind each is its set, with a camera that puts the kid's nearest screen beside the face; what the screen
// shows is drawn by the film on the screen's own quad (Ife's is in her drawing: the backpack's CRT).
import { CUT, EV, W, H, PW, PH, PAL, shot, hang, quadIn, quadOf, onQuad, screenAt, screenPaint, screenGlow, ease, clamp, lerp, mix3, wob, rnd, sayMark } from "./brk_cast.js";
import { PLACES } from "./brk_place.js";
import { smokeBank } from "../engine/fx.js";

const C = (who, n, ext = "png") => ({ src: `/kits/${who}/closeup/brk_face_${n}.${ext}`, key: "magenta" });
// the drawings: [quiet, up, fear, see, set], where the face is in them (pixels), where the lenses are (Ife)
export const FACES = {
  ife: { plates: { ife_quiet: C("ife", 1, "jpg"), ife_smile: C("ife", 2), ife_up: C("ife", 3), ife_fear: C("ife", 4), ife_see: C("ife", 5), ife_set: C("ife", 6) }, face: [1040, 745], side: 1, top: true,
    crt: [[1915, 399], [2493, 404], [2489, 874], [1912, 870]], lenses: [[855, 742, 150], [1262, 742, 150]] },
  tane: { plates: { tane_quiet: C("tane", 5, "jpg"), tane_up: C("tane", 6), tane_fear: C("tane", 7), tane_see: C("tane", 8), tane_set: C("tane", 9) }, face: [1375, 610], side: 1 },
  juno: { plates: { juno_quiet: C("juno", 2, "jpg"), juno_up: C("juno", 7), juno_fear: C("juno", 8), juno_see: C("juno", 5), juno_set: C("juno", 9) }, face: [1630, 650], side: -1 },
  noor: { plates: { noor_quiet: C("noor", 1, "jpg"), noor_up: C("noor", 2), noor_fear: C("noor", 3), noor_see: C("noor", 4), noor_set: C("noor", 5) }, face: [1755, 690], side: -1 },
};
// how dark the place is at L (0 lit .. 1 out), for `who`: a flicker on their note, then the lights are gone with the decks
export function darkAt(L, who) {
  const u = L - EV.look[who];
  if (L >= EV.decks[0] + 6 || (who === "noor" && u >= 0)) return who === "noor" && L < EV.decks[0] ? 0.55 + 0.25 * clamp(u / 5) : 1;
  if (u < 0) return 0;
  return [0.7, 0.15, 0.6, 0.6, 0.1, 0.05, 0.75, 0.75, 0.2][u] ?? 0;      // out, back, out, out, back, out: and on again, for now
}
// One close-up. o: { who, looks: [[from frame, drawing]...], at: [fx, fy] where the face is, scale, push, shiver, marks, cutOn }
export const close = (name, o) => {
  const who = o.who, K = FACES[who], P = PLACES[who], pal = PAL[P.pal];
  return shot(name, { plates: K.plates, sets: [P.set], cutOn: o.cutOn, marks: o.marks,
    frame(f, sync) {
      const L = CUT[name] + f, f2 = f - f % 2, D = darkAt(L, who), scr = screenAt(L, who), glow = screenGlow(scr, pal);
      let look = o.looks[0][1]; for (const [from, n] of o.looks) if (f >= from) look = n;
      const since = Math.min(...o.looks.map(([from]) => f >= from ? f - from : 99)), pop = o.looks.length > 1 && since < 3 && f >= 3 ? [5, 2, 0][since] : 0;      // a change of drawing lands with a small jolt
      const scale = o.scale * (1 + (o.push ?? 0.0012) * f), shv = (o.shiver ?? 0) * (rnd(f2, L) - 0.5) * 2;
      const hung = hang(K.face, o.at[0], o.at[1], scale); hung.y = Math.max(hung.y, H + 16 - PH / 2 * scale); if (K.top) hung.y = Math.min(hung.y, PH / 2 * scale - 8);      // the drawing ends at its sheet's edge: that edge stays out of the frame
      hung.x += shv; hung.y -= pop;
      if (o.laugh && look === "quiet") hung.y += [0, -7, -2, -9][(f2 / 2) % 4];      // she is laughing: the drawing bobs, on twos
      const lit = P.light, tint = mix3(lit.tint, [0.3, 0.32, 0.46], D * 0.92), rim = glow ?? mix3(lit.rim, [0.16, 0.18, 0.3], D), rimDir = glow ? [K.side * 9, 2] : lit.rimDir ?? [0, 7];
      const crt = K.crt ? quadOf(hung, K.crt) : null;
      return { set: P.set, camera: P.cam(f, o), options: P.options(L, sync, D),
        cels: [{ plate: `${who}_${look}`, ...hung, layer: { tint: glow ? tint.map((v, i) => v + 0.2 * glow[i]) : tint, rim, rimDir, gradient: 0.16 + 0.3 * D, gradientY: [0, 0.6] } }],
        under(g, cam) {
          P.under?.(g, cam, L, f, D);
          if (P.screen && !(scr.kind === "idle")) { const q = quadIn(cam, P.screen); if (q) { onQuad(g, q, P.screen.px[0], P.screen.px[1], (c, w, h) => screenPaint(scr, pal, c, w, h)); } }
        },
        overlay(g) {
          if (crt) onQuad(g, crt, 400, 300, (c, w, h) => { if (scr.kind === "idle") okOn(c, w, h, pal, f); else screenPaint(scr, pal, c, w, h); c.globalCompositeOperation = "destination-in"; c.fillStyle = "#000"; c.beginPath(); c.roundRect(5, 5, w - 10, h - 10, 26); c.fill(); }, 2);
          if (o.glint != null && K.lenses) glint(g, hung, K.lenses, f - o.glint);
          o.over?.(g, f, hung);
        },
        post: { bgBlur: o.blur ?? 0.012, focus: [o.at[0], 1 - o.at[1]], dark: P.dark * D, bloom: 0.7 + (glow ? 0.25 : 0), wrap: 0.3 * (1 - D), vignette: 0.42 + 0.2 * D, ca: 0.0012, flash: glow && scr.kind === "say" && scr.t === 0 ? 0.06 : D > 0 && D < 1 && L < EV.decks[0] ? 0.004 : 0,      // (a lamp flickering is declared: engine/motion.mjs is not to take it for a fault)
           sat: 1.05 - 0.1 * D, ...P.post?.(D), ...o.post } };
    } });
};
// Ife's CRT before the lights go: it still says OK (as shots/boom_end.js left it)
function okOn(c, w, h, pal, t) {
  c.fillStyle = pal.bg; c.fillRect(0, 0, w, h);
  c.fillStyle = pal.ink; c.font = 'bold 170px "DejaVu Sans Mono", monospace'; c.textAlign = "center"; c.fillText("OK", 200, 176); c.textAlign = "left";
  c.strokeStyle = pal.ink; c.lineWidth = 6; c.strokeRect(26, 26, 348, 248);
  c.fillStyle = "rgba(0,0,0,0.3)"; for (let y = 0; y < 300; y += 8) c.fillRect(0, y, 400, 3);
}
// the glint: her lenses go white, a bar of light crossing them, for a few frames (u: frames since it began)
function glint(g, hung, lenses, u) {
  if (u < 0 || u > 5) return;
  g.save(); g.beginPath(); for (const [x, y, r] of lenses) { const X = hung.x + (x - PW / 2) * hung.scale, Y = hung.y + (y - PH / 2) * hung.scale; g.moveTo(X + r * hung.scale, Y); g.arc(X, Y, r * hung.scale, 0, 7); } g.clip();
  if (u < 2) { g.fillStyle = u ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.6)"; g.fillRect(0, 0, W, H); }
  else { g.fillStyle = "rgba(255,255,255,0.9)"; for (const [x, y, r] of lenses) { const X = hung.x + (x - PW / 2) * hung.scale, Y = hung.y + (y - PH / 2) * hung.scale, s = r * hung.scale, dx = (-1.3 + (u - 2) * 0.85) * s; for (const [o, k] of [[0, 0.34], [0.5, 0.12]]) { g.beginPath(); g.moveTo(X + dx + o * s, Y + s); g.lineTo(X + dx + (o + k) * s, Y + s); g.lineTo(X + dx + (o + k) * s + 0.7 * s, Y - s); g.lineTo(X + dx + o * s + 0.7 * s, Y - s); g.fill(); } } }
  g.restore();
}

const look = (who) => EV.look[who] - CUT[who];
// ---- the quiet beat ----------------------------------------------------------------------------------------------------------
export const ife = close("ife", { who: "ife", at: [0.3, 0.5], scale: 0.92, looks: [[0, "quiet"], [3, "smile"], [look("ife") + 2, "up"]], glint: 5, cutOn: "drums",
  marks: [{ at: look("ife"), what: "Ife's lamps flicker: she looks up", on: "strings" }] });
export const tane = close("tane", { who: "tane", at: [0.4, 0.46], scale: 0.66, looks: [[0, "quiet"], [look("tane") + 2, "up"]], cutOn: "beat",
  marks: [{ at: look("tane"), what: "Tane's lamps flicker: he looks up", on: "strings" }] });
export const juno = close("juno", { who: "juno", at: [0.56, 0.47], scale: 0.7, looks: [[0, "quiet"], [look("juno") + 2, "up"]], cutOn: "beat",
  marks: [{ at: look("juno"), what: "Juno's lamps flicker: she looks up", on: "strings" }],
  laugh: true });
export const noor = close("noor", { who: "noor", at: [0.58, 0.5], scale: 0.7, looks: [[0, "quiet"], [look("noor") + 3, "up"]], cutOn: "beat", push: 0.0006,
  marks: [{ at: look("noor"), what: "the core's light drops: Noor's eyes go up", on: "brass" }] });
// ---- the voice ------------------------------------------------------------------------------------------------------------------
export const v_ife = close("v_ife", { who: "ife", at: [0.36, 0.5], scale: 0.78, looks: [[0, "fear"]], shiver: 2.5, cutOn: "lead_vocals", marks: [sayMark("YOU'RE", "v_ife", "on Ife's CRT: the voice is back"), sayMark("IN", "v_ife", "on Ife's CRT")] });
export const v_tane = close("v_tane", { who: "tane", at: [0.38, 0.47], scale: 0.86, looks: [[0, "fear"]], shiver: 1.5, cutOn: "beat", marks: [{ at: 0, what: "to Tane: his board still says IN", on: "beat" }] });
export const v_juno = close("v_juno", { who: "juno", at: [0.6, 0.46], scale: 0.9, looks: [[0, "fear"]], shiver: 2, cutOn: "lead_vocals", marks: [sayMark("DEEP", "v_juno", "on the tunnel's screen")] });
export const v_noor = close("v_noor", { who: "noor", at: [0.6, 0.5], scale: 0.9, looks: [[0, "up"], [3, "fear"]], cutOn: "lead_vocals", push: 0.002, marks: [sayMark("TROUBLE", "v_noor", "on the console")] });
// ---- the map ----------------------------------------------------------------------------------------------------------------------
export const m_ife = close("m_ife", { who: "ife", at: [0.33, 0.5], scale: 0.76, looks: [[0, "fear"], [3, "see"], [10, "set"]], cutOn: "synth", marks: [{ at: 0, what: "Ife's CRT draws the map", on: "synth" }] });
export const m_tane = close("m_tane", { who: "tane", at: [0.36, 0.47], scale: 0.78, looks: [[0, "see"], [6, "set"]], cutOn: "strings" });
export const m_juno = close("m_juno", { who: "juno", at: [0.62, 0.46], scale: 0.82, looks: [[0, "see"], [6, "set"]], cutOn: "keyboard" });
export const m_noor = close("m_noor", { who: "noor", at: [0.62, 0.5], scale: 0.82, looks: [[0, "see"], [8, "set"]], cutOn: "keyboard" });
