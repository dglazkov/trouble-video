// The fall: what is drawn by the film over and under its plates. The air (streaks that go up the frame, hard and
// few, on twos), the hatch's trapdoor, the station's last screen, and the sign-off.
import { kana, latin, scanlines, kanaWidth } from "../sets/sign.js";
import { W, H, rnd, clamp } from "./fall_cast.js";

// The air going past: n thin streaks travelling along `dir` (a unit vector on the frame, y down), `speed` pixels a frame.
export function wind(g, F, o = {}) {
  const n = o.n ?? 26, speed = o.speed ?? 150, len = o.len ?? 260, d = o.dir ?? [0, -1], f2 = F - (F % 2), span = Math.hypot(W, H) + len * 2;
  g.save(); g.lineCap = "butt";
  for (let i = 0; i < n; i++) {
    const across = (rnd(i, 3) - 0.5) * span, phase = rnd(i, 7) * span, along = ((f2 * speed * (0.6 + 0.8 * rnd(i, 11)) + phase) % span) - span / 2, l = len * (0.4 + rnd(i, 5));
    const cx = W / 2 - d[1] * across + d[0] * along, cy = H / 2 + d[0] * across + d[1] * along;
    g.globalAlpha = (o.alpha ?? 0.3) * (0.4 + 0.6 * rnd(i, 13)); g.strokeStyle = o.color ?? "#e8f0ff"; g.lineWidth = (o.width ?? 3) * (0.5 + rnd(i, 17));
    g.beginPath(); g.moveTo(cx - d[0] * l / 2, cy - d[1] * l / 2); g.lineTo(cx + d[0] * l / 2, cy + d[1] * l / 2); g.stroke();
  }
  g.restore();
}
// The air from a point (looking along the fall): streaks radiating from (cx, cy), outward if out > 0.
export function burst(g, F, cx, cy, o = {}) {
  const n = o.n ?? 40, f2 = F - (F % 2); g.save();
  for (let i = 0; i < n; i++) {
    const a = rnd(i, 1) * Math.PI * 2, t = ((f2 * (o.speed ?? 0.09) * (0.6 + 0.8 * rnd(i, 2)) + rnd(i, 3)) % 1), r0 = (o.r0 ?? 220) + t * t * 1100, r1 = r0 + (o.len ?? 60) + 240 * t;
    g.globalAlpha = (o.alpha ?? 0.3) * Math.min(1, t * 3) * (0.4 + 0.6 * rnd(i, 4)); g.strokeStyle = o.color ?? "#e8f0ff"; g.lineWidth = (o.width ?? 3) * (0.5 + rnd(i, 5)) * (0.5 + t);
    g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); g.stroke();
  }
  g.restore();
}

// ---- a box in the world, drawn on the frame: flat faces, far to near, an ink line round each ---------------------------------
const rot = (v, [yaw, pitch, roll]) => {
  let [x, y, z] = v; let c = Math.cos(roll), s = Math.sin(roll); [x, y] = [x * c - y * s, x * s + y * c];
  c = Math.cos(pitch); s = Math.sin(pitch); [y, z] = [y * c - z * s, y * s + z * c];
  c = Math.cos(yaw); s = Math.sin(yaw); [x, z] = [x * c + z * s, -x * s + z * c]; return [x, y, z];
};
// The station's last screen: a boxy CRT monitor, its tube facing -Z before it is turned. pos: its middle; r: [yaw,
// pitch, roll]; s: its width in metres; o.say(g, w, h): what is on the tube (a 640 x 480 picture); o.glow 0..1.
export function crt(g, cam, pos, r, s, o = {}) {
  const hw = s / 2, hh = s * 0.4, hd = s * 0.42, P = (x, y, z) => { const v = rot([x, y, z], r); return [pos[0] + v[0], pos[1] + v[1], pos[2] + v[2]]; };
  // a tapering back, as a tube has
  const C = [P(-hw, -hh, -hd), P(hw, -hh, -hd), P(hw, hh, -hd), P(-hw, hh, -hd), P(-hw * 0.72, -hh * 0.7, hd), P(hw * 0.72, -hh * 0.7, hd), P(hw * 0.72, hh * 0.7, hd), P(-hw * 0.72, hh * 0.7, hd)];
  const S = C.map((p) => cam.project(p)), faces = [[0, 1, 2, 3, "front"], [5, 4, 7, 6, "back"], [4, 0, 3, 7, "side"], [1, 5, 6, 2, "side"], [3, 2, 6, 7, "top"], [4, 5, 1, 0, "under"]];
  const tone = { front: "#a8a084", back: "#5a5648", side: "#857d65", top: "#c2ba9a", under: "#4a463c" }, ink = "#14101c", px = S[0].s * s / 100;
  const order = faces.map((f) => ({ f, z: (S[f[0]].z + S[f[1]].z + S[f[2]].z + S[f[3]].z) / 4 })).sort((a, b) => b.z - a.z);
  g.save(); g.lineJoin = "round";
  for (const { f } of order) {
    const q = f.slice(0, 4).map((i) => S[i]), [A, B, D] = [C[f[0]], C[f[1]], C[f[2]]], e1 = [B[0] - A[0], B[1] - A[1], B[2] - A[2]], e2 = [D[0] - A[0], D[1] - A[1], D[2] - A[2]];
    const nrm = [e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0]];      // into the box
    if (nrm[0] * (cam.pos[0] - A[0]) + nrm[1] * (cam.pos[1] - A[1]) + nrm[2] * (cam.pos[2] - A[2]) >= 0) continue;      // facing away
    g.beginPath(); q.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y))); g.closePath();
    g.fillStyle = tone[f[4]]; g.fill(); g.strokeStyle = ink; g.lineWidth = Math.max(2.5, px * 1.6); g.stroke();
    if (f[4] === "front") {
      // the bezel and the tube: its picture laid on by the three corners it has (the box is small: no perspective inside it)
      const a = q[2], b = q[3], c = q[1], m = 0.11, w = 640, h = 480;      // top-left, top-right, bottom-left of the face (the tube looks along -Z: its own +X is the viewer's left)
      g.save(); g.transform((b.x - a.x) / w, (b.y - a.y) / w, (c.x - a.x) / h, (c.y - a.y) / h, a.x, a.y);
      g.fillStyle = "#7c755f"; g.fillRect(w * 0.04, h * 0.05, w * 0.92, h * 0.9);
      g.beginPath(); g.roundRect(w * m, h * m, w * (1 - 2 * m), h * (1 - 2 * m) - 30, 26); g.fillStyle = "#02160d"; g.fill(); g.strokeStyle = ink; g.lineWidth = 7; g.stroke(); g.clip();
      g.translate(w * m, h * m); o.say?.(g, w * (1 - 2 * m), h * (1 - 2 * m) - 30); g.restore();
      g.save(); g.transform((b.x - a.x) / w, (b.y - a.y) / w, (c.x - a.x) / h, (c.y - a.y) / h, a.x, a.y);
      g.fillStyle = "#3b382f"; for (let i = 0; i < 3; i++) g.fillRect(w * 0.7 + i * 44, h - 40, 26, 12); g.fillStyle = (o.glow ?? 1) > 0.3 ? "#5dffa8" : "#1c3a2a"; g.fillRect(w * 0.12, h - 40, 16, 12); g.restore();
    } else if (f[4] === "side" || f[4] === "top") {
      // vents
      const a = q[0], b = q[1], c = q[3]; g.save(); g.transform(b.x - a.x, b.y - a.y, c.x - a.x, c.y - a.y, a.x, a.y); g.fillStyle = "rgba(20,16,28,0.55)"; for (let i = 0; i < 5; i++) g.fillRect(0.3, 0.2 + i * 0.13, 0.4, 0.05); g.restore();
    }
  }
  g.restore();
  return { S, mid: cam.project(pos) };
}
// What the last screen says, in the vault's screens' lettering (sets/vault.js: phosphor green on near-black): the
// word, the same in katakana under it, a rule and the level bars. t: frames (the roll bar); k: 0..1 how bright.
export function deep(g, w, h, t = 0, k = 1) {
  const G = `rgba(93,255,168,${k})`, D = `rgba(93,255,168,${0.45 * k})`;
  g.fillStyle = `rgba(16,110,70,${0.6 * k})`; g.fillRect(0, 0, w, h);
  g.save(); g.shadowColor = G; g.shadowBlur = 16;
  latin(g, "DEEP", w / 2, h * 0.47, h * 0.42, G, { align: "center" });
  const ks = h * 0.2; kana(g, "ディープ", (w - kanaWidth("ディープ", ks)) / 2, h * 0.58, ks, ks * 0.14, G);
  g.restore();
  g.fillStyle = D; g.fillRect(w * 0.08, h * 0.535, w * 0.84, 4);
  for (let i = 0; i < 9; i++) { const v = 0.3 + 0.7 * rnd(i, Math.floor(t / 2)); g.fillStyle = i > 6 ? G : D; g.fillRect(w * 0.08 + i * w * 0.03, h * 0.94 - v * h * 0.09, w * 0.02, v * h * 0.09); }
  scanlines(g, w, h, 0.22, 8);
  const roll = ((t * 13) % (h * 1.6)) - h * 0.3; g.fillStyle = `rgba(160,255,200,${0.16 * k})`; g.fillRect(0, roll, w, h * 0.12);
}
// A cable trailing from something that tumbles: a hard dark line whipping after it.
export function tail(g, x, y, t, len = 300, dir = [0.3, 1], seed = 0) {
  g.save(); g.strokeStyle = "#14101c"; g.lineWidth = 7; g.lineCap = "round"; g.lineJoin = "round"; g.beginPath(); g.moveTo(x, y);
  for (let i = 1; i <= 8; i++) { const u = i / 8, w = Math.sin(t * 0.9 + u * 5 + seed) * 46 * u; g.lineTo(x + dir[0] * len * u - dir[1] * w, y + dir[1] * len * u + dir[0] * w); }
  g.stroke(); g.strokeStyle = "#d8b040"; g.lineWidth = 3; g.stroke(); g.restore();
}
// The sign-off, small in the lower right corner, in the film's display face.
export function tsuzuku(g, a = 1) {
  g.save(); g.globalAlpha = clamp(a); g.fillStyle = "#efe6d2"; g.font = '58px "Dela Gothic One"'; g.textAlign = "right"; g.textBaseline = "alphabetic"; g.letterSpacing = "6px";
  g.fillText("つづく", W - 96, H - 92); g.restore();
}
