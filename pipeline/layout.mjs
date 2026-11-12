// Layout step of a cel kit: the sheet of posing dummies an action's cels are painted over, and where the skeleton is in it.
//   node pipeline/layout.mjs NAME ACTION VIEW [--cols 4] [--aspect 16:9] [--only 0,1,2,3] [--out STEM]
// -> kits/NAME/source/ACTION/VIEW/layout.png (the dummies), layout_map.png (which body part is where, for the
//    checks) and layout.json (per cel: its cell, the ground point under the root, every joint, and the sheet's scale
//    in pixels per body unit). --only puts some of the action's cels on the sheet, at the scale that many allow;
//    --out names the files (default "layout").
import fs from "node:fs"; import path from "node:path";
import { open, savePng, ROOT } from "./browser.mjs";

const argv = process.argv.slice(2), opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv.splice(i, 2)[1] : d; };
const cols = Number(opt("--cols", 4)), aspect = opt("--aspect", "16:9"), only = opt("--only", null), stem = opt("--out", "layout");
const [name, action, view] = argv;
if (!view || name === "--help") { console.error(fs.readFileSync(new URL(import.meta.url), "utf8").split("\n").filter((l) => l.startsWith("//")).join("\n")); process.exit(2); }
// the sizes the image model draws at (its "2K"; "4K" is twice this): a sheet of exactly that shape comes back unstretched
const SIZES = { "16:9": [2752, 1536], "9:16": [1536, 2752], "1:1": [2048, 2048], "3:4": [1792, 2400], "4:3": [2400, 1792], "2:3": [1696, 2528], "3:2": [2528, 1696] };
if (!SIZES[aspect]) { console.error(`no such aspect: ${aspect} (one of ${Object.keys(SIZES).join(", ")})`); process.exit(2); }
const [W, H] = SIZES[aspect];
const spec = JSON.parse(fs.readFileSync(path.join(ROOT, "kits", name, "character.json"), "utf8"));
const dir = path.join(ROOT, "kits", name, "source", action, view);
const { page, close } = await open("/pipeline/layout.html");
const r = await page.evaluate(([s, a, v, o]) => layout(s, a, v, o), [spec, action, view, { W, H, cols, aspect, only: only ? only.split(",").map(Number) : null }]);
await close();
savePng(path.join(dir, stem + ".png"), r.png); savePng(path.join(dir, stem + "_map.png"), r.map);
fs.writeFileSync(path.join(dir, stem + ".json"), JSON.stringify(r.layout));
console.log(JSON.stringify({ layout: path.relative(ROOT, path.join(dir, stem + ".png")), cels: r.layout.cels.length, unit: r.layout.unit, size: [W, H] }));
