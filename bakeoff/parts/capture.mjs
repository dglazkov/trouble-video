// Capture the parts-on-rig run: node bakeoff/parts/capture.mjs OUTDIR [query] [frame ...]
import { chromium } from "playwright-core";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
const root = process.cwd(), out = process.argv[2] || "out/bakeoff/parts/frames", query = process.argv[3] || "";
fs.mkdirSync(out, { recursive: true });
const types = { ".html": "text/html", ".png": "image/png", ".js": "text/javascript", ".json": "application/json" };
const srv = http.createServer((q, r) => { const f = path.join(root, decodeURIComponent(q.url.split("?")[0]));
  if (!f.startsWith(root) || !fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "content-type": types[path.extname(f)] || "application/octet-stream" }); fs.createReadStream(f).pipe(r); }).listen(0);
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--use-angle=gl", "--enable-gpu", "--ignore-gpu-blocklist"] });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
p.on("pageerror", (e) => { console.error(String(e)); process.exit(1); });
p.on("console", (m) => { if (m.type() === "error") console.error(m.text()); });
await p.goto(`http://localhost:${srv.address().port}/bakeoff/parts/index.html?${query}`);
await p.waitForFunction("window.ready", null, { timeout: 20000 });
const frames = process.argv.length > 4 ? process.argv.slice(4).map(Number) : [...Array(72).keys()];
const t0 = Date.now();
for (const f of frames) {
  const d = await p.evaluate((f) => { renderFrame(f); return document.getElementById("c").toDataURL("image/png"); }, f);
  fs.writeFileSync(`${out}/f${String(f).padStart(4, "0")}.png`, Buffer.from(d.split(",")[1], "base64"));
}
console.log(`${frames.length} frames in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
await b.close(); srv.close();
