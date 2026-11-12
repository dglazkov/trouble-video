// Core 2, 80.13-81.33 s: PLAY. The cassette player on Noor's hip fills the frame; the thumb comes down on the chunky
// key and presses it on 1932, exactly where the brass comes in to stay: from here on what we hear is what is on the
// tape. The reels start to turn and are up to speed by the next note (1938). The drawing is one plate and an edit of
// it (key up, key down); the reels are the machine's, drawn turning in the cassette's window, on twos.
import { FPS, CUT, CAST, EV, startOf, ease, clamp } from "./core_cast.js";
import { sfx, sfxMark } from "../engine/sfx.js";
const FRAMES = CUT.open - CUT.play, PRESS = EV.press - CUT.play, W = 1920, H = 1080;
// the plate: its size, and its two hubs (centre and radius, in its own pixels)
export const PLATE = { w: 2752, h: 1536, hubs: [[1194, 900, 150], [1600, 900, 150]] };
const turned = (f) => { const u = Math.max(0, f - PRESS); return 0.09 * (u - 5 * (1 - Math.exp(-u / 5))) * 2.4; };      // radians: from rest, up to speed in a few frames
function frame(f, sync) {
  const u = f - PRESS, k = W / PLATE.w * (1.02 + 0.035 * ease(f / FRAMES)), jolt = u >= 0 && u < 3 ? [9, 4, 1][u] : 0, cx = W / 2, cy = H / 2 + jolt;
  return { set: "core", camera: { pos: [0, 1.5, -12], target: [0, 1.4, -30], fov: 40 }, options: { drones: [], far: 0.9 },
    post: { flash: u === 0 ? 0.1 : 0, ca: 0.0012 + (u >= 0 && u < 2 ? 0.003 : 0), vignette: 0.5 },
    cels: [{ plate: u < -1 ? "up" : "down", x: cx, y: cy, scale: k, layer: { tint: [0.93, 0.9, 1.0] } }],
    overlay(g) {
      sfx(g, { text: "カチ", x: 1730, y: 150, size: 58, angle: -0.08, color: "noor", age: u, life: 9, burst: false, pop: [1.2, 1.2, 1.04, 1.04] });      // small and quiet, in the dark of the coat beside the key
      const a = turned(f - f % 2);
      for (const [hx, hy, hr] of PLATE.hubs) {
        const x = cx + (hx - PLATE.w / 2) * k, y = cy + (hy - PLATE.h / 2) * k, r = hr * k;
        g.save(); g.translate(x, y); g.rotate(-a);
        g.fillStyle = "#17131f"; g.beginPath(); g.arc(0, 0, r * 0.58, 0, 7); g.fill();
        g.fillStyle = "#e9e4ee"; for (let i = 0; i < 6; i++) { g.rotate(Math.PI / 3); g.beginPath(); g.moveTo(r * 0.3, -r * 0.085); g.lineTo(r * 0.56, -r * 0.085); g.lineTo(r * 0.56, r * 0.085); g.lineTo(r * 0.3, r * 0.085); g.closePath(); g.fill(); }
        g.strokeStyle = "#17131f"; g.lineWidth = Math.max(3, r * 0.07); g.beginPath(); g.arc(0, 0, r * 0.3, 0, 7); g.stroke(); g.fillStyle = "#59575a"; g.beginPath(); g.arc(0, 0, r * 0.27, 0, 7); g.fill();
        g.restore();
      }
    } };
}
const src = (n) => ({ src: `/kits/noor/closeup/core_play_${n}` });      // 1: the drawing; 4: an edit of it (the key down), graded back to it
export default { name: "core_play", start: startOf("play"), frames: FRAMES, fps: FPS, cutOn: "beat", marks: [{ at: PRESS, what: "the thumb presses PLAY", on: "brass" }, sfxMark(PRESS, "カチ", "the PLAY key goes down", "brass"), { at: EV.reels - CUT.play, what: "the reels are turning", on: "brass" }],
  sets: ["core"], cast: CAST, plates: { up: src("1.jpg"), down: src("4.png") }, frame };
