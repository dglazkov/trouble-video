"""The reunion's meet (shots/reun_meet.js): its plates made ready from the painted takes, by hand and the same way
every time: .venv/bin/python pipeline/reun_meet_prep.py
  kits/tane/closeup/reun_faces_{a,b,c}.png   the four seeing each other (a: before the laugh, take 4; b: the laugh,
        take 1; c: Tane and Ife look up, take 2), the edits graded and registered to take 1 (pipeline/match.py), and in
        all three: the second triangle on Juno's near sleeve painted out (the design has one a sleeve), the two brass
        buttons on Tane's cuff painted out (his coat has four down the front and nothing else), and the part of Ife's
        lens that hangs past her cheek, painted pink by the backdrop behind it, made the pale glass of the rest
  kits/tane/closeup/reun_skid_a.png          Tane and Ife pulling up: the ground line drawn under them taken out
  kits/juno/closeup/reun_skid_juno.png       Juno alone from reun_skid_b_1 (the Noor painted with her walks the wrong way)
"""
import subprocess, sys, os
import numpy as np, cv2
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
T = os.path.join(ROOT, "kits/tane/closeup/")
MAG = (255, 0, 255)  # BGR

def fix_faces(im):
    im = im.copy()
    def paint_out(box, pick, grow):
        x0, y0, x1, y1 = box; r = im[y0:y1, x0:x1].astype(np.int32); m = pick(r[..., 2], r[..., 1], r[..., 0]).astype(np.uint8) * 255
        m = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (grow, grow)))
        full = np.zeros(im.shape[:2], np.uint8); full[y0:y1, x0:x1] = m
        return cv2.inpaint(im, full, 7, cv2.INPAINT_TELEA)
    # Juno's second triangle: the sleeve's own flat orange over it and its outline (inpainting drags the coat's black in from beside it)
    x0, y0, x1, y1 = 2082, 950, 2180, 1052; r = im[y0:y1, x0:x1].astype(np.float32); R, G, B = r[..., 2], r[..., 1], r[..., 0]
    yel = ((R > 200) & (G > 160) & (B < 130)).astype(np.uint8); m = cv2.dilate(yel, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15)))
    orange = (R > 190) & (G > 80) & (G < 150) & (B < 90) & (m == 0); fill = np.median(r[orange], axis=0)
    w = cv2.GaussianBlur(m.astype(np.float32), (0, 0), 1.2)[..., None]; im[y0:y1, x0:x1] = (r * (1 - w) + fill * w).astype(np.uint8)
    im = paint_out((40, 1120, 140, 1210), lambda R, G, B: ((G > 100) & (R > 150) & (R - B > 50)), 23)      # Tane's cuff buttons
    x0, y0, x1, y1 = 1212, 672, 1266, 770; r = im[y0:y1, x0:x1].astype(np.int32); R, G, B = r[..., 2], r[..., 1], r[..., 0]
    pink = (G > 120) & (np.minimum(R, B) - G > 14)
    r[pink] = (238, 226, 222)                                                                             # the lens beyond her cheek
    im[y0:y1, x0:x1] = r.astype(np.uint8)
    return im

def main():
    py = sys.executable
    subprocess.run([py, os.path.join(ROOT, "pipeline/match.py"), "--register", T + "reun_faces_1.jpg", T + "reun_faces_4.jpg", T + "reun_faces_2.jpg"], check=True, stdout=subprocess.DEVNULL)
    for name, src in (("a", "reun_faces_4.png"), ("b", "reun_faces_1.jpg"), ("c", "reun_faces_2.png")):
        cv2.imwrite(T + f"reun_faces_{name}.png", fix_faces(cv2.imread(T + src)))
    # the ground line: dark pixels in its rows with the backdrop right above them
    a = cv2.imread(T + "reun_skid_a_1.jpg"); dark = a.max(2) < 90; rows = np.where(dark[:, 500:2400].mean(1) > 0.85)[0]
    if len(rows):
        y0, y1 = rows.min() - 3, rows.max() + 4; above = a[y0 - 6].astype(np.int32); clear = (np.minimum(above[:, 0], above[:, 2]) - above[:, 1]) > 120
        clear = cv2.erode(clear.astype(np.uint8)[None, :], np.ones((1, 9), np.uint8))[0] > 0
        a[y0:y1, clear] = a[5, 5]; a[y1:, :] = a[5, 5]
    cv2.imwrite(T + "reun_skid_a.png", a)
    j = cv2.imread(os.path.join(ROOT, "kits/juno/closeup/reun_skid_b_1.jpg")); j[:, 1700:] = j[5, 5]
    # the thrusters' blue flames against the backdrop: where the two mixed (pink, no ink line between them) is given to the backdrop, or the key leaves a pink line round each flame
    r = j[1150:, :1700]; B, G, R = (r[..., k].astype(np.int32) for k in range(3)); pink = (B > 150) & (R > 110) & (R > G + 20) & (G < 190); r[pink] = j[5, 5]
    cv2.imwrite(os.path.join(ROOT, "kits/juno/closeup/reun_skid_juno.png"), j)
    print("rows of the ground line:", (int(rows.min()), int(rows.max())) if len(rows) else None)
    # where each figure stands in its plate: the box of what is not backdrop
    for f in (T + "reun_skid_a.png", os.path.join(ROOT, "kits/juno/closeup/reun_skid_juno.png"), os.path.join(ROOT, "kits/noor/closeup/reun_stop_noor_1.jpg")):
        im = cv2.imread(f).astype(np.int32); fg = (np.minimum(im[..., 0], im[..., 2]) - im[..., 1]) < 100; ys, xs = np.where(fg); print(os.path.basename(f), "box", xs.min(), ys.min(), xs.max(), ys.max())

if __name__ == "__main__": main()
