import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookChapters } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { verifyEntitlement } from "@/services/download.service";

/**
 * Lazily serves a SINGLE chapter so large books are not shipped to the client
 * in one payload. Entitlement is re-verified on every chapter request — an
 * unauthorized user can never fetch page content by guessing an id.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const bookId = Number(url.searchParams.get("bookId"));
  const chapterNumber = Number(url.searchParams.get("chapter"));

  if (!Number.isInteger(bookId) || !Number.isInteger(chapterNumber)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const entitlement = await verifyEntitlement(user.id, bookId);
  if (!entitlement.ok) {
    return NextResponse.json({ error: entitlement.error }, { status: entitlement.status });
  }

  const [row] = await db
    .select()
    .from(bookChapters)
    .where(and(eq(bookChapters.bookId, bookId), eq(bookChapters.chapterNumber, chapterNumber)))
    .limit(1);

  if (!row) return NextResponse.json({ error: "Chapter not found" }, { status: 404 });

  return NextResponse.json(
    {
      chapter: {
        number: row.chapterNumber,
        title: row.title,
        paragraphs: row.content.split(/\n\n+/).map((p) => p.trim()).filter(Boolean),
        wordCount: row.wordCount,
      },
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
