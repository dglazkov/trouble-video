// Ife's win: THE CHAIN, 169-267: one blast on every kick from 179, racing down the passage toward us, fire and burst
// coolant turn about (engine/fx.js, standing in the set on cards at each blast's own depth), each an impact frame, a
// jolt, and its light slammed across the walls.
//   first  169  from the dead end, Ife a ball on the floor under the swarm; 179 the first, far behind them: they look
//               round; 189 the second
//   x2     199  in the passage beside it: fire on 199; on 209 the main lets go
//   x3     219  a long lens from in front of what is left of the swarm: 219, 229, wrecks thrown at us
//   x4     239  Ife, low and close, 239 and 249 behind her
//   hit    258  the last one takes the camera
import { CUT, W, H, IFE, shot, src, stand, plateLight, plant, hitAt, blastPost, shake, eyeDots, DUCK, BLASTS, wob, ease, rnd, F0 } from "./boom_cast.js";
import { fireBlast, drone2d, FIRE, ICE } from "../engine/fx.js";
import { speedLines } from "./slice_fx.js";
const marksIn = (name) => BLASTS.filter((b) => b.at >= CUT[name] && b.at < CUT[name] + (CUT[Object.keys(CUT)[Object.keys(CUT).indexOf(name) + 1]] - CUT[name]) && b.at > CUT[name]).map((b) => ({ at: b.at - CUT[name], what: b.ice ? "a main bursts" : "a blast", on: "kick" }));
const lines = (g, L, cx = W / 2, cy = H / 2) => { const h = hitAt(L); if (!h) return; if (h.age === 0) speedLines(g, W, H, { n: 100, seed: L, inner: 300, color: h.ice ? "#ffffff" : "#fff3c0", width: 0.02, cx, cy }); else if (h.age < 4) speedLines(g, W, H, { n: 56, seed: L, inner: 420 + h.age * 70, color: "rgba(255,255,255,0.85)", width: 0.008, cx, cy }); };
// the light of the newest blast on her drawing
const lit = (L, k = 1) => { const h = hitAt(L), j = h ? Math.exp(-h.age / 7) * k : 0; return h ? plateLight(h.ice ? { ice: j } : { fire: j }) : plateLight({ red: 0.8 }); };
const duckCel = (cam, L, o = {}) => ({ plate: "duck", ...stand(cam, IFE, DUCK.foot, DUCK.m), layer: { ...lit(L, o.k ?? 1), warp: o.warp ?? 0, warpDir: [0.3, -1], warpTime: (L - L % 2) * 0.9, warpStill: o.still ?? [0.5, 0.3], warpRadius: 0.12 } });

export const first = shot("first", { plates: { duck: src("boom_duck_1") }, marks: [{ at: 0, what: "she ducks, the swarm on top of her", on: "kick" }, { at: 10, what: "the first blast, far down the passage", on: "kick" }, { at: 20, what: "a main bursts", on: "kick" }],
  frame(f, sync) {
    const L = CUT.first + f, s = shake(L, 0.6), cam = { pos: [-0.3 + s[0], 0.72 + s[1], -2.1], target: [-0.3, 1.4 + 0.02 * Math.min(f, 10), 18], fov: 47 - 0.25 * Math.min(f, 10) }, set = plant(L, sync);
    return { set: "plant", camera: cam, options: { ...set, wiring: f < 10 ? { lamps: 0.45 } : {} }, cels: [duckCel(cam, L)],
      under(g) { eyeDots(g, cam, set.drones, 40); }, overlay(g) { lines(g, L, W * 0.52, H * 0.42); },
      post: { ...blastPost(L), ...(f === 0 ? { flash: 0.14 } : {}), vignette: 0.5 } };
  } });
export const x2 = shot("x2", { marks: [{ at: 0, what: "a blast, beside us", on: "kick" }, { at: 10, what: "a main bursts", on: "kick" }],
  frame(f, sync) {
    const L = CUT.x2 + f, s = shake(L), cam = { pos: [1.45 + s[0], 0.6 + s[1], 32 - 0.05 * f], target: [-0.6, 2.1, 44], fov: 58, up: [Math.sin(0.1), Math.cos(0.1), 0] }, set = plant(L, sync, { fine: true });
    return { set: "plant", camera: cam, options: set, overlay(g) { lines(g, L, W * 0.47, H * 0.4); }, post: { ...blastPost(L), bgBlur: 0.01, focus: [0.47, 0.4] } };
  } });
export const x3 = shot("x3", { marks: [{ at: 0, what: "a blast behind the swarm", on: "kick" }, { at: 10, what: "a main bursts", on: "kick" }],
  frame(f, sync) {
    const L = CUT.x3 + f, s = shake(L, 0.5), cam = { pos: [0.2 + s[0], 1.5 + s[1], 6.5], target: [0, 1.8, 30], fov: 25 - 0.05 * f }, set = plant(L, sync, { fine: true });
    return { set: "plant", camera: cam, options: set,
      overlay(g) { lines(g, L, W * 0.5, H * 0.45);
      },
      post: { ...blastPost(L), bgBlur: 0.012, focus: [0.5, 0.45] } };
  } });
export const x4 = shot("x4", { plates: { duck: src("boom_duck_1") }, marks: [{ at: 0, what: "a blast, close behind her", on: "kick" }, { at: 10, what: "the main over her bursts", on: "kick" }],
  frame(f, sync) {
    const L = CUT.x4 + f, s = shake(L, 0.8), cam = { pos: [-0.85 + s[0], 0.42 + s[1], -1.0 + 0.008 * f], target: [-1.0, 0.95, 6], fov: 48, up: [Math.sin(-0.07), Math.cos(-0.07), 0] }, set = plant(L, sync, { fine: true });
    return { set: "plant", camera: cam, options: set, cels: [duckCel(cam, L, { warp: 5, k: 1.2 })],
      overlay(g) { lines(g, L, W * 0.42, H * 0.4);
        // what the blast throws over her: streaks of debris across the top of the frame, on twos
        const h = hitAt(L), a2 = h.age - h.age % 2; if (h.age < 12) for (let i = 0; i < 9; i++) { const t = (a2 + 1 + rnd(i, h.b.at) * 2) / 12, x0 = W * (0.42 + (rnd(i, h.b.at, 1) - 0.5) * 0.2), y0 = H * 0.4, ang = -2.6 + rnd(i, h.b.at, 2) * 2.1, d = 1500 * t, x = x0 + Math.cos(ang) * d, y = y0 + Math.sin(ang) * d * 0.75 + 380 * t * t, w = 10 + 26 * rnd(i, 3) * t;
          g.fillStyle = "#140a16"; g.beginPath(); g.moveTo(x, y); g.lineTo(x - Math.cos(ang) * 190 * t - w, y - Math.sin(ang) * 150 * t); g.lineTo(x - Math.cos(ang) * 190 * t + w, y - Math.sin(ang) * 150 * t + w); g.closePath(); g.fill();
          g.fillStyle = h.ice ? ICE.pale : FIRE.orange; g.beginPath(); g.arc(x, y, w * 0.8, 0, 7); g.fill(); } },
      post: { ...blastPost(L), bgBlur: 0.008, focus: [0.42, 0.4] } };
  } });
// the last blast: its card first, then the same fireball drawn straight on the frame as it swallows the lens
export const hit = shot("hit", { marks: [{ at: 0, what: "the last blast takes the camera", on: "kick" }],
  frame(f, sync) {
    const L = CUT.hit + f, s = shake(L, 1.6), cam = { pos: [0.1 + s[0], 1.4 + s[1], -1.6 + 0.12 * f], target: [0, 1.6, 12], fov: 52 + 1.2 * f }, set = plant(L, sync, { fine: true });
    const sc = typeof OffscreenCanvas !== "undefined" ? (hit.sc ??= new OffscreenCanvas(W, H)) : null;
    return { set: "plant", camera: cam, options: set,
      overlay(g) { lines(g, L, W * 0.5, H * 0.46);
        if (f >= 1 && sc) { const c = sc.getContext("2d"); c.clearRect(0, 0, W, H); fireBlast(c, { cx: W * 0.5, cy: H * 0.5, s: 170 * (1 + 0.55 * f) }, f + 1, { R: 2.4, seed: 59, floor: -9, wrecks: 0, debris: 0 }); g.drawImage(sc, 0, 0); }
        if (f >= 6) speedLines(g, W, H, { n: 90, seed: f - f % 2, inner: 120, color: "#140a16", width: 0.016 }); },
      post: f === 0 ? blastPost(L) : { flash: f === 1 ? 0.4 : f >= 7 ? [0.35, 0.7, 1][f - 7] : 0.004, ca: 0.004 + 0.002 * f, bloom: 1.2, bgBlur: 0.03 } };
  } });
