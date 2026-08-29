import { z } from "zod";
import { NextRequest } from "next/server";
import { api, ok, parseBody, requireUser } from "@/lib/api";
import { db } from "@/lib/db";

/** The signed-in user's notifications, newest first, plus unread count. */
export const GET = api(async (req: NextRequest) => {
  const user = await requireUser();
  const unreadOnly = req.nextUrl.searchParams.get("unread") === "1";

  const [items, unread] = await Promise.all([
    db.notification.findMany({
      where: { userId: user.id, ...(unreadOnly ? { readAt: null } : {}) },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    db.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);

  return ok({
    unread,
    notifications: items.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      href: n.href,
      read: n.readAt != null,
      createdAt: n.createdAt,
    })),
  });
});

const markSchema = z.object({
  // omit `ids` to mark everything read
  ids: z.array(z.string().min(1)).max(100).optional(),
});

/** Mark notifications read. Scoped to the caller — ids they don't own are ignored. */
export const POST = api(async (req: NextRequest) => {
  const user = await requireUser();
  const { ids } = await parseBody(req, markSchema);

  const result = await db.notification.updateMany({
    where: { userId: user.id, readAt: null, ...(ids ? { id: { in: ids } } : {}) },
    data: { readAt: new Date() },
  });

  return ok({ marked: result.count });
});
