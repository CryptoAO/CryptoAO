import type { Metadata } from "next";
import { cookies } from "next/headers";
import { DEMO_MODE } from "@/lib/demo";
import { LANG_COOKIE, normalizeLang, tr } from "@/lib/i18n-shared";

export const metadata: Metadata = { title: "Login — HanapGawa", robots: { index: false } };

// Demo credentials live here and only here — behind a disclosure, on the one
// page where they are useful. Broadcasting a shared password in a site-wide
// banner trains people to type it; advertising the admin login trains worse.
export default async function LoginLayout({ children }: { children: React.ReactNode }) {
  const lang = normalizeLang((await cookies()).get(LANG_COOKIE)?.value);
  return (
    <>
      {children}
      {DEMO_MODE && (
        <details className="mx-auto mt-4 max-w-md rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <summary className="cursor-pointer font-semibold">
            {tr(lang, "Demo accounts (pansubok lang)", "Demo accounts (testing only)")}
          </summary>
          <div className="mt-2 space-y-1">
            <p>{tr(lang, "Client", "Client")}: <strong>09170000006</strong></p>
            <p>Provider: <strong>09170000002</strong></p>
            <p>Password: <strong>password123</strong></p>
            <p className="text-xs">
              {tr(lang,
                "Peke ang pera at nagre-reset ang data paminsan-paminsan.",
                "Money is fake and data resets from time to time.")}
            </p>
          </div>
        </details>
      )}
    </>
  );
}
