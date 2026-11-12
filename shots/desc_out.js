// Descent 1, 19.92-23.21 s: OUT. The opening's last shot goes on without a break in the run: the four at us, low, out
// of the vault's doorway with its red behind them, the drones coming through it after them. Then the camera lets go
// of them: back along the gantry, out over its rail and up, faster than they can run, until they are four small
// figures on a bridge and the picture is the atrium: the station's hollow middle, painted (sets/atrium.js), ring
// under ring going down into the mist. The camera arrives with the brass (21.13 s) and goes on backing away ahead of
// them, slowly, for two seconds and more. On the second "Trouble!" (21.59 s) every screen says so and the alarm runs
// out along the gantry, post by post; on the brass after it (21.80 s) the rings begin to turn red, this level first,
// further on each note, until the whole shaft has.
import { chase } from "../machines/drones.js";
import { HERO } from "../sets/atriumplan.js";
import { FPS, CUT, CAST, CADENCE, RUN, startOf, ease, wob, clamp, lerp } from "./desc_cast.js";
const FRAMES = CUT.gate - CUT.out, GO = 4, THERE = 507 - CUT.out, SHOUT = 518 - CUT.out, RINGS = 523 - CUT.out, NOTES = [529 - CUT.out, 537 - CUT.out], BOLT = 20;      // frames of this shot; the opening's bolt had run 20 frames at the cut
const PLACE = { tane: [-0.95, 0, 0.1], ife: [0.3, -0.9, 0.7], juno: [1.05, -1.3, 0.55], noor: [-0.4, -1.9, 0.3] };      // as they left the vault (shots/open_bolt.js)
const LATE = { ife: 0.25 };      // of a stride, taken up over 20 frames once they are far off: as it was, a footfall of Ife's near the cut straddled two drawings and slid a quarter of a metre (engine/motion.mjs: plant)
const lead = (f) => 1.9 + RUN * f / FPS;
const mix3 = (a, b, t) => a.map((v, i) => lerp(v, b[i], t));
// how far the camera has let go of them: nothing for the first frames (the cut is on the run), then away, there with the brass
const away = (f) => { const u = clamp((f - GO) / (THERE - GO)); return u * u * u * (u * (u * 6 - 15) + 10); };
// the vista's camera: the one it was painted for (HERO) two fifths of the way through the hold, backing away along DRIFT throughout, and sinking toward them: they come on down the gantry, and grow
const DRIFT = [-3, -3, 6], HOLD = FRAMES - THERE;
// how many bands of decks (sets/atrium.js: twelve metres each) have turned: this level on the brass, then on, with a lurch on each note after, and after the last all the way down
const rings = (f) => f < RINGS ? 0 : f < NOTES[0] ? 1.2 + 0.3 * (f - RINGS) : f < NOTES[1] ? 4.5 + 0.3 * (f - NOTES[0]) : 9 * Math.exp(0.08 * (f - NOTES[1]));
function frame(f, sync) {
  const F = CUT.out + f, z = lead(f), e = away(f), d = (f - THERE) / HOLD - 0.4, since = f - SHOUT, hit = since >= 0 ? Math.exp(-since / 3) : 0;
  const near = { pos: [0.45 + wob(f, 1.9, 3.1, 1) * 0.02, 0.4 + wob(f, 2.3, 3.7, 2) * 0.02, z + 3.0], target: [-0.1, 1.12, z - 0.6] };
  const far = { pos: HERO.pos.map((v, i) => v + DRIFT[i] * d), target: [HERO.target[0] - 2 * d, HERO.target[1] - 1.5 * d, HERO.target[2] + 3 * d] };
  // the way out is a curve: back along the gantry and up first, then out over the rail, above its beacons
  const pos = [lerp(near.pos[0], far.pos[0], e * e), lerp(near.pos[1], far.pos[1], Math.pow(e, 1.15)), lerp(near.pos[2], far.pos[2], e)];
  return { set: "atrium",
    camera: { pos, target: mix3(near.target, far.target, Math.pow(e, 1.3)), fov: lerp(50, HERO.fov, e), up: [Math.sin(0.06 * (1 - e)), Math.cos(0.06 * (1 - e)), 0] },
    options: { door: "vault", vista: clamp((e - 0.25) / 0.4), alert: since >= 0 ? 1 : 0, alarm: { gantry: since >= 0 ? since * 13 : -1, rings: rings(f) },
      screens: since >= 0 ? { text: "TROUBLE", small: "トラブル", alarm: 1 } : {},
      drones: chase(F, sync, { n: 12, lead: [0, 2.1, Math.min(z - 6.5, 3 + (z - 6.5) * 0.5)], spread: [2.2, 1.7, 9], seed: 7 }).map((d) => ({ ...d, eye: 1.5 })),
      post: { bgBlur: 0.012 * (1 - e) + 0.05 * e * (1 - e) * 4, focus: [0.5, 0.55] } },
    post: { flash: since === 0 ? 0.22 : since === 1 ? 0.08 : 0, ca: 0.0012 + 0.003 * hit },
    actors: Object.entries(PLACE).map(([who, [x, dz, ph]]) => ({ who, action: "run", view: "front", phase: ph + (BOLT + f) / CADENCE[who] + (LATE[who] ?? 0) * ease(clamp((f - THERE) / 20)), yaw: 0, steady: 4, x: x + 0.1 * Math.sin((f + BOLT) * 0.11 + ph * 9), z: z + dz })) };
}
export default { name: "desc_out", start: startOf("out"), frames: FRAMES, fps: FPS, cutOn: "strings", sets: ["atrium"], cast: CAST, frame,
  marks: [{ at: THERE, what: "the camera is there: the atrium", on: "brass" }, { at: SHOUT, what: "\"Trouble!\": the screens say it; the alarm runs out along the gantry", on: "backing_vocals" }, { at: RINGS, what: "the rings begin to turn", on: "brass" },
    ...NOTES.map((at) => ({ at, what: "more rings turn", on: "brass" }))] };
