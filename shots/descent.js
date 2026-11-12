// The descent, song 19.92-29.83 s: its eight shots cut together. node render.mjs shots/descent.js -> out/descent.mp4
import { edit } from "../engine/edit.js";
import out from "./desc_out.js"; import head from "./desc_head.js"; import gate from "./desc_gate.js"; import shaft from "./desc_shaft.js"; import { arrive, nails, heap } from "./desc_ding.js"; import exit from "./desc_exit.js";
export default edit("descent", [out, head, gate, shaft, arrive, nails, heap, exit]);
