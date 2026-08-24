import { describe, expect, it } from "vitest";
import { scrub, scrubText } from "../src/lib/monitoring";

describe("scrub — error reports must not leak personal data", () => {
  it("redacts PH phone numbers wherever they appear in free text", () => {
    expect(scrubText("failed for 09171234567")).toBe("failed for [phone]");
    expect(scrubText("user +639171234567 timed out")).toBe("user [phone] timed out");
  });

  it("redacts emails", () => {
    expect(scrubText("bounce from juan@example.com")).toBe("bounce from [email]");
  });

  it("redacts sensitive keys by name regardless of value", () => {
    const out = scrub({
      password: "hunter2",
      codeHash: "$2b$08$abc",
      token: "eyJhbGciOi",
      accountRef: "GCASH:09171234567",
      phone: "09171234567",
      addressNote: "Blk 5 Lot 3",
      lat: 14.6,
      lng: 121.0,
      jobId: "abc123",
    }) as Record<string, unknown>;

    expect(out.password).toBe("[redacted]");
    expect(out.codeHash).toBe("[redacted]");
    expect(out.token).toBe("[redacted]");
    expect(out.accountRef).toBe("[redacted]");
    expect(out.phone).toBe("[redacted]");
    expect(out.addressNote).toBe("[redacted]");
    expect(out.lat).toBe("[redacted]");
    expect(out.lng).toBe("[redacted]");
    // Non-sensitive identifiers survive so the report stays useful.
    expect(out.jobId).toBe("abc123");
  });

  it("scrubs nested structures and bounds recursion", () => {
    const out = scrub({ a: { b: { c: { d: { e: { f: "deep" } } } } } }) as Record<string, unknown>;
    expect(JSON.stringify(out)).toContain("[deep]");
  });

  it("redacts a phone hidden inside a nested non-sensitive field", () => {
    const out = scrub({ note: "text me at 09171234567 please" }) as Record<string, string>;
    expect(out.note).toBe("text me at [phone] please");
  });
});
