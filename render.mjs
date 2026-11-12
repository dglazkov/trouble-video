// Render a shot, or an edit of shots: node render.mjs shots/NAME.js [options]
//   (no options)        every frame to out/NAME/frames/f0000.png, then out/NAME.mp4 (1920x1080 H.264), with the song
//                       from the shot's `start` under it if it has one
//   --frames 0,12,40    only these frames (stills; no video)
//   --range 0-95        only this span (no video)
//   --out DIR           frames go to DIR instead
//   --stills 0,12       copy these frames to out/NAME_stills/NAME_fNNNN.png (to be read at full size)
//   --silent            no audio in the video
//   --debug             overlay the skeleton and which drawing each character is on             -> out/NAME_debug...
//   --mannequin         the body's dummy instead of the kit's drawings                         -> out/NAME_mannequin...
//   --over              nothing of the set hides a character (engine/motion.mjs compares it with a normal render)
// Beside the frames it writes notes.json: per frame, each character's drawing and the light it was laid in.
//   --sheet [N]         also a contact sheet out/NAME_sheet.png of every Nth rendered frame (default: 24 evenly spaced)
//   --crop x0,y0,x1,y1  crop for the contact sheet
// Prints one JSON line: what was written, how long it took, and `dummies`: which characters were drawn as the posing
// dummy because their kit has no drawing for what the shot asks (per action and view, with the frames it happened on).
import fs from "node:fs"; import path from "node:path"; import { execFileSync } from "node:child_process";
import { open, ROOT } from "./pipeline/browser.mjs";

const args = process.argv.slice(2), flag = (n) => { const i = args.indexOf(n); if (i < 0) return null; const v = args[i + 1] && !args[i + 1].startsWith("--") ? args.splice(i + 1, 1)[0] : true; args.splice(i, 1); return v; };
const debug = flag("--debug"), dummy = flag("--mannequin"), sheet = flag("--sheet"), crop = flag("--crop"), only = flag("--frames"), range = flag("--range"), outDir = flag("--out"), stills = flag("--stills"), silent = flag("--silent"), over = flag("--over");
const shotFile = args[0];
if (!shotFile || flag("--help")) { console.error(fs.readFileSync(new URL(import.meta.url), "utf8").split("\n").filter((l) => l.startsWith("//")).join("\n")); process.exit(2); }
const kits = fs.readdirSync(path.join(ROOT, "kits")).filter((k) => fs.existsSync(path.join(ROOT, "kits", k, "kit.json")));
const { page, close } = await open(`/engine/stage.html?shot=/${path.relative(ROOT, path.resolve(shotFile))}&kits=${kits.join(",")}${debug ? "&debug=1" : ""}${dummy ? "&mannequin=1" : ""}${over ? "&over=1" : ""}`);
const info = await page.evaluate("window.shotInfo");
if (/swiftshader|llvmpipe/i.test(info.gpu)) { console.error("not a hardware GPU: " + info.gpu); await close(); process.exit(1); }
const name = info.name + (debug ? "_debug" : "") + (dummy ? "_mannequin" : ""), dir = outDir ? path.resolve(outDir) : path.join(ROOT, "out", name, "frames");
let frames = [...Array(info.frames).keys()];
if (only) frames = String(only).split(",").map(Number);
if (range) { const [a, b] = String(range).split("-").map(Number); frames = frames.filter((f) => f >= a && f <= b); }
const whole = !only && !range, pad = (f) => String(f).padStart(4, "0");
if (whole) fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });
const t0 = Date.now(), files = [], dummies = {}, notes = {};
for (const f of frames) {
  const [d, r] = await page.evaluate(async (f) => { const r = await renderFrame(f); return [capture(), r]; }, f);
  if (process.exitCode) break;      // the page reported an error (pipeline/browser.mjs)
  notes[f] = r.actors;
  for (const a of r.actors) if (a.dummy && !dummy) (dummies[`${a.who} ${a.action} x ${a.view}`] ??= []).push(f);
  const file = path.join(dir, `f${pad(f)}.png`);
  fs.writeFileSync(file, Buffer.from(d.split(",")[1], "base64")); files.push(file);
}
const secs = (Date.now() - t0) / 1000;
fs.writeFileSync(path.join(dir, "notes.json"), JSON.stringify(notes));
await close();
if (process.exitCode) process.exit(process.exitCode);
const spans = (l) => { const o = []; for (const f of l) { const s = o[o.length - 1]; if (s && f === s[1] + 1) s[1] = f; else o.push([f, f]); } return o.map(([a, b]) => a === b ? `${a}` : `${a}-${b}`).join(","); };
const py = path.join(ROOT, ".venv/bin/python"), rel = (p) => path.relative(ROOT, p);
const result = { shot: info.name, gpu: info.gpu, frames: frames.length, seconds: +secs.toFixed(1), fps: +(frames.length / secs).toFixed(1), dir: rel(dir), cuts: info.cuts ?? undefined, dummies: Object.fromEntries(Object.entries(dummies).map(([k, l]) => [k, spans(l)])) };
if (whole) {
  const ffmpeg = execFileSync(py, ["-c", "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"]).toString().trim(), mp4 = path.join(ROOT, "out", name + ".mp4");
  const sound = !silent && info.start !== null, audio = sound ? ["-ss", String(info.start), "-t", String(info.frames / info.fps), "-i", path.join(ROOT, "audio.wav")] : [];
  execFileSync(ffmpeg, ["-y", "-loglevel", "error", "-framerate", String(info.fps), "-i", path.join(dir, "f%04d.png"), ...audio, "-c:v", "libx264", "-profile:v", "high", "-pix_fmt", "yuv420p", "-crf", "14", "-preset", "slow", "-movflags", "+faststart", ...(sound ? ["-c:a", "aac", "-b:a", "256k", "-shortest"] : []), mp4]);
  result.video = rel(mp4);
}
if (stills) {
  const sd = path.join(ROOT, "out", name + "_stills"); fs.mkdirSync(sd, { recursive: true });
  result.stills = String(stills).split(",").map((f) => { const dst = path.join(sd, `${name}_f${pad(f)}.png`); fs.copyFileSync(path.join(dir, `f${pad(f)}.png`), dst); return rel(dst); });
}
if (sheet) {
  const n = sheet === true ? Math.max(1, Math.round(files.length / 24)) : Number(sheet), png = path.join(ROOT, "out", name + "_sheet.png");
  execFileSync(py, [path.join(ROOT, "pipeline/sheet.py"), png, "--every", String(n), ...(crop ? ["--crop", crop] : []), ...files]);
  result.sheet = rel(png);
}
console.log(JSON.stringify(result));
