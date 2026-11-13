// The smallest set: a bare room to copy when making a place of your own. docs/sets.md walks through it.
// A floor, a back wall with one big screen, two posts. A pool of light on the floor breathes with the bass; the screen
// flares on every kick. Fifty lines; sets/gantry.js is the next step up, sets/corridor.js the full thing.
//
// A set is a module in sets/ that exports createSet(renderer, { width, height }) -> { update, light, floorAt }:
//   update(camera, frame, sync, options) -> { scene, camera, clear, post }    build this frame; called for every frame
//   light([x, y, z], options) -> { tint, rim, from, fogK, fogColor }          the light a figure standing there is laid in
//   floorAt(x, z) -> height of the floor there, or null where there is none   (feet and contact shadows)
// The stage finds it by file name: a shot that says set: "example" gets sets/example.js.
import * as THREE from "three";
import { createKit, createShadows, canvasTex, aim, clamp } from "./kit.js";
import { driveAll } from "../engine/sync.js";

// The room plays the song: one wire per system (engine/sync.js drive()). A shot can replace any with options.wiring.
export const WIRING = {
  pool: { stem: "bass", mode: "env", floor: 0.6, gain: 0.6 },                 // how wide the pool of light is
  screen: { stem: "kick", mode: "pulse", decay: 0.15, floor: 0.7, gain: 0.9 },   // the screen flares on a kick
};
// Tone is drawn, not computed from lamps: the set says, for any point of any surface, whether it is in shade (0), in
// the mid tone (1) or lit (2), as hard shapes. sets/kit.js needs these four functions from every set.
const CHUNK = `
uniform float uPool;
float setTone(vec3 W, vec3 N){
  if(N.y > 0.7){ float d = length(W.xz); return d < 2.4*uPool ? 2.0 : (d < 5.0 ? 1.0 : 0.0); }      // the floor: a round pool under the lamp
  return W.y < 2.2 ? 1.0 : 0.0;                                                                     // walls: mid tone low down, shade above
}
vec3 setExtra(vec3 col, vec3 W, vec3 N, float tone){ return col; }
float setEmit(vec3 W, int flag){ return 1.0; }
vec3 setSpecial(vec3 W, vec3 dir, vec2 uv){ return vec3(0.0); }`;

export async function createSet(renderer, { width, height }) {
  const U = { uPool: { value: 1 } }, G = { screen: { value: 1 } };      // the set's own uniforms; a gain shared with whoever drives it
  const kit = createKit(CHUNK, U), { mat } = kit, scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera();
  kit.shared.uFogCol.value.set("#141a3a"); kit.shared.uFogK.value = 0.02;
  const b = kit.builder();
  b.box(16, 0.2, 16, 0, -0.1, 0, mat("#3b4a8a"));                             // the floor (its top at y = 0)
  b.box(16, 6, 0.3, 0, 3, -6, mat("#2c3470"));                                // the back wall
  for (const x of [-5, 5]) b.box(0.6, 6, 0.6, x, 3, -4.5, mat("#e0802a"));    // two posts
  // a screen: an emissive map (kind 2) drawn on a canvas; lettering in a set is drawn here, never generated
  const tex = canvasTex(512, 256, (c, w, h) => { c.fillStyle = "#06240f"; c.fillRect(0, 0, w, h); c.fillStyle = "#5fe08a"; c.font = "bold 150px monospace"; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("HELLO", w / 2, h / 2 + 8); });
  b.quad([0, 3.1, -5.8], [1, 0, 0], [0, 1, 0], 5, 2.5, mat("#ffffff", { kind: 2, map: tex, gain: G.screen }));
  scene.add(b.build());
  const shadows = createShadows(kit, scene);
  function update(cam, frame, sync, opt = {}) {
    const w = driveAll(sync, WIRING, frame, opt.wiring);
    aim(camera, cam, width / height); kit.shared.uCam.value.copy(camera.position); kit.shared.uFrame.value = frame;
    U.uPool.value = clamp(w.pool, 0, 1.4); G.screen.value = w.screen;
    shadows.update(opt.shadows);
    return { scene, camera, clear: opt.clear ?? 0x0a0c20, post: { bloom: 0.8, ...opt.post } };
  }
  // One light everywhere: cool from above, a green rim from the screen behind.
  const light = () => ({ tint: [0.92, 0.94, 1.05], rim: [0.4, 1.0, 0.6], from: [0, 0.4, -1], fogK: 0.01, fogColor: [0.08, 0.1, 0.23], gradient: 0 });
  const floorAt = (x, z) => Math.abs(x) < 8 && Math.abs(z) < 8 ? 0 : null;
  return { name: "example", scene, camera, kit, update, light, floorAt, WIRING };
}
