// A first clip, in a minute or two: the cast running through the corridor on the beat of a song, drones blown out of
// the pack on its kicks, cut on its bar lines.
//   node scripts/starter.mjs                       the demo song -> renders shots/hello.js to out/hello.mp4     (npm run hello)
//   node scripts/starter.mjs MY_SONG.mp3           your song: measures it into stories/my_song/ (analysis/song.py),
//                                                  writes stories/my_song/starter.js, renders out/my_song.mp4  (npm run starter -- MY_SONG.mp3)
// Options:
//   --name NAME        the story's folder under stories/ and the clip's name (default: from the audio file's name)
//   --stems DIR        a folder of stems of the song (one audio file per instrument): the kick is then measured from
//                      the drum stem instead of estimated from the mix (analysis/song.py says what else changes)
//   --from SECONDS     where in the song the clip starts (moved to the nearest bar line). Default: the stretch with the most kicks
//   --seconds N        about how long (default 10; it is cut to whole bars)
//   --lead WHO         whose feet land on the beat (default juno);  --cast a,b,c   who runs (default tane,juno,noor,ife)
//   --full             1920x1080 instead of the 960x540 preview (about three times slower)
//   --force            write the shot file again over one that exists (it is otherwise left alone: it is yours)
//   --no-render        measure and write, do not render;  --software   no GPU (render.mjs --software)
// The shot file it writes is the example to grow a film from: docs/story.md goes on from there.
import fs from "node:fs"; import path from "node:path"; import { execFileSync, spawnSync } from "node:child_process";
import { ROOT, python } from "../pipeline/env.mjs";
import { songOf } from "../engine/song.mjs";

const args = process.argv.slice(2), opt = (n, d) => { const i = args.indexOf(n); if (i < 0) return d; const v = args[i + 1]; if (v === undefined || v.startsWith("--")) fail(`${n} wants a value`); args.splice(i, 2); return v; }, flag = (n) => { const i = args.indexOf(n); if (i >= 0) args.splice(i, 1); return i >= 0; };
function fail(msg) { console.error("starter: " + msg); process.exit(1); }
if (flag("--help") || flag("-h")) { console.log(fs.readFileSync(new URL(import.meta.url), "utf8").split("\n").filter((l) => l.startsWith("//")).map((l) => l.slice(3)).join("\n")); process.exit(0); }
const nameArg = opt("--name"), stems = opt("--stems"), from = opt("--from"), seconds = Number(opt("--seconds", 10)), lead = opt("--lead", "juno"), castArg = opt("--cast", "tane,juno,noor,ife");
const full = flag("--full"), force = flag("--force"), noRender = flag("--no-render"), softwareFlag = flag("--software"), demoWrite = flag("--write-demo");
const unknown = args.find((a) => a.startsWith("--")); if (unknown) fail(`unknown option ${unknown} (--help lists them)`);
const audio = args[0], demo = !audio, FPS = 24, WHO = ["tane", "ife", "noor", "juno"];
const cast = [...new Set([lead, ...castArg.split(",").map((s) => s.trim()).filter(Boolean)])];
for (const w of cast) if (!WHO.includes(w)) fail(`no such character: ${w} (there are ${WHO.join(", ")})`);
if (!(seconds >= 2 && seconds <= 120)) fail("--seconds wants a number from 2 to 120");
if (from !== undefined && !(Number(from) >= 0)) fail("--from wants seconds into the song, 0 or more");
const t0 = Date.now(), took = () => ((Date.now() - t0) / 1000).toFixed(0) + " s";

// ---- 1. the song, measured ---------------------------------------------------------------------------------------------
let name, songDir = null, file;
if (demo) { name = nameArg ?? "hello"; file = path.join(ROOT, "shots", name + ".js"); }
else {
  if (!fs.existsSync(audio)) fail(`no such file: ${audio}`);
  name = nameArg ?? (path.basename(audio, path.extname(audio)).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "mine");
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(name)) fail(`--name ${name}: use lower-case letters, digits, _ and -`);
  songDir = path.join("stories", name); file = path.join(ROOT, songDir, "starter.js");
  const measured = path.join(ROOT, songDir, "listen.json");
  if (fs.existsSync(measured) && fs.statSync(measured).mtimeMs > fs.statSync(audio).mtimeMs && !stems && !force) console.log(`${songDir}: already measured (--force measures again)`);
  else {
    console.log(`measuring ${audio} -> ${songDir}/ ...`);
    const r = spawnSync(python(), [path.join(ROOT, "analysis/song.py"), audio, "--out", path.join(ROOT, songDir), ...(stems ? ["--stems", stems] : [])], { stdio: "inherit" });
    if (r.error) fail(`could not run Python (${r.error.message}). npm run setup makes .venv; npm run doctor says what is missing.`);
    if (r.status) fail("the song could not be measured (see above)");
  }
}
const { listen, stems: S, sync } = songOf({ name, song: songDir ?? undefined });

// ---- 2. where the clip sits in the music -----------------------------------------------------------------------------
const beats = listen.beats, bars = beats.filter((b) => sync.at(b * FPS + 0.01).bar.beat === 0), kicks = S.stems.kick?.onsets ?? [];
if (bars.length < 3) fail(`only ${bars.length} bar lines found in ${listen.duration.toFixed(1)} s of music: too short to cut a clip to`);
const barLen = (bars[bars.length - 1] - bars[0]) / (bars.length - 1), nb = Math.min(bars.length - 1, Math.max(2, Math.round(seconds / barLen)));
const count = (i) => kicks.filter((k) => k >= bars[i] - 0.02 && k < bars[i + nb]).length;
let i0 = 0;
if (from !== undefined) { for (let i = 0; i <= bars.length - 1 - nb; i++) if (Math.abs(bars[i] - from) < Math.abs(bars[i0] - from)) i0 = i; }
else for (let i = 0; i <= bars.length - 1 - nb; i++) if (count(i) > count(i0)) i0 = i;      // the first stretch with the most kicks
const fr = (t) => Math.round(t * FPS), START = fr(bars[i0]), CUTS = [0, fr(bars[i0 + Math.ceil(nb / 2)]) - START, fr(bars[i0 + nb]) - START];
const inClip = kicks.filter((k) => fr(k) >= START && fr(k) < START + CUTS[2]), KICKS = [...new Set(inClip.map((k) => fr(k) - START))];
// a drone goes on the first kick of each bar (one that lands within a third of a beat of the bar line counts as on it)
const beatLen = barLen / 4, BLASTS = [];
for (let i = i0; i < i0 + nb; i++) { const k = inClip.find((k) => k >= bars[i] - beatLen / 3 && k < bars[i + 1] - beatLen / 3); if (k !== undefined && fr(k) >= START && !BLASTS.includes(fr(k) - START)) BLASTS.push(fr(k) - START); }
let BEAT0 = 0; beats.forEach((b, i) => { if (Math.abs(b - START / FPS) < Math.abs(beats[BEAT0] - START / FPS)) BEAT0 = i; });
// steps to a beat: of half, one, two or four, the most that keeps the run's cycle (two steps) at sixteen frames or more.
// A run is eight drawings; at sixteen frames a cycle each is held two frames and a planted foot stays exactly where it
// is. Slower than that each drawing is held longer and feet still hold; faster, drawings are held under two frames and
// feet creep (engine/motion.mjs measures it), so the starter never goes faster.
const beatFrames = beatLen * FPS, STEPS = [4, 2, 1, 0.5].find((n) => 2 * beatFrames / n >= 16) ?? 0.5;

// ---- 3. the shot file ----------------------------------------------------------------------------------------------------
const SPOTS = [[1.1, 0, 0], [-1.3, 1.9, 0.55], [0.6, 3.8, 0.3], [-0.7, 5.7, 0.8]];      // the nearer, the further out to the side
const rel = path.relative(ROOT, file), up = path.relative(path.dirname(file), ROOT) || ".";
const command = demo ? "node scripts/starter.mjs --write-demo" : `node scripts/starter.mjs ${path.basename(audio)}`;
const music = [
  `const SONG = ${demo ? "undefined" : JSON.stringify(songDir)};`.padEnd(46) + `// the song's folder (engine/song.mjs)${demo ? "; undefined: the demo song, audio.wav and analysis/" : ""}`,
  `const START = ${START};`.padEnd(46) + `// the clip's first frame: the bar line at ${(START / FPS).toFixed(2)} s`,
  `const CUTS = ${JSON.stringify(CUTS)};`.padEnd(46) + `// frames from START: each shot's first frame, and the end. All bar lines (${nb} bars of ${(barLen * FPS).toFixed(1)} frames)`,
  `const BEAT0 = ${BEAT0}, STEPS = ${STEPS};`.padEnd(46) + `// the beat START is on (its number in listen.json); steps of the run to a beat (${listen.tempo.toFixed(1)} bpm: a beat is ${beatFrames.toFixed(1)} frames)`,
  `const BLASTS = ${JSON.stringify(BLASTS)};`.padEnd(46) + `// frames from START of the first kick of each bar (the stem \`kick\`${S.stems.kick?.estimated ? ", estimated from the mix" : ", measured from the drum stem"}; ${KICKS.length} kicks in the clip)`,
].join("\n");
const text = fs.readFileSync(path.join(ROOT, "scripts/starter_shot.txt"), "utf8")
  .replaceAll("__TITLE__", demo ? "Hello: ten seconds of the cast on the demo song's first drop. `npm run hello` renders it; `npm run starter -- YOUR_SONG` writes its like for yours." : `A first clip for ${path.basename(audio)}: ${((CUTS[2]) / FPS).toFixed(1)} s from ${(START / FPS).toFixed(2)} s.`)
  .replaceAll("__COMMAND__", command).replaceAll("__FILE__", rel).replaceAll("__NAME__", name).replaceAll("__ENGINE__", up).replaceAll("__MUSIC__", music)
  .replaceAll("__W__", full ? 1920 : 960).replaceAll("__H__", full ? 1080 : 540).replaceAll("__LEAD__", lead)
  .replaceAll("__PLACE__", "{ " + cast.map((w, i) => `${w}: ${JSON.stringify(SPOTS[i])}`).join(", ") + " }");
if (demo && !demoWrite) { if (!fs.existsSync(file)) fail(`${rel} is missing; node scripts/starter.mjs --write-demo writes it`); }
else if (fs.existsSync(file) && !force && !demoWrite) console.log(`${rel} exists and is left as it is (--force writes it again)`);
else { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); console.log(`wrote ${rel}: ${CUTS[2]} frames (${(CUTS[2] / FPS).toFixed(1)} s) from ${(START / FPS).toFixed(2)} s, ${BLASTS.length} blasts on kicks, the run at ${STEPS} step${STEPS === 1 ? "" : "s"} a beat`); }
if (!demo && !KICKS.length) console.log("note: no kick was found in this stretch, so nothing is blown up. Try --from another place, or give --stems.");

// ---- 4. held to the music, then rendered ---------------------------------------------------------------------------------
const node = (script, extra, stdio = "inherit") => spawnSync(process.execPath, [path.join(ROOT, script), file, ...extra], { stdio, env: { ...process.env, ...(softwareFlag ? { SOFTWARE: "1" } : {}) } });
const marks = node("engine/marks.mjs", [], "pipe"), last = (marks.stdout?.toString().trim().split("\n").pop() ?? "");
console.log("marks: " + last); if (marks.status) { console.error(marks.stdout.toString() + marks.stderr.toString()); fail("a cut or a hit is off the music"); }
const motion = node("engine/motion.mjs", [], "pipe"), moved = (motion.stdout?.toString() ?? "").match(/(\d+) measurements, (\d+) over their limits/);
console.log("motion: " + (moved ? `${moved[1]} measurements of feet and drawings, ${moved[2]} over their limits` + (Number(moved[2]) ? `  (node engine/motion.mjs ${rel} lists them: something to look at, not a failure)` : "") : "did not run"));
if (noRender) { console.log(`not rendered. node render.mjs ${rel}`); process.exit(0); }
console.log(`rendering ${rel} (${fs.readFileSync(file, "utf8").match(/W = (\d+), H = (\d+)/).slice(1).join("x")}) ...`);
const tr = Date.now(), r = node("render.mjs", [], "pipe");
if (r.status) { console.error((r.stdout?.toString() ?? "") + (r.stderr?.toString() ?? "")); fail("the render failed (npm run doctor checks the machine)"); }
const info = JSON.parse(r.stdout.toString().trim().split("\n").pop());
if (Object.keys(info.dummies).length) console.log("drawn as the posing dummy (no drawing in the kit): " + JSON.stringify(info.dummies));
console.log(`-> ${info.video}   ${info.frames} frames at ${info.fps} a second on ${info.gpu}; render ${((Date.now() - tr) / 1000).toFixed(0)} s, all of it ${took()}`);
console.log(demo ? "Next: npm run starter -- YOUR_SONG.mp3   (docs/story.md: from a song to a film)" : `Next: edit ${rel}; docs/story.md goes from here to a film.`);
