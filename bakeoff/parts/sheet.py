"""Contact sheet of one cycle (8 held poses) from captured frames: sheet.py FRAMEDIR OUT.png [crop x0,y0,x1,y1]"""
import sys, cv2, numpy as np
d, out = sys.argv[1], sys.argv[2]
x0, y0, x1, y1 = map(int, (sys.argv[3] if len(sys.argv) > 3 else "560,60,1360,1000").split(","))
ims = [cv2.imread(f"{d}/f{f:04d}.png")[y0:y1, x0:x1] for f in range(0, 16, 2)]
rows = [np.hstack(ims[:4]), np.hstack(ims[4:])]
cv2.imwrite(out, np.vstack(rows))
