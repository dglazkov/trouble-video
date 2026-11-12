// Layout step of a kit: draw what the art is painted over, and write where every joint sits in it.
//   node pipeline/layout.mjs NAME turnaround        -> kits/NAME/source/turnaround_guide.png (+ .json: the view boxes)
//   node pipeline/layout.mjs NAME VIEW [VIEW ...]   -> kits/NAME/source/VIEW/template.png, key.png + layout.json
//   node pipeline/layout.mjs NAME all               -> every view
//   --unit N                                        -> cap the sheet's scale at N pixels per body unit
import fs from "node:fs"; import path from "node:path";
import { open, savePng, ROOT } from "./browser.mjs";

const argv = process.argv.slice(2), ui = argv.indexOf("--unit");
const maxUnit = ui >= 0 ? Number(argv.splice(ui, 2)[1]) : 1500;   // the most pixels per body unit a sheet may draw at
const [name, ...what] = argv;
if (!name || !what.length || name === "--help") { console.error("usage: node pipeline/layout.mjs NAME turnaround|all|VIEW..."); process.exit(2); }
const dir = path.join(ROOT, "kits", name), spec = JSON.parse(fs.readFileSync(path.join(dir, "character.json"), "utf8"));
const VIEWS = ["front", "front34", "side", "back34", "back"];
const { page, close } = await open("/pipeline/layout.html");
for (const w of what.flatMap((w) => w === "all" ? VIEWS : [w])) {
  if (w === "turnaround") {
    const r = await page.evaluate((s) => turnaround(s), spec);
    savePng(path.join(dir, "source", "turnaround_guide.png"), r.png);
    fs.writeFileSync(path.join(dir, "source", "turnaround_guide.json"), JSON.stringify({ boxes: r.boxes }, null, 1));
    console.log("wrote", `kits/${name}/source/turnaround_guide.png`);
  } else {
    if (!VIEWS.includes(w)) { console.error("no such view: " + w); process.exitCode = 2; continue; }
    const r = await page.evaluate(([s, v, u]) => template(s, v, u), [spec, w, maxUnit]);
    savePng(path.join(dir, "source", w, "template.png"), r.png); savePng(path.join(dir, "source", w, "key.png"), r.key);
    fs.writeFileSync(path.join(dir, "source", w, "layout.json"), JSON.stringify(r.layout, null, 1));
    console.log("wrote", `kits/${name}/source/${w}/template.png`, "unit", r.layout.unit, "parts", Object.keys(r.layout.parts).length);
  }
}
await close();
