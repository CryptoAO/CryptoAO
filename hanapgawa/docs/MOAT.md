# The Moat — how a non-novel idea becomes a novel business

Honest premise: escrow, KYC ladders, masked chat and review systems are table stakes copied from every marketplace since TaskRabbit. Nobody wins in the Philippines by having them; they only lose by lacking them. The novelty has to come from what the incumbents — Facebook groups above all — structurally cannot do, rooted in how Filipinos actually transact. Four theses, ordered by conviction, plus the growth mechanics the owner asked for.

## Thesis 1 — Patunay ng Kita: the platform as a credit history *(shipped)*

The deepest unmet need of an informal worker is not finding work — Facebook finds work. It is that ten years of real income leaves **no record a bank will accept**: no loan, no lease, no visa. Every completed job here is an escrow ledger row, and the platform now turns that ledger into a verifiable earnings statement a loan officer can check in ten seconds.

This flips the recruiting pitch from *"maghanap ka ng trabaho dito"* (Facebook does that, free) to *"dito, bawat trabaho mo ay pumapasok sa record na tatanggapin ng bangko."* Facebook can never offer this — it has no money rails and no attestation. The long game: partner with microfinance/rural banks to accept the statement formally, then with lenders who underwrite against it. At that point leaving the platform costs a provider their credit history, which is a moat no fee discount can match.

## Thesis 2 — The OFW wedge: paying from abroad for care at home

The strongest novel *go-to-market*: an OFW in Dubai books and pays for aircon cleaning, a deep clean, or grocery padala at their parents' house in Iloilo. The payer has cards and digital money and cannot be scammed by a stranger at their mother's door — exactly what escrow, vetted IDs, evidence photos and check-ins were built for. ~2M deployed OFWs remit ~$37B/yr; they are digitally paying-capable, trust-motivated, and desperate for exactly this. *"Alaga mo sila, kahit malayo ka."*

What it needs beyond what exists: accepting international cards (PayMongo already does), a "book for someone else" recipient field, and marketing in OFW communities. No PH incumbent owns this wedge.

## Thesis 3 — Suki economics *(shipped)*

Western marketplaces treat the repeat relationship as a leakage threat and fight it. Here the repeat relationship — the suki — is the culturally strongest force in service commerce, so the platform now **rewards** it: the take rate falls (12% → 10% → 8%) as a pair completes jobs together, cutting the fee exactly when leak risk peaks. Keeping a suki pair at 8% forever beats losing them at 12% once. Combined with Thesis 1, staying on-platform pays twice: cheaper fees *and* a growing credit record.

## Thesis 4 — Safety as the brand *(shipped, needs telling)*

No PH incumbent leads with worker safety. SOS that writes first and asks questions never, trusted contacts, check-ins, evidence photos, an operator runbook whose first rule is "call the person before the money." The brand line writes itself: *ang app na may kasamang bantay.* This is a marketing asset as much as a feature — providers recruit providers on it.

## Growth mechanics (the owner's asks, placed on the road)

**Request-to-book and browse-by-availability** — *shipped this pass.* Clients can now book a specific provider directly (private request, one-tap confirmation, escrow on confirm, 48h expiry) and filter the directory to who is actually free at a chosen hour.

**Instant book** — the Airbnb progression: a provider opts in to skip confirmation for bookings inside their stated hours at their listed rate. The rails exist (availability enforcement + escrow at booking); what remains is the opt-in flag, the no-show accountability rules, and honest UI. Build after real-user testing shows confirmation friction actually costs bookings.

**Organization accounts** — agencies and established teams posting and serving as businesses. Deliberately roadmap, not bolted on, because it changes the trust model: verification by DTI/SEC registration instead of a personal government ID; workers under an org with per-worker vetting so a badge still refers to the human who shows up; dispatch (org accepts, assigns a worker; the client sees who is coming); org-level reputation aggregating worker outcomes; and BIR treatment that differs for registered businesses (VAT invoices, different withholding). Schema sketch: `Organization {id, name, dtiSecRef, verifiedAt}`, `User.orgId?`, `Job.servedByOrgId?`, org-scoped payout accounts. The clean wedge-in: pilot with 2–3 real cleaning teams in one city as design partners before generalizing.

**The kapitbahay graph** — later: vetted providers vouch for apprentices they bring in (the crew model already exists informally), giving a trust signal Facebook cannot fake and solving supply cold-start in new barangays.

## What this adds up to

Table stakes get someone to try the app once. Thesis 2 gets the first paying cohort whose money is already digital. Theses 1 and 3 are why both sides *stay*: the longer you stay, the cheaper it gets and the more your record is worth — a compounding switching cost that grows with every completed job. Thesis 4 is why people tell each other about it.
