// Language plumbing shared by server and client components. Keep this file
// free of "use client" — the root layout and other server components call
// these directly, which a client module boundary forbids.

export type Lang = "tl" | "en";

export const LANG_COOKIE = "hg_lang";

export function normalizeLang(v: string | undefined | null): Lang {
  return v === "en" ? "en" : "tl";
}

/** Server-side helper: pick a string pair by an already-resolved lang. */
export function tr(lang: Lang, tl: string, en: string): string {
  return lang === "en" ? en : tl;
}

/** Category display name for the active language (categories carry both). */
export function catName(lang: Lang, c: { name: string; nameTl: string }): string {
  return lang === "en" ? c.name : c.nameTl;
}
