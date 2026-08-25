// TOTP (RFC 6238) two-factor codes, implemented directly on node:crypto.
//
// Why hand-rolled rather than a package: the algorithm is forty lines of
// HMAC, this is an auth-critical path where a supply-chain compromise would
// be catastrophic, and the RFC ships test vectors that pin the
// implementation harder than any library changelog. SHA-1 is what every
// authenticator app speaks; its known weaknesses (collisions) do not apply
// to HMAC used this way.

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(s: string): Buffer {
  const clean = s.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    value = (value << 5) | BASE32.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export const TOTP_STEP_SECONDS = 30;
export const TOTP_DIGITS = 6;

/** HOTP (RFC 4226): HMAC-SHA1 + dynamic truncation. */
export function hotp(secret: Buffer, counter: number): string {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const mac = createHmac("sha1", secret).update(msg).digest();
  const offset = mac[mac.length - 1] & 0x0f;
  const code =
    ((mac[offset] & 0x7f) << 24) | (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3];
  return String(code % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, "0");
}

export function totpCode(secretBase32: string, atMs = Date.now()): string {
  const counter = Math.floor(atMs / 1000 / TOTP_STEP_SECONDS);
  return hotp(base32Decode(secretBase32), counter);
}

/**
 * Accepts the current step and one either side — phone clocks drift, and a
 * code typed at second 29 should not fail at second 31. Comparison is
 * timing-safe even though a 6-digit space is brute-forced by rate limiting,
 * not by comparison timing; belt and braces cost one line.
 */
export function verifyTotp(secretBase32: string, code: string, atMs = Date.now()): boolean {
  const cleaned = code.replace(/\D/g, "");
  if (cleaned.length !== TOTP_DIGITS) return false;
  const secret = base32Decode(secretBase32);
  const counter = Math.floor(atMs / 1000 / TOTP_STEP_SECONDS);
  const presented = Buffer.from(cleaned);
  for (const delta of [-1, 0, 1]) {
    const expected = Buffer.from(hotp(secret, counter + delta));
    if (expected.length === presented.length && timingSafeEqual(expected, presented)) return true;
  }
  return false;
}

/** 160-bit secret, the RFC's recommended size for SHA-1. */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

export function otpauthUri(secretBase32: string, accountLabel: string): string {
  const label = encodeURIComponent(`HanapGawa:${accountLabel}`);
  return `otpauth://totp/${label}?secret=${secretBase32}&issuer=HanapGawa&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_STEP_SECONDS}`;
}
