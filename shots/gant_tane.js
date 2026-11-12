// Gantry 6, 36.08-37.88 s: TANE. Side-on. The others run on past him; he plants his geta, turns, drops his shoulder,
// and as the drone on their tail comes in he goes to meet it: the hit on the drum and the brass (899), an impact
// frame, and the machine goes over the rail, spinning. His first small win. The board behind him says WE'RE, IN.
import { FPS, CUT, CAST, startOf, gz, runner, sign, wob, ease, rnd, RUN, SIGN_MARKS } from "./gant_cast.js";
import { speedLines } from "./slice_fx.js";
import { sfx, sfxMark } from "../engine/sfx.js";
const FRAMES = CUT.fall - CUT.tane, PLANT = 877 - CUT.tane, GO = 893 - CUT.tane, HIT = 899 - CUT.tane, ZT = 44;
export const HIT_AT = [0.35, 1.35, ZT - 1.25];
// the drone: in along the gantry behind him, up short as he turns (it rears, its eye burning), then at him; after the
// hit, out over the near rail and down, tumbling
export function drone(f) {
  if (f >= HIT) { const t = (f - HIT) / FPS; return { type: "chaser", pos: [HIT_AT[0] + 5.2 * t, HIT_AT[1] + 0.5 + 5.5 * t - 4.9 * t * t, HIT_AT[2] - 4.5 * t], yaw: 20 + 900 * t, pitch: 700 * t, roll: 1100 * t, eye: 0.35 + 0.5 * rnd(f), thrust: 0, scale: 1.3, seed: 12 }; }
  const near = ZT - 3.6, z = f < 20 ? near - 12 * (1 - ease(f / 20)) : f < GO ? near + 0.25 * Math.sin((f - 20) * 0.5) : near + (HIT_AT[2] - 0.55 - near) * ((f - GO) / (HIT - GO)) ** 2, rear = f >= 20 && f < GO ? ease((f - 20) / 5) : 0;
  return { type: "chaser", pos: [0.3, 1.5 + 0.25 * rear + 0.08 * Math.sin(f * 0.4), z], yaw: 0, pitch: -6 + 22 * rear - (f >= GO ? 30 * (f - GO) / (HIT - GO) : 0), roll: 10 * Math.sin(f * 0.3), eye: 1 + 0.9 * rear + (f >= GO ? 0.6 : 0), thrust: f < 20 ? 1 : f >= GO ? 1 : 0.2, scale: 1.3, seed: 12 };
}
function frame(f, sync) {
  const F = CUT.tane + f, since = f - HIT, jolt = since >= 0 ? Math.exp(-since / 2.5) : 0, shake = 0.012 + 0.09 * jolt;
  const charging = f >= PLANT, air = f >= GO ? (f - GO) / 20 : 0;
  const tane = charging
    ? { who: "tane", action: "charge", view: "side", phase: f >= HIT - 1 ? 1 : 0, yaw: 180, x: 0.3, z: ZT - (f >= GO ? 1.0 * Math.min(1, (f - GO) / (HIT - GO)) ** 2 + 0.5 * (1 - Math.exp(-Math.max(0, since) / 4)) : 0), y: f >= GO ? 0.3 * Math.sin(Math.PI * Math.min(1, air)) : 0, over: true }
    : { who: "tane", action: "run", view: "side", phase: (f - PLANT) / 12, yaw: 0, x: -0.5 + 0.8 * ease(f / PLANT), z: ZT - RUN * (PLANT - f) / FPS };
  const impact = since === 0 ? { mode: 1, impact: { dark: [0.02, 0, 0.06], mid: [0.02, 0, 0.06], light: [1, 1, 1], ink: [1, 1, 1], thresholds: [0.3, 0.3], cel: [[1, 1, 1], [1, 1, 1]] } }
    : since === 1 ? { mode: 1, impact: { dark: [0.1, 0.02, 0.0], mid: [0.95, 0.42, 0.08], light: [1.0, 0.9, 0.55], ink: [0.04, 0, 0.02], thresholds: [0.15, 0.4], cel: [[0.04, 0, 0.02], [1, 1, 1]] } } : null;
  return { set: "gantry",
    camera: { pos: [8.4 + shake * wob(f, 9, 14, 1), 2.1 + shake * wob(f, 11, 17, 2), ZT - 0.9 - 0.5 * ease(f / FRAMES)], target: [0, 1.15, ZT - 1.1 - 0.5 * ease((f - PLANT) / 20)], fov: 34 - 3 * ease((f - PLANT) / 22) },
    options: { sign: sign(F), alert: 0.6, drones: [drone(f)] },
    post: impact ?? { ca: 0.0012 + 0.005 * jolt, flash: since === 2 ? 0.4 : since === 3 ? 0.12 : 0, bloom: 1.0 + 0.5 * jolt },
    actors: [tane, ...["noor", "ife"].map((who) => runner(who, F, { view: "side", ...(who === "ife" ? { x: -0.85 } : { x: -0.35 }) }))],
    overlay(g, cam) {
      const hit = cam.project(HIT_AT);
      if (f >= PLANT && f < PLANT + 4) {          // his geta bite: a kick of dust and sparks at his feet
        const p = cam.project([0.3, 0.05, ZT + 0.2]), u = f - PLANT, R = 40 + 26 * u; g.fillStyle = u < 2 ? "#fff6d8" : "#ffd23c"; g.beginPath(); for (let i = 0; i < 14; i++) { const a = Math.PI + i / 13 * Math.PI, r = i % 2 ? R * 0.35 : R * (0.7 + 0.6 * rnd(i, u)); g.lineTo(p.x + Math.cos(a) * r * 1.6, p.y + Math.sin(a) * r * 0.7); } g.closePath(); g.fill();
      }
      if (since === 0) speedLines(g, 1920, 1080, { cx: hit.x, cy: hit.y, n: 120, seed: 14, inner: 150, color: "#07020f", width: 0.024, reach: 0.9 });
      else if (since === 1) speedLines(g, 1920, 1080, { cx: hit.x, cy: hit.y, n: 100, seed: 15, inner: 210, color: "#fff", width: 0.02, reach: 0.9 });
      sfx(g, { text: "ドカッ", x: 1290, y: 830, size: 104, angle: -0.12, color: since < 2 ? ["#ffffff", "#07020f"] : "tane", age: since, life: 10, shake: 12, seed: 5 });      // on the dark of the deck, under the hit: clear of his face and of the board; in the impact frames' own black and white while they last
      if (since >= 1 && since < 6) { g.save(); g.translate(hit.x + 70, hit.y - 60); g.fillStyle = since < 4 ? "#fff6d8" : "#ff8a2a"; g.beginPath(); const n = 12, R = (60 + since * 14) * (since < 4 ? 1 : 0.6); for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * 2 * Math.PI + since, r = i % 2 ? R * (0.25 + 0.1 * since) : R * (0.7 + 0.6 * rnd(i, since - since % 2)); g.lineTo(Math.cos(a) * r, Math.sin(a) * r * 0.85); } g.closePath(); g.fill(); g.restore(); }
    } };
}
// drawings on twos, counted so that a new one lands on the hit
export default { name: "gant_tane", start: startOf("tane"), frames: FRAMES, fps: FPS, cutOn: "beat", held: (f) => f < PLANT ? f - f % 2 : Math.max(PLANT, f - (f + HIT) % 2),
  marks: [{ at: PLANT, what: "Tane plants his feet and turns", on: "beat" }, { at: HIT, what: "Tane's shoulder meets the drone: impact frames", on: "drums" }, sfxMark(HIT, "ドカッ", "his shoulder meets the drone", "drums"), ...SIGN_MARKS(CUT.tane, CUT.fall)], sets: ["gantry"], cast: CAST, frame };
