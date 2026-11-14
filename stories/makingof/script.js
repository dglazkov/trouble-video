// The making-of's timing: when each entry of ledger.json is on screen. Every frame here is read from chapters.json (the
// bar lines, kicks and sung words of stories/makingof/audio.wav as arranged), so a re-arranged song moves the picture with
// it. A cue is { id, a, b } (on from frame a until frame b); `on` holds its first frame to the music as a mark
// (engine/marks.mjs): "bar", "beat", "kick" or "lyric" (with `word`). An id may end "#n" where one entry is shown more
// than once. chapters.js draws them; check.mjs proofreads them; review.mjs lists them.
import { setCues, bar as B, beat, chap, CUE } from "./lib.js";

const E = (n) => chap(n).endFrame, W2 = CUE.prompt.words, HOLE = CUE.pivot, WOW = CUE.wow, K7 = chap(7).kickFrames;
const c = (id, a, b, on, more) => ({ id, a, b, on, ...more });

const list = [
  // 2 The prompt: black, a terminal; his first message is typed over the lone voice
  c("card2", B(2, 0), B(2, 1), "bar"),
  c("p_date", B(2, 1), E(2)),
  c("p_first", W2[0].frame, E(2), "lyric", { word: W2[0].word }),
  c("p_anime", beat(2, 4, 1), E(2), "beat"),
  c("p_claim", beat(2, 5, 3), E(2), "beat"),
  c("p_push", beat(2, 7, 3), E(2), "beat"),

  // 3 The tools
  c("card3", B(3, 0), B(3, 1), "bar"),
  c("t_noblender", B(3, 1), B(3, 4), "bar"),
  c("t_headless", B(3, 3), B(3, 4), "bar"),
  c("t_lab_web", B(3, 4), B(3, 12)), c("t_lab_blender", B(3, 4), B(3, 12)),
  c("t_bakeoff", B(3, 4), B(3, 6), "bar"),
  c("t_vision", B(3, 6), B(3, 9), "bar"),
  c("t_speed_web", B(3, 9), B(3, 12), "bar"), c("t_speed_blender", B(3, 9), B(3, 12)), c("t_speed_note", B(3, 9), B(3, 12)),
  c("t_verdict", B(3, 10), B(3, 12), "bar"),
  c("t_unique", B(3, 12), B(3, 14), "bar"),
  c("t_answer", B(3, 14), E(3), "bar"),

  // 4 The first face
  c("card4", B(4, 0), B(4, 1), "bar"),
  c("f_trace", B(4, 1), B(4, 4), "bar"),
  c("f_face", B(4, 3), B(4, 4), "bar"),
  c("f_closeup", B(4, 4), B(4, 5), "bar"),
  c("f_body", B(4, 5), B(4, 7), "bar"),
  c("f_oops", B(4, 7), E(4), "bar"),

  // 5 The pivot: the puppet judged small, then at full size; his line in the music's hole; the restart
  c("card5", B(5, 0), B(5, 1), "bar"),
  c("v_kit", B(5, 1), B(5, 3)), c("v_holds", B(5, 1), B(5, 3), "bar"),
  c("v_seams", B(5, 3), B(5, 4), "bar"),
  c("v_horror", B(5, 4), HOLE.restartHit.frame, "bar"),
  c("v_unit", HOLE.restartHit.frame, B(5, 8), "kick"),
  c("v_whole", B(5, 8), B(5, 10), "bar"),
  c("v_better", B(5, 11), B(5, 13), "bar"),

  // 6 The cast
  c("card6", B(6, 0), B(6, 1), "bar"),
  c("c_brief", B(6, 1), B(6, 5), "bar"), c("c_split", beat(6, 3, 2), B(6, 5), "beat"),
  c("c_v1", B(6, 5), beat(6, 6, 1), "bar"),
  c("c_names", beat(6, 6, 1), beat(6, 8, 1), "beat"), ...["tane", "ife", "noor", "juno"].map((k) => c("c_n_" + k, beat(6, 6, 1), beat(6, 8, 1))),
  c("c_fatter", beat(6, 8, 1), B(6, 11), "beat"),
  c("c_pick", beat(6, 9, 3), B(6, 11), "beat"), c("c_pick_his", beat(6, 9, 3), B(6, 11)), c("c_pick_claude", beat(6, 9, 3), B(6, 11)),
  c("c_became", B(6, 11), B(6, 16)),
  c("c_mystery", B(6, 11), beat(6, 12, 2), "bar"),
  c("c_machines", beat(6, 12, 2), B(6, 14), "beat"),
  c("c_fall", B(6, 14), B(6, 16), "bar"),
  c("c_tripwire", B(6, 16), B(6, 19), "bar"), c("c_slice", B(6, 17), B(6, 19), "bar"),
  c("c_sleep", B(6, 19), E(6), "bar"),

  // 7 "Wow": the held breath, the drop, the slice; his review in the gap in the kicks; the night, plainly
  c("w_clock", chap(7).startFrame, WOW.drop.frame),
  c("w_slice", WOW.drop.frame + 40, WOW.drop.frame + 130),
  c("w_wow", WOW.hookInKickGap[0].frame, K7[31], "lyric", { word: WOW.hookInKickGap[0].word }),
  c("w_first", K7[31], B(7, 14)), c("w_night", K7[31], B(7, 14), "kick"),
  c("w_go", B(7, 14), E(7), "bar"),

  // 8 Building the rest: the film's map filling in the order it was built; the method; rejections; approvals
  c("card8", B(8, 0), B(8, 1), "bar"),
  c("b_togo", B(8, 1), beat(8, 2, 2), "bar"), c("b_cook", beat(8, 2, 2), B(8, 4), "beat"),
  c("b_s_open", B(8, 4), B(8, 5), "bar"),
  c("b_s_descent", B(8, 5), B(8, 7), "bar"), c("b_s_gantry", B(8, 5), B(8, 7)),
  c("b_s_wins", B(8, 7), B(8, 8), "bar"),
  c("b_s_boom", B(8, 8), B(8, 10), "bar"), c("b_s_core", B(8, 8), B(8, 10)),
  c("b_s_breakdown", B(8, 10), B(8, 12), "bar"), c("b_s_fall", B(8, 10), B(8, 12)), c("b_s_reunion", B(8, 10), B(8, 12)), c("b_peak", B(8, 10), B(8, 12)),
  c("b_m1", B(8, 12), beat(8, 13, 2), "bar"), c("b_m1_beat", B(8, 12), beat(8, 13, 2)), c("b_m1_kick", B(8, 12), beat(8, 13, 2)), c("b_m1_drop", B(8, 12), beat(8, 13, 2)),
  c("b_m2", beat(8, 13, 2), B(8, 15), "beat"),
  c("b_rej1", B(8, 15), B(8, 16), "bar"), c("b_rej2", B(8, 16), B(8, 17), "bar"), c("b_rejcount", B(8, 15), B(8, 17)),
  ...["a_love", "a_lgtm", "a_y", "a_core", "a_beautiful"].map((id, i) => c(id, beat(8, 17, i), B(8, 19), "beat")),
  c("card9", B(8, 19), E(8), "bar"),

  // 9 The human eye: eight notes, each a bar of the fault and a bar of the fix
  ...["h_crowd", "h_kick", "h_face", "h_shades", "h_plug", "h_door", "h_boss", "h_noor"].flatMap((id, i) => {
    const a = B(9, 2 * i), fix = B(9, 2 * i + 1), b = i < 7 ? B(9, 2 * i + 2) : E(9), shot = ["h_face", "h_shades", "h_plug", "h_door", "h_noor"].includes(id);
    return [c(id, a, b, "bar"), c(`${shot ? "h_his" : "h_was"}#${i}`, a, fix), c(`h_fixed#${i}`, fix, b, "bar"), ...(id === "h_door" ? [c("h_hole", fix, b)] : [])];
  }),

  // 10 Who did what: the tally comes to the middle; five numbers
  c("card10", B(10, 0), B(10, 2), "bar"), c("n_shown", B(10, 0), B(10, 2)),
  c("n_hours", B(10, 2), B(10, 3), "bar"),
  c("n_words", B(10, 3), B(10, 5), "bar"),
  c("n_drawings", B(10, 5), beat(10, 6, 2), "bar"),
  c("n_agents", beat(10, 6, 2), beat(10, 7, 1), "beat"),
  c("n_frames", beat(10, 7, 1), E(10), "beat"),

  // 11 Fork it: on the song's last kick; the film's sign-off on the string peak; black by the last sound
  c("k_fork", chap(11).startFrame, B(11, 3), "kick"), c("k_url", chap(11).startFrame, B(11, 3)),
  c("k_cmd", B(11, 1), B(11, 3), "bar"), c("k_clip", B(11, 1), B(11, 3)),
  ...["k_cr1", "k_cr2", "k_cr3", "k_cr4", "k_cr5", "k_lic1", "k_lic2", "k_lic3"].map((id, i) => c(id, B(11, 3), CUE.forkIt.lastAudible40dB.frame - 16, i ? undefined : "bar")),
  c("k_end", CUE.forkIt.stringPeak.frame, CUE.forkIt.lastAudible40dB.frame - 16),
];
export const CUES = setCues(list);
// The frames the picture holds to the music beyond the cues' own: the cuts inside chapters (chapters.js reads these too).
export const MARKS = CUES.filter((q) => q.on).map((q) => ({ at: q.a, what: `${q.id}: “${q.text.slice(0, 40)}”`, on: q.on, ...(q.word ? { word: q.word } : {}) }));
