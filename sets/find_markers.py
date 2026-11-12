"""Find camera-agreement markers (pure magenta blobs) in a frame: find_markers.py FRAME.png -> JSON [[x, y, pixels], ...]
x, y are blob centroids in pixels (pixel centres at +0.5), largest first."""
import sys, json, cv2, numpy as np
im = cv2.imread(sys.argv[1]).astype(int); b, g, r = im[..., 0], im[..., 1], im[..., 2]
mask = ((r > 200) & (b > 200) & (g < 70)).astype(np.uint8)
n, lab, stats, cent = cv2.connectedComponentsWithStats(mask, 8)
out = sorted(([float(cent[i][0]) + 0.5, float(cent[i][1]) + 0.5, int(stats[i][4])] for i in range(1, n) if stats[i][4] >= 4), key=lambda t: -t[2])
print(json.dumps(out))
