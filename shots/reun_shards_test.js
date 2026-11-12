// A look at the borders breaking (shots/reun_split.js shards) over a flat ground: node render.mjs shots/reun_shards_test.js --frames 0,1,2,4,6,8,12 --out out/reun_tmp/shards
import { shards } from "./reun_split.js";
export default { name: "reun_shards_test", start: 128.08, frames: 18, frame: (f) => ({ set: null, camera: { pos: [0, 1, 5], target: [0, 1, 0] }, backdrop(g) { g.fillStyle = "#6a2a4a"; g.fillRect(0, 0, 1920, 1080); }, overlay(g) { shards(g, f); } }) };
