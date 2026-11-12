// "Photography" pass: BG ink edges (depth/normal), radial BG speed blur, cel layer composite,
// impact-frame palettes, bloom, diffusion, chromatic aberration, vignette, grain.
import * as THREE from 'three';

const VS = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const COMP = `
uniform sampler2D tScene, tND, tChar, tFx; uniform vec2 uRes, uFocus; uniform float uBlur, uCharFog, uDark, uCharBlur; uniform int uMode; uniform vec3 uFogCol;
varying vec2 vUv;
float luma(vec3 c){ return dot(c, vec3(0.299,0.587,0.114)); }
void main(){
  vec2 dir = vUv-uFocus;
  vec3 bg = vec3(0.0);
  for(int i=0;i<14;i++) bg += texture2D(tScene, vUv - dir*uBlur*(float(i)/13.0)).rgb;
  bg /= 14.0;
  vec2 px = 1.25/uRes;
  vec4 c = texture2D(tND, vUv), a = texture2D(tND, vUv+vec2(px.x,0.0)), b = texture2D(tND, vUv-vec2(px.x,0.0)), d = texture2D(tND, vUv+vec2(0.0,px.y)), e = texture2D(tND, vUv-vec2(0.0,px.y));
  float z = max(c.a, 0.01);
  float dd = (abs(1.0/max(a.a,0.01) + 1.0/max(b.a,0.01) - 2.0/z) + abs(1.0/max(d.a,0.01) + 1.0/max(e.a,0.01) - 2.0/z))*z;
  float nd = length(a.rgb-c.rgb)+length(b.rgb-c.rgb)+length(d.rgb-c.rgb)+length(e.rgb-c.rgb);
  float edge = max(smoothstep(0.012, 0.035, dd), smoothstep(0.35, 0.8, nd));
  float edgeN = edge*exp(-z*0.03)*clamp(1.0-uBlur*6.0, 0.25, 1.0);
  vec3 raw = texture2D(tScene, vUv).rgb;
  if(uMode==0){
    bg = mix(bg, vec3(0.06,0.03,0.15), edgeN*0.9);
    bg *= 1.0-uDark;
  } else if(uMode==1){
    float l = luma(raw);
    bg = l > 0.5 ? vec3(0.0) : vec3(1.0);
    bg = mix(bg, vec3(0.0), edge*exp(-z*0.012));
  } else {
    float l = luma(raw);
    bg = l > 0.5 ? vec3(0.15,0.95,1.0) : vec3(0.05,0.0,0.12);
    bg = mix(bg, vec3(1.0,0.15,0.62), edge*exp(-z*0.012));
  }
  vec4 ch = vec4(0.0);
  for(int i=0;i<12;i++) ch += texture2D(tChar, vUv - dir*uCharBlur*(float(i)/11.0));
  ch /= 12.0;
  if(uMode==0){ ch.rgb = mix(ch.rgb, uFogCol*ch.a, uCharFog); ch.rgb *= vec3(0.97,0.955,1.0); }
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
uniform sampler2D tComp, tDiff, tBloomA, tBloomB; uniform float uBloom, uFlash, uCA, uSat, uSeed, uDiff; uniform int uMode;
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
  col = mix(col, col*col*(3.0-2.0*col), 0.3);
  if(uMode==0){ col += vec3(0.018,0.0,0.045)*(1.0-l); col *= 1.0-0.42*pow(length(d*vec2(1.0,0.8))*1.35, 2.6); }
  col += (hash(gl_FragCoord.xy+uSeed*vec2(37.0,17.0))-0.5)*0.06*(1.0-0.5*clamp(l,0.0,1.0));
  col = mix(col, vec3(1.0), uFlash);
  gl_FragColor = vec4(clamp(col,0.0,1.0), 1.0);
}`;

export class Post {
  constructor(renderer, W, H, charTex, fxTex) {
    this.r = renderer; this.W = W; this.H = H;
    const rt = (w, h, o = {}) => new THREE.WebGLRenderTarget(w, h, { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false, ...o });
    this.scene = rt(W, H, { samples: 4, depthBuffer: true });
    this.nd = rt(W, H, { samples: 4, depthBuffer: true, type: THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
    this.comp = rt(W, H);
    this.half = rt(W / 2, H / 2); this.q0 = rt(W / 4, H / 4); this.q1 = rt(W / 4, H / 4); this.q2 = rt(W / 4, H / 4);
    this.b0 = rt(W / 4, H / 4); this.b1 = rt(W / 4, H / 4); this.e0 = rt(W / 8, H / 8); this.e1 = rt(W / 8, H / 8);
    const sm = (fs, u) => new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: fs, uniforms: u, depthTest: false, depthWrite: false });
    this.mComp = sm(COMP, { tScene: { value: this.scene.texture }, tND: { value: this.nd.texture }, tChar: { value: charTex }, tFx: { value: fxTex }, uRes: { value: new THREE.Vector2(W, H) }, uFocus: { value: new THREE.Vector2(0.5, 0.5) }, uBlur: { value: 0 }, uCharFog: { value: 0 }, uCharBlur: { value: 0 }, uDark: { value: 0 }, uMode: { value: 0 }, uFogCol: { value: new THREE.Color(0.07, 0.27, 0.42) } });
    this.mDown = sm(DOWN, { tSrc: { value: null }, uTexel: { value: new THREE.Vector2() }, uThr: { value: 0 } });
    this.mBlur = sm(BLUR, { tSrc: { value: null }, uDir: { value: new THREE.Vector2() } });
    this.mFinal = sm(FINAL, { tComp: { value: this.comp.texture }, tDiff: { value: this.q1.texture }, tBloomA: { value: this.b0.texture }, tBloomB: { value: this.e0.texture }, uBloom: { value: 1 }, uFlash: { value: 0 }, uCA: { value: 0 }, uSat: { value: 1 }, uSeed: { value: 0 }, uDiff: { value: 0.3 }, uMode: { value: 0 } });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mComp); this.quad.frustumCulled = false;
    this.qs = new THREE.Scene(); this.qs.add(this.quad);
    this.qc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }
  pass(mat, target) { this.quad.material = mat; this.r.setRenderTarget(target); this.r.render(this.qs, this.qc); }
  down(src, dst, thr = 0) { const u = this.mDown.uniforms; u.tSrc.value = src.texture; u.uTexel.value.set(0.5 / dst.width, 0.5 / dst.height); u.uThr.value = thr; this.pass(this.mDown, dst); }
  blur(a, tmp, n = 1) { const u = this.mBlur.uniforms; for (let i = 0; i < n; i++) { u.tSrc.value = a.texture; u.uDir.value.set(1 / a.width, 0); this.pass(this.mBlur, tmp); u.tSrc.value = tmp.texture; u.uDir.value.set(0, 1 / a.height); this.pass(this.mBlur, a); } }
  render(scene, camera, ndMat, p) {
    const r = this.r;
    r.setClearColor(0x124a6b, 1); r.setRenderTarget(this.scene); r.render(scene, camera);
    scene.overrideMaterial = ndMat; r.setClearColor(0x8080ff, 1); r.setRenderTarget(this.nd); r.render(scene, camera); scene.overrideMaterial = null;
    const c = this.mComp.uniforms;
    c.uFocus.value.set(p.focus[0], p.focus[1]); c.uBlur.value = p.bgBlur; c.uCharFog.value = p.charFog; c.uCharBlur.value = p.charBlur; c.uDark.value = p.dark; c.uMode.value = p.mode;
    this.pass(this.mComp, this.comp);
    this.down(this.comp, this.half); this.down(this.half, this.q0);
    this.down(this.q0, this.q1); this.blur(this.q1, this.q2, 1);          // diffusion source (unthresholded)
    this.down(this.half, this.b0, 0.62); this.blur(this.b0, this.b1, 2);   // bloom, tight
    this.down(this.b0, this.e0); this.blur(this.e0, this.e1, 2);           // bloom, wide
    const f = this.mFinal.uniforms;
    f.uBloom.value = p.bloom; f.uFlash.value = p.flash; f.uCA.value = p.ca; f.uSat.value = p.sat; f.uSeed.value = p.seed; f.uMode.value = p.mode;
    f.uDiff.value = p.mode === 1 ? 0.0 : 0.3;
    this.pass(this.mFinal, null);
  }
}
