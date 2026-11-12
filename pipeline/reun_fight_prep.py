"""Hand fixes to the reunion's fight plates, repeatable: .venv/bin/python pipeline/reun_fight_prep.py
  reun_ife_key_1.jpg -> .png   the part of Ife's lens that stands past her cheek came back pale pink (glass over the key
                               colour): it is made the key itself, so the set shows through it; its white glints stay
"""
import numpy as np
from PIL import Image
a = np.asarray(Image.open("kits/ife/closeup/reun_ife_key_1.jpg").convert("RGB")).copy()
x0, y0, x1, y1 = 770, 590, 905, 840
r, g, b = (a[y0:y1, x0:x1, i].astype(int) for i in range(3))
pink = (r > 190) & (b > 180) & (g < r - 28) & (g > 60)
a[y0:y1, x0:x1][pink] = (255, 0, 255)
Image.fromarray(a).save("kits/ife/closeup/reun_ife_key_1.png")
print("lens pixels keyed:", int(pink.sum()))
