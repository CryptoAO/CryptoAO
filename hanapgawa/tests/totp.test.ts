import { describe, expect, it } from "vitest";
import { base32Decode, base32Encode, generateTotpSecret, hotp, totpCode, verifyTotp } from "../src/lib/totp";

// RFC 6238 Appendix B test vectors (SHA-1): the ASCII secret
// "12345678901234567890" at fixed times. If these pass, every authenticator
// app on earth agrees with us.
const RFC_SECRET = Buffer.from("12345678901234567890", "ascii");
const RFC_SECRET_B32 = base32Encode(RFC_SECRET);
const VECTORS: [number, string][] = [
  [59, "94287082"],
  [1111111109, "07081804"],
  [1111111111, "14050471"],
  [1234567890, "89005924"],
  [2000000000, "69279037"],
  [20000000000, "65353130"],
];

describe("TOTP against the RFC 6238 test vectors", () => {
  it("matches every published SHA-1 vector (last 6 of the 8-digit codes)", () => {
    for (const [t, code8] of VECTORS) {
      expect(totpCode(RFC_SECRET_B32, t * 1000)).toBe(code8.slice(-6));
    }
  });
});

describe("verifyTotp", () => {
  it("accepts the current code", () => {
    expect(verifyTotp(RFC_SECRET_B32, "94287082".slice(-6), 59_000)).toBe(true);
  });

  it("tolerates one step of clock drift in either direction", () => {
    const at = 1111111109 * 1000;
    expect(verifyTotp(RFC_SECRET_B32, totpCode(RFC_SECRET_B32, at - 30_000), at)).toBe(true);
    expect(verifyTotp(RFC_SECRET_B32, totpCode(RFC_SECRET_B32, at + 30_000), at)).toBe(true);
  });

  it("rejects a code from two steps away", () => {
    const at = 1111111109 * 1000;
    expect(verifyTotp(RFC_SECRET_B32, totpCode(RFC_SECRET_B32, at - 90_000), at)).toBe(false);
  });

  it("rejects garbage, short codes, and the empty string", () => {
    for (const bad of ["", "12345", "1234567", "abcdef", "00000o"]) {
      expect(verifyTotp(RFC_SECRET_B32, bad, 59_000)).toBe(false);
    }
  });

  it("accepts a code typed with spaces, as people do from a phone screen", () => {
    expect(verifyTotp(RFC_SECRET_B32, "287 082", 59_000)).toBe(true);
  });
});

describe("base32", () => {
  it("round-trips arbitrary bytes", () => {
    for (const len of [1, 5, 19, 20, 32]) {
      const buf = Buffer.from(Array.from({ length: len }, (_, i) => (i * 37) % 256));
      expect(base32Decode(base32Encode(buf)).equals(buf)).toBe(true);
    }
  });

  it("decodes regardless of case and stray separators", () => {
    const secret = generateTotpSecret();
    const mangled = secret.toLowerCase().match(/.{1,4}/g)!.join(" ");
    expect(base32Decode(mangled).equals(base32Decode(secret))).toBe(true);
  });
});

describe("generateTotpSecret", () => {
  it("is 160 bits — the RFC-recommended size for SHA-1", () => {
    expect(base32Decode(generateTotpSecret()).length).toBe(20);
  });

  it("does not repeat", () => {
    const seen = new Set(Array.from({ length: 100 }, generateTotpSecret));
    expect(seen.size).toBe(100);
  });
});

describe("hotp", () => {
  it("matches the RFC 4226 appendix for the first counters", () => {
    // RFC 4226 Appendix D, 6-digit codes for counters 0..3.
    const expected = ["755224", "287082", "359152", "969429"];
    expected.forEach((code, counter) => {
      expect(hotp(RFC_SECRET, counter)).toBe(code);
    });
  });
});
