// Proofreads the making-of against the record: node stories/makingof/check.mjs [--json]
//   quotes    every entry of ledger.json said by dimitri or claude is in the session transcript, word for word, in a message
//             of that speaker at that minute (pieces between … are each looked for; markdown asterisks are not words).
//             The transcript (out/makingof/data/dialogue.json) is private and not in a clone: without it, quotes.md is
//             read if it is there, and otherwise the quotes are reported as not checked.
//   numbers   every number on screen against out/makingof/data/stats.json (and session.json, the committed copy of them)
//   cues      every cue of script.js is drawn on each frame it is on (the chapters are run without a canvas), every tagged
//             entry is shown, and the tally they add up to
//   reading   how long each entry is up against 0.3 s a word plus half a second (reported; under 70% of that fails)
//   privacy   no address, key, home path or model version in anything shown
// Exit status 1 if anything fails.
import fs from "node:fs"; import path from "node:path";
import { ROOT } from "../../pipeline/env.mjs";
import { LEDGER, SESSION, TAGS, nothing, tallyAt, chap, FPS } from "./lib.js";
import { CUES } from "./script.js";
import { ALL } from "./chapters.js";

const fails = [], notes = [], fail = (m) => fails.push(m), read = (f) => { const p = path.join(ROOT, f); return fs.existsSync(p) ? fs.readFileSync(p, "utf8") : null; };
const norm = (s) => s.replace(/\*\*/g, "").replace(/\s+/g, " ").trim();
const items = LEDGER.items;

// ---- quotes
const dj = read("out/makingof/data/dialogue.json"), qmd = read("out/makingof/data/quotes.md");
let quotes = 0;
if (dj || qmd) {
  const msgs = dj ? JSON.parse(dj).messages.map((m) => ({ who: m.role === "owner" ? "dimitri" : "claude", at: m.local.slice(5, 16), text: norm(m.text) })) : null, all = qmd ? norm(qmd) : "";
  for (const [id, it] of Object.entries(items)) {
    if (it.who !== "dimitri" && it.who !== "claude") continue; quotes++;
    const pieces = it.text.split("…").map((s) => s.trim()).filter(Boolean);
    const found = msgs ? msgs.filter((m) => m.who === it.who && m.at === it.when).find((m) => { let i = 0; return pieces.every((p) => { const j = m.text.indexOf(p, i); if (j < 0) return false; i = j + p.length; return true; }); }) : pieces.every((p) => all.includes(p));
    if (!found) fail(`quote ${id}: “${it.text}” is not in ${it.who}'s message of ${it.when}`);
  }
  notes.push(`quotes: ${quotes} checked against ${dj ? "the transcript (speaker, minute, words in order)" : "quotes.md (words only)"}`);
} else notes.push("quotes: NOT CHECKED (out/makingof/data is not here)");
if (/we don't need on-screen lyrics/i.test(JSON.stringify(items))) fail("the unconfirmed line about on-screen lyrics is quoted");

// ---- numbers
const sj = read("out/makingof/data/stats.json"), n = (x) => x.toLocaleString("en-US");
if (sj) {
  const S = JSON.parse(sj), o = S.owner_messages, d = S.drawings.kit_logs_total, a = S.agents, w = S.wall_clock, num = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
  const want = {
    p_date: ["Wednesday 11 November 2026", w.first_message_local.slice(11, 16)], w_clock: [w.wow_local.slice(11, 16)],
    w_night: [`${w.hours_away_overnight.toFixed(1)} hours`, w.wow_local.slice(11, 16)],
    b_togo: [`${Math.round(S.film.sections.slice.seconds)} of ${Math.round(S.film.sections.film.seconds)} seconds`],
    b_peak: [a.peak_at_local.slice(11, 16), `${num[a.peak_running_at_once_incl_nested]} agents at once`, `: ${num[a.peak_top_level_at_once]},`, `${num[a.peak_running_at_once_incl_nested - a.peak_top_level_at_once]} helpers`],
    b_rejcount: [`${d.generations} logged`, `${d.rejected} rejected`],
    n_hours: [`${Math.round(w.hours_first_message_to_perfect)} hours`], n_words: [`${o.typed_first_to_perfect} messages`, `${n(o.words_first_to_perfect)} words`],
    n_agents: [`${a.launched_for_the_film_and_repo} agents`], n_frames: [`${n(S.film.frames_rendered)} frames`], n_drawings: ["about 480–500 drawings"],
  }, subs = { n_words: [`${n(o.assistant_words_first_to_perfect)} words`], n_drawings: [`${d.generations} logged`, `${d.rejected} rejected`] };
  for (const [id, list] of Object.entries(want)) for (const t of list) if (!items[id].text.includes(t)) fail(`number ${id}: “${items[id].text}” should say “${t}” (stats.json)`);
  for (const [id, list] of Object.entries(subs)) for (const t of list) if (!items[id].sub.includes(t)) fail(`number ${id}: “${items[id].sub}” should say “${t}” (stats.json)`);
  const per = Object.fromEntries(a.per_agent.map((p) => [p.description, p.minutes]));
  for (const [id, desc] of Object.entries({ b_s_open: "Build the opening section", b_s_descent: "Build section 0:20–0:30", b_s_gantry: "Build section 0:30–0:48", b_s_wins: "Build section 1:02–1:19", b_s_core: "Build Noor's section 1:19–1:33", b_s_boom: "Build Ife's section 1:33–1:46", b_s_breakdown: "Build the breakdown 1:46–1:59", b_s_reunion: "Build the reunion 1:59–2:26", b_s_fall: "Build the fall 2:26–end" }))
    if (!items[id].text.endsWith(`· ${per[desc]} min`)) fail(`number ${id}: “${items[id].text}” should end “· ${per[desc]} min” (stats.json, ${desc})`);
  const T = SESSION.stats, same = { hours: w.hours_first_message_to_perfect, hoursAway: w.hours_away_overnight, messages: o.typed_first_to_perfect, words: o.words_first_to_perfect, assistantWords: o.assistant_words_first_to_perfect, logged: d.generations, rejected: d.rejected, agents: a.launched_for_the_film_and_repo, peak: a.peak_running_at_once_incl_nested, frames: S.film.frames_rendered };
  for (const [k, v] of Object.entries(same)) if (T[k] !== v) fail(`session.json stats.${k} is ${T[k]}, stats.json says ${v}`);
  // the peak, counted again from the agents' spans
  const peak = Math.max(...SESSION.agents.map((x) => SESSION.agents.filter((y) => y.start <= x.start + 0.01 && y.end > x.start + 0.01).length));
  if (peak < a.peak_running_at_once_incl_nested) notes.push(`the agents' spans in session.json overlap ${peak} at most at a start (stats.json: ${a.peak_running_at_once_incl_nested} at ${a.peak_at_local.slice(11)})`);
  notes.push(`numbers: ${Object.keys(want).length + Object.keys(subs).length + 9} entries checked against stats.json`);
} else notes.push("numbers: NOT CHECKED against stats.json (out/makingof/data is not here); session.json is its committed copy");

// ---- cues: drawn when scheduled
const drawn = Object.fromEntries(CUES.map((c) => [c.id, 0]));
for (const shot of ALL) for (let f = 0; f < shot.frames; f++) { const F = Math.round(shot.start * FPS) + f; for (const id of shot.run(F, nothing, null, null).shown) drawn[id]++; }
for (const c of CUES) if (drawn[c.id] !== c.b - c.a) fail(`cue ${c.id}: on for ${c.b - c.a} frames (${c.a}-${c.b}) but drawn on ${drawn[c.id]}`);
const used = new Set(CUES.map((c) => c.id.split("#")[0]));
for (const [id, it] of Object.entries(items)) if (!used.has(id)) (it.tag ? fail : (m) => notes.push(m))(`ledger entry ${id} is never shown`);
const tally = tallyAt(1e9);
notes.push("tally as shown: " + Object.entries(tally).map(([k, v]) => `${TAGS[k].name} ${v}`).join(" · "));

// ---- reading time
const term = (c) => (c.item.who === "dimitri" || c.item.who === "claude");
const slow = [];
for (const c of CUES) {
  if (c.item.who === "label" || c.item.who === "card") continue;
  const words = (c.id === "a_love" ? CUES.filter((q) => q.id.startsWith("a_")).map((q) => q.text).join(" ") : c.text + " " + (c.item.sub ?? "")).trim().split(/\s+/).length, need = 0.3 * words + 0.5;
  const next = CUES.find((q) => q.a > c.a && q.a < c.b && q.item.who !== "label" && chapOf(q.a) === chapOf(c.a) && !sameScreen(c, q)), up = ((next ? next.a : c.b) - c.a) / FPS;
  if (c.id.startsWith("a_") && c.id !== "a_love") continue;      // the approvals are one list: counted on its first line
  if (up < need * 0.95) slow.push({ id: c.id, words, up: +up.toFixed(2), need: +need.toFixed(2) });
  if (up < need * 0.7 && !["k_cr1", "k_cr2", "k_cr3", "k_cr4", "k_cr5", "k_lic1", "k_lic2", "k_lic3"].includes(c.id)) fail(`reading ${c.id}: ${words} words up for ${up.toFixed(2)} s; ${need.toFixed(2)} s wanted`);
}
function chapOf(F) { for (let i = 11; i >= 1; i--) if (F >= chap(i).startFrame) return i; return 1; }
function sameScreen(c, q) { const g = [["k_cr1", "k_cr2", "k_cr3", "k_cr4", "k_cr5", "k_lic1", "k_lic2", "k_lic3", "k_end"], ["t_speed_web", "t_speed_blender", "t_speed_note"], ["card10", "n_shown"], ["k_fork", "k_url"], ["a_love", "a_lgtm", "a_y", "a_core", "a_beautiful"]]; return g.some((x) => x.includes(c.id) && x.includes(q.id)); }
notes.push(`reading time: ${slow.length} entries up for less than 0.3 s a word + 0.5 s: ` + slow.map((s) => `${s.id} (${s.words} words, ${s.up} s of ${s.need})`).join("; "));

// ---- privacy
for (const [id, it] of Object.entries(items)) { const t = [it.text, it.sub, it.label, it.detail].filter(Boolean).join(" "); if (/@|\/home\/|\/Users\/|sk-[A-Za-z0-9]|AIza|opus|sonnet|haiku|fable|claude-\d|\d\.\d\s*(model|version)/i.test(t)) fail(`privacy ${id}: “${t}”`); }

if (process.argv.includes("--json")) console.log(JSON.stringify({ fails, notes, tally, slow }));
else { for (const m of notes) console.log(m); for (const m of fails) console.log("FAIL  " + m); console.log(`${fails.length} failed`); }
process.exitCode = fails.length ? 1 : 0;
