// SMS adapter. Dev mode logs the OTP to the server console; production uses
// Semaphore (popular PH SMS gateway, ~₱0.50/SMS) — or add another adapter.

export interface SmsSender {
  send(phoneE164: string, message: string): Promise<void>;
}

class DevSms implements SmsSender {
  async send(phone: string, message: string) {
    console.log(`[DEV SMS] to ${phone}: ${message}`);
  }
}

class SemaphoreSms implements SmsSender {
  async send(phone: string, message: string) {
    const apikey = process.env.SEMAPHORE_API_KEY;
    if (!apikey) throw new Error("SEMAPHORE_API_KEY not set");
    const res = await fetch("https://api.semaphore.co/api/v4/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apikey, number: phone, message, sendername: "HANAPGAWA" }),
    });
    if (!res.ok) throw new Error(`SMS send failed: ${res.status}`);
  }
}

export function smsSender(): SmsSender {
  return process.env.SMS_PROVIDER === "semaphore" ? new SemaphoreSms() : new DevSms();
}

/** Normalize PH numbers to +639XXXXXXXXX. Accepts 09..., 639..., +639... */
export function normalizePhPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (/^09\d{9}$/.test(digits)) return `+63${digits.slice(1)}`;
  if (/^639\d{9}$/.test(digits)) return `+${digits}`;
  if (/^9\d{9}$/.test(digits)) return `+63${digits}`;
  return null;
}
