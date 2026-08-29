import Link from "next/link";

// Bilingual on purpose rather than cookie-aware: a 404 must stay statically
// renderable and work for a visitor with no cookie at all.
export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-700 text-lg font-bold text-white">HG</div>
      <h1 className="mt-6 text-2xl font-bold">Hindi namin mahanap ang pahinang iyan</h1>
      <p className="mt-1 text-sm text-gray-500">We can&apos;t find that page.</p>
      <p className="mt-4 text-sm text-gray-600">
        Baka nabura na ito, napalitan ang link, o mali ang pagkaka-type.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link href="/" className="rounded-xl bg-brand-700 px-5 py-3 text-sm font-semibold text-white">
          Balik sa home
        </Link>
        <Link href="/jobs" className="rounded-xl border border-brand-700 bg-white px-5 py-3 text-sm font-semibold text-brand-800">
          Hanap Trabaho
        </Link>
      </div>
    </div>
  );
}
