import { NextRequest, NextResponse } from "next/server";
import { ZodError, ZodSchema } from "zod";
import { getSessionUser } from "./session";
import { db } from "./db";
import { captureError, newRequestId } from "./monitoring";
import type { User } from "@prisma/client";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/**
 * CSRF defense: session cookie is SameSite=Lax, and every state-changing
 * request must additionally come from our own origin.
 */
export function assertSameOrigin(req: NextRequest) {
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") {
    throw new ApiError(403, "Cross-site request rejected");
  }
  const origin = req.headers.get("origin");
  if (origin) {
    const host = req.headers.get("host");
    let originHost: string | null = null;
    try {
      originHost = new URL(origin).host;
    } catch {
      throw new ApiError(403, "Bad origin");
    }
    if (host && originHost !== host) throw new ApiError(403, "Cross-origin request rejected");
  }
}

export async function requireUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) throw new ApiError(401, "Please log in first");
  return user;
}

export async function requireVerifiedUser(): Promise<User> {
  const user = await requireUser();
  if (user.kycLevel < 1) throw new ApiError(403, "Verify your phone number first");
  return user;
}

export async function requireProvider(): Promise<User> {
  const user = await requireVerifiedUser();
  if (!user.isProvider) throw new ApiError(403, "Provider account required");
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (!user.isAdmin) throw new ApiError(403, "Admin only");
  return user;
}

export function clientIp(req: NextRequest): string {
  // Trust only what OUR proxy appended: the RIGHTMOST X-Forwarded-For entry.
  // The leftmost entries are attacker-controlled (any client can send an XFF
  // header), so using them would let callers rotate fake IPs to bypass
  // per-IP rate limits and poison audit logs. If the platform sits behind
  // more than one trusted proxy hop, count further from the right.
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const parts = xff.split(",");
    const last = parts[parts.length - 1]?.trim();
    if (last) return last;
  }
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function parseBody<T>(req: NextRequest, schema: ZodSchema<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new ApiError(400, "Invalid JSON body");
  }
  return schema.parse(raw);
}

export async function audit(
  action: string,
  opts: { actorId?: string; targetType?: string; targetId?: string; meta?: unknown; ip?: string } = {},
) {
  try {
    await db.auditLog.create({
      data: {
        action,
        actorId: opts.actorId,
        targetType: opts.targetType,
        targetId: opts.targetId,
        meta: opts.meta === undefined ? undefined : JSON.stringify(opts.meta),
        ip: opts.ip,
      },
    });
  } catch (e) {
    console.error("audit log failed", e);
  }
}

type Handler = (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<NextResponse>;

/** Wrap a route handler with uniform error handling. */
export function api(handler: Handler): Handler {
  return async (req, ctx) => {
    try {
      if (req.method !== "GET" && req.method !== "HEAD") assertSameOrigin(req);
      return await handler(req, ctx);
    } catch (e) {
      if (e instanceof ApiError) {
        return NextResponse.json({ error: e.message }, { status: e.status });
      }
      if (e instanceof ZodError) {
        const msg = e.errors[0] ? `${e.errors[0].path.join(".")}: ${e.errors[0].message}` : "Invalid input";
        return NextResponse.json({ error: msg }, { status: 400 });
      }
      // Unexpected: report it with a correlation id the user can quote to
      // support, and never leak internals into the response body.
      const requestId = newRequestId();
      const session = await getSessionUser().catch(() => null);
      await captureError(e, {
        requestId,
        route: new URL(req.url).pathname,
        method: req.method,
        userId: session?.id,
        status: 500,
      });
      return NextResponse.json(
        { error: "Something went wrong. Please try again.", requestId },
        { status: 500, headers: { "X-Request-Id": requestId } },
      );
    }
  };
}

export const ok = (data: unknown, status = 200) => NextResponse.json(data, { status });
