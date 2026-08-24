# Business Model & Unit Economics — HanapGawa

## 1. How the platform earns (the revenue ladder)

Phased so revenue never arrives before liquidity (the mistake that killed Gawin/Kaodim and Gojek's GoLife):

| Phase | Revenue stream | Mechanics | Status in code |
|---|---|---|---|
| **0. Liquidity** (months 0–6) | Nothing / near-zero | Free posting & matching; escrow live from day 1 so the habit forms | ✅ Escrow + ledger shipped |
| **1. Commission on completed jobs** | **12% default take rate**, configurable per category, hard-capped 30% | Deducted at escrow release; provider sees the exact split | ✅ `splitCommission()`, per-category `defaultTakeRateBps`, frozen at booking |
| **2. Booking fee on thin tickets** | Flat ₱10–25 client-side fee for jobs under ~₱300 (padala class) where a % is meaningless | Client-side so provider payout stays whole | Planned (config exists) |
| **3. Trust products** | Paid "Fully Vetted+" enhanced checks; per-booking micro-insurance (₱5–15, partner-underwritten, e.g. Malayan/GInsure rails) | Attach rate revenue with real value | Planned |
| **4. Provider boosts** | ₱10–50 sachet-priced visibility boosts, priority placement | Matches load-buying culture; never pay-to-play for basic listing | Planned |
| **5. B2B/OFW** | OFW-abroad billing (card, higher ticket); SME accounts (offices booking cleaners/messengers) | Higher willingness-to-pay segments | Planned |

**Loyalty pricing (anti-leakage economics):** take rate on a repeat client↔provider pair steps down (12% → 8% → 5%) the more jobs they complete together on-platform — the Upwork 2025 insight. Staying is cheaper than leaving; the platform keeps the long tail instead of losing the relationship at job #3.

## 2. Why people will pay the commission (the value received)

The 12% buys things Facebook can never give and agencies overcharge for:
- **Escrow**: client's money is held before work starts; provider is guaranteed payment on confirmed completion. Kills both "nauna akong nagbayad, hindi sumipot" and "tapos na ako, ayaw magbayad."
- **Verified counterparties**: phone (L1) → government ID (L2) → NBI/police clearance (L3) badges, both sides.
- **Recourse**: dispute mediation with a frozen escrow, chat records as evidence, human resolution.
- **Reputation**: reviews only from real completed paid jobs — portable earning power for providers.

## 3. Unit economics (illustrative, per completed ₱500 job)

| Line | Amount |
|---|---|
| Gross booking value | ₱500.00 |
| Platform commission (12%) | **+₱60.00** |
| Payment-in cost (~2.5% e-wallet MDR on ₱500) | −₱12.50 |
| Payout cost (Xendit-style flat disbursement) | −₱10.00 |
| SMS/OTP amortized (~2 messages @ ₱0.56) | −₱1.12 |
| Infra amortized (at 50k jobs/mo scale) | −₱1–2 |
| **Contribution per job** | **≈ ₱34–35 (~7% of GMV)** |

Break-even against a lean fixed base (₱600k–1M/month: 4–6 staff + infra + support) ≈ **18,000–29,000 completed jobs/month ≈ ₱9–15M GMV/month** — one dense city at 2% household penetration. Thin-ticket padala jobs need the flat booking fee to be contribution-positive; that is why phase 2 exists.

## 4. Will it be expensive to build and run? (the honest answer)

**No — the build is the cheap part; supply-side operations and trust are where the money goes.**

| Cost bucket | Bootstrap (this repo's path) | Funded |
|---|---|---|
| MVP build | Already built (this codebase); founder time | Agency quotes for marketplace MVPs run ₱1.5–4M — avoided |
| Hosting (to ~50k MAU) | ₱3k–15k/month (Vercel/Railway/Fly + managed Postgres) | ₱30k–80k/month with Redis, object storage, observability |
| SMS OTP | ₱0.56/SMS (Semaphore); ~₱5–10k/month at 10k signups | scale linearly |
| eVerify (PSA) | **FREE currently** | fallback eKYC vendor ₱15–50/check for the ~20% without National IDs |
| KYC review staff | Founders at first | 2–4 support/trust staff (₱25–45k/month each) |
| Provider onboarding events | Near-zero (PESO/barangay partnerships; RA 11261 free clearances) | field team + clearance subsidies (₱350–600/provider, recoverable from first earnings) |
| Marketing | FB groups + TikTok organic (₱0 media) | CAC budget; referral commissions |
| Legal (one-time) | ₱150–400k: entity, ToS/privacy, payments opinion, NPC registration | + retained counsel |
| Insurance partner | Revenue-share, no capital | program fees |

**Realistic bootstrap runway**: ₱2.5–5M gets a one-city pilot to the 6-month liquidity checkpoint. **Seed-funded**: ₱15–30M does 2–3 cities properly with a trust & safety team. (MyKuya raised only ~$1.18M total and could never leave Metro Manila — undercapitalization, not demand, was its ceiling. Plan the raise around city-level contribution-margin proof.)

## 5. KPIs that decide life or death

1. **Liquidity**: % of jobs receiving ≥1 offer within 24h (target >70%); time-to-first-offer.
2. **Completion rate**: booked → completed (target >85%).
3. **Leakage proxy**: flagged-contact-share rate in chat; repeat-pair jobs that stop transacting on-platform after meeting once (cancel-then-silent pattern). Instrumented via `rawFlagged` + audit log.
4. **Provider utilization & earnings**: jobs/provider/week; ₱ earned — supply retention follows earnings, full stop.
5. **Two-sided NPS + dispute rate** (<2% of completions) and time-to-resolution.
6. **Take-rate realization**: platform revenue / GMV (watch it against the 12% nominal — refunds, splits, and cash mode all erode it).

## 6. Competitive moats being built

1. **Verification depth × both sides** (PhilSys eVerify + NBI ladder + household verification) — expensive to copy operationally, not technically.
2. **Review graph density per city** — the classic marketplace moat; city-by-city focus concentrates it.
3. **Rate-card data** — published tara per city per category becomes the market's reference price.
4. **Regulator-friendliness as strategy** — fair take rate, e-contracts, tax withholding rails, benefits remittance: when the gig-worker law passes (likely in the 20th Congress; ILO C193 was adopted June 2026), compliant platforms inherit the market from non-compliant ones overnight.
