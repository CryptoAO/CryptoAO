import { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { IconCheck } from "@/components/icons";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-stone-200 bg-white p-4 shadow-sm ${className}`}>{children}</div>;
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  full?: boolean;
};

export function Button({ variant = "primary", full, className = "", ...props }: BtnProps) {
  const styles = {
    primary: "bg-brand-700 text-white hover:bg-brand-800 disabled:bg-stone-300",
    secondary: "bg-white text-brand-800 border border-brand-700 hover:bg-brand-50 disabled:text-stone-400 disabled:border-stone-300",
    danger: "bg-red-600 text-white hover:bg-red-700 disabled:bg-stone-300",
    ghost: "bg-transparent text-brand-800 hover:bg-brand-50",
  }[variant];
  return (
    <button
      className={`min-h-12 rounded-xl px-5 py-3 text-base font-semibold transition-colors disabled:cursor-not-allowed ${styles} ${full ? "w-full" : ""} ${className}`}
      {...props}
    />
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-gray-800">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-gray-500">{hint}</span>}
    </label>
  );
}

const inputClass =
  "w-full min-h-12 rounded-xl border border-stone-300 bg-white px-4 py-3 text-base focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-200";

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={inputClass} {...props} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={inputClass} {...props} />;
}

export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${inputClass} min-h-28`} {...props} />;
}

/** Round a datetime-local value ("YYYY-MM-DDTHH:MM") to the nearest 15 minutes. */
export function snap15(v: string): string {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2})/.exec(v);
  if (!m) return v;
  const total = Number(m[2]) * 60 + Number(m[3]);
  const snapped = Math.min(Math.round(total / 15) * 15, 23 * 60 + 45);
  const hh = String(Math.floor(snapped / 60)).padStart(2, "0");
  const mm = String(snapped % 60).padStart(2, "0");
  return `${m[1]}T${hh}:${mm}`;
}

/**
 * Date-and-time picker constrained to 15-minute steps. Nobody books a
 * labandera for 3:07 PM — free-minute precision only adds typing and
 * mismatched expectations. step=900 nudges native pickers; snapping on
 * change and blur catches manually typed minutes.
 */
export function DateTimeInput({
  value,
  onChange,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "step"> & {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      type="datetime-local"
      step={900}
      className={inputClass}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={(e) => onChange(snap15(e.target.value))}
      {...props}
    />
  );
}

const TIME_STEP_MIN = 15;

function fmtTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, "0")} ${ampm}`;
}

/** Time-of-day select in 15-minute steps, value in minutes since midnight. */
export function TimeSelect({
  valueMin,
  onChange,
  fromMin = 5 * 60,
  toMin = 22 * 60,
  ...props
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange"> & {
  valueMin: number;
  onChange: (min: number) => void;
  fromMin?: number;
  toMin?: number;
}) {
  const options: number[] = [];
  for (let m = fromMin; m <= toMin; m += TIME_STEP_MIN) options.push(m);
  // A stored value outside the visible window (legacy data) must not be
  // silently re-written by the select — include it so it round-trips.
  if (!options.includes(valueMin)) options.push(valueMin);
  options.sort((a, b) => a - b);
  return (
    <select className={inputClass} value={valueMin} onChange={(e) => onChange(Number(e.target.value))} {...props}>
      {options.map((m) => (
        <option key={m} value={m}>{fmtTime(m)}</option>
      ))}
    </select>
  );
}

export function Badge({ children, tone = "gray" }: { children: ReactNode; tone?: "gray" | "green" | "amber" | "red" | "brand" }) {
  const tones = {
    gray: "bg-stone-100 text-stone-700",
    green: "bg-emerald-100 text-emerald-800",
    amber: "bg-amber-100 text-amber-800",
    red: "bg-red-100 text-red-700",
    brand: "bg-brand-100 text-brand-800",
  }[tone];
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones}`}>{children}</span>;
}

export function KycBadge({ level }: { level: number }) {
  if (level >= 3) return <Badge tone="green"><IconCheck size={12} strokeWidth={3} /> Fully Vetted</Badge>;
  if (level >= 2) return <Badge tone="brand"><IconCheck size={12} strokeWidth={3} /> ID Verified</Badge>;
  if (level >= 1) return <Badge tone="gray"><IconCheck size={12} strokeWidth={3} /> Phone Verified</Badge>;
  return <Badge tone="amber">Unverified</Badge>;
}

export function Spinner() {
  return (
    <div className="flex justify-center py-8">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand-700" />
    </div>
  );
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null;
  return <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{message}</div>;
}

export function Stars({ value, emptyLabel = "No ratings yet" }: { value: number | null; emptyLabel?: string }) {
  if (value == null) return <span className="text-xs text-gray-400">{emptyLabel}</span>;
  return (
    <span className="text-sm font-semibold text-amber-500">
      {"★".repeat(Math.round(value))}
      <span className="text-stone-300">{"★".repeat(5 - Math.round(value))}</span>
      <span className="ml-1 text-gray-600">{value.toFixed(1)}</span>
    </span>
  );
}
