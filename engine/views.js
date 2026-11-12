// Which of a kit's drawings shows a character from where the camera stands. A view is drawn for the camera at its
// yaw round the character (0 front, 90 the character's left side, 180 back); the other side is the same drawing
// mirrored. A kit need not have every view: the picker chooses among the ones it is given.
import { camera, orbit } from "./body.js";
export const VIEWS = [
  { name: "front", yaw: 0 },
  { name: "front34", yaw: 45 },
  { name: "side", yaw: 90 },
  { name: "back34", yaw: 135 },
  { name: "back", yaw: 180 },
];
// One more drawing is not a yaw: "top", the character seen from straight above, head toward the top of the drawing.
// It is shown when the camera looks down steeply, turned to the way the character heads on screen.
export const TOP = { name: "top", yaw: null, elev: 90 };
export const viewOf = (name) => name === "top" ? TOP : VIEWS.find((v) => v.name === name);
// The camera a view's drawing is made from (orthographic, k pixels per unit, the character's ground point at
// cx, cy): the layout sheet is drawn with it, and the checks ask it where the skeleton's feet are in a drawing.
export function viewCamera(name, k, cx, cy, elev = 5) {
  if (name === "top") return camera({ pos: [0, 10, 0], target: [0, 0, 0], up: [0, 0, 1], ortho: k, w: 0, h: 0, cx, cy });
  return orbit([0, 0, 0], viewOf(name).yaw, 10, { ortho: k, w: 0, h: 0, cx, cy, elev });
}
export const wrap = (a) => { a = ((a + 180) % 360 + 360) % 360 - 180; return a === -180 ? 180 : a; };
const dist = (rel, v, mirror) => Math.abs(wrap(rel - (mirror ? -v.yaw : v.yaw)));

// The nearest view to a relative yaw (degrees, signed), among `names` (default: all). keep: the mirror to keep where
// the sign says nothing (straight in front or behind).
export function nearest(rel, keep = false, names = null) {
  rel = wrap(rel);
  let best = null, bd = 1e9;
  for (const v of VIEWS) {
    if (names && !names.includes(v.name)) continue;
    const straight = v.yaw === 0 || v.yaw === 180;
    // a drawing from straight in front or behind is never mirrored: it would put what is on one side of the
    // character (a patch, a streak of hair, a monitor) on the other
    for (const mirror of straight ? [false] : [false, true]) {
      const d = dist(rel, v, mirror);
      if (d < bd - 1e-9 || (Math.abs(d - bd) <= 1e-9 && mirror === keep)) { best = { view: v.name, yaw: v.yaw, mirror }; bd = d; }
    }
  }
  if (!best) throw new Error("no view to pick from");
  return best;
}
// A picker with memory: it keeps the current drawing until another is nearer by more than twice `margin` degrees,
// so a character hovering on a boundary does not flicker between two drawings. Feed it every frame, in order.
export function picker(margin = 7, names = null) {
  let cur = null;
  return (rel) => {
    rel = wrap(rel);
    const n = nearest(rel, cur ? cur.mirror : rel < 0, names);
    if (cur && (n.view !== cur.view || n.mirror !== cur.mirror)) {
      const v = VIEWS.find((x) => x.name === cur.view);
      if (dist(rel, v, cur.mirror) <= dist(rel, VIEWS.find((x) => x.name === n.view), n.mirror) + 2 * margin) return cur;
    }
    cur = n;
    return cur;
  };
}
