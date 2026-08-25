import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { sweepAutoRelease } from "@/lib/autorelease";
import { purgeOldPhotos } from "@/lib/photos";
import { captureError } from "@/lib/monitoring";

export const dynamic = "force-dynamic";

/**
 * Escrow auto-release sweep, plus evidence-photo retention. Meant to be
 * called every few minutes by a
 * scheduler (Vercel Cron, a GitHub Action, systemd timer — anything that can
 * send a header):
 *
 *   curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://…/api/cron/auto-release
 *
 * There is no dev bypass. An unset CRON_SECRET returns 503 rather than
 * running the sweep, because the alternative — "open in development" — is
 * one misconfigured environment away from letting anyone on the internet
 * push every held escrow out the door.
 */
function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  const header = req.headers.get("authorization") ?? "";
  const presented = header.startsWith("Bearer ") ? header.slice(7) : "";
  const a = Buffer.from(presented);
  const b = Buffer.from(secret);
  // Compare lengths separately; timingSafeEqual throws on a mismatch.
  return a.length === b.length && timingSafeEqual(a, b);
}

async function run(req: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Scheduler is not configured" }, { status: 503 });
  }
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await sweepAutoRelease();
    // Retention runs on the same tick rather than as a second scheduled job:
    // one thing for the operator to configure, one place to look when data
    // is not being deleted on time. A failure here must not fail the sweep —
    // money moving is the job, tidying storage is the chore.
    let photos = null;
    try {
      photos = await purgeOldPhotos();
    } catch (e) {
      await captureError(e, { route: "cron/auto-release", extra: { step: "purgeOldPhotos" } });
    }
    return NextResponse.json({ ...result, photos }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    await captureError(e, { route: "cron/auto-release", method: "POST" });
    return NextResponse.json({ error: "Sweep failed" }, { status: 500 });
  }
}

export const POST = run;

// Vercel Cron (and several other schedulers) invoke with GET, so the same
// handler answers both. A mutating GET is normally a smell, but this route
// takes no cookies and is gated on a bearer secret, so there is no CSRF
// surface to protect — the alternative is a scheduler that cannot call it.
export const GET = run;
