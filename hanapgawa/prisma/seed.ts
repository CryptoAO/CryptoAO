// Demo seed: categories, an admin, providers/clients across PH cities, and
// jobs in various lifecycle states. All demo accounts use password
// "password123" (dev only — never seed real credentials in production).

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

const CATEGORIES = [
  { slug: "laundry", name: "Laundry & Ironing", nameTl: "Labada at Plantsa", icon: "🧺", sort: 10, minPriceCents: 10000, typicalLowCents: 15000, typicalHighCents: 40000, priceNote: "kada 8 kilo, labhan at tupi" },
  { slug: "cleaning", name: "House Cleaning", nameTl: "Linis-Bahay", icon: "🧹", sort: 20, minPriceCents: 20000, typicalLowCents: 50000, typicalHighCents: 120000, priceNote: "kada 4 oras, isang bahay o condo" },
  { slug: "errands", name: "Errands & Pabili", nameTl: "Utos at Pabili", icon: "🛵", sort: 30, minPriceCents: 5000, typicalLowCents: 10000, typicalHighCents: 30000, priceNote: "bukod sa halaga ng pabilhin" },
  { slug: "padala", name: "Delivery / Padala", nameTl: "Padala", icon: "📦", sort: 40, minPriceCents: 5000, typicalLowCents: 12000, typicalHighCents: 35000, priceNote: "loob ng lungsod" },
  { slug: "driver", name: "Driver", nameTl: "Drayber / Hatid-Sundo", icon: "🚗", sort: 50, minPriceCents: 30000, typicalLowCents: 80000, typicalHighCents: 180000, priceNote: "kada 8 oras, sasakyan ng kliyente" },
  { slug: "petcare", name: "Pet Care & Dog Walking", nameTl: "Alaga ng Pet / Dog Walk", icon: "🐕", sort: 60, minPriceCents: 10000, typicalLowCents: 20000, typicalHighCents: 50000, priceNote: "kada lakad o kada araw" },
  { slug: "fitness", name: "Fitness Trainer", nameTl: "Fitness Trainer", icon: "💪", sort: 70, minPriceCents: 30000, typicalLowCents: 50000, typicalHighCents: 120000, priceNote: "kada session" },
  { slug: "tutor", name: "Tutoring", nameTl: "Tutor / Turo", icon: "📚", sort: 80, minPriceCents: 20000, typicalLowCents: 30000, typicalHighCents: 70000, priceNote: "kada oras" },
  { slug: "carpentry", name: "Carpentry & Repairs", nameTl: "Karpintero / Ayos-Bahay", icon: "🔨", sort: 90, minPriceCents: 30000, typicalLowCents: 80000, typicalHighCents: 250000, priceNote: "kada araw, walang materyales" },
  { slug: "plumbing", name: "Plumbing", nameTl: "Tubero", icon: "🔧", sort: 100, minPriceCents: 30000, typicalLowCents: 50000, typicalHighCents: 200000, priceNote: "kada tawag, walang parte" },
  { slug: "electrical", name: "Electrical", nameTl: "Elektrisyan", icon: "💡", sort: 110, minPriceCents: 30000, typicalLowCents: 60000, typicalHighCents: 250000, priceNote: "kada tawag, walang materyales" },
  { slug: "aircon", name: "Aircon Cleaning", nameTl: "Linis-Aircon", icon: "❄️", sort: 120, minPriceCents: 40000, typicalLowCents: 50000, typicalHighCents: 120000, priceNote: "kada unit; split-type mas mahal" },
  { slug: "gardening", name: "Gardening", nameTl: "Hardinero", icon: "🌱", sort: 130, minPriceCents: 20000, typicalLowCents: 50000, typicalHighCents: 120000, priceNote: "kada araw" },
  { slug: "beauty", name: "Hair & Beauty (home service)", nameTl: "Gupit / Kulot / Kuko", icon: "💇", sort: 140, minPriceCents: 15000, typicalLowCents: 25000, typicalHighCents: 80000, priceNote: "kada serbisyo, home service" },
  { slug: "events", name: "Events Help", nameTl: "Tulong sa Handaan", icon: "🎉", sort: 150, minPriceCents: 30000, typicalLowCents: 70000, typicalHighCents: 150000, priceNote: "kada tao, kada araw" },
  { slug: "care", name: "Elder & Child Care", nameTl: "Alaga (Matanda/Bata)", icon: "🤱", sort: 160, minPriceCents: 30000, typicalLowCents: 70000, typicalHighCents: 150000, priceNote: "kada 8 oras" },
];

async function main() {
  console.log("Seeding…");
  const passwordHash = await bcrypt.hash("password123", 12);

  const cats: Record<string, string> = {};
  for (const c of CATEGORIES) {
    const row = await db.category.upsert({
      where: { slug: c.slug },
      update: {
        name: c.name, nameTl: c.nameTl, icon: c.icon, sort: c.sort, minPriceCents: c.minPriceCents,
        typicalLowCents: c.typicalLowCents, typicalHighCents: c.typicalHighCents, priceNote: c.priceNote,
      },
      create: { ...c },
    });
    cats[c.slug] = row.id;
  }

  async function user(data: {
    phone: string; firstName: string; lastName: string; regionCode: string; cityCode: string;
    isProvider?: boolean; isAdmin?: boolean; kycLevel?: number; bio?: string;
  }) {
    return db.user.upsert({
      where: { phone: data.phone },
      update: {},
      create: {
        phone: data.phone,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        regionCode: data.regionCode,
        cityCode: data.cityCode,
        isProvider: data.isProvider ?? false,
        isAdmin: data.isAdmin ?? false,
        kycLevel: data.kycLevel ?? 1,
        bio: data.bio,
        phoneVerifiedAt: new Date(),
        idVerifiedAt: (data.kycLevel ?? 1) >= 2 ? new Date() : null,
        clearanceVerifiedAt: (data.kycLevel ?? 1) >= 3 ? new Date() : null,
      },
    });
  }

  const admin = await user({ phone: "+639170000001", firstName: "Admin", lastName: "HanapGawa", regionCode: "13", cityCode: "quezon-city", isAdmin: true, kycLevel: 3 });

  const aling = await user({ phone: "+639170000002", firstName: "Aling Nena", lastName: "Santos", regionCode: "13", cityCode: "quezon-city", isProvider: true, kycLevel: 3, bio: "15 taon nang labandera. Maingat sa damit, may sariling plantsa. Pwede rin mag-linis ng bahay." });
  const mang = await user({ phone: "+639170000003", firstName: "Mang Ben", lastName: "Reyes", regionCode: "13", cityCode: "makati", isProvider: true, kycLevel: 2, bio: "Family driver for 8 years, defensive driving certified. Hatid-sundo, provincial trips OK." });
  const coach = await user({ phone: "+639170000004", firstName: "Coach Migs", lastName: "Dela Cruz", regionCode: "07", cityCode: "cebu-city", isProvider: true, kycLevel: 2, bio: "Certified fitness trainer. Home workouts, sali na sa program!" });
  const rina = await user({ phone: "+639170000005", firstName: "Rina", lastName: "Lopez", regionCode: "11", cityCode: "davao-city", isProvider: true, kycLevel: 1, bio: "Dog walker at pet sitter. Mahal ko ang mga aso 🐶" });
  const tonyo = await user({ phone: "+639170000009", firstName: "Mang Tonyo", lastName: "Villanueva", regionCode: "13", cityCode: "makati", isProvider: true, kycLevel: 2, bio: "Tubero at elektrisyan, 20 taon sa serbisyo. May sariling gamit, marunong sa condo at bahay." });
  const grace = await user({ phone: "+639170000010", firstName: "Ate Grace", lastName: "Navarro", regionCode: "13", cityCode: "quezon-city", isProvider: true, kycLevel: 2, bio: "LET passer, 6 na taon nagtuturo. Math at English tutor para sa elementary at junior high." });
  const marites = await user({ phone: "+639170000011", firstName: "Marites", lastName: "Cruz", regionCode: "07", cityCode: "cebu-city", isProvider: true, kycLevel: 1, bio: "Home service gupit, kulot, at kuko. Dating salon stylist, may kumpletong gamit." });

  const carlo = await user({ phone: "+639170000006", firstName: "Carlo", lastName: "Garcia", regionCode: "13", cityCode: "quezon-city", kycLevel: 2 });
  const mia = await user({ phone: "+639170000007", firstName: "Mia", lastName: "Tan", regionCode: "13", cityCode: "makati", kycLevel: 1 });
  const jose = await user({ phone: "+639170000008", firstName: "Jose", lastName: "Ramos", regionCode: "07", cityCode: "cebu-city", kycLevel: 1 });
  const liza = await user({ phone: "+639170000012", firstName: "Liza", lastName: "Mendoza", regionCode: "11", cityCode: "davao-city", kycLevel: 1 });

  // Provider categories + availability
  const pcs: [string, string, { headline?: string; rateCents?: number; rateUnit?: string; yearsExp?: number }][] = [
    [aling.id, cats.laundry, { headline: "Labada + plantsa, per kilo", rateCents: 8000, rateUnit: "PER_KILO", yearsExp: 15 }],
    [aling.id, cats.cleaning, { headline: "General cleaning, condo o bahay", rateCents: 15000, rateUnit: "PER_HOUR", yearsExp: 10 }],
    [mang.id, cats.driver, { headline: "Hatid-sundo / family driver", rateCents: 150000, rateUnit: "PER_DAY", yearsExp: 8 }],
    [mang.id, cats.padala, { headline: "Padala within Metro Manila", rateCents: 15000, rateUnit: "PER_JOB" }],
    [coach.id, cats.fitness, { headline: "1-on-1 home workout", rateCents: 50000, rateUnit: "PER_JOB", yearsExp: 5 }],
    [rina.id, cats.petcare, { headline: "Dog walking, 1 hour", rateCents: 15000, rateUnit: "PER_JOB", yearsExp: 3 }],
    [tonyo.id, cats.plumbing, { headline: "Tubero — tulo, bara, kabit", rateCents: 60000, rateUnit: "PER_JOB", yearsExp: 20 }],
    [tonyo.id, cats.electrical, { headline: "Elektrisyan — wiring at kabit-ilaw", rateCents: 70000, rateUnit: "PER_JOB", yearsExp: 20 }],
    [tonyo.id, cats.aircon, { headline: "Linis-aircon, window at split", rateCents: 60000, rateUnit: "PER_JOB", yearsExp: 10 }],
    [grace.id, cats.tutor, { headline: "Math at English, elem hanggang JHS", rateCents: 35000, rateUnit: "PER_HOUR", yearsExp: 6 }],
    [marites.id, cats.beauty, { headline: "Gupit, kulot, kuko — home service", rateCents: 30000, rateUnit: "PER_JOB", yearsExp: 8 }],
  ];
  for (const [providerId, categoryId, extra] of pcs) {
    await db.providerCategory.upsert({
      where: { providerId_categoryId: { providerId, categoryId } },
      update: {},
      create: { providerId, categoryId, ...extra },
    });
  }
  for (const p of [aling, mang, coach, rina, tonyo, grace, marites]) {
    const existing = await db.availabilitySlot.count({ where: { providerId: p.id } });
    if (existing === 0) {
      for (const weekday of [1, 2, 3, 4, 5, 6]) {
        await db.availabilitySlot.create({ data: { providerId: p.id, weekday, startMin: 7 * 60, endMin: 18 * 60 } });
      }
    }
  }

  // Open jobs across cities. Each carries real coordinates (city center
  // plus a small offset) so "Malapit sa'kin" has something to measure, and
  // a staggered age so "Pinakabago" doesn't show six posts born in the
  // same second.
  const openJobs = [
    { clientId: carlo.id, categoryId: cats.laundry, title: "Labada 2 bags + plantsa, kunin sa bahay", description: "Dalawang malaking bag ng damit, may kasamang plantsa. Sana makuha bukas ng umaga at maibalik sa loob ng 2 araw.", regionCode: "13", cityCode: "quezon-city", barangay: "Batasan Hills", budgetCents: 60000, payType: "FIXED" },
    { clientId: mia.id, categoryId: cats.cleaning, title: "General cleaning ng 1BR condo bago lumipat", description: "35sqm 1BR condo sa Makati. Deep clean: banyo, kusina, bintana. Dalhin ang sariling cleaning materials kung kaya.", regionCode: "13", cityCode: "makati", budgetCents: 120000, payType: "FIXED" },
    { clientId: mia.id, categoryId: cats.driver, title: "Driver papuntang Tagaytay, Sabado, buong araw", description: "May sariling kotse (automatic). Alis 6AM, balik mga 8PM. Kasama pagkain sa biyahe.", regionCode: "13", cityCode: "makati", budgetCents: 200000, payType: "FIXED" },
    { clientId: jose.id, categoryId: cats.fitness, title: "Personal trainer, 3x a week, home workout", description: "Beginner ako, gusto ko magpapayat ng 10kg. May dumbbells sa bahay. Per session muna tayo.", regionCode: "07", cityCode: "cebu-city", budgetCents: 40000, payType: "HOURLY" },
    { clientId: carlo.id, categoryId: cats.padala, title: "Padala ng dokumento QC → Ortigas ngayong hapon", description: "Isang envelope lang, pickup sa Batasan area, deliver sa Ortigas Center office bago mag-5PM.", regionCode: "13", cityCode: "quezon-city", budgetCents: 18000, payType: "FIXED" },
    { clientId: jose.id, categoryId: cats.petcare, title: "Dog walk tuwing umaga, 1 week", description: "Golden retriever, mabait. 30-45 mins kada umaga, 7AM. Malapit sa IT Park.", regionCode: "07", cityCode: "cebu-city", budgetCents: 70000, payType: "FIXED" },
    { clientId: jose.id, categoryId: cats.aircon, title: "Linis ng 2 split-type aircon", description: "Dalawang 1HP split-type sa condo, hindi pa nalilinis ng isang taon. May tubig at kuryente, kailangan lang ng gamit.", regionCode: "07", cityCode: "cebu-city", budgetCents: 120000, payType: "FIXED" },
    { clientId: carlo.id, categoryId: cats.tutor, title: "Math tutor para sa Grade 6, 2x a week", description: "Anak ko, Grade 6, nahihirapan sa fractions at word problems. Tuwing Martes at Huwebes, 4-6PM, sa bahay sa Batasan.", regionCode: "13", cityCode: "quezon-city", budgetCents: 35000, payType: "HOURLY" },
    { clientId: liza.id, categoryId: cats.petcare, title: "Pet sitter, 3 araw, dalawang pusa", description: "Uuwi ako ng probinsya, 3 araw. Pakainin at linisan ang litter box ng dalawang pusa, isang dalaw kada araw, Matina area.", regionCode: "11", cityCode: "davao-city", budgetCents: 45000, payType: "FIXED" },
  ];
  const CITY_COORD: Record<string, { lat: number; lng: number }> = {
    "quezon-city": { lat: 14.676, lng: 121.0437 },
    makati: { lat: 14.5547, lng: 121.0244 },
    "cebu-city": { lat: 10.3157, lng: 123.8854 },
    "davao-city": { lat: 7.1907, lng: 125.4553 },
  };
  const jobCount = await db.job.count();
  if (jobCount === 0) {
    for (let i = 0; i < openJobs.length; i++) {
      const j = openJobs[i];
      const c = CITY_COORD[j.cityCode];
      // Deterministic ~±2km scatter around the city center, aged 2h–3d.
      const jitter = ((i * 37) % 100) / 100 - 0.5;
      await db.job.create({
        data: {
          ...j,
          status: "OPEN",
          lat: c ? c.lat + jitter * 0.04 : null,
          lng: c ? c.lng + jitter * 0.04 : null,
          createdAt: new Date(Date.now() - (i * 7 + 2) * 60 * 60 * 1000),
        },
      });
    }

    // One fully completed job so ratings/wallets have history:
    const done = await db.job.create({
      data: {
        clientId: carlo.id,
        categoryId: cats.laundry,
        title: "Labada 1 bag, rush",
        description: "Isang bag, rush kasi may lakad.",
        regionCode: "13",
        cityCode: "quezon-city",
        budgetCents: 35000,
        payType: "FIXED",
        status: "COMPLETED",
        assignedProviderId: aling.id,
        agreedPriceCents: 35000,
        takeRateBps: 1200,
        escrowHeld: false,
        completedAt: new Date(),
      },
    });
    const offer = await db.offer.create({
      data: { jobId: done.id, providerId: aling.id, priceCents: 35000, message: "Ako na po ang bahala, sanay ako sa rush. 😊", status: "ACCEPTED" },
    });
    await db.job.update({ where: { id: done.id }, data: { acceptedOfferId: offer.id } });
    // Ledger history for the completed job (top-up → hold → release + commission)
    await db.ledgerEntry.createMany({
      data: [
        { userId: carlo.id, type: "TOPUP", amountCents: 100000, note: "Cash in via GCash (demo)" },
        { userId: carlo.id, jobId: done.id, type: "ESCROW_HOLD", amountCents: -35000, note: "Held for job booking" },
        { userId: aling.id, jobId: done.id, type: "ESCROW_RELEASE_PAYOUT", amountCents: 30800, note: "Job payout" },
        { userId: null, jobId: done.id, type: "COMMISSION", amountCents: 4200, note: "Platform fee 12%" },
      ],
    });
    await db.review.createMany({
      data: [
        { jobId: done.id, raterId: carlo.id, rateeId: aling.id, rating: 5, comment: "Ang bango at ang ayos ng pagkakatiklop! Sobrang bilis pa. Highly recommended si Aling Nena." },
        { jobId: done.id, raterId: aling.id, rateeId: carlo.id, rating: 5, comment: "Mabait na client, on-time magbayad. Salamat po!" },
      ],
    });
    await db.message.createMany({
      data: [
        { jobId: done.id, senderId: carlo.id, recipientId: aling.id, body: "Good morning po! Kailan po pwede kunin?" },
        { jobId: done.id, senderId: aling.id, recipientId: carlo.id, body: "Mamayang 10AM po ako dadaan. Salamat po!" },
      ],
    });
  }

  console.log("Seeded.");
  console.log("Demo accounts (password: password123):");
  console.log("  Admin:    +639170000001 / 09170000001");
  console.log("  Provider: +639170000002 (Aling Nena, QC, fully vetted)");
  console.log("  Client:   +639170000006 (Carlo, QC)");
  void liza;
  void admin;
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await db.$disconnect();
    process.exit(1);
  });
