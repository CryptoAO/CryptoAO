import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Nav } from "@/components/nav";
import { DEMO_MODE } from "@/lib/demo";
import { Pwa } from "@/components/pwa";

export const metadata: Metadata = {
  title: "HanapGawa — May kailangan? May kaya!",
  description:
    "Ang marketplace ng serbisyo para sa lahat: labada, linis-bahay, hatid-sundo, padala, personal trainer at iba pa. Ligtas, may escrow, bayad sa app.",
  applicationName: "HanapGawa",
  manifest: "/manifest.webmanifest",
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fil">
      <body className="min-h-screen pb-20 sm:pb-0">
        {DEMO_MODE && (
          <div className="bg-amber-100 px-4 py-2 text-center text-xs text-amber-900">
            🧪 <strong>DEMO</strong> — pansubok lang: peke ang pera, at nagre-reset ang data paminsan-paminsan.
            Subukan: client <strong>09170000006</strong> · provider <strong>09170000002</strong> · admin{" "}
            <strong>09170000001</strong> — password <strong>password123</strong>.
          </div>
        )}
        <Nav />
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        <footer className="mt-12 hidden border-t border-stone-200 bg-white py-8 text-center text-xs text-gray-500 sm:block">
          <p className="font-semibold text-gray-700">HanapGawa</p>
          <p className="mt-1">Ligtas na trabaho, ligtas na bayaran.</p>
          <p className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
            <a href="/safety" className="underline hover:text-brand-800">Safety</a>
            <a href="/terms" className="underline hover:text-brand-800">Terms of Service</a>
            <a href="/privacy" className="underline hover:text-brand-800">Privacy Notice</a>
          </p>
        </footer>
        <Pwa />
      </body>
    </html>
  );
}
