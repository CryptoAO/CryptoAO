import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Nav } from "@/components/nav";

export const metadata: Metadata = {
  title: "HanapGawa — May kailangan? May kaya!",
  description:
    "Ang marketplace ng serbisyo para sa lahat: labada, linis-bahay, hatid-sundo, padala, personal trainer at iba pa. Ligtas, may escrow, bayad sa app.",
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
        <Nav />
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
        <footer className="mt-12 hidden border-t border-stone-200 bg-white py-8 text-center text-xs text-gray-500 sm:block">
          <p className="font-semibold text-gray-700">HanapGawa</p>
          <p className="mt-1">Ligtas na trabaho, ligtas na bayaran. · Data Privacy Act (RA 10173) compliant by design.</p>
        </footer>
      </body>
    </html>
  );
}
