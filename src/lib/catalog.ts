import { db } from "@/db";
import { books, authors, categories, bookFormats, collections } from "@/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";

/** Shape consumed by <BookCard />. */
export interface CatalogBook {
  id: number;
  title: string;
  slug: string;
  coverImage: string;
  rating: string;
  reviewCount: number;
  author: { name: string };
  categoryName: string;
  formats: { id: number; format: string; price: string }[];
}

type Filter = "new" | "bestseller" | "featured" | "all";

/**
 * Single source of truth for catalog reads, so every listing page renders
 * consistent data with one query pattern (no N+1 across pages).
 */
export async function getBooks(
  options: { filter?: Filter; collectionSlug?: string; limit?: number } = {}
): Promise<CatalogBook[]> {
  const { filter = "all", collectionSlug, limit = 24 } = options;

  const conditions = [];
  if (filter === "new") conditions.push(eq(books.isNewArrival, true));
  if (filter === "bestseller") conditions.push(eq(books.isBestseller, true));
  if (filter === "featured") conditions.push(eq(books.isFeatured, true));

  if (collectionSlug) {
    const [col] = await db
      .select({ id: collections.id })
      .from(collections)
      .where(eq(collections.slug, collectionSlug))
      .limit(1);
    if (!col) return [];
    conditions.push(eq(books.collectionId, col.id));
  }

  const rows = await db
    .select({
      id: books.id,
      title: books.title,
      slug: books.slug,
      coverImage: books.coverImage,
      rating: books.rating,
      reviewCount: books.reviewCount,
      authorName: authors.name,
      categoryName: categories.name,
    })
    .from(books)
    .innerJoin(authors, eq(books.authorId, authors.id))
    .innerJoin(categories, eq(books.categoryId, categories.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(books.reviewCount))
    .limit(limit);

  if (rows.length === 0) return [];

  const formats = await db.select().from(bookFormats);

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    slug: r.slug,
    coverImage: r.coverImage,
    rating: String(r.rating),
    reviewCount: r.reviewCount,
    author: { name: r.authorName },
    categoryName: r.categoryName,
    formats: formats
      .filter((f) => f.bookId === r.id)
      .map((f) => ({ id: f.id, format: f.format, price: f.price })),
  }));
}

export async function getCollections() {
  return db
    .select({
      id: collections.id,
      title: collections.title,
      slug: collections.slug,
      description: collections.description,
      image: collections.image,
      bookCount: sql<number>`(select count(*) from books where books.collection_id = ${collections.id})`,
    })
    .from(collections)
    .orderBy(collections.id);
}

export async function getCollectionBySlug(slug: string) {
  const [col] = await db.select().from(collections).where(eq(collections.slug, slug)).limit(1);
  return col ?? null;
}

export function lowestPrice(book: CatalogBook): number {
  return book.formats.length ? Math.min(...book.formats.map((f) => Number(f.price))) : 0;
}
