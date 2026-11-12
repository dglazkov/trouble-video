// Sound words: the film's drawn sound effects (チーン, カチッ, ガシャン ...), every one lettered here, the same way.
// A word is bold katakana in the station's own stroked hand (sets/sign.js), a dark outline round a flat colour, set at
// an angle; it pops on oversized ON the frame of the action it is the sound of, settles in two drawings, and is gone
// within about ten frames. A shot draws it on its overlay (over the characters, under the lens and the grain):
//
//   overlay(g) { sfx(g, { text: "ガシャン", x: 1400, y: 260, size: 120, color: "station", age: f - HIT }); }
//
//   text     katakana the hand has (sets/sign.js); anything else (hiragana, an ellipsis: speech) wants face: "type"
//   x, y     pixels: the word's middle (anchor "centre", the default) or its top left corner (anchor "corner")
//   size     the glyph box in pixels, once settled;  angle  radians (default -0.15: climbing to the right)
//   color    whose sound it is: a name in COLORS, or [fill, outline]
//   age      frames since the action (the word shows for 0 <= age < life; life defaults to 10)
//   pop      the size, as a multiple, on each of its first frames (default POP: half as big again, on twos)
//   shake    pixels it is jarred by on its first four frames (default 0), `seed` choosing the way
//   burst    short ticks thrown out round it for its first six frames: true (default), false, or { color, until, k }
//   gloss    a small Latin word beside it, for the one that is speech: "oops" or { text, size, below, dx, dy, color }
//   face     "hand" (default: stroked katakana) or "type" (fonts/DelaGothicOne-Regular.ttf, which the stage loads)
// Everything is a pure function of what it is given. `sfxMark` is the same word as a mark (engine/marks.mjs), so the
// frame a word is drawn from and the frame held to the music are one number.
import { kana } from "../sets/sign.js";

export const INK = "#16130c", PALE = "#fff3c4";
// whose sound it is: [fill, outline]. The station and its machines speak in yellow (or red, when they mean harm).
export const COLORS = {
  station: ["#ffd84a", INK], alarm: ["#ff3a30", "#1c0406"],
  tane: ["#ff4a3a", "#1c0406"], ife: ["#8dff72", "#06200e"], noor: ["#ffffff", "#3c1c7a"], juno: ["#ff8e26", "#053036"],
};
export const POP = [1.45, 1.45, 1.08, 1.08];
const TYPE = '"Dela Gothic One"', RINGED = { "パ": "ハ", "ピ": "ヒ", "プ": "フ", "ポ": "ホ" };
const rnd = (...n) => { let h = 2166136261; for (const x of n) { h ^= Math.round(x * 1000) | 0; h = Math.imul(h, 16777619); h ^= h >>> 13; } return ((Math.imul(h, 2246822519) ^ (h >>> 15)) >>> 0) / 4294967296; };

// Short straight ticks round (x, y): tick i lies along angle(i) from r0(i) to r1(i) pixels, the ring squashed by sx, sy.
export function rays(g, x, y, o) {
  g.save(); g.strokeStyle = o.color ?? PALE; g.lineWidth = o.width ?? 6; g.lineCap = "butt"; g.beginPath();
  for (let i = 0; i < (o.n ?? 9); i++) { const a = o.angle(i), r0 = o.r0(i), r1 = o.r1(i), sx = o.sx ?? 1, sy = o.sy ?? 1; g.moveTo(x + Math.cos(a) * r0 * sx, y + Math.sin(a) * r0 * sy); g.lineTo(x + Math.cos(a) * r1 * sx, y + Math.sin(a) * r1 * sy); }
  g.stroke(); g.restore();
}

export function sfx(g, o) {
  const age = o.age, life = o.life ?? 10; if (!(age >= 0 && age < life)) return;
  const [fill, ink] = Array.isArray(o.color) ? o.color : COLORS[o.color ?? "station"], n = [...o.text].length, s = o.size * ((o.pop ?? POP)[age] ?? 1);
  const jar = o.shake && age < 4 ? o.shake * (1 - age / 4) : 0, x = o.x + (jar ? (rnd(o.seed ?? 0, age, 1) - 0.5) * 2 * jar : 0), y = o.y + (jar ? (rnd(o.seed ?? 0, age, 2) - 0.5) * 2 * jar : 0);
  const burst = o.burst === undefined || o.burst === true ? {} : o.burst;
  if (burst && age < (burst.until ?? 6)) {      // on twos, a little further out each drawing
    const k = (burst.k ?? 1) * o.size / 104, a2 = age - age % 2, r0 = (i) => (190 + 12 * a2 + 20 * (i % 2)) * k;
    rays(g, o.x, o.y, { color: burst.color ?? PALE, width: Math.max(3, 6 * k), angle: (i) => -0.5 + i * 0.72, r0, r1: (i) => r0(i) + (46 + 10 * (i % 3)) * k, sx: 1.1 * Math.max(1, n / 3), sy: 0.62 });
  }
  g.save(); g.translate(x, y); g.rotate(o.angle ?? -0.15);
  let w = n * s;
  if (o.face === "type") {
    g.font = `${s}px ${TYPE}`; g.textBaseline = "alphabetic"; g.textAlign = "left"; g.lineJoin = "round"; w = g.measureText(o.text).width;
    if (o.anchor !== "corner") g.translate(-w / 2, -s / 2);
    g.lineWidth = s * 0.2; g.strokeStyle = ink; g.strokeText(o.text, 0, s * 0.86); g.fillStyle = fill; g.fillText(o.text, 0, s * 0.86);
  } else {
    if (o.anchor !== "corner") g.translate(-w / 2, -s / 2);
    // the outline of the whole word, then its colour. A handakuten (ピ) is this module's own: at this weight the sign
    // hand's little ring fills in and reads as a dot, so it is drawn larger, with its hole kept open
    const base = [...o.text].map((ch) => RINGED[ch] ?? ch).join(""), rings = [...o.text].flatMap((ch, i) => RINGED[ch] ? [[(i + 0.93) * s, 0.06 * s]] : []), disc = (r, col) => { g.fillStyle = col; for (const [cx, cy] of rings) { g.beginPath(); g.arc(cx, cy, r * s, 0, 7); g.fill(); } };
    kana(g, base, 0, 0, s, s * 0.3, ink, { pitch: 1.0, marks: 0.84 }); disc(0.27, ink); kana(g, base, 0, 0, s, s * 0.15, fill, { pitch: 1.0, marks: 0.68 }); disc(0.2, fill); disc(0.085, ink);
  }
  if (o.gloss) {
    const q = typeof o.gloss === "string" ? { text: o.gloss } : o.gloss, px = q.size ?? s * 0.5;
    g.font = `${px}px ${TYPE}`; g.textBaseline = "alphabetic"; g.textAlign = "left"; g.lineJoin = "round"; g.lineWidth = px * 0.24; g.strokeStyle = ink; g.fillStyle = q.color ?? PALE;
    const gx = (q.below ? (w - g.measureText(q.text).width) / 2 : w + s * 0.3) + (q.dx ?? 0), gy = s * 0.86 + (q.below ? px * 1.2 : 0) + (q.dy ?? 0); g.strokeText(q.text, gx, gy); g.fillText(q.text, gx, gy);
  }
  g.restore();
}
// The word as a mark: the frame it pops on, held to `on` (a stem's onsets, "beat" or "bar").
export const sfxMark = (at, text, what, on) => ({ at, what: `${text}: ${what}`, on });
