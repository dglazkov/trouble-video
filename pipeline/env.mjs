// What of this machine the project's tools use: where Chrome is, how it draws, which Python, which ffmpeg.
// No dependencies, so the checks that need no browser (engine/marks.mjs, engine/motion.mjs, doctor.mjs) can read it.
import fs from "node:fs"; import path from "node:path"; import { execFileSync } from "node:child_process"; import { fileURLToPath } from "node:url";
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Which Chrome: $CHROME (or $PUPPETEER_EXECUTABLE_PATH, $CHROME_PATH) if set, else the first of the usual places that
// exists (Linux, macOS, Windows), else whatever google-chrome, chromium ... is on the PATH. Any recent Chrome or
// Chromium will do; nothing is downloaded.
const PLACES = ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/snap/bin/chromium", "/opt/google/chrome/chrome",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Chromium.app/Contents/MacOS/Chromium", "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
  "C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe"];
export function findChrome() {
  for (const v of ["CHROME", "PUPPETEER_EXECUTABLE_PATH", "CHROME_PATH"]) {
    const p = process.env[v]; if (!p) continue;
    if (!fs.existsSync(p)) throw new Error(`$${v} is ${p}, and there is no such file. Set it to a Chrome or Chromium executable.`);
    return p;
  }
  for (const p of PLACES) if (fs.existsSync(p)) return p;
  for (const n of ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "chrome"]) {
    try { const p = execFileSync(process.platform === "win32" ? "where" : "which", [n], { stdio: ["ignore", "pipe", "ignore"] }).toString().split(/\r?\n/)[0].trim(); if (p) return p; } catch { /* not on the PATH */ }
  }
  throw new Error("No Chrome or Chromium found. Install Google Chrome (or Chromium); if it is somewhere unusual, say where:  CHROME=/path/to/chrome node render.mjs ...");
}
// How Chrome draws: on the machine's GPU by default. SOFTWARE=1 in the environment (render.mjs --software sets it) asks
// for Chrome's own software renderer instead (SwiftShader), for a machine with no GPU. It is several times slower, and
// its pictures are not bit for bit a GPU's.
export const software = () => ["1", "true"].includes(process.env.SOFTWARE ?? "");
export const chromeArgs = () => software() ? ["--use-angle=swiftshader", "--use-gl=angle", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] : ["--use-angle=gl", "--enable-gpu", "--ignore-gpu-blocklist"];
// The Python that the Python steps run on: $PYTHON if set, else the project's own .venv (npm run setup makes it), else python3.
export function python() {
  for (const p of [process.env.PYTHON, path.join(ROOT, ".venv/bin/python"), path.join(ROOT, ".venv/Scripts/python.exe")]) if (p && fs.existsSync(p)) return p;
  return process.env.PYTHON || "python3";
}
// ffmpeg: $FFMPEG if set, else the one imageio-ffmpeg carries (in requirements.txt, so no system install is needed), else `ffmpeg` on the PATH.
export function ffmpeg() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  try { return execFileSync(python(), ["-c", "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"], { stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); } catch { return "ffmpeg"; }
}
