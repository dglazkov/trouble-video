// The opening, song 0:00-0:19.9: its shots cut together (the last step back is ten: one play of it per beat). node render.mjs shots/open.js -> out/open.mp4
import { edit } from "../engine/edit.js";
import wake from "./open_wake.js"; import room from "./open_room.js"; import faces from "./open_faces.js"; import shut from "./open_shut.js"; import ring from "./open_ring.js";
import drones from "./open_drones.js"; import red from "./open_red.js"; import { plays } from "./open_back.js"; import title from "./open_title.js"; import bolt from "./open_bolt.js";
import { LYRIC_MARKS } from "./open_cast.js";
// every word the screens say is held to the frame it is sung on (the opening starts at song frame 0, so its frames are the song's)
const cut = edit("open", [wake, room, faces, shut, ring, drones, red, ...plays, title, bolt]);
export default { ...cut, marks: [...cut.marks, ...LYRIC_MARKS.filter((m) => m.at >= 45)] };
