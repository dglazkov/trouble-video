// Draws a kit (drawn body parts, five views) on a projected skeleton. Every part is a small textured mesh hung
// between two projected joints, which the kit says where to find in the part's image. What makes it read as a drawing
// rather than a paper doll:
//  - layering is worked out per frame from depth: far limbs, then the trunk stack (collar back, neck, hips, trunk,
//    head), then near limbs; a garment that wraps the body is two layers with the neck between them;
//  - where two parts of one limb meet, the upper one loses its ink outline round the joint (its alpha comes from an
//    eroded copy there), so no line crosses a knee or a hip;
//  - past a flexion threshold a leg is one bent drawing skinned to both bones;
//  - hair and hem lag behind the head and hips; far limbs are tinted down.
import { clamp, SIDES, relativeYaw } from "./body.js";
import { picker } from "./views.js";

const GX = 8, GY = 16, BEND = 80, TWIST = 9, FAR_TINT = [0.76, 0.74, 0.84];
const VS = `#version 300 es
in vec2 p; in vec2 uv; out vec2 v; out vec2 sp; uniform vec2 size;
void main(){ v = uv; sp = p; gl_Position = vec4(p.x / size.x * 2. - 1., 1. - p.y / size.y * 2., 0., 1.); }`;
const FS = `#version 300 es
precision highp float; in vec2 v; in vec2 sp; out vec4 o;
uniform sampler2D t, tin; uniform vec3 tint; uniform vec3 soft[3];   // soft: centre xy, radius (0 = none)
void main(){ vec4 c = texture(t, v, -0.5); float a = c.a, w = 0.;
  for (int i = 0; i < 3; i++) if (soft[i].z > 0.) w = max(w, 1. - smoothstep(soft[i].z * .72, soft[i].z, distance(sp, soft[i].xy)));
  if (w > 0.) a = mix(a, min(a, texture(tin, v).r), w);
  o = vec4(c.rgb * tint * a, a); }`;

export function createPuppet(gl) {
  const sh = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
  gl.bindAttribLocation(prog, 0, "p"); gl.bindAttribLocation(prog, 1, "uv"); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  const U = (n) => gl.getUniformLocation(prog, n);
  const vbuf = gl.createBuffer(), ibuf = gl.createBuffer();
  const idx = [];
  for (let j = 0; j < GY; j++) for (let i = 0; i < GX; i++) { const a = j * (GX + 1) + i, b = a + 1, c = a + GX + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibuf); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
  const verts = new Float32Array((GX + 1) * (GY + 1) * 4);

  async function texture(url) {
    const im = new Image(); im.src = url; await im.decode();
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, im); gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  // kit.json -> a kit with its textures loaded. base: the kit's folder URL.
  async function load(base) {
    const kit = await (await fetch(base + "/kit.json")).json(), jobs = [];
    for (const v of Object.values(kit.views)) for (const p of Object.values(v.parts)) {
      jobs.push(texture(`${base}/${p.img}`).then((t) => { p.tex = t; }));
      jobs.push(texture(`${base}/${p.img.replace(".png", "_in.png")}`).then((t) => { p.texIn = t; }));
      p.vtex = {};
      for (const [n, f] of Object.entries(p.variants ?? {})) jobs.push(texture(`${base}/${f}`).then((t) => { p.vtex[n] = t; }));
    }
    await Promise.all(jobs);
    return kit;
  }

  function begin(w, h) {
    gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(prog); gl.uniform2f(U("size"), w, h);
    gl.uniform1i(U("t"), 0); gl.uniform1i(U("tin"), 1);
    gl.bindBuffer(gl.ARRAY_BUFFER, vbuf); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibuf);
    gl.enableVertexAttribArray(0); gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 16, 0); gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 16, 8);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  }
  function flush(p, o) {
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.DYNAMIC_DRAW);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, (o.variant && p.vtex[o.variant]) || p.tex);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, p.texIn);
    gl.uniform3fv(U("tint"), o.tint ?? [1, 1, 1]);
    const s = new Float32Array(9); (o.soft ?? []).slice(0, 3).forEach((z, i) => s.set(z, i * 3));
    gl.uniform3fv(U("soft"), s);
    gl.drawElements(gl.TRIANGLES, GX * GY * 6, gl.UNSIGNED_SHORT, 0);
  }

  // One part between two projected joints A and B ({x, y, s}). o: { flip, uniform, warp(lx, ly, t01) -> [dx, dy], tint,
  // soft, variant }. Along the bone the drawing follows the projected length (so a limb swung toward the camera
  // shortens) while its rounded ends keep their size; across, it scales with each joint's distance from the camera.
  function part(p, A, B, o = {}) {
    const a = p.pts.a, b = p.pts.b, ex = b[0] - a[0], ey = b[1] - a[1], L = Math.hypot(ex, ey), ux = ex / L, uy = ey / L;
    let fx = B.x - A.x, fy = B.y - A.y, L2 = Math.hypot(fx, fy);
    const Ka = A.s / p.k, Kb = B.s / p.k, Km = (Ka + Kb) / 2;
    if (L2 < 1e-3) { fx = 0; fy = 1; L2 = 1e-3; }
    fx /= L2; fy /= L2;
    if (o.uniform) L2 = L * Km;
    const nx = o.flip ? fy : -fy, ny = o.flip ? -fx : fx;
    let n = 0;
    for (let j = 0; j <= GY; j++) for (let i = 0; i <= GX; i++) {
      const lx = i / GX * p.w, ly = j / GY * p.h, dx = lx - a[0], dy = ly - a[1];
      const t = dx * ux + dy * uy, s = -dx * uy + dy * ux, t01 = clamp(t / L);
      const al = t < 0 ? t * Ka : t > L ? L2 + (t - L) * Kb : t / L * L2, ws = Ka + (Kb - Ka) * t01;
      let x = A.x + fx * al + nx * s * ws, y = A.y + fy * al + ny * s * ws;
      if (o.warp) { const d = o.warp(lx, ly, t / L); x += d[0]; y += d[1]; }
      verts[n++] = x; verts[n++] = y; verts[n++] = lx / p.w; verts[n++] = ly / p.h;
    }
    flush(p, o);
  }
  // A whole bent-leg drawing skinned to two bones: each vertex follows the thigh or the shin frame (both hinged at
  // the knee), blended across the knee, so one drawing covers a range of knee angles.
  function bent(p, H, K, A, o = {}) {
    const P = p.pts, un = (a, b) => { const d = [b[0] - a[0], b[1] - a[1]], l = Math.hypot(d[0], d[1]) || 1e-3; return [d[0] / l, d[1] / l, l]; };
    const ut = un(P.hip, P.knee), us = un(P.knee, P.ankle), vt = un([H.x, H.y], [K.x, K.y]), vs = un([K.x, K.y], [A.x, A.y]);
    const kt = vt[2] / ut[2], ks = vs[2] / us[2], kw = K.s / p.k * (o.flip ? -1 : 1);
    const nn = un([0, 0], [ut[0] + us[0], ut[1] + us[1]]), band = 0.3 * p.k;
    const xf = (dx, dy, u, v, kl) => { const t = dx * u[0] + dy * u[1], s = -dx * u[1] + dy * u[0]; return [K.x + v[0] * t * kl - v[1] * s * kw, K.y + v[1] * t * kl + v[0] * s * kw]; };
    let n = 0;
    for (let j = 0; j <= GY; j++) for (let i = 0; i <= GX; i++) {
      const lx = i / GX * p.w, ly = j / GY * p.h, dx = lx - P.knee[0], dy = ly - P.knee[1];
      let w = clamp((dx * nn[0] + dy * nn[1]) / band + 0.5); w = w * w * (3 - 2 * w);
      const a = xf(dx, dy, ut, vt, kt), b = xf(dx, dy, us, vs, ks);
      verts[n++] = a[0] + (b[0] - a[0]) * w; verts[n++] = a[1] + (b[1] - a[1]) * w; verts[n++] = lx / p.w; verts[n++] = ly / p.h;
    }
    flush(p, o);
  }

  // An actor keeps what must persist between frames: which drawing each of body and head is on (with hysteresis).
  function actor(kit) {
    const pickBody = picker(), pickHead = picker();
    // pick(body, cam): which drawings this frame is on. Call it once per frame, in frame order.
    function pick(body, cam) {
      const { q } = body, root = [q.x, 0, q.z], rel = relativeYaw(cam, root, q.yaw);
      return { rel, body: pickBody(rel), head: pickHead(relativeYaw(cam, root, q.yaw + q.twist * 0.6 + q.head.yaw)) };
    }
    // draw(body, cam, picked, o): o = { prev: the body one held frame ago (for lag), tick: held-frame counter, expr, w, h }
    function draw(body, cam, picked, o = {}) {
      const { J, q, P } = body, pj = (v) => cam.project(v);
      const sel = picked.body, V = kit.views[sel.view], m = sel.mirror, selH = picked.head, VH = kit.views[selH.view];
      const marks = [];
      const other = (s) => s === "L" ? "R" : "L";
      // the kit's drawing for a part of the character: a mirrored view shows the other side's drawing, flipped; a kit
      // with only one side drawn mirrors that one
      const find = (kind, side) => {
        if (!side) return V.parts[kind] ? { p: V.parts[kind], flip: m } : null;
        const ks = m ? other(side) : side;
        if (V.parts[`${kind}_${ks}`]) return { p: V.parts[`${kind}_${ks}`], flip: m };
        if (V.parts[`${kind}_${other(ks)}`]) return { p: V.parts[`${kind}_${other(ks)}`], flip: !m };
        return null;
      };
      const jt = (name, side) => { const [a, b] = name.split("."); return b ? J[side ?? a][b] : J[a]; };
      const zc = pj(J.chest).z, zh = pj(J.hips).z;
      const tintAt = (z, ref) => { const k = clamp((z - ref) / 0.16); return [0, 1, 2].map((i) => 1 + (FAR_TINT[i] - 1) * k); };
      const hang = (kind, side, o2 = {}) => {
        const f = o2.as && V.parts[o2.as] ? { p: V.parts[o2.as], flip: m } : find(kind, side); if (!f) return;
        const A = pj(jt(f.p.joints.a, side)), B = pj(jt(f.p.joints.b, side));
        part(f.p, A, B, { ...o2, flip: f.flip });
        marks.push({ name: kind + (side ? "_" + side : ""), A, B });
      };
      const zone = (v, r) => { const c = pj(v); return [c.x, c.y, r * c.s]; };

      // lag of head and hips against the last held drawing, in screen pixels
      const prev = o.prev ?? body, tick = o.tick ?? 0;
      const d2 = (a, b) => { const p0 = pj(a), p1 = cam.project(b); return [p1.x - p0.x, p1.y - p0.y]; };
      const lagH = d2(J.head, prev.J.head).map((v) => clamp(v, -40, 40)), lagT = d2(J.hips, prev.J.hips).map((v) => clamp(v, -40, 40));
      const wave = (ph) => Math.sin(tick * Math.PI / 2 + ph);

      begin(o.w ?? cam.w, o.h ?? cam.h);
      const arm = (side) => {
        const j = J[side], zs = pj(j.sh).z, ze = pj(j.elbow).z, zw = pj(j.wrist).z, tint = tintAt((zs + ze) / 2, zc);
        const up = () => hang("uarm", side, { tint }), fore = () => hang("farm", side, { tint });
        if (zw < ze - 0.1) { up(); fore(); } else { fore(); up(); }            // the sleeve covers the elbow unless the forearm points at the camera
      };
      const leg = (side, over) => {
        const j = J[side], tint = tintAt(pj(j.hip).z, zh), R = P.r.thigh + P.pad.thigh;
        // seen from the side the trouser cuff hangs over the shoe; seen straight on, the shoe stands in front of it
        const shoeOver = sel.yaw === 0 || sel.yaw === 180;
        if (!shoeOver) hang("shoe", side, { tint });
        const b = j.kneeFlex > BEND ? find("bent", side) : null;
        if (b) {
          bent(b.p, pj(j.hip), pj(j.knee), pj(j.ankle), { flip: b.flip, tint, soft: over ? [zone(j.hip, R * 1.5)] : [] });
          marks.push({ name: "bent_" + side, A: pj(j.hip), B: pj(j.knee) }, { name: "", A: pj(j.knee), B: pj(j.ankle) });
          if (shoeOver) hang("shoe", side, { tint });
          return;
        }
        const kz = zone(j.knee, (P.r.knee + P.pad.thigh) * 1.7);
        const thigh = (s) => hang("thigh", side, { tint, soft: (over ? [zone(j.hip, R * 1.5)] : []).concat(s ? [kz] : []) });
        const shin = (s) => hang("shin", side, { tint, soft: s ? [kz] : [] });
        if (pj(j.ankle).z < pj(j.hip).z - 0.02) { thigh(false); shin(true); if (shoeOver) hang("shoe", side, { tint }); }
        else { shin(false); if (shoeOver) hang("shoe", side, { tint }); thigh(true); }
      };
      // far to near
      const armZ = (s) => (pj(J[s].sh).z + pj(J[s].elbow).z + pj(J[s].wrist).z) / 3;
      const arms = SIDES.slice().sort((a, b) => armZ(b) - armZ(a)), behind = (s) => armZ(s) - zc > 0.05;
      const legZ = (s) => pj(J[s].hip).z + 0.25 * pj(J[s].knee).z;
      const legs = SIDES.slice().sort((a, b) => legZ(b) - legZ(a));
      const over = (s) => pj(J[s].hip).z < zh - 0.02 || pj(J[s].knee).z < pj(J[s].hip).z - 0.14;
      for (const s of arms) if (behind(s)) arm(s);
      for (const s of legs) if (!over(s)) leg(s, false);
      const hemWarp = (lx, ly, t) => { const w = clamp((0.3 - t) / 0.3); return [w * (lagT[0] * 0.8 + 2.5 * wave(lx * 0.02)), w * (lagT[1] * 0.9 + 2 * wave(lx * 0.03 + 2))]; };
      hang("collar_back", null);
      hang("neck", null);
      // the hips lose their outline over each leg tucked under them, and between the legs when both are
      const under = legs.filter((s) => !over(s)), hipR = (P.r.thigh + P.pad.thigh) * 1.5;
      hang("pelvis", null, { soft: under.map((s) => zone(J[s].hip, hipR)).concat(under.length === 2 ? [zone([0, 1, 2].map((i) => J.hips[i] - body.F.root.Y[i] * hipR * 0.7), hipR)] : []) });
      for (const s of legs) if (over(s)) leg(s, true);
      // the trunk swaps to a twisted drawing when the chest turns against the hips, if the kit has one for this view
      const tw = q.twist * (m ? -1 : 1);
      hang("torso", null, { warp: hemWarp, as: tw > TWIST ? "torso_twp" : tw < -TWIST ? "torso_twn" : null });
      for (const s of arms) if (!behind(s)) arm(s);
      // the head has its own view: it turns further than the body does
      const hp = VH.parts.head;
      if (hp) {
        const A = pj(J.headBase), B = pj(J.crown), sk = hp.skull, hk = A.s / hp.k;
        const up = [(hp.pts.b[0] - hp.pts.a[0]), (hp.pts.b[1] - hp.pts.a[1])], hh = Math.hypot(up[0], up[1]);
        const jaw = [hp.pts.a[0] + up[0] * 0.24 + hp.faceDir[0] * 0.13 * hh, hp.pts.a[1] + up[1] * 0.24, 0.36 * hh];
        const hairWarp = (lx, ly) => {
          const dS = Math.hypot(lx - sk[0], ly - sk[1]), dJ = Math.hypot(lx - jaw[0], ly - jaw[1]);
          const w = clamp((dS - sk[2] * 0.85) / (sk[2] * 0.7)) * clamp((dJ - jaw[2]) / (jaw[2] * 0.4));
          return [w * hk * 14 * (lagH[0] / 12 + 0.25 * wave(lx * 0.012 + ly * 0.01)), w * hk * 14 * (lagH[1] / 12 + 0.2 * wave(lx * 0.015 + 1.3))];
        };
        part(hp, A, B, { flip: selH.mirror, uniform: true, warp: hairWarp, variant: o.expr, soft: [zone(J.headBase, P.r.neck * 1.25)] });
        marks.push({ name: "head", A, B });
      }
      return { marks };
    }
    return { kit, pick, draw };
  }
  return { load, actor };
}
