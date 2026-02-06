# SAFELEARN Setup

## Backend
```bash
python -m venv .venv
source .venv/bin/activate
pip install fastapi uvicorn pytest
uvicorn src.backend.app.main:app --reload
```

## Frontend
```bash
cd src/frontend
flutter pub get
flutter run
```

## Quick Demo Scripts
```bash
./run_backend.sh
./run_frontend.sh
```

## One-command demo
```bash
./run_demo.sh
```

## Supabase
- Apply migrations in `supabase/migrations/001_init.sql`.
- Enable pgvector extension.

## Environment Variables
- `SUPABASE_URL`
- `SUPABASE_KEY`
- `GEMINI_API_KEY`
