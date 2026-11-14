// The making-of's drawing kit: type, the recreated terminal, tags and their tally, the session's timeline, footage.
// Everything on screen is painted on the stage's 2D backdrop by a chapter's draw(P) (chapters.js); what is on screen when
// is script.js; every word is ledger.json. This file only knows how things look.
//
//   P = { g, F (frame of the making-of), sync, on(id) -> the cue's state while it is on screen (else null), img(url) }
//   P.on(id): { t: frames since it came on, left: frames until it goes, dur, text, item (its ledger entry) }
// A chapter is drawn twice per frame: once on a canvas that draws nothing, to learn which pictures the frame needs
// (the stage loads them: `pictures`, engine/stage.js), then for real. check.mjs uses the first kind to list what is shown.
import CH from "./chapters.json" with { type: "json" };
import ARR from "./arrangement.json" with { type: "json" };
import LEDGER from "./ledger.json" with { type: "json" };
import SESSION from "./session.json" with { type: "json" };
import { PLAIN } from "../../engine/post.js";
export { CH, ARR, LEDGER, SESSION };

export const FPS = 24, W = 1920, H = 1080, SONG = "stories/makingof";
export const DELA = '"Dela Gothic One"', MONO = '"DejaVu Sans Mono", "Liberation Mono", monospace';
export const C = { bg: "#0b0816", panel: "#151028", pale: "#fff3c4", white: "#ffffff", dim: "#8d86a8", faint: "#4a4366", him: "#ffd84a", claude: "#62d6ff", night: "#241a4a", pink: "#ff2a8c", ink: "#16130c" };
export const TAGS = LEDGER.tags, ITEMS = LEDGER.items;

// ---- the music's own frames (chapters.json): nothing below types a frame number -----------------------------------------
export const chap = (n) => CH.chapters[n - 1];
export const bar = (n, i) => Math.round(chap(n).barFrames[i]);                         // the frame of chapter n's bar line i
export const beat = (n, i, k) => Math.round(chap(n).barFrames[i] + k * CH.beat * FPS);  // k beats after it
export const kick = (n, i) => chap(n).kickFrames[i];
export const CUE = CH.cues;
const clip = (id) => ARR.clips.find((c) => c.id === id);
// the film frame that sounds at making-of frame F while arrangement clip `id` plays (the picture of the film to its own music)
export const filmAt = (id, F) => { const c = clip(id); return Math.round(F + (c.source.start - c.out.start) * FPS); };

// ---- pictures ---------------------------------------------------------------------------------------------------------
const pad = (n, w) => String(n).padStart(w, "0");
export const film = (n) => `/out/film/frames/f${pad(Math.max(0, Math.min(3955, n)), 4)}.png`;      // the film's own frames (npm run film)
export const foot = (name, i) => i === undefined ? `/stories/makingof/footage/${name}.webp` : `/stories/makingof/footage/${name}/${pad(i, 3)}.webp`;

// A canvas that draws nothing and measures everything as nothing.
export const nothing = new Proxy(function () {}, { get: (t, k) => k === "measureText" ? () => ({ width: 0 }) : k === Symbol.toPrimitive ? () => 0 : nothing, apply: () => nothing, set: () => true });
const STUB = { width: 16, height: 9, stub: true };

// ---- cues: script.js registers them ---------------------------------------------------------------------------------------
let CUES = [], BY = {};
export function setCues(list) {
  CUES = list.map((c) => { const item = ITEMS[c.id.split("#")[0]]; if (!item) throw new Error(`script.js: no ledger entry "${c.id}"`); return { ...c, item, text: item.text }; });
  BY = Object.fromEntries(CUES.map((c) => [c.id, c]));
  if (Object.keys(BY).length !== CUES.length) throw new Error("script.js: a cue id is used twice");
  return CUES;
}
export const cues = () => CUES, cueOf = (id) => BY[id] ?? (() => { throw new Error(`no cue "${id}"`); })();
// the tally at frame F: how many entries of each tag have come on screen
export function tallyAt(F) { const t = Object.fromEntries(Object.keys(TAGS).map((k) => [k, 0])); for (const c of CUES) if (c.item.tag && c.a <= F) t[c.item.tag]++; return t; }
const lastTagged = (F) => CUES.filter((c) => c.item.tag && c.a <= F).sort((x, y) => y.a - x.a)[0];
// the session's clock at frame F, in minutes from the first message: the `when` of the last entry that came on
const T0 = Date.parse(SESSION.first.replace(" ", "T") + "Z");
export const minutesOf = (when) => Math.max(0, (Date.parse(`2026-${when.replace(" ", "T")}:00Z`) - T0) / 60000);
export function clockAt(F) {
  const seen = CUES.filter((c) => c.item.when && c.a <= F).sort((x, y) => x.a - y.a); if (!seen.length) return { m: 0, when: "11-11 19:26" };
  const now = seen[seen.length - 1], prev = seen.filter((c) => c.a < now.a).pop(), k = prev ? ease(Math.min(1, (F - now.a) / 10)) : 1;
  return { m: (prev ? minutesOf(prev.item.when) * (1 - k) : 0) + minutesOf(now.item.when) * k, when: now.item.when };
}

// ---- small things -------------------------------------------------------------------------------------------------------
export const ease = (x) => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, k) => a + (b - a) * k;
const POP = [1.14, 1.14, 1.04, 1.04];      // how big a thing is on its first frames (on twos), as the film's sound words pop
export const pop = (t) => POP[Math.floor(t)] ?? 1;
export const hhmm = (when) => when.slice(6);

export function wrap(g, text, maxW) {
  const lines = []; let line = "";
  for (const w of text.split(" ")) { const t = line ? line + " " + w : w; if (line && g.measureText(t).width > maxW) { lines.push(line); line = w; } else line = t; }
  if (line) lines.push(line); return lines;
}
const wrapChars = (text, n) => { const lines = []; let line = ""; for (const w of text.split(" ")) { const t = line ? line + " " + w : w; if (line && t.length > n) { lines.push(line); line = w; } else line = t; } if (line) lines.push(line); return lines; };

export function fill(g, color = C.bg) { g.fillStyle = color; g.fillRect(0, 0, W, H); }

// A picture fitted into a box (never enlarged unless `grow`), with an optional frame; returns where it went.
export function picture(g, im, x, y, w, h, o = {}) {
  const k = Math.min(w / im.width, h / im.height, o.grow ? Infinity : 1), dw = im.stub ? w : im.width * k, dh = im.stub ? h : im.height * k, dx = x + (w - dw) * (o.ax ?? 0.5), dy = y + (h - dh) * (o.ay ?? 0.5);
  g.save(); g.globalAlpha *= o.alpha ?? 1; g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
  if (o.frame) { g.fillStyle = o.frame; const b = o.border ?? 6; g.fillRect(Math.round(dx) - b, Math.round(dy) - b, Math.round(dw) + 2 * b, Math.round(dh) + 2 * b); }
  g.drawImage(im, Math.round(dx), Math.round(dy), Math.round(dw), Math.round(dh)); g.restore();
  return { x: dx, y: dy, w: dw, h: dh };
}
export function label(g, text, x, y, o = {}) {      // a small quiet line of mono type
  g.save(); g.font = `${o.bold ? "bold " : ""}${o.size ?? 26}px ${MONO}`; g.textAlign = o.align ?? "left"; g.textBaseline = "alphabetic"; g.fillStyle = o.color ?? C.dim; g.globalAlpha *= o.alpha ?? 1; g.fillText(text, x, y); const w = g.measureText(text).width; g.restore(); return w;
}

// ---- tags -----------------------------------------------------------------------------------------------------------------
// A chip: the tag's name on its colour, then what is credited. Drawn with its top left at (x, y); returns its width.
const chipText = (item, detail) => item.label ? item.label + (item.detail && detail !== false ? "  ·  " + item.detail : "") : "";
export function chipWidth(g, item, s = 28, detail) {
  if (!item.tag) return 0; g.save(); g.font = `bold ${s}px ${MONO}`; let w = g.measureText(TAGS[item.tag].name).width + s * 0.9;
  const text = chipText(item, detail); if (text) { g.font = `${s}px ${MONO}`; w += s * 0.5 + g.measureText(text).width; } g.restore(); return w;
}
export function chip(g, item, x, y, o = {}) {
  if (!item.tag) return 0; const tag = TAGS[item.tag], s = o.size ?? 28, k = pop(o.t ?? 99), total = chipWidth(g, item, s, o.label === false ? false : o.detail), text = o.label === false ? "" : chipText(item, o.detail);
  if (o.align === "center") x -= total / 2;
  g.save(); g.font = `bold ${s}px ${MONO}`; g.textBaseline = "alphabetic"; g.textAlign = "left";
  const w = g.measureText(tag.name).width + s * 0.9, h = s * 1.5;
  g.translate(x, y + h / 2); g.scale(k, k); g.translate(0, -h / 2);
  g.fillStyle = tag.color; g.fillRect(0, 0, w, h); g.fillStyle = C.ink; g.fillText(tag.name, s * 0.45, h * 0.72);
  if (text) { g.font = `${s}px ${MONO}`; g.fillStyle = tag.color; g.fillText(text, w + s * 0.5, h * 0.72); }
  g.restore(); return total;
}

// ---- the terminal ---------------------------------------------------------------------------------------------------------
// Lines of the session, typed. `ids` are the entries of this screen in order; each shows from its cue's first frame and
// stays (dimmed once the next begins). o.reveal[id](t) -> how many characters are typed t frames in (default: all within
// about a second); o.y: top; o.size. Who speaks is a coloured prompt; a tagged line gets its chip beneath.
export function terminal(P, ids, o = {}) {
  const g = P.g, size = o.size ?? 46, lh = Math.round(size * 1.36), x = o.x ?? 96, cols = o.cols ?? Math.floor((W - 192) / (size * 0.6021)); let y = o.y ?? 150;
  const live = ids.map((id) => P.on(id)).filter(Boolean), newest = live[live.length - 1];
  g.save(); g.textBaseline = "alphabetic"; g.textAlign = "left";
  for (const c of live) {
    const who = c.item.who, name = who === "dimitri" ? "dimitri" : "claude", col = who === "dimitri" ? C.him : C.claude, prompt = name + " › ";
    const lines = wrapChars(c.text, cols - prompt.length), total = c.text.length, typed = o.reveal?.[c.id] ? o.reveal[c.id](c.t) : Math.min(total, Math.floor((c.t + 1) * Math.max(2.5, total / 30)));
    const dimmed = c !== newest; g.globalAlpha = dimmed ? 0.42 : 1;
    g.font = `bold ${size}px ${MONO}`; g.fillStyle = col; g.fillText(prompt, x, y + size); const px = g.measureText(prompt).width || prompt.length * size * 0.6;
    g.font = `${size}px ${MONO}`; g.fillStyle = who === "dimitri" ? C.white : "#cfeeff";
    let n = typed, cx = x + px, cy = y + size;
    lines.forEach((line, i) => { const shown = line.slice(0, Math.max(0, n)); n -= line.length + 1; if (shown) { g.fillText(shown, x + px, y + size + i * lh); cx = x + px + (g.measureText(shown).width || 0); cy = y + size + i * lh; } });
    if (!dimmed && (typed < total || Math.floor(c.t / 8) % 2 === 0)) { g.fillStyle = col; g.fillRect(cx + 4, cy - size * 0.82, size * 0.55, size * 1.0); }
    y += lines.length * lh;
    if (c.item.tag) { if (typed >= total) chip(g, c.item, x + px, y + 6, { t: c.t - (c.typedAt ?? 0), size: Math.round(size * 0.7) }); y += Math.round(size * 1.4); }
    y += Math.round(size * 0.35);
  }
  g.restore(); return y;
}

// ---- display type -----------------------------------------------------------------------------------------------------------
// A quote or a caption in the film's display face, centred on (x, y) (or left from x with align: "left"), wrapped to maxW.
// o.reveal(t) -> how many of its lines are on (the lines arrive one by one); o.by: a line under it saying who and when.
export function display(P, c, o = {}) {
  const g = P.g, size = o.size ?? 96, lh = size * (o.leading ?? 1.18), x = o.x ?? W / 2, maxW = o.maxW ?? 1640, quoted = o.quotes ?? (c.item.who === "dimitri" || c.item.who === "claude");
  g.save(); g.font = `${size}px ${DELA}`; g.textBaseline = "alphabetic"; g.textAlign = o.align ?? "center"; g.lineJoin = "round";
  const text = o.text ?? c.text, lines = o.lines ?? (o.split ? text.split(o.split).map((l, i, all) => l + (i < all.length - 1 ? o.split.trimEnd() : "")) : wrap(g, quoted ? `“${text}”` : text, maxW)), n = o.reveal ? o.reveal(c.t) : lines.length, by = o.by === false ? 0 : (c.item.tag || o.by) ? size * 0.2 + 58 : 0;
  const top = (o.y ?? H / 2) - (lines.length * lh + by) / 2, k = o.pop === false ? 1 : pop(c.t);
  g.translate(x, o.y ?? H / 2); g.scale(k, k); g.translate(-x, -(o.y ?? H / 2));
  lines.forEach((line, i) => { if (i >= n) return; const ly = top + (i + 0.82) * lh; if (o.stroke) { g.lineWidth = size * 0.22; g.strokeStyle = o.stroke; g.strokeText(line, x, ly); } g.fillStyle = o.color ?? C.pale; g.fillText(line, x, ly); });
  if (by && n >= lines.length) {
    const yb = top + lines.length * lh + size * 0.2, who = c.item.who === "dimitri" ? "DIMITRI" : c.item.who === "claude" ? "CLAUDE" : "", line = [who, c.item.when ? hhmm(c.item.when) : ""].filter(Boolean).join(" · ");
    g.font = `bold 32px ${MONO}`; const lw = line ? g.measureText(line).width + 30 : 0, tw = chipWidth(g, c.item, 32, false);
    let bx = (o.align ?? "center") === "center" ? x - (lw + tw) / 2 : x;
    if (o.stroke) { g.fillStyle = o.stroke; g.globalAlpha = 0.86; g.fillRect(bx - 16, yb - 8, lw + tw + 32, 64); g.globalAlpha = 1; }
    if (line) { g.font = `bold 32px ${MONO}`; g.textAlign = "left"; g.fillStyle = c.item.who === "claude" ? C.claude : c.item.who === "dimitri" ? C.him : C.dim; g.fillText(line, bx, yb + 34); bx += lw; }
    if (c.item.tag) chip(g, c.item, bx, yb, { t: c.t - (o.tagAt ?? 0), detail: false, size: 32 });
  }
  g.restore();
}

// A chapter card: its number and name, alone.
export function card(P, c, n) {
  const g = P.g; fill(g, C.bg); g.save(); g.textAlign = "center"; g.textBaseline = "alphabetic";
  const k = pop(c.t); g.translate(W / 2, H / 2); g.scale(k, k); g.translate(-W / 2, -H / 2);
  g.font = `bold 40px ${MONO}`; g.fillStyle = C.pink; g.fillText(`CHAPTER ${n}`, W / 2, H / 2 - 90);
  let size = 150; g.font = `${size}px ${DELA}`; const tw = g.measureText(c.text.toUpperCase()).width; if (tw > 1640) { size = Math.floor(size * 1640 / tw); g.font = `${size}px ${DELA}`; }
  g.fillStyle = C.pale; g.fillText(c.text.toUpperCase(), W / 2, H / 2 + 70);
  g.fillStyle = C.pink; g.fillRect(W / 2 - 220, H / 2 + 120, 440, 10); g.restore();
}

// ---- furniture: the tally along the top, the session along the bottom ------------------------------------------------------
export function tallyStrip(P, o = {}) {
  const g = P.g, t = tallyAt(P.F), keys = Object.keys(TAGS), last = lastTagged(P.F), x0 = 96, y = o.y ?? 58;
  g.save(); g.textBaseline = "alphabetic"; g.globalAlpha *= o.alpha ?? 1;
  g.font = `bold 24px ${MONO}`; const widths = keys.map((k) => 22 + g.measureText(TAGS[k].name).width + 12 + 36), gap = (W - 192 - widths.reduce((a, b) => a + b, 0)) / (keys.length - 1); let x = x0;
  keys.forEach((k, i) => {
    const hot = last && last.item.tag === k ? clamp(1 - (P.F - last.a) / 14) : 0;
    g.fillStyle = TAGS[k].color; g.globalAlpha = (o.alpha ?? 1) * (0.75 + 0.25 * hot); g.fillRect(x, y - 19, 12, 22);
    g.font = `bold 24px ${MONO}`; g.textAlign = "left"; g.fillText(TAGS[k].name, x + 22, y); const w = g.measureText(TAGS[k].name).width;
    g.globalAlpha = (o.alpha ?? 1) * (0.8 + 0.2 * hot); g.font = `bold ${Math.round(28 + 12 * hot)}px ${MONO}`; g.fillStyle = hot > 0.2 ? C.white : TAGS[k].color; g.fillText(String(t[k]), x + 22 + w + 12, y + (hot > 0 ? 3 : 1));
    x += widths[i] + gap;
  });
  g.restore();
}
const clockText = (m) => { const d = new Date(T0 + m * 60000 + 500); return `${pad(d.getUTCHours(), 2)}:${pad(d.getUTCMinutes(), 2)}`; };
export function timeline(P, o = {}) {
  const g = P.g, x0 = 96, x1 = W - 96, y = 1030, total = SESSION.minutes.perfect, X = (m) => x0 + (x1 - x0) * clamp(m / total), now = clockAt(P.F);
  g.save(); g.globalAlpha *= o.alpha ?? 1;
  g.fillStyle = C.night; g.fillRect(X(SESSION.minutes.sleep), y - 9, X(SESSION.minutes.wow) - X(SESSION.minutes.sleep), 18);      // the night: he is away
  g.fillStyle = C.faint; g.fillRect(x0, y - 1, x1 - x0, 2);
  g.fillStyle = "#7a72a0"; for (const m of SESSION.commits) g.fillRect(Math.round(X(m)), y - 8, 2, 7);                                // commits
  label(g, "19:26", x0, y + 32, { size: 20, color: C.faint }); label(g, "17:32", x1, y + 32, { size: 20, color: C.faint, align: "right" });
  label(g, "night", (X(SESSION.minutes.sleep) + X(SESSION.minutes.wow)) / 2, y + 32, { size: 20, color: C.faint, align: "center" });
  const x = Math.round(X(now.m)); g.fillStyle = C.pale; g.fillRect(x - 2, y - 14, 4, 28);
  g.font = `bold 26px ${MONO}`; g.textBaseline = "alphabetic"; g.textAlign = x < x0 + 60 ? "left" : x > x1 - 60 ? "right" : "center"; g.fillText(clockText(now.m), x < x0 + 60 ? x0 : x > x1 - 60 ? x1 : x, y - 22);
  g.restore();
}
export const furniture = (P, o) => { tallyStrip(P, o); timeline(P, o); };
export { clockText };

// ---- a chapter as a shot ----------------------------------------------------------------------------------------------------
// chapter(n, draw, { marks }) -> a shot of chapter n's frames. draw(P) paints the frame and may return post parameters
// (engine/post.js) over the making-of's own: PLAIN and a little grain. { plain: true } is the film untouched.
export const LOOK = { ...PLAIN, grain: 0.028, vignette: 0.16 };
export function chapter(n, draw, o = {}) {
  const c = chap(n), a = c.startFrame, frames = c.endFrame - c.startFrame;
  const run = (F, g, sync, pic) => {
    const need = new Set(), shown = new Set();
    const P = { g, F, sync, n, shown, on: (id) => { const q = cueOf(id); if (F < q.a || F >= q.b) return null; shown.add(id); return { ...q, t: F - q.a, left: q.b - F, dur: q.b - q.a }; },
      img: (url) => { need.add(url); return pic ? pic(url) : STUB; } };
    const post = draw(P); return { need, shown, post };
  };
  return { name: `makingof_${String(n).padStart(2, "0")}`, chapter: n, song: SONG, start: a / FPS, frames, fps: FPS, cutOn: n > 1 ? "bar" : undefined, marks: (o.marks ?? []).map((m) => ({ ...m, at: m.at - a })), held: (f) => f, run,
    frame(f, sync) {
      const F = a + f, dry = run(F, nothing, sync, null);
      return { camera: { pos: [0, 1, 5], target: [0, 1, 0], fov: 30 }, pictures: [...dry.need], post: dry.post?.plain ? PLAIN : { ...LOOK, ...dry.post },
        backdrop(g, cam, bodies, pic) { g.save(); run(F, g, sync, pic); g.restore(); } };
    } };
}
