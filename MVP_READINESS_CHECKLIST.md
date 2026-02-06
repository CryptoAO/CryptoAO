# SAFELEARN MVP Readiness Checklist

## What works (demo-grade)
- In-memory FastAPI backend with demo auth, chat, quests, world unlocks, and parent summary.
- Safety defense-in-depth (input guard, output guard, refusal templates, lockout).
- Learning Vault seed content and scripted quests (4 total + boss review).
- Flutter demo UI with Kid Chat, Quest Runner, Learning World, Parent Dashboard, and demo tour.
- Session summaries and safety audit without raw transcripts.
- One-command demo script (`./run_demo.sh`).

## Known limitations
- No real LLM; Spark uses mock retrieval + deterministic hints.
- No persistent storage; all state is in-memory and resets on restart.
- No Supabase auth or RLS.
- Offline mode uses limited local quests only.

## Phase 2 backlog (not in this MVP)
- Real LLM (Gemini) with RAG and pgvector.
- Supabase auth, profiles, and persistence.
- Expanded content studio and moderation workflow.
- Deeper analytics and classroom/teacher modes.
