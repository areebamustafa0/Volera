"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

/**
 * Route-level error boundary. Reports to the monitoring pipeline and shows a
 * calm, on-brand recovery screen. Never leaks stack traces to the customer.
 */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    fetch("/api/monitoring/client-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: error.message,
        digest: error.digest,
        path: typeof window !== "undefined" ? window.location.pathname : undefined,
      }),
    }).catch(() => undefined);
  }, [error]);

  return (
    <div className="min-h-[70vh] bg-[#F7F3EC] flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <AlertTriangle className="w-10 h-10 text-[#A88A55] mx-auto mb-5" strokeWidth={1.5} />
        <h1 className="font-serif text-3xl mb-3 text-[#171513]">Something went wrong</h1>
        <p className="text-sm text-[#171513]/70 mb-8">
          A page in the library failed to load. Our team has been notified. Nothing in your bag or
          your library has been affected.
        </p>
        {error.digest && (
          <p className="text-[11px] text-[#171513]/40 mb-6 font-mono">Reference: {error.digest}</p>
        )}
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 bg-[#171513] text-[#F7F3EC] px-6 py-3 rounded-xl text-sm font-semibold hover:bg-[#C8A96B] hover:text-[#171513] transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Try again
          </button>
          <Link
            href="/"
            className="border border-[#171513]/25 px-6 py-3 rounded-xl text-sm font-semibold hover:border-[#171513] transition-colors"
          >
            Return home
          </Link>
        </div>
      </div>
    </div>
  );
}
