"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchJson } from "@/lib/client";
import { NotificationBell } from "@/components/notifications";

interface Me {
  user: { id: string; firstName: string; isAdmin: boolean; isProvider: boolean; kycLevel: number } | null;
  balanceCents?: number;
}

export function Nav() {
  const [me, setMe] = useState<Me | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    fetchJson<Me>("/api/me").then(setMe).catch(() => setMe({ user: null }));
  }, [pathname]);

  const tabs = [
    { href: "/jobs", label: "Trabaho", icon: "🔎" },
    { href: "/providers", label: "Providers", icon: "🧰" },
    { href: "/jobs/new", label: "Post", icon: "➕" },
    { href: "/me", label: "Ako", icon: "👤" },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 text-lg font-extrabold text-brand-800">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-700 text-white">HG</span>
            <span className="hidden min-[380px]:inline">HanapGawa</span>
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            <TopLink href="/jobs" active={pathname?.startsWith("/jobs")}>Hanap Trabaho</TopLink>
            <TopLink href="/providers" active={pathname?.startsWith("/providers")}>Mga Provider</TopLink>
            <TopLink href="/safety" active={pathname === "/safety"}>Safety</TopLink>
            {me?.user?.isAdmin && <TopLink href="/admin" active={pathname?.startsWith("/admin")}>Admin</TopLink>}
          </nav>
          <div className="flex items-center gap-2">
            {me?.user ? (
              <>
                <NotificationBell />
                <Link href="/me" className="rounded-xl bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-800">
                  Hi, {me.user.firstName} 👋
                </Link>
              </>
            ) : me ? (
              <>
                <Link href="/login" className="whitespace-nowrap px-2 py-2 text-xs font-semibold text-brand-800 sm:px-3 sm:text-sm">Login</Link>
                <Link
                  href="/register"
                  className="whitespace-nowrap rounded-xl bg-brand-700 px-3 py-2 text-xs font-semibold text-white sm:px-4 sm:text-sm"
                >
                  <span className="min-[400px]:hidden">Sign up</span>
                  <span className="hidden min-[400px]:inline">Sign up — libre!</span>
                </Link>
              </>
            ) : null}
          </div>
        </div>
      </header>

      {/* Bottom tab bar on mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white sm:hidden">
        <div className="grid grid-cols-4">
          {tabs.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold ${
                pathname === t.href ? "text-brand-700" : "text-gray-500"
              }`}
            >
              <span className="text-xl">{t.icon}</span>
              {t.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}

function TopLink({ href, active, children }: { href: string; active?: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`rounded-lg px-3 py-2 text-sm font-semibold ${active ? "bg-brand-50 text-brand-800" : "text-gray-600 hover:text-brand-800"}`}
    >
      {children}
    </Link>
  );
}
