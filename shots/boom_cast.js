// IFE'S WIN (song frames 2230-2537, 92.92-105.75 s): what its shots share. Frames here are frames of the SECTION
// (0 at song frame 2230, the kick's return); each shot counts its own from its cut.
// The kick lands on every beat from 0 to 298 (K below, from the `kick` stem); every cut and hit is on one, or on the
// drum or percussion onset half a beat after one where the cutting doubles; each shot lists its own as `marks`, and
// `node engine/marks.mjs shots/boom.js` holds them to the song.
//   skid     0  the kick returns: Ife skids up to the junction box at the passage's dead end, a cable already in her fist
//   jam     10  the plug slams home; on 20 the box's lamps come on
//   bar1    30  her shoulder CRT: a bar starts
//   far     40  far down the passage, in the dark: red eyes, a few (40), a lot (50)
//   wide    60  over her back: the far end is red and it is coming
//   then three things intercut, a beat each and then half a beat each: her face (counting under her breath, her eyes
//   going between the bar and the passage), the bar, the swarm, nearer every time:
//   face1 70, bar2 80, swarm2 90, face2 100, bar3 110, swarm3 120, eyes1 129, swarm4 135, bar4 139, eyes2 145, over 149, flinch 155
//   full   159  the bar fills
//   collar 165  her collar goes up over her nose
//   first  169  she is a ball behind her pack with the swarm on top of her; 179: the first blast, far behind them
//               (they all look round); 189 the second
//   x2     199  in the passage: fire on 199, a main bursts on 209, the swarm running from it
//   x3     219  from in front of them, a long lens: 219, 229, wrecks thrown at us
//   x4     239  Ife, low and close, the blasts right behind her: 239, 249
//   hit    258  the last one takes the camera
//   smoke  268  smoke; on 278 she looks out over her knees
//   ok     288  she pushes her glasses up; on 298 the CRT says OK
import { camera } from "../engine/body.js";
import { chase } from "../machines/drones.js";
import { fireBlast, iceBlast, rnd } from "../engine/fx.js";
import { kana, latin } from "../sets/sign.js";
export { rnd };
export const FPS = 24, F0 = 2230, W = 1920, H = 1080, PW = 2752, PH = 1536;
export const K = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 129, 139, 149, 159, 169, 179, 189, 199, 209, 219, 229, 239, 249, 258, 268, 278, 288, 298];
export const CUT = { skid: 0, jam: 10, bar1: 30, far: 40, wide: 60, face1: 70, bar2: 80, swarm2: 90, face2: 100, bar3: 110, swarm3: 120, eyes1: 129, swarm4: 135, bar4: 139, eyes2: 145, over: 149, flinch: 155, full: 159, collar: 165,
  first: 169, x2: 199, x3: 219, x4: 239, hit: 258, smoke: 268, ok: 288, end: 308 };
const ORDER = Object.keys(CUT);
export const startOf = (name) => (F0 + CUT[name]) / FPS, lengthOf = (name) => CUT[ORDER[ORDER.indexOf(name) + 1]] - CUT[name];
export const ease = (t) => { t = Math.min(1, Math.max(0, t)); return t * t * (3 - 2 * t); };
export const wob = (f, a, b, c) => Math.sin(f * a + c) * 0.6 + Math.sin(f * b + c * 2.3) * 0.4;
export const src = (n, ext = "jpg") => ({ src: `/kits/ife/closeup/${n}.${ext}`, key: "magenta" });
export const keyed = (n) => ({ src: `/kits/ife/closeup/${n}_key.png` });      // lifted off its ground at design time (pipeline/key.py)
// a shot of this section: its cut is on the kick unless it says what else
export const shot = (name, o) => ({ name: "boom_" + name, start: startOf(name), frames: lengthOf(name), fps: FPS, cutOn: "kick", sets: ["plant"], ...o });

// ---- Ife and the box (sets/plant.js: the box is on the -X wall at z = 0.5; she kneels at it) ---------------------------
export const IFE = [-1.45, 0, 0.75];
// The plant's light on a drawing laid over the set whole: cold, a pale rim from the lamps overhead. o.red 0..1: the
// swarm's light from the passage; o.fire 0..1.5 / o.ice: a blast behind her.
export function plateLight(o = {}) {
  const red = o.red ?? 0, fire = o.fire ?? 0, ice = o.ice ?? 0, hot = Math.max(fire, ice), m = (a, b, t) => a.map((v, i) => v + (b[i] - v) * Math.min(1, t));
  let tint = m([0.86, 0.95, 1.03], [1.0, 0.72, 0.74], red * 0.7), rim = m([0.7, 0.95, 1.0], [1.0, 0.25, 0.2], red);
  if (fire > 0.02) { tint = m(tint, [0.5, 0.33, 0.36], fire); rim = m(rim, [1.0, 0.78, 0.25], fire * 2); }
  if (ice > 0.02) { tint = m(tint, [0.5, 0.62, 0.85], ice); rim = m(rim, [0.92, 1.0, 1.0], ice * 2); }
  return { tint, rim, rimDir: hot > 0.05 ? [-7, 10] : o.rimDir ?? [0, 7], gradient: 0.14, gradientY: [0, 0.5] };
}
// Where a whole-figure drawing stands in a frame: its foot point (pixels of the drawing) on the world point `at`, its
// size from how far that is. m: metres per pixel of the drawing.
export function stand(cam, at, foot, m, k = 1) {
  const c = camera({ fov: 30, ...cam, w: W, h: H }), p = c.project(at), scale = p.s * m * k;
  return { x: p.x + (PW / 2 - foot[0]) * scale, y: p.y + (PH / 2 - foot[1]) * scale, scale, depth: p.z };
}
export const BACK = { foot: [1380, 1492], m: 0.00078 }, DUCK = { foot: [1330, 1468], m: 0.00074 }, SKID = { foot: [1900, 1470], m: 0.00086 };

// ---- the swarm -------------------------------------------------------------------------------------------------------
// The head of the pack along the passage at section frame L: it hangs in the dark, comes on at a rush, and slows to
// gloat over her.
const WAY = [[40, 118], [60, 114], [90, 84], [120, 54], [135, 36], [149, 9.5], [165, 6.5], [179, 5.5], [400, 5.5]];
export const leadZ = (L) => { let i = 0; while (WAY[i + 1][0] < L) i++; const [a, za] = WAY[i], [b, zb] = WAY[i + 1]; return za + (zb - za) * Math.min(1, Math.max(0, (L - a) / (b - a))); };
// the blasts: one per kick from 179, racing down the passage toward the dead end, fire and burst coolant turn about
export const BLASTS = [[179, 60], [189, 51], [199, 43], [209, 35.5], [219, 29], [229, 23], [239, 17], [249, 11], [258, 5.5]].map(([at, z], i) => ({ at, z, ice: i % 2 === 1, seed: 3 + i * 7, R: 2.9 }));
const N = 64, memo = new Map(), PACK = (L, sync) => { if (!memo.has(L)) { const z0 = leadZ(L); memo.set(L, chase(F0 + L, sync, { n: N, lead: [0, 2.0, z0], yaw: 180, spread: [3.7, 2.5, 62], seed: 4, lurch: 0.8 }).map((d, i) => { const b = d.pos[2] - z0, p = [d.pos[0], d.pos[1], b > 0 ? z0 + 62 * (b / 62) ** 1.6 : d.pos[2]], t = d.type;
    // a dozen of them come right down round her and hang there, looking at her
    const k = i < 12 ? ease((L - 145 - i * 0.8) / 9) : 0, a = (18 + 144 * rnd(i, 21)) * Math.PI / 180, r = 2.0 + 1.7 * rnd(i, 22), q = [IFE[0] + 0.3 + Math.cos(a) * r, 1.75 + 1.2 * rnd(i, 23) + 0.08 * Math.sin(L * 0.3 + i), IFE[2] + 0.2 + Math.sin(a) * r];
    return { ...d, pos: p.map((v, j) => v + (q[j] - v) * k), aim: k > 0.5 ? Math.atan2(IFE[0] - q[0], IFE[2] - q[2]) * 180 / Math.PI : null }; })); } return memo.get(L); };      // (the pack is thickest at its head)
// The swarm at section frame L: sixty-four chasers and two enforcers. Their eyes come on in the dark on the kicks at 40
// and 50; a blast breaks whatever of them it reaches (the rest look round at the first, then run from the others).
export function swarm(L, sync, o = {}) {
  const now = PACK(L, sync), out = [];
  now.forEach((d, i) => {
    const on = i < 5 ? 40 + i * 0.6 : i < 30 ? 50 + (i % 5) * 0.5 : 60 + (i % 7) * 0.4, lit = L - on, heavy = i === 15 || i === 23;
    let s = { ...d, eye: lit < 0 ? 0 : (d.eye + (lit < 3 ? 1 : 0)) * (o.eye ?? 1), yaw: d.aim ?? 180, type: heavy ? "enforcer" : "chaser", beam: heavy && L > 100 ? 1 : 0, beamTilt: 0.25, scale: 1, smoke: false };
    if (heavy) s.pos = [d.pos[0] * 0.4, 2.2, d.pos[2]];
    const kill = BLASTS.find((b) => PACK(b.at, sync)[i].pos[2] - fled(b.at, i) > b.z - 5.5);
    if (kill && L >= kill.at) { const was = PACK(kill.at, sync)[i]; s.pos = [was.pos[0], was.pos[1], was.pos[2] - fled(kill.at, i)]; s.broken = (L - kill.at) / FPS; s.carry = -6; }
    else if (L >= 179) {      // looks round, then runs for the dead end
      const u = L - 179, look = ease(u / 4) * (1 - ease((u - 9) / 4));
      s.yaw = (d.aim ?? 180) + 180 * look * (i % 2 ? 1 : -1); s.pos = [d.pos[0], d.pos[1] + 0.5 * Math.sin(u * 0.5 + i) * (u > 10 ? 1 : 0), d.pos[2] - fled(L, i)]; s.thrust = u > 10 ? 1 : d.thrust; s.pitch = u > 10 ? -20 : d.pitch;
    }
    out.push(s);
  });
  return out;
}
// how far a drone has run from the blasts by L: none can get past the dead end
function fled(L, i) { const u = Math.max(0, L - 190); return Math.min(u * 0.25 * (0.7 + 0.6 * rnd(i, 7)), 5); }
export const swarmAt = (L, sync, o) => swarm(L, sync, o).map((d) => ({ ...d, pos: [d.pos[0], d.pos[1], Math.max(d.pos[2], 0.8 + 3 * rnd(d.seed, 3))] }));
// their eyes as the camera sees them from far off: a hard red dot each with a hot centre (the machines themselves are
// lost in the air at that distance). Painted under the figures.
export function eyeDots(g, camSpec, list, minDist = 40) {
  const c = camera({ fov: 30, ...camSpec, w: W, h: H });
  for (const d of list) {
    if (!(d.eye > 0.02) || d.broken != null) continue;
    const p = c.project(d.pos); if (p.z < minDist) continue;
    const r = Math.max(2.2, 0.11 * p.s * (d.type === "enforcer" ? 2 : 1)) * (0.8 + 0.25 * d.eye);
    g.fillStyle = "rgba(255,40,30,0.35)"; g.beginPath(); g.arc(p.x, p.y, r * 2.4, 0, 7); g.fill();
    g.fillStyle = "#ff2a1e"; g.beginPath(); g.arc(p.x, p.y, r, 0, 7); g.fill(); g.fillStyle = "#ffd9c8"; g.beginPath(); g.arc(p.x, p.y, r * 0.42, 0, 7); g.fill();
  }
}
// What the set is told at L: the swarm, its red on the walls, the blasts' cards and their light, the box and the charge.
export function plant(L, sync, o = {}) {
  const live = BLASTS.filter((b) => L >= b.at && L - b.at < 64);
  return { dusk: L < 179 ? Math.min(84, leadZ(L) - 3) : 4, drones: o.drones === false ? [] : swarmAt(L, sync, o), red: L >= 50 && L < 179 ? { z: leadZ(L) - 6 - 30 * (1 - ease((L - 50) / 40)), k: 0.5 * ease((L - 50) / 20) } : null,
    box: L < 10 ? 0 : L < 20 ? 1 : L < 159 ? Math.min(3, 2 + Math.floor((L - 20) / 3)) : 4, armed: L < 20 ? -99 : L < 159 ? 2 + (L - 20) * 0.62 : 999,
    // each blast is three drawings in depth: the burst where it goes off, and two tongues of it rolling up the passage toward the dead end after it
    cards: live.flatMap((b) => [[0, 1, 0], [3.2, 0.82, 2], [6.4, 0.66, 4]].filter(([, , late]) => L - b.at >= late && b.z > 6).map(([dz, k, late], j) => ({ at: [(j ? 0.5 - rnd(b.seed, j) : 0) * 1.2, 1.7 - 0.15 * j, b.z - dz], size: o.fine ? 13 : 18, res: (b.z < 40 || o.fine) && j < 2 ? 2048 : 1024,
      paint: (g, v) => (b.ice ? iceBlast : fireBlast)(g, v, L - b.at - late, { R: b.R * k, seed: b.seed + j * 13, floor: -1.7 + 0.15 * j, ...(j ? { wrecks: 0, debris: 0 } : {}) }) }))),
    // its light runs out along the walls and then draws back to where it burns
    blasts: live.filter((b) => L - b.at < 14).slice(-4).map((b) => { const a = L - b.at; return { z: b.z, r: a < 5 ? 9 + 3.2 * a : 25 * (1 - (a - 5) / 9), k: 1.5 * Math.exp(-a / 7), ice: b.ice }; }) };
}
// the newest blast at L: { age, ice, jolt 0..1 dying away } (null before the first)
export function hitAt(L) { const b = BLASTS.filter((x) => L >= x.at).pop(); return b ? { age: L - b.at, ice: b.ice, jolt: Math.exp(-(L - b.at) / 3), b } : null; }
// what the camera and the film do when a blast lands: an impact frame in the blast's colours, a flash after it, a jolt
export function blastPost(L) {
  const h = hitAt(L); if (!h) return {};
  if (h.age === 0) return { mode: 1, impact: h.ice ? { dark: [0.0, 0.03, 0.14], mid: [0.25, 0.66, 1.0], light: [1, 1, 1], ink: [0, 0.02, 0.1], thresholds: [0.3, 0.72], cel: [[0, 0.02, 0.1], [0.8, 0.95, 1]] }
    : { dark: [0.06, 0.0, 0.02], mid: [1.0, 0.42, 0.04], light: [1.0, 0.96, 0.62], ink: [0.05, 0, 0.02], thresholds: [0.2, 0.5], cel: [[0.05, 0, 0.02], [1, 0.9, 0.5]] } };
  // (a blast under half a second old boils and throws its light about on twos: every such frame is declared a flash, so engine/motion.mjs does not take the boil for a fault)
  return { flash: h.age === 1 ? 0.4 : h.age === 2 ? 0.14 : h.age < 12 ? 0.004 : 0, ca: 0.0012 + 0.006 * h.jolt, bloom: 0.8 + 0.5 * h.jolt };
}
export const shake = (L, k = 1) => { const h = hitAt(L), j = h ? h.jolt : 0; return [wob(L, 2.9, 4.3, 1) * 0.09 * j * k, wob(L, 3.3, 5.1, 2) * 0.07 * j * k]; };

// ---- what her CRT shows (drawn by the film on the drawing's blank screen) ---------------------------------------------
// how full the bar is at L: it creeps, and jumps where the synth and the keyboard land
export const barAt = (L) => L >= 159 ? 1 : Math.min(0.97, Math.max(0.02, (L - 30) / 135) + (L >= 115 ? 0.045 : 0));
const PH1 = "#6dff9c", PH0 = "#1c7a40", BG = "#04160b";
// quad: the screen's corners on the frame, [TL, BL, BR, TR] (pixels). what: "bar" | "full" | "ok" | "off"; p: the bar; t: frames
export function readout(g, quad, what, p = 0, t = 0) {
  const [tl, bl, br, tr] = quad, t2 = t - t % 2;
  g.save(); g.transform((tr[0] - tl[0]) / 400, (tr[1] - tl[1]) / 400, (bl[0] - tl[0]) / 300, (bl[1] - tl[1]) / 300, tl[0], tl[1]);
  g.beginPath(); g.roundRect(6, 6, 388, 288, 26); g.clip();
  const inv = what === "full" && (t < 2 || t >= 4);
  g.fillStyle = inv ? PH1 : BG; g.fillRect(0, 0, 400, 300);
  const fg = inv ? BG : PH1, dim = inv ? "#0c4a22" : PH0;
  if (what === "bar" || what === "full") {
    kana(g, what === "full" ? "テンカ" : "チャージ", 30, 34, what === "full" ? 50 : 40, what === "full" ? 8 : 6, fg);
    latin(g, `${Math.round(p * 100)}%`, 372, what === "full" ? 86 : 76, what === "full" ? 54 : 46, fg, { align: "right" });
    g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(30, 124, 340, 70);
    const n = 16, on = Math.round(p * n); for (let i = 0; i < n; i++) { g.fillStyle = i < on ? fg : dim; if (i < on || i % 2 === 0) g.fillRect(40 + i * 20.1, 134, i < on ? 15 : 4, i < on ? 50 : 50); }
    for (let r = 0; r < 3; r++) { g.fillStyle = dim; let x = 30; for (let k = 0; k < 7; k++) { const w = 12 + 34 * rnd(r + Math.floor(t2 / 4), k, 2); if (x + w > 370) break; if (rnd(r, k, Math.floor(t2 / 4)) > 0.25) g.fillRect(x, 216 + r * 22, w, 8); x += w + 10; } }
  } else if (what === "idle") {
    for (let r = 0; r < 7; r++) { g.fillStyle = r % 3 ? dim : fg; let x = 34 + 22 * (r % 3); for (let k = 0; k < 5; k++) { const w = 16 + 60 * rnd(r, k, 2); if (x + w > 360 || rnd(r, k, 5) < 0.2) break; g.fillRect(x, 40 + r * 32, w, 10); x += w + 14; } }
  } else if (what === "ok") {
    latin(g, "OK", 200, 176, 170, fg, { align: "center" }); kana(g, "オーケー", 108, 206, 44, 6, fg); g.strokeStyle = fg; g.lineWidth = 6; g.strokeRect(26, 26, 348, 248);
  }
  g.fillStyle = "rgba(0,0,0,0.3)"; for (let y = 0; y < 300; y += 8) g.fillRect(0, y, 400, 3);
  g.restore();
}
// a plate's screen quad on the frame, given how the plate is hung ({ x, y, scale }) and the quad in the drawing's pixels
export const quadOf = (hung, q) => q.map(([px, py]) => [hung.x + (px - PW / 2) * hung.scale, hung.y + (py - PH / 2) * hung.scale]);
export const SCREEN = { skid: [[1569, 140], [1557, 322], [1757, 329], [1767, 155]], crt: [[1174, 296], [1179, 1005], [1945, 994], [1956, 312]], push: [[1912, 400], [1921, 879], [2493, 871], [2492, 401]] };
