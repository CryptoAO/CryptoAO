import { describe, expect, it } from "vitest";
import { normalizePhPhone } from "../src/lib/sms";

describe("normalizePhPhone", () => {
  it("normalizes all common PH formats to E.164", () => {
    expect(normalizePhPhone("09171234567")).toBe("+639171234567");
    expect(normalizePhPhone("+639171234567")).toBe("+639171234567");
    expect(normalizePhPhone("639171234567")).toBe("+639171234567");
    expect(normalizePhPhone("0917 123 4567")).toBe("+639171234567");
    expect(normalizePhPhone("0917-123-4567")).toBe("+639171234567");
  });
  it("rejects non-PH and malformed numbers", () => {
    expect(normalizePhPhone("12345")).toBeNull();
    expect(normalizePhPhone("0817-123-4567")).toBeNull(); // landline-ish
    expect(normalizePhPhone("+14155551234")).toBeNull();
    expect(normalizePhPhone("")).toBeNull();
  });
});
