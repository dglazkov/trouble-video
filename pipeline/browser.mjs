// Headless Chrome on the project's files: a static server on the project root and one page, for the steps that
// draw with the engine (layout templates, renders).
import { chromium } from "playwright-core";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp" };
export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");

export async function open(urlPath, { width = 1920, height = 1080 } = {}) {
  const srv = http.createServer((q, r) => {
    if (q.url === "/favicon.ico") { r.writeHead(204); return r.end(); }
    const f = path.join(ROOT, decodeURIComponent(q.url.split("?")[0]));
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
    r.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream", "cache-control": "no-store" });
    fs.createReadStream(f).pipe(r);
  }).listen(0);
  const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--use-angle=gl", "--enable-gpu", "--ignore-gpu-blocklist"] });
  const page = await browser.newPage({ viewport: { width, height } });
  const fail = (m) => { console.error(m); process.exitCode = 1; };
  page.on("pageerror", (e) => fail("page error: " + (e.stack || e)));
  page.on("console", (m) => { if (m.type() === "error") fail("console: " + m.text()); });
  page.on("requestfailed", (q) => fail("request failed: " + q.url()));
  page.on("response", (r) => { if (r.status() >= 400) fail(`HTTP ${r.status()}: ${r.url()}`); });
  await page.goto(`http://localhost:${srv.address().port}${urlPath}`);
  await page.waitForFunction("window.ready || window.failed", null, { timeout: 60000 });
  const failed = await page.evaluate("window.failed");
  if (failed) { await browser.close(); srv.close(); throw new Error(failed); }
  return { page, close: async () => { await browser.close(); srv.close(); } };
}
export const savePng = (file, dataUrl) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, Buffer.from(dataUrl.split(",")[1], "base64")); };
