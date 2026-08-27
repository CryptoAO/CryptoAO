"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { fetchJson, timeAgo } from "@/lib/client";
import { useT } from "@/lib/i18n";
import { IconAlertTriangle, IconBell, IconCalendar, IconChat, IconCheckCircle, IconMapPin, IconWallet } from "@/components/icons";

interface Notif {
  id: string;
  type: string;
  title: string;
  body: string;
  href?: string | null;
  read: boolean;
  createdAt: string;
}

// Each notification type maps to one of a handful of icon groups — enough
// to scan the list by kind, without an emoji zoo that renders differently
// on every phone.
type Kind = { Icon: (p: { size?: number; className?: string }) => React.ReactElement; cls: string };
const KIND: Record<string, Kind> = {
  money: { Icon: IconWallet, cls: "bg-emerald-100 text-emerald-700" },
  chat: { Icon: IconChat, cls: "bg-brand-100 text-brand-700" },
  alert: { Icon: IconAlertTriangle, cls: "bg-red-100 text-red-700" },
  ok: { Icon: IconCheckCircle, cls: "bg-emerald-100 text-emerald-700" },
  place: { Icon: IconMapPin, cls: "bg-stone-200 text-stone-600" },
  event: { Icon: IconCalendar, cls: "bg-amber-100 text-amber-700" },
  bell: { Icon: IconBell, cls: "bg-stone-200 text-stone-600" },
};
const TYPE_KIND: Record<string, keyof typeof KIND> = {
  OFFER_RECEIVED: "event",
  OFFER_ACCEPTED: "ok",
  OFFER_DECLINED: "bell",
  JOB_STARTED: "event",
  JOB_DONE: "ok",
  JOB_COMPLETED: "money",
  JOB_CANCELLED: "bell",
  MESSAGE: "chat",
  DISPUTE_OPENED: "alert",
  DISPUTE_RESOLVED: "ok",
  KYC_APPROVED: "ok",
  KYC_REJECTED: "alert",
  PAYOUT_PAID: "money",
  PAYOUT_REJECTED: "alert",
  PAYMENT_RECEIVED: "money",
  SOS_RAISED: "alert",
  SOS_RESOLVED: "ok",
  CHECKED_IN: "place",
  CHECKED_OUT: "place",
  JOB_NEARBY: "bell",
  JOB_INVITE: "event",
};

export function NotificationBell() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[] | null>(null);
  const [unread, setUnread] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const d = await fetchJson<{ unread: number; notifications: Notif[] }>("/api/notifications");
      setUnread(d.unread);
      setItems(d.notifications);
    } catch {
      setItems([]); // logged out or offline — bell just stays quiet
    }
  }, []);

  // Poll gently. A real-time channel is overkill at this scale and would
  // cost battery on the budget phones this app targets.
  useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function markAllRead() {
    setUnread(0);
    setItems((prev) => prev?.map((n) => ({ ...n, read: true })) ?? prev);
    await fetchJson("/api/notifications", { method: "POST", body: JSON.stringify({}) }).catch(() => {});
  }

  async function openItem(n: Notif) {
    setOpen(false);
    if (!n.read) {
      setUnread((u) => Math.max(0, u - 1));
      setItems((prev) => prev?.map((x) => (x.id === n.id ? { ...x, read: true } : x)) ?? prev);
      await fetchJson("/api/notifications", { method: "POST", body: JSON.stringify({ ids: [n.id] }) }).catch(() => {});
    }
  }

  if (items === null) return null;

  return (
    <div className="relative" ref={boxRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={unread > 0 ? t(`${unread} bagong abiso`, `${unread} new notifications`) : t("Mga abiso", "Notifications")}
        aria-expanded={open}
        className="relative grid h-10 w-10 place-items-center rounded-xl text-gray-600 hover:bg-brand-50"
      >
        <IconBell size={20} />
        {unread > 0 && (
          <span className="absolute right-0.5 top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[11px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* On phones the bell sits mid-header, so anchoring the panel to it would
          push content off the left edge. Pin to the viewport instead, and only
          anchor to the bell once there is room (sm and up). */}
      {open && (
        <div className="fixed inset-x-3 top-16 z-50 max-h-[70vh] overflow-y-auto rounded-2xl border border-stone-200 bg-white shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-1 sm:w-[22rem]">
          <div className="flex items-center justify-between border-b border-stone-100 px-4 py-2.5">
            <span className="text-sm font-bold">{t("Mga abiso", "Notifications")}</span>
            {unread > 0 && (
              <button onClick={markAllRead} className="text-xs font-semibold text-brand-700 underline">
                {t("Basahin lahat", "Mark all read")}
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-gray-400">{t("Wala pang abiso", "No notifications yet")}</p>
          ) : (
            <ul className="divide-y divide-stone-100">
              {items.map((n) => {
                const kind = KIND[TYPE_KIND[n.type] ?? "bell"];
                const inner = (
                  <div className={`flex gap-3 px-4 py-3 ${n.read ? "" : "bg-brand-50/60"}`}>
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${kind.cls}`}><kind.Icon size={15} /></span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold leading-snug">{n.title}</div>
                      <div className="mt-0.5 text-sm text-gray-600">{n.body}</div>
                      <div className="mt-1 text-[11px] text-gray-400">{timeAgo(n.createdAt)}</div>
                    </div>
                    {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-600" />}
                  </div>
                );
                return (
                  <li key={n.id}>
                    {n.href ? (
                      <Link href={n.href} onClick={() => openItem(n)} className="block hover:bg-stone-50">
                        {inner}
                      </Link>
                    ) : (
                      <button onClick={() => openItem(n)} className="block w-full text-left hover:bg-stone-50">
                        {inner}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
