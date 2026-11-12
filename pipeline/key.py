"""Lift a plate off its magenta at design time: key.py PLATE.jpg [...] -> PLATE_key.png (RGBA) beside each.

The stage keys a plate itself (engine/key.js) and takes the backdrop's colour from the drawing's top-left corner. A
drawing that fills its frame (an extreme close-up whose corners are hair) has no backdrop there: key it here, with
the ground measured wherever it shows, and give the shot the PNG without `key` (it is then laid in as it is).
Prints, per plate, the ground's colour and how much of the picture it is.
"""
import sys, json
import numpy as np, cv2

def main():
    if len(sys.argv) < 2 or sys.argv[1] in ("-h", "--help"): sys.exit(__doc__)
    out = []
    for f in sys.argv[1:]:
        im = cv2.imread(f).astype(np.float32); B, G, R = im[..., 0], im[..., 1], im[..., 2]
        m = np.minimum(R, B) - G; g = m > 150
        if g.sum() < 200: sys.exit(f"{f}: no magenta ground in it")
        ground = np.median(im[g][::17], 0); top = float(np.percentile(m[g][::17], 2))
        # only what touches the ground is keyed: a pink mouth or a pale lens inside the figure is paint
        near = cv2.dilate(g.astype(np.uint8), np.ones((9, 9), np.uint8)) > 0
        alpha = np.where(near, 1 - np.clip((m - 0.25 * top) / (0.6 * top), 0, 1), 1.0)
        a3 = np.maximum(alpha, 0.08)[..., None]; col = np.clip((im - (1 - alpha[..., None]) * ground) / a3, 0, 255)
        spill = np.clip(np.minimum(col[..., 0], col[..., 2]) - col[..., 1], 0, 255) * ((alpha < 0.999) & near); col[..., 0] -= spill; col[..., 2] -= spill
        o = f.rsplit(".", 1)[0] + "_key.png"; cv2.imwrite(o, np.dstack([col, alpha * 255]).astype(np.uint8))
        out.append({"plate": f, "wrote": o, "ground": [int(v) for v in ground[::-1]], "share": round(float(g.mean()) * 100, 2)})
    print(json.dumps(out, indent=1))

if __name__ == "__main__": main()
