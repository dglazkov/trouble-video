"""Grade an edit of a close-up to the drawing it was edited from: match.py BASE.jpg EDIT.jpg [...]
-> EDIT.png beside each EDIT.jpg.

An edit pass (paint.py NAME edit) comes back line for line on its original but a few levels off in colour, and two
drawings swapped on twos must not differ in anything but what was changed. Per channel, the edit is fitted to the base
(a gain and an offset, over the pixels of the figure that the edit left alone) and the fit applied to the whole edit.
Prints, per edit, how far apart the unchanged pixels were before and after, and how far the edit is shifted (pixels).
"""
import sys, json
import numpy as np, cv2

def main():
    if len(sys.argv) < 3 or sys.argv[1] in ("-h", "--help"): sys.exit(__doc__)
    base = cv2.imread(sys.argv[1]).astype(np.float32); out = []
    for f in sys.argv[2:]:
        e = cv2.imread(f).astype(np.float32)
        if e.shape != base.shape: sys.exit(f"{f} is not the size of {sys.argv[1]}")
        d = np.abs(e - base).max(2)
        key = (np.minimum(base[..., 0], base[..., 2]) - base[..., 1]) > 120        # the magenta backdrop (BGR)
        same = (d < 30) & ~key                                                      # the figure, where the edit changed nothing
        g = e.copy()
        for c in range(3):
            a, b = np.polyfit(e[..., c][same].ravel()[::7], base[..., c][same].ravel()[::7], 1); g[..., c] = e[..., c] * a + b
        g = np.clip(g, 0, 255)
        (dx, dy), _ = cv2.phaseCorrelate(cv2.cvtColor(base.astype(np.uint8), cv2.COLOR_BGR2GRAY).astype(np.float32), cv2.cvtColor(e.astype(np.uint8), cv2.COLOR_BGR2GRAY).astype(np.float32))
        o = f.rsplit(".", 1)[0] + ".png"; cv2.imwrite(o, g.astype(np.uint8))
        out.append({"edit": f, "wrote": o, "before": round(float(np.abs(e - base)[same].mean()), 2), "after": round(float(np.abs(g - base)[same].mean()), 2),
                    "shift": [round(dx, 2), round(dy, 2)], "changed": round(float(((d >= 30) & ~key).mean()) * 100, 2)})
    print(json.dumps(out, indent=1))

if __name__ == "__main__": main()
