#!/usr/bin/env bash
set -euo pipefail

python -m venv .venv
source .venv/bin/activate
pip install fastapi uvicorn pytest
uvicorn src.backend.app.main:app --reload
