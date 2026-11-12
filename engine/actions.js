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
//   tane ploughs forward upright, chest out, elbows wide, heavy on his feet, fists pumping from hip to chest;
//   ife scurries: short quick steps, leaning in, arms pumping high;
//   noor takes long unhurried strides, leaning into them, her arms low and loose but swinging: a lope, not a walk.
export const MANNER = {
  tane: { lean: 9, energy: 0.9, twist: 12, legOut: 9, bounce: 0.035, arm: { base: -10, swing: 50, out: 26, elbow: 84, pump: 16 } },
  ife: { lean: 19, energy: 0.72, twist: 20, knee: 0.85, bounce: 0.045, arm: { base: 4, swing: 46, out: 9, elbow: 104, pump: 14 } },
  noor: { lean: 20, energy: 1.1, twist: 14, bounce: 0.065, arm: { base: -8, swing: 36, out: 9, elbow: 62, pump: 12 } },
};
// How far the ground passes under one cycle of a character's run (for scrolling the set under them).
export const strideOf = (who, P) => runStride(P, MANNER[who]);

// Tane's charge, seen from his left: (0) dropping his left shoulder in mid-stride, low; (1) the impact: thrown
// forward off the ground, shoulder first, body near level, the right arm and both legs flung out behind.
const CHARGE = [
  pose({ lean: 34, twist: -38, pelvisTwist: 8, head: { yaw: 12, pitch: -18, roll: 0 },
    arm: { L: { swing: 30, out: 6, elbow: 118 }, R: { swing: -50, out: 16, elbow: 50 } },
    leg: { L: { swing: 58, out: 6, knee: 70, foot: -6 }, R: { swing: -30, out: 6, knee: 30, foot: 46 } } }),
  pose({ lean: 58, twist: -52, pelvisTwist: 10, lift: 0.28, head: { yaw: 18, pitch: -40, roll: 0 },
    arm: { L: { swing: 24, out: 4, elbow: 128 }, R: { swing: -84, out: 24, elbow: 14 } },
    leg: { L: { swing: 30, out: 8, knee: 92, foot: 40 }, R: { swing: -42, out: 10, knee: 18, foot: 66 } } }),
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

// Caught in the vault (the film's opening), each of the four in their own manner, four held drawings each:
// (0) frozen in the middle of a sneaking step; (1) started round as the shutters come down; (2) backing away, a step
// taken; (3) backed into the others, braced. A character with no manner of their own is caught as Juno is.
const leg = (swing, knee, out = 6, foot = 0) => ({ swing, knee, out, foot }), arm = (swing, out, elbow) => ({ swing, out, elbow });
const CAUGHT = {
  tane: [
    pose({ lean: -7, twist: -24, head: { yaw: -52, pitch: 0, roll: 5 }, arm: { L: arm(38, 18, 104), R: arm(30, 26, 112) }, leg: { L: leg(-16, 10, 6, 30), R: leg(64, 84, 8, 22) } }),
    pose({ lean: -4, twist: -8, head: { yaw: -30, pitch: -14, roll: -4 }, arm: { L: arm(18, 26, 92), R: arm(26, 30, 100) }, leg: { L: leg(7, 14, 15), R: leg(-7, 10, 15) } }),
    pose({ lean: -6, twist: 8, head: { yaw: 24, pitch: -10, roll: 3 }, arm: { L: arm(48, 20, 112), R: arm(30, 26, 120) }, leg: { L: leg(20, 20, 10), R: leg(-26, 30, 10, 30) } }),
    pose({ lean: 4, twist: 6, head: { yaw: 28, pitch: -8, roll: 4 }, arm: { L: arm(70, 24, 122), R: arm(44, 30, 126) }, leg: { L: leg(17, 24, 17), R: leg(-12, 22, 17) } }),
  ],
  ife: [
    pose({ lean: 14, twist: -20, head: { yaw: -60, pitch: -4, roll: -4 }, arm: { L: arm(30, 6, 136), R: arm(30, 6, 136) }, leg: { L: leg(42, 64, 5, 24), R: leg(-14, 14, 5, 28) } }),
    pose({ lean: 20, twist: -6, head: { yaw: -24, pitch: -16, roll: 6 }, arm: { L: arm(150, 22, 112), R: arm(150, 22, 112) }, leg: { L: leg(38, 62, 4), R: leg(34, 60, 4) } }),
    pose({ lean: 12, twist: 10, head: { yaw: 50, pitch: 2, roll: -6 }, arm: { L: arm(32, 5, 138), R: arm(32, 5, 138) }, leg: { L: leg(10, 30, 4), R: leg(-20, 30, 4, 25) } }),
    pose({ lean: 6, twist: 12, head: { yaw: 62, pitch: 6, roll: -8 }, arm: { L: arm(36, 4, 140), R: arm(36, 4, 140) }, leg: { L: leg(22, 44, 3), R: leg(22, 44, 3) } }),
  ],
  noor: [
    pose({ lean: 0, twist: -8, head: { yaw: -36, pitch: 2, roll: 0 }, arm: { L: arm(-6, 8, 28), R: arm(6, 9, 30) }, leg: { L: leg(-14, 8, 4, 18), R: leg(20, 16, 4, -6) } }),
    pose({ lean: -3, twist: -6, head: { yaw: -30, pitch: -24, roll: 4 }, arm: { L: arm(-4, 8, 28), R: arm(4, 9, 30) }, leg: { L: leg(-4, 2, 4), R: leg(5, 6, 6) } }),
    pose({ lean: -2, twist: -10, head: { yaw: -70, pitch: -8, roll: 3 }, arm: { L: arm(26, -4, 112), R: arm(24, -4, 116) }, leg: { L: leg(12, 10, 4), R: leg(-14, 44, 4, 10) } }),
    pose({ lean: -5, twist: -12, head: { yaw: -78, pitch: -12, roll: 5 }, arm: { L: arm(26, -4, 114), R: arm(24, -4, 118) }, leg: { L: leg(2, 2, 4), R: leg(9, 16, 7) } }),
  ],
  juno: [
    pose({ lean: 4, twist: -38, pelvisTwist: -10, head: { yaw: -66, pitch: 0, roll: 8 }, arm: { L: arm(20, 50, 62), R: arm(-14, 56, 72) }, leg: { L: leg(-20, 12, 6, 34), R: leg(52, 72, 8, 10) } }),
    pose({ lean: 2, twist: 24, head: { yaw: 30, pitch: -16, roll: -6 }, arm: { L: arm(150, 26, 14), R: arm(8, 14, 30) }, leg: { L: leg(8, 10, 12), R: leg(-8, 12, 12) } }),
    pose({ lean: 10, twist: -8, head: { yaw: -30, pitch: -14, roll: 4 }, arm: { L: arm(10, 60, 30), R: arm(20, 56, 40) }, leg: { L: leg(30, 50, 14), R: leg(-10, 40, 16, 20) } }),
    pose({ lean: 16, twist: -10, head: { yaw: -35, pitch: -18, roll: -6 }, arm: { L: arm(30, 70, 26), R: arm(40, 60, 60) }, leg: { L: leg(48, 78, 18), R: leg(20, 70, 20) } }),
  ],
};

// The gantry section's slide under the last blast door, seen from the left, feet first: (0) dropped into it, leaning
// back on one hand, the right leg out straight ahead and the left knee up; (1) flat out under the door, lying right
// back with the head down, both legs long.
const GANT_SLIDE = [
  pose({ lean: -44, twist: -12, head: { yaw: 0, pitch: 30, roll: 0 }, arm: { L: arm(58, 28, 74), R: arm(-34, 14, 12) }, leg: { L: leg(122, 104, 8, 6), R: leg(89, 5, 6, -38) } }),
  pose({ lean: -72, twist: -6, head: { yaw: 0, pitch: 44, roll: 0 }, arm: { L: arm(-30, 20, 100), R: arm(-66, 16, 16) }, leg: { L: leg(104, 34, 8, -20), R: leg(90, 3, 6, -44) } }),
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
  caught: { cels: 4, loop: false, half: false, loose: true, pose: (i, who) => (CAUGHT[who] ?? CAUGHT.juno)[i] },
  leap: { cels: 2, loop: false, half: false, loose: true, float: true, elev: 32, pose: (i) => LEAP[i] },
  gant_slide: { cels: 2, loop: false, half: false, loose: true, float: true, pose: (i) => GANT_SLIDE[i] },
};

// ---- the descent (shots/desc_*.js, song 19.9-29.8 s): down the stairwell, each of the four in their own way ---------
// Tane vaults the rails, flight to flight: (0) over a rail, one hand on it, body thrown level, knees tucked; (1) the
// drop: feet first, arms and coat flung up, looking where he will land; (2) the landing: a deep crouch, a fist down.
const DESC_VAULT = [
  pose({ lean: 72, twist: 8, lift: 0.5, head: { yaw: 0, pitch: -48, roll: 0 }, arm: { L: arm(4, 6, 6), R: arm(-70, 40, 30) }, leg: { L: leg(40, 112, 10, 30), R: leg(-52, 70, 14, 55) } }),
  pose({ lean: -10, lift: 0.3, head: { yaw: 0, pitch: 20, roll: 0 }, arm: { L: arm(160, 20, 25), R: arm(118, 30, 50) }, leg: { L: leg(55, 80, 14, 30), R: leg(-15, 60, 16, 45) } }),
  pose({ lean: 38, head: { yaw: 0, pitch: -38, roll: 0 }, arm: { L: arm(-55, 34, 50), R: arm(28, 8, 6) }, leg: { L: leg(100, 130, 24, 10), R: leg(80, 128, 26, 28) } }),
];
// Juno slides down the handrail on her feet, sideways on, as she rides her board: (0) crouched, arms out; (1) the
// hop from one flight's rail to the next, tucked, arms up; (2) the slide again, an arm thrown up, looking at us.
const DESC_SLIDE = [
  pose({ lean: 16, twist: -30, pelvisTwist: -16, head: { yaw: 10, pitch: -6, roll: 0 }, arm: { L: arm(30, 70, 20), R: arm(-30, 72, 28) }, leg: { L: leg(58, 38, 10, 25), R: leg(6, 82, 12, 20) } }),
  pose({ lean: 6, twist: 20, lift: 0.3, head: { yaw: -20, pitch: -10, roll: 0 }, arm: { L: arm(140, 30, 20), R: arm(100, 50, 40) }, leg: { L: leg(75, 105, 10), R: leg(55, 110, 14) } }),
  pose({ lean: 14, twist: -30, pelvisTwist: -16, head: { yaw: 55, pitch: -10, roll: 6 }, arm: { L: arm(34, 64, 24), R: arm(20, 150, 15) }, leg: { L: leg(58, 38, 10, 25), R: leg(6, 82, 12, 20) } }),
];
// Ife takes every single step: a patter of four drawings, one per frame (two steps): (0) the left foot down on the
// next tread, the right still on the one above; (1) the right knee coming through; (2), (3) the same on the other
// foot. She leans back from the drop, arms out for balance.
const DESC_STEP = [
  pose({ lean: -4, twist: 8, head: { yaw: 0, pitch: 14, roll: 0 }, arm: { L: arm(10, 55, 80), R: arm(-20, 60, 70) }, leg: { L: leg(22, 6, 5, -8), R: leg(20, 95, 5, 30) } }),
  pose({ lean: -2, twist: -4, head: { yaw: 0, pitch: 14, roll: 0 }, arm: { L: arm(-15, 62, 75), R: arm(15, 50, 85) }, leg: { L: leg(2, 22, 5, 0), R: leg(55, 88, 5, 10) } }),
];
const swapSides = (p) => pose({ ...p, twist: -p.twist, pelvisTwist: -p.pelvisTwist, head: { yaw: -p.head.yaw, pitch: p.head.pitch, roll: -p.head.roll }, arm: { L: p.arm.R, R: p.arm.L }, leg: { L: p.leg.R, R: p.leg.L } });
const DESC_STEPS = [DESC_STEP[0], DESC_STEP[1], swapSides(DESC_STEP[0]), swapSides(DESC_STEP[1])];
// Noor takes the lift: (0) in the cage, arms folded; (1) one step out of it, eyes still on their nails; (2) waiting,
// weight on one leg, a hand on the hip, examining the nails of the other.
const DESC_WAIT = [
  pose({ lean: -2, twist: -4, head: { yaw: 0, pitch: 5, roll: -3 }, arm: { L: arm(30, -4, 112), R: arm(30, -4, 112) }, leg: { L: leg(-2, 1, 3), R: leg(10, 16, 8, 4) } }),
  pose({ lean: 2, head: { yaw: -8, pitch: 10, roll: 0 }, arm: { L: arm(-12, 8, 14), R: arm(40, 2, 126) }, leg: { L: leg(-20, 12, 4, 20), R: leg(26, 5, 4, -12) } }),
  pose({ lean: -3, twist: -6, head: { yaw: -10, pitch: 12, roll: 4 }, arm: { L: arm(-12, 24, 62), R: arm(40, 2, 128) }, leg: { L: leg(-1, 1, 4), R: leg(6, 12, 9, 3) } }),
];
// The other three arrive in a heap: (0) still in the air (Ife's is drawn: she comes down last, on top); (1) landed:
// Tane flat on his front, chin up; Juno sitting on him, leaning back on her hands; Ife sitting on top, seeing stars.
const DESC_HEAP = {
  tane: [DESC_VAULT[1], pose({ lean: 84, head: { yaw: 50, pitch: -58, roll: 0 }, arm: { L: arm(100, 40, 40), R: arm(80, 50, 70) }, leg: { L: leg(-86, 4, 12, 60), R: leg(-84, 75, 14, 30) } })],
  juno: [DESC_SLIDE[1], pose({ lean: -14, twist: 12, head: { yaw: 14, pitch: -16, roll: 0 }, arm: { L: arm(-38, 22, 8), R: arm(-28, 26, 14) }, leg: { L: leg(84, 84, 14, -10), R: leg(74, 60, 22, -5) } })],
  ife: [pose({ lean: 30, lift: 0.3, head: { yaw: 0, pitch: -20, roll: 0 }, arm: { L: arm(150, 40, 30), R: arm(110, 60, 50) }, leg: { L: leg(70, 60, 20), R: leg(10, 100, 20) } }),
    pose({ lean: 10, head: { yaw: 0, pitch: 6, roll: 16 }, arm: { L: arm(30, 10, 40), R: arm(22, 16, 46) }, leg: { L: leg(82, 86, 20, 0), R: leg(80, 80, 24, 0) } })],
};
Object.assign(ACTIONS, {
  desc_vault: { cels: 3, loop: false, half: false, loose: true, float: true, pose: (i) => DESC_VAULT[i] },
  desc_slide: { cels: 3, loop: false, half: false, loose: true, float: true, pose: (i) => DESC_SLIDE[i] },
  desc_steps: { cels: 4, loop: true, half: true, loose: true, float: true, pose: (i) => DESC_STEPS[i] },
  desc_wait: { cels: 3, loop: false, half: false, loose: true, pose: (i) => DESC_WAIT[i] },
  desc_cage: { cels: 3, loop: false, half: false, loose: true, float: true, pose: (i) => DESC_WAIT[i] },      // the same drawings while the cage carries them: its floor is the shot's, not the set's
  desc_heap: { cels: 2, loop: false, half: false, loose: true, float: true, pose: (i, who) => (DESC_HEAP[who] ?? DESC_HEAP.juno)[i] },
});

// ---- the two wins (shots/wins_*.js, song 62.0-78.46 s) ---------------------------------------------------------------
// Tane's fight at the dead end, one drawing each (all HERO drawings: each is painted for its shot's own camera):
// (0) cornered: square to them, fists down, chin down; (1) his foot comes down on the end of a pipe, the hand out for
// it; (2) the wind-up: the pipe cocked back over his right shoulder in both hands, chest turned away; (3) contact: the
// arms long, the pipe through the ball; (4) the follow-through: the pipe round over his left shoulder, the back heel
// up; (5) ready: the pipe low in his right hand, looking up, the left hand open; (6) the catch: the left arm thrown
// up, the fist shut on a tail; (7) holding it out at arm's length, looking past it; (8) the coil: that fist drawn back
// over his shoulder; (9) the slam: the arm whipped down and through, a lunge; (10) straightening, the pipe swinging
// up; (11) the pipe on his shoulder, weight on one leg.
const WINS_TANE = [
  pose({ lean: 5, head: { yaw: 0, pitch: 10, roll: 0 }, arm: { L: arm(8, 24, 52), R: arm(8, 26, 48) }, leg: { L: leg(6, 8, 15), R: leg(-6, 8, 15) } }),
  pose({ lean: 10, twist: -8, head: { yaw: 0, pitch: 16, roll: 0 }, arm: { L: arm(-18, 18, 60), R: arm(34, 46, 30) }, leg: { L: leg(-18, 16, 8, 10), R: leg(34, 22, 10, -4) } }),
  pose({ lean: -6, twist: -52, pelvisTwist: -16, head: { yaw: 34, pitch: 4, roll: 0 }, arm: { L: arm(64, -24, 104), R: arm(-24, 30, 124) }, leg: { L: leg(30, 26, 12), R: leg(-26, 30, 12, 10) } }),
  pose({ lean: 14, twist: 30, pelvisTwist: 12, head: { yaw: -18, pitch: -4, roll: 0 }, arm: { L: arm(78, 10, 18), R: arm(84, -12, 14) }, leg: { L: leg(36, 40, 10), R: leg(-36, 10, 10, 34) } }),
  pose({ lean: -8, twist: 68, pelvisTwist: 26, head: { yaw: -44, pitch: -16, roll: 0 }, arm: { L: arm(112, 40, 112), R: arm(124, -40, 84) }, leg: { L: leg(20, 5, 10), R: leg(-30, 46, 10, 52) } }),
  pose({ lean: -4, twist: 10, head: { yaw: -6, pitch: -22, roll: 0 }, arm: { L: arm(40, 30, 70), R: arm(-16, 22, 26) }, leg: { L: leg(18, 14, 12), R: leg(-16, 16, 12, 8) } }),
  pose({ lean: -12, twist: 16, head: { yaw: -8, pitch: -28, roll: 0 }, arm: { L: arm(142, 14, 8), R: arm(-26, 22, 24) }, leg: { L: leg(28, 22, 12), R: leg(-22, 22, 12, 12) } }),
  pose({ lean: -6, twist: 8, head: { yaw: -20, pitch: 0, roll: 4 }, arm: { L: arm(96, 8, 8), R: arm(-10, 24, 40) }, leg: { L: leg(22, 12, 12), R: leg(-16, 14, 12, 6) } }),
  pose({ lean: -16, twist: 44, pelvisTwist: 14, head: { yaw: -40, pitch: 0, roll: 0 }, arm: { L: arm(168, 30, 76), R: arm(34, 30, 44) }, leg: { L: leg(16, 30, 12), R: leg(-32, 36, 12, 20) } }),
  pose({ lean: 36, twist: -44, pelvisTwist: -10, head: { yaw: 30, pitch: -24, roll: 0 }, arm: { L: arm(58, 6, 6), R: arm(-72, 30, 12) }, leg: { L: leg(-34, 16, 10, 40), R: leg(56, 62, 10) } }),
  pose({ lean: 10, twist: -12, head: { yaw: 10, pitch: 6, roll: 0 }, arm: { L: arm(4, 22, 30), R: arm(26, 22, 50) }, leg: { L: leg(-12, 14, 10, 8), R: leg(22, 26, 10) } }),
  pose({ lean: -5, twist: -10, head: { yaw: 16, pitch: -4, roll: 4 }, arm: { L: arm(-6, 30, 78), R: arm(42, 26, 142) }, leg: { L: leg(-3, 2, 6), R: leg(12, 18, 12, 4) } }),
];
// Juno's: (0) the landing: a deep crouch on the board, a hand down; (1) the skid: the board broadside, her whole
// body thrown back against it, arms wide; (2) stopped, standing easy on it, a hand on her hip, looking back over her
// left shoulder; (3) dropping: folded right down over the board's nose, hands going to its edges; (4) flat: lying
// on the board on her front, chin up, hands on the nose, legs long behind (the board is under her chest: it is not
// the mannequin's); (5) sitting on the grounded board, leaning back on a hand, twisted to look behind her; (6) the
// same seat, a hand up at her goggles, pulling them down; (7) a two-fingered salute thrown back over her shoulder.
const WINS_JUNO = [
  pose({ lean: 34, board: 1, twist: -20, pelvisTwist: -10, head: { yaw: 8, pitch: -12, roll: 0 }, arm: { L: arm(-30, 70, 30), R: arm(24, 18, 8) }, leg: { L: leg(96, 120, 16), R: leg(70, 126, 16) } }),
  pose({ lean: 8, board: 1, roll: 30, twist: 10, head: { yaw: 22, pitch: -4, roll: 0 }, arm: { L: arm(10, 82, 20), R: arm(10, 62, 30) }, leg: { L: leg(42, 50, 14), R: leg(4, 56, 14) } }),
  pose({ lean: 4, board: 1, roll: 6, twist: 14, head: { yaw: 70, pitch: -4, roll: 4 }, arm: { L: arm(-8, 20, 20), R: arm(-10, 36, 84) }, leg: { L: leg(32, 28, 12), R: leg(0, 30, 12) } }),
  pose({ lean: 54, board: 1, twist: -10, head: { yaw: 0, pitch: -30, roll: 0 }, arm: { L: arm(62, 12, 30), R: arm(42, 12, 40) }, leg: { L: leg(108, 128, 14), R: leg(86, 132, 14) } }),
  pose({ lean: 86, lift: 0.16, head: { yaw: 0, pitch: 14, roll: 0 }, arm: { L: arm(96, 14, 60), R: arm(96, 14, 60) }, leg: { L: leg(-86, 3, 5, 172), R: leg(-88, 6, 5, 172) } }),
  pose({ lean: -16, lift: 0.1, twist: -34, head: { yaw: -62, pitch: -4, roll: 0 }, arm: { L: arm(-36, 26, 10), R: arm(58, 8, 44) }, leg: { L: leg(82, 88, 14, -8), R: leg(70, 58, 20, -4) } }),
  pose({ lean: -6, lift: 0.1, twist: -4, head: { yaw: 0, pitch: 4, roll: 0 }, arm: { L: arm(-30, 24, 12), R: arm(104, 30, 138) }, leg: { L: leg(82, 88, 14, -8), R: leg(70, 58, 20, -4) } }),
  pose({ lean: -10, lift: 0.1, twist: -8, head: { yaw: 0, pitch: -6, roll: -4 }, arm: { L: arm(-30, 24, 12), R: arm(120, 62, 96) }, leg: { L: leg(82, 88, 14, -8), R: leg(70, 58, 20, -4) } }),
];
Object.assign(ACTIONS, {
  wins_tane: { cels: WINS_TANE.length, loop: false, half: false, loose: true, float: true, pose: (i) => WINS_TANE[i] },
  wins_juno: { cels: WINS_JUNO.length, loop: false, half: false, loose: true, float: true, pose: (i) => WINS_JUNO[i] },
});

// ---- the core (shots/core_*.js, song 78.9-92.9 s): Noor crosses the station's weightless core -----------------------
// Adrift: upright, a little laid back, hands in the coat's pockets, the feet hanging with the toes down, one knee
// loose. The body does not move: the action's four drawings are four moments of one slow billow of the hair and the
// coat (shots/core_cast.js plays them there and back).
const CORE_DRIFT = pose({ lean: -7, twist: -4, head: { yaw: 0, pitch: 7, roll: -3 }, arm: { L: arm(-12, 11, 46), R: arm(-14, 10, 42) }, leg: { L: leg(7, 8, 4, 40), R: leg(-5, 28, 5, 48) } });
// At the duct's lip: (0) standing, hands in pockets, looking out; (1) the step off it, into nothing.
const CORE_STEP = [
  pose({ lean: -1, twist: 3, head: { yaw: 0, pitch: -3, roll: 2 }, arm: { L: arm(-12, 11, 46), R: arm(-14, 10, 42) }, leg: { L: leg(-2, 1, 3), R: leg(-1, 8, 8, 4) } }),
  pose({ lean: 3, twist: -5, head: { yaw: 0, pitch: 2, roll: 0 }, arm: { L: arm(-12, 11, 46), R: arm(-14, 10, 42) }, leg: { L: leg(36, 10, 4, 14), R: leg(-6, 8, 4, 10) } }),
];
// Coming down on the island, where there is weight again: (0) a foot reaching down for the deck, still adrift; (1) it
// is down, the other leg trailing, its toe just off the deck; (2) standing on it, weight on that leg.
const CORE_LAND = [
  pose({ lean: -4, twist: -4, head: { yaw: 0, pitch: 7, roll: -3 }, arm: { L: arm(-12, 11, 46), R: arm(-14, 10, 42) }, leg: { L: leg(22, 5, 4, 34), R: leg(-8, 40, 5, 52) } }),
  pose({ lean: 2, twist: -3, head: { yaw: 0, pitch: 6, roll: -2 }, arm: { L: arm(-12, 11, 46), R: arm(-14, 10, 42) }, leg: { L: leg(19, 13, 4, -3), R: leg(-17, 44, 5, 42) } }),
  pose({ lean: 0, twist: 2, head: { yaw: 0, pitch: 5, roll: 0 }, arm: { L: arm(-12, 11, 46), R: arm(-14, 10, 42) }, leg: { L: leg(5, 3, 4, 0), R: leg(-9, 13, 6, 20) } }),
];
Object.assign(ACTIONS, {
  core_drift: { cels: 4, loop: true, half: false, loose: true, float: true, pose: () => CORE_DRIFT },
  core_step: { cels: 2, loop: false, half: false, loose: true, pose: (i) => CORE_STEP[i] },
  core_land: { cels: 3, loop: false, half: false, loose: true, pose: (i) => CORE_LAND[i] },
});

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
