// Opening 10, 19.08-19.92 s: they bolt. Low in front of them, backing out through the one open doorway and up the
// passage: the four sprint out of the red vault at us, the corridor's light coming up on their faces, the drones
// diving after them, the last shutter starting down behind them. The next section picks the run up from here.
import { FPS, CUT, CAST, CADENCE, RUN, startOf, cues, ease, wob } from "./open_cast.js";
import { bayAt, bayDir, R } from "../sets/vault.js";
import { swarm } from "./open_drones.js";
const FRAMES = CUT.end - CUT.bolt, D = bayDir(0), YAW = Math.atan2(D[0], D[2]) * 180 / Math.PI, ACROSS = [D[2], 0, -D[0]];
// along the way out: s metres past the doorway's threshold (negative: still in the vault), x across it
const way = (s, x = 0, y = 0) => [D[0] * (R + s) + ACROSS[0] * x, y, D[2] * (R + s) + ACROSS[2] * x];
const PLACE = { tane: [-0.95, 0, 0.1], ife: [0.3, -0.9, 0.7], juno: [1.05, -1.3, 0.55], noor: [-0.4, -1.9, 0.3] };      // across, behind the leader, where in the cycle
function frame(f, sync) {
  const F = CUT.bolt + f, k = f / FRAMES, lead = -6.4 + RUN * f / FPS, c = cues(F), shake = 0.02;
  const pack = swarm(F, {}).map((d, i) => { const a = i / 12 * 6.28, s = lead - 5 - (i % 4) * 1.6 + 0.5 * Math.sin(F * 0.4 + i); return { ...d, fold: 0, pos: way(s, 1.5 * Math.sin(a * 2 + i), 1.5 + 0.9 * Math.abs(Math.cos(a * 3 + i))), yaw: YAW, pitch: -8, roll: 14 * Math.sin(F * 0.3 + i), eye: 1.5, thrust: 1, scale: 1 }; });
  return { set: "vault",
    camera: { pos: way(lead + 3.5 - 0.5 * k, 0.45 + wob(f, 1.9, 3.1, 1) * shake, 0.4 + wob(f, 2.3, 3.7, 2) * shake), target: way(lead - 0.6, -0.1, 1.12), fov: 50, up: [Math.sin(0.06), Math.cos(0.06), 0] },
    options: { ...c, doors: { ...c.doors, 0: 0.42 * ease(k * 1.2) }, drones: pack, speech: { text: "TROUBLE", alarm: 1 }, post: { bgBlur: 0.012, focus: [0.5, 0.55] } },
    actors: Object.entries(PLACE).map(([who, [x, ds, ph]]) => ({ who, action: "run", view: "front", phase: ph + f / CADENCE[who], yaw: YAW, steady: 4, ...(() => { const p = way(lead + ds, x + 0.1 * Math.sin(f * 0.11 + ph * 9)); return { x: p[0], z: p[2] }; })() })) };
}
export default { name: "open_bolt", start: startOf("bolt"), frames: FRAMES, fps: FPS, cutOn: "lead_vocals", sets: ["vault"], cast: CAST, frame };
