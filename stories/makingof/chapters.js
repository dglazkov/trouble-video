// The making-of, chapter by chapter: each chapter is a shot (lib.js `chapter`) whose draw(P) paints one frame from the
// cues of script.js. Layouts are in 1920x1080 pixels. The film's own passages are its frames from out/film/frames/
// (npm run film), laid in untouched; everything else is the pack in stories/makingof/footage/ (prepare.py).
import STEMS from "../../analysis/stems.json" with { type: "json" };
import LISTEN from "../../analysis/listen.json" with { type: "json" };
import { chapter, chap, bar as B, beat, CUE, SESSION, TAGS, ITEMS, C, W, H, DELA, MONO, film, foot, filmAt, fill, picture, label, chip, chipWidth, terminal, display, card, furniture, tallyAt, clockText,
  ease, clamp, lerp, pop, hhmm, cueOf } from "./lib.js";
import { CUES, MARKS } from "./script.js";

const marksOf = (n) => MARKS.filter((m) => m.at >= chap(n).startFrame && m.at < chap(n).endFrame);
const flashAt = (F, at, k = 0.7) => F - at >= 0 && F - at < 3 ? { flash: k * [1, 0.5, 0.2][F - at] } : {};
const framed = (g, r, color, b = 6) => { g.fillStyle = color; g.fillRect(r.x - b, r.y - b, r.w + 2 * b, b); g.fillRect(r.x - b, r.y + r.h, r.w + 2 * b, b); g.fillRect(r.x - b, r.y, b, r.h); g.fillRect(r.x + r.w, r.y, b, r.h); };
const tagAt = (g, text, x, y, color, o = {}) => {      // a small filled label on a picture
  g.save(); g.font = `bold ${o.size ?? 24}px ${MONO}`; g.textBaseline = "alphabetic"; g.textAlign = "left"; const w = g.measureText(text).width + 24, h = (o.size ?? 24) * 1.6, k = pop(o.t ?? 99);
  g.translate(x, y + h / 2); g.scale(k, k); g.translate(0, -h / 2); g.fillStyle = color; g.fillRect(0, 0, w, h); g.fillStyle = C.ink; g.fillText(text, 12, h * 0.72); g.restore(); return w;
};

// ---- 1 Cold open: the finished film at its first drop, to its own bars; a hard cut to black -----------------------------
export const ch1 = chapter(1, (P) => {
  if (P.F < CUE.coldOpen.firstKick.frame || P.F >= CUE.coldOpen.hardCut.frame) fill(P.g, "#000"); else P.g.drawImage(P.img(film(filmAt("cold_open", P.F))), 0, 0);
  return { plain: true };
}, { marks: [{ at: CUE.coldOpen.firstKick.frame, what: "the film's first drop: its impact frame", on: "kick" }] });

// ---- 2 The prompt ----------------------------------------------------------------------------------------------------------
const FIRST = ["Let's make", " a music video", " for a track", " that I made", " in suno…"];
export const ch2 = chapter(2, (P) => {
  const g = P.g; fill(g); let c;
  if ((c = P.on("card2"))) return card(P, c, 2);
  if (P.F < B(2, 0)) return fill(g, "#000");
  if ((c = P.on("p_date"))) label(g, c.text, 96, 150, { size: 30, color: C.dim, alpha: ease(c.t / 8) });
  const words = CUE.prompt.words.map((w) => w.frame - words0());
  terminal(P, ["p_first", "p_anime", "p_claim", "p_push"], { y: 215, reveal: { p_first: (t) => FIRST.reduce((n, s, i) => n + Math.round(s.length * clamp((t - words[i] + 1) / 4)), 0) } });
  if (P.F >= cueOf("p_date").a) furniture(P, { alpha: ease((P.F - cueOf("p_date").a) / 12) });
}, { marks: [...marksOf(2), ...CUE.prompt.words.slice(1).map((w, i) => ({ at: w.frame, what: `the first message types on “${w.word}”`, on: "lyric", word: w.word }))] });
function words0() { return CUE.prompt.words[0].frame; }

// ---- 3 The tools -----------------------------------------------------------------------------------------------------------
export const ch3 = chapter(3, (P) => {
  const g = P.g, F = P.F; fill(g); let c;
  if ((c = P.on("card3"))) return card(P, c, 3);
  if (F < B(3, 4)) terminal(P, ["t_noblender", "t_headless"], { y: 330 });
  else if (F < B(3, 12)) {
    const i = (F - B(3, 4)) % 72, y = 112;
    [["web", 24, "t_lab_web", "t_speed_web"], ["blender", 968, "t_lab_blender", "t_speed_blender"]].forEach(([name, x, lab, speed]) => {
      picture(g, P.img(foot("bake/" + name, i)), x, y, 928, 522);
      if ((c = P.on(lab))) tagAt(g, c.text, x + 16, y + 16, C.pale);
      if ((c = P.on(speed))) { g.save(); g.font = `64px ${DELA}`; g.textAlign = "center"; g.fillStyle = C.pale; const k = pop(c.t); g.translate(x + 464, y + 522 + 78); g.scale(k, k); g.fillText(c.text, 0, 0); g.restore(); }
    });
    if ((c = P.on("t_speed_note"))) label(g, c.text, W / 2, y + 522 + 126, { align: "center", size: 24 });
    if ((c = P.on("t_bakeoff"))) display(P, c, { y: 810, size: 52 });
    if (P.on("t_vision")) terminal(P, ["t_vision"], { y: 700 });
    if ((c = P.on("t_verdict"))) display(P, c, { y: 880, size: 52 });
  } else if (F < B(3, 14)) terminal(P, ["t_unique"], { y: 420 });
  else if ((c = P.on("t_answer"))) display(P, c, { y: 500, size: 108, lines: c.text.split("… ").map((s) => `“${s.replace("…", "")}”`), by: true });
  furniture(P);
}, { marks: marksOf(3) });

// ---- 4 The first face ------------------------------------------------------------------------------------------------------
const FACES = ["face", "blink", "shout", "shock", "grin"];
export const ch4 = chapter(4, (P) => {
  const g = P.g, F = P.F; fill(g); let c;
  if ((c = P.on("card4"))) return card(P, c, 4);
  if (F < B(4, 1)) return;
  if (F < B(4, 4)) {
    const t = F - B(4, 3), k = t < 0 ? 0 : ease(t / 7);      // the first generated drawing wipes the two mascots off
    if (k < 1) { g.save(); g.translate(k * W, 0); picture(g, P.img(foot("bake/web", 34)), 180, 180, 760, 428); picture(g, P.img(foot("bake/blender", 20)), 980, 180, 760, 428); g.restore(); }
    if (t >= 0) {
      const steps = [0, 1, 2, 3].map((b) => beat(4, 3, b) - B(4, 3)).concat([beat(4, 3, 3) + 5 - B(4, 3)]), n = steps.filter((s) => s <= t).length - 1;
      g.save(); g.beginPath(); g.rect(0, 0, k * W, H); g.clip(); g.fillStyle = "#fff"; g.fillRect(0, 88, W, 656); picture(g, P.img(foot("face/" + FACES[n])), 640, 96, 640, 640); g.restore();
      if (k < 1) { g.fillStyle = C.pink; g.fillRect(k * W - 14, 88, 14, 656); }
      if ((c = P.on("f_face"))) tagAt(g, c.text, 96, 112, C.pale, { t: c.t });
    }
    terminal(P, ["f_trace"], { y: 790 });
  } else if (F < B(4, 5)) {
    const r = picture(g, P.img(foot("face/closeup", 16 + (F - B(4, 4)))), 320, 100, 1280, 720);
    if ((c = P.on("f_closeup"))) tagAt(g, c.text, r.x + 16, r.y + 16, C.pale, { t: c.t });
  } else if (F < B(4, 7)) { picture(g, P.img(foot("pose/guides")), 360, 96, 1200, 600); terminal(P, ["f_body"], { y: 740 }); }
  else if ((c = P.on("f_oops"))) { picture(g, P.img(foot("shots/1")), 200, 110, 760, 800, { frame: TAGS.rejected.color }); display(P, c, { x: 1380, y: 500, size: 88, maxW: 760 }); }
  furniture(P);
}, { marks: marksOf(4) });
function fill2(g, x, y, w, h) { g.fillStyle = C.bg; g.fillRect(x, y, w, h); }

// ---- 5 The pivot -------------------------------------------------------------------------------------------------------------
const HOOK = CUE.pivot.hookWords, HOLE0 = B(5, 4), HIT = CUE.pivot.restartHit.frame, RESTART = HIT;
function seams(P, k, alpha = 1) {      // the puppet's frame, from a third of its size (as it was judged) to 1:1, its feet held on screen
  const g = P.g, s = lerp(1 / 3, 1, k), im = P.img(foot("parts/front", 0));
  g.save(); g.globalAlpha = alpha; g.imageSmoothingQuality = "high"; g.drawImage(im, Math.round(lerp(640, 0, k)), Math.round(lerp(250, 0, k)), Math.round(1920 * s), Math.round(1080 * s)); g.restore();
  if (alpha === 1) { g.fillStyle = C.bg; g.globalAlpha = k; g.fillRect(0, 0, W, 84); g.fillRect(0, 984, W, 96); g.globalAlpha = 1; }      // the furniture's bands
}
export const ch5 = chapter(5, (P) => {
  const g = P.g, F = P.F; fill(g); let c;
  if ((c = P.on("card5"))) return card(P, c, 5);
  if (F < B(5, 1)) return;
  if (F < B(5, 3)) {
    const r = picture(g, P.img(foot("parts/turn", Math.min(79, F - B(5, 1)))), 640, 250, 640, 360, { frame: C.faint, border: 3 });
    if ((c = P.on("v_kit"))) label(g, c.text, W / 2, r.y - 26, { align: "center", size: 26 });
    terminal(P, ["v_holds"], { y: 720 });
  } else if (F < HOLE0) {
    const t = F - B(5, 3); seams(P, ease(t / 12));
    if (t >= 14) { g.save(); g.strokeStyle = TAGS.rejected.color; g.lineWidth = 8; g.beginPath(); g.ellipse(960, 868, 190, 92, -0.05, 0, Math.PI * 2 * clamp((t - 14) / 6)); g.stroke(); g.restore(); }
    if ((c = P.on("v_seams"))) display(P, c, { x: 1470, y: 430, size: 76, maxW: 760, stroke: C.bg });
  } else if (F < RESTART) {
    seams(P, 1, 0.16);
    if ((c = P.on("v_horror"))) display(P, c, { y: 520, size: 88, lines: ["“A doll that looks human-like,", "but is actually", "a body horror of misalignments”"], reveal: (t) => 1 + (F >= HOOK[2].frame) + (F >= HOOK[3].frame), by: true, pop: false, color: C.white });
    return;      // alone: no furniture in the hole
  } else if (F < HIT) return fill(g, "#000");
  else if (F < B(5, 10)) {
    // the layout sheet's eight mannequins, each in its cell; then, cell by cell, the drawing that was painted over it
    // (take B of the first test, in register: footage/whole, prepare.py) wipes down over its mannequin
    for (let n = 0; n < 8; n++) {
      const x = 276 + (n % 4) * 346, y = 96 + Math.floor(n / 4) * 346, k = clamp((F - (B(5, 8) + n * 7)) / 10);
      g.drawImage(P.img(foot("whole/m" + n)), x, y, 330, 330);
      if (k > 0) { g.save(); g.beginPath(); g.rect(x, y, 330, Math.round(330 * k)); g.clip(); g.drawImage(P.img(foot("whole/d" + n)), x, y, 330, 330); g.restore(); if (k < 1) { g.fillStyle = C.pale; g.fillRect(x, y + Math.round(330 * k) - 4, 330, 4); } }
    }
    if (F < B(5, 8)) terminal(P, ["v_unit"], { y: 830 });
    if ((c = P.on("v_whole"))) display(P, c, { y: 890, size: 42 });
  } else {
    picture(g, P.img(foot("whole/run", (F - B(5, 10)) % 96)), 320, 96, 1280, 720);
    if ((c = P.on("v_better"))) display(P, c, { y: 905, size: 80 });
  }
  furniture(P);
  return flashAt(F, HIT, 0.8);
}, { marks: [...marksOf(5), { at: HOOK[2].frame, what: "“but is actually” comes on with the hook's “deep”", on: "lyric", word: HOOK[2].word }, { at: HOOK[3].frame, what: "“a body horror of misalignments” on the hook's “trouble”", on: "lyric", word: HOOK[3].word }] });

// ---- 6 The cast --------------------------------------------------------------------------------------------------------------
const KIDS = [["tane", "#ff5a4a"], ["ife", "#8dff72"], ["noor", "#c9a6ff"], ["juno", "#ff9a3c"]], BECAME = { c_mystery: 182, c_machines: 730, c_fall: 3690 };
export const ch6 = chapter(6, (P) => {
  const g = P.g, F = P.F; fill(g); let c;
  if ((c = P.on("card6"))) return card(P, c, 6);
  if (F < B(6, 1)) return;
  const grid = (v) => KIDS.forEach(([n], i) => { g.fillStyle = v === "v1" ? "#f414f4" : "#fff"; g.fillRect(88 + i * 442, 104, 418, 560); picture(g, P.img(foot(`cast/${n}_${v}`)), 88 + i * 442, 104, 418, 560); });
  if (F < B(6, 5)) { picture(g, P.img(foot("cast/lineup")), 422, 96, 1075, 560); terminal(P, ["c_brief", "c_split"], { y: 690, size: 42 }); }
  else if ((c = P.on("c_v1"))) { grid("v1"); display(P, c, { y: 800, size: 64, color: TAGS.rejected.color }); }
  else if ((c = P.on("c_names"))) {
    grid("v2");
    KIDS.forEach(([n, col], i) => { const q = P.on("c_n_" + n); if (q) label(g, q.text, 88 + i * 442 + 209, 706, { align: "center", size: 26, bold: true, color: col }); });
    display(P, c, { y: 850, size: 42 });
  } else if (F < B(6, 11) && F >= cueOf("c_fatter").a) {
    const picked = P.on("c_pick"), his = P.on("c_pick_his"), cl = P.on("c_pick_claude");
    if (!picked) { g.fillStyle = "#fff"; g.fillRect(751, 104, 418, 560); picture(g, P.img(foot("cast/tane_v2")), 751, 104, 418, 560); }
    else [["v3b", 462, his, C.him], ["v3a", 1010, cl, C.claude]].forEach(([v, x, q, col]) => { g.fillStyle = "#fff"; g.fillRect(x, 96, 448, 600); const r = picture(g, P.img(foot("cast/tane_" + v)), x, 96, 448, 600); if (v === "v3b") framed(g, { x, y: 96, w: 448, h: 600 }, C.him, 8); if (q) tagAt(g, q.text, x + 14, 110, col, { t: q.t }); });
    terminal(P, ["c_fatter", "c_pick"], { y: 730 });
  } else if (F < B(6, 16)) {
    const id = ["c_fall", "c_machines", "c_mystery"].find((k) => P.on(k)), q = cueOf(id), r = picture(g, P.img(film(BECAME[id] + (F - q.a))), 480, 96, 960, 540, { grow: true, frame: C.faint, border: 3 });
    if ((c = P.on("c_became"))) tagAt(g, c.text, r.x + 14, r.y + 14, C.pale);
    terminal(P, [id], { y: 700 });
  } else if (F < B(6, 19)) terminal(P, ["c_tripwire", "c_slice"], { y: 380 });
  else terminal(P, ["c_sleep"], { y: 400 });
  furniture(P);
}, { marks: marksOf(6) });

// ---- 7 "Wow" -------------------------------------------------------------------------------------------------------------------
const DROP = CUE.wow.drop.frame, K7 = chap(7).kickFrames, CUTBLACK = DROP + (1486 - 1237);      // the slice's own cut to black (shots/slice.js: film frame 1486)
function night(P, x0, y0, w, h, t) {      // the night as it was: agents' spans, then nothing, until he is back
  const g = P.g, M = SESSION.minutes, m0 = M.sleep - 20, m1 = M.wow + 25, X = (m) => x0 + w * (m - m0) / (m1 - m0), head = lerp(M.sleep, M.wow, ease(t / 56));
  g.save(); g.fillStyle = C.night; g.fillRect(X(M.sleep), y0, X(M.wow) - X(M.sleep), h);
  const rows = SESSION.agents.filter((a) => a.start > M.sleep - 5 && a.start < M.nightWorkEnds);
  rows.forEach((a, i) => { const e = Math.min(a.end, head); if (e > a.start) { g.fillStyle = TAGS.cook.color; g.fillRect(X(a.start), y0 + 26 + i * 34, X(e) - X(a.start), 22); } });
  if (head > M.nightWorkEnds) { g.strokeStyle = C.dim; g.lineWidth = 3; g.setLineDash([10, 12]); g.beginPath(); g.moveTo(X(M.nightWorkEnds) + 8, y0 + h / 2); g.lineTo(X(head), y0 + h / 2); g.stroke(); g.setLineDash([]); }
  for (const [m, text, col] of [[M.sleep, clockText(M.sleep) + " asleep", C.him], [M.nightWorkEnds, clockText(M.nightWorkEnds) + " agents done", TAGS.cook.color], [M.wow, clockText(M.wow), C.him]]) {
    if (head < m - 0.01) continue; g.fillStyle = col; g.fillRect(X(m) - 2, y0 - 14, 4, h + 28); label(g, text, X(m), y0 - 26, { size: 24, bold: true, color: col, align: m === M.wow ? "right" : "left" });
  }
  if (head >= M.wow - 0.01) label(g, "nothing running", (X(M.nightWorkEnds) + X(M.wow)) / 2, y0 + h / 2 - 16, { size: 24, align: "center", color: C.dim });
  g.restore();
}
export const ch7 = chapter(7, (P) => {
  const g = P.g, F = P.F; let c;
  if (F < DROP) {      // the bar of held breath: black, and the clock running from his good night to his return
    fill(g, "#000"); if (!(c = P.on("w_clock"))) return;
    const m = lerp(SESSION.minutes.sleep, SESSION.minutes.wow, ease(c.t / 30));
    g.save(); g.font = `230px ${DELA}`; g.textAlign = "center"; g.fillStyle = C.pale; g.fillText(c.t >= 30 ? c.text : clockText(m), W / 2, H / 2 + 80); g.restore(); return;
  }
  if (F < CUTBLACK) {
    g.drawImage(P.img(film(filmAt("drop", F))), 0, 0);
    if ((c = P.on("w_slice"))) { g.save(); g.globalAlpha = ease(c.t / 6) * ease(c.left / 6); g.font = `bold 26px ${MONO}`; const w = g.measureText(c.text).width; g.fillStyle = "rgba(11,8,22,0.82)"; g.fillRect(84, 978, w + 28, 44); g.fillStyle = C.pale; g.fillText(c.text, 98, 1009); g.restore(); }
    return { plain: true };
  }
  fill(g); 
  if (F < cueOf("w_wow").a) return fill(g, "#000");
  if ((c = P.on("w_wow"))) { display(P, c, { y: 500, size: 340, by: true }); return; }
  if (F < B(7, 14)) {
    const t = F - K7[31], r = picture(g, P.img(foot("before/slice", Math.min(159, t))), 96, 112, 800, 450, { frame: C.faint, border: 3 });
    if ((c = P.on("w_first"))) label(g, c.text, r.x, r.y + r.h + 40, { size: 24 });
    night(P, 980, 190, 844, 230, t);
    if ((c = P.on("w_night"))) display(P, c, { y: 800, size: 44, split: "; " });
  } else terminal(P, ["w_go"], { y: 420 });
  furniture(P);
}, { marks: [...marksOf(7), { at: DROP, what: "the drop: the slice, full frame", on: "kick" }] });

// ---- 8 Building the rest -------------------------------------------------------------------------------------------------------
const SECTIONS = ["open", "descent", "gantry", "slice", "wins", "core", "boom", "breakdown", "reunion", "fall"], PAL = { open: "#2fbf8f", descent: "#4f7dff", gantry: "#3ec9d6", slice: "#ff2a8c", wins: "#ffb347", core: "#9a6bff", boom: "#ff7a2e", breakdown: "#e0405a", reunion: "#c2324f", fall: "#5a6cff" };
const STARTS = SECTIONS.reduce((o, s, i) => { o[s] = i ? o[SECTIONS[i - 1]] + SESSION.stats.sections[SECTIONS[i - 1]] : 0; return o; }, {}), TOTAL = SESSION.stats.frames;
const BUILT = { open: "b_s_open", descent: "b_s_descent", gantry: "b_s_gantry", wins: "b_s_wins", core: "b_s_core", boom: "b_s_boom", breakdown: "b_s_breakdown", reunion: "b_s_reunion", fall: "b_s_fall" };
const SHOW = { slice: 1237, open: 196, descent: 536, gantry: 800, wins: 1716, core: 2112, boom: 2440, breakdown: 2600, reunion: 3300, fall: 3722 };      // the film frame each section's window opens on
function map(P) {
  const g = P.g, x0 = 96, w = W - 192, y = 112, h = 46;
  SECTIONS.forEach((s) => {
    const x = x0 + w * STARTS[s] / TOTAL, sw = w * SESSION.stats.sections[s] / TOTAL - 4, a = s === "slice" ? -99 : cueOf(BUILT[s]).a, k = clamp((P.F - a) / 10);
    g.fillStyle = C.panel; g.fillRect(x, y, sw, h); if (k > 0) { g.fillStyle = PAL[s]; g.fillRect(x, y, sw * k, h); }
    if (P.F - a >= 0 && P.F - a < 4) { g.fillStyle = "#fff"; g.fillRect(x, y - 6, sw, h + 12); }
  });
  label(g, "0:00", x0, y + h + 28, { size: 20, color: C.faint }); label(g, "2:45", x0 + w, y + h + 28, { size: 20, color: C.faint, align: "right" });
}
const GRAPH = { t0: 49.3, t1: 53.9 };
function beatsAndKicks(P) {
  const g = P.g, X = (t) => 200 + 1520 * (t - GRAPH.t0) / (GRAPH.t1 - GRAPH.t0), beats = LISTEN.beats.filter((t) => t > GRAPH.t0 && t < GRAPH.t1), kicks = STEMS.stems.kick.onsets.filter((t) => t > GRAPH.t0 && t < GRAPH.t1); let c;
  g.save(); g.fillStyle = C.faint; g.fillRect(200, 329, 1520, 2); g.fillRect(200, 529, 1520, 2);
  beats.forEach((t) => { g.fillStyle = C.pale; g.fillRect(X(t) - 3, 290, 6, 80); });
  kicks.forEach((t, i) => { g.fillStyle = C.pink; g.beginPath(); g.arc(X(t), 530, i ? 22 : 34, 0, 7); g.fill(); });
  const late = beats.find((t) => t > kicks[0] + 0.2); g.strokeStyle = TAGS.rejected.color; g.lineWidth = 6; g.strokeRect(X(late) - 22, 270, 44, 120);
  if ((c = P.on("b_m1_beat"))) label(g, c.text, 200, 262, { size: 26, color: C.pale });
  if ((c = P.on("b_m1_drop"))) label(g, c.text, X(late) + 34, 262, { size: 26, color: TAGS.rejected.color, bold: true });
  if ((c = P.on("b_m1_kick"))) label(g, c.text, 200, 620, { size: 26, color: C.pink, bold: true });
  g.restore();
}
export const ch8 = chapter(8, (P) => {
  const g = P.g, F = P.F; fill(g); let c;
  if ((c = P.on("card8"))) return card(P, c, 8);
  if ((c = P.on("card9"))) return card(P, c, 9);
  if (F < B(8, 1)) return;
  if (F < B(8, 12)) {
    map(P);
    const live = SECTIONS.filter((s) => s !== "slice" && P.on(BUILT[s])), now = live.length ? live[Math.floor((F - cueOf(BUILT[live[0]]).a) / Math.ceil((cueOf(BUILT[live[0]]).b - cueOf(BUILT[live[0]]).a) / live.length)) % live.length] : "slice";
    const since = live.length ? (F - cueOf(BUILT[live[0]]).a) : F - B(8, 1);
    const r = picture(g, P.img(film(SHOW[now] + since)), 96, 212, 1056, 594, { grow: true }); framed(g, r, PAL[now], 6);
    let y = 250; g.save();
    SECTIONS.filter((s) => s !== "slice" && cueOf(BUILT[s]).a <= F).forEach((s) => { const q = cueOf(BUILT[s]), on = live.includes(s); g.globalAlpha = on ? 1 : 0.45; g.fillStyle = PAL[s]; g.fillRect(1200, y - 24, 16, 28); label(g, q.text, 1230, y, { size: 30, bold: on, color: on ? C.white : C.dim }); y += 52; });
    g.restore();
    if (P.on("b_togo")) terminal(P, ["b_togo"], { y: 850 });
    if ((c = P.on("b_cook"))) display(P, c, { y: 900, size: 56 });
    if ((c = P.on("b_peak"))) display(P, c, { y: 900, size: 46 });
  } else if (P.on("b_m1")) { beatsAndKicks(P); display(P, P.on("b_m1"), { y: 800, size: 60 }); }
  else if ((c = P.on("b_m2"))) {
    const n = Math.min(2, Math.floor(c.t / (c.dur / 3)));
    if (n < 2) {      // the accepted sheet wipes over the layout it was painted on: the two are the same size, cell for cell
      const k = clamp((c.t - c.dur / 3 + 1) / 10); picture(g, P.img(foot("method/layout")), 337, 96, 1245, 695);
      if (k > 0) { g.save(); g.beginPath(); g.rect(337, 96, 1245 * k, 695); g.clip(); picture(g, P.img(foot("method/painted")), 337, 96, 1245, 695); g.restore(); if (k < 1) { g.fillStyle = C.pale; g.fillRect(337 + 1245 * k - 5, 96, 5, 695); } }
    } else { g.fillStyle = "#1c1636"; g.fillRect(160, 280, 1600, 320); picture(g, P.img(foot("method/cels")), 160, 297, 1600, 286); }
    display(P, c, { y: 870, size: 48 });
  } else if (F < B(8, 17)) {
    const first = P.on("b_rej1"), q = first ?? P.on("b_rej2");
    if (q) { picture(g, P.img(foot(first ? "method/rej_count" : "method/rej_colour")), 337, 96, 1245, 695, { frame: TAGS.rejected.color }); display(P, q, { y: 858, size: 56, color: TAGS.rejected.color }); }
    if ((c = P.on("b_rejcount"))) label(g, c.text, W / 2, 940, { align: "center", size: 28 });
  } else {
    ["a_love", "a_lgtm", "a_y", "a_core", "a_beautiful"].forEach((id, i) => {
      if (!(c = P.on(id))) return; const y = 190 + i * 130, k = pop(c.t);
      g.save(); g.translate(390, y); g.scale(k, k); g.translate(-390, -y);
      label(g, hhmm(c.item.when), 250, y + 4, { size: 30, bold: true, color: C.him });
      g.font = `66px ${DELA}`; g.textAlign = "left"; g.fillStyle = C.pale; g.fillText(`“${c.text}”`, 390, y + 8); const w = g.measureText(`“${c.text}”`).width;
      chip(g, c.item, 390 + w + 36, y - 30, { size: 26 }); g.restore();
    });
  }
  furniture(P);
}, { marks: marksOf(8) });

// ---- 9 The human eye -------------------------------------------------------------------------------------------------------------
// each note: its entry, what he was shown (his screenshot, or a clip of the fault), and the film frames of the fix (first, last): a bar of the film
// from a kick of its own, so its hits land on this song's kicks
const NOTES = [["h_crowd", "before/crowd", 1356], ["h_kick", "before/kick", 1237], ["h_face", "shots/4", 1783], ["h_shades", "shots/5", 1853], ["h_plug", "shots/6", 2230], ["h_door", "shots/7", 1307, 1345], ["h_boss", "before/boss", 3233], ["h_noor", "shots/8", 3402, 3441]];
export const ch9 = chapter(9, (P) => {
  const g = P.g, F = P.F; fill(g); let c, post;
  NOTES.forEach(([id, src, fixFilm, lastFilm = 9999], i) => {
    if (!(c = P.on(id))) return;
    const fixed = P.on(`h_fixed#${i}`), was = P.on(`${src.startsWith("before") ? "h_was" : "h_his"}#${i}`), box = [128, 92, 1664, 740], col = TAGS[c.item.tag].color;
    if (!fixed) {
      const im = P.img(src.startsWith("before") ? foot(src, Math.min(39, c.t)) : foot(src)), r = picture(g, im, ...box, { frame: col });
      if (was) tagAt(g, was.text, r.x + 14, r.y + 14, col, { t: was.t });
    } else {
      const r = picture(g, P.img(film(Math.min(lastFilm, fixFilm + fixed.t))), ...box, { grow: true, frame: TAGS.approved.color });
      let x = r.x + 14 + tagAt(g, fixed.text, r.x + 14, r.y + 14, TAGS.approved.color, { t: fixed.t, size: 34 }) + 16;
      const hole = P.on("h_hole"); if (hole && id === "h_door") { g.fillStyle = "rgba(11,8,22,0.82)"; g.fillRect(x - 6, r.y + 14, chipWidth(g, hole.item, 28) + 12, 54); chip(g, hole.item, x, r.y + 20, { t: hole.t }); }
      post = flashAt(F, fixed.a, 0.35);
    }
    display(P, c, { x: 128, y: 918, align: "left", size: 54, maxW: 1664, pop: false });
  });
  furniture(P); return post;
}, { marks: marksOf(9) });

// ---- 10 Who did what ---------------------------------------------------------------------------------------------------------------
export const ch10 = chapter(10, (P) => {
  const g = P.g, F = P.F; fill(g); let c;
  if ((c = P.on("card10"))) {
    const t = tallyAt(F), keys = Object.keys(TAGS);
    g.save(); g.textBaseline = "alphabetic"; g.font = `92px ${DELA}`; g.textAlign = "center"; g.fillStyle = C.pale; g.fillText(c.text.toUpperCase(), W / 2, 170);
    const q = P.on("n_shown"); if (q) label(g, q.text, W / 2, 222, { align: "center", size: 26 });
    keys.forEach((k, i) => {
      const tt = c.t - i * 3; if (tt < 0) return; const col = i % 2, row = Math.floor(i / 2), x = 250 + col * 800, y = 470 + row * 190, s = pop(tt);
      g.save(); g.translate(x + 200, y); g.scale(s, s); g.translate(-x - 200, -y);
      g.font = `150px ${DELA}`; g.textAlign = "right"; g.fillStyle = TAGS[k].color; g.fillText(String(t[k]), x + 170, y);
      g.font = `bold 40px ${MONO}`; g.textAlign = "left"; g.fillStyle = TAGS[k].color; g.fillText(TAGS[k].name, x + 200, y - 30); g.restore();
    });
    g.restore(); return flashAt(F, c.a, 0.3);
  }
  const id = ["n_hours", "n_words", "n_drawings", "n_agents", "n_frames"].find((k) => P.on(k)); if (!id) return; c = P.on(id);
  display(P, c, { y: c.item.sub ? 470 : 540, size: id === "n_words" || id === "n_drawings" ? 124 : id === "n_frames" ? 176 : 210, maxW: 1700, quotes: false, by: false });
  if (c.item.sub) { g.save(); g.font = `50px ${DELA}`; g.textAlign = "center"; g.fillStyle = C.him; g.fillText(c.item.sub, W / 2, 700); g.restore(); }
  return flashAt(F, c.a, 0.22);
}, { marks: marksOf(10) });

// ---- 11 Fork it ----------------------------------------------------------------------------------------------------------------------
const PEAK = CUE.forkIt.stringPeak.frame;
export const ch11 = chapter(11, (P) => {
  const g = P.g, F = P.F; fill(g, "#000"); let c;
  if ((c = P.on("k_fork"))) {
    fill(g);
    g.save(); g.font = `150px ${DELA}`; g.textAlign = "left"; g.fillStyle = C.pale; const k = pop(c.t); g.translate(96, 330); g.scale(k, k); g.fillText(c.text.toUpperCase(), 0, 0); g.restore();
    const u = P.on("k_url"); if (u) { g.save(); g.font = `bold 44px ${MONO}`; g.fillStyle = C.him; g.fillText(u.text, 100, 430); g.restore(); }
    const cmd = P.on("k_cmd"), clipc = P.on("k_clip");
    if (cmd) { g.save(); g.fillStyle = C.panel; g.fillRect(96, 540, 800, 110); g.font = `bold 34px ${MONO}`; g.fillStyle = C.claude; g.fillText("$", 124, 608); g.fillStyle = C.white; const n = Math.min(cmd.text.length, Math.floor((cmd.t + 1) * 2.5)); g.fillText(cmd.text.slice(0, n), 164, 608); g.restore(); }
    if (clipc) { const r = picture(g, P.img(foot("hello", Math.min(198, clipc.t))), 1000, 190, 824, 464, { frame: C.faint, border: 3 }); label(g, clipc.text, r.x, r.y + r.h + 40, { size: 22 }); }
    return flashAt(F, CUE.whoDidWhat.lastKick.frame, 0.5);
  }
  if ((c = P.on("k_cr1"))) {
    const dim = lerp(1, 0.55, ease((F - PEAK) / 16)) * ease(c.left / 18);
    g.save(); g.globalAlpha = dim; g.textAlign = "left"; g.textBaseline = "alphabetic"; let y = 170;
    for (const id of ["k_cr1", "k_cr2", "k_cr3", "k_cr4", "k_cr5"]) { const q = P.on(id); if (!q) continue; g.font = `46px ${DELA}`; g.fillStyle = C.pale; for (const line of wrapLines(g, q.text, 1500)) { g.fillText(line, 96, y); y += 60; } y += 22; }
    y += 30; for (const id of ["k_lic1", "k_lic2", "k_lic3"]) { const q = P.on(id); if (!q) continue; label(g, q.text, 96, y, { size: 30, color: C.dim }); y += 46; }
    g.restore();
    const e = P.on("k_end"); if (e) { const im = P.img(film(3940)); g.save(); g.globalAlpha = ease(e.left / 18); g.drawImage(im, 1500, 900, 400, 160, 1500, 900, 400, 160); g.restore(); }
  }
}, { marks: marksOf(11) });
function wrapLines(g, text, maxW) { const lines = []; let line = ""; for (const w of text.split(" ")) { const t = line ? line + " " + w : w; if (line && g.measureText(t).width > maxW) { lines.push(line); line = w; } else line = t; } if (line) lines.push(line); return lines; }

export const ALL = [ch1, ch2, ch3, ch4, ch5, ch6, ch7, ch8, ch9, ch10, ch11];
