"use client";

import { useEffect } from "react";

/** Last-resort boundary: catches failures in the root layout itself. */
export default function GlobalError({
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
      body: JSON.stringify({ message: error.message, digest: error.digest, fatal: true }),
    }).catch(() => undefined);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          backgroundColor: "#F7F3EC",
          color: "#171513",
          fontFamily: "Georgia, serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          margin: 0,
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 420 }}>
          <div style={{ letterSpacing: "0.3em", fontSize: 20, marginBottom: 4 }}>VELORA</div>
          <div style={{ letterSpacing: "0.4em", fontSize: 9, color: "#A88A55", marginBottom: 28 }}>
            BOOKS
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 400, marginBottom: 12 }}>
            The library is briefly closed
          </h1>
          <p style={{ fontSize: 14, opacity: 0.7, marginBottom: 28, lineHeight: 1.7 }}>
            An unexpected error interrupted the page. Please try again in a moment.
          </p>
          <button
            onClick={reset}
            style={{
              background: "#171513",
              color: "#F7F3EC",
              border: 0,
              padding: "12px 24px",
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
