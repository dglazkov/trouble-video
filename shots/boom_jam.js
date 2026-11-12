// Ife's win 1, 92.92-94.17 s. ON the kick's return, a hard cut: Ife skids up to the junction box at the dead end of
// the coolant plant's passage, a cable from her pack already in her fist (one drawing, carried in on its heels, dust
// off its shoes). On the next kick the plug slams home: at the socket's mouth on the impact frame, its barrel driven
// in to the knurled ring on the frame after, sparks, a recoil. Half a beat on she twists the ring and it locks
// (a second drawing of her hand: カチッ), and on the next kick the box's lamps come on and the charge lamps start away
// down the mains.
import { CUT, W, H, PW, PH, IFE, shot, src, stand, plateLight, plant, SKID, wob, ease, F0, readout, quadOf, SCREEN } from "./boom_cast.js";
import { camera } from "../engine/body.js";
import { skid as dust, rnd } from "../engine/fx.js";
import { impacts } from "./gant_fx.js";
import { speedLines } from "./slice_fx.js";
import { SOCKET } from "../sets/plant.js";
import { kana } from "../sets/sign.js";

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

// ---- the plug and the socket ---------------------------------------------------------------------------------------
// The drawing's plug (pixels of the drawing): the middle of the knurled ring's front face, where the barrel comes out
// of it, and how long the barrel is. The set's socket (sets/plant.js SOCKET) is bored to that barrel at this shot's
// size, and the shot draws the socket itself, twice: whole, under her hand, and its far half again over the plug,
// so that the barrel goes INTO it and the ring seats on its rim.
const RING = [1840, 750], RINGR = 206, BARREL = 134, SCALE = 0.62, TURN = 0.035, M = SOCKET.mouth;
const STEEL = ["#b4c6de", "#7f96bb", "#4a5d85"], INK = "#0a0f2a", BORE = ["#070b1c", "#1d2a4c"];
const ring = (c, x, r, n = 40) => Array.from({ length: n }, (_, i) => { const a = i / n * 6.2832, p = c.project([x, M[1] + r * Math.cos(a), M[2] + r * Math.sin(a)]); return [p.x, p.y]; });
const path = (g, pts) => { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); };
const hull = (pts) => { const P = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), X = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), h = (l) => { const o = []; for (const p of l) { while (o.length > 1 && X(o[o.length - 2], o[o.length - 1], p) <= 0) o.pop(); o.push(p); } o.pop(); return o; }; return [...h(P), ...h(P.reverse())]; };
// front: only what is nearer the wall than the mouth's middle and not seen through the mouth (what hides a barrel in it)
function socket(g, c, front, ringAt) {
  const m = c.project(M), lw = Math.max(3, m.s * 0.0028), mouth = ring(c, M[0], SOCKET.R), bore = ring(c, M[0], SOCKET.r), foot = ring(c, SOCKET.face, SOCKET.R), flange = hull([...ring(c, SOCKET.face, SOCKET.R + 0.024), ...ring(c, SOCKET.face + 0.016, SOCKET.R + 0.024)]), body = hull([...mouth, ...foot]);
  g.save(); g.lineJoin = "round"; g.strokeStyle = INK; g.lineWidth = lw;
  if (front) { g.beginPath(); g.rect(m.x, 0, W, H); bore.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.clip("evenodd");
    // ... and not the knurled ring, which is outside the socket and in front of its rim
    const r = RINGR * SCALE; g.beginPath(); g.rect(0, 0, W, H); g.ellipse(ringAt[0], ringAt[1], r * 0.24, r, TURN, 0, 6.2832); g.rect(ringAt[0] - 3 * r, ringAt[1] - r, 3 * r, 2 * r); g.clip("evenodd"); }
  path(g, flange); g.fillStyle = STEEL[2]; g.fill(); g.stroke();
  // the collar: lit along the top, in shade underneath
  path(g, body); g.fillStyle = STEEL[1]; g.fill();
  g.save(); path(g, body); g.clip(); g.fillStyle = STEEL[0]; g.fillRect(0, m.y - SOCKET.R * m.s * 1.2, W, SOCKET.R * m.s * 0.62); g.fillStyle = STEEL[2]; g.fillRect(0, m.y + SOCKET.R * m.s * 0.5, W, SOCKET.R * m.s); g.restore();
  path(g, body); g.stroke();
  // its rim, and the bore: dark, the far wall of it catching a little light, a keyway cut in the top
  path(g, mouth); g.fillStyle = STEEL[0]; g.fill(); g.stroke();
  if (!front) {
    path(g, bore); g.fillStyle = BORE[1]; g.fill(); g.save(); path(g, bore); g.clip(); path(g, ring(c, M[0] - 0.035, SOCKET.r)); g.fillStyle = BORE[0]; g.fill(); g.restore();
    const k = c.project([M[0], M[1] + SOCKET.r, M[2]]); g.fillStyle = BORE[0]; g.fillRect(k.x - m.s * 0.006, k.y - m.s * 0.012, m.s * 0.012, m.s * 0.016);
  }
  path(g, bore); g.stroke(); g.restore();
}
// how far out of its seat the plug is (pixels): at the mouth on the kick, home on the frame after, a recoil, home
const OUT = [0.98, 0.06, 0, 0.1, 0.03], CLICK = 5, WORD = 10;
export const jam = shot("jam", { plates: { plug: src("boom_plug_1"), lock: src("boom_plug_2", "png") }, marks: [{ at: 0, what: "the plug slams home", on: "kick" }, { at: CLICK, what: "the ring is twisted: it locks, with a click", on: "drums" }, { at: 10, what: "the box's lamps come on", on: "kick" }],
  frame(f, sync) {
    const L = CUT.jam + f, jolt = Math.exp(-f / 2.2), on = f >= 10 ? Math.exp(-(f - 10) / 3) : 0, lock = f - CLICK;
    const cam = { pos: [-1.52 + wob(f, 2.9, 4.1, 1) * 0.02 * jolt, 1.3 + wob(f, 3.3, 5.3, 2) * 0.02 * jolt, -0.72], target: [-2.02, 1.24, 0.55], fov: 29.5 - 2 * jolt - 1.2 * ease(f / 20) };
    const c = camera({ ...cam, w: W, h: H }), p = c.project(M), sh = f - f % 2, out = (OUT[f] ?? 0) * BARREL * SCALE;
    // the drawing is hung by its ring's face (turned with the drawing about its middle), on the socket's mouth
    const rx = RING[0] - PW / 2, ry = RING[1] - PH / 2, hx = (rx * Math.cos(TURN) - ry * Math.sin(TURN)) * SCALE, hy = (rx * Math.sin(TURN) + ry * Math.cos(TURN)) * SCALE;
    const x = p.x + 22 - out - hx, y = p.y - hy + (lock === 0 ? 4 : lock === 1 ? 1 : f > 5 ? (rnd(sh, 4) - 0.5) * 1.6 : 0);
    return { set: "plant", camera: cam, options: plant(L, sync, { drones: false }),
      cels: [{ plate: lock >= 0 ? "lock" : "plug", x, y, scale: SCALE, turn: TURN, layer: plateLight() }],
      // the burst and its sparks are BEHIND the socket and her hand: the plug going in is what the shot is of
      under(g) { impacts(g, c, [{ at: F0 + CUT.jam, to: M, size: 0.8, sparks: 16, kick: [1.5, 1, -2] }], F0 + L); socket(g, c, false); },
      overlay(g) { socket(g, c, true, [x + hx, y + hy]);
        if (f === 0) speedLines(g, W, H, { n: 80, seed: 2, inner: 430, color: "#07020f", width: 0.022, cx: p.x, cy: p.y });
        // the twist: two strokes round the ring, the way it turned
        if (lock >= 0 && lock < 3) { const cx = p.x - 60, r = SOCKET.R * p.s; g.strokeStyle = "#fff3c4"; g.lineWidth = 7 - 2 * lock; g.lineCap = "round"; for (const [k, a0] of [[1.32, -1.25 + 0.25 * lock], [1.5, -0.95 + 0.25 * lock]]) { g.beginPath(); g.ellipse(cx, p.y, r * k * 0.36, r * k, 0, a0, a0 + 0.5); g.stroke(); } }
        // and the word for it, for ten frames: the stairwell's hand (shots/desc_ding.js)
        if (lock >= 0 && lock < WORD) { const s = 104 * ([1.45, 1.45, 1.08, 1.08][lock] ?? 1), wx = 690, wy = 168, l2 = lock - lock % 2;
          if (lock < 6) { g.strokeStyle = "#fff3c4"; g.lineWidth = 6; g.lineCap = "butt"; g.beginPath(); for (let i = 0; i < 9; i++) { const a = -0.5 + i * 0.72, r0 = 190 + 12 * l2 + 20 * (i % 2), r1 = r0 + 46 + 10 * (i % 3); g.moveTo(wx + Math.cos(a) * r0 * 1.1, wy + Math.sin(a) * r0 * 0.62); g.lineTo(wx + Math.cos(a) * r1 * 1.1, wy + Math.sin(a) * r1 * 0.62); } g.stroke(); }
          g.save(); g.translate(wx, wy); g.rotate(-0.15); g.translate(-1.5 * s, -0.5 * s); kana(g, "カチッ", 0, 0, s, s * 0.3, "#16130c", { pitch: 1.0 }); kana(g, "カチッ", 0, 0, s, s * 0.15, "#ffd84a", { pitch: 1.0 }); g.restore(); }
      },
      post: f === 0 ? { mode: 1, impact: { dark: [0.0, 0.03, 0.12], mid: [0.3, 0.75, 1.0], light: [1, 1, 1], ink: [0, 0.02, 0.1], thresholds: [0.22, 0.5], cel: [[0, 0.02, 0.1], [1, 1, 1]] } }
        : { flash: f === 1 ? 0.35 : f === 10 ? 0.16 : 0, ca: 0.0012 + 0.005 * jolt + 0.002 * on, bloom: 0.7 + 0.4 * on, bgBlur: 0.004 } };
  } });
