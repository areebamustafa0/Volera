import { NextResponse } from "next/server";
import { db } from "@/db";
import { wishlists, books, authors, bookFormats } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { csrfGuard } from "@/lib/csrf";
import { z } from "zod";

/** GET — the authenticated user's full wishlist with book + pricing details. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select({
      wishlistId: wishlists.id,
      bookId: books.id,
      title: books.title,
      slug: books.slug,
      coverImage: books.coverImage,
      rating: books.rating,
      reviewCount: books.reviewCount,
      authorName: authors.name,
      addedAt: wishlists.createdAt,
    })
    .from(wishlists)
    .innerJoin(books, eq(wishlists.bookId, books.id))
    .innerJoin(authors, eq(books.authorId, authors.id))
    .where(eq(wishlists.userId, user.id))
    .orderBy(desc(wishlists.createdAt));

  // Fetch formats for the wishlisted books in one query (avoids N+1).
  const bookIds = rows.map((r) => r.bookId);
  const allFormats = bookIds.length ? await db.select().from(bookFormats) : [];
  const formatsByBook = new Map<number, typeof allFormats>();
  for (const f of allFormats) {
    if (!bookIds.includes(f.bookId)) continue;
    formatsByBook.set(f.bookId, [...(formatsByBook.get(f.bookId) ?? []), f]);
  }

  const items = rows.map((r) => ({
    ...r,
    formats: (formatsByBook.get(r.bookId) ?? []).map((f) => ({
      id: f.id,
      format: f.format,
      price: f.price,
      stock: f.stock,
    })),
  }));

  return NextResponse.json({ success: true, items });
}

const toggleSchema = z.object({ bookId: z.number().int().positive() });

/** POST — toggle a book in/out of the wishlist. */
export async function POST(request: Request) {
  const csrf = csrfGuard(request);
  if (csrf) return csrf;

  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: "Sign in to save books" }, { status: 401 });

    const parsed = toggleSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ success: false, error: "Book ID required" }, { status: 400 });

    const [existing] = await db
      .select()
      .from(wishlists)
      .where(and(eq(wishlists.userId, user.id), eq(wishlists.bookId, parsed.data.bookId)))
      .limit(1);

    if (existing) {
      await db.delete(wishlists).where(eq(wishlists.id, existing.id));
      return NextResponse.json({ success: true, action: "removed", wishlisted: false });
    }
    await db.insert(wishlists).values({ userId: user.id, bookId: parsed.data.bookId });
    return NextResponse.json({ success: true, action: "added", wishlisted: true });
  } catch (error) {
    console.error("Wishlist toggle error:", error);
    return NextResponse.json({ success: false, error: "Could not update wishlist" }, { status: 500 });
  }
}

/** DELETE — explicit removal (used by the wishlist page's Remove button). */
export async function DELETE(request: Request) {
  const csrf = csrfGuard(request);
  if (csrf) return csrf;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const parsed = toggleSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ success: false, error: "Book ID required" }, { status: 400 });

  await db.delete(wishlists).where(and(eq(wishlists.userId, user.id), eq(wishlists.bookId, parsed.data.bookId)));
  return NextResponse.json({ success: true });
}
