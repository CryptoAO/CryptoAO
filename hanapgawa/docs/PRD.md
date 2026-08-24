# Product Requirements — HanapGawa

## 0. Your prompt, fine-tuned

The original brief was strong. Here it is restated as the sharpened one-page PRD prompt, with the gaps it missed filled in (marked ➕):

> **Build a two-sided services marketplace for the Philippines** where ordinary people (high-school/college graduates, low-end Android phones, prepaid data) can offer services *and* hire others for tasks — from menial (labada, plantsa, linis-bahay, dog walk, padala, pabili) to skilled (aircon cleaning, tubero, elektrisyan, fitness trainer, tutor) — for a few hours, half a day, or scheduled recurring work.
>
> **Trust is the product**: tiered verification (phone OTP → government ID → NBI/police clearance) for BOTH providers and clients, with honest badges that state exactly what was checked. Payment is held in escrow-style protection before work starts and released with a platform commission (12% default, capped, transparent) when the client confirms completion. All discussion happens in-app with automatic contact-info masking; off-platform payment voids all protection. Disputes freeze funds for human resolution.
>
> **Geo-native**: every job and provider is indexed by PSGC region/city (all 17 regions); feeds filter by city/region and sort by distance; exact addresses are private until booking.
>
> **Ease of use beats features**: web-first PWA shareable as a link in Facebook groups (no install), big touch targets, Taglish copy, icons over sentences, first session under 5MB of data, works on a ₱4,000 Tecno.
>
> ➕ *What the original prompt missed:*
> - **Regulatory boundaries**: no passenger transport at launch (LTFRB TNVS wall) — goods/services only; never call it "escrow" in marketing (BSP trust rules) — funds held via licensed aggregator; DPA/NPC, DTI E-Commerce Bureau, and BIR withholding obligations from day one.
> - **Worker classification firewall**: clients choose providers, providers set prices and schedules, platform never disciplines beyond fraud/safety — the Lazada-ruling defense.
> - **Cold-start plan**: one city, 3–4 wedge categories, supply seeded before demand via FB groups and barangay/PESO events with free-clearance onboarding.
> - **Cash reality**: wallet-escrow first, but a cash-on-completion mode (commission as provider ledger debt, capped) is required to win outside NCR — phase 2.
> - **Two-sided safety**: households get vetted too; workers get insurance, SOS, and a report channel — supply retention is the harder side.
> - **The OFW wedge**: let an OFW abroad book & pay for services for family back home.
> - **Demand validation before scale spend**: a 2–4 week concierge MVP (manual matching via a Facebook page, real ₱20–50 booking fee) measuring paid conversion and 30-day repeat — the cheapest test that could invalidate the whole plan.
> - **The VAT line**: RA 12023 puts 12% VAT on the platform's own commission above ₱3M/yr gross receipts — price it in from day one.
> - **Household protection**: a capped self-funded "Protection Pledge" (never marketed as insurance) valid only for on-platform-paid jobs — the trust product and the anti-leakage hook are the same feature.

## 1. Personas

1. **Aling Nena, 48, labandera (provider)** — 15 years' experience, finds clients by word of mouth and a Facebook group. Tecno phone, GCash user, prepaid load. Wants: steady bookings, not getting scammed, fair pay, proof she's trustworthy.
2. **Carlo, 32, call-center team lead (client)** — QC condo, no time for laundry/cleaning. Wants: someone vetted, fair price, no awkward haggling, recourse if something goes wrong.
3. **Mia, 27, OFW in Dubai (remote client)** — books cleaning and aircon service for her parents in Batangas, pays by card. Wants: to see it was done, reviews she can trust.
4. **Coach Migs, 30, freelance trainer (both roles)** — sells sessions and also hires a padala rider weekly. Marks his available hours.

## 2. Feature inventory (MVP = shipped in this repo)

| Area | MVP (✅ shipped) | Phase 2 | Phase 3 |
|---|---|---|---|
| Accounts | Phone+OTP registration, login, roles (client/provider/both), PSGC location | Password reset, Cebuano locale | GCash mini-program |
| KYC | 3-level ladder, last-4-only capture, admin review queue | Doc upload + PSA eVerify face match | Continuous re-verification, selfie-at-job-start |
| Jobs | Post (category, budget, schedule, private address), geo feed (region/city/category/search/distance), lifecycle state machine | Recurring jobs, multi-day | Instant-book from provider rate cards |
| Offers | Provider offers with price+message; accept/decline/withdraw; ₱2,000+ jobs require L2 provider | Counter-offers | Auto-match suggestions |
| Chat | Per-job masked chat, strikes, Taglish warnings | Voice notes, photos (moderated) | — |
| Payments | Wallet ledger, dev top-up, escrow hold/release/refund, 12% commission engine, payout requests, admin payout ops | PayMongo/Xendit live rails, webhooks, cash-mode with debt cap, booking fees | Loyalty (declining repeat-pair take rate), insurance attach, BIR withholding + 2307 generation |
| Reviews | Two-way, completed-jobs-only, rating aggregates | Photo reviews | Badges from streaks |
| Trust ops | Reports, disputes (freeze/resolve refund-pay-split), strikes → flag → suspend, audit log | SOS button, check-in/out with trusted contact | ML risk scoring |
| Provider tools | Profile, categories with rates/units, weekly availability grid | Calendar sync, portfolio photos | Earnings analytics, SSS/Pag-IBIG remittance rail |
| Admin | Overview KPIs (GMV, earnings), KYC/dispute/payout/report queues | Category & take-rate console, city dashboards | Fraud graph tooling |
| Localization | Taglish UI throughout | Cebuano/Bisaya support scripts | Regional ad kits |

## 3. Critical flows (as built)

**Provider onboarding**: Register (phone, name, city) → OTP → toggle "Gusto kong kumita" → pick categories + rates + availability → visible in `/providers` → L2 ID verification unlocks ₱2,000+ jobs → L3 clearance earns "Fully Vetted" badge.

**Job flow**: Client posts (public details + private address) → providers offer → in-app chat (masked) → client accepts → **wallet balance held** (insufficient funds → cash-in prompt) → provider sees address, starts, marks done → client confirms → **split: 88% provider / 12% platform** → both review. Cancel refunds before completion; dispute freezes for admin.

**Money flow**: Cash-in (GCash/Maya via PayMongo in prod; instant in dev) → escrow holds per booking → payouts requested to GCash/Maya/bank → admin marks paid (API disbursement in prod).

## 4. Non-functional requirements

- **Performance budget**: usable on 3GB-RAM Android on 3G; server-rendered pages; <5MB first session; API p95 < 300ms at city scale.
- **Availability**: 99.5% MVP → 99.9% at scale (SCALING.md).
- **Accessibility**: 16px+ base font, 44px+ touch targets, high-contrast palette, one-hand reach.
- **Language**: English chrome + Taglish copy (GCash pattern); English for amounts/legal.

## 5. Success criteria for the pilot (6 months, one city)

- 500+ verified providers, 2,000+ registered clients
- >70% of jobs get an offer within 24h; >85% booked→completed
- <2% dispute rate; leakage-flag rate trending down after month 2
- ₱1M+ monthly GMV by month 6, with measured repeat rate >30%
- Zero uncontained safety incidents; NPS > 40 both sides
