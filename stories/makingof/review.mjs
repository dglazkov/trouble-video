// Writes the owner's proofreading sheet and the stills: node stories/makingof/review.mjs [--stills]
//   out/makingof/review.md     every word on screen in order with its frames and timecode, the ledger (who is credited
//                              with what, and the source), the tally, check.mjs's findings, then NOTES.md (what was cut
//                              from the script and why; what is least sure)
//   --stills                   also copies a frame of each main cue from out/makingof/frames/ (a finished render) to
//                              out/makingof/stills/ and lays them on a contact sheet (stills/contact.png)
import fs from "node:fs"; import path from "node:path"; import { execFileSync } from "node:child_process";
import { ROOT, python } from "../../pipeline/browser.mjs";
import { LEDGER, TAGS, chap, FPS, tallyAt, CUE } from "./lib.js";
import { CUES } from "./script.js";

const tc = (F) => { const s = F / FPS, m = Math.floor(s / 60); return `${m}:${(s - m * 60).toFixed(1).padStart(4, "0")}`; };
const WHO = { dimitri: "Dimitri", claude: "Claude", caption: "caption", label: "label", card: "chapter card", number: "number" };
const out = path.join(ROOT, "out/makingof"); fs.mkdirSync(out, { recursive: true });
let md = `# The making-of: everything on screen\n\nWritten by \`node stories/makingof/review.mjs\` from \`stories/makingof/ledger.json\` (the words) and \`script.js\` (when). Frames are of the making-of (24 a second); a line is on screen from its first frame up to, not including, its last. Quotes are as typed; … marks a trim. To change a word or a tag, edit \`ledger.json\` and render again (\`npm run makingof\`).\n`;
for (let n = 1; n <= 11; n++) {
  const c = chap(n), list = CUES.filter((q) => q.a >= c.startFrame && q.a < c.endFrame).sort((x, y) => x.a - y.a);
  md += `\n## ${n}. ${c.name} (frames ${c.startFrame}–${c.endFrame}, ${tc(c.startFrame)}–${tc(c.endFrame)})\n\n`;
  if (n === 1) md += `No text. The finished film, its frames ${1237}–${1513}, to its own bars; black from frame ${CUE.coldOpen.hardCut.frame}.\n`;
  if (n === 7) md += `Frames ${CUE.wow.drop.frame}–${CUE.wow.drop.frame + 249}: the slice from the finished film (its frames 1237–1485), full frame, untouched; then black until his review.\n\n`;
  if (!list.length) continue;
  md += `| Frames | Time | Who, when | On screen | Tag |\n|---|---|---|---|---|\n`;
  for (const q of list) { const it = q.item; md += `| ${q.a}–${q.b} | ${tc(q.a)} | ${WHO[it.who]}${it.when ? " · " + it.when : ""} | ${it.text}${it.sub ? ` / ${it.sub}` : ""} | ${it.tag ? `**${TAGS[it.tag].name}**: ${it.label}${it.detail ? ` (${it.detail})` : ""}` : ""} |\n`; }
}
md += `\n## The ledger: who is credited with what\n\nThe tally on screen counts these, in the order they appear. Final tally: ${Object.entries(tallyAt(1e9)).map(([k, v]) => `${TAGS[k].name} ${v}`).join(" · ")}.\n`;
for (const [k, tag] of Object.entries(TAGS)) {
  md += `\n### ${tag.name}\n\n| # | Credited | On screen | Source | First frame |\n|---|---|---|---|---|\n`;
  CUES.filter((q) => q.item.tag === k).sort((x, y) => x.a - y.a).forEach((q, i) => { const it = q.item; md += `| ${i + 1} | ${it.label} | ${it.text} | ${it.who === "dimitri" || it.who === "claude" ? `${WHO[it.who]}'s message of ${it.when}, verbatim` : it.source ?? ""} | ${q.a} (${tc(q.a)}) |\n`; });
}
md += `\n## Captions that are not quotes, and what supports each\n\n| On screen | Supported by |\n|---|---|\n`;
for (const [id, it] of Object.entries(LEDGER.items)) if (it.source && !it.tag) md += `| ${it.text}${it.sub ? ` / ${it.sub}` : ""} | ${it.source} |\n`;
let checked = ""; try { checked = execFileSync("node", [path.join(ROOT, "stories/makingof/check.mjs")], { encoding: "utf8" }); } catch (e) { checked = e.stdout; }
md += `\n## What check.mjs found\n\n\`\`\`\n${checked.replace(/; /g, ";\n    ")}\`\`\`\n\n` + fs.readFileSync(path.join(ROOT, "stories/makingof/NOTES.md"), "utf8");
fs.writeFileSync(path.join(out, "review.md"), md);
console.log("out/makingof/review.md");

if (process.argv.includes("--stills")) {
  const frames = path.join(out, "frames"), dir = path.join(out, "stills"); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
  const picks = [[1, 1], [1, 150], [1, 260], [7, CUE.wow.drop.frame], [7, CUE.wow.drop.frame + 120], [7, CUE.wow.drop.frame + 230]];
  for (const q of CUES) { if (!q.on && q.id !== "w_clock") continue; const n = [...Array(11).keys()].map((i) => i + 1).reverse().find((i) => q.a >= chap(i).startFrame); picks.push([n, Math.min(q.b - 1, q.a + Math.max(12, Math.round((q.b - q.a) * 0.7)))]); }
  picks.sort((x, y) => x[1] - y[1]); const files = [];
  for (const [n, F] of picks) { const src = path.join(frames, `f${String(F).padStart(4, "0")}.png`), dst = path.join(dir, `ch${String(n).padStart(2, "0")}_f${String(F).padStart(4, "0")}.png`); if (!fs.existsSync(src)) { console.error(`no ${src}: render first (npm run makingof)`); process.exit(1); } fs.copyFileSync(src, dst); files.push(dst); }
  execFileSync(python(), [path.join(ROOT, "pipeline/sheet.py"), path.join(dir, "contact.png"), "--cols", "8", "--width", "480", ...files]);
  console.log(`${files.length} stills and contact.png in out/makingof/stills/`);
}
