// Render a shot: node render.mjs shots/NAME.js [options]
//   (no options)        every frame to out/NAME/frames/f0000.png, then out/NAME.mp4
//   --frames 0,12,40    only these frames (stills; no video)
//   --range 0-95        only this span (no video)
//   --debug             overlay the skeleton and which drawing each character is on             -> out/NAME_debug...
//   --mannequin         the body's dummy instead of the kit's drawings                         -> out/NAME_mannequin...
//   --sheet [N]         also a contact sheet out/NAME_sheet.png of every Nth rendered frame (default: 24 evenly spaced)
//   --crop x0,y0,x1,y1  crop for the contact sheet
import fs from "node:fs"; import path from "node:path"; import { execFileSync } from "node:child_process";
import { open, ROOT } from "./pipeline/browser.mjs";

const args = process.argv.slice(2), flag = (n) => { const i = args.indexOf(n); if (i < 0) return null; const v = args[i + 1] && !args[i + 1].startsWith("--") ? args.splice(i + 1, 1)[0] : true; args.splice(i, 1); return v; };
const debug = flag("--debug"), dummy = flag("--mannequin"), sheet = flag("--sheet"), crop = flag("--crop"), only = flag("--frames"), range = flag("--range");
const shotFile = args[0];
if (!shotFile || flag("--help")) { console.error(fs.readFileSync(new URL(import.meta.url), "utf8").split("\n").filter((l) => l.startsWith("//")).join("\n")); process.exit(2); }
const { page, close } = await open(`/engine/stage.html?shot=/${path.relative(ROOT, path.resolve(shotFile))}${debug ? "&debug=1" : ""}${dummy ? "&mannequin=1" : ""}`);
const info = await page.evaluate("window.shotInfo");
const name = info.name + (debug ? "_debug" : "") + (dummy ? "_mannequin" : ""), dir = path.join(ROOT, "out", name, "frames");
let frames = [...Array(info.frames).keys()];
if (only) frames = String(only).split(",").map(Number);
if (range) { const [a, b] = String(range).split("-").map(Number); frames = frames.filter((f) => f >= a && f <= b); }
const whole = !only && !range;
if (whole) fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });
const t0 = Date.now(), files = [];
for (const f of frames) {
  const d = await page.evaluate((f) => { renderFrame(f); return capture(); }, f);
  const file = path.join(dir, `f${String(f).padStart(4, "0")}.png`);
  fs.writeFileSync(file, Buffer.from(d.split(",")[1], "base64")); files.push(file);
}
const secs = (Date.now() - t0) / 1000;
await close();
const py = path.join(ROOT, ".venv/bin/python"), result = { shot: info.name, frames: frames.length, seconds: +secs.toFixed(1), fps: +(frames.length / secs).toFixed(1), dir: path.relative(ROOT, dir) };
if (whole) {
  const ffmpeg = execFileSync(py, ["-c", "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"]).toString().trim();
  const mp4 = path.join(ROOT, "out", name + ".mp4");
  execFileSync(ffmpeg, ["-y", "-loglevel", "error", "-framerate", String(info.fps), "-i", path.join(dir, "f%04d.png"), "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "15", "-preset", "medium", mp4]);
  result.video = path.relative(ROOT, mp4);
}
if (sheet) {
  const n = sheet === true ? Math.max(1, Math.round(files.length / 24)) : Number(sheet), png = path.join(ROOT, "out", name + "_sheet.png");
  execFileSync(py, [path.join(ROOT, "pipeline/sheet.py"), png, "--every", String(n), ...(crop ? ["--crop", crop] : []), ...files]);
  result.sheet = path.relative(ROOT, png);
}
console.log(JSON.stringify(result));
