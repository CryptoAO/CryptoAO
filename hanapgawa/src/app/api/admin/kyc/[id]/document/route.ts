import { NextRequest, NextResponse } from "next/server";
import { ApiError, audit, clientIp, requireAdmin } from "@/lib/api";
import { db } from "@/lib/db";
import { objectStore } from "@/lib/storage";

/**
 * The ONLY way an identity document can be read back. Admin-only, streamed
 * through the app (never a public bucket URL), audit-logged on every single
 * view so there is a record of who looked at whose ID and when.
 */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await ctx.params;

    const submission = await db.kycSubmission.findUnique({ where: { id } });
    if (!submission?.docRef) {
      return NextResponse.json({ error: "No document on this submission" }, { status: 404 });
    }
    if (submission.docPurgedAt) {
      return NextResponse.json({ error: "Document was purged after review" }, { status: 410 });
    }

    const bytes = await objectStore().get(submission.docRef);
    if (!bytes) return NextResponse.json({ error: "Document missing from storage" }, { status: 404 });

    await audit("admin.kyc_doc_view", {
      actorId: admin.id,
      targetType: "KycSubmission",
      targetId: submission.id,
      meta: { subjectUserId: submission.userId },
      ip: clientIp(_req),
    });

    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": submission.docMime ?? "application/octet-stream",
        // Never cached anywhere but this response, never indexed, never
        // rendered as an active document.
        "Cache-Control": "no-store, private",
        "Content-Disposition": "inline",
        "X-Content-Type-Options": "nosniff",
        // The sandboxing CSP for this path is set in src/middleware.ts.
      },
    });
  } catch (e) {
    if (e instanceof ApiError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("kyc doc read failed", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
