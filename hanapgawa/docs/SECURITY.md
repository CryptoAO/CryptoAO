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

### Installed app (PWA) and the offline cache

The app is installable from the browser — no Play Store — which matters for a mostly budget-Android audience, but a service worker is a cache that outlives the session, so it is deliberately kept nearly empty.

| Risk | Control |
|---|---|
| Serving one user's data to the next person on a shared phone | The worker **never caches a navigation response and never touches `/api/*`** — it returns early for both. Pages are always fetched from the network |
| Stale authenticated HTML after logout | Nothing authenticated is ever stored, so there is nothing to invalidate on logout |
| Cross-origin poisoning | Requests to any other origin, and any non-`GET`, are passed straight through untouched |
| A stale worker pinning an old build | `install` calls `skipWaiting()` and `activate` deletes every cache whose name is not the current version, then claims open clients |

What the cache *does* hold: fingerprinted `/_next/static/` build output, the launcher icons, and a static `offline.html` card. Verified in a headless browser — after a full page load and reload, the cache contained only those entries, no `/api` and no page responses, and going offline rendered the offline card rather than a browser error. `tests/pwa.test.ts` asserts the same invariants against the worker source so a future edit cannot quietly start caching pages.

### Rate limiting across more than one instance

`rateLimit()` counts in process memory, which is correct for one node and wrong the moment there are two — eight login attempts becomes eight *per server*. `rateLimitAsync()` (used by login, register and OTP send) uses a shared Redis counter when `REDIS_URL` is set and falls back to memory when it is not. It **fails open** on a store error: a Redis outage must degrade abuse control, not lock every user out of their account.

### Escrow auto-release

Escrow that protects the client is a trap for the provider if it has no exit. Somebody cleans a house, marks the job done, and a client who is merely busy — not dishonest — never presses confirm. Under the original rules that money never moved. The clock fixes it:

| | |
|---|---|
| Clock starts | When the provider marks the work done, in the same atomic write that flips the status |
| Client nudged | `AUTO_RELEASE_WARN_HOURS` (default 48h) after that, once — the claim on `releaseWarnedAt` is atomic, so overlapping sweeps cannot double-notify |
| Escrow releases | `AUTO_RELEASE_HOURS` (default 72h) after that, with the normal commission split, and **both** parties are notified — money moving without the client touching anything must never be a surprise |
| Dispute | Stops the clock dead. The sweep only ever selects `DONE_BY_PROVIDER`, so a `DISPUTED` job is not merely skipped, it is never fetched |
| Pre-clock bookings | Jobs marked done before this shipped have a null `autoReleaseAt` and are skipped. Reading null as "overdue" would have dumped every historical escrow on the first sweep |

The release path is the *same function* the client's confirm button calls, with the actor swapped — so it inherits the atomic state-claim, the Serializable isolation, and the dispute freeze rather than reimplementing them. That is what makes the sweep safe to run twice, or concurrently, or after being down for a week.

`/api/cron/auto-release` is gated on a bearer `CRON_SECRET` compared with `timingSafeEqual`. **There is no development bypass**: an unset secret returns 503 rather than running. "Open in dev" is one misconfigured environment away from letting anyone on the internet push every held escrow out the door.

Verified end to end against the running server: unauthenticated, wrong-secret and wrong-length-secret calls all returned 401; a fresh job was not touched; at 50h the client was nudged exactly once and a second sweep did not nudge again; past the deadline the sweep released ₱500 as ₱440 to the provider (12% commission) and marked the job `autoReleased`; an immediate re-run released nothing; and a `DISPUTED` job 200 hours past its deadline kept its escrow held.

### Data subject rights, implemented

A privacy notice that routes access, portability and erasure through an email address is legally sufficient and practically hollow — the founder becomes the bottleneck and most people never bother. Both are in the app instead.

**Export** (`GET /api/me/export`) returns everything held about the caller as one JSON file: profile, jobs on both sides, offers, their own sent messages, reviews given and received, the full wallet ledger and payout history, identity-submission *metadata*, trusted contacts, notifications and check-ins. Two deliberate omissions:

- **Never the identity-document image, and never its storage key.** Re-emitting a scan of somebody's licence over HTTP to whoever is holding their session would create exactly the exposure the upload pipeline exists to prevent.
- **Only the sender's own messages.** The counterparty's half of a conversation is their data, not this user's.

The route is rate-limited (3/hour) — it is the most expensive read in the app and a stolen session should not be able to pull the same dossier repeatedly — and every export writes an audit row.

**Closure** (`POST /api/me/close`) anonymises in place rather than hard-deleting, because a hard delete is the wrong shape:

| Data | What happens | Why |
|---|---|---|
| Name, phone, email, bio, photo, coordinates, barangay | Destroyed; phone replaced with a `deleted:<id>` sentinel that no real number can collide with and `normalizePhPhone` can never produce | The identifiers are the point of erasure |
| Password hash | Replaced with 32 random bytes that are never given out | The account cannot be logged into again even by whoever knew the old password |
| Sessions | `tokenVersion` incremented; `status` set to `DELETED`, which both the session check and login reject | "No session, ever" is the one property closure promises |
| Trusted contacts | Deleted | These are *other people's* phone numbers, given to us for a purpose that has now ended |
| Notifications, KYC submissions, provider categories, availability | Deleted | Purely this person's, and useful to nobody once they are gone |
| Ledger entries, payout requests | Kept | Financial records. Deleting them would corrupt the platform's own books and break the audit trail behind every payout — the schema already refuses (`onDelete: Restrict`) |
| Reviews they wrote | Kept, unnamed | They are part of *another* person's reputation; wiping them silently re-rates providers who did nothing wrong |
| Jobs and messages | Kept, unnamed | The counterparty has a legitimate interest in the record of a job they were part of |

Closure is blocked — with every reason reported at once, not one at a time — while an unfinished job, a positive wallet balance, or a pending cash-out exists, and each blocker names something the person can go and resolve. The password is required even though the caller already holds a session: this is irreversible, and a borrowed unlocked phone should not be enough to erase somebody's work history. The eligibility check runs **inside the anonymising transaction**, not merely before it: between an outside check and the write, an offer could be accepted or a cash-out filed, and closing over a live booking would strand a counterparty with an anonymous no-show. On Postgres the transaction runs at Serializable isolation like every other money path, which closes the window entirely.

Verified end to end: anonymous callers got 401 on both routes; the export carried no `docRef`, `passwordHash` or `tokenVersion`; an account with an unfinished job and a balance was refused with both reasons; a wrong password was refused before anything else; and closing a settled account left the user row anonymised with `status=DELETED`, both ledger rows and the review they wrote intact, their trusted contact, notification and KYC rows gone, the old session 401, login refused, their provider page 404, and an `account.close` audit row written.

### Job evidence photos

A dispute over a cleaning job is otherwise one person's word against another's, and support has to guess. A photo of the room before and after settles most of them in seconds — which is worth building even though a photo of somebody's home is personal data and has to be handled as such. So evidence photos get the identity-document treatment, not the social-media treatment.

| Risk | Control |
|---|---|
| Disguised upload | Type is decided by **magic bytes**. Unlike identity documents, PDFs are refused too — a PDF makes no sense as job evidence and can carry script, so only JPEG, PNG and WEBP pass |
| Public exposure | No public bucket and no public URL. Every read goes through `/api/jobs/:id/photos/:photoId`, which resolves the job and checks the caller against it |
| Anyone but the two parties | Reads and the metadata list are restricted to the client, the booked provider, and support. A non-party gets **404, not 403** — whether a job exists is itself information |
| Evidence nobody can rebut | Both sides can upload and **both sides see all of it**. A record only one party can produce is not evidence, it is an accusation |
| Photos with no audience | Uploads are refused on an `OPEN` job (no counterparty yet) and once the job is `COMPLETED` or `CANCELLED` (nothing left to change). `DISPUTED` is explicitly allowed — that is when evidence matters most |
| Photo dump | 8 per person per job, 6 MB each, rate-limited to 30 uploads an hour |
| Active content reaching a browser | Served under `default-src 'none'; sandbox` with `nosniff` and `no-store`, via the same middleware that protects identity documents |
| Silent viewing by staff | A support read writes an audit row. The parties reading their own booking do not — logging every thumbnail would drown the log that matters |
| Indefinite retention | The bytes are deleted 90 days after the job settles, on the same cron tick as the escrow sweep. The row survives, so the record that evidence existed does; `available: false` and a null URL are what the UI sees |

Verified end to end: anonymous list 401 and anonymous read 401; an uninvolved provider got 404 on both; an SVG and a PDF each renamed `.png` were refused; uploads to an `OPEN` job and by a non-party were refused with a reason; client, booked provider and admin all read the image at 200 while the outsider got 404; the response carried `default-src 'none'; sandbox` while `/jobs` kept the ordinary app CSP; the ninth photo from one uploader returned 409 while the counterparty still had their own quota; a non-owner delete returned 403 and the owner's succeeded; and after back-dating the settled job past the retention window the sweep purged all nine files, leaving the rows with no URL and nothing on disk.

**One defect this work surfaced.** Account closure deleted `KycSubmission` rows but not their stored images. A decided submission has its image purged already, but a **pending** one was still on disk — so closing an account could orphan a scan of somebody's licence in the store forever, which is the exact opposite of what closing an account means. Closure now removes those bytes first, deliberately before the transaction: file deletes cannot be rolled back, so the ordering that fails safe is bytes-then-row (a crash between them leaves a row pointing at a missing file, which reads as already-purged; the reverse leaves a file nothing points at). Verified: uploading an ID to a pending submission and then closing the account left zero files in the store.
