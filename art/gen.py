"""Generate one reference image with Nano Banana: art/gen.py OUT.png "prompt" [--ref a.png ...] [--aspect 1:1] [--size 2K]

Design-time only: what it makes is looked at, approved and traced; no frame of the video comes from it.
The key is GEMINI_API_KEY in .env.
"""
import argparse, base64, io, json, os, sys, urllib.request
from PIL import Image

p = argparse.ArgumentParser()
p.add_argument("out"); p.add_argument("prompt")
p.add_argument("--ref", nargs="*", default=[])
p.add_argument("--aspect", default="1:1"); p.add_argument("--size", default="2K")
p.add_argument("--model", default="gemini-3.1-flash-image")
a = p.parse_args()

key = os.environ.get("GEMINI_API_KEY")
if not key:
    for line in open(os.path.join(os.path.dirname(__file__), "..", ".env")):
        if line.startswith("GEMINI_API_KEY="):
            key = line.split("=", 1)[1].strip().strip('"\'')
parts = [{"inline_data": {"mime_type": "image/png", "data": base64.b64encode(open(r, "rb").read()).decode()}}
         for r in a.ref] + [{"text": a.prompt}]
body = {"contents": [{"parts": parts}],
        "generationConfig": {"responseModalities": ["IMAGE"],
                             "imageConfig": {"aspectRatio": a.aspect, "imageSize": a.size}}}
req = urllib.request.Request(
    f"https://generativelanguage.googleapis.com/v1beta/models/{a.model}:generateContent",
    data=json.dumps(body).encode(), headers={"x-goog-api-key": key, "Content-Type": "application/json"})
try:
    res = json.load(urllib.request.urlopen(req, timeout=300))
except urllib.error.HTTPError as e:
    sys.exit(f"HTTP {e.code}: {e.read().decode()[:600]}")
for part in res.get("candidates", [{}])[0].get("content", {}).get("parts", []):
    d = part.get("inlineData") or part.get("inline_data")
    if d:
        # The service answers in JPEG whatever is asked; save in the format the name says.
        Image.open(io.BytesIO(base64.b64decode(d["data"]))).convert("RGB").save(a.out)
        print("wrote", a.out, res.get("usageMetadata", {}).get("totalTokenCount"))
        break
else:
    sys.exit("no image: " + json.dumps(res)[:600])
