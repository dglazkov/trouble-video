// The breakdown's four PLACES, as each kid's win left them (the sets and the cues of shots/wins_*.js, core_*.js and
// boom_*.js at their last frames), and what the lights going out does to each. For every kid:
//   set, pal        the set; the phosphor of the screen nearest them (brk_cast.js PAL)
//   options(L, sync, D)   the set's cues at section frame L, D = how dark it is (0 lit .. 1 out)
//   cam(f, o)       the camera behind a close-up of them: it puts their screen beside the face
//   screen          that screen in the set: centre, the way its text runs, size (metres), and its picture's pixels
//   light           the light the place lays on a drawing while its lamps are on; dark: how far the photography dims the set at D = 1
// The lamps are the sets' own while they burn. Out, a set is dimmed by the photography (post.dark) and its lit parts
// with it; what still shines (a screen, a red eye) is drawn by the shot over the dimmed set.
import { corridor, dentsAt, DOORZ, TZ } from "./wins_cast.js";
import { trio } from "./wins_tane.js";
import { coreOptions, enforcerAt, slabAt, CUTS, noorAt, EV as CORE } from "./core_cast.js";
import { plant } from "./boom_cast.js";
import { CONSOLE } from "../sets/coreplan.js";
import { smokeBank } from "../engine/fx.js";
import { W, H, clamp, ease, lerp, wob, rnd } from "./brk_cast.js";

// Noor stands where the core's last shot left them
export const NOOR = noorAt(2229), JUNO = { x: -0.32, z: DOORZ + 2.5, yaw: -52 }, TANE = { x: 0.2, z: TZ - 0.3 }, IFE = [-1.45, 0, 0.75];
// the sliced enforcer, hanging where the grid left it, its slices still easing apart
const E0 = enforcerAt(2229).pos, T0 = (2229 - CORE.cut) / 24;
export const slabs = (L, o = {}) => { const t = T0 + 0.35 * (1 - Math.exp(-L / 60)); return { pos: [E0[0] + (o.dx ?? 0), E0[1] + (o.dy ?? 0), E0[2] + (o.dz ?? 0)], cuts: CUTS, at: CUTS.concat(0).map((_, j) => { const a = slabAt(j, t), k = o.gap ?? 1; return [a[0] * k, a[1] * k, a[2] * k + (o.train ?? 0) * (j - 2), a[3] + (o.roll ?? 0) * (j - 2)]; }), heat: o.heat ?? 0.25 * Math.exp(-L / 80) }; };
// the corridor's lamps and strips, the tunnel's tubes, the plant's lamps: each burns as its wire says until the lights go
// a monitor on the tunnel's right wall beyond the door, facing back at where she sits (sets/tunnel.js builds it where it is told)
export const JMON = { c: [1.1, 1.3, 68.9], u: [0, 0, 1], w: 0.84, h: 0.63 };
const out = (D, v) => v * (1 - D);

export const PLACES = {
  ife: { set: "plant", pal: "green", dark: 0.55,
    options: (L, sync, D) => ({ ...plant(330, sync, { drones: false }), wreck: 0.85, cards: [], blasts: [], red: null, dusk: D > 0.5 ? -20 : 100, wiring: { screens: out(D, 0.9) } }),
    cam: (f) => ({ pos: [-2.0, 1.0, 0.9], target: [2.4, 1.6, 0.6 + 0.004 * f], fov: 34 }),
    light: { tint: [0.84, 0.86, 0.9], rim: [0.85, 0.92, 1.0], rimDir: [0, 6] },
    under: (g, cam, L, f) => smokeBank(g, W, H, { t: L + 110, cover: 0.3 - 0.12 * clamp(L / 60), seed: 9, colors: ["#3f3b4a", "#2a2634", "#140a16"], drift: [0.5, 0.3] }),
    post: () => ({ bgBlur: 0.02 }) },
  tane: { set: "corridor", pal: "amber", dark: 0.82,
    options: (L, sync, D) => corridor(1724, { alert: 0.3 * (1 - D), says: { z: 24, text: "", small: "" }, drones: trio(1723, sync), wiring: { hull: out(D, 0.55), stars: out(D, 0.5), screens: out(D, 0.9), meters: out(D, 0.3), klaxon: 0 } }),
    cam: (f) => ({ pos: [1.45, 1.5, 14.6 + 0.004 * f], target: [-1.25, 1.75, 21.6], fov: 34 }),
    screen: { c: [-2.24, 1.95, 19.6], u: [0, 0, -1], w: 3.6, h: 1.32, px: [1024, 376] },
    light: { tint: [0.92, 0.94, 1.08], rim: [0.62, 0.95, 1.0], rimDir: [0, 7] } },
  juno: { set: "tunnel", pal: "amber", dark: 0.82,
    options: (L, sync, D) => ({ alert: 0.5 * (1 - D), door: 1, dents: dentsAt(1892), drones: [], monitor: JMON, wiring: { lamps: out(D, 0.8), screens: out(D, 0.9) } }),
    cam: (f) => ({ pos: [-0.25, 1.22, 67.0 + 0.003 * f], target: [1.3, 1.3, 71.6], fov: 40 }),
    screen: { ...JMON, px: [640, 480] },
    light: { tint: [0.95, 1.02, 0.97], rim: [0.7, 1.0, 0.85], rimDir: [0, 7] } },
  noor: { set: "core", pal: "violet", dark: 0.84,
    options: (L, sync, D) => coreOptions(2229, { console: true, slabs: slabs(L), wiring: { far: out(D, 0.75) } }),
    cam: (f) => ({ pos: [0.75, 1.5, 20.9], target: [-3.2, 1.38, 21.85 + 0.003 * f], fov: 38 }),
    screen: { ...CONSOLE.screen, px: [640, 480] },
    light: { tint: [0.97, 0.93, 1.04], rim: [1, 0.95, 1], rimDir: [6, 4] } },
};
