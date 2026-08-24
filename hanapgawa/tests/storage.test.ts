import { describe, expect, it } from "vitest";
import { sniffMime, MAX_DOC_BYTES, ACCEPTED_DOC_MIMES } from "../src/lib/storage";

const pad = (head: number[]) => Buffer.concat([Buffer.from(head), Buffer.alloc(32)]);

describe("sniffMime — identity documents are typed by content, not by claim", () => {
  it("recognizes the formats we accept", () => {
    expect(sniffMime(pad([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffMime(pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
    expect(sniffMime(Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP"), Buffer.alloc(16)]))).toBe(
      "image/webp",
    );
    expect(sniffMime(Buffer.concat([Buffer.from("%PDF-1.7"), Buffer.alloc(16)]))).toBe("application/pdf");
  });

  it("rejects scriptable and executable payloads dressed as images", () => {
    // SVG can carry <script>; HTML can too. Neither may pass.
    expect(sniffMime(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>'))).toBeNull();
    expect(sniffMime(Buffer.from("<!DOCTYPE html><html><body>hi</body></html>"))).toBeNull();
    expect(sniffMime(Buffer.from("#!/bin/sh\nrm -rf /\n"))).toBeNull();
    // ELF binary
    expect(sniffMime(pad([0x7f, 0x45, 0x4c, 0x46]))).toBeNull();
  });

  it("rejects a JPEG-named file whose bytes are not a JPEG", () => {
    expect(sniffMime(Buffer.from("this is just text pretending to be a photo"))).toBeNull();
  });

  it("rejects truncated input rather than guessing", () => {
    expect(sniffMime(Buffer.from([0xff, 0xd8]))).toBeNull();
    expect(sniffMime(Buffer.alloc(0))).toBeNull();
  });

  it("caps uploads at a phone-photo size", () => {
    expect(MAX_DOC_BYTES).toBe(6 * 1024 * 1024);
    expect(ACCEPTED_DOC_MIMES).not.toContain("image/svg+xml");
  });
});
