"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { fetchJson } from "@/lib/client";
import { NotificationBell } from "@/components/notifications";
import { LangToggle, useT } from "@/lib/i18n";
import { IconPlusCircle, IconSearch, IconUser, IconUsers } from "@/components/icons";

interface Me {
  user: { id: string; firstName: string; isAdmin: boolean; isProvider: boolean; kycLevel: number } | null;
  balanceCents?: number;
}

export function Nav({ maybeAuthed = true }: { maybeAuthed?: boolean }) {
  // With no session cookie, start in the logged-out state so Login/Sign up
  // are in the server-rendered HTML; with a cookie, stay unknown (null)
  // until /api/me answers, avoiding a Login flash for signed-in users.
  const [me, setMe] = useState<Me | null>(maybeAuthed ? null : { user: null });
  const pathname = usePathname();
  const t = useT();

  useEffect(() => {
    fetchJson<Me>("/api/me").then(setMe).catch(() => setMe({ user: null }));
  }, [pathname]);

  const tabs = [
    { href: "/jobs", label: t("Trabaho", "Jobs"), Icon: IconSearch },
    { href: "/providers", label: t("Providers", "Providers"), Icon: IconUsers },
    { href: "/jobs/new", label: t("Post", "Post"), Icon: IconPlusCircle },
    { href: "/me", label: t("Ako", "Me"), Icon: IconUser },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold text-brand-800">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-700 text-sm font-bold text-white">HG</span>
            <span className="hidden min-[380px]:inline">HanapGawa</span>
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            <TopLink href="/jobs" active={pathname?.startsWith("/jobs")}>{t("Hanap Trabaho", "Find Work")}</TopLink>
            <TopLink href="/providers" active={pathname?.startsWith("/providers")}>{t("Mga Provider", "Providers")}</TopLink>
            <TopLink href="/safety" active={pathname === "/safety"}>Safety</TopLink>
            {me?.user?.isAdmin && <TopLink href="/admin" active={pathname?.startsWith("/admin")}>Admin</TopLink>}
          </nav>
          <div className="flex items-center gap-2">
            <LangToggle className="hidden min-[340px]:inline-flex" />
            {me?.user ? (
              <>
                <NotificationBell />
                <Link href="/me" className="max-w-32 truncate rounded-xl bg-brand-50 px-3 py-2 text-sm font-semibold text-brand-800">
                  {me.user.firstName}
                </Link>
              </>
            ) : me ? (
              <>
                <Link href="/login" className="whitespace-nowrap px-2 py-2 text-xs font-semibold text-brand-800 sm:px-3 sm:text-sm">Login</Link>
                <Link
                  href="/register"
                  className="whitespace-nowrap rounded-xl bg-brand-700 px-3 py-2 text-xs font-semibold text-white sm:px-4 sm:text-sm"
                >
                  Sign up
                </Link>
              </>
            ) : null}
          </div>
        </div>
      </header>

      {/* Bottom tab bar on mobile */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white sm:hidden">
        <div className="grid grid-cols-4">
          {tabs.map(({ href, label, Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`flex flex-col items-center gap-1 py-2 text-[11px] font-semibold ${
                  active ? "text-brand-700" : "text-gray-500"
                }`}
              >
                <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
                {label}
              </Link>
            );
          })}
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
