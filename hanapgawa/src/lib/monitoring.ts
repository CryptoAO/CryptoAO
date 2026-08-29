import { randomUUID } from "crypto";

// Error monitoring. Dev prints structured JSON to stdout; production ships
// to a Sentry-compatible collector via its store endpoint (no SDK, so there
// is nothing to keep patched and no client-side bundle cost).
//
// Hard rule: we scrub before we send. An error report that leaks a phone
// number, an OTP, or a session token into a third-party dashboard is a
// privacy incident, not a debugging aid.

const SCRUB_KEYS = /^(password|passwordhash|code|codehash|token|authorization|cookie|secret|apikey|accountref|phone|email|lat|lng|addressnote|idlastfour)$/i;
const PHONE_RE = /(?:\+?63|0)9\d{9}/g;
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;

export function scrubText(input: string): string {
  return input.replace(PHONE_RE, "[phone]").replace(EMAIL_RE, "[email]");
}

export function scrub(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[deep]";
  if (value == null) return value;
  if (typeof value === "string") return scrubText(value.slice(0, 500));
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => scrub(v, depth + 1));
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SCRUB_KEYS.test(k) ? "[redacted]" : scrub(v, depth + 1);
    }
    return out;
  }
  return String(value);
}

export interface ErrorContext {
  requestId?: string;
  route?: string;
  method?: string;
  userId?: string;
  status?: number;
  extra?: Record<string, unknown>;
}

export const newRequestId = () => randomUUID();

interface Reporter {
  capture(error: unknown, ctx: ErrorContext): Promise<void>;
}

class ConsoleReporter implements Reporter {
  async capture(error: unknown, ctx: ErrorContext) {
    const err = error instanceof Error ? error : new Error(String(error));
    console.error(
      JSON.stringify({
        level: "error",
        ts: new Date().toISOString(),
        message: scrubText(err.message),
        stack: err.stack?.split("\n").slice(0, 8).join("\n"),
        ...ctx,
        extra: ctx.extra ? scrub(ctx.extra) : undefined,
      }),
    );
  }
}

/** Sentry "store" endpoint — a plain POST, no SDK required. */
class SentryReporter implements Reporter {
  constructor(private dsn: string) {}

  async capture(error: unknown, ctx: ErrorContext) {
    const err = error instanceof Error ? error : new Error(String(error));
    // Always keep a local line too, so a collector outage doesn't lose it.
    await new ConsoleReporter().capture(error, ctx);
    try {
      const parsed = new URL(this.dsn);
      const projectId = parsed.pathname.replace(/^\//, "");
      const key = parsed.username;
      if (!projectId || !key) return;
      const endpoint = `${parsed.protocol}//${parsed.host}/api/${projectId}/store/`;
      await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${key}, sentry_client=hanapgawa/1.0`,
        },
        body: JSON.stringify({
          event_id: (ctx.requestId ?? randomUUID()).replace(/-/g, ""),
          timestamp: new Date().toISOString(),
          platform: "node",
          level: "error",
          environment: process.env.NODE_ENV,
          release: process.env.APP_RELEASE,
          transaction: ctx.route,
          message: scrubText(err.message),
          exception: {
            values: [{ type: err.name, value: scrubText(err.message), stacktrace: { frames: [] } }],
          },
          tags: { route: ctx.route, method: ctx.method, status: String(ctx.status ?? 500) },
          // user id only — never phone, name or email
          user: ctx.userId ? { id: ctx.userId } : undefined,
          extra: ctx.extra ? scrub(ctx.extra) : undefined,
        }),
        // Never let monitoring stall a user request.
        signal: AbortSignal.timeout(3000),
      });
    } catch (e) {
      console.error("error reporter failed", e);
    }
  }
}

let cached: Reporter | null = null;

export function reporter(): Reporter {
  if (cached) return cached;
  const dsn = process.env.SENTRY_DSN;
  cached = dsn ? new SentryReporter(dsn) : new ConsoleReporter();
  return cached;
}

/** Report an unexpected error. Never throws — monitoring must not add faults. */
export async function captureError(error: unknown, ctx: ErrorContext = {}): Promise<void> {
  try {
    await reporter().capture(error, ctx);
  } catch (e) {
    console.error("captureError failed", e);
  }
}
