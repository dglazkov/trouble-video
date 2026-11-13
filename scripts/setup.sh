#!/usr/bin/env bash
# Everything a fresh clone needs, once: node_modules (playwright-core, three) and .venv with requirements.txt.
#   npm run setup            (or: bash scripts/setup.sh)
# It installs nothing system-wide and downloads no browser: Chrome or Chromium must already be on the machine
# (npm run doctor says whether it was found). PYTHON=python3.12 npm run setup chooses the Python.
set -euo pipefail
cd "$(dirname "$0")/.."
PY="${PYTHON:-python3}"
command -v node >/dev/null || { echo "setup: Node.js is not installed (version 20 or later is needed)"; exit 1; }
command -v "$PY" >/dev/null || { echo "setup: $PY is not installed (Python 3.10 or later is needed; PYTHON=... chooses another)"; exit 1; }
echo "setup: node $(node --version), $("$PY" --version)"
if [ -f package-lock.json ]; then npm ci --no-audit --no-fund; else npm install --no-audit --no-fund; fi
[ -x .venv/bin/python ] || "$PY" -m venv .venv
.venv/bin/python -m pip install --quiet --upgrade pip
if ! .venv/bin/python -m pip install --quiet -r requirements.txt; then
  echo "setup: the pinned versions are not available for $("$PY" --version); installing the same packages unpinned (not the verified set)"
  sed -e 's/==.*//' -e '/^#/d' -e '/^$/d' requirements.txt > .venv/requirements.unpinned.txt
  .venv/bin/python -m pip install --quiet -r .venv/requirements.unpinned.txt
fi
[ -f .env ] || echo "setup: no .env (fine: a GEMINI_API_KEY is only needed to make new drawings; see .env.example)"
node scripts/doctor.mjs
