// Plays a shot: the page render.mjs drives. A shot is a module whose default export is
//   { name, frames, fps, width, height, cast: { who: "/kits/NAME" },
//     frame(f) -> { camera, actors: [{ who, action, phase, yaw, x, z }], backdrop(g, cam, bodies), overlay(g, cam, bodies) } }
// and frame(f) is a pure function of the frame number. An actor is a character doing a named action (engine/actions.js)
// at a phase of it; the stage poses the skeleton, and the kit's cel for that pose and view is hung on it.
// Query: ?shot=/shots/x.js &debug=1 (the skeleton over the drawing, and which cel is on) &mannequin=1 (the dummy instead).
import { proportions, solve, camera } from "./body.js";
import { loadKit, createActor } from "./cels.js";
import { actorPose, celIndex } from "./actions.js";
import { drawMannequin, drawSkeleton } from "./mannequin.js";

try {
  const Q = new URLSearchParams(location.search);
  const shot = (await import(Q.get("shot"))).default, DEBUG = Q.get("debug") === "1", DUMMY = Q.get("mannequin") === "1";
  const W = shot.width ?? 1920, H = shot.height ?? 1080;
  const out = document.getElementById("c"); out.width = W; out.height = H;
  const g = out.getContext("2d"), cast = {};
  for (const [who, base] of Object.entries(shot.cast)) { const kit = await loadKit(base); cast[who] = { kit, P: proportions(kit.body) }; }
  let actors = {}, last = -1;

  function step(f, draw) {
    const fr = shot.frame(f), cam = camera({ fov: 30, ...fr.camera, w: W, h: H });
    const bodies = fr.actors.map((a) => solve(cast[a.who].P, actorPose(a)));
    const picks = fr.actors.map((a, i) => (actors[a.who] ??= createActor(cast[a.who].kit)).pick(a.action, celIndex(a.action, a.phase), bodies[i], cam));
    if (!draw) return;
    g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = "#30365e"; g.fillRect(0, 0, W, H);
    fr.backdrop?.(g, cam, bodies);
    const notes = [];
    fr.actors.forEach((a, i) => {
      const sel = picks[i];
      if (DUMMY) drawMannequin(g, bodies[i], cam, { ink: 2 });
      else actors[a.who].draw(g, sel, bodies[i], cam);
      if (DEBUG) drawSkeleton(g, bodies[i], cam, { width: 2 });
      notes.push(`${a.who}: ${a.action} ${sel.view}${sel.mirror ? " (mirrored)" : ""} cel ${sel.cel}, yaw to camera ${sel.rel.toFixed(0)}`);
    });
    fr.overlay?.(g, cam, bodies);
    if (DEBUG) {
      g.font = "22px monospace"; g.textBaseline = "top";
      [`${shot.name} f${f}`, ...notes].forEach((t, i) => { g.fillStyle = "rgba(0,0,0,0.6)"; g.fillRect(12, 12 + i * 28, g.measureText(t).width + 12, 26); g.fillStyle = "#fff"; g.fillText(t, 18, 14 + i * 28); });
    }
  }
  // Which view a character is on depends on the frames before (hysteresis), so a frame asked for out of order is
  // reached by replaying the choices from the start: the result is the same however the frames are asked for.
  window.renderFrame = (f) => {
    if (f !== last + 1) { actors = {}; for (let k = 0; k < f; k++) step(k, false); }
    step(f, true); last = f;
  };
  window.capture = (type = "image/png", q) => out.toDataURL(type, q);
  window.shotInfo = { name: shot.name, frames: shot.frames, fps: shot.fps ?? 24, width: W, height: H };
  window.ready = true;
} catch (e) { window.failed = String(e.stack || e); }
