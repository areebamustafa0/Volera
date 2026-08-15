import { NextResponse } from "next/server";

/**
 * CSRF defence for cookie-authenticated, state-changing requests.
 *
 * Cookies are SameSite=Lax (blocks cross-site form POSTs), and this adds a
 * second, explicit layer: the request Origin/Referer must match the app's own
 * host. Applied to every mutating handler (POST/PATCH/PUT/DELETE).
 */
const MUTATING = new Set(["POST", "PATCH", "PUT", "DELETE"]);

/**
 * Resolves the externally-visible host. Behind a proxy/load balancer
 * `request.url` reports the internal host, so trust the forwarded headers
 * that the platform sets (falling back to Host, then the request URL).
 */
function expectedHost(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-host");
  if (forwarded) return forwarded.split(",")[0].trim();
  const host = request.headers.get("host");
  if (host) return host.trim();
  return new URL(request.url).host;
}

export function isSameOrigin(request: Request): boolean {
  if (!MUTATING.has(request.method)) return true;

  const targetHost = expectedHost(request);
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  const source = origin ?? referer;
  // Same-origin fetches from our own client always send Origin; server-to-server
  // callers (e.g. Stripe webhooks) are verified by signature instead and must
  // not use this helper.
  if (!source) return false;

  try {
    return new URL(source).host === targetHost;
  } catch {
    return false;
  }
}

/** Returns a 403 response when the request fails the origin check. */
export function csrfGuard(request: Request): NextResponse | null {
  if (isSameOrigin(request)) return null;
  return NextResponse.json({ error: "Cross-origin request rejected" }, { status: 403 });
}
