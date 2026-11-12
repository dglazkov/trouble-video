// Fall 3, 149.24-151.32 s: PAST EVERY PLACE. Beside them, falling at their speed, on the bass: the four across the
// frame, each falling in their own way, and behind them the station going up: the frost-blue plant, the violet core,
// the sea-green tunnel, each for a second, each throwing its own light on them. TANE spread-eagled and laughing, the
// coat a cape, a sandal off his foot; IFE a ball round her backpack's straps; NOOR upright, arms folded, the hair
// straight up; JUNO surfing it. Each is one drawing and two more of its hair and cloth, on threes.
import { CUT, W, H, WHO, MPP, Yg, shot, plates, propPlates, prop, at3d, flut, lit, ease, wob, strings } from "./fall_cast.js";
import { wind } from "./fall_fx.js";
const AT = { tane: [2.6, 0.5, 0.5], ife: [0.8, -0.4, -0.3], noor: [-1.0, 0.25, 0.45], juno: [-2.55, -0.25, -0.5] };      // x (the lens has -X to its right), y, z about the group
export const sideCam = (F) => { const u = (F - CUT.side) / (CUT.glass - CUT.side), y = Yg(F); return { pos: [0.8 - 1.6 * u, y + 0.35, -6.7 + 0.4 * u], target: [0.12 - 0.24 * u, y + 0.1, 1], fov: 34.5 }; };      // (clear of the slabs' ledges, which stand 0.7 m off the wall behind the lens)
function frame(f, sync) {
  const F = CUT.side + f, cam = sideCam(F), y = Yg(F);
  const cels = WHO.map((w, i) => { const [x, dy, z] = AT[w], py = y + dy + 0.3 * wob(F, 0.06 + 0.01 * i, 0.1, i * 1.7), px = x + 0.12 * wob(F, 0.05, 0.08, i * 3);
    return at3d(cam, w + ".side", flut(f, 3, i), [px, py, z], MPP[w + ".side"], { turn: (w === "tane" ? 0.07 : w === "noor" ? 0.012 : 0.04) * wob(F, 0.05, 0.09, i * 2.2), layer: lit(py, sync, F, { rimDir: [0, 6] }) }); });
  const far = (n, p, sp, k) => prop(cam, n, [p[0], y + p[1] + 0.012 * f * sp, p[2]], f * 0.07 * sp + p[0], k, { ...lit(y + p[1], sync, F), fog: 0.25, fogColor: [0.03, 0.04, 0.1] });
  cels.push(far("pipe", [2.1, 1.7, 2.6], 1, 1), far("head", [-0.2, -1.6, 3.2], -0.8, 1), far("rotor", [-2.6, 1.9, 2.8], 1.4, 1), far("plate", [0.4, 2.2, 3.6], 0.5, 1.2));
  return { set: "shaft", camera: cam, cels, options: { rooms: 0.62 + 0.4 * strings(sync, F) }, post: { bgStreak: [0, 0.022], flash: f === 0 ? 0.12 : 0 },
    overlay(g) { wind(g, F, { n: 22, alpha: 0.26, speed: 170 }); } };
}
export default shot("side", { cutOn: "bass", plates: { ...plates(...WHO.map((w) => w + ".side")), ...propPlates("pipe", "head", "rotor", "plate") }, frame });
