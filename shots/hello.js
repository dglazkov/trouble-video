// Hello: ten seconds of the cast on the demo song's first drop. `npm run hello` renders it; `npm run starter -- YOUR_SONG` writes its like for yours.
// Written by scripts/starter.mjs (node scripts/starter.mjs --write-demo) from scripts/starter_shot.txt. It is yours now: edit it.
//   node render.mjs shots/hello.js                      every frame, then out/hello.mp4 with the music under it
//   node render.mjs shots/hello.js --frames 0,30 --stills 0,30     two frames to look at, at full size
//   node engine/marks.mjs shots/hello.js                is every cut and hit on the music?
//   node engine/motion.mjs shots/hello.js               do the feet stay where they are planted?
// What it shows: two shots, cut on a bar line. (1) the cast run at a camera that backs away down the corridor, the
// swarm behind them; (2) the same run from the side, the corridor's wall cut away. One foot comes down on every beat.
// On the first kick of each bar a drone is blown out of the pack; on every kick the camera is jarred.
// Every number that comes from the music is in the block below, measured by analysis/song.py; nothing is by eye.
import { edit } from "../engine/edit.js";
import { sfx, sfxMark } from "../engine/sfx.js";
import { chase } from "../machines/drones.js";
import { CAST, STRIDE } from "../kits/cast.js";

// ---- the music (song frames: 24 a second from the start of the audio) --------------------------------------------------
const SONG = undefined;                       // the song's folder (engine/song.mjs); undefined: the demo song, audio.wav and analysis/
const START = 1247;                           // the clip's first frame: the bar line at 51.96 s
const CUTS = [0,119,239];                     // frames from START: each shot's first frame, and the end. All bar lines (6 bars of 39.9 frames)
const BEAT0 = 125, STEPS = 1;                 // the beat START is on (its number in listen.json); steps of the run to a beat (143.6 bpm: a beat is 10.0 frames)
const BLASTS = [0,40,80,119,159,199];         // frames from START of the first kick of each bar (the stem `kick`, measured from the drum stem; 24 kicks in the clip)
// ---- the picture --------------------------------------------------------------------------------------------------------
const FPS = 24, W = 960, H = 540;        // 960x540 renders about three times as fast as 1920x1080: a preview size
const LEAD = "juno";                      // whose feet are on the beat; the others keep up at their own cadence
// where each runs in the group: [across the corridor (m), behind the lead (m), where in their cycle they start].
// Apart both ways, so that no one is behind anyone from in front or from the side.
const PLACE = { juno: [1.1,0,0], tane: [-1.3,1.9,0.55], noor: [0.6,3.8,0.3], ife: [-0.7,5.7,0.8] };

// How far the lead has run by frame f of the clip, in cycles of the run (two steps): STEPS steps to a beat, counted
// from the song's own beats, so a foot comes down ON each beat however the tempo drifts.
const cycles = (f, sync) => { const b = sync.at(START + f).beat; return (b.index - BEAT0 + b.phase) * STEPS / 2; };
// ...and in metres: a cycle carries a runner one stride, so a planted foot stays where it was planted.
const ground = (f, sync) => STRIDE[LEAD] * cycles(f, sync);
// The run is eight drawings a cycle. All of them cover the same ground, so each is at the point of their OWN cycle that
// the ground they have covered puts them at (long legs turn over slower), and is shown the drawing for it until the next
// is due: two or three frames each. That is why these shots say `held: (f) => f`: the stage would otherwise hold every
// character's drawing on even frames ("on twos"), which suits a run of sixteen frames a cycle and no other.
const runners = (f, sync, view) => Object.entries(PLACE).map(([who, [x, back, ph]]) => {
  const z = ground(f, sync), drawing = Math.floor((ph + z / STRIDE[who]) * 8);
  return { who, action: "run", view, phase: (drawing + 0.5) / 8, drawing, x, z: z - back };      // `drawing` tells engine/motion.mjs which hold this is
});
// The swarm: a pack flying `gap` metres behind the lead. On each of BLASTS the nearest drone still flying is hit: it
// stays where it was hit and falls apart there (machines/drones.js `broken`: seconds since it was destroyed).
const pack = (f, sync, gap) => chase(START + f, sync, { n: 12, lead: [0.2, 2.0, ground(f, sync) - gap], spread: [3.8, 1.4, 11], seed: 3 });
function swarm(f, sync, gap) {
  const now = pack(f, sync, gap), order = now.map((d, i) => i).sort((a, b) => now[b].pos[2] - now[a].pos[2]);      // nearest the runners first
  const hits = [];
  BLASTS.forEach((b, j) => { if (f >= b) { const i = order[j % order.length]; now[i] = { ...pack(b, sync, gap)[i], broken: (f - b) / FPS }; hits.push({ at: now[i].pos, age: f - b, j }); } });
  return { drones: now, hits };
}
// The sound word for each blast, lettered by engine/sfx.js from the frame of the hit: over where the drone was hit, and
// high in the frame, clear of every head (a word across a face is the first thing a viewer sees wrong).
const boom = (g, cam, hits) => hits.forEach(({ at, age, j }) => sfx(g, { text: "ドーン", x: Math.min(W * 0.8, Math.max(W * 0.2, cam.project(at).x)), y: H * 0.16, size: H * 0.11, color: "alarm", age, seed: j }));
const jar = (f, sync) => sync.drive({ stem: "kick", mode: "pulse", decay: 0.1 }, START + f);      // 1 on a kick, dying away
const wob = (f, a, b, c) => Math.sin(f * a + c) * 0.6 + Math.sin(f * b + c * 2.3) * 0.4;

// Shot 1: a low camera a few metres ahead of them, backing away as fast as they come.
const front = {
  name: "hello_front", song: SONG, start: (START + CUTS[0]) / FPS, frames: CUTS[1] - CUTS[0], fps: FPS, width: W, height: H, sets: ["corridor"], cast: CAST, held: (f) => f,
  marks: BLASTS.filter((b) => b >= CUTS[0] && b < CUTS[1]).map((b) => sfxMark(b - CUTS[0], "ドーン", "a drone is blown out of the pack", "kick")),
  frame(l, sync) {
    const f = CUTS[0] + l, z = ground(f, sync), k = jar(f, sync), shake = 0.01 + 0.05 * k, { drones, hits } = swarm(f, sync, 8);
    return { set: "corridor",
      camera: { pos: [wob(f, 1.9, 3.1, 1) * shake, 0.4 + wob(f, 2.3, 3.7, 2) * shake, z + 3.7], target: [0, 1.08, z - 0.6], fov: 50 + 4 * k },
      // the corridor's own cues (sets/corridor.js lists them): the alarm, the shutters ahead held open, the machines
      options: { alert: 0.55 + 0.3 * k, doors: Object.fromEntries([-1, 0, 1, 2, 3].map((n) => [Math.floor(z / 24) + n, 0])), drones,
        post: { bgBlur: 0.012 + 0.02 * k, focus: [0.5, 0.55], ca: 0.0014 + 0.002 * k } },
      actors: runners(f, sync, "front"),
      overlay: (g, cam) => boom(g, cam, hits) };
  },
};
// Shot 2: side-on from their left (the side their side drawings were made from, so nothing is mirrored), that wall cut
// away (cut: "right"), the camera travelling with them.
const side = {
  name: "hello_side", song: SONG, start: (START + CUTS[1]) / FPS, frames: CUTS[2] - CUTS[1], fps: FPS, width: W, height: H, sets: ["corridor"], cast: CAST, held: (f) => f,
  cutOn: "bar",      // what this shot's first frame is on: engine/edit.js makes it a mark, engine/marks.mjs checks it
  marks: BLASTS.filter((b) => b >= CUTS[1] && b < CUTS[2]).map((b) => sfxMark(b - CUTS[1], "ドーン", "a drone is blown out of the pack", "kick")),
  frame(l, sync) {
    const f = CUTS[1] + l, z = ground(f, sync), k = jar(f, sync), { drones, hits } = swarm(f, sync, 8);
    return { set: "corridor",
      camera: { pos: [10.5, 1.5 + 0.04 * k, z - 5.2], target: [0, 1.25, z - 4.6], fov: 40 },
      options: { cut: "right", clearStruts: [z - 14, z + 8], alert: 0.55 + 0.3 * k, doors: Object.fromEntries([-1, 0, 1, 2].map((n) => [Math.floor(z / 24) + n, 0])), drones,
        post: { bgStreak: [0.006, 0], ca: 0.0012 + 0.002 * k } },
      actors: runners(f, sync, "side"),
      overlay: (g, cam) => boom(g, cam, hits) };
  },
};
export default edit("hello", [front, side]);
