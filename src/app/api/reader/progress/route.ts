import { NextResponse } from "next/server";
import { db } from "@/db";
import { libraries } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";
import { verifyEntitlement } from "@/services/download.service";
import { getBookChapters, computeProgress, toggleBookmark, getLibraryEntry } from "@/services/reader.service";
import { csrfGuard } from "@/lib/csrf";

const progressSchema = z.object({
  bookId: z.number().int().positive(),
  chapterNumber: z.number().int().min(1).max(2000),
  scrollRatio: z.number().min(0).max(1).default(0),
});

const bookmarkSchema = z.object({
  bookId: z.number().int().positive(),
  chapterNumber: z.number().int().min(1).max(2000),
  scrollRatio: z.number().min(0).max(1).default(0),
  action: z.literal("bookmark"),
});

/** PATCH — persist scroll-accurate reading progress (entitlement enforced). */
export async function PATCH(request: Request) {
  const __csrf = csrfGuard(request);
  if (__csrf) return __csrf;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  const body = await request.json().catch(() => null);

  // Bookmark toggle
  const bm = bookmarkSchema.safeParse(body);
  if (bm.success) {
    const ent = await verifyEntitlement(user.id, bm.data.bookId);
    if (!ent.ok) return NextResponse.json({ error: ent.error }, { status: ent.status });
    const result = await toggleBookmark(user.id, bm.data.bookId, bm.data.chapterNumber, bm.data.scrollRatio);
    return NextResponse.json(result);
  }

  const parsed = progressSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid progress payload" }, { status: 400 });

  const ent = await verifyEntitlement(user.id, parsed.data.bookId);
  if (!ent.ok) return NextResponse.json({ error: ent.error }, { status: ent.status });

  const entry = await getLibraryEntry(user.id, parsed.data.bookId);
  if (!entry) return NextResponse.json({ error: "Library entry not found" }, { status: 404 });

  const chapters = await getBookChapters(parsed.data.bookId);
  const percentage = computeProgress(parsed.data.chapterNumber, parsed.data.scrollRatio, chapters.length);

  // Progress is monotonic — never regress a reader's furthest position.
  const nextPercentage = Math.max(percentage, entry.progressPercentage ?? 0);

  await db
    .update(libraries)
    .set({
      progressPercentage: nextPercentage,
      currentChapter: `Chapter ${parsed.data.chapterNumber}`,
      lastReadPosition: parsed.data.scrollRatio.toFixed(4),
      status: nextPercentage >= 99 ? "FINISHED" : "READING",
      updatedAt: new Date(),
    })
    .where(eq(libraries.id, entry.id));

  return NextResponse.json({ success: true, progressPercentage: nextPercentage });
}
