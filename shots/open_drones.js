// Opening 6, 10.83-14.17 s: "We're in deep" (2). The racks come down out of the dark over the four, a folded drone
// in every clamp; from "deep" (11.77 s) they let go one at a time, blades out, and a red eye opens on each hit.
import { FPS, CUT, CAST, KIDS, EYES, startOf, cues, kid, boil, ease, wob } from "./open_cast.js";
import { hanging, RACK } from "../sets/vault.js";
import { sfx, sfxMark } from "../engine/sfx.js";
// each eye's sound, small, beside it: [across, up] of the drone's own size from its eye, eye by eye (clear of the screens)
const PIP = [[0.7, -0.6], [-0.7, -0.65], [0.7, -0.6], [-0.5, -1.2], [0.7, -0.6], [-0.75, -0.55], [0.75, 0.35], [-0.8, -0.5], [-0.55, 0.45]];
const FRAMES = CUT.red - CUT.drones, UP = 283 - CUT.drones;
// which slot opens on which hit: round the rack from the far side to the near
const ORDER = [7, 9, 5, 10, 4, 11, 3, 0, 2, 1, 6, 8];
export function swarm(F, o = {}) {
  return ORDER.map((slot, n) => { const hit = EYES[Math.min(n, EYES.length - 1)] + (n >= EYES.length ? (n - EYES.length + 1) : 0), u = (F - hit + 5) / 9;
    return hanging(slot, { racks: cues(F).racks, unfold: u, eye: F >= hit ? 1.2 + 0.8 * Math.exp(-(F - hit) / 3) : 0, drop: 0.7 + 0.5 * ((slot * 7) % 5) / 5, ...o }); });
}
function frame(f, sync) {
  const F = CUT.drones + f, up = f >= UP, k = up ? (f - UP) / (FRAMES - UP) : f / UP;
  const hit = EYES.some((e) => e === F), since = Math.min(...EYES.map((e) => F >= e ? F - e : 99));
  const camera = up
    ? { pos: [2.0 - 1.2 * k, 1.5, 6.4 - 0.5 * k], target: [0.1, RACK.down - 0.9 + 0.03 * wob(f, 0.5, 0.3, 1), 0], fov: 50 - 4 * k }
    : { pos: [0.6, 0.85, 9.6], target: [0.3, 1.9 + 4.2 * ease(k * 1.15), 2.0], fov: 46 + 8 * ease(k) };
  return { set: "vault", camera, options: { ...cues(F), drones: swarm(F) },
    post: { ca: 0.0014 + 0.004 * Math.exp(-since / 2), bloom: 1.0 + 0.5 * Math.exp(-since / 3) },
    overlay(g, cam) {
      const all = swarm(F);
      EYES.forEach((hit, n) => { const age = F - hit; if (age < 0 || age >= 6) return; const p = cam.project(all[n].pos), k = p.s * 1.25, size = Math.min(64, Math.max(30, k * 0.34));
        sfx(g, { text: "ピッ", x: p.x + PIP[n][0] * k, y: p.y + PIP[n][1] * k, size, angle: -0.2, color: "alarm", age, life: 6, burst: false, pop: [1.35, 1.35, 1.05, 1.05] }); });
    },
    actors: up ? [] : KIDS.map((who, i) => kid(who, 1, { layer: boil(f + i) })) };
}
export default { name: "open_drones", start: startOf("drones"), frames: FRAMES, fps: FPS, cutOn: "backing_vocals",
  marks: [{ at: UP, what: "\"deep\": cut up to the rack; the first eye opens", on: "backing_vocals" }, ...EYES.slice(1).map((e, i) => ({ at: e - CUT.drones, what: `eye ${i + 2} opens`, on: i === 1 ? "lead_vocals" : "strings" })),
    ...EYES.map((e, i) => sfxMark(e - CUT.drones, "ピッ", `eye ${i + 1}`, i === 0 ? "backing_vocals" : i === 2 ? "lead_vocals" : "strings"))], sets: ["vault"], cast: CAST, frame };
