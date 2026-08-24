# Security & Privacy Architecture — HanapGawa

Threat model and controls. The design principle throughout: **ease of use and safety are the same feature** for this audience — every control below is invisible or one-tap for the user.

## 1. Assets & adversaries

**Assets**: user identities (phone, name, address), KYC artifacts (ID types, last-4 only), money movements (ledger), chat content, location data, platform funds.

**Adversaries**:
| Adversary | Goal | Primary controls |
|---|---|---|
| Scammer posing as client/provider | Advance-fee fraud, no-show theft | KYC ladder, escrow (no user-to-user prepayment exists at all), reviews |
| Account hijacker | Take over a trusted provider account | OTP on phone (SIM-registered), bcrypt(12) passwords, tokenVersion revocation, rate limits |
| Disintermediator | Move deal off-platform | Chat masking + leak-hint detection, strikes, address privacy, loyalty pricing |
| Malicious insider / stolen DB | PII harvest | PII minimization (last-4 only, no full IDs), serializer boundary, audit log |
| Web attacker | XSS/CSRF/IDOR/injection | React auto-escaping + strict CSP, SameSite+origin checks, ownership guards, Prisma parameterization, zod validation |
| Abusive counterpart (physical safety) | Harm during a job | Two-sided verification, job records, report/dispute pipeline, safety guidance, (roadmap: SOS + check-in/out) |

## 2. Authentication & session design

- **Phone-first identity** (`+639XXXXXXXXX` canonical): matches SIM Registration Act reality; no email required (masa-friendly).
- OTP: 6-digit, bcrypt-hashed at rest, 5-minute TTL, max 5 attempts, consumed-once; send rate-limited per phone (3/10min). **No links in SMS** (Globe drops link-bearing SMS).
- Passwords: bcrypt cost 12; login compares against a dummy hash on unknown phone (no user enumeration, uniform timing); generic error message.
- Sessions: HS256 JWT in an **httpOnly, SameSite=Lax, Secure** cookie, 7-day TTL. Payload carries `tokenVersion`; bumping it (e.g., on suspension) **revokes all sessions instantly**. The server refuses to boot in production with the default secret.
- CSRF: SameSite=Lax + explicit same-origin check (`Origin`/`Sec-Fetch-Site`) on every state-changing request.

## 3. Authorization (the IDOR wall)

Every sensitive route re-derives rights from the database row, never from client input:
- Job lifecycle actions check `clientId` / `assignedProviderId` **inside the transaction** (`src/lib/jobs.ts`).
- Chat requires the pair to be {job owner} × {provider with a live offer or booking} (`assertChatAllowed`).
- Offers: only the job owner accepts/declines; only the offer owner withdraws; you cannot offer on your own job.
- Reviews: only the two parties of a COMPLETED job, one per rater, enforced by a DB unique constraint.
- Admin routes: `requireAdmin()`; admins cannot suspend admins.

## 4. Money integrity

- All money is **integer centavos**; the ledger is append-only — balances are `SUM(amountCents)`, never a mutable column, so every peso is traceable and reconstructible.
- Escrow hold/release/refund run inside **one DB transaction** with the job-state transition; the state machine (`OPEN→BOOKED→IN_PROGRESS→DONE_BY_PROVIDER→COMPLETED`) forbids money-relevant shortcuts (no payout without work, no refund after payout) — property-tested in `tests/lifecycle.test.ts` and `tests/money.test.ts` (commission+payout always sums to the exact amount).
- Cash-outs debit the wallet at request time (no double-spend window); rejection re-credits.
- Take rate is **frozen onto the job at booking** — a later category config change can't alter an in-flight job's economics. Hard 30% ceiling in code protects providers from misconfiguration.
- Production note: the "wallet" becomes a ledger view over **aggregator-held funds** (PayMongo/Xendit split payments) — the platform never holds deposits (see LEGAL.md); webhooks, not client redirects, credit top-ups.

## 5. Data privacy (RA 10173 by design)

- **PII minimization**: full ID numbers are never stored (last-4 + doc type only); payout account references stored masked (`GCASH:••••1234`); phone/email never serialized to any other user — the serializer layer (`src/lib/serialize.ts`) is the single choke point deciding `publicUser` vs `selfUser`.
- **Address privacy**: exact address (`addressNote`) is a private field revealed only to the booked provider after escrow is held — never in the public feed, never pre-booking.
- Surname reduced to an initial publicly; city-level location only.
- **Audit log** on every sensitive action (auth, money, KYC decisions, admin actions, masked-chat events) with actor, target, IP — the DPA accountability trail and dispute evidence.
- Compliance runway (see LEGAL.md): DPO designation at launch; NPC registration once sensitive records of 1,000+ people exist; 72-hour breach notification runbook; privacy notice in plain Taglish; data-subject rights (access/correct/delete) via support at MVP, self-serve later.
- Retention: chat/job records kept ≥2 years (Internet Transactions Act) then pruned; KYC docs (when uploads ship) go to private object storage with short-lived signed URLs, encrypted at rest.

## 6. Anti-disintermediation subsystem

- `maskContacts()` masks before storage (raw text is never persisted): PH mobile formats (`09…`, `+63…`, spaced/dashed), any 7+ digit run, emails incl. `(at)/(dot)` obfuscation, messenger deep links (`wa.me`, `t.me`, `m.me`, `fb.com`…), platform+handle patterns, and digit-words spelled out in English *and* Tagalog ("zero nine one seven…", "sero siyam isa pito…").
- Leak *hints* ("cash na lang wag na sa app", "PM kita sa FB") flag without rewriting — a human-review signal, not censorship.
- Flagged message → user strike; 3 strikes → account FLAGGED → admin review queue → suspend (kills sessions via tokenVersion) or clear. Graduated, never fines.
- The economic layer does the real work (escrow protection, reviews, loyalty pricing) — the filter just raises the cost of leaving. False positives cost one masked string; a leaked deal costs both users all protection.

## 7. Platform hardening

- Security headers on every response: strict CSP (self-only, no third-party scripts), HSTS, X-Frame-Options DENY, nosniff, restrictive Permissions-Policy. `poweredByHeader` off.
- Input validation: zod schemas on **every** API body, PH-bounded lat/lng, length caps everywhere; Prisma = parameterized queries (no raw SQL in the codebase).
- Rate limiting per route class (login 8/15min/IP, OTP 3/10min/phone, messages 30/min, posts 10/h) — in-memory now, Redis interface-compatible for multi-node (SCALING.md).
- Uniform error envelope; stack traces never leave the server; generic 500 text.
- Secrets via env only; `.env` gitignored; production boot fails without a real `SESSION_SECRET`.

## 8. Trust & safety operations (the human layer)

- KYC review queue with document-type constraints per level; approvals stamp verifier + timestamp.
- Reports (scam/harassment/no-show/off-platform/unsafe) → admin queue → resolve/dismiss/suspend.
- Disputes freeze escrow; admin resolves refund/pay/split — money moves only through the same transactional ledger paths.
- Published safety guide (`/safety`) in Taglish: what badges mean exactly (the Care.com/FTC lesson), why chat stays in-app, emergency guidance (911 first), first-job-in-public advice.

## 9. Known gaps (deliberate MVP scope — before public launch)

1. Real SMS + PayMongo/Xendit integration (adapters stubbed; webhook signature verification required).
2. KYC document upload + PSA eVerify face-match (declaration + manual review today).
3. SOS button, job check-in/out with trusted-contact sharing (Grab pattern).
4. Redis-backed rate limiting + WAF/bot protection at the edge.
5. CSP nonce migration (drop `unsafe-inline` for scripts).
6. ~~Password reset flow~~ — **done**: SMS-code reset at `/forgot`; no account
   enumeration, and a successful reset bumps `tokenVersion` so every existing
   session (including an attacker's) is revoked at that moment.
7. Independent penetration test before public launch.

## 10. Adversarial review — findings fixed before merge

A multi-agent adversarial review (authz, web, money-flow, API-contract, schema, frontend dimensions; each finding independently verified) was run against this codebase. Everything confirmed was fixed and regression-tested live:

| Severity | Finding | Fix |
|---|---|---|
| Critical | Client could **dispute-then-cancel** to self-refund full escrow after work was done, bypassing admin resolution | DISPUTED jobs are frozen for both parties; `resolveDispute()` (admin) is the only exit — verified live: exploit now returns 409 |
| High | Rate-limit/audit IP came from the **leftmost** `X-Forwarded-For` entry (attacker-controlled) | Rightmost (proxy-appended) entry is used |
| High | Money transitions (accept/complete/cancel/resolve/payout decisions) raced under concurrency (TOCTOU on Postgres) | Atomic conditional `updateMany` state-claims before any ledger write, plus `Serializable` isolation on Postgres |
| High | PayMongo mode had **no webhook**, so real top-ups never credited | `/api/webhooks/paymongo` with HMAC signature verification (timing-safe) and per-event idempotency |
| Medium | `jobView` leaked precise **lat/lng** to anonymous viewers while gating the text address | Coordinates now gated exactly like the address; server-side distance sort unaffected |
| Medium | Registration 409 allowed **account enumeration** | Uniform response; unverified numbers get the OTP re-sent, verified ones learn nothing |
| Medium | Admin payout/KYC decisions could double-apply on double-click | Atomic PENDING-state claims |
| Low | OTP attempt counter racy; duplicate provider categories 500'd; PSGC validation skipped on job post; refunded bookings inflated GMV | All fixed (atomic increments/consume, explicit 400s, city-in-region check, GMV = completed jobs only) |

Frontend correctness fixes from the same review: provider profile edit no longer wipes existing categories/availability (prefills), Level-3 KYC no longer submits a Level-2 doc type, withdrawn offers can re-offer, disputed jobs keep chat accessible, chat scrolls its own pane only, stale feed responses are dropped, provider list paginates.

## 11. Notifications and account recovery (added after the first review)

- **Notifications** are written on every state change that matters to a
  counterparty (offer received/accepted/declined, job started/done/completed/
  cancelled, new message, dispute opened/resolved, KYC and payout decisions,
  wallet credit). Reads and mark-read are scoped to the caller — passing
  someone else's notification id marks nothing. Writes are best-effort: a
  failed notification never rolls back the booking or payout that triggered
  it, and that contract is unit-tested.
- **Password reset** (`POST /api/auth/reset`) is a two-step SMS-code flow.
  Both steps answer identically whether or not the number is registered, the
  code is single-use and rate-limited on send and on verify, and a successful
  reset increments `tokenVersion`, which invalidates every session already
  issued for that account. Verified end to end: old cookie → 401, old
  password → 401, replayed code → rejected.
- **CI** (`.github/workflows/hanapgawa-ci.yml`) runs typecheck, unit tests,
  a seeded production build, and a smoke test that asserts `/api/notifications`
  and `/api/admin/overview` reject anonymous callers — so an authorization
  regression fails the build rather than reaching review.

## 11. Safety, identity documents, and monitoring

### Emergency support (SOS + check-in)

A provider alone in a stranger's house is this product's core physical risk, so the panic path has its own rules that override the conventions used everywhere else in the codebase:

- **The alert is always recorded.** SOS is not rate-limited, does not require KYC beyond a session, and tolerates a malformed body — a bad `jobId` downgrades the alert to account-level rather than rejecting it. The record is written *before* any notification is attempted, so a downstream failure can never swallow a call for help.
- **Fan-out is best-effort and counted.** Each trusted contact is texted individually; the number actually reached is stored on the alert for the incident file. The counterparty is notified (often enough to defuse a misunderstanding) and every admin is paged.
- **The operator console breaks the usual PII rule on purpose.** The SOS queue is the one place that shows a full phone number and precise coordinates — an operator has to be able to call the person and tell responders where to go. Every read of that queue is audit-logged.
- **Check-ins** give both parties a timestamped arrival/departure trail, and give support something factual when a dispute turns into one person's word against another's.

### Identity documents

ID scans are the most valuable data in the system — worth more to a fraudster than a password. Controls:

| Risk | Control |
|---|---|
| Polyglot / disguised upload | Type is decided by **magic bytes**, never the client's `Content-Type`. SVG and HTML are rejected outright; only JPEG, PNG, WEBP and PDF pass |
| Oversized upload | Rejected on declared `Content-Length` before buffering, then again on actual size — 6 MB cap |
| Enumeration | Keys are 24 random bytes, not sequential; a leaked key names one document and nothing else |
| Public exposure | Files are written outside any web-servable path (`var/private/`, gitignored). There is **no** public URL — reads go through an admin-only route |
| Path traversal | Keys are pattern-validated and the resolved path is re-checked against the storage root |
| Attaching to someone else's application | Upload requires ownership of a `PENDING` submission; a foreign id returns 404 |
| Active content in a PDF | The document response is served under `default-src 'none'; sandbox` via `src/middleware.ts`, plus `nosniff` and `no-store` |
| Silent viewing | Every single document read writes an audit row naming the admin and the subject |
| Indefinite retention | The image is **deleted from storage the moment a decision is recorded** (`docPurgedAt`), keeping the decision and audit trail but not the scan — RA 10173 data minimization. Subsequent reads return 410 |

Verified live: an SVG renamed `photo.jpg` and an HTML file claiming `image/png` were both rejected; a second user attaching to another's submission got 404; owner and anonymous reads of the document returned 403/401; after approval the read returned 410 and zero files remained on disk.

### Error monitoring

`src/lib/monitoring.ts` reports unexpected errors with a `requestId` that is also returned to the caller and set as `X-Request-Id`, so a user can quote it to support. Reports are **scrubbed before they leave the process**: sensitive keys (`password`, `codeHash`, `token`, `accountRef`, `phone`, `addressNote`, `lat`, `lng`, `idLastFour`, …) are redacted by name, and PH phone numbers and email addresses are stripped from free text anywhere they appear. Only a user *id* is attached, never a name or number. Dev logs structured JSON; production ships to a Sentry-compatible collector with a 3-second timeout so monitoring can never stall a user request. `/api/health` is an intentionally boring liveness probe — database reachability and nothing else, so it cannot double as a reconnaissance endpoint.
