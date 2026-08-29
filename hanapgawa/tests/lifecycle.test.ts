import { describe, expect, it } from "vitest";
import { canTransition, JOB_STATUSES } from "../src/lib/jobs";

describe("job lifecycle state machine", () => {
  it("allows the happy path", () => {
    expect(canTransition("OPEN", "BOOKED")).toBe(true);
    expect(canTransition("BOOKED", "IN_PROGRESS")).toBe(true);
    expect(canTransition("IN_PROGRESS", "DONE_BY_PROVIDER")).toBe(true);
    expect(canTransition("DONE_BY_PROVIDER", "COMPLETED")).toBe(true);
  });

  it("blocks money-relevant shortcuts", () => {
    expect(canTransition("OPEN", "COMPLETED")).toBe(false); // no payout without booking
    expect(canTransition("BOOKED", "COMPLETED")).toBe(false); // no payout without work
    expect(canTransition("COMPLETED", "CANCELLED")).toBe(false); // no refund after payout
    expect(canTransition("CANCELLED", "COMPLETED")).toBe(false);
    expect(canTransition("COMPLETED", "OPEN")).toBe(false);
  });

  it("terminal states go nowhere", () => {
    for (const to of JOB_STATUSES) {
      expect(canTransition("COMPLETED", to)).toBe(false);
      expect(canTransition("CANCELLED", to)).toBe(false);
    }
  });

  it("disputes can resolve either way", () => {
    expect(canTransition("DISPUTED", "COMPLETED")).toBe(true);
    expect(canTransition("DISPUTED", "CANCELLED")).toBe(true);
  });
});
