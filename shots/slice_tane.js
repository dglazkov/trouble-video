// Slice 4, 53.00-56.08 s: TANE, and the hole he leaves. Side-on down the corridor (the near wall cut away), tracking him
// right to left. The shutter ahead bites further shut on every drum hit and is SHUT, teeth meshed, two beats before he gets
// there; he drops his shoulder all the same, and the camera runs on ahead of him to look back at the plate's far face.
// On the bar line (55.29 s) he comes through the plate itself: impact frames, and a hole in his own shape left in it
// (sets/corridor.js `holes`; the outline is his drawing's on that frame: pipeline/hole.mjs). He lands in a skid on the
// next drum hit. The chaser on his heels goes for the hole at full speed and does not fit: on the hit after (55.67 s) it
// jams in his outline, its blades torn off; the ones behind pile into the back of it, and on the last hit it bursts. He
// looks back at it over his shoulder. Why the machine is stopped is on the screen: the door is shut, and the only way
// through is the shape of a boy.
import { FPS, CUT, CAST, RUN, startOf, ease, wob } from "./slice_cast.js";
import { speedLines } from "./slice_fx.js";
import { sfx, sfxMark, rays } from "../engine/sfx.js";
import { fireBlast, skid } from "../engine/fx.js";
import { HOLE } from "./slice_tane_hole.js";
const FRAMES = CUT.ride - CUT.tane, SHUT = 44, HIT = 55, LAND = 59, JAM = 64, BREAK = 69, GATE = 24;     // frames of this shot; the shutter's z
// side-on, a foot that slides shows: he covers exactly his own stride every cycle of twelve frames (RUN is that speed).
// He runs until WIND frames before the hit, then drops his shoulder and leaves the ground: the wind-up drawing is
// one held pose, so it is in the air (a low bound into the shutter), not sliding along the floor on a planted foot.
const CYCLE = 12, WIND = 6, BOUND = 0.1, STEP = RUN / FPS, FLY = 0.55, ZL = GATE + FLY * (LAND - HIT);
// he is at the shutter on HIT, comes out of it faster than he went in, lands on LAND and skids to a stand
const tz = (f) => f <= HIT ? GATE + STEP * (f - HIT) : f <= LAND ? GATE + FLY * (f - HIT) : ZL + 0.5 * (1 - Math.exp(-(f - LAND) / 2.4));
// the hole: where its middle is (the chaser aims for it) and how wide it is
const HX = HOLE.map((p) => p[0]), HY = HOLE.map((p) => p[1]), HC = [(Math.min(...HX) + Math.max(...HX)) / 2, (Math.min(...HY) + Math.max(...HY)) / 2];
// the shutter: how far shut it is, biting on each drum hit that has landed (the drum stem's onsets); shut on SHUT
function gate(f, sync) {
  if (f >= SHUT) return [1, 1];
  const F = startOf("tane") * FPS + f, d = sync.at(F).stems.drums, hits = Math.max(0, d.index - sync.at(startOf("tane") * FPS).stems.drums.index);
  const shut = Math.min(0.9, 0.1 + 0.1 * hits + 0.03 * Math.min(1, d.since * 12)), bite = d.since < 0.09 ? 0.05 : 0;
  return [shut + bite, Math.min(0.86, shut * 0.95) + bite];
}
const SCALE = 1.3, GAPS = [STEP * (JAM - HIT), 3.9, 5.2, 6.6, 8.2], STOP = [0, 0.95, 1.6, 2.6, 3.3];      // the pack: how far behind him each flies, and how far short of the plate each ends up

function frame(f, sync) {
  const F = startOf("tane") * FPS + f, drums = sync.drive({ stem: "drums", mode: "pulse", decay: 0.12 }, F), z = tz(f), since = f - HIT, jam = f - JAM, brk = f - BREAK;
  const jolt = since >= 0 ? Math.exp(-since / 2.5) : 0, slam = jam >= 0 ? Math.exp(-jam / 3) : 0, shove = (f >= JAM + 2 ? 0.09 : 0) + (f >= JAM + 4 ? 0.09 : 0), bump = f >= JAM + 2 && f < BREAK ? Math.exp(-((f - JAM) % 2) / 1.2) : 0;
  const lead = [HC[0], HC[1] - 0.05, GATE + 0.04 + shove], BIG = 1.75;      // where the first chaser is wedged: its eye and cowl through on our side, its blades not
  const drones = GAPS.map((gap, i) => {
    const y0 = 1.45 + 0.45 * Math.sin(i * 2.1) + 0.12 * Math.sin(F * 0.4 + i), x0 = 0.8 * Math.sin(i * 1.3 + 0.5), dz = GATE + STEP * (f - HIT) - gap, aim = ease((f - HIT + 4) / 12);
    if (i === 0 && brk >= 0) return { type: "chaser", pos: lead, yaw: 0, scale: BIG, broken: brk / FPS, carry: 1.2, seed: 50, smoke: false, burst: false };
    if (i === 0 && jam >= 0) return { type: "chaser", pos: [lead[0] + 0.02 * wob(f, 7, 13, 1), lead[1] + 0.02 * wob(f, 9, 11, 2), lead[2]], yaw: 5 * wob(f, 5, 9, 3), pitch: 4 * wob(f, 6, 8, 4), roll: 16 * Math.sin(f * 2.4), scale: BIG, thrust: 1.6, eye: 2, snap: jam / FPS, carry: 2.6, seed: 50 };      // stuck: straining, eye wide
    if (i === 0) return { type: "chaser", pos: [x0 + (HC[0] - x0) * aim, y0 + (HC[1] - y0) * aim, dz], yaw: 0, pitch: -8 * (1 - aim), roll: 10 * Math.sin(F * 0.3) * (1 - aim), scale: since >= 0 ? BIG : SCALE,      // behind the plate it is drawn larger: what fills the hole must be seen to be too big for it
      thrust: Math.max(drums, aim), eye: 1 + Math.max(drums, 0.6 * aim), seed: 50 };
    if (dz > GATE - STOP[i]) return { type: "chaser", pos: [HC[0] + (x0 - HC[0]) * 0.35, HC[1] + (y0 - HC[1]) * 0.4, GATE - STOP[i]], yaw: 24 * Math.sin(i * 3), pitch: 20, roll: 30 * Math.sin(i * 2 + f * 0.6), scale: SCALE, thrust: 0, eye: 1.7, seed: 50 + i };      // into the back of the one in front
    return { type: "chaser", pos: [x0, y0, dz], yaw: 0, pitch: -8, roll: 10 * Math.sin(F * 0.3 + i), scale: SCALE, thrust: drums, eye: 1 + drums, seed: 50 + i };
  });
  // the camera leads him toward the shutter, side-on; as it shuts and he winds up it runs on past the bulkhead and turns
  // to look back at the plate's far face, three-quarter on, and is waiting there when he comes through; then it pushes in
  const cz = Math.min(z + 0.9 - 1.3 * ease((f - HIT + 8) / 20), GATE + 1.5), w = ease((f - (HIT - WIND - 1)) / 6), shake = 0.09 * jolt + 0.06 * slam + 0.03 * bump + (brk >= 0 ? 0.06 * Math.exp(-brk / 3) : 0);
  const A = { pos: [7.2, 1.02, cz - 1.6], target: [0, 1.5, cz + 0.4] }, B = { pos: [3.6, 1.25, GATE + 5.2], target: [0.6, 1.12, GATE + 0.5] }, mix = (a, b) => a.map((v, i) => v + (b[i] - v) * w);
  const pos = mix(A.pos, B.pos), target = mix(A.target, B.target);
  const impact = since === 0 ? { mode: 1, impact: { dark: [0.02, 0, 0.06], mid: [0.02, 0, 0.06], light: [1, 1, 1], ink: [1, 1, 1], thresholds: [0.3, 0.3], cel: [[1, 1, 1], [1, 1, 1]] } }
    : since === 1 ? { mode: 1, impact: { dark: [0.07, 0.0, 0.1], mid: [0.92, 0.1, 0.16], light: [1.0, 0.86, 0.5], ink: [0.02, 0, 0.05], thresholds: [0.15, 0.36], cel: [[0.02, 0, 0.05], [1, 1, 1]] } } : null;
  // what he is drawn doing: the run; the wind-up; then the three drawings made for this camera (the burst, the landing, the look back)
  const charging = f >= HIT - WIND && f < HIT, me = { who: "tane", x: since <= 0 ? 0 : -0.4 * ease(since / (LAND - HIT)), z };
  const actor = f < HIT ? { ...me, action: charging ? "charge" : "run", view: "side", phase: charging ? 0 : f / CYCLE, over: f >= HIT - 12 && w < 0.5, y: charging ? BOUND * Math.sin(Math.PI * (f - (HIT - WIND) + 0.5) / (WIND + 0.5)) : 0 }
    : f < LAND ? { ...me, action: "slice_burst", phase: 0, hero: "burst", over: true, y: 0.1 + 0.14 * Math.sin(Math.PI * since / (LAND - HIT)) * (1 - since / (LAND - HIT)) - 0.1 * since / (LAND - HIT) }
    : { ...me, action: "slice_burst", phase: f < JAM + 1 ? 0.34 : 0.67, hero: f < JAM + 1 ? "land" : "look", yaw: 50, over: true, y: 0 };
  return { set: "corridor",
    camera: { pos: [pos[0] + shake * wob(f, 9, 14, 1), pos[1] + shake * wob(f, 11, 17, 2), pos[2]], target, fov: 37 },
    options: { cut: "right", clearStruts: [22, 34], alert: 0.3, doors: { 1: gate(f, sync) }, holes: since >= 0 ? { 1: { outline: HOLE, age: since / FPS, seed: 3, haze: { back: 2.2, x: [-2.7, 0.7] } } } : undefined, drones },
    post: impact ?? { bgStreak: [0.004, 0], ca: 0.0012 + 0.005 * Math.max(jolt, slam), flash: since === 2 ? 0.22 : since === 3 ? 0.08 : jam === 0 ? 0.2 : 0, bloom: 0.85 + 0.5 * jolt },
    actors: f < HIT && w > 0.6 ? [] : [actor],      // behind the shut plate, from where the camera now is
    overlay(g, cam, bodies) {
      const hole = cam.project([HC[0], HC[1], GATE + 0.2]);
      if (since === 0) speedLines(g, 1920, 1080, { cx: hole.x, cy: hole.y, n: 120, seed: 4, inner: 330, color: "#07020f", width: 0.024, reach: 0.9 });
      else if (since === 1) speedLines(g, 1920, 1080, { cx: hole.x, cy: hole.y, n: 100, seed: 5, inner: 400, color: "#fff", width: 0.02, reach: 0.9 });
      // the word for it, on the plate beside the hole (his grin is on the other side of it): in the impact frames' black and white, then his red
      sfx(g, { text: "バキッ", x: hole.x + 330, y: hole.y - 250, size: 104, angle: -0.1, color: since < 2 ? ["#ffffff", "#07020f"] : "tane", age: since, life: 8, shake: 12, seed: 6 });
      // he lands: dust from under his sandals, thrown the way he is still going
      if (f >= LAND) { const p = cam.project([me.x, 0, z + 0.1]); skid(g, p.x, p.y, p.s, f - LAND, -1, 7); }
      // the chaser jams in the hole: the station's hard stop, and sparks off the torn edge while it strains
      if (jam >= 0 && brk < 0) rays(g, hole.x, hole.y, { color: "#fff3c4", width: 5, n: 10, angle: (i) => i * 0.63 + (jam - jam % 2) * 0.4, r0: () => hole.s * 0.42, r1: (i) => hole.s * (0.52 + 0.1 * (i % 3)), sy: 1.25 });
      sfx(g, { text: "ガッ", x: hole.x + 300, y: hole.y - 270, size: 130, angle: -0.12, color: "station", age: jam, life: BREAK - JAM, shake: 14, seed: 9 });
      if (brk >= 0) fireBlast(g, { cx: hole.x, cy: hole.y, s: hole.s }, brk, { R: 0.7, seed: 23, floor: -HC[1], wrecks: 0, debris: 6 });
    } };
}
// drawings on twos, counted so that a new one lands on the hit (an odd frame): the impact frame shows the impact drawing
export default { name: "slice_tane", start: startOf("tane"), frames: FRAMES, fps: FPS, cutOn: "drums", held: (f) => Math.max(0, f - (f + HIT) % 2),
  marks: [{ at: SHUT, what: "the shutter bites shut", on: "drums" }, { at: HIT, what: "Tane goes through the shut plate: impact frames", on: "bar" }, sfxMark(HIT, "バキッ", "he leaves a hole his own shape", "bar"),
    { at: LAND, what: "he lands in a skid", on: "drums" }, { at: JAM, what: "the chaser jams in the hole", on: "drums" }, sfxMark(JAM, "ガッ", "the chaser's hard stop", "drums"), { at: BREAK, what: "the jammed chaser bursts", on: "drums" }], sets: ["corridor"], cast: CAST, frame };
