// Breakdown 5, L 76-108: THE LIGHTS GO OUT, seen once at the station's own scale. The atrium as the descent left it
// (shots/desc_out.js: the painted vista, every band of decks in the alarm's red), from the same side, the camera
// sinking a little. On the brass (L76) the top of the shaft goes dark; a band lower on the strings and the keyboard
// (L90), lower on the strings (L95), and on the beat after (L100) it lets go and the dark runs down the shaft past the
// gantry and on to the bottom: the alarm spreading, backwards. The great screens go out as their band does; the craft
// are gone. Nobody is on the bridge.
import { HERO } from "../sets/atriumplan.js";
import { CUT, EV, shot, ease, clamp, lerp } from "./brk_cast.js";
const [A, B, C, D] = EV.decks.map((d) => d - CUT.dark);
// the lowest band still lit at f (bands are twelve metres; 0 is the gantry's level): a step on each note, then all the way down
export const litBelow = (f) => f < A ? 99 : f < B ? 1.5 - (f - A >= 6 ? 1 : 0) : f < C ? -1.5 - (f - B >= 3 ? 1 : 0) : f < D ? -3.5 - (f - C >= 3 ? 1 : 0) : Math.max(-9.5, -5.5 - Math.floor((f - D) * 1.2 + 0.25 * (f - D) ** 2));      // (all but the depths: the mist down there still smoulders)
export default shot("dark", { cutOn: "brass", sets: ["atrium"], cast: {},
  marks: [{ at: A, what: "the top of the shaft goes dark", on: "brass" }, { at: B, what: "a band lower", on: "strings" }, { at: C, what: "lower", on: "strings" }, { at: D, what: "the dark runs down the shaft", on: "beat" }],
  frame(f, sync) {
    const u = f / 32, d = 0.25 + 0.5 * u, out = litBelow(f), gone = clamp((0.6 - out) / 1.2), step = Math.min(...[A, B, C, D].map((s) => f >= s ? f - s : 99));
    return { set: "atrium",
      camera: { pos: HERO.pos.map((v, i) => v + [-3, -3, 6][i] * d), target: [HERO.target[0] - 2 * d, HERO.target[1] - 1.5 * d - 6 * ease(u), HERO.target[2] + 3 * d], fov: HERO.fov },
      options: { door: "vault", vista: 1, alert: 1 - gone, alarm: { gantry: gone > 0.5 ? -1 : 200, rings: 60 }, out, night: gone, screens: out < 0 ? {} : { text: "TROUBLE", small: "トラブル", alarm: 1 }, drones: [],
        wiring: { screens: out < 0 ? 0.04 : 0.9, traffic: 0, klaxon: 0.3 * (1 - gone), note: 0, windows: 0.8, hull: 0.7 * (1 - gone) } },
      actors: [], post: { flash: step === 0 ? 0.05 : 0, vignette: 0.42 + 0.25 * gone, ca: 0.0012 + (step < 2 ? 0.002 : 0) } };
  } });
