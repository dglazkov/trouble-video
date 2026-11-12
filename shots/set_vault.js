// Look-development stills of the vault: each frame is a view of it in one of its states, to be read at full size.
import { hanging } from "../sets/vault.js";
const V = [
  () => ({ camera: { pos: [0.5, 1.5, 9.4], target: [0.2, 2.0, 0], fov: 52 }, options: {} }),
  () => ({ camera: { pos: [0.3, 1.5, 3.0], target: [-2.3, 1.42, 6.3], fov: 40 }, options: { wake: { first: 1, rest: -1 }, speech: { text: "DEEP" } } }),
  () => ({ camera: { pos: [0.5, 1.5, 9.4], target: [0.2, 2.0, 0], fov: 52 }, options: { wake: { first: 2, rest: 0.25 }, swivel: 0.5, speech: { text: "MISTER." } } }),
  () => ({ camera: { pos: [0.5, 0.7, 9.4], target: [0.2, 5.5, 0], fov: 60 }, options: { racks: 1, doors: { 1: 1, 2: 1, 3: 1, 4: 1 }, speech: { text: "DEEP" }, hang: 0.5 } }),
  () => ({ camera: { pos: [0.5, 1.5, 9.4], target: [0.2, 2.0, 0], fov: 52 }, options: { red: 3, alert: 1, racks: 1, doors: { 1: 1, 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1 }, speech: { text: "DEEP", alarm: 1, glitch: 0.5 }, hang: 1 } }),
  () => ({ camera: { pos: [-3, 1.6, 4], target: [10, 2.0, 0], fov: 45 }, options: { doors: { 1: 1, 7: 1 } } }),
  () => ({ camera: { pos: [0, 15.5, 0.5], target: [0, 0, 0], fov: 70, up: [0, 0, -1] }, options: {} }),
  () => ({ camera: { pos: [3, 1.2, 5], target: [-4.4, 3.2, -6.4], fov: 38 }, options: { doors: { 2: 0.5, 3: 1 } } }),
];
export default { name: "set_vault", start: 5, frames: V.length, sets: ["vault"], frame(f, sync) { const v = V[f](); if (v.options.hang !== undefined) v.options.drones = Array.from({ length: 12 }, (_, i) => hanging(i, { unfold: v.options.hang * (i % 3) / 2, eye: i % 3 ? 1 : 0 })); return { set: "vault", ...v }; } };
