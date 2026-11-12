// Ife's win: HER SHOULDER CRT, five times (30, 80, 110, 139, 159): one drawing of the monitor with a blank screen,
// and on it, drawn by the film, the charge bar creeping (it jumps on the synth at 115) until on 159 it is full.
// Behind it the passage, out of focus, the charge lamps lighting away down the mains and, later, turning red.
import { CUT, W, H, shot, src, plateLight, plant, readout, quadOf, SCREEN, barAt, wob, ease, rnd } from "./boom_cast.js";
const make = (name, o) => shot(name, { plates: { crt: src("boom_crt_1") }, cutOn: o.cutOn ?? "kick", marks: o.marks,
  frame(f, sync) {
    const L = CUT[name] + f, a2 = f - f % 2, lunge = f < 3 ? [70, 22, 6][f] : 0, full = name === "full", near = ease((L - 30) / 130);
    const scale = o.scale * (1 + 0.012 * f) * (full && f < 3 ? [1.12, 1.05, 1.01][f] : 1), shv = o.shiver ? (rnd(a2, 3) - 0.5) * o.shiver : 0;
    const hung = { x: W * 0.5 + (0.5 - 0.565) * 2752 * scale + lunge + shv, y: H * 0.5 + (0.5 - 0.42) * 1536 * scale + 3 * Math.sin(f * 0.5) - lunge * 0.3, scale };
    return { set: "plant", camera: { pos: [-0.5 + 0.004 * f, 1.5, 0.2], target: [0.25, 1.45, 30], fov: 44 }, options: plant(L, sync),
      cels: [{ plate: "crt", ...hung, turn: -0.02 + (o.tilt ?? 0), layer: plateLight({ red: near * 0.8 }) }],
      overlay(g) { readout(g, quadOf(hung, SCREEN.crt), full ? "full" : "bar", barAt(L), f + (name === "bar1" && f < 2 ? 2 : 0)); },
      post: { bgBlur: 0.02, focus: [0.5, 0.5], dark: 0.25, flash: f === 0 ? (full ? 0.5 : 0.12) : full && f === 1 ? 0.2 : full && (f === 2 || f === 4) ? 0.03 : 0, ca: 0.0012 + (f < 2 ? 0.003 : 0), bloom: 0.8, bloomThreshold: 0.7, wrap: 0.3 } };
  } });
export const bar1 = make("bar1", { scale: 0.56, marks: [{ at: 0, what: "her CRT: the bar starts", on: "kick" }] });
export const bar2 = make("bar2", { scale: 0.62, tilt: 0.03 });
export const bar3 = make("bar3", { scale: 0.68, shiver: 2, marks: [{ at: 5, what: "the bar jumps", on: "synth" }] });
export const bar4 = make("bar4", { scale: 0.78, shiver: 4, tilt: -0.03 });
export const full = make("full", { scale: 0.8, shiver: 3, marks: [{ at: 0, what: "the bar fills", on: "kick" }, { at: 0, what: "the bar fills (the keyboard)", on: "keyboard" }] });
