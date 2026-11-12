// Ife's win: THE SWARM, nearer every time we look (40, 60, 90, 120, 135, 149). First only eyes, far down the passage
// in the dark, on a long lens: a few on one kick, dozens on the next; then over Ife's back as the far end turns red
// and starts toward her; then closer and closer, until from over her back again they fill the passage.
import { CUT, W, H, IFE, shot, src, stand, plateLight, plant, swarmAt, eyeDots, leadZ, BACK, wob, ease } from "./boom_cast.js";
const down = (name, o) => shot(name, { cutOn: o.cutOn ?? "kick", marks: o.marks, plates: o.back ? { back: src("boom_back_1") } : {},
  frame(f, sync) {
    const L = CUT[name] + f, k = f / (CUT.end && o.len || 10), cam = o.cam(f, L), set = plant(L, sync), pulse = sync.drive({ stem: "kick", mode: "pulse", decay: 0.15 }, 2230 + L);
    const cels = o.back ? [{ plate: "back", ...stand(cam, IFE, BACK.foot, BACK.m), layer: plateLight({ red: o.red ?? 0 }) }] : [];
    return { set: "plant", camera: cam, options: set, cels,
      under(g) { eyeDots(g, cam, set.drones, o.dots ?? 40); },
      post: { flash: f === 0 ? o.flash ?? 0.1 : 0, ca: 0.0012 + 0.002 * pulse + (f < 2 ? 0.003 : 0), bloom: 0.8 + 0.3 * pulse, bgBlur: o.blur ?? 0, focus: [0.5, 0.52], vignette: 0.5, ...o.post } };
  } });
const sh = (f, a) => [wob(f, 1.9, 3.1, 1) * a, wob(f, 2.3, 3.7, 2) * a];
export const far = down("far", { dots: 30, post: { vignette: 0.62 }, marks: [{ at: 0, what: "red eyes, far down the passage", on: "kick" }, { at: 10, what: "dozens of them", on: "kick" }],
  cam: (f) => ({ pos: [0.2, 1.6, 58], target: [0, 1.95, 118], fov: 11 - 0.05 * f }) });
export const wide = down("wide", { back: true, red: 0.1, marks: [{ at: 0, what: "over her back: all of them, and they start toward her", on: "kick" }],
  cam: (f) => ({ pos: [-0.55, 1.1, -1.75], target: [0.1, 1.5, 20], fov: 41 - 0.12 * f }) });
export const swarm2 = down("swarm2", { dots: 110, blur: 0.01, cam: (f, L) => ({ pos: [0.5 + sh(f, 0.01)[0], 1.3 + sh(f, 0.01)[1], 2], target: [0, 1.9, leadZ(L) + 6], fov: 8 }) });
export const swarm3 = down("swarm3", { dots: 30, blur: 0.016, cam: (f, L) => ({ pos: [-0.7 + sh(f, 0.015)[0], 0.55 + sh(f, 0.015)[1], 31], target: [0, 2.0, leadZ(L) + 3], fov: 24, up: [Math.sin(0.08), Math.cos(0.08), 0] }) });
export const swarm4 = down("swarm4", { cutOn: "bass", blur: 0.03, flash: 0.14, cam: (f, L) => ({ pos: [0.5 + sh(f, 0.03)[0], 0.7 + sh(f, 0.03)[1], 26], target: [0.0, 2.0, leadZ(L)], fov: 40 - 0.8 * f, up: [Math.sin(-0.1), Math.cos(-0.1), 0] }) });
export const over = down("over", { back: true, red: 0.75, blur: 0.012, flash: 0.14, cam: (f) => ({ pos: [-0.55 + sh(f, 0.02)[0], 1.1 + sh(f, 0.02)[1], -1.75], target: [0.1, 1.6, 20], fov: 41 - 0.4 * f }) });
