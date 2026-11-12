// The shaft's plan, for whoever needs it without the set (a shot's choreography, a check run in node).
// A square well R from its axis (x = 0, z = 0) to each wall, straight down from the hatch at y = 0. Below a plain
// collar TOP deep, the wall is cut open on storey after storey of the station: each LEVEL is an opening OPEN high on
// all four walls onto one place of the film, then SLAB of floor between it and the next. They come in the film's
// order reversed, the last place first, so the fall ends where the film began: at the vault's green screens. Under the
// vault is what nobody has seen (twice, the second time nearly dark), and under that nothing is lit.
export const R = 8, OPEN = 9, SLAB = 2, L = OPEN + SLAB, TOP = 16, DEPTH = 3;
// glow: the colour a place throws on whoever falls past it
export const PLACES = [
  { name: "plant", glow: [0.62, 0.82, 1.0] },
  { name: "core", glow: [0.82, 0.68, 1.0] },
  { name: "tunnel", glow: [0.55, 0.92, 0.62] },
  { name: "market", glow: [1.0, 0.62, 0.42] },
  { name: "corridor", glow: [0.5, 0.62, 1.0] },
  { name: "gantry", glow: [1.0, 0.5, 0.26] },
  { name: "stair", glow: [0.88, 0.9, 0.6] },
  { name: "atrium", glow: [0.86, 0.95, 1.0] },
  { name: "vault", glow: [0.42, 1.0, 0.62] },
  { name: "deep", glow: [0.3, 0.4, 0.56] },
];
export const N = PLACES.length, TOPLIGHT = [1.0, 0.62, 0.7];
export const levelOf = (name) => PLACES.findIndex((p) => p.name === name);
// the top, the middle and the foot of level i's opening
export const levelTop = (i) => -(TOP + i * L), levelMid = (i) => -(TOP + i * L + OPEN / 2), levelFoot = (i) => -(TOP + i * L + OPEN);
// The light at height y: [r, g, b] the nearest opening's glow, and k 0..1 how much of it there is (1 beside an
// opening, falling to 0 beside a slab and below the last place).
export function glowAt(y) {
  const lv = (-y - TOP) / L, i = Math.floor(lv), fy = (lv - i) * L;
  const DARK = [0.2, 0.24, 0.36];
  if (lv < -0.6) return { glow: TOPLIGHT, k: 0.8 };      // the collar under the hatch: the atrium's light from above
  const at = (j) => (j >= 0 && j < N ? PLACES[j].glow : j === N ? PLACES[N - 1].glow.map((v) => v * 0.45) : DARK);
  // across a slab the light goes from the place above to the place below, dipping
  let a = i, b = i, t = 0, dip = 0;
  if (fy > OPEN) { b = i + 1; t = (fy - OPEN) / SLAB; dip = Math.sin(Math.PI * t) * 0.35; } else if (i < 0) { a = -1; }
  const ca = a < 0 ? TOPLIGHT : at(a), cb = at(b), tt = t * t * (3 - 2 * t);
  const lit = (j) => (j < 0 ? 0.8 : j < N - 1 ? 1 : j === N - 1 ? 0.6 : j === N ? 0.3 : 0.12);
  return { glow: ca.map((v, n) => v + (cb[n] - v) * tt), k: (lit(a) + (lit(b) - lit(a)) * tt) * (1 - dip) };
}
