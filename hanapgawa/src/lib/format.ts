// Pure formatting helpers shared by server and client components. Keep this
// file free of "use client": server components (home page, generateMetadata)
// format pesos and relative times too.

export function timeAgo(iso: string | Date): string {
  const then = typeof iso === "string" ? new Date(iso) : iso;
  const s = Math.floor((Date.now() - then.getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return then.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

export function pesos(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const whole = Math.floor(abs / 100).toLocaleString("en-PH");
  const frac = abs % 100;
  return frac === 0 ? `₱${sign}${whole}` : `₱${sign}${whole}.${String(frac).padStart(2, "0")}`;
}
