// Checks a kit and the engine it hangs on, without a browser: node pipeline/check.mjs NAME [--kit DIR]
// Prints a JSON report and exits 1 if anything fails. What it holds:
//  - the body stands on the ground at its stated height, and a run never puts a foot through the floor;
//  - the view picker names the right drawing for each of eight directions and does not flicker on a boundary;
//  - the kit has all five views, every view the parts a body needs, every part its files and the joints it hangs
//    from, and its attachment points are where a part of that kind can have them.
import fs from "node:fs"; import path from "node:path";
import { proportions, solve, pose, runPose, runStride, idlePose } from "../engine/body.js";
import { nearest, picker, VIEWS } from "../engine/views.js";

const args = process.argv.slice(2), ki = args.indexOf("--kit");
const dirArg = ki >= 0 ? args.splice(ki, 2)[1] : null, name = args[0];
if (!name) { console.error("usage: node pipeline/check.mjs NAME [--kit DIR]"); process.exit(2); }
const dir = dirArg ?? path.join(path.dirname(new URL(import.meta.url).pathname), "..", "kits", name);
const fails = [], ok = (cond, msg) => { if (!cond) fails.push(msg); };
const kit = JSON.parse(fs.readFileSync(path.join(dir, "kit.json"), "utf8")), P = proportions(kit.body);

// body
const stand = solve(P, pose());
ok(Math.abs(stand.J.crown[1] - P.height) < 0.03 * P.height, `standing height is ${stand.J.crown[1].toFixed(3)}, not ${P.height}`);
for (const s of ["L", "R"]) ok(Math.abs(Math.min(stand.J[s].heel[1], stand.J[s].toe[1])) < 1e-6, `standing: ${s} foot is not on the ground`);
let grounded = 0;
for (let i = 0; i < 64; i++) {
  const b = solve(P, runPose(i / 64)), low = Math.min(...["L", "R"].flatMap((s) => [b.J[s].heel[1], b.J[s].toe[1]]));
  ok(low > -1e-6, `run phase ${i}/64: a foot is ${(-low).toFixed(3)} under the ground`);
  if (low < 1e-6) grounded++;
}
ok(grounded > 8, "run: a foot is planted in too few phases to read as contact");
const stride = runStride(P);
ok(stride > 0.8 * P.height && stride < 3.5 * P.height, `run stride per cycle is ${stride.toFixed(2)}: not a run`);
solve(P, idlePose(1.3));

// views
const want = { 0: "front", 45: "front34", 90: "side", 135: "back34", 180: "back", [-45]: "front34", [-90]: "side", [-135]: "back34" };
for (const [a, v] of Object.entries(want)) { const n = nearest(+a); ok(n.view === v && (v === "front" || v === "back" || n.mirror === (+a < 0)), `yaw ${a} picks ${n.view}${n.mirror ? " mirrored" : ""}`); }
{ const pick = picker(); let changes = 0, last = null;
  for (let i = 0; i < 200; i++) { const p = pick(22.5 + 5 * Math.sin(i)); const key = p.view + p.mirror; if (last && key !== last) changes++; last = key; }
  ok(changes === 0, `the picker changed drawing ${changes} times while hovering on a boundary`); }
{ const pick = picker(); const seen = new Set(); for (let a = -180; a <= 180; a += 1) { const p = pick(a); seen.add(p.view + (p.mirror ? "*" : "")); }
  ok(seen.size >= 8, `a full turn showed ${seen.size} drawings, not eight`); }

// kit
const need = ["head", "neck", "torso", "pelvis"], limbs = ["uarm", "farm", "thigh", "shin", "shoe"];
const joint = (n) => n.includes(".") ? stand.J[n.split(".")[0]]?.[n.split(".")[1]] : stand.J[n];
let parts = 0;
for (const v of VIEWS) {
  const view = kit.views[v.name];
  if (!view) { fails.push(`no ${v.name} view`); continue; }
  for (const n of need) ok(view.parts[n], `${v.name}: no ${n}`);
  for (const n of limbs) ok(view.parts[n + "_L"] || view.parts[n + "_R"], `${v.name}: no ${n} for either side`);
  for (const [n, p] of Object.entries(view.parts)) {
    parts++;
    for (const f of [p.img, p.img.replace(".png", "_in.png"), ...Object.values(p.variants ?? {})]) ok(fs.existsSync(path.join(dir, f)), `${v.name}/${n}: missing file ${f}`);
    ok(p.k > 100, `${v.name}/${n}: scale ${p.k} px per unit`);
    for (const [key, jn] of Object.entries(p.joints)) { ok(joint(jn), `${v.name}/${n}: hangs from an unknown joint ${jn}`); ok(Array.isArray(p.pts[key]), `${v.name}/${n}: no point for ${key}`); }
    const two = p.kind === "bent" ? ["hip", "knee", "ankle"] : ["a", "b"];
    for (const key of two) ok(p.pts[key], `${v.name}/${n}: no ${key} point`);
    // a limb's own joints lie inside its drawing; trunk parts may hang from joints beyond their edge
    if (["uarm", "farm", "thigh", "shin", "bent", "neck", "head"].includes(p.kind)) for (const key of two) {
      const q = p.pts[key]; if (!q) continue;
      ok(q[0] > -0.15 * p.w && q[0] < 1.15 * p.w && q[1] > -0.15 * p.h && q[1] < 1.15 * p.h, `${v.name}/${n}: point ${key} at ${q} is outside its ${p.w}x${p.h} drawing`);
    }
    if (p.pts.a && p.pts.b) ok(Math.hypot(p.pts.a[0] - p.pts.b[0], p.pts.a[1] - p.pts.b[1]) > 8, `${v.name}/${n}: its two points coincide`);
  }
}
console.log(JSON.stringify({ kit: name, views: Object.keys(kit.views).length, parts, stride: +stride.toFixed(3), failures: fails }, null, 1));
process.exit(fails.length ? 1 : 0);
