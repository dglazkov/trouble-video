// Draws a cel kit: for every action and view, a set of whole-figure drawings, each painted over the skeleton's own
// pose and stored with where the skeleton stood in it (the ground point under its root, in pixels, and the scale in
// pixels per body unit). Placing a cel is therefore two numbers from the camera: where the root's ground point
// projects, and how many pixels a unit is there. The feet are on the ground because the drawing was made over a
// skeleton whose feet were, and that ground is the one the cel is hung from.
import { relativeYaw } from "./body.js";
import { picker } from "./views.js";
import { mirrored } from "./actions.js";

// kit.json -> a kit with its images decoded. base: the kit's folder URL.
export async function loadKit(base) {
  const kit = await (await fetch(base + "/kit.json")).json(), jobs = [];
  for (const a of Object.values(kit.actions)) for (const v of Object.values(a.views)) for (const c of Object.values(v.cels))
    jobs.push((async () => { const im = new Image(); im.src = `${base}/${c.img}`; await im.decode(); c.image = await createImageBitmap(im); })());
  await Promise.all(jobs);
  return kit;
}

// An actor keeps what must persist between frames: which view it is on (the picker has hysteresis).
export function createActor(kit) {
  const pickers = {};
  // pick(action, body, cam): which drawing this frame is on. Call it once per frame, in frame order.
  function pick(action, index, body, cam) {
    const A = kit.actions[action];
    if (!A) throw new Error(`${kit.name} has no drawings of "${action}"`);
    const { q } = body, rel = relativeYaw(cam, [q.x, 0, q.z], q.yaw);
    const sel = (pickers[action] ??= picker(7, Object.keys(A.views)))(rel);
    return { rel, action, view: sel.view, mirror: sel.mirror, cel: sel.mirror ? mirrored(action, index) : index };
  }
  // draw(g, picked, body, cam) -> { x, y, s }: where the cel's ground point went and its scale
  function draw(g, picked, body, cam) {
    const V = kit.actions[picked.action].views[picked.view], c = V.cels[picked.cel], { q } = body;
    const p = cam.project([q.x, 0, q.z]), s = p.s / c.k;
    g.save();
    g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
    g.translate(p.x, p.y); g.scale(picked.mirror ? -s : s, s);
    g.drawImage(c.image, -c.ground[0], -c.ground[1]);
    g.restore();
    return { x: p.x, y: p.y, s };
  }
  return { kit, pick, draw };
}
