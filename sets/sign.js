// Lettering for the station: katakana stroked by hand (no font needed, so every machine draws the same sign), Latin in
// a monospace face, and the furniture of a sign (frames, chevrons, hazard stripes, scanlines). All invented words.
// Glyphs live in a unit box, y down; a stroke is a polyline.
const G = {
  "ア": [[[.12, .15], [.85, .15], [.72, .36], [.56, .46]], [[.48, .3], [.46, .62], [.28, .92]]],
  "イ": [[[.76, .08], [.5, .36], [.14, .56]], [[.5, .36], [.5, .93]]],
  "ウ": [[[.5, .04], [.5, .22]], [[.18, .44], [.18, .22], [.82, .22], [.78, .55], [.6, .8], [.34, .94]]],
  "エ": [[[.2, .2], [.8, .2]], [[.5, .2], [.5, .82]], [[.1, .82], [.9, .82]]],
  "オ": [[[.12, .3], [.88, .3]], [[.6, .08], [.6, .92], [.48, .86]], [[.6, .3], [.14, .8]]],
  "カ": [[[.12, .3], [.82, .3], [.78, .76], [.66, .92], [.54, .85]], [[.45, .08], [.42, .5], [.15, .92]]],
  "キ": [[[.15, .32], [.85, .22]], [[.12, .6], [.88, .5]], [[.42, .05], [.58, .95]]],
  "ク": [[[.4, .08], [.3, .3], [.12, .5]], [[.38, .2], [.8, .2], [.7, .55], [.5, .8], [.25, .94]]],
  "ケ": [[[.38, .08], [.3, .3], [.12, .5]], [[.3, .3], [.9, .3]], [[.62, .3], [.58, .65], [.4, .92]]],
  "コ": [[[.15, .2], [.82, .2], [.82, .82], [.15, .82]]],
  "サ": [[[.1, .32], [.9, .32]], [[.3, .1], [.3, .58]], [[.68, .1], [.68, .55], [.58, .78], [.38, .94]]],
  "シ": [[[.15, .15], [.35, .25]], [[.1, .42], [.3, .52]], [[.15, .9], [.55, .78], [.88, .35]]],
  "ス": [[[.15, .15], [.78, .15], [.6, .5], [.15, .92]], [[.55, .58], [.88, .9]]],
  "セ": [[[.1, .42], [.85, .3], [.72, .52]], [[.38, .1], [.38, .8], [.85, .82]]],
  "ソ": [[[.15, .15], [.3, .4]], [[.82, .12], [.72, .55], [.3, .94]]],
  "タ": [[[.4, .08], [.3, .3], [.12, .5]], [[.38, .2], [.8, .2], [.7, .55], [.5, .8], [.25, .94]], [[.36, .42], [.64, .58]]],
  "ツ": [[[.12, .2], [.22, .42]], [[.42, .15], [.5, .38]], [[.85, .15], [.75, .6], [.3, .94]]],
  "テ": [[[.25, .12], [.75, .12]], [[.1, .36], [.9, .36]], [[.52, .36], [.48, .7], [.28, .94]]],
  "ト": [[[.35, .08], [.35, .92]], [[.35, .38], [.78, .6]]],
  "ナ": [[[.1, .35], [.9, .35]], [[.52, .08], [.5, .6], [.3, .94]]],
  "ニ": [[[.22, .25], [.78, .25]], [[.1, .8], [.9, .8]]],
  "ネ": [[[.5, .04], [.5, .18]], [[.18, .26], [.78, .26], [.15, .7]], [[.5, .5], [.5, .95]], [[.58, .52], [.88, .7]]],
  "ノ": [[[.8, .1], [.65, .55], [.2, .92]]],
  "ハ": [[[.35, .25], [.12, .85]], [[.62, .22], [.9, .85]]],
  "ヒ": [[[.2, .1], [.2, .82], [.85, .82]], [[.2, .42], [.78, .3]]],
  "フ": [[[.12, .22], [.78, .22], [.7, .52], [.5, .76], [.25, .92]]],
  "ホ": [[[.1, .3], [.9, .3]], [[.5, .08], [.5, .92], [.4, .85]], [[.28, .52], [.12, .82]], [[.72, .52], [.9, .82]]],
  "マ": [[[.1, .18], [.88, .18], [.5, .62]], [[.35, .5], [.62, .85]]],
  "ミ": [[[.25, .15], [.75, .25]], [[.25, .45], [.72, .55]], [[.2, .75], [.8, .9]]],
  "メ": [[[.78, .1], [.6, .55], [.18, .92]], [[.28, .32], [.78, .75]]],
  "ヤ": [[[.1, .38], [.88, .28], [.68, .55]], [[.35, .08], [.55, .94]]],
  "ラ": [[[.25, .12], [.75, .12]], [[.15, .38], [.85, .38], [.78, .62], [.6, .8], [.35, .92]]],
  "リ": [[[.25, .12], [.25, .6]], [[.75, .1], [.75, .6], [.62, .82], [.4, .94]]],
  "ル": [[[.32, .12], [.32, .55], [.26, .75], [.1, .92]], [[.6, .08], [.6, .88], [.76, .8], [.93, .55]]],
  "レ": [[[.22, .1], [.22, .9], [.6, .75], [.88, .4]]],
  "ロ": [[[.15, .2], [.85, .2], [.85, .82], [.15, .82], [.15, .2]]],
  "ン": [[[.15, .2], [.36, .34]], [[.12, .88], [.5, .78], [.88, .3]]],
  "ー": [[[.1, .5], [.9, .5]]],
  "チ": [[[.7, .08], [.25, .22]], [[.1, .42], [.9, .42]], [[.52, .2], [.5, .62], [.3, .94]]],
  "ヘ": [[[.1, .6], [.38, .3], [.9, .75]]],
  "ム": [[[.45, .1], [.2, .78], [.82, .7]], [[.68, .5], [.86, .9]]],
  "モ": [[[.2, .18], [.8, .18]], [[.1, .48], [.9, .48]], [[.45, .18], [.45, .82], [.85, .82]]],
  "ユ": [[[.2, .25], [.68, .25], [.62, .8]], [[.08, .8], [.92, .8]]],
  "ヨ": [[[.2, .15], [.8, .15], [.8, .85], [.2, .85]], [[.25, .5], [.8, .5]]],
  "ワ": [[[.18, .45], [.18, .18], [.82, .18], [.76, .55], [.58, .8], [.35, .94]]],
  "ヌ": [[[.18, .15], [.8, .15], [.62, .55], [.2, .92]], [[.32, .42], [.78, .82]]],
};
// The voicing marks are drawn finer than the letter (MARK of its stroke) and set well apart, so that at the sizes a sign
// is seen from across a set the two ticks of a dakuten are still two ticks and the ring of a handakuten is still a ring
// with a hole in it: ブ and プ must never be taken for each other.
const MARK = 0.62, mark = (l) => l.map((s) => Object.assign(s, { mark: true }));
const DAKU = mark([[[.73, -.02], [.81, .13]], [[.92, -.05], [1.0, .1]]]);
const VOICED = { "ガ": "カ", "ギ": "キ", "グ": "ク", "ゲ": "ケ", "ゴ": "コ", "ザ": "サ", "ジ": "シ", "ズ": "ス", "ゼ": "セ", "ダ": "タ", "デ": "テ", "ド": "ト", "バ": "ハ", "ビ": "ヒ", "ブ": "フ", "ボ": "ホ" };
const RING = mark([Array.from({ length: 13 }, (_, i) => [.9 + .115 * Math.cos(i * Math.PI / 6), .06 + .115 * Math.sin(i * Math.PI / 6)])]);
const HALF = { "パ": "ハ", "ピ": "ヒ", "プ": "フ", "ポ": "ホ" };
const SMALL = { "ッ": "ツ", "ャ": "ヤ", "ュ": "ユ", "ョ": "ヨ", "ァ": "ア", "ィ": "イ", "ェ": "エ", "ォ": "オ" };
const BAR_DOWN = [[[.5, .1], [.5, .9]]];      // the long-vowel mark in a column: it runs the way the writing runs
function strokes(ch, vertical) {
  if (vertical && ch === "ー") return BAR_DOWN;
  if (vertical && SMALL[ch]) return G[SMALL[ch]].map((s) => s.map(([x, y]) => [0.36 + x * 0.62, 0.02 + y * 0.62]));      // in a column a small letter sits high and to the right
  if (G[ch]) return G[ch];
  if (VOICED[ch]) return [...G[VOICED[ch]], ...DAKU];
  if (HALF[ch]) return [...G[HALF[ch]], ...RING];
  if (SMALL[ch]) return G[SMALL[ch]].map((s) => s.map(([x, y]) => [0.2 + x * 0.62, 0.36 + y * 0.62]));
  if (ch === " " || ch === "　") return [];
  throw new Error(`sign: no glyph for "${ch}"`);
}
// Katakana along a line (or down a column with o.vertical). size = the glyph box in pixels, lw = stroke width.
export function kana(ctx, str, x, y, size, lw, color, o = {}) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = o.cap ?? "square"; ctx.lineJoin = "miter";
  [...str].forEach((ch, i) => {
    const ox = o.vertical ? x : x + i * size * (o.pitch ?? 1.08), oy = o.vertical ? y + i * size * (o.pitch ?? 1.08) : y;
    for (const st of strokes(ch, o.vertical)) { ctx.lineWidth = st.mark ? lw * (o.marks ?? MARK) : lw; ctx.beginPath(); st.forEach((p, j) => { const px = ox + p[0] * size, py = oy + p[1] * size; j ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.stroke(); }
  });
  ctx.restore();
}
export const kanaWidth = (str, size, pitch = 1.08) => ([...str].length - 1) * size * pitch + size;
export const FONT = (px, bold = true) => `${bold ? "bold " : ""}${px}px "DejaVu Sans Mono", monospace`;
export function latin(ctx, str, x, y, px, color, o = {}) { ctx.save(); ctx.fillStyle = color; ctx.font = FONT(px, o.bold ?? true); ctx.textBaseline = o.baseline ?? "alphabetic"; ctx.textAlign = o.align ?? "left"; ctx.fillText(str, x, y); ctx.restore(); }
export function scanlines(ctx, w, h, a = 0.42, pitch = 6) { ctx.fillStyle = `rgba(0,0,0,${a})`; for (let y = 0; y < h; y += pitch) ctx.fillRect(0, y, w, pitch / 2); }
export function hazard(ctx, x, y, w, h, a = "#ffc21e", b = "#15162c", pitch = 48) {
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); ctx.fillStyle = a; ctx.fillRect(x, y, w, h); ctx.fillStyle = b;
  for (let k = -h; k < w + h; k += pitch) { ctx.beginPath(); ctx.moveTo(x + k, y + h); ctx.lineTo(x + k + pitch / 2, y + h); ctx.lineTo(x + k + pitch / 2 + h, y); ctx.lineTo(x + k + h, y); ctx.fill(); }
  ctx.restore();
}
export function chevrons(ctx, x, y, w, h, n, lw, color, dir = 1) {
  ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineJoin = "miter";
  for (let i = 0; i < n; i++) { const cx = x + (i + 0.5) * w / n; ctx.beginPath(); ctx.moveTo(cx - dir * w / n * 0.28, y); ctx.lineTo(cx + dir * w / n * 0.28, y + h / 2); ctx.lineTo(cx - dir * w / n * 0.28, y + h); ctx.stroke(); }
  ctx.restore();
}
