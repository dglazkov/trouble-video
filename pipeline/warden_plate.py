"""The warden's one DRAWN plate (shots/reun_fight.js nover: its head on the deck as Noor steps over it), made ready
from the painted takes, the same way every time: .venv/bin/python pipeline/warden_plate.py

  machines/warden/src/guide_lit.png, guide_empty.png   the set from that shot's camera with the 3D head and without it
        (node render.mjs shots/warden_plate.js --frames 0,1): the paintings were made over the first; the two differ
        where the head is, which is its matte
  machines/warden/src/head_lit.jpg, head_out.jpg       the head painted over the guide (Nano Banana; sidecars beside
        them), and an edit of that with every eye gone out
  -> machines/warden/head_lit.webp, head_out.webp      the head alone (straight alpha), 3840 x 2160: the frame's size
        twice over, so the shot lays it on the frame whole and it registers with the set. head_out is head_lit
        everywhere but the eyes (an edit comes back a little off all over; only where the two really differ is taken).
"""
import os, sys
import numpy as np, cv2
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
D = os.path.join(ROOT, "machines/warden/"); W, H = 3840, 2160

def main():
    a = cv2.imread(D + "src/guide_lit.png").astype(np.int32); b = cv2.imread(D + "src/guide_empty.png").astype(np.int32)
    m = (np.abs(a - b).max(2) > 10).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m); keep = np.zeros_like(m)
    for i in range(1, n):
        if st[i, cv2.CC_STAT_AREA] > 4000: keep[lab == i] = 1      # the head and what is joined to it, not the glints' far points
    h, w = keep.shape; ff = np.zeros((h + 2, w + 2), np.uint8); inv = (1 - keep).astype(np.uint8); cv2.floodFill(inv, ff, (0, 0), 2); keep[inv == 1] = 1      # holes filled
    keep = cv2.erode(keep, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)))
    al = cv2.GaussianBlur(cv2.resize(keep.astype(np.float32), (W, H), interpolation=cv2.INTER_CUBIC), (0, 0), 2.0); al = np.clip((al - 0.5) * 3 + 0.5, 0, 1)
    lit = cv2.resize(cv2.imread(D + "src/head_lit.jpg"), (W, H), interpolation=cv2.INTER_AREA).astype(np.float32)
    out = cv2.resize(cv2.imread(D + "src/head_out.jpg"), (W, H), interpolation=cv2.INTER_AREA).astype(np.float32)
    d = cv2.GaussianBlur(np.abs(lit - out).max(2), (0, 0), 6); e = (d > 26).astype(np.uint8); e = cv2.dilate(e, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (25, 25)))
    e = cv2.GaussianBlur(e.astype(np.float32), (0, 0), 4)[..., None]; out = lit * (1 - e) + out * e
    for name, im in (("head_lit", lit), ("head_out", out)):
        rgba = np.dstack([im, al * 255]).astype(np.uint8); cv2.imwrite(D + name + ".webp", rgba, [cv2.IMWRITE_WEBP_QUALITY, 94])
        print("wrote", "machines/warden/" + name + ".webp", "covers %.1f%%" % (100 * al.mean()), "eyes %.1f%%" % (100 * float(e.mean())))

if __name__ == "__main__": main()
