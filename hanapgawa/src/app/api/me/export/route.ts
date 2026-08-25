import { NextResponse } from "next/server";
import { api, requireUser, audit, clientIp, ApiError } from "@/lib/api";
import { exportAccount } from "@/lib/account";
import { rateLimitAsync } from "@/lib/ratelimit";

/**
 * RA 10173 right of access and portability, self-service. Rate-limited
 * because it is by far the most expensive read in the app and a stolen
 * session should not be able to pull the same dossier repeatedly; audited
 * because a bulk read of someone's own data is still worth a record.
 */
export const GET = api(async (req) => {
  const user = await requireUser();
  if (!(await rateLimitAsync(`export:${user.id}`, 3, 60 * 60_000))) {
    throw new ApiError(429, "Kaka-download mo lang. Subukan ulit mamaya.");
  }

  const data = await exportAccount(user.id);
  await audit("account.export", { actorId: user.id, ip: clientIp(req) });

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="hanapgawa-data-${stamp}.json"`,
      "Cache-Control": "no-store",
    },
  });
});
