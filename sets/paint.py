"""Painted backgrounds, at design time: sets/paint.py COMMAND ...

A set's vista can be a painting instead of geometry (sets/atrium.js is the first): layers at different distances, each
a painting of the same view, that slide against each other when the camera moves. The paintings are made here, once,
looked at full size, and then frozen in the set's folder (sets/NAME/); no frame of the film calls this.

  gen OUT.png "prompt" [--ref a.png ...] [--aspect 16:9] [--size 4K]
        one candidate from Nano Banana (art/gen.py), with OUT.json beside it: the prompt and the references
  key IN.png OUT.webp [--key green|magenta] [--from RGB.png]
        lift a layer off its flat key colour: OUT.webp has alpha (straight), its edge pulled in and cleaned of the key.
        --from takes the colour from another picture of the same size (the whole painting) and only the cut from IN
  cut WHOLE.png FAR.png OUT.webp --on ON.png --off OFF.png [--also OTHER.png OUT2.webp] [--width 4096]
        cut the nearer things out of the whole painting as a layer with alpha. WHOLE and FAR are the same view with and
        without them (FAR is the far plate); ON and OFF are the set's blockout rendered from the same camera with and
        without those things (shots/atrium_plate.js frames 1 and 2): where they are, roughly. The edge is found in
        the painting itself (GrabCut between the two), mist seen through the cut is left to the far plate, and the same
        cut is given to OTHER (the whole painting in another state: the alarm).
  freeze IN.png OUT.webp [--width 4096]
        an accepted painting into the set's folder as it will be read (WebP, quality 95), its sidecar copied beside it
  crop IN OUT.png --frac 0.7095 [--size 1920x1080]
        the middle of a painting made wider than the frame, at the frame's size: what the hero camera sees, to be judged 1:1
"""
import argparse, json, os, shutil, subprocess, sys
import numpy as np
from PIL import Image, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
sub = p.add_subparsers(dest="cmd", required=True)
g = sub.add_parser("gen"); g.add_argument("out"); g.add_argument("prompt"); g.add_argument("--ref", nargs="*", default=[]); g.add_argument("--aspect", default="16:9"); g.add_argument("--size", default="4K")
k = sub.add_parser("key"); k.add_argument("src"); k.add_argument("out"); k.add_argument("--key", default="green"); k.add_argument("--from", dest="rgb")
f = sub.add_parser("freeze"); f.add_argument("src"); f.add_argument("out"); f.add_argument("--width", type=int, default=0)
u = sub.add_parser("cut"); u.add_argument("whole"); u.add_argument("far"); u.add_argument("out"); u.add_argument("--on", required=True); u.add_argument("--off", required=True); u.add_argument("--also", nargs=2); u.add_argument("--width", type=int, default=4096)
c = sub.add_parser("crop"); c.add_argument("src"); c.add_argument("out"); c.add_argument("--frac", type=float, default=0.7095); c.add_argument("--size", default="1920x1080")
a = p.parse_args()

def sidecar(src, out):
    s = os.path.splitext(src)[0] + ".json"
    if os.path.exists(s): shutil.copy(s, os.path.splitext(out)[0] + ".json")

if a.cmd == "gen":
    r = subprocess.run([sys.executable, os.path.join(HERE, "..", "art", "gen.py"), a.out, a.prompt, "--ref", *a.ref, "--aspect", a.aspect, "--size", a.size])
    if r.returncode: sys.exit(r.returncode)
    json.dump({"prompt": a.prompt, "refs": a.ref, "aspect": a.aspect, "size": a.size, "model": "gemini-3.1-flash-image (art/gen.py)"}, open(os.path.splitext(a.out)[0] + ".json", "w"), indent=1, ensure_ascii=False)
elif a.cmd == "key":
    im = np.asarray(Image.open(a.src).convert("RGB")).astype(np.float32) / 255
    r_, g_, b_ = im[..., 0], im[..., 1], im[..., 2]
    # how much of the key a pixel is: the key's channel(s) over the others
    d = g_ - np.maximum(r_, b_) if a.key == "green" else np.minimum(r_, b_) - g_
    alpha = 1 - np.clip((d - 0.12) / 0.22, 0, 1)
    al = Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))      # pulled in a pixel: no fringe of key
    alpha = np.asarray(al).astype(np.float32) / 255
    rgb = np.asarray(Image.open(a.rgb).convert("RGB").resize((im.shape[1], im.shape[0]), Image.LANCZOS)).astype(np.float32) / 255 if a.rgb else im.copy()
    if not a.rgb:      # despill: the key's channel no higher than the others
        if a.key == "green": rgb[..., 1] = np.minimum(rgb[..., 1], np.maximum(rgb[..., 0], rgb[..., 2]))
        else: m = np.maximum(rgb[..., 1], (rgb[..., 0] + rgb[..., 2]) / 2 * 0.9); rgb[..., 0] = np.minimum(rgb[..., 0], m * 1.15); rgb[..., 2] = np.minimum(rgb[..., 2], m * 1.15)
    out = np.dstack([rgb, alpha]); out[alpha < 0.004] = 0
    Image.fromarray((out * 255 + 0.5).astype(np.uint8), "RGBA").save(a.out, quality=95, method=6, exact=True)
    sidecar(a.src, a.out); print("wrote", a.out, "covered %.1f%%" % (100 * alpha.mean()))
elif a.cmd == "freeze":
    im = Image.open(a.src).convert("RGB")
    if a.width: im = im.resize((a.width, round(im.size[1] * a.width / im.size[0])), Image.LANCZOS)
    im.save(a.out, quality=95, method=6); sidecar(a.src, a.out); print("wrote", a.out, im.size)
elif a.cmd == "cut":
    import cv2
    from scipy import ndimage as ndi
    A8 = cv2.imread(a.whole); A = A8.astype(np.float32) / 255; F = cv2.imread(a.far).astype(np.float32) / 255; H, W = A.shape[:2]; h, w = H // 2, W // 2
    el = lambda n: cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (n, n))
    biggest = lambda m: (lambda lab, n: (lab == 1 + int(np.argmax(ndi.sum(m, lab, range(1, n + 1))))).astype(np.uint8))(*ndi.label(m))
    fill = lambda m: ndi.binary_fill_holes(np.pad(m, ((1, 1), (0, 0)), constant_values=1)).astype(np.uint8)[1:-1]      # the top edge closes a hole: a tower runs off it
    # where the blockout says the things are
    B = (np.abs(cv2.imread(a.on).astype(np.float32) - cv2.imread(a.off).astype(np.float32)).max(axis=2) > 6).astype(np.uint8)
    B = cv2.resize(fill(biggest(cv2.morphologyEx(B, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8)))), (w, h), interpolation=cv2.INTER_NEAREST)
    # where the two paintings differ; then the edge, from the whole painting's own colours, at half size
    d = cv2.resize(np.abs(A - F).max(axis=2), (w, h), interpolation=cv2.INTER_AREA); small = cv2.resize(A8, (w, h), interpolation=cv2.INTER_AREA)
    gm = np.full((h, w), cv2.GC_BGD, np.uint8); gm[cv2.dilate(B, el(25)) > 0] = cv2.GC_PR_BGD
    gm[(cv2.dilate(B, el(13)) > 0) & (cv2.GaussianBlur(d, (0, 0), 3) > 0.1)] = cv2.GC_PR_FGD; gm[B > 0] = cv2.GC_PR_FGD; gm[cv2.erode(B, el(9)) > 0] = cv2.GC_FGD
    cv2.grabCut(small, gm, None, np.zeros((1, 65)), np.zeros((1, 65)), 4, cv2.GC_INIT_WITH_MASK)
    m = ((gm == cv2.GC_FGD) | (gm == cv2.GC_PR_FGD)).astype(np.uint8)
    # mist seen between the things is the far plate's, not theirs (pale aqua that the two paintings agree on)
    sm = small.astype(np.float32) / 255; mist = (sm[..., 0] > 0.72) & (sm[..., 1] > 0.66) & (sm[..., 2] < 0.78) & (sm[..., 0] - sm[..., 2] > 0.12) & (cv2.GaussianBlur(d, (0, 0), 4) < 0.12)
    m[cv2.dilate(cv2.morphologyEx(mist.astype(np.uint8), cv2.MORPH_OPEN, el(9)), el(13)) > 0] = 0
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, el(5)); pre = m.copy(); m = fill(m); hl, hn = ndi.label(m & ~pre & 1)
    for i in range(1, hn + 1):
        r = hl == i
        if r.sum() > 1500 and d[r].mean() < 0.06: m[r] = 0      # a big hole the paintings agree on is a hole
    al = cv2.resize(cv2.GaussianBlur(biggest(m).astype(np.float32), (0, 0), 0.8), (W, H), interpolation=cv2.INTER_CUBIC); al = np.clip((al - 0.5) * 2.2 + 0.5, 0, 1)
    size = (a.width, round(H * a.width / W)); alpha = Image.fromarray((al * 255).astype(np.uint8)).resize(size, Image.LANCZOS)
    for src, out in [(a.whole, a.out)] + ([tuple(a.also)] if a.also else []):
        im = Image.open(src).convert("RGB").resize(size, Image.LANCZOS); im.putalpha(alpha); im.save(out, quality=95, method=6, exact=True); sidecar(src, out); print("wrote", out, size, "covered %.1f%%" % (100 * al.mean()))
elif a.cmd == "crop":
    im = Image.open(a.src); W, H = im.size; w, h = W * a.frac, H * a.frac; tw, th = map(int, a.size.split("x"))
    im.crop((round((W - w) / 2), round((H - h) / 2), round((W + w) / 2), round((H + h) / 2))).resize((tw, th), Image.LANCZOS).save(a.out); print("wrote", a.out)
