// Plays a shot: the page render.mjs drives. A shot is a module whose default export is
//   { name, frames, fps, width, height, cast: { who: "/kits/NAME" }, frame(f) -> { camera, actors: [{ who, pose, expr }], backdrop(g, cam, bodies) } }
// and frame(f) is a pure function of the frame number. Query: ?shot=/shots/x.js &debug=1 (skeleton and attachment
// points) &mannequin=1 (the dummy instead of the drawings).
import { proportions, solve, camera, held } from "./body.js";
import { createPuppet } from "./puppet.js";
import { drawMannequin, drawSkeleton } from "./mannequin.js";

try {
  const Q = new URLSearchParams(location.search);
  const shot = (await import(Q.get("shot"))).default, DEBUG = Q.get("debug") === "1", DUMMY = Q.get("mannequin") === "1";
  const W = shot.width ?? 1920, H = shot.height ?? 1080;
  const out = document.getElementById("c"); out.width = W; out.height = H;
  const g = out.getContext("2d"), glc = new OffscreenCanvas(W, H);
  const gl = glc.getContext("webgl2", { premultipliedAlpha: true, antialias: true, preserveDrawingBuffer: true });
  if (!gl) throw new Error("no WebGL2");
  const puppet = createPuppet(gl), cast = {};
  for (const [who, base] of Object.entries(shot.cast)) { const kit = await puppet.load(base); cast[who] = { kit, P: proportions(kit.body) }; }
  let actors = {}, last = -1;
  const cameraOf = (fr) => camera({ fov: 30, ...fr.camera, w: W, h: H });

  function step(f, draw) {
    const fr = shot.frame(f), cam = cameraOf(fr), prev = shot.frame(Math.max(0, held(f) - 2));
    const bodies = fr.actors.map((a) => solve(cast[a.who].P, a.pose));
    if (!draw) { fr.actors.forEach((a, i) => (actors[a.who] ??= puppet.actor(cast[a.who].kit)).pick(bodies[i], cam)); return; }
    g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = "#30365e"; g.fillRect(0, 0, W, H);
    fr.backdrop?.(g, cam, bodies);
    const notes = [];
    fr.actors.forEach((a, i) => {
      const act = (actors[a.who] ??= puppet.actor(cast[a.who].kit)), body = bodies[i];
      const sel = act.pick(body, cam);
      if (DUMMY) drawMannequin(g, body, cam, { ink: 2 });
      else {
        const pb = prev.actors[i] ? solve(cast[a.who].P, prev.actors[i].pose) : body;
        const r = act.draw(body, cam, sel, { prev: pb, tick: Math.floor(f / 2), expr: a.expr, w: W, h: H });
        g.drawImage(glc, 0, 0);
        if (DEBUG) {
          for (const m of r.marks) {
            g.strokeStyle = "rgba(255,255,255,0.9)"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(m.A.x, m.A.y); g.lineTo(m.B.x, m.B.y); g.stroke();
            for (const [p, c] of [[m.A, "#ff2020"], [m.B, "#2060ff"]]) { g.fillStyle = c; g.strokeStyle = "#fff"; g.beginPath(); g.arc(p.x, p.y, 5, 0, 7); g.fill(); g.stroke(); }
          }
        }
      }
      if (DEBUG) drawSkeleton(g, body, cam, { width: 2 });
      notes.push(`${a.who}: body ${sel.body.view}${sel.body.mirror ? " (mirrored)" : ""}, head ${sel.head.view}${sel.head.mirror ? " (mirrored)" : ""}, yaw to camera ${sel.rel.toFixed(0)}`);
    });
    fr.overlay?.(g, cam, bodies);
    if (DEBUG) {
      g.font = "22px monospace"; g.textBaseline = "top";
      [`${shot.name} f${f}`, ...notes].forEach((t, i) => { g.fillStyle = "rgba(0,0,0,0.6)"; g.fillRect(12, 12 + i * 28, g.measureText(t).width + 12, 26); g.fillStyle = "#fff"; g.fillText(t, 18, 14 + i * 28); });
    }
  }
  // Which drawing a character is on depends on the frames before (hysteresis), so a frame asked for out of order is
  // reached by replaying the choices from the start: the result is the same however the frames are asked for.
  window.renderFrame = (f) => {
    if (f !== last + 1) { actors = {}; for (let k = 0; k < f; k++) step(k, false); }
    step(f, true); last = f;
  };
  window.capture = (type = "image/png", q) => out.toDataURL(type, q);
  window.shotInfo = { name: shot.name, frames: shot.frames, fps: shot.fps ?? 24, width: W, height: H };
  window.ready = true;
} catch (e) { window.failed = String(e.stack || e); }
