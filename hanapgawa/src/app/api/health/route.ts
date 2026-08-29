import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * Uptime probe. Deliberately unauthenticated but deliberately boring: it
 * reports whether the process can reach its database and nothing else. No
 * counts, no dependency versions, no configuration — a health endpoint
 * should never double as a reconnaissance endpoint.
 */
export async function GET() {
  const startedAt = Date.now();
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json(
      { status: "ok", dbLatencyMs: Date.now() - startedAt },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { status: "degraded" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
