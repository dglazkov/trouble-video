// The breakdown's WIDER shots in the four places: the lamps dying down Tane's corridor toward him (hall); what the four
// broke leaving each place (w_noor, w_tane, w_ife, w_juno); and the four setting off on the pickup kick (go_*).
// Each place is as its kid's win left it (shots/brk_place.js), each kid the drawing their last shot ended on where the
// camera is the one it was drawn for (Tane's "rest", Juno's "sit", Noor's "land_stand", Ife's peek), and new whole-figure
// drawings where it is not: Tane from behind, and the four launches.
// In the dark a wreck is drawn as the effects drawings are (engine/fx.js drone2d): a shape against what light there is,
// and its one red eye.
import { CUT, EV, W, H, PW, PH, PAL, shot, quadIn, onQuad, screenAt, screenPaint, screenGlow, ease, clamp, lerp, mix3, wob, rnd, sayMark } from "./brk_cast.js";
import { PLACES, NOOR, JUNO, TANE, IFE, slabs, JMON } from "./brk_place.js";
import { camera } from "../engine/body.js";
import { drone2d, smokeBank } from "../engine/fx.js";
import { tane as taneAt } from "./wins_tane.js";
import { J, DOORZ, dentsAt } from "./wins_cast.js";
import { closeCamera } from "./core_close.js";
import { DUCK } from "./boom_cast.js";

const SRC = (who, n, ext = "jpg") => ({ src: `/kits/${who}/closeup/${n}.${ext}`, key: "magenta" });
// a drawing of any size stood in a frame: its foot point (its own pixels) on the world point `at`; m: metres per pixel
const stood = (cam, at, foot, m, size, k = 1) => { const c = camera({ fov: 30, ...cam, w: W, h: H }), p = c.project(at), scale = p.s * m * k; return { x: p.x + (size[0] / 2 - foot[0]) * scale, y: p.y + (size[1] / 2 - foot[1]) * scale, scale, depth: p.z }; };
const DARK = [0.3, 0.32, 0.46], INK = "rgba(5,4,16,";
// the screen of a place, drawn on its quad
const screenOn = (g, cam, P, scr) => { if (!P.screen || scr.kind === "idle") return; const q = quadIn(cam, P.screen); if (q) onQuad(g, q, P.screen.px[0], P.screen.px[1], (c, w, h) => screenPaint(scr, PAL[P.pal], c, w, h)); };
// a red eye in the dark: a hard dot with a hot middle and a flat halo
const eye = (g, x, y, r, k = 1) => { g.fillStyle = "rgba(255,40,30,0.3)"; g.beginPath(); g.arc(x, y, r * 2.1 * k, 0, 7); g.fill(); g.fillStyle = "#ff2a1e"; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.fillStyle = "#ffd9c8"; g.beginPath(); g.arc(x, y, r * 0.42, 0, 7); g.fill(); };
// sparks scratched off a floor by something dragged: short hard strokes, on twos
const scratch = (g, x, y, s, f2, seed, dir = -1) => { g.lineCap = "butt"; for (let i = 0; i < 4; i++) { const a = -0.3 - 0.9 * rnd(i, f2, seed), l = s * (0.25 + 0.5 * rnd(i, seed, f2, 2)), x0 = x - dir * s * 0.2 * i; g.strokeStyle = i % 2 ? "#ffd27a" : "#ffffff"; g.lineWidth = Math.max(2, s * 0.035); g.beginPath(); g.moveTo(x0, y); g.lineTo(x0 - dir * Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); } };

// ---- hall, L 108-132: THE LAMPS DIE TOWARD HIM. Over Tane's shoulder, down his corridor: module by module (four
// metres, on twos) the dark comes up the corridor, and the last lamp to go is the one over him. A back view, and meant:
// what he sees is the picture. As it reaches him the board on the wall beside him shows one line of phosphor.
const BACK = { size: [1536, 2752], foot: [786, 2672], m: 1.78 / 2618 }, OCT = [[-2.2, 0], [2.2, 0], [2.7, 0.9], [2.7, 2.5], [1.7, 3.4], [-1.7, 3.4], [-2.7, 2.5], [-2.7, 0.9]];
const lastLit = (f) => -20 + 4 * Math.floor(f / 2);      // the lamps are dead beyond this z at f: the corridor's far end is down -Z
export const hall = shot("hall", { cutOn: "guitar", sets: ["corridor"], plates: { tane_back: SRC("tane", "brk_back_1") },
  frame(f, sync) {
    const L = CUT.hall + f, zt = lastLit(f), cam = { pos: [1.15 - 0.002 * f, 1.3, 23.55], target: [-0.35, 1.3, 0], fov: 40 - 0.05 * f }, P = PLACES.tane, h = stood(cam, [TANE.x, 0, TANE.z], BACK.foot, BACK.m, BACK.size);
    const over = clamp((zt - 16) / 4), wake = clamp((f - 21) / 3);      // the lamp over him goes last
    return { set: "corridor", camera: cam, options: P.options(L, sync, 0),
      cels: [{ plate: "tane_back", ...h, layer: { tint: mix3([0.92, 0.94, 1.08], DARK, over * 0.9), rim: mix3([0.62, 0.95, 1.0], [0.2, 0.22, 0.34], over), rimDir: [0, 7], gradient: 0.2 + 0.3 * over, gradientY: [0, 0.6] } }],
      under(g, c) {
        // everything beyond the plane z = zt is dark: that is the corridor's own section at zt, as the camera sees it
        const ring = OCT.map(([x, y]) => c.project([x, y, zt])); g.fillStyle = INK + "0.9)"; g.beginPath(); ring.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); g.closePath(); g.fill();
        if (over >= 1) { g.fillStyle = INK + "0.78)"; g.fillRect(0, 0, W, H); }      // and then where he stands
        if (wake > 0) for (const sx of [1, -1]) screenOn(g, c, { ...P, screen: { ...P.screen, c: [sx * P.screen.c[0], P.screen.c[1], P.screen.c[2]], u: [0, 0, -sx] } }, { kind: "dead", wake: wake * 0.5 });      // the boards either side of him: a line of phosphor
      },
      post: { bloom: 0.9, vignette: 0.45 + 0.15 * over, flash: f % 2 === 0 && f > 0 && f < 24 ? 0.012 : 0 } };
  } });

// ---- w_noor, L 170-182: the sliced enforcer, which has hung behind Noor since the grid went through it, moves: its
// slices close up into a line, nose to tail, their cuts hot again, and drift out of the core past them. Its eye is on.
export const w_noor = shot("w_noor", { cutOn: "keyboard", sets: ["core"], cast: { noor: "/kits/noor" }, held: (f) => f,
  marks: [{ at: 0, what: "the slices move", on: "keyboard" }],      // ("mister" is said on L176, here: the console is out of this picture, so no screen in it says so)
  frame(f, sync) {
    const L = CUT.w_noor + f, P = PLACES.noor, scr = screenAt(L, "noor"), glow = screenGlow(scr, PAL.violet), k = ease(f / 12), f2 = f - f % 2;
    const cc = closeCamera(2229), cam = { pos: cc.pos, target: [cc.target[0] + 0.5, cc.target[1] + 0.55, cc.target[2]], fov: cc.fov * 0.8 };
    const sl = slabs(L, { gap: 1 - 0.75 * k, train: 0.34 * k, dz: 3.4 * k + 0.05 * f, dx: -0.5 * k, dy: 1.25 * k + 0.02 * f, heat: 0.5 + 0.5 * k, roll: 0.03 * Math.sin(f2) });
    return { set: "core", camera: cam, options: { ...P.options(L, sync, 1), slabs: sl },
      actors: [{ who: "noor", action: "core_land", phase: 0.8, hero: "land_stand", x: NOOR.x, y: NOOR.y, z: NOOR.z, yaw: 0, shadow: false, light: { tint: [0.5, 0.48, 0.66], rim: glow ?? [0.2, 0.2, 0.3], from: [-1, 0.2, 0.3], gradient: 0.3 } }],
      under(g, c) { screenOn(g, c, P, scr);
        // its eye, on the nose slice: it flickers on, and looks at them as it goes by
        const p = c.project([sl.pos[0] + sl.at[4][0], sl.pos[1] + sl.at[4][1] + 0.12, sl.pos[2] + sl.at[4][2] + 1.0]); if (f >= 2 && !(f === 4 || f === 5)) eye(g, p.x, p.y, 0.16 * p.s, 1 + 0.3 * rnd(f2)); },
      post: { dark: 0.6, bloom: 0.95, vignette: 0.55, sat: 0.95 } };
  } });

// ---- w_tane, L 182-195: the three machines Tane took apart are at his feet. An eye comes on in each (on the voice's
// pulse, and one after another), and they drag themselves off across the deck, away from him, scratching sparks.
const WRECKS = [{ at: [-0.75, 20.3], yaw: 200, on: 0, to: [-2.3, 16.6], seed: 31 }, { at: [1.35, 19.9], yaw: 150, on: 2, to: [3.0, 16.9], seed: 32 }, { at: [0.35, 19.2], yaw: 185, on: 4, to: [0.9, 15.4], seed: 33 }];
// a wreck at shot frame f: where it lies, how it is turned, whether its eye is on (it flickers once as it comes on)
function wreckAt(w, i, f) {
  const f2 = f - f % 2, u = f - w.on, go = Math.max(0, f2 - w.on - 4), k = Math.min(1, go / 7) ** 1.25, lurch = go > 0 && k < 1 ? 0.06 * ((f2 / 2) % 2) : 0, m = Math.min(1, k + lurch);      // it lies; the eye; a twitch; it hauls itself off in lurches, on twos
  const tw = u >= 1 && go === 0 ? (rnd(f2, i) - 0.5) * 2 : 0, x = lerp(w.at[0], w.to[0], m), z = lerp(w.at[1], w.to[1], m);
  return { type: "chaser", pos: [x, 0.2 + 0.05 * lurch * 10, z], yaw: w.yaw + 14 * tw + 22 * Math.sin(go * 0.9 + i) * (go > 0 ? 1 : 0), pitch: 6 + 8 * tw, roll: (i % 2 ? 72 : -68) + 10 * tw, eye: u >= 0 && u !== 2 ? 0.5 : 0, thrust: 0, fold: 0.75, sway: 0, seed: w.seed, on: u >= 0 && u !== 2, moving: go > 0 && k < 1 };
}
export const w_tane = shot("w_tane", { cutOn: "lead_vocals", sets: ["corridor"], cast: { tane: "/kits/tane" }, held: (f) => f,
  marks: [{ at: 0, what: "an eye comes on at Tane's feet", on: "lead_vocals" }],
  frame(f, sync) {
    const L = CUT.w_tane + f, P = PLACES.tane, f2 = f - f % 2, list = WRECKS.map((w, i) => wreckAt(w, i, f)), lit = list.filter((d) => d.on).length / 3;
    const cam = { pos: [1.65, 1.0, 17.4], target: [0.75, 0.6, 21.3], fov: 44 - 0.1 * f };
    return { set: "corridor", camera: cam, options: { ...P.options(L, sync, 1), drones: list },
      // the only light on him now is theirs: red, from the deck
      actors: [taneAt(1723, { over: true, shadow: false, light: { tint: [0.34 + 0.1 * lit, 0.32, 0.44], rim: [0.2 + 0.75 * lit, 0.2, 0.3 - 0.12 * lit], from: [0.3, -0.5, -1], gradient: 0.15 } })],
      overlay(g, c) {
        list.forEach((d, i) => { const a = d.yaw * Math.PI / 180, nose = c.project([d.pos[0] + Math.sin(a) * 0.36, d.pos[1] + 0.04, d.pos[2] + Math.cos(a) * 0.36]);
          if (d.on) eye(g, nose.x, nose.y, 0.042 * nose.s, 0.9 + 0.3 * rnd(f2, i));
          if (d.moving) { const p = c.project([d.pos[0], 0.02, d.pos[2]]); scratch(g, p.x, p.y, 0.5 * p.s, f2, i, i % 2 ? 1 : -1); } });
      },
      post: { dark: 0.78, bloom: 0.95, vignette: 0.55, sat: 0.95 } };
  } });

// ---- w_ife, L 195-202: Ife has ducked again. Down the passage behind her, what the blasts left of the swarm (scorched
// cowls, an eye in each) is skittering away into the dark, all the same way.
const COWLS = [[0.2, 2.6, 8], [-0.9, 4.2, 1], [0.8, 7.5, 3], [-0.2, 10, 2], [1.3, 13, 5], [-1.3, 16, 4], [0.3, 20, 6], [-0.6, 25, 7]];
export const w_ife = shot("w_ife", { cutOn: "lead_vocals", sets: ["plant"], plates: { ife_peek: { src: "/kits/ife/closeup/boom_duck_2.png", key: "magenta" } },
  frame(f, sync) {
    const L = CUT.w_ife + f, P = PLACES.ife, f2 = f - f % 2, cam = { pos: [-1.0, 0.6, -1.75 + 0.004 * f], target: [-1.25, 0.72, 0.75], fov: 36 }, h = stood(cam, IFE, DUCK.foot, DUCK.m, [PW, PH]);
    return { set: "plant", camera: cam, options: P.options(L, sync, 1),
      cels: [{ plate: "ife_peek", ...h, x: h.x + (rnd(f2, 3) - 0.5) * 3, layer: { tint: [0.34, 0.42, 0.44], rim: [0.3, 0.7, 0.42], rimDir: [8, 3], gradient: 0.3, gradientY: [0, 0.5] } }],
      under(g, c) {
        smokeBank(g, W, H, { t: L + 110, cover: 0.2, seed: 9, colors: ["#23212c", "#191620", "#0c0610"], drift: [0.5, 0.3] });
        for (const [x, z0, seed] of COWLS) { const z = z0 + (2 + 5.5 * f2 / 7) * (0.8 + 0.4 * rnd(seed)), p = c.project([x + 0.5 * Math.sin(f2 * 0.9 + seed), 0.12 + 0.1 * Math.abs(Math.sin(f2 * 1.4 + seed)), z]), s = 0.9 * p.s;
          drone2d(g, p.x, p.y, s, Math.PI + 0.5 * Math.sin(f2 * 1.1 + seed * 2), { tumble: 0.5, eye: 0, lost: 3, rim: "#3c6a52" }); eye(g, p.x + 0.12 * s * Math.sin(f2 + seed), p.y - 0.04 * s, Math.max(2.2, 0.07 * s)); }
      },
      post: { dark: 0.45, bloom: 0.9, vignette: 0.55, bgBlur: 0.004 } };
  } });

// ---- w_juno, L 202-209: Juno looks round at her door. There is red under it and round its edges, where the swarm is
// piled against the far side: the red slides away along the sill and is gone, and the dents ease with a jolt.
export const w_juno = shot("w_juno", { cutOn: "backing_vocals", sets: ["tunnel"], cast: { juno: "/kits/juno" }, held: (f) => f,
  frame(f, sync) {
    const L = CUT.w_juno + f, P = PLACES.juno, scr = screenAt(L, "juno"), f2 = f - f % 2, ease1 = f >= 4 ? 1 : 0, jolt = f >= 4 ? Math.exp(-(f - 4) / 1.5) : 0;
    const cam = { pos: [0.02, 0.78 + 0.012 * jolt * wob(f, 9, 14, 1), JUNO.z + 3.0], target: [0.3, 0.95, DOORZ + 1.0], fov: 36 };
    return { set: "tunnel", camera: cam, options: { ...P.options(L, sync, 1), dents: dentsAt(1892).map((d) => ({ ...d, k: d.k * (1 - 0.3 * ease1 + 0.1 * jolt) })) },
      actors: [{ who: "juno", action: "wins_juno", view: "front34", phase: J(5), hero: "sit", over: true, yaw: JUNO.yaw, x: JUNO.x, z: JUNO.z, shadow: false, light: { tint: [0.5, 0.52, 0.56], rim: f < 5 ? [0.9, 0.2, 0.14] : [0.2, 0.3, 0.3], from: [0.4, -0.3, -1], gradient: 0.3 } }],
      under(g, c) {
        // the red: it leaks round the slab (the lintel, the jambs, the sill) from what is piled against the far side, and goes out
        // from the top down as that leaves
        const gone = clamp(f / 5), fl = f2 % 4 ? 1 : 0.7, X = 1.3, T = 1.93, P3 = (x, y) => c.project([x, y, DOORZ + 0.09]), y0 = lerp(T, 0.02, gone), lw = Math.max(4, 0.028 * P3(0, 1).s);
        const path = () => { g.beginPath(); const a = P3(-X, 0.02), b = P3(-X, y0), d = P3(X, y0), e = P3(X, 0.02); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); if (gone === 0) g.lineTo(d.x, d.y); else g.moveTo(d.x, d.y); g.lineTo(e.x, e.y); g.lineTo(a.x, a.y); };
        if (gone < 1) for (const [col, wd] of [[`rgba(255,60,40,${0.28 * fl})`, lw * 3.4], [`rgba(255,42,30,${0.95 * fl})`, lw], [`rgba(255,214,190,${0.9 * fl})`, lw * 0.3]]) { g.strokeStyle = col; g.lineWidth = wd; g.lineJoin = "miter"; g.lineCap = "butt"; path(); g.stroke(); }
      },
      post: { dark: 0.66, bloom: 0.95, vignette: 0.55, ca: 0.0012 + 0.004 * jolt } };
  } });

// ---- go_*, L 295-328: THE PICKUP. Four cuts, on the kick, the drums, the strings and the drums: each of them going,
// at us, in one drawing that the camera lets come: Tane's charge, Ife's scurry, Juno's board, and Noor, who walks.
const GO = {
  tane: { plates: { tane_go: SRC("tane", "brk_go_1") }, foot: [1500, 1470], m: 1.5 / 1464, at: [TANE.x, 0, TANE.z - 1.2], cam: (u) => ({ pos: [0.9 - 0.3 * u, 0.85, 16.9], target: [0.1, 0.8, 21.3], fov: 44 - 5 * u }), k: [0.9, 1.04] },
  ife: { plates: { ife_go: SRC("ife", "brk_go_1") }, foot: [1420, 1495], m: 1.36 / 1417, at: [-0.4, 0, 3.4], cam: (u) => ({ pos: [0.3, 0.8, 8.2], target: [-0.45, 0.74, 0], fov: 34 - 3 * u }), k: [1.0, 1.05], crt: [[1712, 198], [1883, 230], [1857, 363], [1687, 329]] },
  juno: { plates: { juno_go: SRC("juno", "brk_go_2", "png") }, foot: [1420, 1460], m: 1.75 / 1475, at: [JUNO.x + 0.3, 0.1, JUNO.z + 0.9], cam: (u) => ({ pos: [-0.85, 0.9, JUNO.z + 4.6], target: [0.25, 0.92, DOORZ], fov: 46 - 5 * u }), k: [0.8, 1.0] },
  noor: { plates: { noor_go: SRC("noor", "brk_go_1") }, foot: [1385, 1490], m: 1.86 / 1400, at: [NOOR.x, 0, NOOR.z + 1.4], cam: (u) => ({ pos: [2.9, 1.25, NOOR.z + 4.6], target: [-0.95, 1.08, NOOR.z + 0.6], fov: 31 - 2 * u }), k: [1.0, 1.06] },
};
const go = (who, o = {}) => { const name = "go_" + who, K = GO[who], P = PLACES[who], pal = PAL[P.pal], n = CUT[Object.keys(CUT)[Object.keys(CUT).indexOf(name) + 1]] - CUT[name];
  return shot(name, { cutOn: o.cutOn, marks: o.marks, sets: [P.set], plates: K.plates,
    frame(f, sync) {
      const L = CUT[name] + f, u = f / n, e = 1 - (1 - u) ** 2, f2 = f - f % 2, scr = screenAt(L, who), glow = screenGlow(scr, pal), cam = K.cam(e), at = [K.at[0], K.at[1], K.at[2] + (o.dz ?? 0) * e];
      const h = stood(cam, at, K.foot, K.m, [PW, PH], lerp(K.k[0], K.k[1], e)), bob = (o.bob ?? 6) * (f2 % 4 ? 1 : -1);
      return { set: P.set, camera: cam, options: P.options(L, sync, 1),
        cels: [{ plate: who + "_go", ...h, y: h.y + bob, layer: { tint: [0.56, 0.58, 0.7].map((v, i) => v + 0.14 * (glow?.[i] ?? 0)), rim: glow ?? [0.5, 0.55, 0.7], rimDir: [o.side ?? 6, 5], gradient: 0.25, gradientY: [0, 0.5],
          warp: o.warp ?? 3, warpDir: [0, 1], warpTime: f2 * 0.9, warpStill: [0.5, 0.6], warpRadius: 0.16 } }],
        under(g, c) { P.under?.(g, c, L, f, 1); screenOn(g, c, P, scr); },
        overlay(g) { if (K.crt) onQuad(g, K.crt.map(([x, y]) => [h.x + (x - PW / 2) * h.scale, h.y + bob + (y - PH / 2) * h.scale]), 400, 300, (c, w, hh) => screenPaint(scr, pal, c, w, hh), 2); },
        post: { dark: P.dark * 0.9, bgBlur: (o.blur ?? 0.05) * (0.4 + 0.6 * e), focus: [0.5, 0.52], bloom: 0.9, flash: f === 0 ? 0.14 : f === 1 ? 0.05 : 0, ca: 0.0012 + 0.004 * Math.exp(-f / 2), vignette: 0.5, ...o.post } };
    } }); };
export const go_tane = go("tane", { cutOn: "kick", marks: [{ at: 0, what: "the pickup: Tane goes", on: "kick" }], dz: -1.6, side: 7 });
export const go_ife = go("ife", { cutOn: "drums", marks: [{ at: 0, what: "Ife goes", on: "drums" }, sayMark("WE'RE", "go_ife", "on her CRT")], dz: 1.3, bob: 8, side: 6 });
export const go_juno = go("juno", { cutOn: "strings", marks: [{ at: 0, what: "Juno goes", on: "strings" }, sayMark("IN", "go_juno", "on the monitor behind her")], dz: 1.4, bob: 3, side: -6 });
export const go_noor = go("noor", { cutOn: "drums", marks: [{ at: 0, what: "Noor walks", on: "drums" }], dz: 0.5, bob: 5, warp: 2, blur: 0.012, side: -6 });
