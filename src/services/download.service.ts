import { db } from "@/db";
import { libraries, bookFormats, orders, downloads, users, books } from "@/db/schema";
import { eq, and, gte, sql } from "drizzle-orm";
import jwt from "jsonwebtoken";
import { getDownloadSigningSecret } from "@/lib/secrets";

export const DOWNLOAD_TOKEN_TTL_SECONDS = 300; // 5 minutes
export const MAX_DOWNLOADS_PER_BOOK_PER_DAY = 10;

export interface DownloadTokenPayload {
  sub: string;
  bookId: number;
  formatId: number;
  scope: "ebook-download";
}

/**
 * Full entitlement chain. Used by BOTH the authorization endpoint and the
 * file-serving endpoint, so a signed token can never become a standing
 * authorization bypass — ownership is re-checked when bytes are served.
 */
export async function verifyEntitlement(
  userId: string,
  bookId: number
): Promise<
  | { ok: true; formatId: number; isAdmin: boolean }
  | { ok: false; status: number; error: string }
> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return { ok: false, status: 401, error: "Account no longer exists" };

  const [book] = await db.select({ id: books.id }).from(books).where(eq(books.id, bookId)).limit(1);
  if (!book) return { ok: false, status: 404, error: "Book not found" };

  const rows = await db
    .select({
      formatId: bookFormats.id,
      format: bookFormats.format,
      orderId: libraries.purchaseOrderId,
    })
    .from(libraries)
    .innerJoin(bookFormats, eq(libraries.formatId, bookFormats.id))
    .where(and(eq(libraries.userId, userId), eq(libraries.bookId, bookId)));

  const digital = rows.find((r) => r.format === "EBOOK");

  if (!digital) {
    if (user.role === "ADMIN") {
      // Admins may audit content, but only via a real EBOOK format record.
      const [fmt] = await db
        .select({ id: bookFormats.id })
        .from(bookFormats)
        .where(and(eq(bookFormats.bookId, bookId), eq(bookFormats.format, "EBOOK")))
        .limit(1);
      if (!fmt) return { ok: false, status: 404, error: "No digital edition exists for this title" };
      return { ok: true, formatId: fmt.id, isAdmin: true };
    }
    return { ok: false, status: 403, error: "This title is not in your digital library" };
  }

  if (user.role !== "ADMIN") {
    if (!digital.orderId) {
      return { ok: false, status: 403, error: "Entitlement has no associated purchase" };
    }
    const [order] = await db
      .select({ status: orders.status })
      .from(orders)
      .where(eq(orders.id, digital.orderId))
      .limit(1);
    if (!order || order.status !== "PAID") {
      return { ok: false, status: 403, error: "Purchase is not in a fulfilled state" };
    }
  }

  return { ok: true, formatId: digital.formatId, isAdmin: user.role === "ADMIN" };
}

/** True download quota (distinct from request rate limiting). */
export async function checkDownloadQuota(
  userId: string,
  bookId: number
): Promise<{ ok: boolean; used: number; limit: number }> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(downloads)
    .where(and(eq(downloads.userId, userId), eq(downloads.bookId, bookId), gte(downloads.createdAt, since)));
  const used = row?.count ?? 0;
  return { ok: used < MAX_DOWNLOADS_PER_BOOK_PER_DAY, used, limit: MAX_DOWNLOADS_PER_BOOK_PER_DAY };
}

export function signDownloadToken(payload: DownloadTokenPayload): string {
  return jwt.sign(payload, getDownloadSigningSecret(), { expiresIn: DOWNLOAD_TOKEN_TTL_SECONDS });
}

export function verifyDownloadToken(token: string): DownloadTokenPayload | null {
  try {
    const decoded = jwt.verify(token, getDownloadSigningSecret()) as DownloadTokenPayload;
    if (decoded.scope !== "ebook-download") return null;
    if (!decoded.sub || !decoded.bookId) return null;
    return decoded;
  } catch {
    return null;
  }
}

export async function recordDownload(userId: string, bookId: number, userAgent?: string | null) {
  await db.insert(downloads).values({
    userId,
    bookId,
    userAgent: userAgent?.slice(0, 300) ?? null,
  });
}
