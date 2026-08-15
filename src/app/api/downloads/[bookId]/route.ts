import { NextResponse } from "next/server";
import { db } from "@/db";
import { books } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import {
  verifyEntitlement,
  checkDownloadQuota,
  signDownloadToken,
  DOWNLOAD_TOKEN_TTL_SECONDS,
} from "@/services/download.service";

/**
 * Issues a short-lived signed download URL.
 *   authenticate → verify EBOOK entitlement on a PAID order
 *   → enforce daily download quota → sign 5-minute token.
 * The file bytes are served by /api/downloads/file, which re-verifies
 * entitlement independently.
 */
export async function GET(request: Request, { params }: { params: Promise<{ bookId: string }> }) {
  const rl = rateLimit(`download:${clientKey(request)}`, 12, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many download requests" },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    );
  }

  const { bookId } = await params;
  const bookIdNum = Number(bookId);
  if (!Number.isInteger(bookIdNum) || bookIdNum <= 0) {
    return NextResponse.json({ error: "Invalid book id" }, { status: 400 });
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  if (!user.emailVerified && user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Please verify your email address to download eBooks.", code: "EMAIL_UNVERIFIED" },
      { status: 403 }
    );
  }

  const entitlement = await verifyEntitlement(user.id, bookIdNum);
  if (!entitlement.ok) {
    return NextResponse.json({ error: entitlement.error }, { status: entitlement.status });
  }

  const quota = await checkDownloadQuota(user.id, bookIdNum);
  if (!quota.ok && !entitlement.isAdmin) {
    return NextResponse.json(
      { error: `Download limit reached (${quota.limit} per day for this title). Please try again tomorrow.` },
      { status: 429 }
    );
  }

  const [book] = await db.select({ title: books.title }).from(books).where(eq(books.id, bookIdNum)).limit(1);

  const token = signDownloadToken({
    sub: user.id,
    bookId: bookIdNum,
    formatId: entitlement.formatId,
    scope: "ebook-download",
  });

  return NextResponse.json({
    success: true,
    downloadUrl: `/api/downloads/file?token=${token}`,
    title: book?.title,
    expiresIn: `${DOWNLOAD_TOKEN_TTL_SECONDS / 60} minutes`,
    downloadsRemaining: Math.max(quota.limit - quota.used, 0),
  });
}
