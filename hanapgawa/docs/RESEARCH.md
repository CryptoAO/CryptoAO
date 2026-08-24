# Market Research: A Gig-Services Marketplace for the Philippines

*Deep-dive research synthesized from ~290 sources (2024–2026): PH tech/business press, regulator publications (BSP, NPC, DOLE, LTFRB, PSA, BIR), platform pricing pages, academic work on marketplace disintermediation, and labor studies. Compiled August 2026.*

---

## 1. The verdict up front

**There is a real, large, unserved gap** — and it is not "no one has tried," it is "no one has survived with the right model yet":

- **~9.9 million Filipino gig workers** exist (Ipsos "Gig Life PH", Sept 2025). **83% of them (8.2M) are on NO online platform.**
- **~6M underemployed** Filipinos actively want more paid hours (PSA 2026: underemployment 12.1–12.3%).
- The actual "marketplace" they use today is **Facebook** — free, huge (95.8M PH users), and completely unsafe: no vetting, no escrow, no reviews, no recourse. DMW has taken down **70,000+ fake job posts** (50,220 on Facebook alone). Scam modus: cloned agency pages + illegal upfront "processing fees."
- The organized alternatives are dead or tiny: **Gawin.ph is dead** (Kaodim group shut down July 2022), **GoodWork.ph appears dormant**, **ServeHappy pivoted away**, **MyKuya is alive but subscale** (~US$1.18M raised total, Metro Manila + nearby only). Managed agencies (Happy Helpers, MaidProvider) charge **₱2,500+/session or ₱20,000 placement fees** — priced for the upper-middle class, Metro Manila only.
- Meanwhile the payment rails are ready: **GCash ~100M registered / ~40M monthly active**, Maya 50M+, digital payments now **64.7% of PH retail transaction volume** (BSP, 2025).

**The wedge**: sit between free-but-dangerous Facebook and expensive agencies, with verified identities, escrow-protected payment, and city-level liquidity — priced for the masa, launched city-by-city.

---

## 2. Competitor landscape (2024–2026)

| Player | Status | Model | Coverage | Fees | Why it doesn't own the market |
|---|---|---|---|---|---|
| **Facebook groups / Marketplace** | Dominant | Free posts, PM-based matching | Nationwide | Free | No vetting, no escrow, scam-ridden; 7,081 online-scam cases at PNP-ACG in 2024 |
| **MyKuya** | Alive, subscale | Time-based booking (from ₱49/30min), agency-supplied workers, ~80% to worker | Metro Manila + Cavite/Laguna/Rizal | Bundled fee | Never raised growth capital; never left Greater Manila |
| **Gawin.ph** (Kaodim) | **Dead** (2022) | Quote-comparison lead-gen | — | — | Weak retention, thin per-transaction economics |
| **GoodWork.ph** | Dormant-looking | Managed home services, cash-friendly | Metro Manila | from ₱224/session | Last raise $1.6M (2020); Play Store reviews suggest closure |
| **Happy Helpers** | Alive | Professionalized cleaning teams | Makati/BGC/QC/Muntinlupa | from ₱2,500/session | Premium price, 4 cities |
| **MaidProvider.ph** | Alive | Kasambahay placement agency | Metro Manila | ₱20k placement + ₱12k+/mo salary | Placement, not gigs |
| **Grab / Lalamove / Angkas / JoyRide / Maxim / Toktok** | Alive | Delivery, rides, pabili | Major cities | ~16–20% commission | Category-locked to transport/delivery; not a general task board |
| **OnlineJobs.ph / Raket.ph / PasaJob** | Alive | Remote/VA work, referral hiring | Online | Subscription / 10–30% | Digital work for foreign employers, not physical local tasks (Raket: only ~₱13/user/year earned — thin liquidity) |
| **Suki Neighbors** (2024+) | New | Hyperlocal community boards, 0% commission | Per-barangay | Free | Template for community launch; no trust/escrow layer |

**Key structural insights:**

1. **Errands were absorbed by delivery superapps; tasks were not.** No player owns "ironing, laundry pickup, dog walk, tutoring, aircon cleaning, queueing at SSS" as one marketplace.
2. **The GCash mini-program lesson**: Raket's "Gigs" and PasaJob's "GJobs" both launched *inside GCash* rather than as standalone apps — GJobs got 2.4M registered users in 17 months. Masa users resist downloading new apps but will use a gig feature inside a wallet they already trust. → Our web-first PWA (shareable as a link in FB groups, no install) matches this reality; a GCash mini-program partnership is a serious growth lever later.
3. **Worker conditions are an open wound and a differentiator**: Fairwork Philippines 2025 scored every rated platform ≤3/10 (Foodpanda/JoyRide/Maxim: 0/10). A platform that ships fair take rates, transparent pay, insurance, and SSS/Pag-IBIG remittance options can win supply loyalty and regulator goodwill simultaneously.

## 3. What people pay today (price anchors, 2024–2026)

| Service | Informal rate | Branded rate |
|---|---|---|
| Labada (laundry), shops | ₱39–80/kilo | — |
| Labandera home service | ₱350–500/day (NCR trending ₱500–700) | — |
| Ironing (plantsa) | ~₱350/day add-on | — |
| House cleaning | ₱300–500/hour informal; ₱800–2,000/day | Happy Helpers from ₱2,500/session |
| Aircon cleaning | — | from ₱799/unit |
| Electrician/plumber service call | ₱300–800 small jobs (province) | ₱1,000–1,500/job (CALABARZON) |
| Family driver | ~₱645+/day (tracks NCR min wage) | ₱17,000–21,000/month |
| Fitness trainer | ~₱500/hour (Superprof) | ₱1,000–2,500/session (gyms) |
| Padala (motorcycle) | Lalamove ₱49 base + ₱6/km; Angkas ₱55–65 + ₱8/km; GrabExpress Lite from ₱29 | — |
| Pet boarding / dog walk | from ₱150/night; ~₱200–500/walk | — |
| Kasambahay legal minimum | ₱5,500–7,800/month by region (NCR ₱7,800 from Feb 2026) | Agency-hired ₱9,000–15,000/month |

**Product consequence — the 3–5× spread**: informal rates sit 3–5× below branded services. **Published, transparent per-city rate cards ("tara") are themselves a killer feature** — clients stop overpaying, providers stop being lowballed, and the platform needs no subsidies to be the best deal in town.

## 4. Demand-side macro

- 98.0M internet users (83.8% penetration), ~98.6% smartphone ownership among internet users, 137M mobile connections (DataReportal 2026).
- Record OFW remittances: **$35.63B cash in 2025** (7.3% of GDP). Remittance households are classic buyers of outsourced household services — and the **"OFW abroad books & pays for family back home"** flow is a high-willingness-to-pay wedge nobody owns.
- Facebook demand evidence: Housemaids.ph page ~369k likes; Raket.ph ~207k; multiple labandera/kasambahay hiring groups with thousands of members transacting via comments and PMs.

## 5. The masa device & data reality (design constraints)

- Reference device: **Tecno Spark Go 2024** — ₱3,799, 3–4GB RAM, 64GB storage, 720p screen, Android 13 Go. Transsion (Tecno/Infinix/itel) = 37.3% of 2024 shipments; >50% of all units sold are sub-$100.
- ~92% of SIMs are **prepaid**; data is bought in sachets (₱75/3 days = 8GB style promos) at sari-sari stores. Users regularly go "walang load" for days.
- Only ~40% of Filipinos have even one basic ICT skill despite 93% functional literacy → **icons + numbers + photos over sentences; confirmation screens; no free-text where a picker will do**.
- Language: successful masa apps ship **English UI chrome + Taglish conversational copy** (GCash pattern) — never formal pure Tagalog. Cebuano/Bisaya matters for Visayas-Mindanao marketing and support, rarely as an app locale.
- SMS: use a **local aggregator** (Semaphore ~₱0.56/SMS) not Twilio (~$0.20 ≈ 20× the cost). **OTP texts must contain no links** — Globe drops link-bearing SMS wholesale. SIM Registration Act means numbers are nominally KYC'd but users are scam-fatigued: branded sender IDs, everything in-app.
- **PWA-first is the right acquisition surface** (shareable link in FB groups, zero install, works on 64GB phones), with a small (<30MB) native Android app later for retention (push, OTP autofill, camera KYC). Skip iOS at v1: Android >90%.

## 6. Trust & safety infrastructure available to us (PH-specific)

- **PhilSys National ID: 90.3M PSNs issued (~80% of population)**. PSA's **eVerify** (selfie-to-registry face match) and **National ID Check** (QR validation) are live, onboardable by private companies **fully online, currently FREE**. Already powers ~56% of new GCash verifications; Maya gives instant KYC to PhilSys holders.
- **Worker clearance stack**: NBI clearance ₱155 (1-yr validity, same-day if no hit; 5–15 working days on a name "HIT"), National Police Clearance ~₱150–180 (6-month validity), barangay clearance ₱20–200. **Free for first-time jobseekers (RA 11261).** Total ≈ ₱350–600. No API exists — clearances are documents requiring an upload-and-review pipeline.
- **Benchmark (Grab PH)**: NBI + PNP clearance both issued within 6 months, random in-day selfie re-verification, SOS button, trip sharing, ₱1M free passenger accident insurance + opt-in ₱7/trip Ride Cover (Chubb).
- **Microinsurance rails exist**: Cebuana Lhuillier DriverCARE ≈ **₱260/year** personal accident cover (Malayan-underwritten, sold via GInsure). A ₱5–15/booking accident+damage cover is affordable and monetizable.
- **Two-sided vetting is the differentiator nobody ships**: verify the *household* too (eVerify the booking adult, payment-instrument KYC inheritance, worker-side reviews of clients). Worker-side risk is real (abuse cases drove a DOLE/DSWD/DILG/PNP/NBI joint rescue protocol) and worker-facing safety features earn supply loyalty.
- **The Care.com/FTC lesson**: say *exactly* what a badge certifies ("ID matched + NBI clearance dated X") — never imply continuous monitoring you don't do.

## 7. Payments & the "escrow" question (critical legal finding)

- **True escrow is a regulated trust business** (BSP trust authority, ₱300M minimum for trust corps). **Holding user balances = e-money issuance** (EMI license, ₱200M+ capital). A startup does neither.
- **The lawful structure used by marketplaces**: *collecting-agent model* — ToS appoint the platform/aggregator as the provider's limited payment-collection agent, with funds held by a **licensed aggregator** (Xendit xenPlatform sub-accounts/split payments, or PayMongo settlement + disbursement APIs) and released on job completion. Escrow-like protection, license burden on the aggregator. (This is why the code's `PaymentProvider` abstraction and ledger design matter — the "wallet" in production is a ledger view over aggregator-held funds, not our bank account.)
- Register as **BSP OPS** (₱20,000) if counsel advises the flow qualifies; register with the **DTI E-Commerce Bureau** (RA 11967 Internet Transactions Act — live obligations since late 2025).
- Aggregator fees: **~2.5% e-wallet MDR; Xendit disbursements flat ₱10/payout** (cheapest way to pay workers); Maya Business QR Ph as low as 1.25–1.6%.
- **Cash-on-completion is still table stakes** outside NCR (COD ≈ 15–23% of e-commerce value). Plan a cash mode where the commission becomes a receivable on the provider's ledger with a debt cap (Grab pattern) — *phase 2; the MVP ships wallet-escrow only.*

## 8. Anti-disintermediation (keeping deals in the app) — evidence

- The threat is existential: **~90% of matched transactions settled off-platform** in one large services marketplace study (ZBJ.com); Gu & Zhu (*Management Science* 2020) showed trust-building itself increases leakage.
- **What works** (all implemented or planned in this codebase):
  1. **Withhold contact info & exact address until booking** (Airbnb/Urban Company pattern) → contact masking in chat + address revealed only to the booked provider.
  2. **Tie protection to on-platform payment**: escrow, dispute mediation, reviews, insurance — all void if you pay outside (Urban Company voids warranty+insurance for off-app payment).
  3. **Price the relationship**: Upwork's 2025 model — fees decline toward 0% for repeat client-provider pairs → planned loyalty pricing: take rate drops for repeat pairs, making staying cheaper than leaving.
  4. **Graduated enforcement**: warning → strike → account review → suspension (never fines).
- **What fails**: high take rates + punitive-only enforcement (Urban Company's ~28% + penalties → strikes, forced rollback); ToS bans with no economic logic.
- **Take-rate guidance**: PH comparables say **10–15% total load max at launch** (we ship 12% default, configurable per category, hard-capped at 30% in code). Structure fees so the provider's posted rate stays whole where possible; thin-ticket categories (₱49–500) need flat booking fees, not percentages.

## 9. Sizing (bottom-up, honest)

No credible public GMV number exists for PH on-demand home services (Statista's ~$1.15B-by-2027 covers household-care *products*). Bottom-up:

- 1 pilot city (e.g., Quezon City: ~750k households). If 2% of households book 2×/month at ₱500 avg ticket → **₱15M GMV/month** in one city → ₱1.8M/month platform revenue at 12%.
- Nationwide ceiling: 8.2M unplatformed gig workers × even ₱4,000/month platform-mediated earnings = **~₱33B/month GMV** theoretical ceiling. Capturing 1% of that = ₱330M GMV/month ≈ ₱40M/month revenue at 12%.
- These are illustrations, not forecasts; the pilot exists to measure real frequency and ticket size.

## 10. Risks register (top 8)

| # | Risk | Severity | Mitigation |
|---|---|---|---|
| 1 | **Off-platform leakage** | Existential | §8 economics-first design; measure from day one |
| 2 | **Worker reclassification as employees** (Ditiangkin v. Lazada doctrine) | High | Marketplace-venue design: clients choose, providers set prices, no platform discipline beyond fraud/safety (see LEGAL.md) |
| 3 | **A safety incident early** (assault/theft on a booked job) | High | KYC ladder, two-sided vetting, SOS features, insurance, fast incident response SLA — and honest badges |
| 4 | **Cold-start liquidity failure** (the Gawin/GoLife death) | High | One city, 3–4 wedge categories, supply-first seeding via FB groups & barangay/PESO partnerships |
| 5 | Facebook zero-price gravity | Medium | Don't fight discovery — fight trust; FB-group funnels into the app |
| 6 | Gig-worker law passes (likely in 20th Congress; ILO C193 adopted June 2026) | Medium | Pre-build e-contracts, transparent pay, benefits rails so the law is a feature launch |
| 7 | Payment/regulatory misstep ("escrow" marketing, no OPS registration) | Medium | §7 structure; legal opinion before launch |
| 8 | Capital starvation (MyKuya's fate) | Medium | Lean web-first build (this repo), city-level profitability before expansion |

## 11. Recommended go-to-market (synthesis)

1. **City 1, categories 3–4**: launch ONE city (QC or a provincial city like Iloilo/CDO with zero organized competition) with laundry/labada, house cleaning, padala-errands, and aircon cleaning — high-frequency, standardizable, rate-card-able. Defer trust-heavy categories (yaya, elder care, family driver) until review density exists; defer passenger transport indefinitely (LTFRB licensing wall).
2. **Seed supply first**: 200–500 verified providers before marketing demand. Recruit from the exact FB groups that exist today; run assisted-onboarding days with barangay/PESO offices (clearances are FREE for first-time jobseekers — run "Libreng NBI day" onboarding events); subsidize the ₱350–600 clearance stack against first earnings.
3. **Sachet-economy pricing**: no subscriptions for workers; commission-on-completion + eventual ₱10–25 booking fees on thin tickets; GCash payouts.
4. **Distribution = Facebook + TikTok**, not app stores: shareable job links with rich previews, Taglish TikTok how-tos, FB community moderation, tindera/agent referral commissions (the GCash Pera Outlet human-mesh playbook).
5. **The OFW wedge**: market "book a labandera for Nanay in Batangas from Dubai, pay by card/GCash" — differentiated, high-margin, remittance-rail-adjacent.
