// Watch a shot move without eyes: node engine/motion.mjs shots/NAME.js [--json] [--frames DIR] [--over DIR] [--all]
// Stills at intervals miss what happens between two frames. This walks every pair of consecutive frames of a shot (or
// an edit of shots) the way the stage plays them (drawings on twos, places on ones) and measures, per character:
//   stride    a planted foot's ground point, projected on the floor: how far it is from one drawing to the next while
//             it stays planted (the figure covers more or less ground than its legs do: skating), and over the
//             whole plant
//   glide     how far one held drawing with a foot down is carried over the floor (a pose frozen and sliding)
//   angle     how far the camera's line of sight to the figure is from the one its drawing was painted for: degrees
//             round the figure and degrees of height (a drawing made at eye level in a shot that looks down)
//   pop       at a change of drawing, how far the drawn head and hips jump on screen beyond what the skeleton's own
//             head and hips do (a drawing registered off its mannequin, or hung to another scale or baseline)
//   jump      a jerk in where the figure is in the set that the frames either side do not share (the second
//             difference of its place, against the shot's own median), outside declared impact frames and the shot's marks
//   light     with --frames DIR (a render's frames and its notes.json): the tint a figure was laid in switching back
//             within a few frames (a strobe on the whole figure), and how often it switches
// and on the pictures themselves, with --frames DIR:
//   glitch    a frame unlike both its neighbours while they are like each other, where the shot declares no impact
//             frame, flash or cut
//   hidden    with --over DIR as well (the same frames rendered with render.mjs --over): how much of each figure's box
//             the set hides, and the frames on which that starts or stops
// What it cannot see: whether a drawing is a good drawing, a limb drawn wrongly, what a face reads as; whether what
// hides a figure ought to; anything inside a held drawing.
// Prints findings (worst first per kind); --all prints every measurement; --json the whole report. Exit status 1 if
// anything is over its limit (LIMITS below).
import fs from "node:fs"; import path from "node:path"; import { execFileSync } from "node:child_process";
import { proportions, solve, camera, relativeYaw } from "./body.js";
import { createActor, hang } from "./cels.js";
import { ACTIONS, actorPose, celIndex } from "./actions.js";
import { viewOf } from "./views.js";
import { hull } from "./mannequin.js";
import { createSync } from "./sync.js";
import { floorAt as stairFloor } from "../sets/stairplan.js";

export const LIMITS = {
  stride: 14,         // pixels along the floor a planted foot may be from where the drawing before put it
  plant: 0.2,         // metres it may end from where it was planted
  glide: 0.45,        // metres one drawing with a foot down may be carried while it is held (on twos that is a frame
                      // of the figure's speed, which a camera travelling with it hides as it does in drawn animation)
  yaw: 30, elev: 15,  // degrees the camera may be from the drawing's own view, round the figure and in height
  pop: 0.06,          // of the figure's height: a jump of the drawn head or hips at a change of drawing
  jump: 0.1,          // metres: a jerk of the figure's place in the set (not on the screen: the camera's own shake is the whole picture's)
  strobe: 4,          // frames: light on a figure that goes and comes back in under twice this is a strobe
  glitch: 2.5,        // times the neighbours' own difference
};
// the floor of each set that is not flat at 0: (x, z) -> its height, or null where there is none
const FLOORS = { market: (x, z) => z > 66 && z < 76 ? null : z > 62.4 && z <= 66 && Math.abs(x) < 2.2 ? 0.85 * (z - 62.4) / 3.6 : 0 };      // sets/market.js floorAt (that module needs a renderer)
FLOORS.stairwell = stairFloor;      // sets/stairplan.js: the tread or deck under someone at about y
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const wrap = (a) => ((a + 180) % 360 + 360) % 360 - 180;

// Every frame of a shot as the stage plays it: per character the held pose, the place, the drawing and how it hangs.
export function walk(shot, sync, kits) {
  const W = shot.width ?? 1920, H = shot.height ?? 1080, cast = {}, out = [];
  for (const [who, base] of Object.entries(shot.cast ?? {})) { const kit = kits[base.split("/").pop()] ?? { name: base.split("/").pop(), body: {}, actions: {} }; cast[who] = { kit, P: proportions(kit.body) }; }
  const marked = new Set((shot.marks ?? []).map((m) => m.at));      // a hit the shot holds to the music is deliberate
  let actors = {}, take = null;
  for (let f = 0; f < shot.frames; f++) {
    const fr = shot.frame(f, sync);
    if ((fr.take ?? 0) !== take) { actors = {}; take = fr.take ?? 0; }
    const cam = camera({ fov: 30, ...fr.camera, w: W, h: H }), hf = shot.held?.(f) ?? f - f % 2, held = hf === f ? fr : shot.frame(hf, sync), post = { ...fr.options?.post, ...fr.post };
    const row = { f, take, declared: !!(post.mode || post.flash || post.black) || marked.has(f), cam, people: [] };
    for (const a of fr.actors ?? []) {
      const h = held.actors?.find((x) => x.who === a.who) ?? a, on = { ...a, action: h.action, phase: h.phase, hero: h.hero }, c = cast[a.who];
      const body = solve(c.P, actorPose(on)), pick = (actors[a.who] ??= createActor(c.kit)).pick(on.action, celIndex(on.action, on.phase), body, cam, on.hero);
      if (!on.hero && a.view && !c.kit.actions[on.action]?.views[a.view]) pick.missing = true;
      const q = body.q, g = hang(c.kit, pick, body, cam), root = cam.project([q.x, q.y, q.z]), A = ACTIONS[on.action], pr = (p) => { const s = cam.project(p); return [s.x, s.y]; };
      // the feet: which are down, and where on the floor
      const feet = {};
      const floor = FLOORS[fr.set]?.(q.x, q.z, q.y) ?? 0;
      if (!A.float && !q.board && floor !== null) for (const s of ["L", "R"]) { const j = body.J[s], low = Math.min(j.heel[1], j.toe[1]) - floor; if (low < 0.012) feet[s] = [j.ball[0], floor, j.ball[2]]; }
      // the box the figure fills
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      for (const v of body.vol) for (const p of hull(v.spheres, cam)) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
      // the camera against the drawing's own view
      let angle = null;
      if (g) {
        const mid = [q.x, q.y + c.P.height * 0.5, q.z], d = [cam.pos[0] - mid[0], cam.pos[1] - mid[1], cam.pos[2] - mid[2]], el = Math.atan2(d[1], Math.hypot(d[0], d[2])) * 180 / Math.PI;
        if (pick.hero) angle = { yaw: +Math.abs(wrap(pick.rel - g.cel.from.yaw)).toFixed(1), elev: +(el - g.cel.from.elev).toFixed(1) };      // a hero drawing: against its own frame's camera
        else { const V = viewOf(pick.view), ve = g.view.elev ?? V.elev ?? 5; angle = { yaw: V.yaw === null ? 0 : +Math.abs(wrap(pick.rel - (pick.mirror ? -V.yaw : V.yaw))).toFixed(1), elev: +(el - ve).toFixed(1) }; }
      }
      row.people.push({ who: a.who, action: on.action, cel: pick.cel, view: pick.view, mirror: !!pick.mirror, dummy: !g, key: pick.hero ? pick.view : `${on.action}/${pick.view}${pick.mirror ? "*" : ""}/${pick.cel}`,
        root: [root.x, root.y], at: [q.x, q.y, q.z], scale: root.s, size: root.s * c.P.height, feet, box: [x0, y0, x1, y1].map(Math.round), angle,
        drawn: g && g.cel.head ? { head: g.at(g.cel.head), hips: g.at(g.cel.hips) } : null, bones: { head: pr(body.J.head), hips: pr(body.J.hips) }, onScreen: x1 > 0 && x0 < W && y1 > 0 && y0 < H });
    }
    out.push(row);
  }
  return out;
}

// The findings of a walk. Each: { kind, who, at (frame), shot, value, limit, over, text }
export function judge(shot, rows) {
  const H = shot.height ?? 1080, found = [], names = shot.cuts?.map((c) => c.shot) ?? [shot.name], nameOf = (r) => names[r.take] ?? shot.name;
  const add = (kind, r, who, value, limit, text, extra = {}) => found.push({ kind, shot: nameOf(r), who, at: r.f, value: +value.toFixed(3), limit, over: value > limit, text, ...extra });
  const whos = [...new Set(rows.flatMap((r) => r.people.map((p) => p.who)))];
  for (const who of whos) {
    const seq = rows.map((r) => ({ r, p: r.people.find((x) => x.who === who) }));
    // stride: a planted foot from one drawing to the next (the start of each hold); glide: within one held drawing
    const plant = {}, close = (s2) => { const pl = plant[s2]; if (pl && pl.n > 1) add("plant", pl.r, who, pl.sum, LIMITS.plant, `${s2} foot ends ${pl.sum.toFixed(2)} m (${pl.px.toFixed(0)} px) from where it was planted, ${pl.n} drawings on from f${pl.r.f}`); plant[s2] = null; };
    let hold = null;      // the frame the current drawing came on at
    for (let i = 0; i < seq.length; i++) {
      const b = seq[i], a = seq[i - 1];
      if (!b.p || !a?.p || a.r.take !== b.r.take) { hold = b.p ? b : null; close("L"); close("R"); continue; }
      const same = a.p.key === b.p.key && shot.held && (shot.held(b.r.f) === shot.held(a.r.f)) || a.p.key === b.p.key && !shot.held && (b.r.f - b.r.f % 2 === a.r.f - a.r.f % 2);
      for (const s of ["L", "R"]) {
        if (same) {      // the same drawing, a frame on: how far it has been carried since it came on
          if (!hold?.p.feet[s] || !b.p.feet[s] || !b.p.onScreen) continue;
          const d = Math.hypot(b.p.feet[s][0] - hold.p.feet[s][0], b.p.feet[s][2] - hold.p.feet[s][2]), p0 = b.r.cam.project(hold.p.feet[s]), p1 = b.r.cam.project(b.p.feet[s]);
          const n = b.r.f - hold.r.f, last = seq[i + 1]?.p?.key !== b.p.key || seq[i + 1]?.r.take !== b.r.take || (shot.held ? shot.held(seq[i + 1].r.f) !== shot.held(b.r.f) : (seq[i + 1].r.f % 2 === 0));
          if (last) add("glide", hold.r, who, d, LIMITS.glide, `${b.p.key}: one drawing with its ${s} foot down is carried ${d.toFixed(2)} m (${Math.hypot(p1.x - p0.x, p1.y - p0.y).toFixed(0)} px over the floor) in the ${n + 1} frames it is held, f${hold.r.f}-f${b.r.f}`);
        } else {         // a new drawing: against the drawing before it, where that one came on
          const h = hold;
          if (h?.p.feet[s] && b.p.feet[s] && b.p.onScreen) {
            const v = [b.p.feet[s][0] - h.p.feet[s][0], b.p.feet[s][2] - h.p.feet[s][2]], d = Math.hypot(...v), p0 = b.r.cam.project(h.p.feet[s]), p1 = b.r.cam.project(b.p.feet[s]), px = Math.hypot(p1.x - p0.x, p1.y - p0.y);
            add("stride", b.r, who, px, LIMITS.stride, `${s} foot, planted, is ${px.toFixed(0)} px (${d.toFixed(2)} m) along the floor from where the drawing before put it (f${h.r.f} -> f${b.r.f})`);
            const pl = (plant[s] ??= { r: h.r, v: [0, 0], n: 1 }); pl.v[0] += v[0]; pl.v[1] += v[1]; pl.sum = Math.hypot(...pl.v); pl.n++;
            const q0 = b.r.cam.project([b.p.feet[s][0] - pl.v[0], b.p.feet[s][1], b.p.feet[s][2] - pl.v[1]]); pl.px = Math.hypot(p1.x - q0.x, p1.y - q0.y);
          } else close(s);
        }
      }
      if (!same) hold = b;
    }
    close("L"); close("R");
    // angle: the worst per shot and drawing set
    const worst = {};
    for (const { r, p } of seq) if (p?.angle && p.onScreen) { const k = `${r.take} ${p.action}/${p.view}`, w = (worst[k] ??= { r, p, yaw: 0, elev: 0, n: 0 }); w.n++; if (Math.abs(p.angle.elev) > Math.abs(w.elev)) { w.elev = p.angle.elev; w.re = r; } if (p.angle.yaw > w.yaw) { w.yaw = p.angle.yaw; w.ry = r; } }
    for (const w of Object.values(worst)) {
      add("angle", w.re ?? w.r, who, Math.abs(w.elev), LIMITS.elev, `${w.p.action} x ${w.p.view}: the camera is up to ${w.elev > 0 ? "+" : ""}${w.elev} degrees of height from the view the drawing was painted for (over ${w.n} frames)`);
      add("angle", w.ry ?? w.r, who, w.yaw, LIMITS.yaw, `${w.p.action} x ${w.p.view}: the camera is up to ${w.yaw} degrees round the figure from the drawing's view`);
    }
    // pop and jump
    const acc = [];
    for (let i = 1; i < seq.length; i++) {
      const a = seq[i - 1], b = seq[i]; if (!a.p || !b.p || a.r.take !== b.r.take || !b.p.onScreen) continue;
      if (a.p.key !== b.p.key && a.p.drawn && b.p.drawn) {
        let m = 0, which = "";
        for (const j of ["head", "hips"]) { const d = [0, 1].map((k) => (b.p.drawn[j][k] - a.p.drawn[j][k]) - (b.p.bones[j][k] - a.p.bones[j][k])), v = Math.hypot(...d) / b.p.size; if (v > m) { m = v; which = j; } }
        add("pop", b.r, who, m, LIMITS.pop, `${a.p.key} -> ${b.p.key}: the drawn ${which} jumps ${(m * 100).toFixed(1)}% of the figure's height (${(m * b.p.size).toFixed(0)} px) beyond the skeleton's`);
      }
      const c = seq[i + 1]; if (!c?.p || c.r.take !== b.r.take) continue;
      // in the world, not on the screen: a camera that shakes or punches in moves the whole picture, figure and floor
      const j = Math.hypot(...[0, 1, 2].map((k) => a.p.at[k] + c.p.at[k] - 2 * b.p.at[k])), z = 0;
      acc.push({ r: b.r, j, z });
    }
    const med = (l) => l.slice().sort((x, y) => x - y)[l.length >> 1] ?? 0, mj = med(acc.map((x) => x.j)), mz = med(acc.map((x) => x.z));
    for (const x of acc) if (x.j > Math.max(LIMITS.jump, 6 * mj)) add("jump", x.r, who, x.j, LIMITS.jump, `the figure's place jerks ${x.j.toFixed(2)} m against the frames either side (the shot's median is ${mj.toFixed(3)} m)${x.r.declared ? " [declared: an impact frame, a flash or a mark]" : ""}`, x.r.declared ? { over: false } : {});
  }
  return found;
}

// The light each figure was laid in (a render's notes.json): a swing of the tint's brightness that reverses within
// LIMITS.strobe frames is a strobe on the whole figure
function light(shot, rows, notes) {
  const found = [], names = shot.cuts?.map((c) => c.shot) ?? [shot.name], series = {};
  for (const r of rows) for (const n of notes[r.f] ?? []) if (n.tint && !r.declared) (series[`${r.take} ${n.who}`] ??= []).push({ f: r.f, take: r.take, who: n.who, v: (0.3 * n.tint[0] + 0.59 * n.tint[1] + 0.11 * n.tint[2]) * (1 - n.fog) });
  for (const l of Object.values(series)) {
    // turning points of the series, ignoring ripples under 4%
    const turns = [l[0]]; let dir = 0;
    for (const x of l) { const t = turns[turns.length - 1], d = (x.v - t.v) / t.v; if (dir === 0 && Math.abs(d) > 0.04) { dir = Math.sign(d); turns.push(x); } else if (dir && Math.sign(d) === dir) turns[turns.length - 1] = x; else if (dir && Math.abs(d) > 0.04) { dir = -dir; turns.push(x); } }
    const quick = []; for (let i = 2; i < turns.length; i++) if (turns[i].f - turns[i - 2].f < 2 * LIMITS.strobe) quick.push(turns[i - 1]);
    const swing = turns.length > 1 ? Math.max(...turns.slice(1).map((t, i) => Math.abs(t.v - turns[i].v) / turns[i].v)) : 0;
    found.push({ kind: "light", shot: names[l[0].take] ?? shot.name, who: l[0].who, at: (quick[0] ?? l[0]).f, value: quick.length, limit: 0, over: quick.length > 0,
      text: `the light on the whole figure turns ${Math.max(0, turns.length - 1)} times in ${l.length} frames, by up to ${(swing * 100).toFixed(0)}%${quick.length ? `; ${quick.length} times it goes and comes back within ${2 * LIMITS.strobe} frames (f${quick.slice(0, 6).map((x) => x.f).join(", f")}): a strobe` : ""}` });
  }
  return found;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname;
if (isMain) {
  const args = process.argv.slice(2), opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args.splice(i, 2)[1] : null; }, flag = (n) => { const i = args.indexOf(n); if (i >= 0) args.splice(i, 1); return i >= 0; };
  const json = flag("--json"), all = flag("--all"), frames = opt("--frames"), over = opt("--over"), file = args.find((a) => a.endsWith(".js"));
  if (!file || flag("--help")) { console.error(fs.readFileSync(new URL(import.meta.url), "utf8").split("\n").filter((l) => l.startsWith("//")).join("\n")); process.exit(2); }
  const shot = (await import(path.resolve(file))).default, read = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, "analysis", f))), sync = createSync(read("listen.json"), read("stems.json"));
  const kits = Object.fromEntries(fs.readdirSync(path.join(ROOT, "kits")).filter((k) => fs.existsSync(path.join(ROOT, "kits", k, "kit.json"))).map((k) => [k, JSON.parse(fs.readFileSync(path.join(ROOT, "kits", k, "kit.json")))]));
  const rows = walk(shot, sync, kits), found = judge(shot, rows);
  if (frames) {
    const nf = path.join(frames, "notes.json");
    if (!fs.existsSync(nf)) { console.error(`${nf}: no notes beside the frames (render.mjs writes them)`); process.exit(1); }
    found.push(...light(shot, rows, JSON.parse(fs.readFileSync(nf))));
    const plan = path.join(frames, "motion_plan.json");
    fs.writeFileSync(plan, JSON.stringify({ frames: path.resolve(frames), over: over ? path.resolve(over) : null, glitch: LIMITS.glitch, names: shot.cuts?.map((c) => c.shot) ?? [shot.name],
      rows: rows.map((r) => ({ f: r.f, take: r.take, declared: r.declared, people: r.people.filter((p) => p.onScreen).map((p) => ({ who: p.who, box: p.box })) })) }));
    const res = JSON.parse(execFileSync(path.join(ROOT, ".venv/bin/python"), [path.join(ROOT, "engine/motion_frames.py"), plan], { maxBuffer: 1 << 28 }).toString());
    found.push(...res);
  }
  const bad = found.filter((x) => x.over);
  if (json) console.log(JSON.stringify({ shot: shot.name, limits: LIMITS, bad: bad.length, found }));
  else {
    const kinds = [...new Set(found.map((x) => x.kind))];
    for (const k of kinds) {
      const l = found.filter((x) => x.kind === k).sort((a, b) => b.value / b.limit - a.value / a.limit), o = l.filter((x) => x.over);
      console.log(`${k}: ${l.length} measured, ${o.length} over the limit (${LIMITS[k] ?? ""})`);
      // one line per shot and character for what is over; the worst of each otherwise
      const seen = {};
      for (const x of all ? l : l.filter((x) => { const key = `${x.shot} ${x.who} ${x.over}`; seen[key] = (seen[key] ?? 0) + 1; return seen[key] <= (x.over ? 3 : 1); }))
        console.log(`  ${x.over ? "OVER" : "ok  "}  ${x.shot.padEnd(12)} f${String(x.at).padStart(4, "0")}  ${(x.who ?? "").padEnd(5)} ${x.text}${!all && x.over && seen[`${x.shot} ${x.who} true`] > 3 && seen[`${x.shot} ${x.who} done`] === undefined ? (seen[`${x.shot} ${x.who} done`] = 1, `   (+${seen[`${x.shot} ${x.who} true`] - 3} more)`) : ""}`);
    }
    console.log(`${found.length} measurements, ${bad.length} over their limits`);
  }
  process.exit(bad.length ? 1 : 0);
}
