import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "../src/app/manifest";

const root = path.join(__dirname, "..");
const sw = readFileSync(path.join(root, "public", "sw.js"), "utf8");

describe("web app manifest — Android install criteria", () => {
  const m = manifest();

  it("declares the fields Chrome requires before it will offer an install", () => {
    expect(m.name).toBeTruthy();
    expect(m.short_name).toBeTruthy();
    expect(m.display).toBe("standalone");
    expect(m.start_url).toBeTruthy();
  });

  it("ships both a 192px and a 512px icon", () => {
    const sizes = (m.icons ?? []).map((i) => i.sizes);
    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
  });

  it("ships a maskable icon so Android does not letterbox the launcher icon", () => {
    expect((m.icons ?? []).some((i) => i.purpose === "maskable")).toBe(true);
  });

  it("keeps start_url inside scope, or the app opens in a browser tab instead", () => {
    expect(m.start_url!.startsWith(m.scope!)).toBe(true);
  });

  it("points every icon at a path the app actually serves", () => {
    for (const icon of m.icons ?? []) {
      const file = path.join(root, "public", icon.src);
      expect(() => readFileSync(file), `missing ${icon.src}`).not.toThrow();
    }
  });
});

describe("service worker — must never cache another person's data", () => {
  // Phones are shared in this market. A cached API or page response served to
  // the next person who opens the app would be a breach, so the worker is
  // asserted to stay out of both.
  it("returns early for anything under /api", () => {
    expect(sw).toMatch(/pathname\.startsWith\("\/api\/"\)\s*\)\s*return/);
  });

  it("only ever writes fingerprinted static assets into the cache", () => {
    const puts = sw.match(/\.put\(/g) ?? [];
    expect(puts).toHaveLength(1); // the single cache-first branch for static assets
    const staticBranch = sw.slice(sw.indexOf("if (isStaticAsset(url))"), sw.indexOf('req.mode === "navigate"'));
    expect(staticBranch).toContain(".put(");
  });

  it("serves the offline page from cache but never stores a navigation response", () => {
    const navBranch = sw.slice(sw.indexOf('req.mode === "navigate"'));
    expect(navBranch).toContain("caches.match(OFFLINE_URL)");
    expect(navBranch).not.toContain(".put(");
  });

  it("precaches the offline page it falls back to", () => {
    expect(sw).toMatch(/PRECACHE\s*=\s*\[OFFLINE_URL/);
    expect(() => readFileSync(path.join(root, "public", "offline.html"))).not.toThrow();
  });
});
