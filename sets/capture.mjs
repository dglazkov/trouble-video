// Render a set shot with headless Chrome: node sets/capture.mjs shots/set_NAME.js [options]
//   (no options)        every frame to out/NAME/frames/f0000.png, then out/NAME.mp4 with the song's slice under it
//   --frames 0,12,40    only these frames (stills; no video)        --range 0-95   only this span (no video)
//   --out DIR           frames go to DIR instead                    --sheet [N]    also a contact sheet of every Nth frame
//   --stills 0,12       copy these frames to out/NAME_fNNNN.png     --silent       no audio in the video
// Prints one JSON line: frames, seconds, milliseconds of GPU work per frame, and what was written.
import http from "node:http"; import fs from "node:fs"; import path from "node:path"; import { execFileSync } from "node:child_process";
import { chromium } from "playwright-core";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const args = process.argv.slice(2), flag = (n) => { const i = args.indexOf(n); if (i < 0) return null; const v = args[i + 1] && !args[i + 1].startsWith("--") ? args.splice(i + 1, 1)[0] : true; args.splice(i, 1); return v; };
const only = flag("--frames"), range = flag("--range"), outDir = flag("--out"), sheet = flag("--sheet"), stills = flag("--stills"), silent = flag("--silent"), help = flag("--help");
if (!args[0] || help) { console.error(fs.readFileSync(new URL(import.meta.url), "utf8").split("\n").filter((l) => l.startsWith("//")).join("\n")); process.exit(2); }
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".png": "image/png" };
const srv = http.createServer((q, r) => {
  const f = path.join(ROOT, decodeURIComponent(q.url.split("?")[0]));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(q.url === "/favicon.ico" ? 204 : 404); return r.end(); }
  r.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream", "cache-control": "no-store" }); fs.createReadStream(f).pipe(r);
});
await new Promise((r) => srv.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", headless: true, args: ["--use-angle=gl", "--enable-gpu", "--ignore-gpu-blocklist", "--hide-scrollbars"] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
let bad = null; const fail = (m) => { bad ??= m; console.error(m); };
page.on("pageerror", (e) => fail("page error: " + (e.stack || e))); page.on("console", (m) => { if (m.type() === "error") fail("console: " + m.text()); else if (m.type() === "warning" && /THREE|WebGL|GL_/.test(m.text())) console.error("warning: " + m.text()); });
const done = async (code) => { await browser.close(); srv.close(); process.exit(code); };
await page.goto(`http://127.0.0.1:${srv.address().port}/sets/stage.html?shot=/${path.relative(ROOT, path.resolve(args[0]))}`);
await page.waitForFunction("window.ready || window.failed", null, { timeout: 60000 });
if (await page.evaluate("window.failed")) await done(1);
const info = await page.evaluate("window.shotInfo");
if (/swiftshader|llvmpipe/i.test(info.gpu)) { console.error("not a hardware GPU: " + info.gpu); await done(1); }
let frames = [...Array(info.frames).keys()];
if (only) frames = String(only).split(",").map(Number);
if (range) { const [a, b] = String(range).split("-").map(Number); frames = frames.filter((f) => f >= a && f <= b); }
const whole = !only && !range, dir = outDir ? path.resolve(outDir) : path.join(ROOT, "out", info.name, "frames");
if (whole) fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });
const t0 = Date.now(), files = []; let ms = 0, n = 0;
for (const f of frames) {
  const [d, r] = await page.evaluate(async (f) => { const r = await renderFrame(f); return [capture(), r]; }, f);
  if (bad) await done(1);
  if (n++ > 0 || frames.length === 1) ms += r.ms;
  const file = path.join(dir, `f${String(f).padStart(4, "0")}.png`); fs.writeFileSync(file, Buffer.from(d.split(",")[1], "base64")); files.push(file);
}
const secs = (Date.now() - t0) / 1000, py = path.join(ROOT, ".venv/bin/python");
const result = { shot: info.name, gpu: info.gpu, frames: frames.length, seconds: +secs.toFixed(1), renderMsPerFrame: +(ms / Math.max(1, frames.length - (frames.length > 1 ? 1 : 0))).toFixed(1), wallMsPerFrame: +(secs * 1000 / frames.length).toFixed(0), dir: path.relative(ROOT, dir) };
if (whole) {
  const ffmpeg = execFileSync(py, ["-c", "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"]).toString().trim(), mp4 = path.join(ROOT, "out", info.name + ".mp4");
  const audio = silent ? [] : ["-ss", String(info.start), "-t", String(info.frames / info.fps), "-i", path.join(ROOT, "audio.wav")];
  execFileSync(ffmpeg, ["-y", "-loglevel", "error", "-framerate", String(info.fps), "-i", path.join(dir, "f%04d.png"), ...audio, "-c:v", "libx264", "-pix_fmt", "yuv420p", "-crf", "15", "-preset", "medium", ...(silent ? [] : ["-c:a", "aac", "-b:a", "192k", "-shortest"]), mp4]);
  result.video = path.relative(ROOT, mp4);
}
if (stills) result.stills = String(stills).split(",").map((f) => { const src = path.join(dir, `f${String(f).padStart(4, "0")}.png`), dst = path.join(ROOT, "out", `${info.name}_f${String(f).padStart(4, "0")}.png`); fs.copyFileSync(src, dst); return path.relative(ROOT, dst); });
if (sheet) {
  const every = sheet === true ? Math.max(1, Math.round(files.length / 24)) : Number(sheet), png = path.join(ROOT, "out", info.name + "_sheet.png");
  execFileSync(py, [path.join(ROOT, "pipeline/sheet.py"), png, "--every", String(every), ...files]); result.sheet = path.relative(ROOT, png);
}
console.log(JSON.stringify(result));
await done(0);
