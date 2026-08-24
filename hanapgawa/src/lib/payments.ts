// Payment provider adapter. Dev mode credits wallets instantly so the whole
// flow is demoable offline. Production swaps in PayMongo (GCash, Maya, cards,
// online banking) without touching call sites.

import { creditTopup } from "./wallet";

export interface TopupResult {
  kind: "instant" | "redirect";
  checkoutUrl?: string;
}

export interface PaymentProvider {
  /** Start a wallet top-up. Dev: instant credit. PayMongo: hosted checkout. */
  createTopup(userId: string, amountCents: number): Promise<TopupResult>;
}

class DevPayments implements PaymentProvider {
  async createTopup(userId: string, amountCents: number): Promise<TopupResult> {
    await creditTopup(userId, amountCents, "Dev top-up (simulated GCash)");
    return { kind: "instant" };
  }
}

class PayMongoPayments implements PaymentProvider {
  async createTopup(userId: string, amountCents: number): Promise<TopupResult> {
    const key = process.env.PAYMONGO_SECRET_KEY;
    if (!key) throw new Error("PAYMONGO_SECRET_KEY not set");
    // Create a Checkout Session; the webhook (checkout_session.payment.paid)
    // is what actually credits the wallet — never the redirect return.
    const res = await fetch("https://api.paymongo.com/v1/checkout_sessions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(key + ":").toString("base64")}`,
      },
      body: JSON.stringify({
        data: {
          attributes: {
            line_items: [
              { name: "HanapGawa wallet top-up", amount: amountCents, currency: "PHP", quantity: 1 },
            ],
            payment_method_types: ["gcash", "paymaya", "card"],
            metadata: { userId },
            description: "Wallet top-up",
          },
        },
      }),
    });
    if (!res.ok) throw new Error(`PayMongo error ${res.status}`);
    const json = (await res.json()) as { data: { attributes: { checkout_url: string } } };
    return { kind: "redirect", checkoutUrl: json.data.attributes.checkout_url };
  }
}

export function paymentProvider(): PaymentProvider {
  return process.env.PAYMENTS_PROVIDER === "paymongo" ? new PayMongoPayments() : new DevPayments();
}
