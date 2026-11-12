// Browser side of the layout step: draws the design turnaround guide and, per view, the parts template a kit is
// painted over. The template is the body's own volumes for that view, part by part, so where each joint sits in the
// sheet is data, not something measured off a drawing.
import { proportions, solve, pose, orbit, LAYOUT, APOSE, SIDES } from "/engine/body.js";
import { drawMannequin, drawVolumes, hull } from "/engine/mannequin.js";
import { VIEWS } from "/engine/views.js";

const MAGENTA = "#ff00ff", GREY = "#969696";
// The template is plain grey (a coloured template bleeds into what is painted over it); a second copy, the key, has
// one flat colour per kind of part so the prompt can say which shape is what.
export const LEGEND = { head: ["#dcdcdc", "light grey"], neck: ["#f3e9a6", "pale yellow"], collar_back: ["#c9a800", "dark yellow"],
  torso: ["#8c8c8c", "mid grey"], pelvis: ["#4d4d4d", "dark grey"], uarm: ["#2e8b57", "dark green"], farm: ["#a5dba9", "light green"],
  thigh: ["#2a52be", "dark blue"], shin: ["#9dbcff", "light blue"], shoe: ["#8b5a2b", "brown"], bent: ["#17a398", "teal"] };
const png = (c) => c.toDataURL("image/png");
const canvas = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };

// Five dummies in a row, front to back, in the A-pose: what a design turnaround is painted over.
window.turnaround = (spec, W = 2752, H = 1536) => {
  const P = proportions(spec.body), body = solve(P, APOSE), c = canvas(W, H), g = c.getContext("2d");
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, W, H);
  const U = H * 0.82 / P.height, col = W / 5, boxes = {};
  VIEWS.forEach((v, i) => {
    const cam = orbit([0, P.height / 2, 0], v.yaw, 10, { ortho: U, w: W, h: H, cx: col * (i + 0.5), cy: H / 2 });
    drawMannequin(g, body, cam, { ink: 2.5 });
    boxes[v.name] = [Math.round(col * i), 0, Math.round(col * (i + 1)), H];
  });
  return { png: png(c), boxes };
};

// What a humanoid kit is made of. vols: the body volumes drawn for the part ("name" or "name:near"/"name:far" for a
// garment split by depth); pts: named joints written into the layout; pad: room left round the shape for what the
// drawing adds (hair, folds).
function items(view, P, set) {
  const it = [];
  if (set === "twist") { // swap drawings for the trunk: the chest turned against the hips, as in a run
    for (const [n, tw, note] of [["torso_twp", 18, "her chest and shoulders turned a little toward her own left"], ["torso_twn", -18, "her chest and shoulders turned a little toward her own right"]])
      it.push({ name: n, kind: "torso", vols: ["torso", "collar:near"], pose: { twist: tw }, note, pts: { a: "hips", b: "neckBase", shL: "L.sh", shR: "R.sh", waist: "waist" }, scale: 1.7, pad: 60 });
    return it;
  }
  it.push({ name: "head", kind: "head", vols: ["head"], pts: { a: "headBase", b: "crown", c: "head" }, scale: 1.45, pad: 46 });
  it.push({ name: "neck", kind: "neck", vols: ["neck"], pts: { a: "neckBase", b: "headBase" }, scale: 1.2, pad: 20 });
  if (P.garments.collar && view.yaw <= 90) it.push({ name: "collar_back", kind: "collar_back", vols: ["collar:far"], pts: { a: "hips", b: "neckBase" }, pad: 22 });
  it.push({ name: "torso", kind: "torso", vols: ["torso", "collar:near"], pts: { a: "hips", b: "neckBase", shL: "L.sh", shR: "R.sh", waist: "waist" }, pad: 34 });
  it.push({ name: "pelvis", kind: "pelvis", vols: ["pelvis"], pts: { a: "hips", b: "waist", hipL: "L.hip", hipR: "R.hip" }, pad: 24 });
  // both sides even where one would mirror (a sparse sheet invites the model to add parts), in the order they stand
  // on screen in this view: the model paints a pair as it would look side by side, whatever the prompt calls them
  const sides = view.yaw < 90 ? ["R", "L"] : ["L", "R"];
  const limb = (s, kind, a, b, o = {}) => it.push({ name: `${kind}_${s}`, kind, side: s, vols: [`${kind}.${s}`], pts: { a: `${s}.${a}`, b: `${s}.${b}` }, pad: 24, ...o });
  for (const s of sides) { limb(s, "uarm", "sh", "elbow", {}); limb(s, "farm", "elbow", "wrist"); }
  for (const s of sides) it.push({ name: `shoe_${s}`, kind: "shoe", side: s, vols: [`shoe.${s}`], shoe: true, pad: 26 });
  for (const s of sides) { limb(s, "thigh", "hip", "knee", {}); limb(s, "shin", "knee", "ankle"); }
  if (view.bent) for (const s of sides) it.push({ name: `bent_${s}`, kind: "bent", side: s, vols: [`thigh.${s}`, `shin.${s}`],
    pose: { leg: { [s]: { swing: 62, knee: 112 } } }, pts: { hip: `${s}.hip`, knee: `${s}.knee`, ankle: `${s}.ankle` }, pad: 26 });
  return it;
}
const joint = (J, n) => n.includes(".") ? J[n.split(".")[0]][n.split(".")[1]] : J[n];

window.template = (spec, viewName, maxUnit = 1500, set = "main", S = 2048) => {
  const H = set === "twist" ? S * 9 / 16 : S;   // a sheet is as wide as its parts need: empty room invites extra parts
  const view = VIEWS.find((v) => v.name === viewName), P = proportions(spec.body);
  const list = items(view, P, set), GAP = 34;
  // each part at unit scale first, to find how large the sheet can draw them
  const build = (U) => list.map((it) => {
    const body = solve(P, it.pose ? pose(it.pose, LAYOUT) : LAYOUT), k = U * (it.scale ?? 1);
    const cam = orbit([0, 0, 0], view.yaw, 10, { ortho: k, w: 0, h: 0, cx: 0, cy: 0 });
    const zRef = cam.project(body.J.neckBase).z;
    const vols = [];
    for (const want of it.vols) {
      const [nm, half] = want.split(":"), [part, side] = nm.split(".");
      for (const v of body.vol) {
        if (v.part !== part || (side && v.side !== side)) continue;
        if (half) { const z = (cam.project(v.spheres[0].c).z + cam.project(v.spheres[1].c).z) / 2; if ((z < zRef + 0.004) !== (half === "near")) continue; }
        vols.push(v);
      }
    }
    let pts = it.pts;
    if (it.shoe) { // hang the shoe by whichever pair of points this view separates best
      const j = body.J[it.side], d = (a, b) => Math.hypot(cam.project(a).x - cam.project(b).x, cam.project(a).y - cam.project(b).y);
      pts = d(j.heel, j.toe) > d(j.ankle, j.sole) * 1.5 ? { a: `${it.side}.heel`, b: `${it.side}.toe` } : { a: `${it.side}.ankle`, b: `${it.side}.sole` };
    }
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    const polys = vols.map((v) => hull(v.spheres, cam));
    for (const poly of polys) for (const p of poly) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    const pad = it.pad * (it.scale ?? 1);
    return { it, body, cam, vols, k, pts, bb: [x0 - pad, y0 - pad, x1 + pad, y1 + pad] };
  });
  const place = (cells) => { // shelves, tallest parts first; each part goes on the first shelf with room for it
    const shelves = [], order = cells.slice().sort((a, b) => (b.bb[3] - b.bb[1]) - (a.bb[3] - a.bb[1]));
    let y = GAP;
    for (const c of order) {
      const w = c.bb[2] - c.bb[0], h = c.bb[3] - c.bb[1];
      let sh = shelves.find((s) => s.x + w + GAP <= S);
      if (!sh) { sh = { x: GAP, y, h }; shelves.push(sh); y += h + GAP; }
      c.at = [sh.x, sh.y]; sh.x += w + GAP;
    }
    return y;
  };
  let U = maxUnit, cells;
  for (; U > 300; U -= 10) { cells = build(U); if (place(cells) <= H) break; }
  const c = canvas(S, H), g = c.getContext("2d"), ck = canvas(S, H), gk = ck.getContext("2d");
  for (const x of [g, gk]) { x.fillStyle = MAGENTA; x.fillRect(0, 0, S, H); }
  const layout = { view: view.name, set, yaw: view.yaw, symmetric: !!view.symmetric, size: S, height: H, unit: U, parts: {} };
  for (const cell of cells) {
    const ox = cell.at[0] - cell.bb[0], oy = cell.at[1] - cell.bb[1];
    const cam = orbit([0, 0, 0], view.yaw, 10, { ortho: cell.k, w: 0, h: 0, cx: ox, cy: oy });
    drawVolumes(g, cell.vols, cam, { flat: GREY }); drawVolumes(gk, cell.vols, cam, { flat: LEGEND[cell.it.kind][0] });
    const pts = {};
    for (const n in cell.pts) { const p = cam.project(joint(cell.body.J, cell.pts[n])); pts[n] = [+p.x.toFixed(1), +p.y.toFixed(1)]; }
    const part = { kind: cell.it.kind, colour: LEGEND[cell.it.kind][1], side: cell.it.side ?? null, k: cell.k, joints: cell.pts, pts,
      box: [cell.at[0], cell.at[1], cell.at[0] + cell.bb[2] - cell.bb[0], cell.at[1] + cell.bb[3] - cell.bb[1]].map(Math.round) };
    if (cell.it.kind === "head") { // the skull, so the cut step knows which pixels are hair standing off it
      const sk = cell.body.vol.find((v) => v.part === "head").spheres[0], p = cam.project(sk.c);
      part.skull = [+p.x.toFixed(1), +p.y.toFixed(1), +(sk.r * cell.k).toFixed(1)];
      const f = cam.project(cell.body.J.head.map((v, i) => v + cell.body.F.head.Z[i]));
      part.faceDir = [+(f.x - cam.project(cell.body.J.head).x).toFixed(3) / cell.k, 0];
    }
    if (cell.it.pose) part.pose = cell.it.pose;
    if (cell.it.note) part.note = cell.it.note;
    layout.parts[cell.it.name] = part;
  }
  return { png: png(c), key: png(ck), layout };
};

// The same sheet with the dummy's shading and the joints marked: for checking a layout by eye.
window.ready = true;
