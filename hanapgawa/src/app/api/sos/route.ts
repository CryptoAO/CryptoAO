import { z } from "zod";
import { api, ok, requireUser, audit, clientIp } from "@/lib/api";
import { raiseSos } from "@/lib/sos";

// Deliberately gated on requireUser, NOT requireVerifiedUser: an unverified
// account in trouble still gets help. Deliberately NOT rate-limited — see
// the note at the top of src/lib/sos.ts.
const sosSchema = z.object({
  jobId: z.string().min(1).optional(),
  lat: z.number().min(4).max(21).optional(),
  lng: z.number().min(116).max(127).optional(),
  note: z.string().trim().max(500).optional(),
});

export const POST = api(async (req) => {
  const user = await requireUser();
  // Parse leniently: a malformed field must not stop an alert.
  let body: z.infer<typeof sosSchema> = {};
  try {
    body = sosSchema.parse(await req.json());
  } catch {
    body = {};
  }

  const result = await raiseSos({
    userId: user.id,
    jobId: body.jobId,
    lat: body.lat,
    lng: body.lng,
    note: body.note,
  });

  await audit("sos.raised", {
    actorId: user.id,
    targetType: "SosAlert",
    targetId: result.alert.id,
    meta: { jobId: body.jobId, contactsReached: result.contactsReached },
    ip: clientIp(req),
  });

  return ok(
    {
      alertId: result.alert.id,
      contactsReached: result.contactsReached,
      totalContacts: result.totalContacts,
    },
    201,
  );
});
