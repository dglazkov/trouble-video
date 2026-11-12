// Ife's win, song frames 2230-2537 (92.92-105.75 s): its shots cut together. node render.mjs shots/boom.js -> out/boom.mp4
import { edit } from "../engine/edit.js";
import { skid, jam } from "./boom_jam.js"; import { bar1, bar2, bar3, bar4, full } from "./boom_bar.js"; import { far, wide, swarm2, swarm3, swarm4, over } from "./boom_swarm.js";
import { face1, face2, eyes1, eyes2, flinch, collar } from "./boom_face.js"; import { first, x2, x3, x4, hit } from "./boom_chain.js"; import { smoke, ok } from "./boom_end.js";
export default edit("boom", [skid, jam, bar1, far, wide, face1, bar2, swarm2, face2, bar3, swarm3, eyes1, swarm4, bar4, eyes2, over, flinch, full, collar, first, x2, x3, x4, hit, smoke, ok]);
