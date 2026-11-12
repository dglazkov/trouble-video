#!/bin/sh
# Render all 72 frames headless, then mux with the matching audio slice.
set -e
cd "$(dirname "$0")/../.."
BL=tools/blender/blender
FF=$(.venv/bin/python -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")
"$BL" -b --factory-startup -P bakeoff/blender/shot.py -- --frames 0-71
"$FF" -y -loglevel error -framerate 24 -start_number 0 -i out/bakeoff/blender/frames/f_%04d.png \
  -ss 50.5 -t 3 -i audio.wav -map 0:v -map 1:a \
  -c:v libx264 -preset slow -crf 17 -pix_fmt yuv420p -c:a aac -b:a 256k -shortest -movflags +faststart \
  out/bakeoff/blender.mp4
