// The reunion, song 119.42-146.29 s (frames 2866-3510): its shots cut together. node render.mjs shots/reunion.js -> out/reunion.mp4
//   the split-screen (shots/reun_split.js), the meet (shots/reun_meet.js), the fight and the end (shots/reun_fight.js)
import { edit } from "../engine/edit.js";
import split from "./reun_split.js"; import { MEET_SHOTS } from "./reun_meet.js"; import { FIGHT_SHOTS } from "./reun_fight.js";
export default edit("reunion", [split, ...MEET_SHOTS, ...FIGHT_SHOTS]);
