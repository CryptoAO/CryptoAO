import type { Job, Offer, User } from "@prisma/client";

// Data-privacy boundary: what each viewer is allowed to see.
// - Phone/email NEVER leave the server (not even to a booked counterpart —
//   coordination happens in in-app chat).
// - Full surname and exact address are shown only to the job's two parties
//   after booking, and to admins.

export function publicUser(u: User) {
  return {
    id: u.id,
    firstName: u.firstName,
    lastInitial: u.lastName ? `${u.lastName[0]}.` : "",
    // A route, never the storage key. Null when there is no photo so the UI
    // renders initials rather than a broken image.
    photoUrl: u.photoKey ? `/api/users/${u.id}/photo` : null,
    bio: u.bio,
    regionCode: u.regionCode,
    cityCode: u.cityCode,
    kycLevel: u.kycLevel,
    isProvider: u.isProvider,
    memberSince: u.createdAt,
  };
}

export function selfUser(u: User) {
  return {
    ...publicUser(u),
    lastName: u.lastName,
    phone: u.phone,
    email: u.email,
    barangay: u.barangay,
    isClient: u.isClient,
    isAdmin: u.isAdmin,
    status: u.status,
    strikeCount: u.strikeCount,
  };
}

export function jobView(job: Job & { client?: User; provider?: User | null }, viewerId?: string, viewerIsAdmin = false) {
  const isParty = viewerId === job.clientId || (job.assignedProviderId != null && viewerId === job.assignedProviderId);
  const showPrivate = viewerIsAdmin || isParty;
  return {
    id: job.id,
    title: job.title,
    description: job.description,
    categoryId: job.categoryId,
    regionCode: job.regionCode,
    cityCode: job.cityCode,
    barangay: job.barangay,
    // Exact meeting address only after you're actually on the job.
    addressNote: showPrivate && job.status !== "OPEN" ? job.addressNote : null,
    // Precise coordinates are as sensitive as the address — never expose them
    // to non-parties. (Server-side "near" sorting reads the DB rows directly,
    // so public distance sort still works without leaking the pin.)
    lat: showPrivate ? job.lat : null,
    lng: showPrivate ? job.lng : null,
    payType: job.payType,
    budgetCents: job.budgetCents,
    durationMin: job.durationMin,
    scheduledAt: job.scheduledAt,
    flexible: job.flexible,
    status: job.status,
    clientId: job.clientId,
    assignedProviderId: job.assignedProviderId,
    agreedPriceCents: isParty || viewerIsAdmin ? job.agreedPriceCents : null,
    escrowHeld: isParty || viewerIsAdmin ? job.escrowHeld : undefined,
    // Both parties should see the same deadline. Hiding it from the client
    // would make an automatic payout feel like it came out of nowhere, and
    // hiding it from the provider is the anxiety the clock exists to remove.
    visibility: job.visibility,
    directProviderId:
      viewerIsAdmin || isParty || viewerId === job.directProviderId ? job.directProviderId : undefined,
    autoReleaseAt: isParty || viewerIsAdmin ? job.autoReleaseAt : undefined,
    autoReleased: isParty || viewerIsAdmin ? job.autoReleased : undefined,
    createdAt: job.createdAt,
    client: job.client ? publicUser(job.client) : undefined,
    provider: job.provider ? publicUser(job.provider) : undefined,
  };
}

export function offerView(offer: Offer & { provider?: User }) {
  return {
    id: offer.id,
    jobId: offer.jobId,
    providerId: offer.providerId,
    priceCents: offer.priceCents,
    message: offer.message,
    status: offer.status,
    createdAt: offer.createdAt,
    provider: offer.provider ? publicUser(offer.provider) : undefined,
  };
}
