// Is this machine ready to render?   node scripts/doctor.mjs   (npm run doctor)
// Checks Node, node_modules, Python and its packages, ffmpeg, Chrome and how it draws (GPU or software), the fonts, the
// demo song and the cast's files, and says in plain words what is missing and how to get it. Exit status 1 if
// something a render needs is missing; things only some work needs (a Gemini key, the speech model) are notes.
import fs from "node:fs"; import path from "node:path"; import { execFileSync } from "node:child_process";
import { ROOT, findChrome, chromeArgs, python, ffmpeg, software } from "../pipeline/env.mjs";

let bad = 0;
const ok = (what, detail = "") => console.log(`  ok       ${what}${detail ? "  " + detail : ""}`);
const miss = (what, how) => { bad++; console.log(`  MISSING  ${what}\n           -> ${how}`); };
const note = (what, detail) => console.log(`  note     ${what}${detail ? "\n           " + detail : ""}`);
const run = (cmd, args, o = {}) => execFileSync(cmd, args, { stdio: ["ignore", "pipe", "pipe"], timeout: 60000, ...o }).toString().trim();

console.log("Node");
const major = Number(process.versions.node.split(".")[0]);
if (major >= 20) ok(`Node ${process.versions.node}`); else miss(`Node ${process.versions.node} is too old`, "install Node 20 or later (https://nodejs.org)");
for (const m of ["playwright-core", "three"]) {
  const p = path.join(ROOT, "node_modules", m, "package.json");
  if (fs.existsSync(p)) ok(`${m} ${JSON.parse(fs.readFileSync(p)).version}`); else miss(`node_modules/${m}`, "npm ci   (or npm run setup)");
}

console.log("Python");
const py = python();
let pyOk = false;
try { ok(run(py, ["--version"]), `(${path.relative(ROOT, py) || py})`); pyOk = true; if (!py.includes(".venv")) note("this is not the project's own .venv", "npm run setup makes .venv and installs requirements.txt into it"); }
catch { miss(`Python (${py})`, "install Python 3.10 or later, then: npm run setup"); }
if (pyOk) {
  const need = { numpy: "numpy", scipy: "scipy", librosa: "librosa", soundfile: "soundfile", cv2: "opencv-python-headless", PIL: "pillow", imageio_ffmpeg: "imageio-ffmpeg" };
  const found = JSON.parse(run(py, ["-c", `import importlib.util, json; print(json.dumps({m: importlib.util.find_spec(m) is not None for m in ${JSON.stringify([...Object.keys(need), "faster_whisper"])}}))`]));
  const lacking = Object.keys(need).filter((m) => !found[m]);
  if (lacking.length) miss(`Python packages: ${lacking.map((m) => need[m]).join(", ")}`, "npm run setup   (or: .venv/bin/python -m pip install -r requirements.txt)");
  else ok("numpy, scipy, librosa, soundfile, opencv, pillow, imageio-ffmpeg");
  if (!found.faster_whisper) note("faster-whisper is not installed", "only lyric transcription needs it (analysis/song.py --lyrics)");
}

console.log("ffmpeg");
try { const f = ffmpeg(); ok(run(f, ["-version"]).split("\n")[0].split(" Copyright")[0], `(${f.includes("imageio") ? "the one imageio-ffmpeg carries" : f})`); }
catch { miss("ffmpeg", "npm run setup installs imageio-ffmpeg, which carries one; or install ffmpeg and set FFMPEG=/path/to/ffmpeg"); }

console.log("Chrome");
let chrome = null;
try { chrome = findChrome(); let v = ""; try { v = run(chrome, ["--version"]); } catch { /* some builds do not answer */ } ok(v || "found", `(${chrome})`); }
catch (e) { miss("Chrome or Chromium", "install Google Chrome or Chromium. If it is installed somewhere unusual: CHROME=/path/to/chrome npm run doctor"); }
if (chrome && fs.existsSync(path.join(ROOT, "node_modules/playwright-core"))) {
  const { chromium } = await import("playwright-core");
  const probe = async (args) => {
    const b = await chromium.launch({ executablePath: chrome, args });
    try {
      const page = await b.newPage();
      return await page.evaluate(() => {
        const gl = document.createElement("canvas").getContext("webgl2"); if (!gl) return { gl: null };
        const d = gl.getExtension("WEBGL_debug_renderer_info"), w = (f) => { const c = document.createElement("canvas").getContext("2d"); c.font = `40px ${f}`; return c.measureText("トラブル mmmmiiii 0123").width; };
        return { gl: d ? gl.getParameter(d.UNMASKED_RENDERER_WEBGL) : "unknown", mono: w('"DejaVu Sans Mono", serif') !== w("serif") };
      });
    } finally { await b.close(); }
  };
  try {
    const r = await probe(chromeArgs()), soft = /swiftshader|llvmpipe|softpipe/i.test(r.gl ?? "");
    if (!r.gl) miss("WebGL 2 in headless Chrome", "update Chrome; if the machine has no GPU, try SOFTWARE=1 npm run doctor");
    else if (software()) ok(`software rendering (SOFTWARE=1): ${r.gl}`, "\n           slow (about a seventh of a laptop GPU's speed), and not bit for bit what a GPU draws");
    else if (soft) {
      note(`Chrome is not drawing on a GPU here: ${r.gl}`, "render.mjs refuses this unless told: add --software to render.mjs or scripts/starter.mjs (or set SOFTWARE=1). It works, slowly.");
    } else ok(`WebGL on the GPU: ${r.gl}`);
    if (r.gl) { if (r.mono) ok('font "DejaVu Sans Mono" (the sets\' Latin signage)'); else note('font "DejaVu Sans Mono" is not installed', "the sets' Latin signs (C-07, PLAY ...) fall back to another monospace face: the picture is right but not identical to the film's.\n           Debian/Ubuntu: apt install fonts-dejavu-core   macOS: brew install --cask font-dejavu"); }
  } catch (e) { miss("headless Chrome did not start", String(e.message ?? e).split("\n")[0] + "\n           on a machine with no display or GPU, try: SOFTWARE=1 npm run doctor"); }
}

console.log("The project's files");
if (fs.existsSync(path.join(ROOT, "fonts/DelaGothicOne-Regular.ttf"))) ok("fonts/DelaGothicOne-Regular.ttf (titles and name cards)"); else miss("fonts/DelaGothicOne-Regular.ttf", "it is in the repository: git checkout fonts/");
const song = ["audio.wav", "analysis/listen.json", "analysis/stems.json", "analysis/lyrics.json"].filter((f) => !fs.existsSync(path.join(ROOT, f)));
if (song.length) miss(`the demo song: ${song.join(", ")}`, "they are in the repository: git checkout audio.wav analysis/"); else ok("the demo song and what was measured of it (audio.wav, analysis/)");
let cels = 0, gone = [];
for (const k of fs.readdirSync(path.join(ROOT, "kits"))) {
  const f = path.join(ROOT, "kits", k, "kit.json"); if (!fs.existsSync(f)) continue;
  const kit = JSON.parse(fs.readFileSync(f)), imgs = [...Object.values(kit.actions ?? {}).flatMap((a) => Object.values(a.views)).flatMap((v) => Object.values(v.cels)), ...Object.values(kit.heroes ?? {})].map((c) => c.img);
  for (const i of imgs) { cels++; if (!fs.existsSync(path.join(ROOT, "kits", k, i))) gone.push(`kits/${k}/${i}`); }
}
if (gone.length) miss(`${gone.length} of the cast's ${cels} drawings (${gone.slice(0, 3).join(", ")} ...)`, "a partial clone? git status; git checkout kits/"); else ok(`the cast: ${cels} drawings in kits/, all present`);

console.log("Optional");
const env = fs.existsSync(path.join(ROOT, ".env")) ? fs.readFileSync(path.join(ROOT, ".env"), "utf8") : "";
if (process.env.GEMINI_API_KEY || /^GEMINI_API_KEY=\S+/m.test(env)) ok("GEMINI_API_KEY is set (new drawings can be made)");
else note("no GEMINI_API_KEY", "needed only to make NEW drawings (pipeline/paint.py ...). Rendering and everything with the existing cast works without it. See .env.example");

console.log(bad ? `\n${bad} thing${bad === 1 ? "" : "s"} missing. Fix the lines marked MISSING and run this again.` : "\nReady. Next: npm run hello   (about a minute: renders out/hello.mp4)");
process.exit(bad ? 1 : 0);
