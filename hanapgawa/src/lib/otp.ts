import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import { db } from "./db";
import { ApiError } from "./api";
import { smsSender } from "./sms";

const OTP_TTL_MS = 5 * 60_000;
const MAX_ATTEMPTS = 5;

export async function issueOtp(phone: string, purpose: "REGISTER" | "LOGIN" | "RESET"): Promise<string> {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const codeHash = await bcrypt.hash(code, 8);
  await db.otpCode.create({
    data: { phone, codeHash, purpose, expiresAt: new Date(Date.now() + OTP_TTL_MS) },
  });
  await smsSender().send(
    phone,
    `HanapGawa code: ${code}. Wag ibigay kahit kanino — hindi kami hihingi nito. Valid for 5 mins.`,
  );
  return code;
}

/**
 * True when the dev SMS adapter is active (no real gateway configured). In
 * that mode OTP routes may echo the code back in the response so a demo or
 * local tester can complete flows without a server console.
 *
 * DELIBERATE TRADE, stated plainly: echoing the code only when one was
 * actually issued gives up the anti-enumeration property — in dev/demo
 * mode only. Production sets SMS_PROVIDER=semaphore, this returns false,
 * and the uniform responses (and their tests) are unchanged.
 */
export function devSmsEcho(): boolean {
  return process.env.SMS_PROVIDER !== "semaphore";
}

export async function verifyOtp(phone: string, purpose: string, code: string): Promise<void> {
  const record = await db.otpCode.findFirst({
    where: { phone, purpose, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!record) throw new ApiError(400, "Code expired — request a new one");

  // Atomic attempt accounting: the conditional increment IS the gate, so
  // concurrent requests can't collectively exceed MAX_ATTEMPTS.
  const claimed = await db.otpCode.updateMany({
    where: {
      id: record.id,
      attempts: { lt: MAX_ATTEMPTS },
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: { attempts: { increment: 1 } },
  });
  if (claimed.count === 0) throw new ApiError(429, "Too many tries — request a new code");

  const okCode = await bcrypt.compare(code, record.codeHash);
  if (!okCode) throw new ApiError(400, "Wrong code, please try again");

  // Consume exactly once — a concurrent correct submission loses.
  const consumed = await db.otpCode.updateMany({
    where: { id: record.id, consumedAt: null },
    data: { consumedAt: new Date() },
  });
  if (consumed.count === 0) throw new ApiError(400, "Code already used — request a new one");
}
