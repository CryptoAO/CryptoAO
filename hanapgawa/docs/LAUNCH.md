# Launch Gate — HanapGawa

The answer to two questions: *what must change, seen from every seat at the table*, and *what must an app launching in the Philippines have checked, and keep having, at all times*. Status marks are honest: ✅ built and verified, 🔶 built but needs a founder action to go live, ❌ not done.

---

## 1. The perspective sweep

### Regulatory (Philippines)

The items below are ordered by how badly they bite. **This is preparation for counsel, not a substitute for counsel** — confirm each with a Philippine lawyer and accountant before the first real peso moves.

| # | Item | Why it bites | Status |
|---|---|---|---|
| R1 | **Business registration** — DTI/SEC, Mayor's permit, BIR Form 2303 | Cannot lawfully operate or issue receipts without it | ❌ founder |
| R2 | **The "wallet" vs e-money question** | Stored value that users top up and hold **is e-money under BSP rules** unless the funds sit with a licensed EMI. Our design docs already say funds stay with the aggregator (PayMongo) under a collecting-agent arrangement — but the *product* shows a wallet balance, and the framing must match the legal structure. Two clean paths: (a) contract so the aggregator legally holds the stored value, with the app showing a view of it; or (b) drop stored value for **authorize-and-capture per booking**. Decide with counsel before launch; this is the single most dangerous regulatory item on the page | ❌ counsel |
| R3 | **NPC registration** — appoint the DPO and register data processing systems with the National Privacy Commission (NPC Circular 2022-04) | We process government IDs and precise locations at scale; registration is not optional at that point. The DPO's name also fills the placeholder in `/privacy` | ❌ founder |
| R4 | **Internet Transactions Act (RA 11967)** — e-marketplace obligations, DTI E-Commerce Bureau registration | The law covers online platforms facilitating consumer transactions; a services marketplace should assume it is in scope until counsel says otherwise | ❌ counsel |
| R5 | **BIR withholding on marketplace payouts (RR 16-2023)** — platforms withhold 1% on one-half of gross remittances to sellers, above de-minimis thresholds | This is the rule that made Shopee/Lazada sellers submit BIR registration. It applies to e-marketplaces for goods **and services**; build the withholding + Form 2307 pipeline before payout volume is real. Already listed as Phase 3 in the PRD — pull it forward before scale | ❌ build+accountant |
| R6 | **SMS sender-ID registration** — telcos require registered A2P sender IDs (post-SIM Registration Act) | Unregistered bulk SMS gets silently dropped; OTPs that do not arrive are a dead app. Aggregators (Semaphore etc.) handle registration but with lead time — start it when the SMS account is opened | 🔶 with SMS setup |
| R7 | **Worker classification** — providers are independent contractors; pending platform-worker bills may change obligations | The docs already keep the employer-firewall (no schedules imposed, no exclusivity, providers set rates). Watch the pending bills; a misclassification finding converts every provider into an employee retroactively | ✅ designed, watch |
| R8 | **RA 10173 operations** — consent evidence, breach clock, data rights | Consent now recorded with version; export/closure self-service; 72-hour breach runbook written | ✅ |

### Provider (the supply side)

- ✅ **Guaranteed payment** (escrow + auto-release), **safety** (SOS, check-ins), **proof of income** (Patunay ng Kita), **suki fee cuts**, **activation checklist**, availability that is enforced.
- 🔶 **Same-day cash-out** is a promise the runbook makes; it becomes real only with live payout rails. This is the number providers talk to each other about.
- ❌ **SMS fallback for critical events.** A provider off data for a day must still learn they won a booking. Needs the live SMS account; wire booking-won, direct-request and SOS events to SMS, not just the in-app bell.
- ❌ **Appeal path for strikes/suspension.** The runbook tells the operator to be proportionate; the product should let a flagged provider tell their side without finding a support email.

### Client (the demand side)

- ✅ Price guidance, direct booking, availability browsing, evidence photos, empty-feed fallbacks.
- ❌ **Cash-in friction is the #1 conversion killer.** Requiring a funded wallet before booking loses the client who has ₱500 in GCash but zero in the app. Per-booking GCash payment (authorize-capture) or top-up-at-booking must be the first live-rails milestone — this also softens R2.
- ❌ **Cebuano/Bisaya** before expanding beyond Tagalog-region cities.

### Security

- ✅ Everything in `SECURITY.md`, now including admin 2FA; two adversarial review rounds, findings fixed.
- ❌ **Independent penetration test** — the one item worth paying for before real money. Budget ₱150–400k or a vetted freelancer for less.
- ❌ **Backups with a restore drill** — see below; the single highest-risk open item.

### Ease of use

- ✅ Taglish, thumb targets, 360px verified, installable PWA, offline card.
- ❌ **Twenty real people in one city, on their own phones.** Still the most important unbuilt thing. Every assumption — escrow tolerance, masked chat, badge trust — is untested against a real labandera.
- ❌ **Assisted onboarding** — expect a share of supply to sign up with a helper (kapatid model). Watch for it in testing; may need a "tulungan mo akong mag-sign up" flow.

---

## 2. Must-have at all times (the always-on invariants)

The launch checklist most apps use, adapted to one founder and this stack. **"At all times" means these are never allowed to silently stop being true.**

| # | Invariant | State |
|---|---|---|
| A1 | **Backups that restore.** Automated DB backups + a *practiced* restore. A backup you have never restored is a hope, not a backup. Losing the ledger loses the business | ❌ — highest risk, cheapest fix |
| A2 | **Monitoring that pages a human.** External uptime check on `/api/health` + error reports to a live DSN. The app emits both; nothing receives them yet | 🔶 |
| A3 | **A working support channel** users can find — even just a monitored inbox linked from /safety | ❌ small |
| A4 | **Money reconciliation.** Daily: ledger totals vs aggregator statement. The append-only ledger makes this a query; the habit has to exist from day one | 🔶 runbook |
| A5 | **Accurate legal pages.** `/terms` `/privacy` live ✅ — but placeholders (company, DPO) must be filled before a single real user | 🔶 |
| A6 | **Incident + breach plan** — written, with the 72-hour clock | ✅ runbook |
| A7 | **Kill switches.** The ability to pause sign-ups or bookings without a deploy when something is wrong. Not built; acceptable at pilot scale where a deploy takes minutes, needed before marketing spend | ❌ later |
| A8 | **Rollback path.** Postgres + platform deploys give this; practice it once | 🔶 |
| A9 | **CI green + weekly dependency audit** | ✅ |
| A10 | **Staging environment** before the user count makes "deploy straight to prod" reckless | ❌ |

---

## 3. Sequence

1. **Founder, this week:** backups (A1), support inbox (A3), fill legal placeholders (A5), start business registration (R1) and NPC registration (R3).
2. **Founder + counsel:** the wallet/e-money decision (R2) — it shapes the payment integration.
3. **Wire live rails:** SMS (with sender-ID registration, R6) and PayMongo — then cash-in friction and same-day payouts become solvable.
4. **Twenty real users in one city.** Before more code.
5. **Pentest** once rails are live and before marketing.
6. RR 16-2023 withholding pipeline before payout volume is real.
