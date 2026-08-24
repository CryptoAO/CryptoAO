import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { creditTopup } from "@/lib/wallet";
import { audit } from "@/lib/api";
import { notifyPaymentReceived } from "@/lib/notify";

// PayMongo webhook — the ONLY place a paymongo-mode top-up credits a wallet
// (the checkout redirect is never trusted). Signature header format:
//   Paymongo-Signature: t=<unix>,te=<test-mode sig>,li=<live-mode sig>
// where sig = HMAC-SHA256(`${t}.${rawBody}`, PAYMONGO_WEBHOOK_SECRET) in hex.

interface PayMongoEvent {
  data?: {
    id?: string;
    attributes?: {
      type?: string;
      data?: {
        attributes?: {
          metadata?: { userId?: string };
          line_items?: { amount?: number }[];
        };
      };
    };
  };
}

function verifySignature(raw: string, header: string, secret: string): boolean {
  const parts: Record<string, string> = {};
  for (const piece of header.split(",")) {
    const idx = piece.indexOf("=");
    if (idx > 0) parts[piece.slice(0, idx).trim()] = piece.slice(idx + 1).trim();
  }
  const t = parts.t;
  const given = parts.li || parts.te;
  if (!t || !given) return false;
  const expected = crypto.createHmac("sha256", secret).update(`${t}.${raw}`).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
  const secret = process.env.PAYMONGO_WEBHOOK_SECRET;
  if (!secret || process.env.PAYMENTS_PROVIDER !== "paymongo") {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const raw = await req.text();
  const header = req.headers.get("paymongo-signature") ?? "";
  if (!verifySignature(raw, header, secret)) {
    return NextResponse.json({ error: "Bad signature" }, { status: 401 });
  }

  let event: PayMongoEvent;
  try {
    event = JSON.parse(raw) as PayMongoEvent;
  } catch {
    return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  }

  const type = event.data?.attributes?.type;
  if (type !== "checkout_session.payment.paid") {
    return NextResponse.json({ received: true }); // ack unrelated events
  }

  const eventId = event.data?.id;
  const session = event.data?.attributes?.data?.attributes;
  const userId = session?.metadata?.userId;
  const amountCents = session?.line_items?.[0]?.amount;
  if (!eventId || !userId || !Number.isInteger(amountCents) || (amountCents as number) <= 0) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: "Unknown user" }, { status: 400 });

  // Idempotency: PayMongo retries webhooks — credit each event exactly once.
  const dedupeNote = `PayMongo ${eventId}`;
  const already = await db.ledgerEntry.findFirst({
    where: { userId, type: "TOPUP", note: dedupeNote },
  });
  if (!already) {
    await creditTopup(userId, amountCents as number, dedupeNote);
    await notifyPaymentReceived(userId, amountCents as number);
    await audit("wallet.topup_webhook", { actorId: userId, meta: { eventId, amountCents } });
  }

  return NextResponse.json({ received: true });
}
