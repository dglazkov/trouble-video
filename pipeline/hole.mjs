// The hole a character leaves in a wall they go through: the outline of their own drawing on the frame they hit it.
//   node pipeline/hole.mjs SHOT.js --frame F --who NAME --z Z [--grow 0.03] [--points 90] [--floor 0.08] --out shots/X_hole.js
// Takes the drawing the shot shows NAME on at frame F (a hero drawing or a kit's cel), where the stage hangs it on the
// frame through the shot's camera there, and throws its outline back along the camera's rays onto the plane z = Z (the
// face of the wall the camera sees). Writes a module `export const HOLE = [[x, y], ...]` (metres: x across, y up), which
// sets/corridor.js `holes` cuts out of a shutter: from that camera the hole is the drawing's shape exactly.
// --grow: metres added all round; --points: about how many corners the outline keeps; --floor: nothing of it lower than this.
// Prints one JSON line: the file, the number of points and the hole's box. Run it again if the drawing or the camera changes.
import fs from "node:fs"; import path from "node:path"; import { execFileSync } from "node:child_process";
import { proportions, solve, camera } from "../engine/body.js";
import { createActor, hang } from "../engine/cels.js";
import { actorPose, celIndex } from "../engine/actions.js";
import { songOf, ROOT } from "../engine/song.mjs"; import { python } from "./env.mjs";
const argv = process.argv.slice(2), opt = (n, d) => { const i = argv.indexOf(n); return i >= 0 ? argv.splice(i, 2)[1] : d; };
const F = Number(opt("--frame", NaN)), who = opt("--who", null), Z = Number(opt("--z", NaN)), grow = Number(opt("--grow", 0.03)), points = Number(opt("--points", 90)), floor = Number(opt("--floor", 0.08)), out = opt("--out", null), file = argv[0];
if (!file || !who || !out || isNaN(F) || isNaN(Z) || argv.includes("--help")) { console.error(fs.readFileSync(new URL(import.meta.url), "utf8").split("\n").filter((l) => l.startsWith("//")).join("\n")); process.exit(2); }
const shot = (await import(path.resolve(file))).default, { sync } = songOf(shot);
const fr = shot.frame(F, sync), a = fr.actors.find((x) => x.who === who); if (!a) throw new Error(`${shot.name}: no "${who}" on frame ${F}`);
const kitDir = path.join(ROOT, shot.cast[who]), kit = JSON.parse(fs.readFileSync(path.join(kitDir, "kit.json"))), W = shot.width ?? 1920, H = shot.height ?? 1080;
const cam = camera({ fov: 30, ...fr.camera, w: W, h: H }), body = solve(proportions(kit.body), actorPose(a)), pick = createActor(kit).pick(a.action, celIndex(a.action, a.phase), body, cam, a.hero), h = hang(kit, pick, body, cam);
if (!h) throw new Error(`${who} has no drawing for frame ${F}`);
// the drawing's outline, in its own pixels (the largest piece of it, gaps closed, simplified)
const py = `
import sys, json, cv2, numpy as np
from PIL import Image
a = np.array(Image.open(sys.argv[1]).convert("RGBA"))[:, :, 3]; n = int(sys.argv[2])
m = cv2.copyMakeBorder((a > 128).astype(np.uint8) * 255, 40, 40, 40, 40, cv2.BORDER_CONSTANT, value=0)
m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (31, 31)))
c = max(cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)[0], key=cv2.contourArea)
lo, hi = 0.0002, 0.02
for _ in range(30):
    e = (lo + hi) / 2; p = cv2.approxPolyDP(c, e * cv2.arcLength(c, True), True)
    if len(p) > n: lo = e
    else: hi = e
print(json.dumps((p.reshape(-1, 2) - 40).tolist()))
`;
const px = JSON.parse(execFileSync(python(), ["-c", py, path.join(kitDir, h.cel.img), String(points)]).toString());
// back along the camera's rays onto the plane
const f = (H / 2) / Math.tan((cam.fov ?? 30) * Math.PI / 360);
let P = px.map((p) => { const [sx, sy] = h.at(p), d = [0, 1, 2].map((i) => cam.fwd[i] + cam.right[i] * (sx - W / 2) / f + cam.up[i] * (H / 2 - sy) / f), t = (Z - cam.pos[2]) / d[2]; return [cam.pos[0] + d[0] * t, cam.pos[1] + d[1] * t]; });
// a little larger all round (each corner out along its two edges' normals), and nothing under the floor line
let area = 0; P.forEach((p, i) => { const q = P[(i + 1) % P.length]; area += p[0] * q[1] - q[0] * p[1]; }); const s = area > 0 ? 1 : -1, n = P.length;
P = P.map((p, i) => { const a = P[(i + n - 1) % n], b = P[(i + 1) % n], e1 = [p[0] - a[0], p[1] - a[1]], e2 = [b[0] - p[0], b[1] - p[1]], l1 = Math.hypot(...e1) || 1, l2 = Math.hypot(...e2) || 1, nx = s * (e1[1] / l1 + e2[1] / l2), ny = -s * (e1[0] / l1 + e2[0] / l2), l = Math.hypot(nx, ny) || 1; return [+(p[0] + nx / l * grow).toFixed(3), +Math.max(floor, p[1] + ny / l * grow).toFixed(3)]; });
const xs = P.map((p) => p[0]), ys = P.map((p) => p[1]), box = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
fs.writeFileSync(path.resolve(out), `// The hole ${who} leaves: the outline of the drawing ${pick.view} on frame ${F} of ${path.relative(ROOT, path.resolve(file))}, thrown onto z = ${Z} through that frame's camera.\n// Written by: node pipeline/hole.mjs ${path.relative(ROOT, path.resolve(file))} --frame ${F} --who ${who} --z ${Z} --grow ${grow} --points ${points} --floor ${floor} --out ${path.relative(ROOT, path.resolve(out))}\n// (metres: x across, y up from the floor; ${(box[2] - box[0]).toFixed(2)} m wide, ${(box[3] - box[1]).toFixed(2)} m high). Do not edit: run it again when the drawing or the camera changes.\nexport const HOLE = ${JSON.stringify(P)};\n`);
console.log(JSON.stringify({ out: path.relative(ROOT, path.resolve(out)), points: P.length, box, drawing: pick.view }));
