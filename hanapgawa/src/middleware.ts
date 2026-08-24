import { NextRequest, NextResponse } from "next/server";

// Identity-document responses need a stricter policy than the rest of the
// app. A `headers()` entry in next.config.ts cannot express this cleanly
// (the catch-all wins on conflicting keys), so it is set here instead —
// middleware runs last and its headers stick.
//
// Why it matters: we accept PDFs, and a PDF can carry JavaScript. `sandbox`
// plus `default-src 'none'` means that even if a malicious file reaches an
// admin's browser, it cannot execute, phone home, or frame anything.
const DOC_PATH = /^\/api\/admin\/kyc\/[^/]+\/document\/?$/;

export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  if (DOC_PATH.test(req.nextUrl.pathname)) {
    res.headers.set("Content-Security-Policy", "default-src 'none'; img-src 'self'; sandbox");
    res.headers.set("Referrer-Policy", "no-referrer");
    res.headers.set("X-Content-Type-Options", "nosniff");
    res.headers.set("Cache-Control", "no-store, private");
  }
  return res;
}

export const config = {
  matcher: "/api/admin/kyc/:path*/document",
};
