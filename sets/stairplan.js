// The stair tower of sets/stairwell.js as numbers: where its flights, landings and lift are, and how high the floor
// is under a point. No drawing here, so the shots, the set and engine/motion.mjs can all ask it.
//
// The tower is seen from +Z. Flights run along X between x = X0 and X1 and drop H each; level m is at y = -m * H.
// Flight k goes from level k down to level k + 1: even flights are in the NEAR lane (toward +Z) and go down toward +X,
// odd ones in the FAR lane and go down toward -X. So the left landings are the even levels (0 the top, where the
// gantry comes in, FLIGHTS the bottom) and the right landings the odd ones. The lift's cage runs in its own shaft left
// of the left landings, its gate toward +Z, and stops at their balconies. The shaft the tower stands in is wider than
// the tower all round; its back wall (z = BACK) has the doors to the gantries, at the top and at the bottom.
export const H = 3, STEPS = 12, RISE = H / STEPS, TREAD = 0.4, X0 = -2.4, X1 = 2.4, FLIGHTS = 8, BOTTOM = -FLIGHTS * H;
export const NEAR = 0.75, FAR = -0.75, LANE = 1.3, RAIL = 1.0;                     // lane centres (z), a lane's width, a handrail's height over the nosings
export const LEFT = { x0: -4.6, x1: X0, z0: -1.4, z1: 2.4 }, RIGHT = { x0: X1, x1: 3.9, z0: -1.4, z1: 1.4 };   // the landings
export const LIFT = { x0: -6.8, x1: -4.6, z0: -1.4, z1: 0.8, x: -5.7, z: 0.3, h: 2.5 };      // the cage: its shaft, where a rider stands, its height
export const BALCONY = { x0: -6.8, x1: -4.6, z0: 0.8, z1: 2.4 };                    // in front of the lift at every left landing
export const WALK = { x0: -4.6, x1: X0, z0: -7, z1: -1.4 }, BACK = -7;              // the way in from the door in the back wall (top and bottom)
export const SHAFT = { x0: -8.6, x1: 6.2, z0: BACK, z1: 4.6 };
export const lane = (k) => (k % 2 === 0 ? NEAR : FAR), dir = (k) => (k % 2 === 0 ? 1 : -1);
// where someone on flight k stands across it (toward the camera's side of their lane: their own treads are then not in
// front of their feet, and whatever belongs to the near lane is in front of whoever is on the far one), and where the
// flight's two handrails are: its inner one (between the lanes) and its outer one
export const stand = (k) => (k % 2 === 0 ? 1.1 : -0.45);
export const railZ = (k, inner) => (k % 2 === 0 ? (inner ? 0.16 : 1.47) : (inner ? -0.07 : -1.43));
const along = (k, x) => (k % 2 === 0 ? x - X0 : X1 - x);                            // metres down flight k at x
// the line through flight k's nosings at x, and the tread under x (the last tread is the lower landing's level)
export const slopeY = (k, x) => -k * H - H * along(k, x) / (X1 - X0);
export const stepY = (k, x) => -k * H - (Math.min(STEPS - 1, Math.max(0, Math.floor(along(k, x) / TREAD + 1e-6))) + 1) * RISE;
const inside = (r, x, z) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;
// The floor under (x, z) for someone whose feet are at about y: the highest tread or deck not more than a step above
// them. null where there is none.
export function floorAt(x, z, y = 0) {
  let best = null; const take = (h) => { if (h <= y + 0.6 && (best === null || h > best)) best = h; };
  if (inside(LIFT, x, z)) return y;      // in the cage: its floor is wherever the rider is
  if (x > X0 && x < X1 && Math.abs(z) <= 1.4) { for (let k = 0; k < FLIGHTS; k++) if (Math.abs(z - lane(k)) <= LANE / 2 + 0.1) take(stepY(k, x)); }
  for (let m = 0; m <= FLIGHTS; m += 2) if (inside(LEFT, x, z) || inside(BALCONY, x, z)) take(-m * H);
  for (let m = 1; m < FLIGHTS; m += 2) if (inside(RIGHT, x, z)) take(-m * H);
  if (inside(WALK, x, z)) take(0);
  if (inside(SHAFT, x, z)) take(BOTTOM);
  return best;
}
