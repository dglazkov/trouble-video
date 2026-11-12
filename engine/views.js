// Which of a kit's drawings shows a character from where the camera stands. A view is drawn for the camera at its
// yaw round the character (0 front, 90 the character's left side, 180 back); the other side is the same drawing
// mirrored. A kit need not have every view: the picker chooses among the ones it is given.
export const VIEWS = [
  { name: "front", yaw: 0 },
  { name: "front34", yaw: 45 },
  { name: "side", yaw: 90 },
  { name: "back34", yaw: 135 },
  { name: "back", yaw: 180 },
];
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
    for (const mirror of straight ? [keep] : [false, true]) {
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
