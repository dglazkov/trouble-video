// Lift a drawing off the flat magenta it was painted on. Magenta-ness is how far red and blue stand above green;
// only pixels within a few pixels of the backdrop are touched (a pink mouth or pale lenses inside the figure are
// not near it), and there the backdrop's share of the pixel is taken out of its colour as well as its alpha, so an
// ink outline keeps its own dark edge and nothing pink is left on it.
export function keyMagenta(image, reach = 4) {
  const w = image.width, h = image.height, c = new OffscreenCanvas(w, h), g = c.getContext("2d", { willReadFrequently: true });
  g.drawImage(image, 0, 0);
  const im = g.getImageData(0, 0, w, h), d = im.data, n = w * h, t = new Float32Array(n), near = new Uint8Array(n), tmp = new Uint8Array(n);
  // the backdrop's own colour: the commonest corner
  const k = [d[0], d[1], d[2]], span = Math.min(k[0], k[2]) - k[1];
  for (let i = 0; i < n; i++) { const r = d[i * 4], gr = d[i * 4 + 1], b = d[i * 4 + 2]; t[i] = Math.min(1, Math.max(0, (Math.min(r, b) - gr) / span)); near[i] = t[i] > 0.6 ? 1 : 0; }
  // grow the backdrop by `reach` pixels (a square is near enough), rows then columns
  for (let y = 0; y < h; y++) for (let x = 0, run = -1e9, o = y * w; x < w; x++) { if (near[o + x]) run = x; tmp[o + x] = x - run <= reach ? 1 : 0; }
  for (let y = 0; y < h; y++) for (let x = w - 1, run = 1e9, o = y * w; x >= 0; x--) { if (near[o + x]) run = x; if (run - x <= reach) tmp[o + x] = 1; }
  for (let x = 0; x < w; x++) for (let y = 0, run = -1e9; y < h; y++) { if (tmp[y * w + x]) run = y; near[y * w + x] = y - run <= reach ? 1 : 0; }
  for (let x = 0; x < w; x++) for (let y = h - 1, run = 1e9; y >= 0; y--) { if (tmp[y * w + x]) run = y; if (run - y <= reach) near[y * w + x] = 1; }
  for (let i = 0; i < n; i++) {
    if (!near[i]) continue;
    const s = Math.min(1, Math.max(0, (t[i] - 0.12) / 0.8)), a = 1 - s;      // the backdrop's share of this pixel
    if (a <= 0.004) { d[i * 4 + 3] = 0; continue; }
    for (let j = 0; j < 3; j++) d[i * 4 + j] = Math.min(255, Math.max(0, (d[i * 4 + j] - s * k[j]) / a));
    // what is left of a pink fringe after that: red and blue come down toward green, the more the nearer the edge
    const m = Math.min(d[i * 4], d[i * 4 + 2]) - d[i * 4 + 1]; if (m > 0) { const cut = m * Math.min(1, s * 4); d[i * 4] -= cut; d[i * 4 + 2] -= cut; }
    d[i * 4 + 3] = Math.round(a * 255);
  }
  g.putImageData(im, 0, 0);
  return c;
}
