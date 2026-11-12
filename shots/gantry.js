// The gantry and the blast doors, song 29.83-48.0 s: its shots cut together; the slice (shots/slice.js) follows on
// from its last frame. node render.mjs shots/gantry.js -> out/gantry.mp4
import { edit } from "../engine/edit.js";
import wide from "./gant_wide.js"; import fire from "./gant_fire.js"; import haul from "./gant_haul.js"; import front from "./gant_front.js"; import duck from "./gant_duck.js"; import tane from "./gant_tane.js"; import fall from "./gant_fall.js";
import { doors, door } from "./gant_doors.js"; import slam from "./gant_slam.js"; import sprint from "./gant_sprint.js"; import slide from "./gant_slide.js"; import dent from "./gant_dent.js"; import out from "./gant_out.js";
export default edit("gantry", [wide, fire, haul, front, duck, tane, fall, doors, slam, door, sprint, slide, dent, out]);
