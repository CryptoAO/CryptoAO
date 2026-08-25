# Scaling & Architecture Roadmap — HanapGawa

The MVP is deliberately a **modular monolith**: one Next.js app, one Prisma schema, clean library seams (`src/lib/*`). Every scaling step below swaps an implementation behind an existing interface — no rewrite.

## Stage 0 — Pilot (0–10k MAU, one city) · ~₱3–15k/month
- Deploy: Vercel (or Railway/Fly.io) + **managed PostgreSQL** (Neon/Supabase/RDS). Switch is config-only: `datasource provider = "postgresql"` + `DATABASE_URL` (schema is already Postgres-compatible; String-status fields become native enums in a later migration if desired).
- SQLite stays for local dev; SMS via Semaphore (~₱0.56/msg); payments via PayMongo/Xendit sandbox → live.
- Chat polling (5s) is fine at this scale.

## Stage 1 — City density (10k–100k MAU) · ~₱30–80k/month
- **Redis** (Upstash/ElastiCache): rate limiting is already wired — set `REDIS_URL`, `npm i ioredis`, and `rateLimitAsync()` moves from per-instance memory to a fleet-wide counter with no code change (it fails open on a store outage, so Redis going down degrades abuse control rather than locking users out). Then: session denylist, hot-feed caching (60s TTL per city/category page), OTP state.
- **Object storage** (S3/R2) for KYC docs & photos: private buckets, short-lived signed URLs, encrypted at rest.
- **Postgres indexes** are already declared in the schema (`status+region+city`, `category+status`, ledger by user/time). Add `pg_trgm` GIN index for search (replaces `contains`) and consider PostGIS or a geohash column when distance-sort outgrows the in-memory haversine over a 200-row window.
- Background jobs (BullMQ or pg-boss): SMS sends, webhook retries, review reminders, escrow auto-release timers (e.g., auto-confirm 72h after DONE_BY_PROVIDER unless disputed).
- Observability: Sentry + structured logs + uptime alerts; nightly DB backups with restore drills.

## Stage 2 — Multi-city (100k–500k MAU) · ~₱150–400k/month
- Split traffic: Next.js app nodes (stateless — sessions are JWT, rate limits in Redis) behind a load balancer; Postgres primary + read replicas (feed reads → replicas; money writes → primary).
- **Chat moves to WebSockets/SSE** via a dedicated realtime service (or managed: Ably/Pusher) — the message API contract stays.
- Money-integrity hardening at concurrency: wrap escrow transactions with `SELECT … FOR UPDATE` on the job row (Prisma `$queryRaw` lock or serializable isolation) — the single-writer SQLite semantics the MVP relies on must become explicit locks on Postgres.
- Full PSGC import (all ~1,600 cities/municipalities + barangays) into a `locations` table; the `{code, name, regionCode, lat, lng}` interface in `src/lib/psgc.ts` is already the contract.
- CDN for static assets; image resizing pipeline; WAF/bot management at the edge.
- Native Android app (<30MB) reusing the same API: push notifications, SMS Retriever OTP autofill, camera KYC. The installable PWA already covers home-screen launch and offline tolerance, so the native build is justified by push and camera, not by "we need an app" — decide it on retention data, not instinct.

## Stage 3 — National (500k+ MAU)
- Extract true service boundaries only where load demands: `payments-ledger` (append-only, strict SLO), `chat`, `search/feed` (denormalized read models, possibly OpenSearch), `trust` (KYC/fraud scoring). Postgres logical replication/CDC feeds read models — the ledger stays the source of truth.
- Partition hot tables (LedgerEntry, Message, AuditLog) by month; archive cold partitions to object storage.
- Multi-AZ; RPO ≤ 5min, RTO ≤ 1h; chaos drills.
- Fraud/risk ML on the audit + ledger event stream (leakage detection, fake-review rings, GCash cash-out mule patterns).

## Traffic expectations & load profile
A services marketplace is read-heavy and bursty-morning (7–10am booking peak, PH time):
- 100k MAU ≈ ~15–25 req/s average, ~150 req/s peak — comfortably 2–3 app nodes + one db.r6g.large-class primary.
- The dangerous load is not requests: it is **chat fan-out** (→ WebSockets at Stage 2) and **feed queries per city** (→ Redis cache + replicas). Money writes are low-volume and must stay strongly consistent — never cache, never shard early.

## Cost-per-user sanity check
Infra lands at **₱1–3/MAU/month** through Stage 2 — an order of magnitude below the ~₱35 contribution per completed job. Infrastructure never becomes the reason this business fails; supply-side operations and trust staffing are the real cost centers (see BUSINESS-MODEL.md).
