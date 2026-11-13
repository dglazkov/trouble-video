// The checks a fork can run: node scripts/test.mjs [--no-render] [--all] [--update-refs]      (npm test)
// Offline, and under a minute on a laptop:
//   kits      every cel kit's manifest against the engine (pipeline/check.mjs): files, scales, feet on the ground;
//             kits/cast.js against each character.json; every drawing a kit names exists
//   marks     every cut and hit of the ten sections, the whole film and the hello clip is on the music (engine/marks.mjs)
//   motion    feet, pops and jumps of every section (engine/motion.mjs, no rendering): no MORE findings over the
//             limits than the finished film has (it has 21, all looked at and left; a new one is a regression), and none in hello
//   edit      shots/film.js is the ten sections end to end, 3956 frames
//   song      analysis/song.py measures a synthetic song (scripts/test_song.py) and finds every kick within a frame;
//             scripts/starter.mjs writes a starter for it whose marks hold
//   render    seven frames (hello, the slice, the opening, two of examples/) rendered and compared LOOSELY with small committed pictures
//             (test/ref/, 320x180): GPUs and Chrome's software renderer differ in the last bits of some pixels, so
//             this catches a broken set, a missing drawing or a wrong frame, not a changed shade. Skipped with
//             --no-render, or when no Chrome is found (and says so). SOFTWARE=1 renders without a GPU.
//   --all     also the slow one: pipeline/cels.py selftest (breaks a good painted sheet every way the checks guard
//             against and sees each caught; about 70 s)
//   --update-refs   write the reference pictures from this machine's render (after an intended change of look)
// Exit status 1 if anything fails.
import fs from "node:fs"; import path from "node:path"; import os from "node:os"; import { spawnSync } from "node:child_process";
import { ROOT, python, findChrome } from "../pipeline/env.mjs";

const args = process.argv.slice(2), noRender = args.includes("--no-render"), all = args.includes("--all"), update = args.includes("--update-refs");
const t0 = Date.now(), fails = [], py = python();
const section = (name) => { process.stdout.write(`${name.padEnd(8)}`); return Date.now(); };
const done = (t, text) => console.log(`${text}  (${((Date.now() - t) / 1000).toFixed(1)} s)`);
const fail = (msg) => { fails.push(msg); };
const node = (script, a = [], env = {}) => spawnSync(process.execPath, [path.join(ROOT, script), ...a], { cwd: ROOT, env: { ...process.env, ...env }, maxBuffer: 1 << 28 });
const out = (r) => (r.stdout?.toString() ?? "") + (r.stderr?.toString() ?? "");
const SECTIONS = ["open", "descent", "gantry", "slice", "wins", "core", "boom", "breakdown", "reunion", "fall"];
// engine/motion.mjs findings over its limits in the film as finished (each was looked at and left: an impact, a leap).
const MOTION = { open: 0, descent: 0, gantry: 1, slice: 16, wins: 4, core: 0, boom: 0, breakdown: 0, reunion: 0, fall: 0, hello: 0, "examples/room": 0, "examples/shot": 0 };
const fileOf = (s) => s.includes("/") ? `${s}.js` : `shots/${s}.js`;

// engine/motion.mjs ends with "N measurements, M over their limits": M, or null (and a failure) if it did not get that far
function overLimits(r, what) { const m = out(r).match(/(\d+) measurements, (\d+) over their limits/); if (!m) { fail(`engine/motion.mjs ${what} did not run:\n${out(r).slice(0, 600)}`); return null; } return Number(m[2]); }

// ---- kits ----------------------------------------------------------------------------------------------------------------
let t = section("kits");
const kitNames = fs.readdirSync(path.join(ROOT, "kits")).filter((k) => fs.existsSync(path.join(ROOT, "kits", k, "kit.json")));
let drawings = 0;
for (const k of kitNames) {
  const kit = JSON.parse(fs.readFileSync(path.join(ROOT, "kits", k, "kit.json")));
  const imgs = [...Object.values(kit.actions ?? {}).flatMap((a) => Object.values(a.views)).flatMap((v) => Object.values(v.cels)), ...Object.values(kit.heroes ?? {}), ...(kit.people ?? []).flatMap((p) => p.cels ?? [])].map((c) => c.img);
  for (const i of imgs) { drawings++; if (!fs.existsSync(path.join(ROOT, "kits", k, i))) fail(`kits/${k}/kit.json names ${i}, which is not there`); }
  if (kit.actions) { const r = node("pipeline/check.mjs", [k]); if (r.status) fail(`pipeline/check.mjs ${k}:\n${out(r).split('"failures"')[1] ?? out(r)}`); }
}
{
  const { LEGS, STRIDE } = await import("../kits/cast.js");
  for (const [who, legs] of Object.entries(LEGS)) {
    const body = JSON.parse(fs.readFileSync(path.join(ROOT, "kits", who, "character.json"))).body;
    for (const [k, v] of Object.entries(legs)) if (body[k] !== v) fail(`kits/cast.js says ${who}'s ${k} is ${v}; kits/${who}/character.json says ${body[k]}`);
    for (const k of ["hipW", "thigh", "shin", "ankleH"]) if (body[k] !== undefined && legs[k] === undefined) fail(`kits/${who}/character.json sets ${k}, which the stride depends on, and kits/cast.js LEGS does not carry it`);
    if (!(STRIDE[who] > 1 && STRIDE[who] < 6)) fail(`kits/cast.js: ${who}'s stride is ${STRIDE[who]}`);
  }
}
done(t, `${kitNames.length} kits, ${drawings} drawings`);

// ---- marks, edit -----------------------------------------------------------------------------------------------------------
t = section("marks"); let nMarks = 0;
for (const s of [...SECTIONS, "film", "hello"]) {
  const r = node("engine/marks.mjs", [`shots/${s}.js`]), m = out(r).match(/(\d+) marks, (\d+) off/);
  if (!m) { fail(`engine/marks.mjs shots/${s}.js did not run:\n${out(r).slice(0, 600)}`); continue; }
  nMarks += s === "film" ? 0 : Number(m[1]);
  for (const line of out(r).split("\n").filter((l) => l.includes("OFF THE MUSIC"))) fail(`shots/${s}.js is off the music: ${line.trim()}`);
}
done(t, `${nMarks} marks on the music`);
t = section("edit");
{
  const film = (await import("../shots/film.js")).default; let n = 0, start = 0;
  for (const s of SECTIONS) { const e = (await import(`../shots/${s}.js`)).default; if (Math.abs(e.start * 24 - n) > 1e-6) fail(`shots/${s}.js starts at ${e.start} s, and the sections before it end at ${n / 24} s`); n += e.frames; start ||= e.start; }
  if (film.frames !== n) fail(`shots/film.js is ${film.frames} frames; its sections add up to ${n}`);
  done(t, `the film is ${film.frames} frames in ${film.cuts.length} shots`);
}

// ---- motion ----------------------------------------------------------------------------------------------------------------
t = section("motion"); let over = 0;
for (const [s, limit] of Object.entries(MOTION)) {
  const bad = overLimits(node("engine/motion.mjs", [fileOf(s)]), fileOf(s)); if (bad === null) continue;
  over += bad;
  if (bad > limit) fail(`engine/motion.mjs ${fileOf(s)}: ${bad} findings over the limits, where there were ${limit}. node engine/motion.mjs ${fileOf(s)} lists them`);
}
done(t, `${over} findings over the limits, none new`);

// ---- song ------------------------------------------------------------------------------------------------------------------
t = section("song");
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "trouble-test-")), wav = path.join(tmp, "synth.wav"), story = path.join(ROOT, "stories", "selftest");
  try {
    const made = spawnSync(py, [path.join(ROOT, "scripts/test_song.py"), wav]);
    if (made.status) fail(`scripts/test_song.py: ${out(made).slice(0, 400)}`);
    else {
      const truth = JSON.parse(made.stdout.toString()), r = node("scripts/starter.mjs", [wav, "--name", "selftest", "--no-render", "--force"]);
      if (r.status) fail(`scripts/starter.mjs on the synthetic song:\n${out(r).slice(-800)}`);
      else {
        const L = JSON.parse(fs.readFileSync(path.join(story, "listen.json"))), S = JSON.parse(fs.readFileSync(path.join(story, "stems.json"))), k = S.stems.kick.onsets;
        const worst = Math.max(...truth.kicks.map((x) => Math.min(...k.map((y) => Math.abs(y - x))))) * 24;
        if (k.length !== truth.kicks.length || worst > 1) fail(`analysis/song.py found ${k.length} kicks of ${truth.kicks.length}, the worst ${worst.toFixed(2)} frames off`);
        if (Math.abs(L.tempo / truth.bpm - 1) > 0.05) fail(`analysis/song.py: tempo ${L.tempo.toFixed(1)}, the song is ${truth.bpm}`);
        for (const n of ["drums", "bass", "brass", "strings", "synth", "keyboard", "lead_vocals", "backing_vocals", "percussion"]) if (!S.stems[n]?.env?.length) fail(`analysis/song.py: no stem "${n}" (the sets are wired to it)`);
        if (!/marks: \d+ marks, 0 off/.test(out(r))) fail(`the starter written for the synthetic song is off its own music:\n${out(r).slice(-400)}`);
        overLimits(node("engine/motion.mjs", ["stories/selftest/starter.js"]), "on the starter");
      }
    }
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); fs.rmSync(story, { recursive: true, force: true }); try { fs.rmdirSync(path.join(ROOT, "stories")); } catch { /* not empty: the fork's own stories */ } }
  done(t, "a synthetic song measured, a starter written for it");
}

// ---- render ----------------------------------------------------------------------------------------------------------------
const SHOTS = [["hello", [0, 130]], ["slice", [100, 200]], ["open", [120]], ["examples/room", [20]], ["examples/closeup", [7]]];
if (!noRender) {
  t = section("render");
  let chrome = null; try { chrome = findChrome(); } catch { /* none */ }
  if (!chrome) done(t, "SKIPPED: no Chrome or Chromium found (npm run doctor)");
  else {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "trouble-render-")), refs = path.join(ROOT, "test/ref"), pairs = [];
    try {
      for (const [s, frames] of SHOTS) {
        const dir = path.join(tmp, path.basename(s)), r = node("render.mjs", [fileOf(s), "--frames", frames.join(","), "--out", dir]);
        if (r.status) { fail(`node render.mjs ${fileOf(s)} --frames ${frames}:\n${out(r).slice(-700)}`); continue; }
        const info = JSON.parse(r.stdout.toString().trim().split("\n").pop());
        if (Object.keys(info.dummies).length) fail(`${fileOf(s)}: drawn as the posing dummy, no drawing in the kit: ${JSON.stringify(info.dummies)}`);
        for (const f of frames) pairs.push([path.join(dir, `f${String(f).padStart(4, "0")}.png`), path.join(refs, `${path.basename(s)}_f${String(f).padStart(4, "0")}.png`)]);
      }
      if (pairs.length) {
        const code = `
import sys, json, cv2, numpy as np
update = sys.argv[1] == "1"; res = []
for i in range(2, len(sys.argv), 2):
    a = cv2.resize(cv2.imread(sys.argv[i]), (320, 180), interpolation=cv2.INTER_AREA)
    if update: cv2.imwrite(sys.argv[i + 1], a); continue
    b = cv2.imread(sys.argv[i + 1])
    if b is None: res.append({"ref": sys.argv[i + 1], "missing": True}); continue
    d = np.abs(a.astype(int) - b.astype(int)); res.append({"ref": sys.argv[i + 1], "mean": float(d.mean()), "far": float((d.max(axis=2) > 24).mean())})
print(json.dumps(res))`;
        fs.mkdirSync(refs, { recursive: true });
        const r = spawnSync(py, ["-c", code, update ? "1" : "0", ...pairs.flat()]);
        if (r.status) fail(`comparing the rendered frames: ${out(r).slice(-500)}`);
        else for (const x of JSON.parse(r.stdout.toString())) {
          const name = path.relative(ROOT, x.ref);
          if (x.missing) fail(`${name} is missing (node scripts/test.mjs --update-refs writes it)`);
          else if (x.mean > 4 || x.far > 0.05) fail(`${name}: the frame rendered here is not that picture (mean difference ${x.mean.toFixed(1)} of 255, ${(x.far * 100).toFixed(1)}% of it far off). If the look was changed on purpose: --update-refs`);
        }
      }
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
    done(t, update ? `${pairs.length} reference pictures written to test/ref/` : `${pairs.length} frames rendered and like their references`);
  }
}

// ---- the slow one ----------------------------------------------------------------------------------------------------------
if (all) {
  t = section("cels");
  const r = spawnSync(py, [path.join(ROOT, "pipeline/cels.py"), "selftest", path.join(ROOT, "kits/juno/source/run/side/take_9.jpg")], { cwd: ROOT, maxBuffer: 1 << 28 });
  if (r.status) fail(`pipeline/cels.py selftest: a broken sheet got past a check, or it did not run:\n${out(r).slice(-600)}`);
  done(t, "the cel checks catch every way a sheet was broken");
}

console.log(fails.length ? `\n${fails.length} FAILED\n` + fails.map((f) => "  - " + f).join("\n") : `\nall passed in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
process.exit(fails.length ? 1 : 0);
