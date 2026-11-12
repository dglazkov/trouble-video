// Plays a set shot: the page sets/capture.mjs drives (and a preview: open sets/stage.html?shot=/shots/set_corridor.js&play=1).
// A set shot is a module whose default export is
//   { name, start (seconds into the song), frames, fps = 24, width, height,
//     frame(f, sync) -> { set: "corridor" | "market", camera: { pos, target, fov, up }, options: { ...the set's cues } } }
// f counts from 0 at `start`; the set is given the song frame, so everything is a pure function of the frame number.
import * as THREE from "three";
import { loadSync } from "../engine/sync.js";
import { Post } from "../engine/post.js";

try {
  const Q = new URLSearchParams(location.search), shot = (await import(Q.get("shot"))).default;
  const W = shot.width ?? 1920, H = shot.height ?? 1080, fps = shot.fps ?? 24, f0 = Math.round((shot.start ?? 0) * fps);
  THREE.ColorManagement.enabled = false;
  const canvas = document.getElementById("c");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(1); renderer.setSize(W, H, false); renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  const gl = renderer.getContext(), dbg = gl.getExtension("WEBGL_debug_renderer_info");
  const sync = await loadSync(), post = new Post(renderer, W, H), sets = {};
  const makers = { corridor: () => import("./corridor.js").then((m) => m.createCorridor(renderer, { width: W, height: H, post })), market: () => import("./market.js").then((m) => m.createMarket(renderer, { width: W, height: H, post })) };
  const need = async (name) => sets[name] ?? (sets[name] = await makers[name]());
  for (const s of shot.sets ?? []) await need(s);
  window.renderFrame = async (f) => {
    const fr = shot.frame(f, sync), set = await need(fr.set), t0 = performance.now();
    const info = set.render(fr.camera, f0 + f, sync, fr.options ?? {}); gl.finish();
    return { ms: performance.now() - t0, set: fr.set, camera: fr.camera, wires: info?.wires };
  };
  window.capture = (type = "image/png", q) => canvas.toDataURL(type, q);
  window.shotInfo = { name: shot.name, frames: shot.frames, fps, width: W, height: H, start: shot.start ?? 0, gpu: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "?" };
  window.ready = true;
  if (Q.get("play")) { let f = +(Q.get("from") ?? 0); const tick = async () => { await window.renderFrame(f); f = (f + 1) % shot.frames; setTimeout(tick, 1000 / fps); }; tick(); }
} catch (e) { window.failed = String(e.stack || e); console.error(window.failed); }
