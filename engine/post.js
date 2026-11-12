// The photography pass: what a rostrum camera did to painted backgrounds and cels. In: a scene colour buffer and its
// normal/depth buffer (for ink lines), and optionally a character layer and an effects layer (premultiplied RGBA
// textures the size of the frame). Out: the finished frame, on the canvas or a target.
//
//   const post = new Post(renderer, 1920, 1080);
//   post.capture(scene, camera, { clear: 0x124a6b });   // or draw into post.scene / post.nd yourself
//   post.finish({ ...params });                         // see DEFAULTS; every number is a plain value per frame
//
// Layers on the scene camera: objects on layer 1 (kit.js FX: beams, steam) are in the colour buffer but not in the
// normal/depth buffer, so they get no ink line.
import * as THREE from "three";

export const DEFAULTS = {
  mode: 0,                 // 0 photographed normally; 1 impact frame: the picture reduced to `impact`'s palette
  impact: { dark: [0.02, 0.0, 0.06], mid: [1.0, 0.15, 0.55], light: [1, 1, 1], ink: [0, 0, 0], thresholds: [0.3, 0.55] },
  char: null, fx: null,    // THREE.Texture layers, premultiplied alpha; fx goes over everything before the lens
  ink: 0.9, inkColor: [0.06, 0.03, 0.15], inkWidth: 1.25, inkFar: 0.03,   // background ink lines; inkFar thins them with distance
  focus: [0.5, 0.5],       // where radial blurs converge (uv, y up)
  bgBlur: 0,               // radial speed blur of the background, fraction of the distance to the focus
  bgStreak: [0, 0],        // linear smear of the background (uv units), for a tracking shot
  dark: 0,                 // dim the background under the cels
  charBlur: 0, charFog: 0, fogColor: [0.07, 0.27, 0.42],     // the character layer sunk into the set's air
  charTint: [0.97, 0.955, 1.0],                              // the set's ambient on the cels
  wrap: 0.5, wrapRadius: 7,                                  // light wrap: the blurred background bleeding over cel edges
  bloom: 0.85, bloomThreshold: 0.62, diffusion: 0.25,        // glow of the bright parts; a soft screen of the whole
  ca: 0.0012, vignette: 0.42, grain: 0.035, sat: 1.05, contrast: 0.3, flash: 0, seed: 0,
  shadowTint: [0.018, 0.0, 0.045],                           // what the darks drift toward
};

const VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const COMP = `
uniform sampler2D tScene, tND, tChar, tFx, tSoft; uniform vec2 uRes, uFocus, uStreak; uniform float uBlur, uCharFog, uDark, uCharBlur, uInk, uInkW, uInkFar, uWrap, uWrapR; uniform int uMode;
uniform vec3 uFogCol, uInkCol, uCharTint, uImpDark, uImpMid, uImpLight, uImpInk; uniform vec2 uImpThr;
varying vec2 vUv;
float luma(vec3 c){ return dot(c, vec3(0.299,0.587,0.114)); }
void main(){
  vec2 dir = vUv-uFocus;
  vec3 bg = vec3(0.0);
  for(int i=0;i<14;i++){ float k = float(i)/13.0; bg += texture2D(tScene, vUv - dir*uBlur*k - uStreak*(k-0.5)).rgb; }
  bg /= 14.0;
  vec2 px = uInkW/uRes;
  vec4 c = texture2D(tND, vUv), a = texture2D(tND, vUv+vec2(px.x,0.0)), b = texture2D(tND, vUv-vec2(px.x,0.0)), d = texture2D(tND, vUv+vec2(0.0,px.y)), e = texture2D(tND, vUv-vec2(0.0,px.y));
  float z = max(c.a, 0.01);
  float dd = (abs(1.0/max(a.a,0.01) + 1.0/max(b.a,0.01) - 2.0/z) + abs(1.0/max(d.a,0.01) + 1.0/max(e.a,0.01) - 2.0/z))*z;
  float nd = length(a.rgb-c.rgb)+length(b.rgb-c.rgb)+length(d.rgb-c.rgb)+length(e.rgb-c.rgb);
  float edge = max(smoothstep(0.012, 0.035, dd), smoothstep(0.35, 0.8, nd));
  float smear = length(dir)*uBlur + length(uStreak);
  float edgeN = edge*exp(-z*uInkFar)*clamp(1.0-smear*8.0, 0.25, 1.0);
  vec3 raw = texture2D(tScene, vUv).rgb;
  if(uMode==0){
    bg = mix(bg, uInkCol, edgeN*uInk);
    bg *= 1.0-uDark;
  } else {
    float l = luma(raw);
    bg = l > uImpThr.y ? uImpLight : (l > uImpThr.x ? uImpMid : uImpDark);
    bg = mix(bg, uImpInk, edge*exp(-z*0.012));
  }
  vec4 ch = vec4(0.0);
  for(int i=0;i<12;i++) ch += texture2D(tChar, vUv - dir*uCharBlur*(float(i)/11.0));
  ch /= 12.0;
  if(uMode==0 && ch.a > 0.0){
    ch.rgb = mix(ch.rgb, uFogCol*ch.a, uCharFog); ch.rgb *= uCharTint;
    // light wrap: where the cel's edge meets a bright background, the background's glow creeps over the edge
    float ring = 0.0; vec2 wr = uWrapR/uRes;
    for(int i=0;i<8;i++){ float an = float(i)*0.7853982; ring += texture2D(tChar, vUv+vec2(cos(an), sin(an))*wr).a; }
    float w = ch.a*clamp((1.0-ring/8.0)*2.0, 0.0, 1.0)*uWrap;
    vec3 soft = texture2D(tSoft, vUv).rgb;
    ch.rgb += soft*soft*w*1.4;
  }
  vec3 col = bg*(1.0-ch.a) + ch.rgb;
  vec4 fx = texture2D(tFx, vUv);
  col = col*(1.0-fx.a) + fx.rgb;
  gl_FragColor = vec4(col, ch.a);
}`;
const DOWN = `uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uThr; varying vec2 vUv;
void main(){ vec4 c4 = (texture2D(tSrc, vUv+uTexel*vec2(-1.0,-1.0)) + texture2D(tSrc, vUv+uTexel*vec2(1.0,-1.0)) + texture2D(tSrc, vUv+uTexel*vec2(-1.0,1.0)) + texture2D(tSrc, vUv+uTexel*vec2(1.0,1.0)))*0.25; vec3 c = c4.rgb;
  if(uThr > 0.0){ float l = max(c.r, max(c.g, c.b))*0.45 + dot(c, vec3(0.299,0.587,0.114))*0.55; c *= smoothstep(uThr, uThr+0.25, l)*(1.0-0.8*c4.a); }
  gl_FragColor = vec4(c, c4.a); }`;
const BLUR = `uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv;
void main(){ vec3 c = texture2D(tSrc, vUv).rgb*0.2270270;
  c += (texture2D(tSrc, vUv+uDir*1.3846).rgb + texture2D(tSrc, vUv-uDir*1.3846).rgb)*0.3162162;
  c += (texture2D(tSrc, vUv+uDir*3.2308).rgb + texture2D(tSrc, vUv-uDir*3.2308).rgb)*0.0702703;
  gl_FragColor = vec4(c, 1.0); }`;
const FINAL = `
uniform sampler2D tComp, tDiff, tBloomA, tBloomB; uniform float uBloom, uFlash, uCA, uSat, uSeed, uDiff, uVig, uGrain, uContrast; uniform int uMode; uniform vec3 uShadow;
varying vec2 vUv;
float hash(vec2 p){ vec3 p3 = fract(vec3(p.xyx)*0.1031); p3 += dot(p3, p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
void main(){
  vec2 d = vUv-0.5;
  vec3 col = vec3(texture2D(tComp, vUv+d*uCA).r, texture2D(tComp, vUv).g, texture2D(tComp, vUv-d*uCA).b);
  vec3 diff = texture2D(tDiff, vUv).rgb;
  col = mix(col, 1.0-(1.0-col)*(1.0-diff), uDiff);
  col += (texture2D(tBloomA, vUv).rgb*0.55 + texture2D(tBloomB, vUv).rgb*0.85)*uBloom;
  float l = dot(col, vec3(0.299,0.587,0.114));
  col = clamp(mix(vec3(l), col, uSat), 0.0, 1.0);
  col = mix(col, col*col*(3.0-2.0*col), uContrast);
  if(uMode==0){ col += uShadow*(1.0-l); col *= 1.0-uVig*pow(length(d*vec2(1.0,0.8))*1.35, 2.6); }
  // grain: two pixels wide and stronger in the darks, like stock, not per-pixel sensor noise
  float g = hash(floor(gl_FragCoord.xy*0.5)+uSeed*vec2(37.0,17.0)) + hash(gl_FragCoord.xy+uSeed*vec2(11.0,53.0)) - 1.0;
  col += g*uGrain*(1.0-0.6*clamp(l,0.0,1.0));
  col = mix(col, vec3(1.0), uFlash);
  gl_FragColor = vec4(clamp(col,0.0,1.0), 1.0);
}`;

export class Post {
  constructor(renderer, W, H) {
    this.r = renderer; this.W = W; this.H = H;
    const rt = (w, h, o = {}) => new THREE.WebGLRenderTarget(w, h, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, ...o });
    this.scene = rt(W, H, { samples: 4, depthBuffer: true });
    this.nd = rt(W, H, { samples: 4, depthBuffer: true, type: THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
    this.comp = rt(W, H);
    this.half = rt(W / 2, H / 2); this.q0 = rt(W / 4, H / 4); this.q1 = rt(W / 4, H / 4); this.q2 = rt(W / 4, H / 4);
    this.s0 = rt(W / 4, H / 4); this.s1 = rt(W / 4, H / 4);
    this.b0 = rt(W / 4, H / 4); this.b1 = rt(W / 4, H / 4); this.e0 = rt(W / 8, H / 8); this.e1 = rt(W / 8, H / 8);
    this.none = new THREE.DataTexture(new Uint8Array(4), 1, 1); this.none.needsUpdate = true;
    const sm = (fs, u) => new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: fs, uniforms: u, depthTest: false, depthWrite: false });
    const v = (x) => ({ value: x }), c3 = () => v(new THREE.Vector3());
    this.mComp = sm(COMP, { tScene: v(this.scene.texture), tND: v(this.nd.texture), tChar: v(this.none), tFx: v(this.none), tSoft: v(this.s0.texture), uRes: v(new THREE.Vector2(W, H)),
      uFocus: v(new THREE.Vector2(0.5, 0.5)), uStreak: v(new THREE.Vector2()), uBlur: v(0), uCharFog: v(0), uCharBlur: v(0), uDark: v(0), uMode: v(0), uInk: v(0.9), uInkW: v(1.25), uInkFar: v(0.03), uWrap: v(0), uWrapR: v(7),
      uFogCol: c3(), uInkCol: c3(), uCharTint: c3(), uImpDark: c3(), uImpMid: c3(), uImpLight: c3(), uImpInk: c3(), uImpThr: v(new THREE.Vector2()) });
    this.mDown = sm(DOWN, { tSrc: v(null), uTexel: v(new THREE.Vector2()), uThr: v(0) });
    this.mBlur = sm(BLUR, { tSrc: v(null), uDir: v(new THREE.Vector2()) });
    this.mFinal = sm(FINAL, { tComp: v(this.comp.texture), tDiff: v(this.q1.texture), tBloomA: v(this.b0.texture), tBloomB: v(this.e0.texture), uBloom: v(1), uFlash: v(0), uCA: v(0), uSat: v(1), uSeed: v(0), uDiff: v(0.3), uMode: v(0), uVig: v(0.42), uGrain: v(0.035), uContrast: v(0.3), uShadow: c3() });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mComp); this.quad.frustumCulled = false;
    this.qs = new THREE.Scene(); this.qs.add(this.quad);
    this.qc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }
  pass(mat, target) { this.quad.material = mat; this.r.setRenderTarget(target); this.r.render(this.qs, this.qc); }
  down(src, dst, thr = 0) { const u = this.mDown.uniforms; u.tSrc.value = src.texture; u.uTexel.value.set(0.5 / dst.width, 0.5 / dst.height); u.uThr.value = thr; this.pass(this.mDown, dst); }
  blur(a, tmp, n = 1) { const u = this.mBlur.uniforms; for (let i = 0; i < n; i++) { u.tSrc.value = a.texture; u.uDir.value.set(1 / a.width, 0); this.pass(this.mBlur, tmp); u.tSrc.value = tmp.texture; u.uDir.value.set(0, 1 / a.height); this.pass(this.mBlur, a); } }
  // The scene's colour (all layers) and its normal/depth (layer 0 only), with ndMaterial from sets/kit.js.
  capture(scene, camera, ndMaterial, o = {}) {
    const r = this.r;
    camera.layers.enableAll(); r.setClearColor(o.clear ?? 0x124a6b, 1); r.setRenderTarget(this.scene); r.render(scene, camera);
    camera.layers.set(0); scene.overrideMaterial = ndMaterial; r.setClearColor(0x8080ff, 1); r.setRenderTarget(this.nd); r.render(scene, camera);
    scene.overrideMaterial = null; camera.layers.enableAll();
  }
  finish(params = {}, target = null) {
    const p = { ...DEFAULTS, ...params }, imp = { ...DEFAULTS.impact, ...(params.impact ?? {}) }, c = this.mComp.uniforms, f = this.mFinal.uniforms;
    this.down(this.scene, this.half); this.down(this.half, this.s0); this.blur(this.s0, this.s1, 2);          // soft background, for light wrap
    c.tChar.value = p.char ?? this.none; c.tFx.value = p.fx ?? this.none;
    c.uFocus.value.set(...p.focus); c.uStreak.value.set(...p.bgStreak); c.uBlur.value = p.bgBlur; c.uCharFog.value = p.charFog; c.uCharBlur.value = p.charBlur; c.uDark.value = p.dark; c.uMode.value = p.mode;
    c.uInk.value = p.ink; c.uInkW.value = p.inkWidth; c.uInkFar.value = p.inkFar; c.uWrap.value = p.wrap; c.uWrapR.value = p.wrapRadius;
    c.uFogCol.value.set(...p.fogColor); c.uInkCol.value.set(...p.inkColor); c.uCharTint.value.set(...p.charTint);
    c.uImpDark.value.set(...imp.dark); c.uImpMid.value.set(...imp.mid); c.uImpLight.value.set(...imp.light); c.uImpInk.value.set(...imp.ink); c.uImpThr.value.set(...imp.thresholds);
    this.pass(this.mComp, this.comp);
    this.down(this.comp, this.half); this.down(this.half, this.q0);
    this.down(this.q0, this.q1); this.blur(this.q1, this.q2, 1);                           // diffusion source (unthresholded)
    this.down(this.half, this.b0, p.bloomThreshold); this.blur(this.b0, this.b1, 2);       // bloom, tight
    this.down(this.b0, this.e0); this.blur(this.e0, this.e1, 2);                           // bloom, wide
    f.uBloom.value = p.mode ? p.bloom * 0.2 : p.bloom; f.uFlash.value = p.flash; f.uCA.value = p.ca; f.uSat.value = p.sat; f.uSeed.value = p.seed; f.uMode.value = p.mode;
    f.uDiff.value = p.mode ? 0 : p.diffusion; f.uVig.value = p.vignette; f.uGrain.value = p.grain; f.uContrast.value = p.contrast; f.uShadow.value.set(...p.shadowTint);
    this.pass(this.mFinal, target);
  }
}
