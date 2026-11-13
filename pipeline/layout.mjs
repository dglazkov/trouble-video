// Layout step of a cel kit: the sheet of posing dummies an action's cels are painted over, and where the skeleton is in it.
//   node pipeline/layout.mjs NAME ACTION VIEW [--cols 4] [--aspect 16:9] [--only 0,1,2,3] [--out STEM]
// -> kits/NAME/source/ACTION/VIEW/layout.png (the dummies), layout_map.png (which body part is where, for the
//    checks) and layout.json (per cel: its cell, the ground point under the root, every joint, and the sheet's scale
//    in pixels per body unit). --only puts some of the action's cels on the sheet, at the scale that many allow;
//    --out names the files (default "layout").
//   node pipeline/layout.mjs NAME hero SHEET --shot shots/X.js --frames 7:leap_a,13:leap_b [--what "what the drawings show"]
// -> kits/NAME/source/hero/SHEET/layout.*: HERO drawings, one-off drawings for a shot's own camera. Each mannequin
//    is the character as the shot shows them on that frame (its pose there, seen through the shot's camera, with its
//    perspective), named; cels.py make NAME hero SHEET paints, checks and cuts them into kits/NAME/hero/, and a shot
//    shows one by giving its actor `hero: "leap_a"`. --stand: the figures stand on a floor (a walk): each drawing is
//    registered by the lowest point of its feet, so a thicker sole than the mannequin's stands on the floor, not in it.
import fs from "node:fs"; import path from "node:path";
import { open, savePng, ROOT } from "./browser.mjs"; import { songOf } from "../engine/song.mjs";

const argv = process.argv.slice(2), opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv.splice(i, 2)[1] : d; };
const standI = argv.indexOf("--stand"), stand = standI >= 0; if (stand) argv.splice(standI, 1);
const shotFile = opt("--shot", null), heroFrames = opt("--frames", null), what = opt("--what", "");
const cols = Number(opt("--cols", 4)), aspect = opt("--aspect", "16:9"), only = opt("--only", null), stem = opt("--out", "layout");
const [name, action, view] = argv;
if (!view || name === "--help") { console.error(fs.readFileSync(new URL(import.meta.url), "utf8").split("\n").filter((l) => l.startsWith("//")).join("\n")); process.exit(2); }
// the sizes the image model draws at (its "2K"; "4K" is twice this): a sheet of exactly that shape comes back unstretched
const SIZES = { "16:9": [2752, 1536], "9:16": [1536, 2752], "1:1": [2048, 2048], "3:4": [1792, 2400], "4:3": [2400, 1792], "2:3": [1696, 2528], "3:2": [2528, 1696] };
if (!SIZES[aspect]) { console.error(`no such aspect: ${aspect} (one of ${Object.keys(SIZES).join(", ")})`); process.exit(2); }
const [W, H] = SIZES[aspect];
const spec = JSON.parse(fs.readFileSync(path.join(ROOT, "kits", name, "character.json"), "utf8"));
const dir = path.join(ROOT, "kits", name, "source", action, view);
// the kit's own copy of the body is the character's: a kit with no drawings yet still has a body to pose
const kitFile = path.join(ROOT, "kits", name, "kit.json"), kit = fs.existsSync(kitFile) ? JSON.parse(fs.readFileSync(kitFile, "utf8")) : { name, actions: {} };
if (JSON.stringify(kit.body) !== JSON.stringify(spec.body)) { kit.body = spec.body; fs.writeFileSync(kitFile, JSON.stringify(kit, null, 1)); }
const { page, close } = await open("/pipeline/layout.html");
if (action === "hero" && !(shotFile && heroFrames)) { console.error("a hero sheet needs --shot shots/X.js and --frames FRAME:NAME,..."); process.exit(2); }
const r = action === "hero"
  ? await page.evaluate(([s, u, l, o]) => heroLayout(s, u, l, o), [spec, "/" + path.relative(ROOT, path.resolve(shotFile)), heroFrames.split(",").map((x) => { const [f, n] = x.split(":"); return { frame: Number(f), name: n }; }), { W, H, cols, aspect, sheet: view, what, stand, noLyrics: !songOf((await import(path.resolve(shotFile))).default).lyrics }])
  : await page.evaluate(([s, a, v, o]) => layout(s, a, v, o), [spec, action, view, { W, H, cols, aspect, only: only ? only.split(",").map(Number) : null }]);
await close();
savePng(path.join(dir, stem + ".png"), r.png); savePng(path.join(dir, stem + "_map.png"), r.map);
fs.writeFileSync(path.join(dir, stem + ".json"), JSON.stringify(r.layout));
console.log(JSON.stringify({ layout: path.relative(ROOT, path.join(dir, stem + ".png")), cels: r.layout.cels.length, unit: r.layout.unit, size: [W, H] }));
