import { cookies } from "next/headers";
import { cache } from "react";
import jwt from "jsonwebtoken";
import { db } from "@/db";
import { users, loginAttempts } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getAuthSecret } from "@/lib/secrets";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: "CUSTOMER" | "ADMIN";
  emailVerified: boolean;
}

/**
 * Cached per-request: many Server Components on the same page (header,
 * content, footer) call getCurrentUser() independently. `cache()` ensures
 * they share a single DB lookup instead of re-querying per call.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("velora_token")?.value;
    if (!token) return null;

    const decoded = jwt.verify(token, getAuthSecret()) as { id?: string };
    if (!decoded?.id) return null;

    // Always re-read from the DB: role/verification changes take effect
    // immediately and revoked accounts lose access on the next request.
    const [user] = await db.select().from(users).where(eq(users.id, decoded.id)).limit(1);
    if (!user) return null;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as "CUSTOMER" | "ADMIN",
      emailVerified: Boolean(user.emailVerified),
    };
  } catch {
    return null;
  }
});

/** Session tokens carry only an id; all claims are re-read server-side. */
export function signToken(user: { id: string }) {
  return jwt.sign({ id: user.id }, getAuthSecret(), { expiresIn: "7d" });
}

/* ── Progressive brute-force lockout ─────────────────────────────────
 * Tracked per email AND per IP so neither a targeted account attack nor a
 * spray attack succeeds. Lockouts are always temporary (never permanent),
 * which prevents an attacker from denying a real user access indefinitely.
 */
const LOCKOUT_TIERS = [
  { threshold: 5, minutes: 1 },
  { threshold: 8, minutes: 5 },
  { threshold: 12, minutes: 30 },
];
const ATTEMPT_WINDOW_MS = 15 * 60_000;

export async function checkLockout(identifier: string): Promise<{ locked: boolean; retryAfterSeconds: number }> {
  const [row] = await db.select().from(loginAttempts).where(eq(loginAttempts.identifier, identifier)).limit(1);
  if (!row?.lockedUntil) return { locked: false, retryAfterSeconds: 0 };
  const remaining = row.lockedUntil.getTime() - Date.now();
  if (remaining <= 0) return { locked: false, retryAfterSeconds: 0 };
  return { locked: true, retryAfterSeconds: Math.ceil(remaining / 1000) };
}

export async function recordFailedLogin(identifier: string): Promise<void> {
  const [row] = await db.select().from(loginAttempts).where(eq(loginAttempts.identifier, identifier)).limit(1);
  const now = new Date();

  // Reset the counter if the previous attempt is outside the window
  const withinWindow = row && now.getTime() - row.lastAttemptAt.getTime() < ATTEMPT_WINDOW_MS;
  const failedCount = withinWindow ? row.failedCount + 1 : 1;

  const tier = [...LOCKOUT_TIERS].reverse().find((t) => failedCount >= t.threshold);
  const lockedUntil = tier ? new Date(now.getTime() + tier.minutes * 60_000) : null;

  if (row) {
    await db
      .update(loginAttempts)
      .set({ failedCount, lockedUntil, lastAttemptAt: now })
      .where(eq(loginAttempts.id, row.id));
  } else {
    await db.insert(loginAttempts).values({ identifier, failedCount, lockedUntil, lastAttemptAt: now });
  }
}

export async function clearFailedLogins(identifier: string): Promise<void> {
  await db
    .update(loginAttempts)
    .set({ failedCount: 0, lockedUntil: null, lastAttemptAt: new Date() })
    .where(eq(loginAttempts.identifier, identifier));
}

/* ── Authorization helpers ───────────────────────────────────────── */

export async function requireUser(): Promise<SessionUser | null> {
  return getCurrentUser();
}

export async function requireVerifiedUser(): Promise<
  { ok: true; user: SessionUser } | { ok: false; status: number; error: string; code?: string }
> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, status: 401, error: "Authentication required" };
  if (!user.emailVerified) {
    return { ok: false, status: 403, error: "Please verify your email address to continue.", code: "EMAIL_UNVERIFIED" };
  }
  return { ok: true, user };
}

export async function requireAdmin(): Promise<
  { ok: true; user: SessionUser } | { ok: false; status: number; error: string }
> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, status: 401, error: "Authentication required" };
  if (user.role !== "ADMIN") return { ok: false, status: 403, error: "Admin privileges required" };
  return { ok: true, user };
}

export { sql };
