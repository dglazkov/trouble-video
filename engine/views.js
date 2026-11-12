// Which of a kit's five drawings shows a character from where the camera stands. A view is drawn for the camera at
// its yaw round the character (0 front, 90 the character's left side, 180 back); the other side is the same drawing
// mirrored, which gives eight directions.
export const VIEWS = [
  { name: "front", yaw: 0, symmetric: true },
  { name: "front34", yaw: 45, bent: true },
  { name: "side", yaw: 90, bent: true },
  { name: "back34", yaw: 135, bent: true },
  { name: "back", yaw: 180, symmetric: true },
];
export const wrap = (a) => { a = ((a + 180) % 360 + 360) % 360 - 180; return a === -180 ? 180 : a; };

// The nearest view to a relative yaw (degrees, signed). keep: the mirror to keep where the sign says nothing.
export function nearest(rel, keep = false) {
  rel = wrap(rel);
  const a = Math.abs(rel);
  let best = VIEWS[0];
  for (const v of VIEWS) if (Math.abs(v.yaw - a) < Math.abs(best.yaw - a)) best = v;
  const mirror = best.symmetric ? keep : rel < 0;
  return { view: best.name, yaw: best.yaw, mirror };
}
// A picker with memory: it keeps the current drawing until the camera is `margin` degrees past the boundary, so a
// character hovering on a boundary does not flicker between two drawings. Feed it every frame, in order.
export function picker(margin = 7) {
  let cur = null;
  return (rel) => {
    rel = wrap(rel);
    if (cur) {
      const centre = cur.mirror ? -cur.yaw : cur.yaw;
      const d = Math.min(Math.abs(wrap(rel - centre)), cur.yaw === 0 || cur.yaw === 180 ? Math.abs(wrap(rel + centre)) : 1e9);
      if (d <= 22.5 + margin) return cur;
    }
    cur = nearest(rel, cur ? cur.mirror : rel < 0);
    return cur;
  };
}
