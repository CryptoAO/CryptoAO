# SAFELEARN MVP Demo

## Start here

### Prerequisites
- Python 3.10+
- Flutter SDK

### Quick demo (local)
1) Run backend:
```bash
./run_backend.sh
```
2) Run frontend (new terminal):
```bash
./run_frontend.sh
```

### 2-minute demo (single command)
```bash
./run_demo.sh
```

### Demo flow checklist
- Demo Login → Select Child
- Kid Chat → Quick Prompt → Socratic hint
- Quest Runner → Complete Quest → World Unlock
- Learning World → Tap unlocked item
- Parent Dashboard → Safety Audit → Sessions Summary → Reset Demo

### Reset demo
Use the Parent Dashboard (PIN 1234) and click **Reset Demo**.

### Common fixes
- If the backend is not reachable, confirm it is running on `http://127.0.0.1:8000`.
- If Flutter can’t connect to the backend, ensure your emulator or device can access `127.0.0.1`.
- If the demo flow gets stuck, use **Reset Demo** to clear in-memory state.

## Notes
- Supabase is optional and not required for this demo.
- The backend uses in-memory seed data under `src/backend/app/seed`.
