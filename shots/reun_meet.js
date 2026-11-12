// THE REUNION, part 2: THE MEET, section frames 208-298 (song 128.08-131.83 s). Kicks at 208, 218, 228, 238, 248, 258,
// 268 and (late) 283; then no kick until 318, and the brass comes in at 298, where shots/reun_fight.js takes over.
//   wide   208  the panels' borders break (the vocal peak) and we are out over the atrium's gantry at night, the whole
//               middle of the span: four small figures in their own colours coming from both ends. TANE and IFE from the
//               core's end (running +Z), JUNO on her board and NOOR in their lope from the wall's (-Z)
//   pairA  228  Tane and Ife at us, a long lens going back before them
//   pairB  238  Juno and Noor at us, the other way
//   stopA  248  from on the deck beside them: Tane's heels dug in, Ife hauling on his coat (one drawing)
//   stopB  258  the other pair, facing them: Juno carving the board broadside; Noor, who never hurries, has already
//               stopped, a last step taken
//   faces  268  THE FOUR SEEING EACH OTHER: one drawing of all four, waist up, the two pairs across a gap. Wide eyes
//               first (268); on the late kick at 283, into the silence, the laugh: Tane's grin, Ife in tears, Juno's
//               fist in the air, and the smallest smile Noor owns. From 289 a red light grows on them from the wall's
//               side, and on 292 Tane and Ife, who face that way, look up past the others
// On the last frame (L 297) each stands at STAND (shots/reun_cast.js): Tane and Ife facing +Z, Juno and Noor -Z;
// Juno is ON her board, which hovers a hand off the deck. The drawings: pipeline/reun_meet_prep.py says how the takes
// were made ready.
import { FPS, F0, W, H, PW, PH, CAST, NIGHT, STAND, MEET, COLOR, clamp, lerp, ease, wob, rnd, stand } from "./reun_cast.js";
import { RUN, STRIDE } from "./open_cast.js";
import { shards as splitShards } from "./reun_split.js";
// dust kicked up by a skidding stop (engine/fx.js skid, in the night's colours): a few puffs low at (x, y), thrown the way `dir`
function dust(g, x, y, s, age, dir = 1, seed = 1) {
  if (age < 0 || age > 16) return; const a2 = age - age % 2;
  for (const [col, grow] of [["#160a1e", 3], ["#8d6a8e", 0]]) { g.fillStyle = col; g.beginPath();
    for (let i = 0; i < 6; i++) { const u = a2 - i * 0.7; if (u <= 0) continue; const d = (0.2 + 0.9 * rnd(i, seed, 1)) * (1 - Math.exp(-u / 3)), k = Math.max(0, 1 - u / 15), r = (0.09 + 0.17 * rnd(i, seed, 4)) * (0.5 + 0.5 * d) * k * s + (k > 0 ? grow : 0); if (r <= grow) continue;
      const px = x + (dir * d * 1.5 + (rnd(i, a2, 2) - 0.5) * 0.06) * s, py = y - (0.08 + d * 0.45 * rnd(i, seed, 3) + 0.01 * u) * s; g.moveTo(px + r, py); g.arc(px, py, r, 0, 7); }
    g.fill(); }
}
export const CUT = { wide: 208, pairA: 228, pairB: 238, stopA: 248, stopB: 258, faces: 268, end: 298 };
const ORDER = Object.keys(CUT), lengthOf = (n) => CUT[ORDER[ORDER.indexOf(n) + 1]] - CUT[n];
const shot = (name, o) => ({ name: "reun_" + name, start: (F0 + CUT[name]) / FPS, frames: lengthOf(name), fps: FPS, cutOn: "kick", sets: ["atrium"], cast: CAST, ...o });
const DIR = { tane: 1, ife: 1, juno: -1, noor: -1 }, PH0 = { tane: 0.1, ife: 0.55, noor: 0.3 };

// ---- where each is ---------------------------------------------------------------------------------------------------
// They run at RUN and are stopped at STAND: Tane and Ife skid from 248 (twelve frames, their speed falling evenly to
// nothing), Juno carves from 258 (ten); Noor simply slows from 249 over nine frames (while we are looking at the other two)
// and is standing there, a last step taken, when Juno pulls up beside them.
const STOP = { tane: 248, ife: 248, juno: 258, noor: 249 }, SKID = { tane: 12, ife: 12, juno: 10, noor: 9 }, PER = RUN / FPS;
const left = (who, L) => { const n = SKID[who], D = PER * n / 2, S = STOP[who]; return L < S ? D + PER * (S - L) : D * (1 - clamp((L - S) / n)) ** 2; };      // metres still to go
export const placeOf = (who, L) => ({ x: STAND[who].x, z: STAND[who].z - DIR[who] * left(who, L), yaw: STAND[who].yaw });
const phaseOf = (who, L) => PH0[who] + (left(who, 208) - left(who, L)) / STRIDE[who];      // a stride of the cycle for a stride of ground: the feet do not skate as Noor slows
const runner = (who, L, o = {}) => ({ who, action: "run", phase: phaseOf(who, L), ...placeOf(who, L), ...o });
const rider = (L, o = {}) => { const p = placeOf("juno", L); return { who: "juno", action: "ride", phase: 0.5, ...p, x: p.x + 0.12 * Math.sin(L * 0.21), ...o }; };

// ---- the borders breaking: what is left of the split-screen's panels flies off the frame -------------------------------
function shardsFallback(g, age) {
  if (age > 11) return; const a2 = age - age % 2, cols = Object.values(COLOR);
  for (let i = 0; i < 46; i++) {
    const line = i % 3, u = rnd(i, 1), x0 = W * (0.25 + 0.25 * line) + (u - 0.5) * 260, y0 = H * rnd(i, 2), ang = Math.atan2(y0 - H / 2, x0 - W / 2) + (rnd(i, 3) - 0.5) * 1.4, sp = (90 + 150 * rnd(i, 4)) * (a2 + 1);
    const x = x0 + Math.cos(ang) * sp, y = y0 + Math.sin(ang) * sp + 4 * a2 * a2, r = (26 + 70 * rnd(i, 5)) * (1 - age / 16), rot = rnd(i, 6) * 6 + a2 * (rnd(i, 7) - 0.5) * 0.9;
    const P = [0, 1, 2].map((k) => { const t = rot + k * 2.1 + rnd(i, k, 8) * 0.8, rr = r * (0.5 + rnd(i, k, 9)); return [x + Math.cos(t) * rr, y + Math.sin(t) * rr * (0.4 + 0.6 * Math.abs(Math.cos(a2 * 0.6 + i)))]; });
    g.lineJoin = "miter"; g.lineWidth = 5; g.strokeStyle = "#0c0714"; g.fillStyle = i % 5 === 0 ? "#fff" : i % 2 ? "#0c0714" : cols[i % 4];
    g.beginPath(); P.forEach((p, k) => k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.stroke(); g.fill();
  }
}
// the split-screen's own last page in pieces (shots/reun_split.js); the fallback above is what stood in for it
const shards = (g, age) => (splitShards ?? shardsFallback)(g, age);

// ---- the night's light on a whole drawing laid over the set (as sets/atrium.js lights a figure at night), `red` 0..1: the alarm's light from the wall's side ----
const lit = (depth, o = {}) => { const k = o.red ?? 0, fog = 1 - Math.exp(-depth * 0.0075), b = o.bright ?? 0;
  return { tint: [lerp(0.8 + 0.1 * b, 1.0, k), lerp(0.62 + 0.12 * b, 0.56, k), lerp(0.74 + 0.1 * b, 0.56, k)], rim: [1.0, lerp(0.4, 0.26, k), lerp(0.3, 0.18, k)], rimDir: k > 0.3 ? [7, 3] : [0, 7], gradient: 0.2, gradientY: o.gradientY ?? [0, 0.5], fog, fogColor: [0.5, 0.13, 0.22], ...(o.hide ? { depth: depth - 0.5 } : {}) }; };
const dist = (cam, at) => Math.hypot(cam.pos[0] - at[0], cam.pos[1] - (at[1] + 0.9), cam.pos[2] - at[2]);
const src = (who, n) => ({ src: `/kits/${who}/closeup/${n}`, key: "magenta" });

// ---- wide: the span, four small figures -------------------------------------------------------------------------------
export const wide = shot("wide", { cutOn: "kick", marks: [{ at: 0, what: "the panels break: all four on the gantry", on: "kick" }, { at: 10, what: "the gantry's beacons jump; the camera drops a notch", on: "kick" }],
  frame(f) {
    const L = CUT.wide + f, u = f / 20, j = Math.exp(-(f % 10) / 2.5), tilt = -0.07 + 0.02 * u;
    return { set: "atrium", camera: { pos: [-30 + 2.5 * u, 8.3 - 0.2 * j * (f >= 10 ? 1 : 0), 62.2 + 0.6 * u], target: [0, 1.5 + 0.1 * j, 62.3], fov: 33 - 2 * ease(u), up: [0, Math.cos(tilt), Math.sin(tilt)] },
      options: { ...NIGHT, alert: 1 + 0.6 * j },
      // (from the side each pair is strung out along the deck, Ife behind Tane and Noor behind Juno, so nobody is hidden behind their friend)
      actors: [runner("tane", L, { view: "side" }), runner("ife", L, { view: "side", z: placeOf("ife", L).z - 1.5 }), runner("noor", L, { view: "side", z: placeOf("noor", L).z + 1.4 }), rider(L, { hero: "reun_side_a" })],
      overlay(g) { shards(g, f); },
      post: { flash: f === 0 ? 0.55 : f === 1 ? 0.2 : f === 10 ? 0.05 : 0, ca: 0.0012 + 0.004 * j, vignette: 0.5 } };
  } });

// ---- the pairs, at us ---------------------------------------------------------------------------------------------------
const lens = (L, who, dir, f) => { const z = (placeOf(who, L).z), s = [wob(L, 1.9, 3.1, 1) * 0.025, wob(L, 2.3, 3.7, 2) * 0.02]; return { pos: [0.15 * dir + s[0], 1.05 + s[1], z + dir * (8.4 - 0.05 * f)], target: [0, 1.12, z], fov: 20 }; };
export const pairA = shot("pairA", { frame(f) {
  const L = CUT.pairA + f;
  return { set: "atrium", camera: lens(L, "tane", 1, f), options: { ...NIGHT, post: { bgBlur: 0.03, focus: [0.5, 0.5] } },
    actors: [runner("tane", L, { view: "front", steady: 3 }), runner("ife", L, { view: "front", steady: 3 })], post: { flash: f === 0 ? 0.1 : 0 } };
} });
export const pairB = shot("pairB", { frame(f) {
  const L = CUT.pairB + f;
  return { set: "atrium", camera: lens(L, "noor", -1, f), options: { ...NIGHT, post: { bgBlur: 0.03, focus: [0.5, 0.5] } },
    actors: [runner("noor", L, { view: "front", steady: 3 }), rider(L, { hero: "front_mid", steady: 3 })], post: { flash: f === 0 ? 0.1 : 0 } };
} });

// ---- stop: they pull up, a pair at a time, from on the deck beside them (inside the rail: nothing stands between) --------
// the drawings: where each one's ground point is in its plate (pixels), and metres to a pixel
const SKID_A = { foot: [1690, 1457], m: 0.00108 }, JUNO = { foot: [880, 1480], m: 0.00126 }, NOOR = { foot: [1410, 1472], m: 0.00137 }, NOOR_ON = 0, LANE = 0.8;
const shade = (g, c, list) => { g.fillStyle = "rgba(20,8,34,0.6)"; for (const [x, z, r] of list) { const p = c.project([x, 0, z]); g.beginPath(); g.ellipse(p.x, p.y, r * p.s, 0.13 * p.s, 0, 0, 7); g.fill(); } };
const beside = (L, z, f, pan) => { const s = Math.exp(-f / 4); return { pos: [-1.95 + wob(L, 2.9, 4.3, 1) * 0.02 * s, 1.2 + wob(L, 3.3, 5.1, 2) * 0.02 * s, z + pan * 0.5], target: [LANE, 0.98, z + pan], fov: 48 - 2 * ease(f / 10) }; };
export const stopA = shot("stopA", { plates: { reun_skid_a: src("tane", "reun_skid_a.png") }, marks: [{ at: 0, what: "heels in: Tane and Ife pull up", on: "kick" }],
  frame(f) {
    const L = CUT.stopA + f, T = placeOf("tane", L), at = [LANE, 0, T.z + 0.35], cam = beside(L, STAND.tane.z + 0.2, f, -0.35 * (1 - ease(f / 8)));
    return { set: "atrium", camera: cam, options: NIGHT, cels: [{ plate: "reun_skid_a", ...stand(cam, at, SKID_A.foot, SKID_A.m), layer: lit(dist(cam, at), { bright: 0.5 }) }],
      under(g, c) { shade(g, c, [[at[0], at[2] + 0.15, 0.8], [at[0], at[2] - 0.95, 0.45]]); for (const [dz, sd] of [[0.8, 1], [-0.2, 5]]) { const p = c.project([at[0] - 0.25, 0, at[2] + dz]); dust(g, p.x, p.y, p.s * 0.62, f, 1, sd); } },
      post: { flash: f === 0 ? 0.1 : 0, bgStreak: [0.02 * left("tane", L), 0] } };
  } });
export const stopB = shot("stopB", { plates: { reun_skid_juno: src("juno", "reun_skid_juno.png"), reun_stop_noor: src("noor", "reun_stop_noor_1.jpg") }, marks: [{ at: 0, what: "Juno carves to a stop beside Noor, who already has", on: "kick" }],
  frame(f) {
    const L = CUT.stopB + f, J = placeOf("juno", L), N = placeOf("noor", L), still = clamp(1 - left("juno", L) / 1.0), hover = 0.04 * Math.sin(L * 0.55) * still;
    const cam = beside(L, STAND.juno.z + 0.55, f, 0.3 * (1 - ease(f / 8))), aJ = [LANE - 0.15, hover, J.z], aN = [LANE + 0.75, 0, N.z + 1.15];
    return { set: "atrium", camera: cam, options: NIGHT,
      actors: f < NOOR_ON ? [runner("noor", L, { view: "side", x: aN[0], z: aN[2] })] : [],
      cels: [...(f >= NOOR_ON ? [{ plate: "reun_stop_noor", ...stand(cam, aN, NOOR.foot, NOOR.m), layer: lit(dist(cam, aN), { bright: 0.5 }) }] : []),
        { plate: "reun_skid_juno", ...stand(cam, aJ, JUNO.foot, JUNO.m), turn: 0.09 * (1 - still), layer: lit(dist(cam, aJ), { bright: 0.5 }) }],
      under(g, c) { shade(g, c, [[aJ[0], aJ[2], 0.7], ...(f >= NOOR_ON ? [[aN[0], aN[2], 0.4]] : [])]); },
      post: { flash: f === 0 ? 0.1 : 0, bgStreak: [-0.02 * left("juno", L), 0] } };
  } });

// ---- faces: the four seeing each other --------------------------------------------------------------------------------------
const LAUGH = 15, RED = 21, UP = 24;      // frames of the shot: the laugh (the late kick), the red light begins, Tane and Ife look up
export const faces = shot("faces", { plates: { reun_faces_a: src("tane", "reun_faces_a.png"), reun_faces_b: src("tane", "reun_faces_b.png"), reun_faces_c: src("tane", "reun_faces_c.png") },
  marks: [{ at: 0, what: "they see each other", on: "kick" }, { at: LAUGH, what: "the laugh", on: "kick" }],
  held: (f) => f,      // nobody here is on the skeleton: the drawing changes when the shot says
  frame(f) {
    const L = CUT.faces + f, push = ease(f / 30), hit = f >= LAUGH ? Math.exp(-(f - LAUGH) / 2.2) : 0, red = ease((f - RED) / 8), fov = 13.4 - 0.9 * push;
    const cam = { pos: [-11.5, 1.72, 61.0], target: [0, 1.5 - 0.1 * red, 61.75], fov }, k = 0.735 * 13.4 / fov * (1 + 0.012 * hit);
    const breath = Math.sin(f * 0.42) * 2.2 * (1 - 0.5 * hit);
    return { set: "atrium", camera: cam, options: { ...NIGHT, alert: 1 + red, post: { bgBlur: 0.004, focus: [0.5, 0.5], dark: 0.3 - 0.14 * red } },
      cels: [{ plate: f < LAUGH ? "reun_faces_a" : f < UP ? "reun_faces_b" : "reun_faces_c", x: W / 2 + 4, y: H / 2 + 46 * k + breath - 5 * hit, scale: k,
        layer: { ...lit(11.5, { red, bright: 1, gradientY: [0, 0.35] }), fog: 0, warp: 1.6, warpStill: [0.5, 0.62], warpRadius: 0.34, warpDir: [1, 0.15], warpTime: (f - f % 2) * 0.55 } }],
      post: { flash: f === LAUGH ? 0.12 : f === 0 ? 0.08 : 0, vignette: 0.46 + 0.1 * red, ca: 0.0012 + 0.002 * hit } };
  } });

export const MEET_SHOTS = [wide, pairA, pairB, stopA, stopB, faces];
export default MEET_SHOTS;
