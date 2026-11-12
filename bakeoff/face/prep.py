"""Turn the generated test drawings into cels: trace each to vectors, cut the white ground out, and mark the hair."""
import cv2, numpy as np, os, subprocess
SRC, OUT = "art/ref", "out/bakeoff/face/cels"
names = ["face", "blink", "shout", "shock", "grin"]
for n in names:
    src = f"{SRC}/test_{n}.png"
    subprocess.run(["tools/cargo/bin/vtracer", "-i", src, "-o", f"{OUT}/{n}.svg", "--colormode", "color",
        "--hierarchical", "stacked", "-m", "spline", "-f", "8", "-p", "6", "-g", "24", "-c", "60", "-l", "4",
        "-s", "45", "--path_precision", "2"], check=True, stdout=subprocess.DEVNULL)
    print(n, "svg kB", os.path.getsize(f"{OUT}/{n}.svg") // 1024, "paths", open(f"{OUT}/{n}.svg").read().count("<path"))
base = cv2.imread(f"{SRC}/test_face.png")
H, W = base.shape[:2]
# ground: near-white pixels connected to the border
white = (base.min(axis=2) > 235).astype(np.uint8)
ff = white.copy(); mask = np.zeros((H + 2, W + 2), np.uint8)
for x, y in [(2, 2), (W - 3, 2), (2, H // 2), (W - 3, H // 2), (W // 2, 2)]:
    if ff[y, x] == 1: cv2.floodFill(ff, mask, (x, y), 2)
alpha = np.where(ff == 2, 0, 255).astype(np.uint8)
# ground showing through a gap in the drawing (behind the side lock): large white pockets below the face.
# A production sheet asks for a chroma-key ground instead, so that this guess is not needed.
n, lab, st, cen = cv2.connectedComponentsWithStats((ff == 1).astype(np.uint8))
for i in range(1, n):
    if st[i, cv2.CC_STAT_AREA] > 3000 and cen[i][1] > H * .42 and cen[i][0] < W * .36: alpha[lab == i] = 0
alpha = cv2.GaussianBlur(cv2.erode(alpha, np.ones((3, 3), np.uint8)), (0, 0), 1.2)
hsv = cv2.cvtColor(base, cv2.COLOR_BGR2HSV)
hair = cv2.inRange(hsv, (80, 60, 40), (100, 255, 200))
hair = cv2.morphologyEx(hair, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
hair[int(H * .62):] = 0
# sway weight: hair far from the skull moves most
cy, cx = int(H * .30), int(W * .47)
yy, xx = np.mgrid[0:H, 0:W]
dist = np.clip((np.hypot((xx - cx) / (W * .22), (yy - cy) / (H * .2)) - 0.55) / 0.5, 0, 1)
sway = cv2.GaussianBlur((hair / 255.0 * dist).astype(np.float32), (0, 0), 14)
cv2.imwrite(f"{OUT}/masks.png", np.dstack([np.zeros_like(alpha), (np.clip(sway * 1.6, 0, 1) * 255).astype(np.uint8), alpha]))
print("alpha coverage %.0f%%" % (alpha.mean() / 2.55), "sway max %.2f" % sway.max())
