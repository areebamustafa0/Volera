import { db } from "@/db";
import { bookChapters, libraries, readerBookmarks } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";

export interface ReaderChapter {
  number: number;
  title: string;
  paragraphs: string[];
  wordCount: number;
}

/** Lightweight table of contents — no body text, so large books stay cheap. */
export async function getChapterIndex(bookId: number) {
  const rows = await db
    .select({
      number: bookChapters.chapterNumber,
      title: bookChapters.title,
      wordCount: bookChapters.wordCount,
    })
    .from(bookChapters)
    .where(eq(bookChapters.bookId, bookId))
    .orderBy(asc(bookChapters.chapterNumber));
  return rows;
}

/** Fetches a single authorized chapter. */
export async function getChapter(bookId: number, chapterNumber: number): Promise<ReaderChapter | null> {
  const [row] = await db
    .select()
    .from(bookChapters)
    .where(and(eq(bookChapters.bookId, bookId), eq(bookChapters.chapterNumber, chapterNumber)))
    .limit(1);
  if (!row) return null;
  return {
    number: row.chapterNumber,
    title: row.title,
    paragraphs: row.content.split(/\n\n+/).map((p) => p.trim()).filter(Boolean),
    wordCount: row.wordCount,
  };
}

/** Fetches the REAL authorized chapter content for a book. */
export async function getBookChapters(bookId: number): Promise<ReaderChapter[]> {
  const rows = await db
    .select()
    .from(bookChapters)
    .where(eq(bookChapters.bookId, bookId))
    .orderBy(asc(bookChapters.chapterNumber));

  return rows.map((r) => ({
    number: r.chapterNumber,
    title: r.title,
    paragraphs: r.content.split(/\n\n+/).map((p) => p.trim()).filter(Boolean),
    wordCount: r.wordCount,
  }));
}

export async function getLibraryEntry(userId: string, bookId: number) {
  const [entry] = await db
    .select()
    .from(libraries)
    .where(and(eq(libraries.userId, userId), eq(libraries.bookId, bookId)))
    .limit(1);
  return entry ?? null;
}

export async function getBookmarks(userId: string, bookId: number) {
  return db
    .select()
    .from(readerBookmarks)
    .where(and(eq(readerBookmarks.userId, userId), eq(readerBookmarks.bookId, bookId)))
    .orderBy(asc(readerBookmarks.chapterNumber));
}

export async function toggleBookmark(
  userId: string,
  bookId: number,
  chapterNumber: number,
  scrollRatio: number
): Promise<{ bookmarked: boolean }> {
  const [existing] = await db
    .select()
    .from(readerBookmarks)
    .where(
      and(
        eq(readerBookmarks.userId, userId),
        eq(readerBookmarks.bookId, bookId),
        eq(readerBookmarks.chapterNumber, chapterNumber)
      )
    )
    .limit(1);

  if (existing) {
    await db.delete(readerBookmarks).where(eq(readerBookmarks.id, existing.id));
    return { bookmarked: false };
  }

  await db.insert(readerBookmarks).values({
    userId,
    bookId,
    chapterNumber,
    scrollRatio: scrollRatio.toFixed(4),
  });
  return { bookmarked: true };
}

export { computeProgress } from "@/lib/reading-progress";
