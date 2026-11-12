// Camera agreement check: node sets/agree.mjs [--json]
// Renders shots/set_markers.js (markers at known 3D points, drawn by the sets' three.js camera), finds the markers in the
// frames, and compares each with where engine/body.js's camera() puts the same point: what the character layer will use.
// Exit status 1 if any marker is missing or more than 1.5 px off.
import fs from "node:fs"; import path from "node:path"; import { execFileSync } from "node:child_process";
import { camera } from "../engine/body.js"; import { createSync } from "../engine/sync.js";
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), ".."), dir = path.join(ROOT, "out/set_markers/frames"), json = process.argv.includes("--json");
const { VIEWS, default: shot } = await import("../shots/set_markers.js");
const sync = createSync(JSON.parse(fs.readFileSync(path.join(ROOT, "analysis/listen.json"))), JSON.parse(fs.readFileSync(path.join(ROOT, "analysis/stems.json"))));
execFileSync("node", [path.join(ROOT, "sets/capture.mjs"), path.join(ROOT, "shots/set_markers.js"), "--range", `0-${VIEWS.length - 1}`, "--out", dir], { stdio: ["ignore", "ignore", "inherit"] });
let worst = 0, bad = 0; const report = [];
VIEWS.forEach((v, i) => {
  const fr = shot.frame(i, sync), cam = camera({ fov: 30, ...fr.camera, w: 1920, h: 1080 }), file = path.join(dir, `f${String(i).padStart(4, "0")}.png`);
  const found = JSON.parse(execFileSync(path.join(ROOT, ".venv/bin/python"), [path.join(ROOT, "sets/find_markers.py"), file]).toString());
  const rows = v.points.map((p) => { const e = cam.project(p); let best = null; for (const m of found) { const d = Math.hypot(m[0] - e.x, m[1] - e.y); if (!best || d < best.d) best = { d, m }; }
    const ok = best && best.d <= 1.5; if (!ok) bad++; else worst = Math.max(worst, best.d);
    return { point: p, expected: [+e.x.toFixed(2), +e.y.toFixed(2)], rendered: best ? [+best.m[0].toFixed(2), +best.m[1].toFixed(2)] : null, error: best ? +best.d.toFixed(2) : null, ok }; });
  report.push({ view: v.name, set: fr.set, camera: fr.camera, frame: path.relative(ROOT, file), markers: rows });
});
if (json) console.log(JSON.stringify({ worst: +worst.toFixed(2), bad, views: report }));
else { for (const v of report) { console.log(`${v.view}  [${v.set}]  camera pos ${v.camera.pos.map((x) => x.toFixed(3))} target ${v.camera.target.map((x) => x.toFixed(3))} fov ${v.camera.fov.toFixed(2)}`); for (const m of v.markers) console.log(`  point ${JSON.stringify(m.point).padEnd(16)} body.js ${JSON.stringify(m.expected).padEnd(20)} rendered ${JSON.stringify(m.rendered).padEnd(20)} off ${m.error} px ${m.ok ? "" : " <-- BAD"}`); } console.log(`worst ${worst.toFixed(2)} px, ${bad} bad`); }
process.exit(bad ? 1 : 0);
