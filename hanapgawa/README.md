# HanapGawa 🇵🇭 — May kailangan? May kaya!

A trust-first gig & services marketplace for the Philippines: labada, linis-bahay, padala, hatid-sundo (goods), dog walking, fitness training, aircon cleaning, and every kayang gawin — with **verified identities, escrow-protected payments, a 12% platform commission engine, geo-sorted job feeds (all 17 PH regions), and leak-proof in-app chat**.

Built mobile-first for the masa: big touch targets, Taglish copy, works on a ₱4,000 Android over prepaid data.

## Quick start

```bash
cd hanapgawa
npm install          # also runs prisma generate
npm run db:push      # create SQLite dev database
npm run db:seed      # categories, demo users, demo jobs
npm run dev          # http://localhost:3000
```

**Demo accounts** (password `password123`):
| Role | Phone | Notes |
|---|---|---|
| Admin | `09170000001` | `/admin` console: KYC, disputes, payouts, reports |
| Provider | `09170000002` | Aling Nena — labandera, QC, Fully Vetted (L3) |
| Client | `09170000006` | Carlo — QC, has wallet history |

In dev, OTP codes print to the server console and wallet top-ups are instant. Production adapters (Semaphore SMS, PayMongo GCash/Maya) are behind interfaces in `src/lib/sms.ts` and `src/lib/payments.ts`.

```bash
npm test             # 100 unit tests: commission math, contact masking, lifecycle, matching,
                     # auto-release windows, pricing percentiles, provider readiness,
                     # account-closure rules, magic-byte sniffing, error scrubbing, rate limits
npm run build        # production build
```

## What's inside

| | |
|---|---|
| `src/lib/jobs.ts` | Job lifecycle state machine + escrow transactions (single source of truth) |
| `src/lib/wallet.ts` | Append-only money ledger: hold / release+commission / refund |
| `src/lib/safety.ts` | Anti-disintermediation: contact masking (incl. Tagalog spelled-out digits), leak hints, strikes |
| `src/lib/autorelease.ts` | The clock that releases escrow when a client goes quiet; a dispute stops it |
| `src/lib/matching.ts` | Job broadcast to matching providers, reliability stats, rebook |
| `src/lib/pricing.ts` | What a job is worth: real completed-job percentiles, falling back to a labelled estimate |
| `src/lib/readiness.ts` | What still stands between a provider and being reachable by the broadcast |
| `src/lib/account.ts` | RA 10173 in code: data export, and closure that anonymises in place |
| `src/lib/psgc.ts` | 17 regions + 130 cities with coordinates; haversine distance sort |
| `src/lib/serialize.ts` | The PII boundary — what each viewer may see |
| `src/app/api/*` | ~25 route groups: auth/OTP, jobs, offers, chat, reviews, wallet, KYC, admin |
| `src/app/*` | Mobile-first Taglish UI: feed, posting, booking, chat, provider profiles, wallet, admin console |
| `prisma/` | Schema (SQLite dev / Postgres prod) + rich seed |
| `tests/` | Vitest suite for the money-critical logic |

## Documentation

- **[docs/RESEARCH.md](docs/RESEARCH.md)** — the market deep-dive: competitor landscape (who died and why), pricing tables, the 8.2M unplatformed gig workers, PhilSys eVerify, payments law, disintermediation science
- **[docs/BUSINESS-MODEL.md](docs/BUSINESS-MODEL.md)** — revenue ladder, unit economics (₱34 contribution per ₱500 job), cost to build & run, KPIs
- **[docs/PRD.md](docs/PRD.md)** — the refined product brief (your prompt, fine-tuned), personas, phased feature map
- **[docs/SECURITY.md](docs/SECURITY.md)** — threat model, money integrity, RA 10173 privacy design, known MVP gaps
- **[docs/LEGAL.md](docs/LEGAL.md)** — PH regulatory checklist: why we never say "escrow", worker-classification firewall, LTFRB boundaries, BIR withholding
- **[docs/SCALING.md](docs/SCALING.md)** — modular-monolith → multi-city architecture without a rewrite
- **[docs/OPERATIONS.md](docs/OPERATIONS.md)** — the runbook for whoever operates this: the daily loop, the 2am SOS call, how to decide a dispute, KYC standards, payouts, and the 72-hour breach clock

## Production posture (read before launching)

1. Postgres via `DATABASE_URL`, strong `SESSION_SECRET` (boot fails without it), `SMS_PROVIDER=semaphore`, `PAYMENTS_PROVIDER=paymongo`.
2. **`CRON_SECRET` is required** or escrow never auto-releases — `/api/cron/auto-release` returns 503 until it is set, on purpose. Schedule it hourly; `vercel.json` already does on Vercel, which passes the secret automatically.
3. Set `REDIS_URL` (and `npm i ioredis`) the moment there is more than one app instance, or every rate limit is silently multiplied by the instance count.
4. Money is held by the licensed payment aggregator, not the company — see LEGAL.md §2.
5. Fill in the company name and Data Protection Officer details in `/terms` and `/privacy` — they ship as bracketed placeholders.
6. The KYC ladder accepts and stores documents but the match is still a human reading a scan; wire PSA eVerify before public launch.
7. Independent penetration test + the SECURITY.md §9 gap list.
