/**
 * Lightweight error telemetry. When SENTRY_DSN is configured, structured error
 * envelopes are forwarded to Sentry's store endpoint; otherwise they are logged
 * server-side with sensitive fields stripped. Swap for @sentry/nextjs when full
 * release tracking / source maps are required.
 */

function sanitize(value: unknown): string {
  try {
    const str = typeof value === "string" ? value : JSON.stringify(value);
    return str
      .replace(/(password|token|secret|authorization|card|cvc)[":\s=]*[^\s,"']+/gi, "$1=[REDACTED]")
      .slice(0, 4000);
  } catch {
    return "[unserializable]";
  }
}

export async function captureException(error: unknown, context?: Record<string, unknown>) {
  const payload = {
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    context: context ? sanitize(context) : undefined,
    timestamp: new Date().toISOString(),
  };

  const dsn = process.env.SENTRY_DSN;
  if (dsn) {
    try {
      // Minimal envelope post; full fidelity comes from the official SDK.
      const url = new URL(dsn);
      const projectId = url.pathname.replace("/", "");
      const endpoint = `${url.protocol}//${url.host}/api/${projectId}/store/?sentry_key=${url.username}&sentry_version=7`;
      await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ level: "error", ...payload }),
      }).catch(() => undefined);
    } catch {
      /* never let telemetry break the request */
    }
  } else {
    console.error("[monitor]", sanitize(payload));
  }
}
