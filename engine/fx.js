// Effects animation, drawn the way an effects animator drew it: hard-edged shapes in a few flat colours that change
// shape from drawing to drawing, on twos where they boil. Nothing here is a particle system or a glow: a fireball is a
// cluster of lobes (the union of circles, inked round its outside) with its heat in bands inside it, white to yellow to
// orange to red, which cool one after another and leave smoke that is eaten by holes; a burst of coolant is the same
// built of jets, in white and two blues, with shards of ice; debris and wrecked drones are thrown on arcs trailing
// puffs; a shock ring is a broken line.
// Everything is a pure function of what it is given and draws on a 2D canvas context. The space is metres round the
// blast's own centre, x right and y up, laid on the canvas by `v` = { cx, cy, s }: the centre in pixels and pixels per
// metre. A set shows a blast on a card standing in the scene at the blast's place (sets/plant.js `cards`), so walls and
// machines nearer than it hide it; a shot may also draw one straight on the frame (the stage's overlay).
//   fireBlast(g, v, age, o)     o = { R = 3 metres, seed, floor = -1.6 (metres below the centre), wrecks = 3, debris = 12 }
//   iceBlast(g, v, age, o)      o = { R = 3, seed, jets: [[x, y, dx, dy], ...] where the pipes burst and which way }
//   smokeBank(g, W, H, o)       o = { t (frames), cover 0..1, seed, colors, drift }: smoke across the whole frame, clearing
//   drone2d(g, x, y, s, rot, o) a chaser as a backlit shape; skid(g, x, y, s, age, dir) dust kicked up by a stop
// age: frames since the blast (integers; fractions are floored to twos where shapes boil).
export const rnd = (...n) => { let h = 2166136261; for (const x of n) { h ^= Math.round(x * 1000) | 0; h = Math.imul(h, 16777619); h ^= h >>> 13; } return ((Math.imul(h, 2246822519) ^ (h >>> 15)) >>> 0) / 4294967296; };
const INK = "#140a16", TAU = Math.PI * 2;
export const FIRE = { white: "#fffbe6", yellow: "#ffd83a", orange: "#ff8a1c", red: "#d92a1a", smoke: "#54434f", shade: "#2f2333", ember: "#7a2a22" };
export const ICE = { white: "#ffffff", pale: "#d3f0ff", blue: "#8cc8ee", deep: "#3b7fb8", ink: "#16365e" };

// The union of circles [{ x, y, r }] (metres) filled in one colour; grow: pixels added to every radius; k: every
// radius times this, the circle moved toward (ox, oy) by `pull` of what it lost.
function blob(g, v, L, col, grow = 0, k = 1, pull = 0, ox = 0, oy = 0, op = "source-over") {
  g.globalCompositeOperation = op; g.fillStyle = col; g.beginPath();
  for (const l of L) {
    const r = l.r * k * v.s + grow; if (r <= 0.5) continue;
    const x = l.x + (ox - l.x) * (1 - k) * pull, y = l.y + (oy - l.y) * (1 - k) * pull, px = v.cx + x * v.s, py = v.cy - y * v.s;
    g.moveTo(px + r, py); g.arc(px, py, r, 0, TAU);
  }
  g.fill(); g.globalCompositeOperation = "source-over";
}
// a jagged star: n points, the long ones R (uneven), the short ones R * inner
function star(g, x, y, R, n, seed, col, inner = 0.3, squash = 1) { g.fillStyle = col; g.beginPath(); for (let i = 0; i < n * 2; i++) { const a = i / (n * 2) * TAU + seed, r = i % 2 ? R * inner : R * (0.6 + 0.8 * rnd(i, seed)); g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r * squash); } g.closePath(); g.fill(); }
const poly = (g, pts, col) => { g.fillStyle = col; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.fill(); };

// The lobes of a fireball `age` frames old: a core, a first ring thrown out fast, and later ones that roll up over
// them. Each is born a little after the blast, runs out and slows, swells, boils on twos, and then rises as smoke.
function fireLobes(R, age, seed, n = 13) {
  const a2 = age - age % 2, L = [], lobe = (i, gen) => {
    const born = gen === 0 ? rnd(i, seed, 1) * 1.5 : 2 + gen * 2.5 + rnd(i, seed, 1) * 3, u = age - born; if (u <= 0) return;
    const ang = (i * 2.399 + rnd(i, seed, 2) * 0.9) + gen * 0.7, up = 0.25 + 0.2 * gen;
    const out = 1 - Math.exp(-u / (2.2 + gen)), creep = 1 + 0.012 * u, d = R * (gen === 0 ? 0.3 + 0.55 * rnd(i, seed, 3) : 0.7 + 0.5 * rnd(i, seed, 3)) * out * creep;
    const boil = 1 + 0.07 * (rnd(i, seed, a2) - 0.5) * 2, old = Math.max(0, u - 16) / 26, r = R * (gen === 0 ? 0.36 + 0.26 * rnd(i, seed, 4) : 0.22 + 0.2 * rnd(i, seed, 4)) * (0.3 + 0.7 * out) * boil * Math.max(0, 1 - old * old);
    const rise = R * 0.0016 * u * u * (0.6 + 0.8 * rnd(i, seed, 5)), curl = 0.05 * u * (rnd(i, seed, 6) - 0.5);
    L.push({ x: Math.cos(ang + curl) * d, y: Math.sin(ang + curl) * d * 0.9 + up * R * out + rise, r, u, i });
  };
  if (age < 30) L.push({ x: 0, y: 0.1 * R, r: R * 0.62 * (1 - Math.exp(-(age + 0.6) / 1.6)) * Math.max(0, 1 - Math.max(0, age - 12) / 16), u: age, i: -1 });
  for (let i = 0; i < n; i++) lobe(i, 0);
  for (let i = 0; i < n; i++) lobe(100 + i, 1);
  for (let i = 0; i < Math.round(n * 0.7); i++) lobe(200 + i, 2);
  return L.filter((l) => l.r > 0.02 * R);
}
// holes eaten out of smoke as it thins: circles (metres) that grow from inside it
function holes(g, v, R, age, seed, from = 14, n = 12) {
  if (age < from) return;
  const a2 = age - age % 2; g.globalCompositeOperation = "destination-out"; g.fillStyle = "#000"; g.beginPath();
  for (let i = 0; i < n; i++) {
    const born = from + rnd(i, seed, 31) * 16, u = a2 - born; if (u <= 0) continue;
    const a = rnd(i, seed, 32) * TAU, d = R * (0.2 + 1.1 * rnd(i, seed, 33)), r = R * 0.035 * u * (0.6 + 0.8 * rnd(i, seed, 34)), x = v.cx + Math.cos(a) * d * v.s, y = v.cy - (Math.sin(a) * d + 0.3 * R + R * 0.0016 * u * u) * v.s;
    for (let k = 0; k < 3; k++) { const hx = x + (rnd(i, k, 35) - 0.5) * r * 1.7 * v.s, hy = y + (rnd(i, k, 36) - 0.5) * r * 1.7 * v.s, hr = r * (0.55 + 0.5 * rnd(i, k, 37)) * v.s; g.moveTo(hx + hr, hy); g.arc(hx, hy, hr, 0, TAU); }
  }
  g.fill(); g.globalCompositeOperation = "source-over";
}
// A piece thrown from the blast: where it is at `age` (it bounces once on the floor and stops), per metre.
function thrown(i, seed, age, R, floor, fast = 1) {
  const t = age / 24, a = rnd(i, seed, 41) * Math.PI * 1.1 - 0.05 * Math.PI, sp = R * (2.2 + 3.6 * rnd(i, seed, 42)) * fast, vx = Math.cos(a) * sp * (rnd(i, seed, 43) > 0.5 ? 1 : -1) * 0.9, vy = Math.abs(Math.sin(a)) * sp + R * 0.8;
  let x = vx * t, y = vy * t - 4.9 * t * t, down = false;
  if (y < floor) { const th = (vy + Math.sqrt(vy * vy - 19.6 * floor)) / 9.8, t2 = t - th, vb = 0.3 * (9.8 * th - vy); y = floor + Math.max(0, vb * t2 - 4.9 * t2 * t2); x = vx * th + vx * 0.4 * Math.min(t2, 0.5); down = y <= floor + 1e-3; }
  return { x, y, down };
}
// A chaser drone as an effects drawing: a backlit dart with four blades and its eye. rot: radians; o.tumble squashes
// it as it turns over; o.eye 0..1; o.rim: the colour of the light behind it.
export function drone2d(g, x, y, s, rot, o = {}) {
  const sq = o.tumble ?? 1, rim = o.rim ?? FIRE.orange, P = (pts) => pts.map(([a, b]) => [a * s, b * s * sq]);
  g.save(); g.translate(x, y); g.rotate(rot);
  const body = [[0.36, 0], [0.26, -0.19], [0.1, -0.2], [-0.42, -0.07], [-0.5, 0], [-0.42, 0.07], [0.1, 0.2], [0.26, 0.19]], blades = [[[0.02, -0.1], [-0.3, -0.56], [-0.46, -0.52], [-0.14, -0.06]], [[0.02, 0.1], [-0.3, 0.56], [-0.46, 0.52], [-0.14, 0.06]], [[0.0, -0.08], [-0.02, -0.5], [0.1, -0.52], [0.12, -0.1]], [[0.0, 0.08], [-0.02, 0.5], [0.1, 0.52], [0.12, 0.1]]];
  const lost = o.lost ?? 0;
  g.lineJoin = "round"; g.lineWidth = Math.max(2.5, 0.05 * s); g.strokeStyle = INK;
  blades.forEach((b, i) => { if (i < lost) return; const q = P(b); g.beginPath(); q.forEach((p, j) => j ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.stroke(); poly(g, q, i % 2 ? "#20244a" : "#2a2f55"); });
  const q = P(body); g.beginPath(); q.forEach((p, j) => j ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.stroke(); poly(g, q, "#232748");
  poly(g, P([[0.1, -0.2], [-0.42, -0.07], [-0.36, -0.02], [0.1, -0.1]]), rim);                    // the light behind it, hard along one edge
  poly(g, P([[0.2, -0.19], [0.26, -0.19], [0.26, 0.19], [0.2, 0.19]]), "#f07a22");
  g.fillStyle = (o.eye ?? 1) > 0.3 ? "#ff2a1e" : "#4a1418"; g.beginPath(); g.ellipse(0.3 * s, 0, 0.07 * s, 0.1 * s * sq, 0, 0, TAU); g.fill();
  if ((o.eye ?? 1) > 0.3) { g.fillStyle = "#ffd0c0"; g.beginPath(); g.ellipse(0.31 * s, -0.02 * s * sq, 0.025 * s, 0.035 * s * sq, 0, 0, TAU); g.fill(); }
  g.restore();
}
// debris and wrecked drones thrown out of a blast, each trailing puffs along the way it has come
function wreckage(g, v, age, o, hot = FIRE.orange, puff = FIRE.smoke) {
  const R = o.R ?? 3, seed = o.seed ?? 1, floor = o.floor ?? -1.6, a2 = age - age % 2, nD = o.debris ?? 12, nW = o.wrecks ?? 3;
  const P = (p) => [v.cx + p.x * v.s, v.cy - p.y * v.s];
  for (let i = 0; i < nD + nW; i++) {
    const big = i >= nD, fast = big ? 0.75 : 1, born = big ? 1 : rnd(i, seed, 47) * 2; if (age <= born || age > 70) continue;
    const p = thrown(i, seed + 7, age - born, R, floor, fast), [x, y] = P(p), size = (big ? 0.95 : 0.14 + 0.3 * rnd(i, seed, 44)) * (o.scale ?? 1);
    // the trail: puffs where it was, older ones smaller, on twos
    // the trail: a ribbon of smoke along the way it has come, wide behind the piece and tapering to nothing, lumpy, on twos
    if (!p.down) {
      const pts = []; for (let k = 0; k <= 7; k++) { const ua = age - born - k * 1.3; if (ua <= 0) break; const q = thrown(i, seed + 7, ua, R, floor, fast), [qx, qy] = P(q); pts.push([qx, qy - k * k * 0.004 * v.s]); }
      if (pts.length > 2) for (const [col, grow] of [[INK, 2.5], [age < 12 ? hot : puff, 0]]) {
        const side = (sg) => pts.map((q, k) => { const a = pts[Math.max(0, k - 1)], b = pts[Math.min(pts.length - 1, k + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, w = (size * (big ? 0.34 : 0.5) * (1 - k / (pts.length - 1)) * (0.75 + 0.5 * rnd(i, k, a2, sg)) * v.s + grow) * (k === pts.length - 1 ? 0 : 1); return [q[0] - dy / l * w * sg, q[1] + dx / l * w * sg]; });
        poly(g, [...side(1), ...side(-1).reverse()], col);
      }
    }
    const spin = p.down ? rnd(i, seed, 45) * 6 : (rnd(i, seed, 45) - 0.5) * 1.6 * a2 + i;
    if (big) drone2d(g, x, y, size * v.s, spin, { tumble: p.down ? 0.6 : 0.55 + 0.45 * Math.cos(a2 * 0.7 + i), eye: age < 10 && rnd(i, a2, 9) > 0.4 ? 1 : 0, lost: i % 3, rim: age < 18 ? hot : "#3a3f66" });
    else {
      const n = 4 + (i % 2), pts = Array.from({ length: n }, (_, j) => { const a = j / n * TAU + spin, r = size * v.s * (0.5 + 0.6 * rnd(i, j, seed)); return [x + Math.cos(a) * r, y + Math.sin(a) * r * (p.down ? 0.5 : 1)]; });
      g.lineJoin = "round"; g.lineWidth = 4; g.strokeStyle = INK; g.beginPath(); pts.forEach((q, j) => j ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.closePath(); g.stroke();
      poly(g, pts, i % 3 === 0 ? "#d9cfb0" : "#2a2f55"); if (age < 16) poly(g, pts.slice(0, 3), hot);
    }
  }
}
// a shock ring: a broken line racing out, thinner as it goes
function ring(g, v, age, R, col, from = 1, life = 7) {
  const u = age - from; if (u < 0 || u >= life) return;
  const r = R * (0.7 + 2.6 * (1 - Math.exp(-u / 3))) * v.s, w = Math.max(2, R * 0.16 * v.s * (1 - u / life));
  g.strokeStyle = col; g.lineWidth = w; g.lineCap = "butt";
  for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + rnd(i, u, 3) * 0.3, len = 0.25 + 0.4 * rnd(i, u, 5); g.beginPath(); g.ellipse(v.cx, v.cy, r, r * 0.96, 0, a, a + len); g.stroke(); }
}

// A fire blast, `age` frames old.
export function fireBlast(g, v, age, o = {}) {
  if (age < 0) return;
  const R = o.R ?? 3, seed = o.seed ?? 1, a2 = age - age % 2;
  if (age === 0) {      // the first drawing: a white star with a yellow one behind it
    star(g, v.cx, v.cy, R * 2.3 * v.s, 11, seed, INK, 0.36); star(g, v.cx, v.cy, R * 2.1 * v.s, 11, seed, FIRE.yellow, 0.34); star(g, v.cx, v.cy, R * 1.5 * v.s, 9, seed + 1, FIRE.white, 0.4);
    return;
  }
  const L = fireLobes(R, age, seed, o.lobes ?? 13);
  // how much of each lobe each heat still holds, by the lobe's own age: white goes first
  // (one mass in the middle, not a spot in every lobe: the outer and later lobes cool sooner and what is left of each draws in)
  const floor = o.floor ?? -1.6; for (const l of L) l.y = Math.max(l.y, floor + l.r * 0.5);
  const heat = (base, cool) => L.map((l) => { const d = Math.hypot(l.x, l.y - 0.15 * R) / R, k = Math.max(0, base - cool * Math.max(0, age - 1)) * Math.max(0, 1 - 0.3 * d * Math.min(1, age / 6) - (l.i >= 100 ? 0.012 * age : 0)), c = 0.45 + 0.55 * k; return { ...l, x: l.x * c, y: 0.15 * R + (l.y - 0.15 * R) * c, r: l.r * k }; });
  const body = age < 3 ? FIRE.orange : age < 9 ? FIRE.red : FIRE.smoke;
  ring(g, v, age, R, age < 4 ? FIRE.white : FIRE.yellow);
  blob(g, v, L, INK, 4);
  blob(g, v, L, body);
  if (age >= 9) blob(g, v, L.map((l) => ({ ...l, x: l.x + l.r * 0.3, y: l.y - l.r * 0.34 })), FIRE.shade, 0, 0.82, 0, 0, 0, "source-atop");      // smoke: its shaded side
  if (age >= 3 && age < 30) blob(g, v, heat(0.95, 0.034), FIRE.red, 0, 1, 0, 0, 0, "source-atop");
  blob(g, v, heat(0.86, 0.042), FIRE.orange, 0, 1, 0, 0, 0, "source-atop");
  blob(g, v, heat(0.7, 0.052), FIRE.yellow, 0, 1, 0, 0, 0, "source-atop");
  blob(g, v, heat(age < 3 ? 0.62 : 0.5, 0.07), FIRE.white, 0, 1, 0, 0, 0, "source-atop");
  holes(g, v, R, age, seed, 13);
  if (age < 4) { star(g, v.cx, v.cy, R * (1.9 - 0.3 * age) * v.s, 9, seed + a2, FIRE.yellow, 0.16); star(g, v.cx, v.cy, R * (1.2 - 0.25 * age) * v.s, 7, seed + a2 + 2, FIRE.white, 0.22); }
  // embers: short streaks thrown wide, on twos
  if (age < 18) for (let i = 0; i < 22; i++) {
    const t = (a2 + 1) / 24, a = rnd(i, seed, 51) * TAU, sp = R * (3 + 5 * rnd(i, seed, 52)), life = 0.3 + 0.5 * rnd(i, seed, 53); if (t > life) continue;
    const at = (tt) => [v.cx + Math.cos(a) * sp * tt * v.s, v.cy - (Math.sin(a) * sp * tt - 3 * tt * tt) * v.s], p = at(t), q = at(t - 0.03), w = Math.max(2, 0.05 * v.s);
    g.strokeStyle = i % 3 ? FIRE.yellow : FIRE.white; g.lineWidth = w; g.lineCap = "round"; g.beginPath(); g.moveTo(q[0], q[1]); g.lineTo(p[0], p[1]); g.stroke();
  }
  wreckage(g, v, age, o);
}

// A coolant main bursting: jets of freezing vapour from where the pipes let go, white with a blue shaded side, shards
// of ice thrown out of it, glints, and a mist left hanging that thins.
export function iceBlast(g, v, age, o = {}) {
  if (age < 0) return;
  const R = o.R ?? 3, seed = o.seed ?? 1, a2 = age - age % 2, jets = o.jets ?? [[-0.75, 0.35, 1, 0.25], [0.75, 0.4, -1, 0.2], [-0.7, -0.1, 0.8, -0.5], [0.72, 0.0, -0.7, 0.75], [0, 0.6, 0.15, -1]];
  if (age === 0) { star(g, v.cx, v.cy, R * 2.2 * v.s, 12, seed, ICE.ink, 0.3); star(g, v.cx, v.cy, R * 2.0 * v.s, 12, seed, ICE.pale, 0.28); star(g, v.cx, v.cy, R * 1.3 * v.s, 8, seed + 1, ICE.white, 0.35); return; }
  const L = [], old = Math.max(0, age - 18) / 30, fade = Math.max(0, 1 - old * old);
  jets.forEach(([jx, jy, dx, dy], j) => {
    const dl = Math.hypot(dx, dy), u = age - j * 0.6; if (u <= 0) return;
    const len = R * (1.5 + 0.7 * rnd(j, seed, 1)) * (1 - Math.exp(-u / 2.6)) * (1 + 0.01 * u);
    for (let k = 0; k < 7; k++) {
      const f = k / 6, boil = 1 + 0.08 * (rnd(j, k, a2) - 0.5) * 2, wav = (rnd(j, k, seed) - 0.5) * 0.25 * R * f;
      L.push({ x: (jx * R + dx / dl * len * f) - dy / dl * wav, y: (jy * R + dy / dl * len * f) + dx / dl * wav + R * 0.001 * u * u, r: R * (0.1 + 0.34 * f) * (0.4 + 0.6 * (1 - Math.exp(-u / 3))) * boil * fade, u });
    }
  });
  for (let i = 0; i < 9; i++) { const u = age - 3 - rnd(i, seed, 2) * 4; if (u <= 0) continue; const a = i * 2.4 + seed, d = R * (0.2 + 0.7 * rnd(i, seed, 3)) * (1 - Math.exp(-u / 4)); L.push({ x: Math.cos(a) * d, y: Math.sin(a) * d * 0.7 + R * 0.001 * u * u, r: R * (0.3 + 0.25 * rnd(i, seed, 4)) * (1 - Math.exp(-u / 4)) * (1 + 0.07 * (rnd(i, a2, 5) - 0.5)) * fade, u }); }
  ring(g, v, age, R, age < 4 ? ICE.white : ICE.pale);
  blob(g, v, L, ICE.ink, 4); blob(g, v, L, age < 2 ? ICE.pale : ICE.white);
  blob(g, v, L.map((l) => ({ ...l, x: l.x + l.r * 0.28, y: l.y - l.r * 0.36 })), ICE.blue, 0, 0.8, 0, 0, 0, "source-atop");
  blob(g, v, L.map((l) => ({ ...l, x: l.x + l.r * 0.42, y: l.y - l.r * 0.5 })), ICE.deep, 0, 0.46, 0, 0, 0, "source-atop");
  blob(g, v, L.map((l) => ({ ...l, x: l.x - l.r * 0.2, y: l.y + l.r * 0.25 })), ICE.pale, 0, 0.5, 0, 0, 0, "source-atop");
  holes(g, v, R, age, seed + 3, 12, 14);
  // shards: long diamonds of ice thrown out and turning, and four-pointed glints that come and go on twos
  if (age < 26) for (let i = 0; i < 18; i++) {
    const t = age / 24, a = rnd(i, seed, 61) * TAU, sp = R * (2.5 + 4.5 * rnd(i, seed, 62)), x = v.cx + Math.cos(a) * sp * t * v.s, y = v.cy - (Math.sin(a) * sp * t - 4.9 * t * t) * v.s;
    const l = R * (0.12 + 0.2 * rnd(i, seed, 63)) * v.s, w = l * 0.28, rot = a + (rnd(i, seed, 64) - 0.5) * a2 * 0.8, c = Math.cos(rot), s = Math.sin(rot), pt = (px, py) => [x + px * c - py * s, y + px * s + py * c];
    const P = [pt(l, 0), pt(0, w), pt(-l, 0), pt(0, -w)]; g.lineWidth = 3; g.strokeStyle = ICE.ink; g.lineJoin = "miter"; g.beginPath(); P.forEach((p, j) => j ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.stroke(); poly(g, P, ICE.white); poly(g, [P[0], P[1], P[2]], ICE.blue);
  }
  if (age < 34) for (let i = 0; i < 12; i++) {
    if (rnd(i, a2, seed, 7) < 0.5) continue;
    const x = v.cx + (rnd(i, seed, 71) - 0.5) * R * 4 * v.s, y = v.cy - (rnd(i, seed, 72) - 0.4) * R * 2.6 * v.s, r = R * (0.1 + 0.16 * rnd(i, a2, 73)) * v.s;
    poly(g, [[x + r, y], [x + r * 0.14, y - r * 0.14], [x, y - r], [x - r * 0.14, y - r * 0.14], [x - r, y], [x - r * 0.14, y + r * 0.14], [x, y + r], [x + r * 0.14, y + r * 0.14]], ICE.white);
  }
  wreckage(g, v, age, { debris: 6, wrecks: 2, ...o, seed: seed + 11 }, ICE.pale, ICE.blue);
}

// Smoke across the whole frame, in two tones with its shaded side, drifting and thinning: at cover 1 nothing shows
// through it, at 0 it is gone. Held on fours (smoke is slow). colors: [body, shade, ink].
export function smokeBank(g, W, H, o = {}) {
  const { t = 0, cover = 1, seed = 1, colors = ["#5b5362", "#3a3140", INK], drift = [0.6, -0.25], n = 110 } = o; if (cover <= 0.01) return;
  const t4 = t - t % 4, v = { cx: 0, cy: H, s: 1 }, L = [];
  for (let i = 0; i < n; i++) {
    const x = ((rnd(i, seed, 4) * (W + 800) + t * drift[0] * (0.5 + rnd(i, seed, 5))) % (W + 800)) - 400, y = rnd(i, seed, 6) * H * 1.1 - 40 - t * drift[1] * (0.4 + rnd(i, seed, 7));
    // it opens from the middle of the frame: what is nearest the middle goes first
    const keep = 0.45 * rnd(i, seed, 1) + 0.55 * (1 - Math.min(1, Math.hypot((x - W / 2) / (W * 0.62), (y - H / 2) / (H * 0.62)))); if (keep > cover * 1.1) continue;
    const r = (60 + 150 * rnd(i, seed, 2) ** 1.5) * (0.75 + 0.5 * Math.min(1, cover * 1.5 - keep * 0.5)) * (1 + 0.04 * (rnd(i, t4, 3) - 0.5));
    L.push({ x: x / 1.8, y: H - y, r });
  }
  g.save(); g.transform(1.8, 0, 0, 1, 0, 0);      // long low banks, not balls
  blob(g, v, L, colors[2], 4); blob(g, v, L, colors[0]);
  blob(g, v, L.map((l) => ({ ...l, x: l.x + l.r * 0.12, y: l.y - l.r * 0.4 })), colors[1], 0, 0.84, 0, 0, 0, "source-atop");
  g.restore();
}
// Dust kicked up by a skidding stop: three or four small puffs low at (x, y) pixels, thrown the way `dir` (+1 right).
export function skid(g, x, y, s, age, dir = 1, seed = 1) {
  if (age < 0 || age > 16) return;
  const a2 = age - age % 2, L = [];
  for (let i = 0; i < 7; i++) { const u = a2 - i * 0.7; if (u <= 0) continue; const d = (0.2 + 0.9 * rnd(i, seed, 1)) * (1 - Math.exp(-u / 3)), k = Math.max(0, 1 - u / 15); L.push({ x: dir * d * 1.6 + (rnd(i, a2, 2) - 0.5) * 0.06, y: 0.1 + d * 0.5 * rnd(i, seed, 3) + 0.01 * u, r: (0.1 + 0.2 * rnd(i, seed, 4)) * (0.5 + 0.5 * d) * k }); }
  const v = { cx: x, cy: y, s };
  blob(g, v, L, "#16365e", 3); blob(g, v, L, "#e6f4fb"); blob(g, v, L.map((l) => ({ ...l, x: l.x + l.r * 0.3, y: l.y - l.r * 0.35 })), "#9cc6e2", 0, 0.75, 0, 0, 0, "source-atop");
}
