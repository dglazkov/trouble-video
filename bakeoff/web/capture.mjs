// Frame-by-frame capture: headless system Chrome + hardware WebGL2 via playwright-core.
// usage: node bakeoff/web/capture.mjs [all | f1 f2 ...] [--out dir]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const args = process.argv.slice(2);
let outDir = path.join(root, 'out/bakeoff/web/frames');
const oi = args.indexOf('--out');
if (oi >= 0) { outDir = path.resolve(args[oi + 1]); args.splice(oi, 2); }
const frames = (args.length === 0 || args[0] === 'all')
  ? Array.from({ length: 72 }, (_, i) => i) : args.map(Number);
fs.mkdirSync(outDir, { recursive: true });

const mime = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(root) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'content-type': mime[path.extname(p)] || 'application/octet-stream', 'cache-control': 'no-store' });
  fs.createReadStream(p).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const browser = await chromium.launch({
  executablePath: '/usr/bin/google-chrome', headless: true,
  args: ['--use-angle=gl', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader=0', '--hide-scrollbars'],
});
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on('console', m => console.log('[page]', m.text()));
page.on('pageerror', e => { console.error('[pageerror]', e.stack || e.message); });
await page.goto(`http://127.0.0.1:${port}/bakeoff/web/index.html`);
await page.waitForFunction('window.ready === true || window.fatal', null, { timeout: 30000 });
const gpu = await page.evaluate('window.gpuInfo');
console.log('GPU renderer:', gpu);
if (/swiftshader|llvmpipe/i.test(gpu) || !/intel/i.test(gpu)) { console.error('NOT hardware Intel GPU, aborting'); await browser.close(); server.close(); process.exit(1); }

const t0 = Date.now();
let tRender = 0;
for (const f of frames) {
  const a = Date.now();
  const url = await page.evaluate(f => { const ms = window.renderFrame(f); return [window.canvasPNG(), ms]; }, f);
  tRender += url[1];
  fs.writeFileSync(path.join(outDir, `f${String(f).padStart(4, '0')}.png`), Buffer.from(url[0].slice(22), 'base64'));
  if (frames.length < 12) console.log(`frame ${f}: ${Date.now() - a} ms (render+readback ${url[1].toFixed(0)} ms)`);
}
const tot = (Date.now() - t0) / 1000;
console.log(`captured ${frames.length} frames in ${tot.toFixed(2)} s = ${(tot / frames.length).toFixed(3)} s/frame (GPU render+finish avg ${(tRender / frames.length).toFixed(0)} ms)`);
await browser.close();
server.close();
