// The station's machines. Two silhouettes, one motif: a single red eye.
//   chaser    a dart the size of a dog: swept blades, a whip aerial, twin thrusters. Comes in swarms.
//   enforcer  a hovering block two metres wide: a brow over a screen-face with one big eye, drum shoulders with
//             thrusters under them, hanging pincers, tape reels on its back, a searchlight.
// Cel-shaded in three tones from the set's key light, with a drawn outline (each solid's dark twin, a little larger,
// seen from inside) on top of the ink the photography pass finds.
//
//   const drones = createDrones(kit, scene);                    // kit: the set's sets/kit.js kit, so they take its light
//   drones.update(list, frame, sync, threeCamera, { thrust });  // every frame; list = specs:
//     { type: "chaser" | "enforcer", pos: [x, y, z], yaw = 0 (degrees; 0 faces +Z, like a character), pitch = 0, roll = 0,
//       scale = 1, eye = 1 (how hard the eye burns, 0..2), thrust = the caller's wire, beam = 0..1 (enforcer's searchlight),
//       sway = 0 (arms and blades), broken = null | seconds since it was destroyed, seed = 0 }
//   chase(frame, sync, o) -> list    a pack following a lead point, lurching on drum hits; see below
//
// Destroyed: at broken = 0 a burst (four frames, hard shapes), then the parts fly apart, fall, and lie where they land.
import * as THREE from "three";
import { Builder, FX, canvasTex, rng, hash, clamp } from "../sets/kit.js";

const D = Math.PI / 180;
function maker(kit, t) {
  const hullMat = kit.mat("#0b0a1e", { kind: 1, side: THREE.BackSide, fog: 1 });
  // one breakable part: solids relative to its pivot `at`
  return (name, at, fn, o = {}) => {
    const b = new Builder(), h = new Builder(), f = new Builder();
    fn({
      box(w, hh, d, x, y, z, m, r) { b.box(w, hh, d, x, y, z, m, r); h.box(w + 2 * t, hh + 2 * t, d + 2 * t, x, y, z, hullMat, r); },
      cyl(r, len, x, y, z, m, axis, seg, r2 = r, rot) { b.cyl(r, len, x, y, z, m, axis, seg, r2, rot); h.cyl(r + t, len + 2 * t, x, y, z, hullMat, axis, seg, r2 + t, rot); },
      ball(r, x, y, z, m, rot, seg) { b.ball(r, x, y, z, m, rot, seg); h.ball(r + t, x, y, z, hullMat, rot, seg); },
      bare: b, fx: f,
    });
    const g = new THREE.Group(); g.add(b.build()); const hull = h.build(); hull.traverse((m) => m.layers.set(FX)); g.add(hull);
    if (f.bins.size) g.add(f.build());
    g.position.set(...at); g.userData = { name, home: at, ...o }; return g;
  };
}

function buildChaser(kit) {
  const { mat } = kit, part = maker(kit, 0.014), navy = mat("#2a2f55", { kind: 5 }), cream = mat("#d9cfb0", { kind: 5 }), black = mat("#14152b", { kind: 5 }), orange = mat("#f07a22", { kind: 5 });
  const eye = mat("#ff2a1e", { kind: 1, fog: 0.5 }), flame = mat("#9feaff", { kind: 1, fog: 0.5 });
  const g = new THREE.Group(), flames = [];
  // a flying eye with knives: the cowl and its eye lead, the body tapers behind, four blades in an X
  g.add(part("body", [0, 0, 0], (p) => {
    p.cyl(0.07, 0.62, 0, 0, -0.08, navy, "z", 6, 0.17, { s: [1, 0.8, 1] });
    p.cyl(0.05, 0.4, 0, 0.09, -0.12, cream, "z", 4, 0.12, { s: [1, 0.5, 1] });
    p.cyl(0.19, 0.12, 0, 0, 0.26, black, "z", 14, 0.15);
    p.cyl(0.2, 0.035, 0, 0, 0.2, orange, "z", 14);
    p.bare.ball(0.115, 0, 0, 0.3, eye, { s: [1, 1, 0.6] }, 14);
  }, { kick: [0, 1.5, 1] }));
  for (const s of [1, -1]) for (const v of [1, -1]) {
    g.add(part("blade", [s * 0.1, v * 0.04, -0.05], (p) => {
      p.box(0.5, 0.018, 0.13, s * 0.26, 0, -0.08, navy, { ry: s * 0.55 }); p.box(0.14, 0.022, 0.135, s * 0.47, 0, -0.21, orange, { ry: s * 0.55 });
    }, { kick: [s * 3, v * 2 + 1, -0.5], sway: s * v, dihedral: s * v * 0.5 }));
  }
  for (const s of [1, -1]) {
    g.add(part("thruster", [s * 0.07, 0, -0.42], (p) => { p.cyl(0.05, 0.2, 0, 0, 0, black, "z", 10, 0.045); p.cyl(0.056, 0.04, 0, 0, -0.08, orange, "z", 10); }, { kick: [s * 1.2, 0.5, -3] }));
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.32, 8).rotateX(-Math.PI / 2).translate(0, 0, -0.16), flame); f.position.set(s * 0.07, 0, -0.52); f.frustumCulled = false; f.layers.set(FX); g.add(f); flames.push(f);
  }
  g.add(part("tail", [0, 0.08, -0.2], (p) => {
    p.cyl(0.009, 0.7, 0.0, 0.3, -0.14, black, "y", 5, 0.006, { rx: -0.5 }); p.bare.ball(0.022, 0.0, 0.6, -0.31, eye);
  }, { kick: [0.5, 3, -1.5] }));
  return { group: g, flames, eyeAt: [0, 0, 0.36], haloSize: 0.42, radius: 0.45 };
}

function buildEnforcer(kit, reels) {
  const { mat } = kit, part = maker(kit, 0.024), beige = mat("#c9bf9d", { kind: 5 }), shade = mat("#968d72", { kind: 5 }), gun = mat("#3a3f6a", { kind: 5 }), black = mat("#14152b", { kind: 5 }), orange = mat("#f07a22", { kind: 5 });
  const eye = mat("#ff2a1e", { kind: 1, fog: 0.5 }), flame = mat("#ffb46a", { kind: 1, fog: 0.5 });
  const code = canvasTex(256, 96, (c) => { c.fillStyle = "#14152b"; c.font = 'bold 80px "DejaVu Sans Mono", monospace'; c.fillText("E-02", 6, 76); });
  const g = new THREE.Group(), flames = [];
  const fl = (x, y, z, r, len) => { const f = new THREE.Mesh(new THREE.ConeGeometry(r, len, 10).rotateX(Math.PI).translate(0, -len / 2, 0), flame); f.position.set(x, y, z); f.frustumCulled = false; f.layers.set(FX); g.add(f); flames.push(f); };
  g.add(part("core", [0, 0, 0], (p) => {
    p.box(1.15, 0.95, 1.1, 0, 0, 0, beige);
    p.box(1.19, 0.16, 1.14, 0, -0.3, 0, shade); p.box(1.19, 0.05, 1.14, 0, 0.2, 0, shade);
    p.box(1.36, 0.3, 0.8, 0, 0.44, 0.34, gun, { rx: 0.24 });                                 // the brow, low over the eye
    p.box(0.98, 0.66, 0.1, 0, -0.02, 0.56, black);                                           // the face: a dead screen
    p.cyl(0.3, 0.1, 0, 0.0, 0.62, gun, "z", 20); p.cyl(0.24, 0.1, 0, 0.0, 0.64, black, "z", 20);
    p.bare.ball(0.18, 0, 0.0, 0.66, eye, { s: [1, 1, 0.5] }, 16);
    p.box(1.0, 0.26, 0.5, 0, -0.52, 0.5, gun, { rx: -0.5 });                                 // the jaw: a prow under the face
    p.box(1.04, 0.08, 0.3, 0, -0.44, 0.7, orange, { rx: -0.5 });
    for (const s of [1, -1]) p.bare.quad([s * 0.578, 0.32, -0.1], [0, 0, -s], [0, 1, 0], 0.5, 0.19, mat("#14152b", { kind: 4, map: code }));
    p.box(0.95, 0.12, 0.72, 0, 0.53, -0.16, gun);                                            // the tape deck on its back
    p.bare.quad([0, 0.595, -0.16], [1, 0, 0], [0, 0, -1], 0.84, 0.42, mat("#e6dcc0", { kind: 9, gain: reels, offset: 1 }));
    p.cyl(0.42, 0.34, 0, -0.62, 0, gun, "y", 16, 0.3); p.cyl(0.32, 0.08, 0, -0.8, 0, orange, "y", 16);
  }, { kick: [0, 0.6, 0.6], heavy: 1 }));
  fl(0, -0.82, 0, 0.2, 0.6);
  g.add(part("mast", [-0.42, 0.6, -0.42], (p) => {
    p.cyl(0.02, 0.9, 0, 0.45, 0, black, "y", 6); p.ball(0.12, 0, 0.74, 0, beige, { s: [1, 0.35, 1] }); p.bare.ball(0.035, 0, 0.93, 0, eye);
    p.cyl(0.012, 0.6, 0.2, 0.3, 0.05, black, "y", 5, 0.008, { rz: -0.2 });
  }, { kick: [-1, 4, -1] }));
  for (const s of [1, -1]) {
    g.add(part("shoulder", [s * 0.9, 0.12, 0], (p) => {
      p.cyl(0.32, 1.0, 0, 0, 0, gun, "z", 16);
      for (const z of [0.3, -0.3]) p.cyl(0.335, 0.12, 0, 0, z, orange, "z", 16);
      p.cyl(0.22, 0.06, 0, 0, 0.5, black, "z", 16);
      p.cyl(0.25, 0.26, 0, -0.38, 0, black, "y", 12, 0.17);
    }, { kick: [s * 3.2, 1.8, 0.4] }));
    fl(s * 0.9, -0.38, 0, 0.11, 0.4);
    g.add(part("arm", [s * 1.08, -0.1, 0.2], (p) => {
      p.box(0.17, 0.62, 0.17, 0, -0.33, 0.06, beige, { rx: -0.2 });
      p.ball(0.12, 0, -0.66, 0.13, gun);
      p.box(0.07, 0.5, 0.1, 0.07, -0.9, 0.24, black, { rx: -0.5, rz: 0.18 }); p.box(0.07, 0.5, 0.1, -0.07, -0.9, 0.24, black, { rx: -0.5, rz: -0.18 });
      p.box(0.06, 0.2, 0.08, 0.05, -1.14, 0.42, orange, { rx: -1.1, rz: -0.3 }); p.box(0.06, 0.2, 0.08, -0.05, -1.14, 0.42, orange, { rx: -1.1, rz: 0.3 });
    }, { kick: [s * 2.2, -0.2, 1.6], sway: s }));
  }
  // the searchlight: a flat cone of light from the eye
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.1, 9, 20, 1, true).rotateX(Math.PI / 2).translate(0, 0, 4.5), mat("#ff5a48", { kind: 7, alpha: 0.2, additive: true, fog: 0.4, side: THREE.FrontSide }));
  beam.position.set(0, 0.0, 0.66); beam.rotation.x = 0.2; beam.frustumCulled = false; beam.layers.set(FX); beam.renderOrder = 11; g.add(beam);
  return { group: g, flames, beam, eyeAt: [0, 0.0, 0.76], haloSize: 0.85, radius: 1.3 };
}

export function createDrones(kit, scene) {
  const reels = { value: 0 }, root = new THREE.Group(); scene.add(root);
  const haloTex = canvasTex(256, 256, (c) => {
    c.fillStyle = "rgba(255,255,255,0.22)"; c.beginPath(); c.arc(128, 128, 78, 0, 7); c.fill();
    c.fillStyle = "rgba(255,255,255,0.5)"; c.beginPath(); c.arc(128, 128, 40, 0, 7); c.fill();
    c.fillStyle = "rgba(255,255,255,0.8)"; c.beginPath(); c.moveTo(0, 128); c.lineTo(128, 122); c.lineTo(256, 128); c.lineTo(128, 134); c.fill();
  });
  const haloMat = kit.mat("#ff3a2a", { kind: 7, flag: 1, map: haloTex, additive: true, fog: 0.3 });
  const burstMat = kit.mat("#fff6d8", { kind: 1, fog: 0.2 }), burst2 = kit.mat("#ff8a2a", { kind: 1, fog: 0.2 }), smokeMat = kit.mat("#a9abd6", { kind: 1, fog: 1 }), smokeHull = kit.mat("#0b0a1e", { kind: 1, side: THREE.BackSide, fog: 1 });
  const spike = (() => { const g = new THREE.IcosahedronGeometry(1, 0), p = g.attributes.position; for (let i = 0; i < p.count; i += 3) { const k = 0.35 + 1.3 * hash(i, 4); for (let j = 0; j < 3; j++) { const x = p.getX(i + j), y = p.getY(i + j), z = p.getZ(i + j); p.setXYZ(i + j, x * (j ? 0.35 : k), y * (j ? 0.35 : k), z * (j ? 0.35 : k)); } } g.computeVertexNormals(); return g; })();
  const ballG = new THREE.SphereGeometry(1, 18, 12);
  const proto = { chaser: buildChaser(kit), enforcer: buildEnforcer(kit, reels) }, pools = { chaser: [], enforcer: [] };
  function instance(type) {
    const P = proto[type], g = P.group.clone(true), o = { g, parts: [], flames: [], beam: null };
    g.children.forEach((c, i) => { const src = P.group.children[i]; if (P.flames.includes(src)) o.flames.push(c); else if (src === P.beam) o.beam = c; else if (src.userData.name) o.parts.push(c); });
    o.halo = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), haloMat); o.halo.layers.set(FX); o.halo.renderOrder = 12; o.halo.frustumCulled = false; g.add(o.halo);
    o.burst = [burstMat, burst2].map((m) => { const b = new THREE.Mesh(spike, m); b.layers.set(FX); b.frustumCulled = false; g.add(b); return b; });
    o.smoke = [0, 1, 2, 3, 4].map(() => { const b = new THREE.Mesh(ballG, smokeMat); b.frustumCulled = false; const h = new THREE.Mesh(ballG, smokeHull); h.scale.setScalar(1.07); h.layers.set(FX); h.frustumCulled = false; b.add(h); g.add(b); return b; });
    root.add(g); return o;
  }
  const q = new THREE.Quaternion(), e = new THREE.Euler();
  function update(list, frame, sync, camera, wires = {}) {
    reels.value = frame / sync.fps * 3;
    const used = { chaser: 0, enforcer: 0 };
    for (const s of list) {
      const P = proto[s.type]; if (!P) throw new Error(`drones: no type "${s.type}"`);
      const pl = pools[s.type], o = pl[used[s.type]] ?? (pl[used[s.type]] = instance(s.type)); used[s.type]++;
      const g = o.g, seed = s.seed ?? 0, sc = s.scale ?? 1, br = s.broken ?? null, alive = br === null || br < 0;
      g.visible = true; g.position.set(...s.pos); g.scale.setScalar(sc);
      g.rotation.set(-(s.pitch ?? 0) * D, (s.yaw ?? 0) * D, (s.roll ?? 0) * D, "YXZ");
      const thrust = s.thrust ?? wires.thrust ?? 0, eye = s.eye ?? 1, sway = s.sway ?? 0;
      o.parts.forEach((p, i) => {
        const u = p.userData, h = u.home;
        if (alive) { p.position.set(h[0], h[1], h[2]); p.rotation.set(u.sway && s.type !== "chaser" ? Math.sin(frame * 0.35 + seed) * 0.12 * (1 + sway) : 0, 0, u.dihedral ? u.dihedral + u.sway * 0.14 * thrust : 0); return; }
        // thrown: out along its kick, tumbling, then down; it lies where it lands
        const r = rng(seed * 131 + i * 17 + 5), k = u.kick ?? [0, 1, 0], v = [k[0] * (0.8 + r() * 0.8) + (r() - 0.5) * 1.5, k[1] * (0.7 + r()) + 1.2, k[2] * (0.8 + r() * 0.8) + (r() - 0.5) * 1.5 + (s.carry ?? 0)];
        const floor = (0.12 - s.pos[1]) / sc - h[1] + (u.heavy ? 0.35 : 0), gA = 9.8 / sc;
        const tHit = (v[1] + Math.sqrt(Math.max(0, v[1] * v[1] - 2 * gA * floor))) / gA, tt = Math.min(br, tHit), slide = Math.max(0, br - tHit), sl = (1 - Math.exp(-slide * 4)) * 0.12;
        p.position.set(h[0] + v[0] * (tt + sl), h[1] + v[1] * tt - 0.5 * gA * tt * tt, h[2] + v[2] * (tt + sl));
        const w = [(r() - 0.5) * 14, (r() - 0.5) * 14, (r() - 0.5) * 14]; p.rotation.set(w[0] * tt, w[1] * tt, w[2] * tt);
      });
      const flick = 0.75 + 0.5 * hash(frame, seed, 3);
      o.flames.forEach((f) => { f.visible = alive; const k = (0.55 + 1.1 * thrust) * flick; if (s.type === "chaser") f.scale.set(1, 1, k); else f.scale.set(1, k, 1); });
      if (o.beam) { o.beam.visible = alive && (s.beam ?? 0) > 0.01; o.beam.scale.setScalar(0.3 + 0.7 * (s.beam ?? 0)); o.beam.rotation.x = 0.2 + (s.beamTilt ?? 0); }
      // the eye's halo faces the camera, a little toward it so the body does not cut it
      const core = o.parts[0], hs = P.haloSize * (0.55 + 0.3 * eye + 0.5 * thrust) * (hash(frame >> 1, seed, 9) > 0.12 ? 1 : 0.6);
      o.halo.visible = alive && eye > 0.02;
      if (o.halo.visible) {
        g.updateMatrixWorld(true); const wp = new THREE.Vector3(...P.eyeAt).applyMatrix4(g.matrixWorld), toCam = camera.position.clone().sub(wp).normalize().multiplyScalar(0.12 * sc);
        g.worldToLocal(wp.add(toCam)); o.halo.position.copy(wp); g.getWorldQuaternion(q); o.halo.quaternion.copy(q.invert()).multiply(camera.quaternion); o.halo.scale.set(hs * 1.6, hs, 1);
      }
      // burst and smoke
      const bf = alive ? -1 : Math.floor(br * sync.fps);
      o.burst.forEach((b, i) => { b.visible = bf >= i * 2 && bf < i * 2 + 2 + i; if (b.visible) { b.scale.setScalar(P.radius * (1.1 + bf * 0.5)); b.rotation.set(seed + bf * 1.3, seed * 2 + bf, 0); } });
      o.smoke.forEach((b, i) => {
        b.visible = bf >= 2 && br < 1.1; if (!b.visible) return; const r = rng(seed * 7 + i * 3 + 1), a = r() * 6.28, d = P.radius * (0.4 + r() * 0.7), life = clamp(br / 1.1);
        b.position.set(Math.cos(a) * d * (1 + br), 0.2 + r() * 0.5 + br * 0.9, Math.sin(a) * d * (1 + br)); b.scale.setScalar(P.radius * (0.35 + r() * 0.3) * (0.4 + life * 1.2) * (life > 0.6 ? (1 - life) / 0.4 : 1));
      });
      core.visible = true;
    }
    for (const t in pools) for (let i = used[t]; i < pools[t].length; i++) pools[t][i].g.visible = false;
  }
  return { update, types: Object.keys(proto) };
}

// A pack on the kids' tail. o = { type = "chaser", n = 8, lead: [x, y, z] the point the pack's head is at this frame,
//   yaw = 0 the way it flies (degrees), spread: [across, up, back] metres the pack occupies behind the lead,
//   seed, lurch = 0.6 metres each member jumps forward on a drum hit it answers, weave = 1, broken: { [i]: seconds } }
// Pure: the same frame gives the same pack.
export function chase(frame, sync, o) {
  const n = o.n ?? 8, type = o.type ?? "chaser", sp = o.spread ?? [3.4, 1.6, 14], t = frame / sync.fps, yaw = (o.yaw ?? 0) * D, fwd = [Math.sin(yaw), 0, Math.cos(yaw)], right = [Math.cos(yaw), 0, -Math.sin(yaw)];
  const drums = sync.at(frame).stems.drums, out = [];
  for (let i = 0; i < n; i++) {
    const r = rng((o.seed ?? 1) * 977 + i * 31), a = r(), b = r(), c = r(), f1 = 1.2 + r() * 1.6, f2 = 0.9 + r() * 1.4, ph = r() * 6.28;
    const answers = hash(drums.index, i, o.seed ?? 1) > 0.35, pulse = answers && drums.since < 1 ? Math.exp(-drums.since / 0.14) : 0;
    const w = o.weave ?? 1, heavy = type === "enforcer";
    const across = (a - 0.5) * sp[0] + Math.sin(t * f1 + ph) * 0.35 * w, up = (b - 0.5) * sp[1] + Math.sin(t * f2 + ph * 1.7) * (heavy ? 0.08 : 0.22) * w;
    const back = (i === 0 ? 0 : Math.pow(c, 0.8) * sp[2]) - pulse * (o.lurch ?? 0.6);
    const pos = [o.lead[0] + right[0] * across - fwd[0] * back, o.lead[1] + up, o.lead[2] + right[2] * across - fwd[2] * back];
    out.push({ type, pos, yaw: o.yaw ?? 0, roll: -Math.cos(t * f1 + ph) * (heavy ? 3 : 16) * w, pitch: (heavy ? -6 : -8) - pulse * 10, eye: 0.8 + pulse * 0.9, thrust: pulse, beam: heavy ? 1 : 0, beamTilt: heavy ? 0.1 * Math.sin(t * 1.3 + ph) : 0,
      sway: pulse, seed: (o.seed ?? 1) * 100 + i, broken: o.broken?.[i] ?? null, carry: o.carry ?? 0, scale: o.scale ?? 1 });
  }
  return out;
}
