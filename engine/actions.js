// What a character can be drawn doing. An action is a fixed, small set of poses; a kit holds one whole drawing
// (a cel) per pose per view, painted over these very poses, so the pose a shot asks for and the drawing shown for it
// are the same thing by construction. A shot names the action and how far through it the character is:
//   { who, action, phase, yaw, x, z, y }      y: how high off the ground the whole figure is (a leap's arc)
import { pose, runPose, runStride, RUN_KEYS } from "./body.js";

// Standing at ease: weight on her left leg, the right leg loose with its knee forward and the foot turned out, the
// chest turned a little against the hips, both arms hanging slack (not quite alike), head a little to one side.
const AT_EASE = pose({ lean: -1.5, twist: -6, pelvisTwist: 5,
  head: { yaw: 10, pitch: 2, roll: -3 },
  arm: { L: { swing: 5, out: 9, elbow: 14 }, R: { swing: -3, out: 7, elbow: 24 } },
  leg: { L: { swing: -3, out: 3, knee: 1 }, R: { swing: 12, out: 9, knee: 20, foot: 5 } } });

// Each of the cast runs in their own manner (body.js runPose says what the numbers are). Whoever is not named
// runs as Juno does: the athletic run the first kit was painted over.
//   tane ploughs forward upright, chest out, elbows wide, heavy on his feet;
//   ife scurries: short quick steps, leaning in, arms pumping high;
//   noor takes long unhurried strides, upright, arms hanging and barely moving.
export const MANNER = {
  tane: { lean: 9, energy: 0.9, twist: 12, legOut: 9, bounce: 0.035, arm: { base: -4, swing: 30, out: 26, elbow: 80, pump: 8 } },
  ife: { lean: 19, energy: 0.72, twist: 20, knee: 0.85, bounce: 0.045, arm: { base: 4, swing: 46, out: 9, elbow: 104, pump: 14 } },
  noor: { lean: 7, energy: 1.06, twist: 7, bounce: 0.04, arm: { base: -6, swing: 13, out: 7, elbow: 22, pump: 6 } },
};
// How far the ground passes under one cycle of a character's run (for scrolling the set under them).
export const strideOf = (who, P) => runStride(P, MANNER[who]);

// Tane's charge, seen from his left: (0) dropping his left shoulder in mid-stride, (1) the impact, shoulder first,
// off the ground, the right arm and leg flung out behind.
const CHARGE = [
  pose({ lean: 30, twist: -34, pelvisTwist: 8, head: { yaw: 10, pitch: -16, roll: 0 },
    arm: { L: { swing: 26, out: 8, elbow: 112 }, R: { swing: -46, out: 16, elbow: 48 } },
    leg: { L: { swing: 52, out: 6, knee: 58, foot: -6 }, R: { swing: -34, out: 6, knee: 26, foot: 44 } } }),
  pose({ lean: 40, twist: -48, pelvisTwist: 10, lift: 0.07, head: { yaw: 16, pitch: -24, roll: 0 },
    arm: { L: { swing: 8, out: 4, elbow: 124 }, R: { swing: -68, out: 22, elbow: 22 } },
    leg: { L: { swing: 64, out: 6, knee: 96, foot: 10 }, R: { swing: -48, out: 8, knee: 30, foot: 62 } } }),
];
// Juno on the board, left foot forward, knees bent, arms out for balance: banked to her left, level, to her right.
const RIDE = [18, 0, -18].map((roll) => pose({ lean: 20, roll, board: 1, lift: 0.2, twist: -22 - roll * 0.4, pelvisTwist: -14,
  head: { yaw: 8 + roll * 0.5, pitch: -12, roll: roll * 0.3 },
  arm: { L: { swing: 18, out: 62 + roll, elbow: 28 }, R: { swing: -22, out: 66 - roll, elbow: 34 } },
  leg: { L: { swing: 52, out: 12, knee: 64, foot: -2 }, R: { swing: 16, out: 14, knee: 64, foot: 2 } } }));
// Her leap: (0) launching, the board's nose up under her front foot, arms swinging up; (1) the apex: tucked, the
// right hand down on the board's edge, the left arm thrown up.
const LEAP = [
  pose({ lean: 12, board: 1, twist: -16, pelvisTwist: -10, head: { yaw: 6, pitch: 10, roll: 0 },
    arm: { L: { swing: 64, out: 46, elbow: 30 }, R: { swing: -30, out: 52, elbow: 30 } },
    leg: { L: { swing: 74, out: 12, knee: 78, foot: -22 }, R: { swing: 6, out: 12, knee: 36, foot: -22 } } }),
  pose({ lean: 30, board: 1, twist: -20, pelvisTwist: -8, head: { yaw: 6, pitch: -6, roll: 0 },
    arm: { L: { swing: 150, out: 34, elbow: 16 }, R: { swing: 30, out: 14, elbow: 8 } },
    leg: { L: { swing: 104, out: 16, knee: 112, foot: -6 }, R: { swing: 78, out: 16, knee: 118, foot: -6 } } }),
];

// cels: how many drawings; pose(i, who): the pose of drawing i (who: the character, for those with a manner);
// loop: the drawings repeat;
// loose: a held drawing whose stance is the layout's but whose arms and feet may settle as the painter draws a
// person (the kit's checks then hold it to the stance, the place and the design, not to each limb);
// half: the action's second half is its first with left and right exchanged, so a mirrored drawing shows the pose
// half the action on (a run seen from the other side);
// flip: which drawing shows cel i when the view is mirrored, where that is neither i nor half the action on (a
// rider leaning left, mirrored, leans right);
// float: the drawing does not stand on its lowest painted row (a prop is under the feet, or the view is from
// above): it is registered by where the figure fits its mannequin, not by its feet;
// elev: the height in degrees the drawing is seen from, where that is not a camera at about eye level.
export const ACTIONS = {
  run: { cels: RUN_KEYS, loop: true, half: true, pose: (i, who) => runPose(i / RUN_KEYS, MANNER[who]) },
  idle: { cels: 1, loop: true, half: false, loose: true, pose: () => AT_EASE },
  runtop: { cels: 4, loop: true, half: true, float: true, pose: (i, who) => runPose(i / 4, MANNER[who]) },
  charge: { cels: 2, loop: false, half: false, loose: true, pose: (i) => CHARGE[i] },
  ride: { cels: 3, loop: false, half: false, loose: true, float: true, flip: [2, 1, 0], elev: 14, pose: (i) => RIDE[i] },
  leap: { cels: 2, loop: false, half: false, loose: true, float: true, elev: 32, pose: (i) => LEAP[i] },
};

// Which drawing of an action a phase (0..1 through the action) is on. A held action of n drawings splits the phase
// into n equal parts (ride: below 1/3 leaning left, to 2/3 centred, then leaning right; 0, 0.5 and 1 pick them).
export function celIndex(action, phase = 0) {
  const A = ACTIONS[action], n = A.cels, i = Math.floor(phase * n + 1e-9);
  return A.loop ? ((i % n) + n) % n : Math.min(n - 1, Math.max(0, i));
}
// The pose of an actor as a shot states it: { who, action, phase, yaw, x, z, y }.
export function actorPose(a) {
  const A = ACTIONS[a.action];
  if (!A) throw new Error(`no such action: ${a.action}`);
  return { ...A.pose(celIndex(a.action, a.phase), a.who), yaw: a.yaw ?? 0, x: a.x ?? 0, z: a.z ?? 0, y: a.y ?? 0 };
}
// The drawing that shows cel i when its view is mirrored.
export const mirrored = (action, i) => { const A = ACTIONS[action]; return A.flip ? A.flip[i] : A.half ? (i + A.cels / 2) % A.cels : i; };
