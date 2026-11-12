// (Out of the cut since the atrium became a painted vista: shots/desc_out.js holds it through these frames, and
// shots/descent.js goes from it straight to the lift. Kept as it was, 22.38-23.21 s, should the cut want it back.)
// Descent 2, 22.38-23.21 s: THE STAIRHEAD, from straight above. The shaft drops away under the picture, flight under
// flight; the four come in along the walkway from the gantry's door in single file. Tane, Juno and Ife swing right,
// onto the stairs. Noor, last, does not.
import { FPS, CUT, CAST, CADENCE, RUN, startOf, ease, wob, clamp } from "./desc_cast.js";
import { stand, H, X0, X1 } from "../sets/stairplan.js";
const FRAMES = CUT.gate - CUT.head;
// the way the three go: down the walkway (+Z), round onto the first flight (+X). s: metres along it -> [x, z, yaw]
const WX = -3.3, TURN = 1.5, ZT = stand(0) - TURN;      // the walkway's line; the turn's radius; where the turn starts
function way(s, side = 0) {
  const arc = TURN * Math.PI / 2, z0 = -7.5;
  if (s < ZT - z0) return [WX - side, z0 + s, 0];
  const u = s - (ZT - z0);
  if (u < arc) { const a = u / TURN; return [WX + TURN - (TURN + side) * Math.cos(a), ZT + (TURN + side) * Math.sin(a), a * 180 / Math.PI]; }
  return [WX + TURN + (u - arc), ZT + TURN + side, 90];
}
// Noor's: the same walkway, then left across the landing toward the lift's balcony
function noorWay(s) { const z0 = -7.5, z = z0 + s; if (z < -0.6) return [WX - 0.25, z, 0]; const u = z + 0.6, a = Math.min(0.9, u / 1.6); return [WX - 0.25 - 1.6 * (1 - Math.cos(a)), -0.6 + 1.6 * Math.sin(a), -a * 180 / Math.PI]; }
const START = { tane: 5.6, juno: 4.1, ife: 2.7, noor: 1.2 }, SIDE = { tane: 0.15, juno: -0.2, ife: 0.2 }, PH = { tane: 0.1, juno: 0.55, ife: 0.7, noor: 0.3 };
// how far down the first flight someone at x is (eased over its first metre: nobody's height changes at a stroke)
const down = (x) => { const d = x - X0; return d < 0 ? 0 : -H / (X1 - X0) * (d < 1 ? d * d / 2 : d - 0.5); };
function frame(f, sync) {
  const k = f / FRAMES, a = -0.1 + 0.16 * k;
  return { set: "stairwell",
    camera: { pos: [-1.9 + 0.3 * k, 21 - 2 * ease(k), -2.0], target: [-1.9 + 0.3 * k, 0, -2.05], fov: 25, up: [Math.sin(a), 0, -Math.cos(a)] },
    options: { front: true, valueFrom: 3.5, lift: { y: 0, gate: 0, lamp: 0.6 }, alert: 0.6, alarmLevels: 1 },
    post: { ca: 0.0014, vignette: 0.5 },
    actors: Object.keys(START).map((who) => { const s = START[who] + RUN * f / FPS, [x, z, yaw] = who === "noor" ? noorWay(s) : way(s, SIDE[who]); return { who, action: "runtop", view: "top", phase: PH[who] + f / CADENCE[who], x, z, yaw, y: down(x) }; }) };
}
export default { name: "desc_head", start: startOf("head"), frames: FRAMES, fps: FPS, cutOn: "beat", sets: ["stairwell"], cast: CAST, frame };
