"use client";

// Route-level error boundary. Deliberately dependency-free and bilingual:
// if rendering itself is what broke, this page must not depend on context
// providers or data fetches to draw.
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand-700 text-lg font-bold text-white">HG</div>
      <h1 className="mt-6 text-2xl font-bold">May nangyaring mali</h1>
      <p className="mt-1 text-sm text-gray-500">Something went wrong on our side.</p>
      <p className="mt-4 text-sm text-gray-600">
        Hindi ito kasalanan mo. Subukan ulit — kung paulit-ulit, bumalik muna mamaya.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <button onClick={reset} className="rounded-xl bg-brand-700 px-5 py-3 text-sm font-semibold text-white">
          Subukan ulit
        </button>
        <a href="/" className="rounded-xl border border-brand-700 bg-white px-5 py-3 text-sm font-semibold text-brand-800">
          Balik sa home
        </a>
      </div>
    </div>
  );
}
