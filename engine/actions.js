// What a character can be drawn doing. An action is a fixed, small set of poses; a kit holds one whole drawing
// (a cel) per pose per view, painted over these very poses, so the pose a shot asks for and the drawing shown for it
// are the same thing by construction. A shot names the action and how far through it the character is.
import { pose, runPose, RUN_KEYS } from "./body.js";

// Standing at ease: weight on her left leg, the right leg loose with its knee forward and the foot turned out, the
// chest turned a little against the hips, both arms hanging slack (not quite alike), head a little to one side.
const AT_EASE = pose({ lean: -1.5, twist: -6, pelvisTwist: 5,
  head: { yaw: 10, pitch: 2, roll: -3 },
  arm: { L: { swing: 5, out: 9, elbow: 14 }, R: { swing: -3, out: 7, elbow: 24 } },
  leg: { L: { swing: -3, out: 3, knee: 1 }, R: { swing: 12, out: 9, knee: 20, foot: 5 } } });

// cels: how many drawings; pose(i): the pose of drawing i; loop: the drawings repeat;
// loose: a held drawing whose stance is the layout's but whose arms and feet may settle as the painter draws a
// person standing (the kit's checks then hold it to the stance, the place and the design, not to each limb);
// half: the action's second half is its first with left and right exchanged, so a mirrored drawing shows the pose
// half the action on (a run seen from the other side).
export const ACTIONS = {
  run: { cels: RUN_KEYS, loop: true, half: true, pose: (i) => runPose(i / RUN_KEYS) },
  idle: { cels: 1, loop: true, half: false, loose: true, pose: () => AT_EASE },
};

// Which drawing of an action a phase (0..1 through the action) is on.
export function celIndex(action, phase = 0) {
  const A = ACTIONS[action], n = A.cels, i = Math.floor(phase * n + 1e-9);
  return A.loop ? ((i % n) + n) % n : Math.min(n - 1, Math.max(0, i));
}
// The pose of an actor as a shot states it: { action, phase, yaw, x, z }.
export function actorPose(a) {
  const A = ACTIONS[a.action];
  if (!A) throw new Error(`no such action: ${a.action}`);
  return { ...A.pose(celIndex(a.action, a.phase)), yaw: a.yaw ?? 0, x: a.x ?? 0, z: a.z ?? 0 };
}
// The drawing that shows cel i when its view is mirrored.
export const mirrored = (action, i) => { const A = ACTIONS[action]; return A.half ? (i + A.cels / 2) % A.cels : i; };
