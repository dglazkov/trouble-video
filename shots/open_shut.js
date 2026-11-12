// Opening 4, 7.25-10.17 s: "We're in deep" (1). The shutters come down, one per hit: the two bays behind the four
// (7.41 s, 8.50 s), then, on a crash zoom out, the bays to either side (9.45 s, 9.75 s). They start round in the first one's flash.
import { FPS, CUT, CAST, KIDS, SHUTS, startOf, cues, kid, boil, ease, wob } from "./open_cast.js";
import { sfx, sfxMark } from "../engine/sfx.js";
const FRAMES = CUT.ring - CUT.shut, WIDE = 227 - CUT.shut, START = 178 - CUT.shut + 1;      // they start round on the frame after the first slam, in its flash
const HITS = SHUTS.filter(([, hit]) => hit >= CUT.shut && hit < CUT.ring).map(([bay, hit]) => ({ bay, at: hit - CUT.shut }));
// the slams' sound, lettered on the dark of the reel tower between the bays (nothing is written there): the two behind
// the four, and the first of the pair on the crash zoom (the second lands seven frames on, under the same word)
const WORDS = [{ hit: 0, x: 990, y: 250, size: 88, angle: -0.14, seed: 1 }, { hit: 1, x: 1000, y: 330, size: 94, angle: 0.09, seed: 2 }, { hit: 2, x: 968, y: 290, size: 64, angle: -0.2, seed: 3 }];
function frame(f, sync) {
  const F = CUT.shut + f, k = f / FRAMES, jolt = Math.max(...HITS.map((h) => f >= h.at ? Math.exp(-(f - h.at) / 2.2) : 0)), wide = f >= WIDE;
  return { set: "vault",
    camera: { pos: [0.75 - 0.3 * k + 0.07 * jolt * wob(f, 9, 14, 1), 1.12 + 0.06 * jolt * wob(f, 11, 17, 2), 9.5 - 0.5 * k], target: [0.3, wide ? 2.2 : 1.9, 2.5], fov: wide ? 57 - 3 * ease((f - WIDE) / 14) : 33 - 2 * k },
    options: { ...cues(F) },
    post: { ca: 0.0014 + 0.006 * jolt, flash: HITS.some((h) => h.at === f) ? 0.22 : f === START ? 0.07 : 0, bloom: 1.0 + 0.4 * jolt, bgBlur: f === WIDE ? 0.05 : 0 },
    overlay(g) { for (const w of WORDS) sfx(g, { text: "ガシャン", ...w, color: "station", age: f - HITS[w.hit].at, life: 9, shake: 8, pop: [1.3, 1.3, 1.05, 1.05], burst: { k: 0.7 } }); },
    actors: KIDS.map((who, i) => kid(who, f >= START ? 1 : 0, { layer: f >= START ? boil(f + i) : undefined })) };
}
export default { name: "open_shut", start: startOf("shut"), frames: FRAMES, fps: FPS, cutOn: "beat", held: (f) => f < START ? 0 : START + (f - START) - (f - START) % 2,      // drawings on twos counted from the frame they start round on
  marks: [...HITS.map((h, i) => ({ at: h.at, what: `shutter ${i + 1} lands (bay ${h.bay})`, on: i < 2 ? "backing_vocals" : "strings" })), ...WORDS.map((w) => sfxMark(HITS[w.hit].at, "ガシャン", `shutter ${w.hit + 1}`, w.hit < 2 ? "backing_vocals" : "strings"))], sets: ["vault"], cast: CAST, frame };
