import { describe, expect, it } from "vitest";
import { maskContacts } from "../src/lib/safety";

describe("maskContacts — anti-disintermediation", () => {
  it("masks plain PH mobile numbers", () => {
    const r = maskContacts("text me 09171234567 na lang");
    expect(r.flagged).toBe(true);
    expect(r.masked).not.toContain("09171234567");
  });

  it("masks +63 format with spaces", () => {
    const r = maskContacts("ito number ko +63 917 123 4567 salamat");
    expect(r.flagged).toBe(true);
    expect(r.masked).not.toContain("917");
  });

  it("masks numbers with dashes and dots", () => {
    for (const s of ["0917-123-4567", "0917.123.4567", "0917 123 45 67"]) {
      const r = maskContacts(`call ${s}`);
      expect(r.flagged).toBe(true);
      expect(r.masked).not.toMatch(/\d{4}/);
    }
  });

  it("masks long digit runs (GCash/bank accounts)", () => {
    const r = maskContacts("gcash ko 2917 123 4567 ha");
    expect(r.flagged).toBe(true);
  });

  it("masks emails including at/dot obfuscation", () => {
    expect(maskContacts("email me juan@gmail.com").flagged).toBe(true);
    expect(maskContacts("juan (at) gmail (dot) com").flagged).toBe(true);
  });

  it("masks messenger links and handles", () => {
    expect(maskContacts("add mo ko https://fb.com/juan.dc").flagged).toBe(true);
    expect(maskContacts("viber: juandc123").flagged).toBe(true);
    expect(maskContacts("t.me/juandc").flagged).toBe(true);
  });

  it("masks spelled-out digits in English and Tagalog", () => {
    expect(maskContacts("zero nine one seven one two three four").flagged).toBe(true);
    expect(maskContacts("sero siyam isa pito isa dalawa tatlo apat").flagged).toBe(true);
  });

  it("flags off-platform hints without rewriting them", () => {
    const r = maskContacts("cash na lang wag na sa app");
    expect(r.flagged).toBe(true);
    expect(r.masked).toBe("cash na lang wag na sa app");
  });

  it("leaves normal messages untouched", () => {
    for (const s of [
      "Kaya ko po ito, sanay ako sa labada",
      "Magkano po budget nyo?",
      "Sige po, bukas 9am tayo",
      "May 2 bags po ako ng damit",
      "₱500 po ang offer ko",
    ]) {
      const r = maskContacts(s);
      expect(r.flagged).toBe(false);
      expect(r.masked).toBe(s);
    }
  });
});
