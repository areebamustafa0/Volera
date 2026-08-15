/**
 * Centralised secret resolution.
 *
 * RULES (enforced, not advisory):
 *   1. There is NO hardcoded fallback for any secret, in any environment.
 *   2. A missing required secret throws — loudly, at point of use.
 *   3. Development may use a random per-process value ONLY for AUTH_SECRET,
 *      and only when explicitly absent. It is never a known constant, so a
 *      leaked source file can never be used to forge tokens.
 */
import crypto from "crypto";

let devEphemeralAuthSecret: string | null = null;

function readRequired(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`${name} is required but is not configured.`);
  }
  return value;
}

/** Signing key for session cookies AND short-lived download tokens. */
export function getAuthSecret(): string {
  const configured = process.env.AUTH_SECRET ?? process.env.JWT_SECRET;

  if (configured) {
    if (configured.length < 32) {
      throw new Error("AUTH_SECRET must be at least 32 characters.");
    }
    return configured;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "AUTH_SECRET is required in production. Refusing to sign tokens with an insecure secret."
    );
  }

  if (!devEphemeralAuthSecret) {
    devEphemeralAuthSecret = crypto.randomBytes(48).toString("hex");
    console.warn(
      "[security] AUTH_SECRET is not set. Using a random per-process development secret. " +
        "Sessions and download links invalidate on restart. Set AUTH_SECRET in .env."
    );
  }
  return devEphemeralAuthSecret;
}

/**
 * Download tokens use a dedicated secret when provided, so rotating download
 * links never invalidates live sessions. Falls back to AUTH_SECRET (still not
 * a hardcoded constant) when a separate key is not configured.
 */
export function getDownloadSigningSecret(): string {
  const dedicated = process.env.DOWNLOAD_SIGNING_SECRET;
  if (dedicated) {
    if (dedicated.length < 32) {
      throw new Error("DOWNLOAD_SIGNING_SECRET must be at least 32 characters.");
    }
    return dedicated;
  }
  return getAuthSecret();
}

export function getStripeSecretKey(): string {
  return readRequired("STRIPE_SECRET_KEY");
}

export function getStripeWebhookSecret(): string {
  return readRequired("STRIPE_WEBHOOK_SECRET");
}

export function getDatabaseUrl(): string {
  return readRequired("DATABASE_URL");
}
