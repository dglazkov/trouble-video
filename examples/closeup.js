// A close-up: one drawing (a plate) laid over a painted background.   node render.mjs examples/closeup.js   -> out/example_closeup.mp4
// A plate is a single picture on the key colour (kits/NAME/closeup/), not a cel on the skeleton: the shot says where
// on the frame its centre goes and how big it is. docs/cast.md lists the plates each kit holds.
const W = 1920, H = 1080, FPS = 24;
export default {
  name: "example_closeup", start: 51.55, frames: 48, fps: FPS,
  // plates: a name for each picture the shot lays in. key: "magenta" lifts it off its backdrop when it is loaded.
  plates: { juno: { src: "/kits/juno/closeup/slice_run.png", key: "magenta" } },
  frame(f, sync) {
    const kick = sync.drive({ stem: "kick", mode: "pulse", decay: 0.15 }, this.start * FPS + f), f2 = f - f % 2;      // f2: held on twos
    return {
      camera: { pos: [0, 0, 10], target: [0, 0, 0] },      // no set and no actors: the camera only has to exist
      // the background, painted by the shot: flat bands of her colours streaking past
      backdrop(g) {
        g.fillStyle = "#04262e"; g.fillRect(0, 0, W, H);
        for (let i = 0; i < 26; i++) { const y = (i * 97 + 31) % H, x = ((i * 613 - f * (60 + (i % 5) * 22)) % (W + 900) + W + 900) % (W + 900) - 450; g.fillStyle = i % 3 ? "#0e9aa2" : "#ffa030"; g.fillRect(x, y, 260 + (i % 4) * 150, 8 + (i % 3) * 10); }
      },
      // the plate: its centre (pixels), its scale (the picture is 2752 wide; 0.75 fills the frame), pushed in on each kick.
      // layer.warp wobbles the picture away from a still point (her face), on twos: hair and cloth in the wind.
      cels: [{ plate: "juno", x: W / 2 - f * 1.5, y: H / 2 + 26, scale: 0.75 + 0.03 * kick, layer: { warp: 7, warpDir: [-1, 0.08], warpTime: f2 * 0.9, warpStill: [0.6, 0.5], warpRadius: 0.17 } }],
      post: { ink: 0, bloom: 0.5, bloomThreshold: 0.8, vignette: 0.3 },      // engine/post.js DEFAULTS lists every parameter
    };
  },
};
