"use client";

// Two-language UI: Taglish (default) and English.
//
// Deliberately not a keyed-catalog i18n library. With exactly two locales,
// the cheapest maintainable shape is inline pairs — t("tagalog", "english")
// right where the string lives. No key files to drift out of sync, no
// missing-translation state (both variants are written or the code doesn't
// compile), and reviewers see both languages in the diff.
//
// The choice persists in a cookie so the server can render the correct
// language on first paint — no flash of the wrong locale — and so the
// <html lang> attribute matches what screen readers will hear.

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LANG_COOKIE, type Lang } from "@/lib/i18n-shared";

export { LANG_COOKIE, catName, normalizeLang, tr, type Lang } from "@/lib/i18n-shared";

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: "tl",
  setLang: () => {},
});

export function LangProvider({ initial, children }: { initial: Lang; children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initial);
  const router = useRouter();

  const setLang = useCallback(
    (l: Lang) => {
      setLangState(l);
      document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
      // Server components (layout banner, verify page) re-render with the
      // new cookie; client components already updated via state.
      router.refresh();
    },
    [router],
  );

  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>;
}

export function useLang() {
  return useContext(LangContext);
}

/** t("tagalog", "english") — the everyday hook. */
export function useT() {
  const { lang } = useContext(LangContext);
  return useCallback((tl: string, en: string) => (lang === "en" ? en : tl), [lang]);
}

/** Compact TL/EN segmented switch for the header and footer. */
export function LangToggle({ className = "" }: { className?: string }) {
  const { lang, setLang } = useLang();
  const seg = (l: Lang, label: string) => (
    <button
      type="button"
      onClick={() => setLang(l)}
      aria-pressed={lang === l}
      className={`rounded-md px-2 py-1 text-[11px] font-semibold transition-colors ${
        lang === l ? "bg-white text-brand-800 shadow-sm" : "text-gray-600 hover:text-gray-800"
      }`}
    >
      {label}
    </button>
  );
  return (
    <div className={`inline-flex items-center gap-0.5 rounded-lg bg-stone-100 p-0.5 ${className}`} role="group" aria-label="Language">
      {seg("tl", "TL")}
      {seg("en", "EN")}
    </div>
  );
}
