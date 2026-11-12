// Write the mannequin for eight phases of the run: node bakeoff/pose/guide.mjs [yaw]
import { chromium } from "playwright-core";
import http from "node:http"; import fs from "node:fs"; import path from "node:path";
const root = process.cwd(), yaw = Number(process.argv[2] ?? -62);
const types = { ".html": "text/html", ".js": "text/javascript" };
const srv = http.createServer((q, r) => { const f = path.join(root, q.url.split("?")[0]);
  if (!fs.existsSync(f)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { "content-type": types[path.extname(f)] }); fs.createReadStream(f).pipe(r); }).listen(0);
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome" });
const p = await b.newPage({ viewport: { width: 1024, height: 1024 } });
p.on("pageerror", (e) => { console.error(String(e)); process.exit(1); });
await p.goto(`http://localhost:${srv.address().port}/bakeoff/pose/guide.html`); await p.waitForFunction("window.ready");
for (let i = 0; i < 8; i++) { const d = await p.evaluate(([i, yaw]) => { guide(i / 8, yaw); return document.getElementById("c").toDataURL("image/png"); }, [i, yaw]);
  fs.writeFileSync(`out/bakeoff/pose/guide/g${i}.png`, Buffer.from(d.split(",")[1], "base64")); }
await b.close(); srv.close();
