import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import { db } from "./db";
import { ApiError } from "./api";
import { smsSender } from "./sms";

const OTP_TTL_MS = 5 * 60_000;
const MAX_ATTEMPTS = 5;

export async function issueOtp(phone: string, purpose: "REGISTER" | "LOGIN" | "RESET") {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const codeHash = await bcrypt.hash(code, 8);
  await db.otpCode.create({
    data: { phone, codeHash, purpose, expiresAt: new Date(Date.now() + OTP_TTL_MS) },
  });
  await smsSender().send(
    phone,
    `HanapGawa code: ${code}. Wag ibigay kahit kanino — hindi kami hihingi nito. Valid for 5 mins.`,
  );
}

export async function verifyOtp(phone: string, purpose: string, code: string): Promise<void> {
  const record = await db.otpCode.findFirst({
    where: { phone, purpose, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!record) throw new ApiError(400, "Code expired — request a new one");
  if (record.attempts >= MAX_ATTEMPTS) throw new ApiError(429, "Too many tries — request a new code");
  await db.otpCode.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
  const okCode = await bcrypt.compare(code, record.codeHash);
  if (!okCode) throw new ApiError(400, "Wrong code, please try again");
  await db.otpCode.update({ where: { id: record.id }, data: { consumedAt: new Date() } });
}
