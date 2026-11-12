// Ife's win: AFTER, 268-307. Smoke, and nothing moving in it but smoke; the passage is black and white with rime. Ife
// is still a ball on the floor. On 278 she looks out over her knees. Then, close: she pushes her glasses up her nose
// with one finger (288), lets the hand drop, and on the last kick (298) her CRT says OK.
import { CUT, W, H, IFE, shot, src, stand, plateLight, plant, readout, quadOf, SCREEN, DUCK, PW, PH, wob, ease, rnd } from "./boom_cast.js";
import { smokeBank, drone2d } from "../engine/fx.js";
const AFTER = { tint: [0.78, 0.8, 0.86], rim: [0.85, 0.92, 1.0], rimDir: [0, 6], gradient: 0.2, gradientY: [0, 0.5] };
const ash = (g, t, n = 26) => { for (let i = 0; i < n; i++) { const x = (rnd(i, 1) * W + t * (0.4 + rnd(i, 2)) * 1.2) % W, y = (rnd(i, 3) * H + t * (1.5 + 2.5 * rnd(i, 4))) % H, r = 2 + 3 * rnd(i, 5); g.fillStyle = i % 4 ? "#cfd6e2" : "#ffffff"; g.beginPath(); g.ellipse(x + 8 * Math.sin(t * 0.1 + i), y, r, r * 0.6, i, 0, 7); g.fill(); } };
export const smoke = shot("smoke", { plates: { duck: src("boom_duck_1"), peek: src("boom_duck_2", "png") }, marks: [{ at: 0, what: "smoke", on: "kick" }, { at: 10, what: "she looks out", on: "kick" }],
  frame(f, sync) {
    const L = CUT.smoke + f, cam = { pos: [-1.0, 0.6, -1.75 + 0.004 * f], target: [-1.5, 0.62, 0.75], fov: 37 - 0.05 * f }, clear = ease(f / 18);
    const up = f >= 10 && f < 12 ? [-7, -2][f - 10] : 0, h = stand(cam, IFE, DUCK.foot, DUCK.m);
    return { set: "plant", camera: cam, options: { ...plant(L, sync, { drones: false }), wreck: 1, cards: [], blasts: [], red: null, dusk: 100 },
      cels: [{ plate: f >= 10 ? "peek" : "duck", ...h, y: h.y + up, layer: AFTER }],
      under(g) { smokeBank(g, W, H, { t: f + 40, cover: 0.7 - 0.45 * clear, seed: 9, colors: ["#4d4a5c", "#363345", "#140a16"], drift: [0.5, 0.3] }); },
      overlay(g) {
        // a drone's head comes down out of the smoke, its eye goes out
        const u = f - 0; if (u < 20) { const y = Math.min(H * 0.84, H * 0.1 + 26 * u * u * 0.5), land = y >= H * 0.84, t = u - 8; drone2d(g, W * 0.2 + (land ? Math.min(t, 6) * 5 : 0), y, 300, land ? 2.6 : u * 0.5, { tumble: land ? 0.6 : 0.8, eye: land ? (u < 16 && u % 4 < 2 ? 1 : 0) : 1, lost: 3, rim: "#59607e" }); }
        else drone2d(g, W * 0.2 + 30, H * 0.84, 300, 2.6, { tumble: 0.6, eye: 0, lost: 3, rim: "#59607e" });
        smokeBank(g, W, H, { t: f, cover: 1.0 - 0.8 * ease(f / 11), seed: 4, colors: ["#8a8798", "#5d596c", "#1c1424"], drift: [1.6, 0.6], n: 60 }); ash(g, f); },
      post: { flash: f < 4 ? [0.9, 0.55, 0.25, 0.08][f] : 0, bloom: 0.5, vignette: 0.55, sat: 0.9, ca: 0.0012 } };
  } });
export const ok = shot("ok", { plates: { push: src("boom_push_1"), calm: src("boom_push_2", "png") }, marks: [{ at: 0, what: "she pushes her glasses up", on: "kick" }, { at: 10, what: "the CRT says OK", on: "kick" }],
  frame(f, sync) {
    const L = CUT.ok + f, scale = 0.74 + 0.0012 * f, nudge = f < 4 ? [10, 5, 1, -2][f] : 0, drop = f === 6 ? 5 : f === 7 ? 2 : 0;
    const hung = { x: W * 0.5 + (0.5 - 0.47) * PW * scale, y: H * 0.5 + (0.5 - 0.5) * PH * scale + 26 + nudge + drop, scale }, on = f - 10;
    return { set: "plant", camera: { pos: [-2.0, 1.0, 0.9], target: [2.4, 1.6, 0.6 + 0.004 * f], fov: 34 }, options: { ...plant(L, sync, { drones: false }), wreck: 0.85, cards: [], blasts: [], red: null, dusk: 100 },
      cels: [{ plate: f >= 6 ? "calm" : "push", ...hung, layer: { ...AFTER, tint: [0.84, 0.86, 0.9], rim: on >= 0 ? [0.45, 1.0, 0.6] : AFTER.rim, rimDir: on >= 0 ? [9, 2] : [0, 6] } }],
      under(g) { smokeBank(g, W, H, { t: f + 90, cover: 0.3, seed: 9, colors: ["#3f3b4a", "#2a2634", "#140a16"], drift: [0.5, 0.3] }); },
      overlay(g) { readout(g, quadOf(hung, SCREEN.push), on >= 0 && !(on === 2 || on === 3) ? "ok" : "off", 0, f); ash(g, f + 20, 14); },
      post: { bgBlur: 0.02, dark: 0.2, flash: on === 0 ? 0.12 : 0, bloom: 0.6, vignette: 0.5, sat: 0.95, wrap: 0.25 } };
  } });
