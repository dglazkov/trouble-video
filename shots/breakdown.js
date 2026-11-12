// The breakdown, song frames 2538-2865 (105.75-119.4 s): its twenty-three shots cut together (shots/brk_cast.js says
// what each is and what it lands on). node render.mjs shots/breakdown.js -> out/breakdown.mp4
import { edit } from "../engine/edit.js";
import { ife, tane, juno, noor, v_ife, v_tane, v_juno, v_noor, m_ife, m_tane, m_juno, m_noor } from "./brk_face.js";
import dark from "./brk_dark.js"; import gather from "./brk_gather.js";
import { hall, w_noor, w_tane, w_ife, w_juno, go_tane, go_ife, go_juno, go_noor } from "./brk_wide.js";
export default edit("breakdown", [ife, tane, juno, noor, dark, hall, v_ife, v_tane, v_juno, v_noor, w_noor, w_tane, w_ife, w_juno, gather, m_ife, m_tane, m_juno, m_noor, go_tane, go_ife, go_juno, go_noor]);
