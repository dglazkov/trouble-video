// The core's plan, for whoever needs it without the set (a shot's choreography, a check run in node).
// The maintenance duct runs along +Z to its lip at z = 0 in the core's wall (floor y = 0, DUCT.w wide, DUCT.h high);
// the far side is a service island whose deck (y = 0, where there is weight again) begins at z = ISLAND. Between them
// the security lattice: a six-sided cage of truss, LAT.r from its axis (x = 0, y = LAT.y), from LAT.z0 to LAT.z1.
// HERO: the camera the far side is painted for (sets/core/far.webp), and the lens the painting covers.
export const DUCT = { w: 3.4, h: 3.2, len: 40 }, ISLAND = 19.8, LAT = { r: 6, y: 1.6, z0: 7, z1: 17 };
export const HERO = { pos: [0, 1.6, 0.5], target: [-10.5, 1.6, 100], fov: 40, wide: 50 };
// where the core's light is, as a direction from anywhere in the set (it is kilometres off): what faces it is lit
export const SUN = [-0.43, 0.02, 0.9];      // (to the right of +Z as the painting has it: screen right is -X for a camera that looks along +Z)
// A service console on the island's deck, shown only when a shot asks for it (options.console: the breakdown): a monitor
// on a post. screen: its picture's centre, the way its text runs (u) and its size; the shot draws what it says.
export const CONSOLE = { at: [-1.75, 0, 22.3], n: [0.86, 0, -0.5], screen: { c: [-1.75, 1.32, 22.3], u: [-0.5, 0, -0.86], w: 0.8, h: 0.6 } };
