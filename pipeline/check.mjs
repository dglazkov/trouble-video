// Checks a cel kit and the engine it hangs on, without a browser: node pipeline/check.mjs NAME [--kit DIR]
// Prints a JSON report and exits 1 if anything fails. What it holds:
//  - the body stands on the ground at its stated height, and a run never puts a foot through the floor;
//  - the view picker names the right drawing for each of eight directions, works with only some views, and does not
//    flicker on a boundary;
//  - an action whose mirrored drawing is "half the action on" really is its own mirror image half a cycle later;
//  - the kit has, for every action and view it claims, every cel of the action with its file, a scale, and a ground
//    point from which the drawing's lowest painted row is where the skeleton's lowest shoe is in that pose: the
//    drawing stands on the ground the skeleton stands on.
import fs from "node:fs"; import path from "node:path";
import { proportions, solve, pose, runPose, runStride, orbit } from "../engine/body.js";
import { nearest, picker, VIEWS } from "../engine/views.js";
import { ACTIONS, celIndex, mirrored, actorPose } from "../engine/actions.js";

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

// views
const want = { 0: "front", 45: "front34", 90: "side", 135: "back34", 180: "back", [-45]: "front34", [-90]: "side", [-135]: "back34" };
for (const [a, v] of Object.entries(want)) { const n = nearest(+a); ok(n.view === v && (v === "front" || v === "back" || n.mirror === (+a < 0)), `yaw ${a} picks ${n.view}${n.mirror ? " mirrored" : ""}`); }
const turn = (names) => { const pick = picker(7, names), seen = new Set(); let changes = 0, last = null;
  for (let a = -180; a <= 180; a += 1) { const p = pick(a), key = p.view + (p.mirror ? "*" : ""); seen.add(key); if (last && key !== last) changes++; last = key; }
  return { seen, changes }; };
ok(turn(null).seen.size >= 8, `a full turn showed ${turn(null).seen.size} drawings, not eight`);
for (const names of [null, ["front34", "side", "back34"], ["side"]]) {
  const pick = picker(7, names); let changes = 0, last = null;
  for (let i = 0; i < 200; i++) { const p = pick(22.5 + 5 * Math.sin(i)); const key = p.view + p.mirror; if (last && key !== last) changes++; last = key; }
  ok(changes === 0, `the picker changed drawing ${changes} times while hovering on a boundary (views: ${names ?? "all"})`);
  const t = turn(names), n = (names ?? VIEWS.map((v) => v.name)).reduce((a, v) => a + (v === "front" || v === "back" ? 1 : 2), 0);
  ok(t.seen.size === n && t.changes === n, `a full turn among ${names ?? "all views"} showed ${t.seen.size} drawings in ${t.changes} changes, not ${n}`);
  if (names) for (const k of t.seen) ok(names.includes(k.replace("*", "")), `the picker chose ${k}, which it was not given`);
}

// actions
const swap = (q) => ({ ...q, twist: -q.twist, pelvisTwist: -q.pelvisTwist, head: { ...q.head, yaw: -q.head.yaw, roll: -q.head.roll }, arm: { L: q.arm.R, R: q.arm.L }, leg: { L: q.leg.R, R: q.leg.L } });
const flat = (q, pre = "") => Object.entries(q).flatMap(([k, v]) => typeof v === "object" ? flat(v, pre + k + ".") : typeof v === "number" ? [[pre + k, v]] : []);
for (const [an, A] of Object.entries(ACTIONS)) {
  ok(celIndex(an, 0) === 0 && celIndex(an, 0.999) === A.cels - 1 && celIndex(an, 1) === (A.loop ? 0 : A.cels - 1), `${an}: phases do not run over its ${A.cels} cels`);
  if (!A.half) continue;
  for (let i = 0; i < A.cels; i++) {
    const a = Object.fromEntries(flat(swap(A.pose(i)))), b = Object.fromEntries(flat(A.pose(mirrored(an, i))));
    for (const k in a) if (k !== "flight" && Math.abs(a[k] - b[k]) > 1e-6) { fails.push(`${an}: cel ${mirrored(an, i)} is not the mirror image of cel ${i} (${k}: ${b[k].toFixed(2)} for ${a[k].toFixed(2)})`); break; }
  }
}

// kit
let cels = 0;
for (const [an, act] of Object.entries(kit.actions ?? {})) {
  const A = ACTIONS[an];
  if (!A) { fails.push(`the kit draws "${an}", which is no action`); continue; }
  for (const [vn, V] of Object.entries(act.views)) {
    const view = VIEWS.find((v) => v.name === vn);
    if (!view) { fails.push(`${an}: no such view as ${vn}`); continue; }
    for (let i = 0; i < A.cels; i++) {
      const c = V.cels[i], at = `${an}/${vn}/${i}`;
      if (!c) { fails.push(`${at}: no drawing`); continue; }
      cels++;
      ok(fs.existsSync(path.join(dir, c.img)), `${at}: missing file ${c.img}`);
      ok(c.k > 100, `${at}: scale ${c.k} px per unit`);
      ok(c.ground[0] > 0 && c.ground[0] < c.w, `${at}: its ground point ${c.ground} is not under its ${c.w}x${c.h} drawing`);
      // the lowest point of the body in this pose, drawn the way the layout drew it, against the drawing's lowest row
      const cam = orbit([0, 0, 0], view.yaw, 10, { ortho: c.k, w: 0, h: 0, cx: c.ground[0], cy: c.ground[1], elev: V.elev ?? 5 });
      const body = solve(P, actorPose({ action: an, phase: i / A.cels }));
      const low = Math.max(...body.vol.flatMap((v) => v.spheres.map((s) => cam.project(s.c).y + s.r * c.k)));
      ok(Math.abs(low - c.bottom) <= Math.max(3, 0.006 * c.k), `${at}: the drawing's feet are ${(c.bottom - low).toFixed(1)} px from where the skeleton's are`);
    }
    ok(Object.keys(V.cels).length === A.cels, `${an}/${vn}: ${Object.keys(V.cels).length} drawings for an action of ${A.cels}`);
  }
}
ok(cels > 0, "the kit has no drawings");
console.log(JSON.stringify({ kit: name, actions: Object.fromEntries(Object.entries(kit.actions ?? {}).map(([a, v]) => [a, Object.keys(v.views)])), cels, stride: +stride.toFixed(3), failures: fails }, null, 1));
process.exit(fails.length ? 1 : 0);
