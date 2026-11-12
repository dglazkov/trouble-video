// The reunion's meet by itself (section frames 208-298), to render and check it: node render.mjs shots/reun_meet_edit.js
import { edit } from "../engine/edit.js";
import MEET_SHOTS from "./reun_meet.js";
export default edit("reun_meet_edit", MEET_SHOTS);
