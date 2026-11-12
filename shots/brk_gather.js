// Breakdown 15, L 209-244: IT GATHERS. The atrium with its lights out, from where we watched them go (the painted
// vista, dark; only the mist on the shaft's floor still smoulders). Under the gantry, against that glow, what the four
// broke comes in out of the dark from every side, piece after piece, and goes together into ONE machine
// (machines/warden.js, assembling), hanging from the bridge's underside. It is not shown: it and the bridge are black
// shapes against the glow, and all that is lit is what it lights itself: its eyes, which come on as the last pieces go
// home, on the pulses of the voice (L219 on, every five frames), and at the end turn up to us.
import { HERO } from "../sets/atriumplan.js";
import { CUT, shot, ease, clamp } from "./brk_cast.js";
const AT = [3, -24, 30], N = 35, PULSES = [214, 219, 224, 229, 234, 239];
export default shot("gather", { cutOn: "strings", sets: ["atrium"], cast: {},
  marks: [{ at: 0, what: "the wreckage gathers", on: "strings" }, ...PULSES.map((p, i) => ({ at: p - CUT.gather, what: `its eyes: pulse ${i + 1}`, on: "lead_vocals" }))],
  frame(f, sync) {
    const L = CUT.gather + f, u = f / N, pulse = Math.min(...PULSES.map((p) => L >= p ? L - p : 99)), n = PULSES.filter((p) => L >= p).length, hit = Math.exp(-pulse / 2);
    const cam = { pos: [HERO.pos[0] - 1 - 1.5 * u, HERO.pos[1] - 1, HERO.pos[2] - 2 - 2 * u], target: [AT[0] - 7, AT[1] - 1, AT[2] - 6], fov: 50 - 5 * ease(u) };
    return { set: "atrium", camera: cam,
      options: { door: "vault", vista: 1, alert: 0, alarm: { gantry: -1, rings: 60 }, out: -9.5, night: 1, silhouette: 0.97, screens: {}, drones: [], wiring: { screens: 0.03, traffic: 0, klaxon: 0, note: 0, hull: 0.1, windows: 0.5 },
        warden: { pos: AT, yaw: 60, scale: 1, look: f > 28 ? cam.pos : [AT[0] + 20, AT[1] - 6, AT[2] + 30], assemble: 0.22 + 0.78 * clamp(f / 14) ** 0.85, eye: n > 1 ? 0.5 + 0.35 * (n - 1) + 0.8 * hit : 0, sway: 0.6,
          sources: [[-70, 0, 40], [60, -50, 90], [50, 10, -40], [-30, -120, 60], [-80, -60, -20], [20, 30, 100]], scatter: [16, 12, 16] } },
      actors: [], post: { dark: 0.26 - 0.1 * hit, bloom: 1.15, bloomThreshold: 0.5, vignette: 0.6, ca: 0.0012 + 0.003 * hit, sat: 1.05 } };
  } });
