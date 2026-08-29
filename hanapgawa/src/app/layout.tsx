import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { Nav } from "@/components/nav";
import { DEMO_MODE } from "@/lib/demo";
import { Pwa } from "@/components/pwa";
import { LangProvider } from "@/lib/i18n";
import { LANG_COOKIE, normalizeLang, tr } from "@/lib/i18n-shared";
import Link from "next/link";
import { baseUrl } from "@/lib/baseurl";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl()),
  title: "HanapGawa — May kailangan? May kaya!",
  description:
    "Ang marketplace ng serbisyo para sa lahat: labada, linis-bahay, hatid-sundo, padala, personal trainer at iba pa. Ligtas, may escrow, bayad sa app.",
  applicationName: "HanapGawa",
  manifest: "/manifest.webmanifest",
  openGraph: {
    title: "HanapGawa — May kailangan? May kaya!",
    description:
      "Labada, linis-bahay, hatid-sundo, padala at iba pa — ligtas, may escrow, bayad sa app.",
    type: "website",
    siteName: "HanapGawa",
    locale: "fil_PH",
    images: [{ url: "/icons/icon-512.png", width: 512, height: 512, alt: "HanapGawa" }],
  },
  twitter: {
    card: "summary",
    title: "HanapGawa — May kailangan? May kaya!",
    description:
      "Labada, linis-bahay, hatid-sundo, padala at iba pa — ligtas, may escrow, bayad sa app.",
    images: ["/icons/icon-512.png"],
  },
  icons: {
    icon: [
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "HanapGawa",
    statusBarStyle: "default",
  },
  formatDetection: {
    // Off on purpose: iOS auto-linking a masked number (▓▓▓) as a phone number
    // is both broken-looking and works against the off-platform rules.
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f766e",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Language is resolved server-side from the cookie so the first paint is
  // already in the right language — no flash, and <html lang> is truthful.
  const store = await cookies();
  const lang = normalizeLang(store.get(LANG_COOKIE)?.value);
  // Cookie *presence* only — validation happens per-request in the API. This
  // lets the header render Login/Sign up in the server HTML for the 99% of
  // first visits that have no session, instead of a blank corner until JS.
  const maybeAuthed = store.has("hg_session");

  return (
    <html lang={lang === "en" ? "en" : "fil"}>
      <body className="min-h-screen pb-20 sm:pb-0">
        <LangProvider initial={lang}>
          {DEMO_MODE && (
            <div className="border-b border-amber-200 bg-amber-50 px-4 py-1.5 text-center text-xs text-amber-900">
              <strong>DEMO</strong>
              {" — "}
              {tr(lang,
                "pansubok lang: peke ang pera, nagre-reset ang data.",
                "test build: money is fake, data resets.")}{" "}
              <Link href="/login" className="font-semibold underline">
                {tr(lang, "Demo accounts sa Login", "Demo accounts on the Login page")}
              </Link>
            </div>
          )}
          <Nav maybeAuthed={maybeAuthed} />
          <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
          <footer className="mt-12 border-t border-stone-200 bg-white py-8 text-center text-xs text-gray-500">
            <p className="font-semibold text-gray-700">HanapGawa</p>
            <p className="mt-1">{tr(lang, "Ligtas na trabaho, ligtas na bayaran.", "Safe work, safe payments.")}</p>
            <p className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
              <a href="/jobs" className="underline hover:text-brand-800">{tr(lang, "Hanap Trabaho", "Find Work")}</a>
              <a href="/providers" className="underline hover:text-brand-800">{tr(lang, "Mga Provider", "Providers")}</a>
              <a href="/help" className="underline hover:text-brand-800">{tr(lang, "Tulong / FAQ", "Help / FAQ")}</a>
              <a href="/safety" className="underline hover:text-brand-800">Safety</a>
              <a href="/terms" className="underline hover:text-brand-800">Terms</a>
              <a href="/privacy" className="underline hover:text-brand-800">Privacy</a>
            </p>
          </footer>
          <Pwa />
        </LangProvider>
      </body>
    </html>
  );
}
