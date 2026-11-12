// Ife's win 1, 92.92-94.17 s. ON the kick's return, a hard cut: Ife skids up to the junction box at the dead end of
// the coolant plant's passage, a cable from her pack already in her fist (one drawing, carried in on its heels, dust
// off its shoes). On the next kick the plug slams home (an impact frame, sparks, her hand jarred back), and on the
// one after the box's lamps come on and the charge lamps start away down the mains.
import { CUT, W, H, PW, PH, IFE, shot, src, stand, plateLight, plant, SKID, wob, ease, F0, readout, quadOf, SCREEN } from "./boom_cast.js";
import { camera } from "../engine/body.js";
import { skid as dust, rnd } from "../engine/fx.js";
import { impacts } from "./gant_fx.js";
import { speedLines } from "./slice_fx.js";
import { BOX } from "../sets/plant.js";

export const skid = shot("skid", { plates: { skid: src("boom_skid_2") }, marks: [{ at: 0, what: "the kick returns: the cut, she skids in", on: "kick" }],
  frame(f, sync) {
    const jolt = Math.exp(-f / 2.5), slide = 1 - Math.exp(-f / 2.2), at = [IFE[0] + 0.25, 0, IFE[2] - 2.6 * (1 - slide) - 0.1];
    const cam = { pos: [0.75 + wob(f, 2.9, 4.1, 1) * 0.05 * jolt, 0.8 + wob(f, 3.3, 5.3, 2) * 0.04 * jolt, -1.0], target: [-2.4, 0.78, 1.5], fov: 38 - 3 * jolt };
    const h = stand(cam, at, SKID.foot, SKID.m);
    return { set: "plant", camera: cam, options: plant(f, sync, { drones: false }),
      cels: [{ plate: "skid", ...h, layer: plateLight() }],
      overlay(g) { readout(g, quadOf(h, SCREEN.skid), "idle"); const c = camera({ ...cam, w: W, h: H }), p = c.project(at); dust(g, p.x + 0.02 * p.s, p.y - 0.05 * p.s, p.s * 0.4, f + 2, 1, 3); dust(g, p.x + 0.44 * p.s, p.y - 0.03 * p.s, p.s * 0.34, f + 1, 1, 5);
        if (f < 3) speedLines(g, W, H, { n: 50, seed: f, inner: 520 + f * 60, color: "rgba(255,255,255,0.9)", width: 0.008, cx: W * 0.58, cy: H * 0.5 }); },
      post: { flash: f === 0 ? 0.3 : f === 1 ? 0.1 : 0, ca: 0.0012 + 0.006 * jolt, bgStreak: [0.02 * (1 - slide), 0], bloom: 0.7 + 0.5 * jolt } };
  } });

const SOCKET = [BOX[0] + 0.1, BOX[1], BOX[2]], TIP = [1975, 640];      // the socket's mouth; the plug's front end in the drawing
export const jam = shot("jam", { plates: { plug: src("boom_plug_1") }, marks: [{ at: 0, what: "the plug slams home", on: "kick" }, { at: 10, what: "the box's lamps come on", on: "kick" }],
  frame(f, sync) {
    const L = CUT.jam + f, jolt = Math.exp(-f / 2.2), on = f >= 10 ? Math.exp(-(f - 10) / 3) : 0;
    const cam = { pos: [-1.52 + wob(f, 2.9, 4.1, 1) * 0.02 * jolt, 1.3 + wob(f, 3.3, 5.3, 2) * 0.02 * jolt, -0.72], target: [-2.02, 1.24, 0.55], fov: 29.5 - 2 * jolt - 1.2 * ease(f / 20) };
    const c = camera({ ...cam, w: W, h: H }), p = c.project(SOCKET), scale = 0.62, back = f < 4 ? [0, -26, 9, -4][f] : 0, sh = f - f % 2;
    return { set: "plant", camera: cam, options: plant(L, sync, { drones: false }),
      cels: [{ plate: "plug", x: p.x + 14 + back + (PW / 2 - TIP[0]) * scale, y: p.y + (PH / 2 - TIP[1]) * scale + (f > 3 ? (rnd(sh, 4) - 0.5) * 2.4 : 0), scale, turn: 0.035, layer: plateLight() }],
      overlay(g) { impacts(g, c, [{ at: F0 + CUT.jam, to: SOCKET, size: 1.5, sparks: 16, kick: [1.5, 1, -2] }], F0 + L);
        if (f === 0) speedLines(g, W, H, { n: 80, seed: 2, inner: 240, color: "#07020f", width: 0.022, cx: p.x, cy: p.y }); },
      post: f === 0 ? { mode: 1, impact: { dark: [0.0, 0.03, 0.12], mid: [0.3, 0.75, 1.0], light: [1, 1, 1], ink: [0, 0.02, 0.1], thresholds: [0.22, 0.5], cel: [[0, 0.02, 0.1], [1, 1, 1]] } }
        : { flash: f === 1 ? 0.35 : f === 10 ? 0.16 : 0, ca: 0.0012 + 0.005 * jolt + 0.002 * on, bloom: 0.7 + 0.4 * on, bgBlur: 0.004 } };
  } });
