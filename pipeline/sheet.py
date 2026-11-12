"""Contact sheet of rendered frames: sheet.py OUT.png [--every N] [--cols C] [--crop x0,y0,x1,y1] [--width W] FRAME.png ...
Each cell is labelled with its frame's file name. --width is the width of one cell in pixels (default 480)."""
import argparse, os
import cv2, numpy as np

p = argparse.ArgumentParser(description=__doc__)
p.add_argument("out"); p.add_argument("frames", nargs="+")
p.add_argument("--every", type=int, default=1); p.add_argument("--cols", type=int, default=0)
p.add_argument("--crop", default=""); p.add_argument("--width", type=int, default=480)
a = p.parse_args()
files = a.frames[::a.every]
cells = []
for f in files:
    im = cv2.imread(f)
    if a.crop: x0, y0, x1, y1 = map(int, a.crop.split(",")); im = im[y0:y1, x0:x1]
    k = a.width / im.shape[1]
    im = cv2.resize(im, (a.width, int(im.shape[0] * k)), interpolation=cv2.INTER_AREA)
    label = os.path.splitext(os.path.basename(f))[0]
    cv2.putText(im, label, (8, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 0), 4, cv2.LINE_AA)
    cv2.putText(im, label, (8, 22), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 1, cv2.LINE_AA)
    cells.append(im)
cols = a.cols or min(len(cells), 6)
while len(cells) % cols: cells.append(np.zeros_like(cells[0]))
cv2.imwrite(a.out, np.vstack([np.hstack(cells[i:i + cols]) for i in range(0, len(cells), cols)]))
print(a.out, len(files), "frames")
