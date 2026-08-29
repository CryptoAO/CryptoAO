# Legal & Regulatory Checklist — HanapGawa (Philippines)

*Research summary, not legal advice. Engage PH counsel before launch. Status as of August 2026.*

## 1. Entity & basic registrations
- [ ] SEC incorporation via eSPARC/Philippine Business Hub (₱2,000 filing + 1/5 of 1% of authorized capital; ~3–5 working days)
- [ ] Barangay clearance + Mayor's/business permit (LGU BPLO)
- [ ] BIR Form 2303, books, invoices (the ₱500 annual registration fee is abolished — RA 11976)
- [ ] **DTI E-Commerce Bureau / Online Business Database** registration (RA 11967 Internet Transactions Act — obligations live since late 2025): publish prices & refund policy, verify merchants, keep records 2 years, answer complaints within 5 business days, OCAD-compatible dispute pipeline

## 2. Money (the big one)
- **Never** hold user funds in the company bank account or market "escrow" — true escrow requires BSP trust authority (₱300M-class); stored balances require an EMI license (₱200M+ capital). 
- Structure: **collecting-agent clause in ToS** + funds held by a **licensed aggregator** (Xendit xenPlatform / PayMongo) released on completion. The in-app "wallet" is a ledger view over aggregator-held funds.
- [ ] Legal opinion on **BSP OPS registration** (RA 11127 / Circular 1049); register (₱20,000) if in doubt
- [ ] Aggregator contract with split-payment/sub-account support

## 3. Data privacy (RA 10173)
- [ ] Designate a **DPO at launch**; privacy notice in plain Taglish
- [ ] **NPC registration** (Circular 2022-04) once sensitive personal info of 1,000+ individuals is processed — a KYC-collecting marketplace crosses this fast; new systems register within 20 days of go-live; renew annually
- [ ] **72-hour breach notification** runbook (NPC Circular 16-03; full report in 5 days)
- Exposure: administrative fines 0.25–3% of annual gross income capped ₱5M/infraction + criminal penalties. Budget compliance before scale.

## 4. Worker classification (existential risk management)
- Doctrine: **Ditiangkin v. Lazada** (G.R. 246892, 2022) — riders under "independent contractor" agreements held to be **regular employees** (four-fold + economic-dependence tests). Foodpanda NLRC rulings similar (₱2.24M, ₱7.4M — on appeal). Labels don't control; **platform control does**.
- Design firewall (already reflected in product): clients choose providers; providers set/negotiate prices, schedules, tools; multi-homing free; no exclusivity; no platform discipline beyond fraud/safety delisting with an appeal path; platform charges a commission as a **venue**, the client is the hiring party in the per-job e-contract.
- [ ] Do **NOT** operate as a manpower supplier (DO 174-17: ₱100k registration, substantial capital, solidary liability) unless deliberately chosen later (MyKuya's agency-partnership model is a valid compliance hedge worth evaluating if the law shifts).
- Watch: gig-worker bills in the 20th Congress (HB 1988 House-approved, POWERR HB 6572 filed Dec 2025); **ILO Convention 193** (adopted June 2026) makes PH legislation likely by 2027–28. Pre-build: written e-contracts per job, transparent pay breakdowns, deactivation appeals, optional SSS/PhilHealth/Pag-IBIG remittance rails — so the law is a feature launch, not a rebuild.

## 5. Transport boundaries
- **Goods/padala: light-touch** — LTFRB treats motorcycle goods delivery as outside passenger franchising (Lalamove/Angkas Padala precedent). Ordinary registrations suffice. ✅ In scope at launch.
- **People: heavily regulated** — TNC accreditation + per-driver TNVS CPCs + regulated fares + mandatory passenger insurance; **motorcycle taxis are closed to new entrants** (pilot-only: Angkas/JoyRide/Move It; no law as of 2026). ❌ Out of scope until properly licensed. The "driver" category in-app is household/family-driver *labor*, not ride-hailing — keep it that way and say so in ToS.

## 6. Tax
- [ ] **RA 12023 (VAT on digital services, enforced mid-2025)**: the platform's own commission/booking-fee revenue is VATable at **12%** once annual gross receipts exceed ₱3M (below: 3% percentage tax or the 8% flat option). Decide pricing display ("12% + VAT" vs absorbing ~1.4pp of GMV) before launch; structure year 1 around the sub-₱3M window
- [ ] Counsel decision: **RR 16-2023** e-marketplace withholding (1% on half of gross remittances, ₱500k/yr de-minimis per seller) vs **RR 11-2018** professional-fee EWT (5%/10%) — definition covers services platforms; don't double-withhold
- [ ] Collect BIR registration/sworn declarations at provider onboarding; auto-generate **Form 2307** quarterly; file 0619-E/1601-EQ
- [ ] Educate providers on the **8% flat tax option** (≤₱3M gross) — onboarding feature that lowers their effective tax and our withholding rate

## 7. Kasambahay adjacency
- Recurring domestic placements drift toward **RA 10361 (Batas Kasambahay)**: regional minimum wages (₱5,500–7,800/month, NCR ₱7,800 from Feb 2026), barangay registration, SSS/PhilHealth/Pag-IBIG for 6+ month engagements. Product: prompt compliance for recurring engagements; convert compliance into a **"Verified Employer" badge** — trust and legality in one feature.

## 8. Insurance & guarantees
- No statutory mandate for independent gig workers today, but cheap rails exist: Cebuana Lhuillier DriverCARE-class personal accident cover ≈ **₱260/year** (Malayan-underwritten, GInsure-distributed). Embed as default/opt-out benefit; pre-positions for pending mandates.
- **Household-side theft/damage cover does not exist as a per-booking product in PH.** A TaskRabbit-style "Protection Pledge" is the answer — a **self-funded discretionary reimbursement program, capped (e.g., ₱25–50k damage / ₱10k theft), valid only for on-platform-paid jobs**. Never market it as "insurance" (unlicensed-insurer risk under the Insurance Code); negotiate a bespoke group policy with Pioneer/Malayan/Cebuana once volume justifies.
