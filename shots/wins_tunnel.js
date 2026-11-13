// Wins 8, 71.83-73.08 s: JUNO, LEADING THEM. From in front, backing down the service tunnel ahead of her: she weaves
// from wall to wall because she can, and the whole swarm comes on behind her in a string, the warning lamps going by.
import { FPS, CUT, CAST, startOf, jz, jx, ease, wob, tunnelSign, TROUBLE } from "./wins_cast.js";
import { swarm } from "./wins_juno.js";
const FRAMES = CUT.count - CUT.tunnel;
function frame(f, sync) {
  const F = CUT.tunnel + f, z = jz(F), x = jx(F), turn = (jx(F + 2) - jx(F - 2)) / 4, drums = sync.drive({ stem: "kick", mode: "pulse", decay: 0.1 }, F), shake = 0.012 + 0.03 * drums, k = f / FRAMES;
  const lean = turn > 0.05 ? 0 : turn < -0.05 ? 1 : 0.5;
  return { set: "tunnel",
    camera: { pos: [x * 0.8 + 0.2 + wob(f, 2.1, 3.3, 1) * shake, 0.82 + wob(f, 2.6, 3.9, 2) * shake, z + 3.2 - 0.5 * k], target: [x * 0.6, 1.0, z - 3], fov: 42 + 3 * drums, up: [Math.sin(turn * 0.5), Math.cos(turn * 0.5), 0] },
    options: { alert: 1, sign: tunnelSign(F), drones: swarm(F, sync), post: { bgBlur: 0.02 + 0.02 * drums, focus: [0.5, 0.52], ca: 0.0016 + 0.002 * drums } },
    actors: [{ who: "juno", action: "ride", view: "front", hero: lean === 0 ? "front_left" : lean === 1 ? "front_right" : "front_mid", phase: lean, steady: 6, x, z }] };
}
export default { name: "wins_tunnel", start: startOf("tunnel"), frames: FRAMES, fps: FPS, cutOn: "bar", marks: [{ at: TROUBLE - CUT.tunnel, what: "the tunnel's screens say TROUBLE", on: "lyric", word: "trouble" }], sets: ["tunnel"], cast: CAST, frame };
