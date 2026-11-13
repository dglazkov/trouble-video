// The song as a function of the frame: where the beat and the bar are, what each stem is doing, which section it is.
// Built from analysis/listen.json (beats, sections) and analysis/stems.json (per-stem loudness at 24 fps and onsets).
// Nothing here knows about pictures; sets and machines ask it what the music is doing and move accordingly.
//
//   const sync = await loadSync();            // in a page; or createSync(listenJson, stemsJson) anywhere
//   const s = sync.at(frame);                 // frame = song time * fps; fractions allowed
//   s.t                                       seconds into the song
//   s.beat   { index, phase, since, length }  phase 0..1 through the beat, since = seconds after it landed
//   s.bar    { index, phase, beat }           beat 0..3 within the bar; bars are counted from `downbeat`
//   s.section{ index, phase, since, start, end }
//   s.stems.drums { env, since, until, index, hit }   env 0..1 loudness, since = seconds after the last onset
//                                                      (Infinity before the first), hit = 1 on the onset's frame
//   sync.drive(spec, frame)  -> number        one wire from a stem to a system; see drive() below
//   sync.words                                every sung word of the song in order (analysis/lyrics.json, made by
//                                             analysis/lyrics.py): { word, frame, t, end, voice, phrase, confidence }
//   sync.phrases                              the phrases they belong to: { id, text, voice, start, end, startFrame, endFrame, words }
//   sync.wordAt(frame) -> null when nobody is singing, or { word, index, since (frames), phrase, said: [the phrase's words so far] }
//   A shot that puts a lyric on a screen takes the word and its frame from here (or holds its own frame to it with a
//   mark `on: "lyric"`, see engine/marks.mjs), so that the words on screen have one source.
const upper = (a, x) => { let lo = 0, hi = a.length; while (lo < hi) { const m = (lo + hi) >> 1; if (a[m] <= x) lo = m + 1; else hi = m; } return lo; };

export function createSync(listen, stems, o = {}) {
  const fps = o.fps ?? stems.fps ?? 24, beats = listen.beats, sections = listen.sections, S = stems.stems;
  // The bar line: the beat nearest `downbeat` is a bar's first. A song says where one is with `downbeat` (seconds) in its
  // listen.json (analysis/song.py estimates it); the demo song's has none and takes its drop, the fourth section's start.
  const downbeat = o.downbeat ?? listen.downbeat ?? sections[3] ?? beats[0];
  let d0 = 0; for (let i = 1; i < beats.length; i++) if (Math.abs(beats[i] - downbeat) < Math.abs(beats[d0] - downbeat)) d0 = i;
  const span = (beats[beats.length - 1] - beats[0]) / (beats.length - 1);
  const beatTime = (i) => i < 0 ? beats[0] + i * span : i >= beats.length ? beats[beats.length - 1] + (i - beats.length + 1) * span : beats[i];

  function stemAt(name, t) {
    const s = S[name]; if (!s) throw new Error(`sync: no stem "${name}"; there are ${Object.keys(S).join(", ")}`);
    const x = Math.max(0, t * fps), i = Math.min(s.env.length - 1, Math.floor(x)), j = Math.min(s.env.length - 1, i + 1), u = x - Math.floor(x);
    const k = upper(s.onsets, t + 1e-6) - 1;
    return { env: s.env[i] + (s.env[j] - s.env[i]) * u, index: k, since: k >= 0 ? t - s.onsets[k] : Infinity,
      until: k + 1 < s.onsets.length ? s.onsets[k + 1] - t : Infinity, hit: k >= 0 && t - s.onsets[k] < 1 / fps ? 1 : 0 };
  }
  function at(frame) {
    const t = frame / fps;
    let bi = upper(beats, t) - 1;
    if (bi < 0) bi = Math.floor((t - beats[0]) / span); else if (bi >= beats.length - 1) bi = beats.length - 1 + Math.floor((t - beats[beats.length - 1]) / span);
    const b0 = beatTime(bi), len = beatTime(bi + 1) - b0, phase = (t - b0) / len;
    const rel = bi - d0, barIndex = Math.floor(rel / 4), inBar = rel - barIndex * 4;
    let si = Math.max(0, upper(sections, t) - 1);
    const s0 = sections[si], s1 = sections[si + 1] ?? listen.duration;
    const out = { frame, t, fps, beat: { index: bi, phase, since: t - b0, length: len }, bar: { index: barIndex, beat: inBar, phase: (inBar + phase) / 4 },
      section: { index: si, start: s0, end: s1, since: t - s0, phase: (t - s0) / (s1 - s0) }, stems: {} };
    for (const name in S) Object.defineProperty(out.stems, name, { enumerable: true, get: () => stemAt(name, t) });
    return out;
  }
  // One wire. spec = { stem, mode, gain = 1, floor = 0, decay, attack, lag = 0 } and the answer is floor + gain * x:
  //   mode "env"    x = the stem's loudness now (0..1)
  //   mode "pulse"  x = 1 on an onset, dying away with time constant `decay` seconds (default 0.12)
  //   mode "gate"   x = 1 for `decay` seconds after an onset, else 0
  //   mode "count"  x = how many onsets there have been (a system that steps on each one), gain/floor still applied
  //   mode "beat"   x = 1 on the beat, dying away (no stem needed); "bar" the same on the bar line
  // `lag` seconds delays the wire (a light further down the corridor answers later). A number passes through as itself.
  function drive(spec, frame) {
    if (typeof spec === "number") return spec;
    const t = frame / fps - (spec.lag ?? 0), gain = spec.gain ?? 1, floor = spec.floor ?? 0, decay = spec.decay ?? 0.12;
    let x = 0;
    if (spec.mode === "beat" || spec.mode === "bar") { const a = at(t * fps); x = spec.mode === "beat" ? Math.exp(-a.beat.since / decay) : Math.exp(-(a.bar.phase * 4 * a.beat.length) / decay); }
    else {
      const s = stemAt(spec.stem, t);
      if (spec.mode === "env") x = s.env;
      else if (spec.mode === "count") x = s.index + 1;
      else if (spec.mode === "gate") x = s.since < decay ? 1 : 0;
      else x = s.since === Infinity ? 0 : Math.exp(-s.since / decay);
    }
    return floor + gain * x;
  }
  const words = o.lyrics?.words ?? [], phrases = o.lyrics?.phrases ?? [], starts = words.map((w) => w.frame), phraseOf = Object.fromEntries(phrases.map((p) => [p.id, p]));
  function wordAt(frame) {
    const k = upper(starts, frame) - 1; if (k < 0) return null;
    const w = words[k], p = phraseOf[w.phrase]; if (frame >= p.endFrame) return null;
    return { word: w.word, index: k, since: frame - w.frame, phrase: p, said: words.slice(0, k + 1).filter((x) => x.phrase === w.phrase).map((x) => x.word) };
  }
  return { fps, beats, sections, stems: Object.keys(S), duration: listen.duration, at, drive, frameOf: (t) => Math.round(t * fps), words, phrases, wordAt };
}

export async function loadSync(base = "/analysis", o) {
  const [listen, stems] = await Promise.all(["listen.json", "stems.json"].map(async (f) => { const r = await fetch(`${base}/${f}`); if (!r.ok) throw new Error(`sync: ${base}/${f} ${r.status}`); return r.json(); }));
  const lyrics = o?.lyrics ?? await fetch(`${base}/lyrics.json`).then((r) => r.ok ? r.json() : null, () => null);      // older checkouts have none
  return createSync(listen, stems, { ...o, lyrics });
}
// A wiring is a plain object of wires; this evaluates all of it for a frame. Overrides replace wires by name.
export const driveAll = (sync, wiring, frame, over = {}) => { const o = {}; for (const k in wiring) o[k] = sync.drive(over[k] ?? wiring[k], frame); for (const k in over) if (!(k in o)) o[k] = sync.drive(over[k], frame); return o; };
