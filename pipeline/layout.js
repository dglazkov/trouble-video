// Browser side of the layout step: the sheet a set of cels is painted over. Every cel of an action, seen from one
// view, is the body's own dummy in that pose, in a grid, all at one scale and standing on one ground line per row;
// where the skeleton is in each cell is written down, so a painted cel is registered by data, not by eye.
import { proportions, solve } from "/engine/body.js";
import { drawMannequin, hull, depthOf } from "/engine/mannequin.js";
import { viewOf, viewCamera } from "/engine/views.js";
import { ACTIONS, actorPose } from "/engine/actions.js";
import { camera, relativeYaw } from "/engine/body.js";
import { loadSync } from "/engine/sync.js";

const png = (c) => c.toDataURL("image/png");
const canvas = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };
// What a volume is, for the map the checks read: face, hair, neck, trunk, hips, collar, and per side the upper arm,
// forearm, hand, thigh, shin and shoe. Whatever else is on the body or under it (a pack, a board) is "garment".
const classOf = (v) => v.tone === "hair" ? "hair" : v.part === "head" ? "face" : v.part === "farm" ? (v.tone === "upper" ? "hand" : "farm") :
  ["torso", "pelvis", "neck", "uarm", "thigh", "shin", "shoe"].includes(v.part) ? v.part : "garment";
const NAMES = ["face", "hair", "neck", "torso", "pelvis", "garment", "uarm", "farm", "hand", "thigh", "shin", "shoe"];
const colourOf = (cls, side) => [20 + 20 * NAMES.indexOf(cls), side === "L" ? 100 : side === "R" ? 200 : 0, 255];
const JOINTS = ["hips", "waist", "chest", "neckBase", "headBase", "head", "crown"], SIDE_JOINTS = ["sh", "elbow", "wrist", "hand", "hip", "knee", "ankle", "heel", "toe"];

// o: { W, H, cols, only: [cel indices] or null, elev, margin }
window.layout = (spec, action, viewName, o) => {
  const A = ACTIONS[action], view = viewOf(viewName), P = proportions(spec.body), who = spec.name;
  if (!A || !view) throw new Error(`no such action or view: ${action} ${viewName}`);
  const all = [...Array(A.cels).keys()], idx = o.only ?? all, cols = Math.min(o.cols, idx.length), rows = Math.ceil(idx.length / cols);
  const { W, H } = o, cw = W / cols, ch = H / rows, elev = view.elev ?? o.elev ?? A.elev ?? 5, m = o.margin ?? 0.07;
  const cam0 = viewCamera(view.name, 1, 0, 0, elev);
  // the room every pose of the action needs at unit scale: one scale and one framing for the whole action, whichever
  // cels this sheet holds
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
  for (const i of all) for (const v of solve(P, A.pose(i, who)).vol) for (const p of hull(v.spheres, cam0)) {
    x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]);
  }
  const U = Math.floor(Math.min(cw * (1 - 2 * m) / (x1 - x0), ch * (1 - 2 * m) / (y1 - y0)));
  const c = canvas(W, H), g = c.getContext("2d"), cm = canvas(W, H), gm = cm.getContext("2d");
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, W, H); gm.fillStyle = "#000000"; gm.fillRect(0, 0, W, H);
  const body0 = solve(P, A.pose(0, who));
  const cels = idx.map((i, n) => {
    const left = (n % cols) * cw, top = Math.floor(n / cols) * ch;
    const cam = viewCamera(view.name, U, left + cw / 2 - (x0 + x1) / 2 * U, top + ch / 2 - (y0 + y1) / 2 * U, elev);
    const body = solve(P, A.pose(i, who)), at = (p) => { const q = cam.project(p); return [+q.x.toFixed(2), +q.y.toFixed(2)]; };
    drawMannequin(g, body, cam, { ink: Math.max(1.5, U / 400) });
    for (const v of body.vol.slice().sort((a, b) => depthOf(b, cam) - depthOf(a, cam))) {
      const poly = hull(v.spheres, cam), col = colourOf(classOf(v), v.side);
      gm.fillStyle = `rgb(${col})`; gm.beginPath(); poly.forEach((p, k) => k ? gm.lineTo(p[0], p[1]) : gm.moveTo(p[0], p[1])); gm.closePath(); gm.fill();
    }
    const joints = {};
    for (const j of JOINTS) joints[j] = at(body.J[j]);
    for (const s of ["L", "R"]) for (const j of SIDE_JOINTS) joints[`${s}.${j}`] = at(body.J[s][j]);
    // which way the face points on the sheet, in body units: [right, down, toward the viewer]
    const h0 = cam.project(body.J.head), h1 = cam.project(body.J.head.map((v, k) => v + body.F.head.Z[k]));
    const face = [(h1.x - h0.x) / U, (h1.y - h0.y) / U, h0.z - h1.z].map((v) => +v.toFixed(3));
    return { index: i, box: [left, top, left + cw, top + ch].map(Math.round), ground: at([0, 0, 0]), joints, face };
  });
  const classes = {};
  for (const n of NAMES) for (const s of [null, "L", "R"]) classes[n + (s ? "." + s : "")] = colourOf(n, s);
  return { png: png(c), map: png(cm), layout: { action, loose: !!A.loose, float: !!A.float || view.name === "top", prop: body0.q.board ? "board" : null, view: view.name, yaw: view.yaw, elev, W, H, cols, rows, unit: U, aspect: o.aspect, cels, classes } };
};

// HERO drawings: one-off drawings made for a shot's own camera. Each mannequin on the sheet is a character exactly as
// the shot shows them on one of its frames (the held pose, the place, the shot's camera with its perspective), blown
// up about the figure so that every mannequin is the same number of pixels per body unit where it stands. What is
// written down per cel is what the others have (the ground point under the root, the joints, the face's direction)
// plus its name, its frame and the line of sight it was drawn along, so the stage can hang it on that camera and
// engine/motion.mjs can say how far a frame's camera has moved from it.
// list: [{ frame, name }]; o: { W, H, cols, aspect, sheet, what, margin }
window.heroLayout = async (spec, shotUrl, list, o) => {
  const shot = (await import(shotUrl)).default, sync = await loadSync(), P = proportions(spec.body), who = spec.name;
  const { W, H } = o, cols = Math.min(o.cols, list.length), rows = Math.ceil(list.length / cols), cw = W / cols, ch = H / rows, m = o.margin ?? 0.08;
  const items = list.map(({ frame, name }) => {
    const hf = shot.held?.(frame) ?? frame - frame % 2, fr = shot.frame(frame, sync), held = hf === frame ? fr : shot.frame(hf, sync);
    const a = fr.actors?.find((x) => x.who === who), h = held.actors?.find((x) => x.who === who) ?? a;
    if (!a) throw new Error(`${shot.name} frame ${frame}: ${who} is not in it`);
    const on = { ...a, action: h.action, phase: h.phase }, body = solve(P, actorPose(on)), cam = camera({ fov: 30, ...fr.camera, w: shot.width ?? 1920, h: shot.height ?? 1080 }), q = body.q, root = cam.project([q.x, q.y, q.z]);
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const v of body.vol) for (const p of hull(v.spheres, cam)) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    const mid = [q.x, q.y + P.height * 0.5, q.z], d = [cam.pos[0] - mid[0], cam.pos[1] - mid[1], cam.pos[2] - mid[2]];
    return { frame, name, on, body, cam, root, box: [x0, y0, x1, y1].map((v, i) => (v - (i % 2 ? root.y : root.x)) / root.s),
      from: { yaw: +relativeYaw(cam, [q.x, 0, q.z], q.yaw).toFixed(1), elev: +(Math.atan2(d[1], Math.hypot(d[0], d[2])) * 180 / Math.PI).toFixed(1) } };
  });
  const U = Math.floor(Math.min(...items.map((it) => Math.min(cw * (1 - 2 * m) / (it.box[2] - it.box[0]), ch * (1 - 2 * m) / (it.box[3] - it.box[1])))));
  const c = canvas(W, H), g = c.getContext("2d"), cm = canvas(W, H), gm = cm.getContext("2d");
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, W, H); gm.fillStyle = "#000000"; gm.fillRect(0, 0, W, H);
  const cels = items.map((it, n) => {
    const left = (n % cols) * cw, top = Math.floor(n / cols) * ch, Z = U / it.root.s, ox = left + cw / 2 - (it.box[0] + it.box[2]) / 2 * U, oy = top + ch / 2 - (it.box[1] + it.box[3]) / 2 * U;
    const cam = { ...it.cam, project: (p) => { const s = it.cam.project(p); return { x: (s.x - it.root.x) * Z + ox, y: (s.y - it.root.y) * Z + oy, z: s.z, s: s.s * Z }; } };
    const body = it.body, q = body.q, at = (p) => { const s = cam.project(p); return [+s.x.toFixed(2), +s.y.toFixed(2)]; };
    drawMannequin(g, body, cam, { ink: Math.max(1.5, U / 400) });
    for (const v of body.vol.slice().sort((a, b) => depthOf(b, cam) - depthOf(a, cam))) {
      const poly = hull(v.spheres, cam), col = colourOf(classOf(v), v.side);
      gm.fillStyle = `rgb(${col})`; gm.beginPath(); poly.forEach((p, k) => k ? gm.lineTo(p[0], p[1]) : gm.moveTo(p[0], p[1])); gm.closePath(); gm.fill();
    }
    const joints = {};
    for (const j of JOINTS) joints[j] = at(body.J[j]);
    for (const s of ["L", "R"]) for (const j of SIDE_JOINTS) joints[`${s}.${j}`] = at(body.J[s][j]);
    const h0 = cam.project(body.J.head), h1 = cam.project(body.J.head.map((v, k) => v + body.F.head.Z[k] * 0.2));
    const face = [(h1.x - h0.x) / U / 0.2, (h1.y - h0.y) / U / 0.2, (h0.z - h1.z) / 0.2].map((v) => +v.toFixed(3));
    return { index: n, name: it.name, frame: it.frame, action: it.on.action, cel: celOf(it.on), from: it.from, box: [left, top, left + cw, top + ch].map(Math.round), ground: at([q.x, q.y, q.z]), joints, face, board: !!q.board };
  });
  const classes = {};
  for (const n of NAMES) for (const s of [null, "L", "R"]) classes[n + (s ? "." + s : "")] = colourOf(n, s);
  return { png: png(c), map: png(cm), layout: { action: "hero", hero: { shot: shotUrl.replace(/^\//, ""), who }, what: o.what ?? "", loose: true, float: true, prop: cels.some((x) => x.board) ? "board" : null, view: o.sheet, yaw: null, elev: null, W, H, cols, rows, unit: U, aspect: o.aspect, cels, classes } };
};
const celOf = (on) => { const A = ACTIONS[on.action], n = A.cels, i = Math.floor((on.phase ?? 0) * n + 1e-9); return A.loop ? ((i % n) + n) % n : Math.min(n - 1, Math.max(0, i)); };
window.ready = true;
