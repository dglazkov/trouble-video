// The two wins, 62.0-78.92 s of the song (frames 1488-1892): the fourteen shots cut together.
// node render.mjs shots/wins.js -> out/wins.mp4
import { edit } from "../engine/edit.js";
import land from "./wins_land.js"; import corner from "./wins_corner.js"; import crack from "./wins_crack.js"; import bat from "./wins_bat.js"; import catch_ from "./wins_catch.js"; import slam from "./wins_slam.js"; import rest from "./wins_rest.js";
import tunnel from "./wins_tunnel.js"; import count from "./wins_count.js"; import door from "./wins_door.js"; import gate from "./wins_gate.js"; import under from "./wins_under.js"; import pile from "./wins_pile.js"; import salute from "./wins_salute.js";
export default edit("wins", [land, corner, crack, bat, catch_, slam, rest, tunnel, count, door, gate, under, pile, salute]);
