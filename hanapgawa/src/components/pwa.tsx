"use client";

import { useEffect, useState } from "react";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "hg.install.dismissed";

/**
 * Registers the service worker and offers "Add to Home screen".
 *
 * Most of our users are on prepaid data with a budget Android. An installed
 * PWA opens straight from the home screen with no browser chrome, which is
 * the difference between "a website I visited once" and "the app I check for
 * work every morning" — so the prompt is worth the small bit of UI, but it
 * stays dismissible and stays dismissed.
 */
export function Pwa() {
  const [deferred, setDeferred] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      // Registering after load keeps the SW off the critical path on a slow
      // connection — the first paint should never wait on it.
      const register = () => navigator.serviceWorker.register("/sw.js").catch(() => {});
      if (document.readyState === "complete") register();
      else window.addEventListener("load", register, { once: true });
    }

    const onPrompt = (e: Event) => {
      e.preventDefault(); // keep the mini-infobar out of the way; we ask in-app
      try {
        if (localStorage.getItem(DISMISS_KEY)) return;
      } catch {
        /* private mode — just show it */
      }
      setDeferred(e as InstallPromptEvent);
    };
    const onInstalled = () => setDeferred(null);

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!deferred) return null;

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
    setDeferred(null);
  }

  async function install() {
    const e = deferred;
    if (!e) return;
    setDeferred(null);
    await e.prompt();
    const { outcome } = await e.userChoice;
    if (outcome === "dismissed") {
      try {
        localStorage.setItem(DISMISS_KEY, "1");
      } catch {
        /* ignore */
      }
    }
  }

  return (
    <div className="fixed inset-x-3 bottom-20 z-40 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-80">
      <div className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-3 shadow-lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" width={40} height={40} className="h-10 w-10 rounded-xl" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-900">I-install ang HanapGawa</p>
          <p className="text-xs text-gray-600">Mabilis buksan, parang app. Walang download sa Play Store.</p>
        </div>
        <div className="flex shrink-0 flex-col gap-1">
          <button
            onClick={install}
            className="rounded-lg bg-brand-700 px-3 py-2 text-xs font-semibold text-white"
          >
            I-install
          </button>
          <button onClick={dismiss} className="px-3 py-1 text-xs font-semibold text-gray-500">
            Hindi muna
          </button>
        </div>
      </div>
    </div>
  );
}
