import { z } from "zod";
import { NextRequest } from "next/server";
import { api, ok, ApiError, parseBody, requireUser, audit, clientIp } from "@/lib/api";
import { db } from "@/lib/db";
import { normalizePhPhone } from "@/lib/sms";
import { phoneSchema } from "@/lib/validation";

const MAX_CONTACTS = 3;

export const GET = api(async () => {
  const user = await requireUser();
  const contacts = await db.trustedContact.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
  });
  return ok({
    contacts: contacts.map((c) => ({
      id: c.id,
      name: c.name,
      // Mask in the response — the owner already knows who they added, and a
      // leaked session shouldn't hand over a family member's full number.
      phoneMasked: `${c.phone.slice(0, 6)}•••${c.phone.slice(-3)}`,
      relation: c.relation,
    })),
    max: MAX_CONTACTS,
  });
});

const createSchema = z.object({
  name: z.string().trim().min(1).max(60),
  phone: phoneSchema,
  relation: z.string().trim().max(40).optional(),
});

export const POST = api(async (req: NextRequest) => {
  const user = await requireUser();
  const body = await parseBody(req, createSchema);
  const phone = normalizePhPhone(body.phone);
  if (!phone) throw new ApiError(400, "Enter a valid PH mobile number (09XXXXXXXXX)");
  if (phone === user.phone) throw new ApiError(400, "Pumili ng ibang tao — hindi ang sarili mong number");

  const count = await db.trustedContact.count({ where: { userId: user.id } });
  if (count >= MAX_CONTACTS) throw new ApiError(409, `Hanggang ${MAX_CONTACTS} contacts lang`);

  const existing = await db.trustedContact.findFirst({ where: { userId: user.id, phone } });
  if (existing) throw new ApiError(409, "Nandiyan na ang number na 'yan");

  const contact = await db.trustedContact.create({
    data: { userId: user.id, name: body.name, phone, relation: body.relation },
  });
  await audit("contact.add", { actorId: user.id, targetId: contact.id, ip: clientIp(req) });
  return ok({ id: contact.id }, 201);
});

const deleteSchema = z.object({ id: z.string().min(1) });

export const DELETE = api(async (req: NextRequest) => {
  const user = await requireUser();
  const { id } = await parseBody(req, deleteSchema);
  // Scoped delete: an id the caller doesn't own simply matches nothing.
  const res = await db.trustedContact.deleteMany({ where: { id, userId: user.id } });
  if (res.count === 0) throw new ApiError(404, "Contact not found");
  await audit("contact.remove", { actorId: user.id, targetId: id, ip: clientIp(req) });
  return ok({ removed: true });
});
