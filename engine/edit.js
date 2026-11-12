// An edit: shots cut one after another into one shot, which render.mjs renders like any other.
//   edit("slice", [shotA, shotB, ...])   each shot plays whole, in order; each must start where the one before ends
// The edit's frame f is the frame f - (where its shot starts) of that shot; characters are held on twos counted
// from each shot's own first frame, and `take` tells the stage which shot a frame belongs to (a cut forgets which
// drawing each character was on). A shot's `marks` (see engine/marks.mjs) are carried over at the edit's frames, with
// one more for each cut, which is held to whatever its shot says its first frame is on (`cutOn`).
export function edit(name, shots) {
  const fps = shots[0].fps ?? 24, starts = []; let n = 0;
  for (const s of shots) {
    if (Math.abs((s.start ?? 0) * fps - ((shots[0].start ?? 0) * fps + n)) > 1e-6) throw new Error(`edit ${name}: ${s.name} starts at ${s.start}, but the shots before it end at ${(shots[0].start ?? 0) + n / fps}`);
    starts.push(n); n += s.frames;
  }
  const at = (f) => { let i = starts.length - 1; while (starts[i] > f) i--; return i; };
  return { name, start: shots[0].start ?? 0, frames: n, fps, width: shots[0].width, height: shots[0].height,
    cast: Object.assign({}, ...shots.map((s) => s.cast ?? {})), plates: Object.assign({}, ...shots.map((s) => s.plates ?? {})), sets: [...new Set(shots.flatMap((s) => s.sets ?? []))],
    cuts: shots.map((s, i) => ({ shot: s.name, frame: starts[i], frames: s.frames })),
    marks: shots.flatMap((s, i) => [...(i && s.cutOn ? [{ at: 0, what: `cut to ${s.name}`, on: s.cutOn }] : []), ...(s.marks ?? [])].map((m) => ({ ...m, at: m.at + starts[i] }))),
    held: (f) => { const i = at(f), l = f - starts[i]; return starts[i] + (shots[i].held?.(l) ?? l - l % 2); },
    frame(f, sync) { const i = at(f); return { ...shots[i].frame(f - starts[i], sync), take: i }; } };
}
