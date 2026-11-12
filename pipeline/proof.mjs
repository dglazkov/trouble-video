// Proof of a kit: frames of a shot with the kit's drawings on the shot's plain backdrop, nothing else over them.
//   node pipeline/proof.mjs shots/NAME.js [--frames 0,12] [--debug] [--mannequin] [--out DIR]
// -> out/proof/NAME/f0000.png ... (every frame unless --frames), and the list of files as JSON.
import fs from "node:fs"; import path from "node:path";
import { open, ROOT } from "./browser.mjs";

const args = process.argv.slice(2), flag = (n) => { const i = args.indexOf(n); if (i < 0) return null; const v = args[i + 1] && !args[i + 1].startsWith("--") ? args.splice(i + 1, 1)[0] : true; args.splice(i, 1); return v; };
const debug = flag("--debug"), dummy = flag("--mannequin"), only = flag("--frames"), outDir = flag("--out");
if (!args[0] || flag("--help")) { console.error(fs.readFileSync(new URL(import.meta.url), "utf8").split("\n").filter((l) => l.startsWith("//")).join("\n")); process.exit(2); }
const { page, close } = await open(`/pipeline/proof.html?shot=/${path.relative(ROOT, path.resolve(args[0]))}${debug ? "&debug=1" : ""}${dummy ? "&mannequin=1" : ""}`);
const info = await page.evaluate("window.shotInfo"), dir = outDir ?? path.join(ROOT, "out", "proof", info.name + (debug ? "_debug" : "") + (dummy ? "_mannequin" : ""));
fs.mkdirSync(dir, { recursive: true });
const frames = only ? String(only).split(",").map(Number) : [...Array(info.frames).keys()], files = [];
for (const f of frames) {
  const d = await page.evaluate((f) => { renderFrame(f); return capture(); }, f);
  const file = path.join(dir, `f${String(f).padStart(4, "0")}.png`);
  fs.writeFileSync(file, Buffer.from(d.split(",")[1], "base64")); files.push(path.relative(ROOT, file));
}
await close();
console.log(JSON.stringify({ shot: info.name, frames: files.length, dir: path.relative(ROOT, dir) }));
