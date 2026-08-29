import { NextRequest, NextResponse } from "next/server";

// User-supplied files need a stricter policy than the rest of the app. A
// `headers()` entry in next.config.ts cannot express this cleanly (the
// catch-all wins on conflicting keys), so it is set here instead —
// middleware runs last and its headers stick.
//
// Why it matters: identity documents may be PDFs, and a PDF can carry
// JavaScript. `sandbox` plus `default-src 'none'` means that even if a
// malicious file reaches a reviewer's browser it cannot execute, phone home,
// or frame anything. Job evidence photos are images only, but they are just
// as attacker-supplied, so they get the same treatment rather than a
// slightly-weaker one nobody would remember to revisit.
const FILE_PATHS = [
  /^\/api\/admin\/kyc\/[^/]+\/document\/?$/,
  /^\/api\/jobs\/[^/]+\/photos\/[^/]+\/?$/,
  /^\/api\/users\/[^/]+\/photo\/?$/,
];

export function middleware(req: NextRequest) {
  // ?lang=en / ?lang=tl on any page URL persists the choice and redirects to
  // the clean URL — so a shared "English" link actually arrives in English,
  // not just for people who find the toggle.
  const lang = req.nextUrl.searchParams.get("lang");
  if ((lang === "en" || lang === "tl") && !req.nextUrl.pathname.startsWith("/api")) {
    const clean = req.nextUrl.clone();
    clean.searchParams.delete("lang");
    const redirect = NextResponse.redirect(clean);
    redirect.cookies.set("hg_lang", lang, { path: "/", maxAge: 31536000, sameSite: "lax" });
    return redirect;
  }

  const res = NextResponse.next();
  if (FILE_PATHS.some((re) => re.test(req.nextUrl.pathname))) {
    res.headers.set("Content-Security-Policy", "default-src 'none'; img-src 'self'; sandbox");
    res.headers.set("Referrer-Policy", "no-referrer");
    res.headers.set("X-Content-Type-Options", "nosniff");
    res.headers.set("Cache-Control", "no-store, private");
  }
  return res;
}

export const config = {
  matcher: [
    "/api/admin/kyc/:path*/document",
    "/api/jobs/:id/photos/:photoId",
    "/api/users/:id/photo",
    // Pages only (static assets and API excluded) — for the ?lang= redirect.
    "/((?!api|_next|icons|manifest|sw\\.js|favicon).*)",
  ],
};
