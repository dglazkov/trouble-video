// Rasterise each traced SVG back to a 2048 PNG in Chrome, so the render uses the vectors, not the generated pixels.
import { chromium } from "playwright-core";
import fs from "node:fs";
const dir = "out/bakeoff/face/cels";
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome" });
const p = await b.newPage({ viewport: { width: 2048, height: 2048 } });
for (const n of ["face", "blink", "shout", "shock", "grin"]) {
  const svg = fs.readFileSync(`${dir}/${n}.svg`, "utf8");
  await p.setContent(`<body style="margin:0;background:#fff">${svg.replace("<svg", '<svg style="width:2048px;height:2048px;display:block"')}</body>`);
  await p.screenshot({ path: `${dir}/${n}.png` });
}
await b.close();
