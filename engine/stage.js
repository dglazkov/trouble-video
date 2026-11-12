// Plays a shot: the one page render.mjs drives. A shot is a module whose default export is
//   { name, start (seconds into the song; frame 0 is there), frames, fps = 24, width, height,
//     cast: { who: "/kits/NAME" },                       the characters' cel kits
//     plates: { name: { src, key: "magenta" } },         single drawings (a close-up), lifted off their backdrop
//     sets: ["corridor"],                                sets to build before the first frame (others are built when met)
//     frame(f, sync) -> {
//       set: "corridor" | "market" | null, camera: { pos, target, fov, up }, options: { ...the set's cues, post: {...} },
//       actors: [{ who, action, phase, yaw, x, y, z, view, light: {...}, shadow: false, over: true, steady: 3, hero: "name",
//                  layer: {...engine/post.js LAYER, over what the stage works out: a wobble of hair and cloth} }],
//       cels: [{ plate, x, y, scale, layer: {...engine/post.js LAYER} }],      plates on the frame: centre (pixels), scale
//       backdrop(g, cam, bodies)    a painted background when there is no set (a 2D canvas the size of the frame)
//       under(g, cam, bodies)       painted over the background, under the characters
//       overlay(g, cam, bodies)     painted over everything, before the lens
//       post: {...}                 engine/post.js parameters, over the set's own and options.post
//     } }
// and frame(f, sync) is a pure function of the frame number. Every frame goes the same way: the set (or the backdrop)
// is rendered with the shot's camera; each character is posed on the skeleton and its cel for that pose and view drawn
// with the same camera, feet on the set's floor; the photography pass lays the cels in, far to near, in the light the
// set says falls where each stands, behind whatever of the set is nearer, sunk into its air with distance, a contact
// shadow under each on the floor; then the lens, the grain and the rest over the whole picture.
// Characters are held on twos (their drawing is the one for the last even frame; where they are is on ones, with the
// camera and the set). An actor's `hero` names a one-off drawing of the kit made for this shot's camera (engine/cels.js).
// An actor's `view` names the drawing the shot was staged for: a kit without it shows the dummy.
// A figure stands in the light of the place it is at, which is hard-edged (a pool or not): one that crosses a pool
// every few frames would strobe, so `steady: n` lays it in the mean light of its way over n frames either side.
// A cel is flat, at the depth of the character's middle: where a lean would put part of it behind something it is
// really in front of, `over: true` lets nothing of the set hide it.
// Query: ?shot=/shots/x.js &debug=1 (skeletons and which cel is on) &mannequin=1 (dummies only) &over=1 (nothing of
// the set hides any character: against a normal render, the difference is what the set hid) &kits=a,b (the kits
// that exist; a cast member whose kit does not is a dummy of standard build).
import * as THREE from "three";
import { proportions, solve, camera } from "./body.js";
import { loadKit, createActor } from "./cels.js";
import { ACTIONS, actorPose, celIndex } from "./actions.js";
import { drawMannequin, drawSkeleton } from "./mannequin.js";
import { loadSync } from "./sync.js";
import { Post, PLAIN } from "./post.js";
import { keyMagenta } from "./key.js";
import { ndMaterial } from "../sets/kit.js";

try {
  const Q = new URLSearchParams(location.search);
  const shot = (await import(Q.get("shot"))).default, DEBUG = Q.get("debug") === "1", DUMMY = Q.get("mannequin") === "1", OVER = Q.get("over") === "1", KITS = Q.get("kits")?.split(",");
  const W = shot.width ?? 1920, H = shot.height ?? 1080, fps = shot.fps ?? 24, f0 = Math.round((shot.start ?? 0) * fps);
  THREE.ColorManagement.enabled = false;
  const canvas = document.getElementById("c");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false); renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  const gl = renderer.getContext(), dbg = gl.getExtension("WEBGL_debug_renderer_info");
  const sync = await loadSync(), post = new Post(renderer, W, H), sets = {}, cast = {}, plates = {};
  const makers = { corridor: () => import("../sets/corridor.js").then((m) => m.createCorridor(renderer, { width: W, height: H })), market: () => import("../sets/market.js").then((m) => m.createMarket(renderer, { width: W, height: H })),
    vault: () => import("../sets/vault.js").then((m) => m.createVault(renderer, { width: W, height: H })) };
  const need = async (name) => sets[name] ?? (sets[name] = await makers[name]());
  for (const s of shot.sets ?? []) await need(s);
  for (const [who, base] of Object.entries(shot.cast ?? {})) {
    const name = base.split("/").pop(), kit = !KITS || KITS.includes(name) ? await loadKit(base) : { name, body: {}, actions: {} };
    cast[who] = { kit, P: proportions(kit.body) };
  }
  for (const [name, p] of Object.entries(shot.plates ?? {})) { const im = new Image(); im.src = p.src; await im.decode(); plates[name] = p.key === "magenta" ? keyMagenta(im) : im; }
  for (const f of [new FontFace("Dela Gothic One", "url(/fonts/DelaGothicOne-Regular.ttf)")]) { await f.load(); document.fonts.add(f); }

  // 2D canvases the size of the frame, each with its texture: the painted layers and one per cel
  const sheets = [];
  const sheet = (i) => {
    if (!sheets[i]) { const c = new OffscreenCanvas(W, H), t = new THREE.CanvasTexture(c); t.premultiplyAlpha = true; t.generateMipmaps = false; t.minFilter = t.magFilter = THREE.LinearFilter; sheets[i] = { c, g: c.getContext("2d"), t }; }
    const s = sheets[i]; s.g.setTransform(1, 0, 0, 1, 0, 0); s.g.clearRect(0, 0, W, H); s.t.needsUpdate = true; return s;
  };
  let actors = {}, last = -1, take = null;

  // The characters of frame f: posed where the frame says, on the drawing the held frame says.
  function people(f, fr) {
    if ((fr.take ?? 0) !== take) { actors = {}; take = fr.take ?? 0; }
    const cam = camera({ fov: 30, ...fr.camera, w: W, h: H }), hf = shot.held?.(f) ?? f - f % 2, held = hf === f ? fr : shot.frame(hf, sync);
    return { cam, list: (fr.actors ?? []).map((a) => {
      const h = held.actors?.find((x) => x.who === a.who) ?? a, on = { ...a, action: h.action, phase: h.phase, hero: h.hero }, c = cast[a.who];
      if (!c) throw new Error(`${shot.name}: "${a.who}" is not in the cast`);
      const body = solve(c.P, actorPose(on)), pick = (actors[a.who] ??= createActor(c.kit)).pick(on.action, celIndex(on.action, on.phase), body, cam, on.hero);
      if (!on.hero && a.view && !c.kit.actions[on.action]?.views[a.view]) pick.missing = true;
      return { a: on, c, body, pick };
    }) };
  }
  async function render(f) {
    const fr = shot.frame(f, sync), F = f0 + f, set = fr.set ? await need(fr.set) : null, opt = fr.options ?? {}, { cam, list } = people(f, fr), bodies = list.map((p) => p.body), notes = [];
    // contact shadows: one hard disc under each figure, smaller and fainter the higher it is off the floor
    const shadows = [];
    for (const { a, body } of list) {
      if (a.shadow === false) continue;
      const q = body.q, floor = set?.floorAt ? set.floorAt(q.x, q.z) : 0; if (floor === null) continue;
      const feet = ["L", "R"].map((s) => body.J[s].ball), c = [(feet[0][0] + feet[1][0] + body.J.hips[0]) / 3, floor, (feet[0][2] + feet[1][2] + body.J.hips[2]) / 3], up = Math.max(0, (q.y ?? 0) - floor), k = Math.max(0, 1 - up / 3);
      shadows.push({ at: c, rx: 0.34 * (0.5 + 0.5 * k), rz: 0.46 * (0.5 + 0.5 * k), yaw: q.yaw, alpha: 0.7 * k });
    }
    let params;
    if (set) { const s = set.update(fr.camera, F, sync, { ...opt, shadows }); post.capture(s.scene, s.camera, ndMaterial, { clear: s.clear }); params = { ...s.post, ...fr.post }; }
    else { const s = sheet(0); s.g.fillStyle = "#30365e"; s.g.fillRect(0, 0, W, H); fr.backdrop?.(s.g, cam, bodies); post.paint(s.t); params = { ...PLAIN, ...opt.post, ...fr.post }; }
    // the cels, far to near
    const cels = list.map((p) => ({ ...p, depth: cam.project([p.body.q.x, (p.body.q.y ?? 0) + 0.9, p.body.q.z]).z })).concat((fr.cels ?? []).map((c) => ({ plate: c, depth: c.depth ?? 0 }))).sort((a, b) => b.depth - a.depth);
    post.clearCels();
    cels.forEach((p, i) => {
      const s = sheet(3 + i), g = s.g;
      if (p.plate) {
        const im = plates[p.plate.plate], k = p.plate.scale ?? 1;
        g.imageSmoothingEnabled = true; g.imageSmoothingQuality = "high";
        g.translate(p.plate.x ?? W / 2, p.plate.y ?? H / 2); g.rotate(p.plate.turn ?? 0); g.scale(k, k); g.drawImage(im, -im.width / 2, -im.height / 2);
        post.cel(s.t, p.plate.layer); return;
      }
      const { a, c, body, pick } = p, q = body.q;
      if (DUMMY || pick.missing) drawMannequin(g, body, cam, { ink: 2 }); else actors[a.who].draw(g, pick, body, cam);
      const dummy = DUMMY || pick.missing;
      const note = { who: a.who, action: a.action, view: pick.view, cel: pick.cel, mirror: pick.mirror, dummy, rel: +pick.rel.toFixed(0) }; notes.push(note);
      // the light of the place where the figure stands
      const at = [q.x, q.y ?? 0, q.z], L = { ...(set?.light?.(at, opt) ?? {}), ...a.light };
      if (a.steady && set?.light) {      // moving fast through pools of light: the mean of the light along the next and last few frames of its way
        const acc = { tint: [0, 0, 0], rim: [0, 0, 0] }; let n = 0;
        for (let k = -a.steady; k <= a.steady; k++) {
          const g = f + k; if (g < 0 || g >= shot.frames) continue;
          const o = shot.frame(g, sync); if ((o.take ?? 0) !== (fr.take ?? 0)) continue;
          const b = o.actors?.find((x) => x.who === a.who); if (!b) continue;
          const l = set.light([b.x ?? 0, b.y ?? 0, b.z ?? 0], opt), w = 1 - Math.abs(k) / (a.steady + 1); n += w;      // nearer frames count for more: no ripple as a pool enters or leaves the span
          for (const key of ["tint", "rim"]) for (let j = 0; j < 3; j++) acc[key][j] += w * (l[key] ?? [1, 1, 1])[j];
        }
        if (n) for (const key of ["tint", "rim"]) if (!a.light?.[key]) L[key] = acc[key].map((v) => v / n);
      }
      const foot = cam.project(at), head = cam.project([q.x, (q.y ?? 0) + c.P.height, q.z]);
      const from = L.from ?? [0, 1, 0], d = [from[0] * cam.right[0] + from[1] * cam.right[1] + from[2] * cam.right[2], from[0] * cam.up[0] + from[1] * cam.up[1] + from[2] * cam.up[2]], dl = Math.hypot(d[0], d[1]);
      const px = Math.min(9, Math.max(2.5, foot.s * 0.016)), y0 = 1 - Math.max(foot.y, head.y) / H, y1 = 1 - Math.min(foot.y, head.y) / H;
      const layer = { depth: a.over || OVER ? 0 : Math.max(0.05, p.depth - 0.35), tint: L.tint ?? [1, 1, 1], fog: L.fogK ? (1 - Math.exp(-p.depth * L.fogK)) : 0, fogColor: L.fogColor ?? [0, 0, 0],
        rim: dl > 0.3 && L.rim ? L.rim : [0, 0, 0], rimDir: dl > 0.3 ? [d[0] / dl * px, d[1] / dl * px] : [0, 0], gradient: L.gradient ?? 0, gradientY: [y0, y0 + (y1 - y0) * 0.75], ...a.layer };
      post.cel(s.t, layer);
      Object.assign(note, { tint: layer.tint, rim: layer.rim, fog: +layer.fog.toFixed(4), depth: +layer.depth.toFixed(3) });      // the light it was laid in (engine/motion.mjs reads it for flicker)
    });
    const paint = (i, fn) => { if (!fn && !(i === 2 && DEBUG)) return null; const s = sheet(i); fn?.(s.g, cam, bodies); return s; };
    const under = paint(1, fr.under), over = paint(2, fr.overlay);
    if (DEBUG) {
      const g = over.g; g.setTransform(1, 0, 0, 1, 0, 0);
      list.forEach((p) => drawSkeleton(g, p.body, cam, { width: 2 }));
      g.font = "22px monospace"; g.textBaseline = "top";
      [`${shot.name} f${f} (song ${(F / fps).toFixed(2)} s)`, ...notes.map((n) => `${n.who}: ${n.action} ${n.dummy ? "DUMMY" : `${n.view}${n.mirror ? " (mirrored)" : ""} cel ${n.cel}`}, yaw to camera ${n.rel}`)].forEach((t, i) => { g.fillStyle = "rgba(0,0,0,0.6)"; g.fillRect(12, 12 + i * 28, g.measureText(t).width + 12, 26); g.fillStyle = "#fff"; g.fillText(t, 18, 14 + i * 28); });
    }
    post.finish({ seed: F * 1.618 + 3.1, ...params, under: under?.t, fx: over?.t });
    gl.finish();
    return { set: fr.set ?? null, camera: fr.camera, actors: notes };
  }
  // Which view a character is on depends on the frames before (hysteresis), so a frame asked for out of order is
  // reached by replaying the choices from the start: the result is the same however the frames are asked for.
  window.renderFrame = async (f) => {
    if (f !== last + 1) { actors = {}; take = null; for (let k = 0; k < f; k++) people(k, shot.frame(k, sync)); }
    const info = await render(f); last = f; return info;
  };
  window.capture = (type = "image/png", q) => canvas.toDataURL(type, q);
  window.shotInfo = { name: shot.name, frames: shot.frames, fps, width: W, height: H, start: shot.start ?? null, cuts: shot.cuts ?? null, gpu: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "?" };
  window.ready = true;
} catch (e) { window.failed = String(e.stack || e); }
