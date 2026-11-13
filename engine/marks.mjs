// Hold a shot's cuts and hits to the song: node engine/marks.mjs shots/NAME.js [--json] [--within FRAMES]
// A shot (or an edit of shots) lists what must land on the music as
//   marks: [{ at: frame, what: "the shutter slams", on: "beat" | "bar" | a stem's name (its onsets) }]
// or on: "lyric" (the start of a sung word, from analysis/lyrics.json; add word: "DEEP" to hold it to that word and no other;
// the choir's "trouble" may be anywhere from the breath of its "tr" to its vowel),
// and this says, for each, the frame it is on, the frame the song puts the nearest such beat, bar line or onset on,
// and how far apart they are. Exit status 1 if any is further off than --within (default 0.75 of a frame).
import fs from "node:fs"; import path from "node:path";
import { createSync } from "./sync.js";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), ".."), args = process.argv.slice(2), json = args.includes("--json"), wi = args.indexOf("--within"), within = wi >= 0 ? Number(args[wi + 1]) : 0.75;
const file = args.find((a) => a.endsWith(".js"));
if (!file || args.includes("--help")) { console.error(fs.readFileSync(new URL(import.meta.url), "utf8").split("\n").filter((l) => l.startsWith("//")).join("\n")); process.exit(2); }
const shot = (await import(path.resolve(file))).default, read = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, "analysis", f))), listen = read("listen.json"), stems = read("stems.json");
const lyrics = fs.existsSync(path.join(ROOT, "analysis", "lyrics.json")) ? read("lyrics.json") : null, plain = (w) => w.toUpperCase().replace(/[^A-Z]/g, "");
const sync = createSync(listen, stems, { lyrics }), fps = shot.fps ?? 24, f0 = (shot.start ?? 0) * fps;
if (!shot.marks?.length) { console.error(`${shot.name} lists no marks`); process.exit(1); }
const bars = sync.beats.filter((b) => sync.at(b * fps + 0.01).bar.beat === 0);
const rows = shot.marks.map((m) => {
  const times = m.on === "beat" ? sync.beats : m.on === "bar" ? bars : m.on === "lyric" ? sync.words.filter((w) => !m.word || plain(w.word) === plain(m.word)).map((w) => Math.min(Math.max(f0 + m.at, w.at), Math.max(w.at, w.vowel ?? 0)) / fps) : stems.stems[m.on]?.onsets;
  if (m.on === "lyric" && !times.length) throw new Error(`${shot.name}: "${m.what}" is on the lyric${m.word ? ` "${m.word}"` : ""}, and ${lyrics ? "no such word is sung" : "analysis/lyrics.json is missing (.venv/bin/python analysis/lyrics.py)"}`);
  if (!times) throw new Error(`${shot.name}: "${m.what}" is on "${m.on}", which is not beat, bar, lyric or a stem (${sync.stems.join(", ")})`);
  const want = times.map((t) => t * fps - f0).reduce((a, b) => Math.abs(b - m.at) < Math.abs(a - m.at) ? b : a), off = m.at - want;
  return { frame: m.at, seconds: +((f0 + m.at) / fps).toFixed(3), what: m.what, on: m.on, songFrame: +want.toFixed(2), off: +off.toFixed(2), ok: Math.abs(off) <= within };
});
const bad = rows.filter((r) => !r.ok).length;
if (json) console.log(JSON.stringify({ shot: shot.name, within, bad, marks: rows }));
else { for (const r of rows) console.log(`f${String(r.frame).padStart(4, "0")}  ${r.seconds.toFixed(2)} s  ${r.what.padEnd(48)} ${r.on.padEnd(6)} at ${String(r.songFrame).padStart(7)}  off ${r.off >= 0 ? "+" : ""}${r.off}${r.ok ? "" : "   <-- OFF THE MUSIC"}`); console.log(`${rows.length} marks, ${bad} off by more than ${within} of a frame`); }
process.exit(bad ? 1 : 0);
