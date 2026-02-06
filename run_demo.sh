#!/usr/bin/env bash
set -euo pipefail

echo "Starting SAFELEARN demo..."

if [ ! -d ".venv" ]; then
  python -m venv .venv
fi

source .venv/bin/activate
pip install -q fastapi uvicorn pytest

uvicorn src.backend.app.main:app --reload &
BACKEND_PID=$!

sleep 2

if command -v curl >/dev/null 2>&1; then
  curl -s http://127.0.0.1:8000/health || true
fi

echo ""
echo "Backend running at http://127.0.0.1:8000"
echo "Demo credentials:"
echo "- Parent PIN: 1234"
echo "- Demo child: Luna"
echo ""
echo "Recommended demo flow:"
echo "1) Demo Login → Select Child"
echo "2) Kid Chat → Quick Prompt → Socratic hint"
echo "3) Quest Runner → Complete Quest → World Unlock"
echo "4) Learning World → Tap unlocked item"
echo "5) Parent Dashboard → Safety Audit → Sessions Summary → Reset Demo"
echo ""
echo "Founder script (short):"
echo "- Highlight the Walled Garden (no web browsing or links)."
echo "- Show safety layers and refusal quality."
echo "- Show Socratic hints and learning-world rewards."
echo "- Show session summaries without transcripts."
echo ""

if command -v flutter >/dev/null 2>&1; then
  cd src/frontend
  flutter pub get
  flutter run
else
  echo "Flutter not found. Run the frontend manually:"
  echo "  ./run_frontend.sh"
fi

kill "$BACKEND_PID" >/dev/null 2>&1 || true
