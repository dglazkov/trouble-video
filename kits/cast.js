// The cast, for a shot that wants them: where each kit is, each one's colours, and how far each one's run carries
// them, so that a running figure covers the ground its legs cover and its planted foot stays planted.
// (The film's own sections keep their copies of these numbers in shots/*_cast.js; this is the same data for new work.
// docs/cast.md says who each of them is and lists every drawing their kits hold.)
import { proportions } from "../engine/body.js";
import { strideOf } from "../engine/actions.js";

// cast: { who: kit folder } is what a shot's `cast` wants; take the ones the shot shows.
export const CAST = { tane: "/kits/tane", ife: "/kits/ife", noor: "/kits/noor", juno: "/kits/juno" };
// Each one's colours: main (their streak, their card), deep (its ground), hot (the accent).
export const COLORS = {
  tane: { main: "#e8242c", deep: "#5a0a14", hot: "#ffd9a0" },
  ife: { main: "#3dff8a", deep: "#04301c", hot: "#eaffd0" },
  noor: { main: "#a45cff", deep: "#1a0a3c", hot: "#ffffff" },
  juno: { main: "#ff8a1e", deep: "#073c44", hot: "#3fe0d8" },
};
// What of each body the stride depends on (kits/NAME/character.json `body`; `npm test` holds these to those files).
export const LEGS = { tane: { height: 1.7, hipW: 0.102 }, ife: { height: 1.42 }, noor: { height: 1.82 }, juno: { height: 1.6 } };
// Metres covered by one cycle of the action `run` (two steps), each in their own manner (engine/actions.js MANNER).
export const STRIDE = Object.fromEntries(Object.entries(LEGS).map(([who, b]) => [who, strideOf(who, proportions(b))]));
// A run is { who, action: "run", phase }: phase counts cycles. To keep feet planted, a runner who has covered d metres
// is at phase d / STRIDE[who] (plus where in the cycle they started). At `speed` m/s that is one cycle every:
export const cadence = (who, speed, fps = 24) => STRIDE[who] * fps / speed;      // frames
