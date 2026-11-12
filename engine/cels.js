// Draws a cel kit: for every action and view, a set of whole-figure drawings, each painted over the skeleton's own
// pose and stored with where the skeleton stood in it (the ground point under its root, in pixels, and the scale in
// pixels per body unit). Placing a cel is therefore two numbers from the camera: where the root's ground point
// projects, and how many pixels a unit is there. The feet are on the ground because the drawing was made over a
// skeleton whose feet were, and that ground is the one the cel is hung from.
// A kit need not have every action and view yet: what it lacks is drawn as the body's posing dummy, so a shot can be
// built before its art lands.
import { relativeYaw } from "./body.js";
import { picker } from "./views.js";
import { mirrored } from "./actions.js";
import { drawMannequin } from "./mannequin.js";

// kit.json -> a kit with its images decoded. base: the kit's folder URL.
export async function loadKit(base) {
  const kit = await (await fetch(base + "/kit.json")).json(), jobs = [];
  kit.actions ??= {};
  for (const a of Object.values(kit.actions)) for (const v of Object.values(a.views)) for (const c of Object.values(v.cels))
    jobs.push((async () => { const im = new Image(); im.src = `${base}/${c.img}`; await im.decode(); c.image = await createImageBitmap(im); })());
  await Promise.all(jobs);
  return kit;
}

// How steeply a camera must look down for the drawing from above to be the one to show (the camera's forward y).
const STEEP = -0.82;
// An actor keeps what must persist between frames: which view it is on (the picker has hysteresis).
export function createActor(kit) {
  const pickers = {};
  // pick(action, body, cam): which drawing this frame is on. Call it once per frame, in frame order.
  // missing: the kit has no drawing for this; the dummy is drawn instead.
  function pick(action, index, body, cam) {
    const A = kit.actions[action], { q } = body, rel = relativeYaw(cam, [q.x, 0, q.z], q.yaw);
    const names = Object.keys(A?.views ?? {}), yawed = names.filter((n) => n !== "top"), steep = cam.fwd[1] < STEEP;
    if (names.includes("top") && (steep || !yawed.length)) return { rel, action, view: "top", mirror: false, cel: index };
    if (!yawed.length || steep) return { rel, action, view: steep ? "top" : "none", mirror: false, cel: index, missing: true };
    const sel = (pickers[action] ??= picker(7, yawed))(rel);
    return { rel, action, view: sel.view, mirror: sel.mirror, cel: sel.mirror ? mirrored(action, index) : index };
  }
  // draw(g, picked, body, cam) -> { x, y, s }: where the cel's ground point went and its scale
  function draw(g, picked, body, cam) {
    const { q } = body, p = cam.project([q.x, q.y ?? 0, q.z]);
    const V = picked.missing ? null : kit.actions[picked.action].views[picked.view], c = V?.cels[picked.cel];
    if (!c) { drawMannequin(g, body, cam, { ink: 2 }); return { x: p.x, y: p.y, s: p.s }; }
    const s = p.s / c.k;
    g.save();
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
    g.translate(p.x, p.y);
    if (picked.view === "top") {       // drawn heading up the sheet: turn it to the way the character heads on screen
      const yw = q.yaw * Math.PI / 180, f = cam.project([q.x + Math.sin(yw), q.y ?? 0, q.z + Math.cos(yw)]);
      g.rotate(Math.atan2(f.x - p.x, -(f.y - p.y)) + (V.turn ?? 0) * Math.PI / 180);   // turn: painted heading down the sheet
    }
    g.scale(picked.mirror ? -s : s, s);
    g.drawImage(c.image, -c.ground[0], -c.ground[1]);
    g.restore();
    return { x: p.x, y: p.y, s };
  }
  return { kit, pick, draw };
}
