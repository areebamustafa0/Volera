import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/db";
import { books, authors, categories, bookFormats } from "@/db/schema";
import { eq, and, exists, sql, SQL } from "drizzle-orm";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { BookCard } from "@/components/books/BookCard";
import { getCurrentUser } from "@/lib/auth";
import { getHeaderCounts, getWishlistedIds } from "@/lib/header-data";
import { SortSelect } from "@/components/shop/SortSelect";
import { MobileFilters } from "@/components/shop/MobileFilters";
import { BookOpen, X } from "lucide-react";

export const metadata: Metadata = { title: "Shop — All Books" };

interface ShopPageProps {
  searchParams: Promise<{
    q?: string; category?: string; format?: string; author?: string;
    maxPrice?: string; minRating?: string; inStock?: string;
    sort?: string; page?: string; featured?: string;
  }>;
}

const PAGE_SIZE = 16;

export default async function ShopPage({ searchParams }: ShopPageProps) {
  const params = await searchParams;
  const [currentUser, headerCounts, wishlistedIds] = await Promise.all([
    getCurrentUser(),
    getHeaderCounts(),
    getWishlistedIds(),
  ]);

  const query = (params.q || "").trim();
  const categorySlug = params.category || "";
  const authorSlug = params.author || "";
  const formatFilter = params.format || "";
  const maxPrice = params.maxPrice ? Number(params.maxPrice) : undefined;
  const minRating = params.minRating ? Number(params.minRating) : undefined;
  const inStockOnly = params.inStock === "true";
  const sortOption = params.sort || "newest";
  const page = Math.max(1, Number(params.page) || 1);

  const [allCategories, allAuthors] = await Promise.all([
    db.select().from(categories).orderBy(categories.name),
    db.select().from(authors).orderBy(authors.name),
  ]);

  const ebookOnly = formatFilter === "ebook";
  const physicalOnly = formatFilter === "physical";

  // Format/price/stock conditions are expressed as an EXISTS against
  // book_formats so books never appear twice regardless of how many
  // formats they carry — this is what allows correct SQL-level pagination.
  const formatConditions: SQL[] = [eq(bookFormats.bookId, books.id)];
  if (ebookOnly) formatConditions.push(eq(bookFormats.format, "EBOOK"));
  if (physicalOnly) formatConditions.push(sql`${bookFormats.format} != 'EBOOK'`);
  if (maxPrice) formatConditions.push(sql`${bookFormats.price}::numeric <= ${maxPrice}`);
  if (inStockOnly) formatConditions.push(sql`(${bookFormats.format} = 'EBOOK' OR (${bookFormats.stock} - ${bookFormats.reservedStock}) > 0)`);

  const conditions: SQL[] = [exists(db.select({ x: sql`1` }).from(bookFormats).where(and(...formatConditions)))];

  if (query) {
    conditions.push(
      sql`(${books.title} ILIKE ${`%${query}%`} OR EXISTS (SELECT 1 FROM authors a WHERE a.id = ${books.authorId} AND a.name ILIKE ${`%${query}%`}) OR ${books.isbn} ILIKE ${`%${query}%`} OR EXISTS (SELECT 1 FROM categories c WHERE c.id = ${books.categoryId} AND c.name ILIKE ${`%${query}%`}) OR ${books.description} ILIKE ${`%${query}%`})`
    );
  }
  if (categorySlug) {
    const cat = allCategories.find((c) => c.slug === categorySlug);
    if (cat) conditions.push(eq(books.categoryId, cat.id));
  }
  if (authorSlug) {
    const auth = allAuthors.find((a) => a.slug === authorSlug);
    if (auth) conditions.push(eq(books.authorId, auth.id));
  }
  if (minRating) conditions.push(sql`${books.rating}::numeric >= ${minRating}`);
  if (params.featured === "true") conditions.push(eq(books.isFeatured, true));

  const where = and(...conditions);

  const orderBy =
    sortOption === "price-asc" ? sql`min_price asc` :
    sortOption === "price-desc" ? sql`min_price desc` :
    sortOption === "rating" ? sql`${books.rating} desc` :
    sortOption === "best-selling" ? sql`${books.isBestseller} desc, ${books.reviewCount} desc` :
    sortOption === "title" ? sql`${books.title} asc` :
    sql`${books.createdAt} desc`;

  const [{ count: total }] = await db.select({ count: sql<number>`count(*)::int` }).from(books).where(where);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const rows = total === 0 ? [] : await db
    .select({
      id: books.id, title: books.title, slug: books.slug, coverImage: books.coverImage,
      rating: books.rating, reviewCount: books.reviewCount, isNewArrival: books.isNewArrival,
      authorName: authors.name,
      minPrice: sql<string>`(select min(bf.price) from book_formats bf where bf.book_id = ${books.id} ${ebookOnly ? sql`and bf.format = 'EBOOK'` : physicalOnly ? sql`and bf.format != 'EBOOK'` : sql``})`.as("min_price"),
      cheapestFormatId: sql<number>`(select bf.id from book_formats bf where bf.book_id = ${books.id} ${ebookOnly ? sql`and bf.format = 'EBOOK'` : physicalOnly ? sql`and bf.format != 'EBOOK'` : sql``} order by bf.price asc limit 1)`,
      cheapestFormat: sql<string>`(select bf.format from book_formats bf where bf.book_id = ${books.id} ${ebookOnly ? sql`and bf.format = 'EBOOK'` : physicalOnly ? sql`and bf.format != 'EBOOK'` : sql``} order by bf.price asc limit 1)`,
      cheapestStock: sql<number>`(select bf.stock - bf.reserved_stock from book_formats bf where bf.book_id = ${books.id} ${ebookOnly ? sql`and bf.format = 'EBOOK'` : physicalOnly ? sql`and bf.format != 'EBOOK'` : sql``} order by bf.price asc limit 1)`,
    })
    .from(books)
    .innerJoin(authors, eq(books.authorId, authors.id))
    .where(where)
    .orderBy(orderBy)
    .limit(PAGE_SIZE)
    .offset((safePage - 1) * PAGE_SIZE);

  const activeFilters: { label: string; removeParam: string }[] = [
    query && { label: `"${query}"`, removeParam: "q" },
    categorySlug && { label: allCategories.find((c) => c.slug === categorySlug)?.name ?? categorySlug, removeParam: "category" },
    authorSlug && { label: allAuthors.find((a) => a.slug === authorSlug)?.name ?? authorSlug, removeParam: "author" },
    ebookOnly && { label: "PDF eBooks", removeParam: "format" },
    physicalOnly && { label: "Print Books", removeParam: "format" },
    maxPrice && { label: `Under $${maxPrice}`, removeParam: "maxPrice" },
    minRating && { label: `${minRating}★ & up`, removeParam: "minRating" },
    inStockOnly && { label: "In stock only", removeParam: "inStock" },
  ].filter(Boolean) as { label: string; removeParam: string }[];

  const buildUrl = (overrides: Record<string, string | undefined>) => {
    const p = new URLSearchParams();
    const merged = { q: query, category: categorySlug, author: authorSlug, format: formatFilter, maxPrice: params.maxPrice, minRating: params.minRating, inStock: params.inStock, sort: sortOption, ...overrides };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, v);
    return `/shop?${p.toString()}`;
  };

  const filterProps = { allCategories, allAuthors, categorySlug, authorSlug, formatFilter, maxPrice: params.maxPrice, minRating: params.minRating, inStockOnly, query };

  return (
    <div className="bg-[#f8f9fc] min-h-screen">
      <Navbar user={currentUser} cartCount={headerCounts.cartCount} wishlistCount={headerCounts.wishlistCount} />

      <main id="main" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#0f172a]">
            {query ? `Results for "${query}"` :
             ebookOnly ? "PDF eBooks" :
             physicalOnly ? "Print Books" :
             categorySlug ? allCategories.find((c) => c.slug === categorySlug)?.name || "Books" :
             "All Books"}
          </h1>
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className="text-xs text-[#94a3b8]">Filtered by:</span>
              {activeFilters.map((f, i) => (
                <Link
                  key={i}
                  href={buildUrl({ [f.removeParam]: undefined })}
                  className="inline-flex items-center gap-1 text-xs bg-[#1e3a5f]/10 text-[#1e3a5f] px-2.5 py-1 rounded-full font-medium hover:bg-[#1e3a5f]/20 transition-colors"
                >
                  {f.label} <X className="w-3 h-3" />
                </Link>
              ))}
              <Link href="/shop" className="text-xs text-[#dc2626] hover:underline font-medium">Clear all</Link>
            </div>
          )}
          <p className="text-sm text-[#94a3b8] mt-1">{total} book{total !== 1 ? "s" : ""} found</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block">
            <DesktopFilters {...filterProps} buildUrl={buildUrl} />
          </aside>

          <div>
            <div className="flex items-center justify-between gap-3 mb-5">
              <MobileFilters {...filterProps} />
              <div className="ml-auto">
                <SortSelect value={sortOption} />
              </div>
            </div>

            {rows.length === 0 ? (
              <div className="bg-white rounded-xl border border-[#e2e8f0] p-16 text-center">
                <BookOpen className="w-12 h-12 text-[#cbd5e1] mx-auto mb-4" />
                <h3 className="font-bold text-[#0f172a] text-lg mb-1">No books found</h3>
                <p className="text-[#475569] text-sm mb-5">We couldn&apos;t find any books matching your search. Try different keywords or remove filters.</p>
                <Link href="/shop" className="inline-flex items-center gap-2 bg-[#1e3a5f] text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#132644] transition-colors">
                  View all books
                </Link>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {rows.map((row) => (
                    <BookCard
                      key={row.id}
                      wishlisted={wishlistedIds.has(row.id)}
                      book={{
                        id: row.id, title: row.title, slug: row.slug, coverImage: row.coverImage,
                        rating: row.rating, reviewCount: row.reviewCount,
                        author: { name: row.authorName },
                        isNewArrival: row.isNewArrival,
                        formats: row.cheapestFormatId
                          ? [{ id: row.cheapestFormatId, format: row.cheapestFormat, price: row.minPrice ?? "0", stock: row.cheapestStock }]
                          : [],
                      }}
                    />
                  ))}
                </div>

                {totalPages > 1 && (
                  <nav aria-label="Pagination" className="flex items-center justify-center gap-1 mt-10">
                    {safePage > 1 && (
                      <Link href={buildUrl({ page: String(safePage - 1) })} className="w-9 h-9 flex items-center justify-center rounded-lg text-sm font-semibold bg-white border border-[#e2e8f0] text-[#475569] hover:border-[#1e3a5f]">
                        ‹
                      </Link>
                    )}
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i + 1).map((p) => (
                      <Link
                        key={p}
                        href={buildUrl({ page: String(p) })}
                        aria-current={p === safePage ? "page" : undefined}
                        className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-semibold transition-colors ${
                          p === safePage ? "bg-[#1e3a5f] text-white" : "bg-white border border-[#e2e8f0] text-[#475569] hover:border-[#1e3a5f] hover:text-[#1e3a5f]"
                        }`}
                      >
                        {p}
                      </Link>
                    ))}
                    {safePage < totalPages && (
                      <Link href={buildUrl({ page: String(safePage + 1) })} className="w-9 h-9 flex items-center justify-center rounded-lg text-sm font-semibold bg-white border border-[#e2e8f0] text-[#475569] hover:border-[#1e3a5f]">
                        ›
                      </Link>
                    )}
                  </nav>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

interface FilterCommonProps {
  allCategories: { id: number; slug: string; name: string }[];
  allAuthors: { id: number; slug: string; name: string }[];
  categorySlug: string;
  authorSlug: string;
  formatFilter: string;
  maxPrice?: string;
  minRating?: string;
  inStockOnly: boolean;
  query: string;
}

function DesktopFilters({
  allCategories, allAuthors, categorySlug, authorSlug, formatFilter, maxPrice, minRating, inStockOnly,
  buildUrl,
}: FilterCommonProps & { buildUrl: (o: Record<string, string | undefined>) => string }) {
  return (
    <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden sticky top-24 divide-y divide-[#e2e8f0]">
      <div className="px-4 py-3.5">
        <span className="font-semibold text-sm text-[#0f172a]">Filters</span>
      </div>

      <FilterGroup label="Format">
        {[{ label: "All Formats", value: "" }, { label: "📄 PDF eBooks", value: "ebook" }, { label: "📚 Print Books", value: "physical" }].map((f) => (
          <FilterLink key={f.value} href={buildUrl({ format: f.value || undefined, page: undefined })} active={formatFilter === f.value} label={f.label} />
        ))}
      </FilterGroup>

      <FilterGroup label="Category">
        <FilterLink href={buildUrl({ category: undefined, page: undefined })} active={!categorySlug} label="All Categories" />
        {allCategories.map((c) => (
          <FilterLink key={c.id} href={buildUrl({ category: c.slug, page: undefined })} active={categorySlug === c.slug} label={c.name} />
        ))}
      </FilterGroup>

      <FilterGroup label="Author">
        <div className="max-h-44 overflow-y-auto space-y-1">
          <FilterLink href={buildUrl({ author: undefined, page: undefined })} active={!authorSlug} label="All Authors" />
          {allAuthors.map((a) => (
            <FilterLink key={a.id} href={buildUrl({ author: a.slug, page: undefined })} active={authorSlug === a.slug} label={a.name} />
          ))}
        </div>
      </FilterGroup>

      <FilterGroup label="Price">
        {[{ label: "Any Price", value: "" }, { label: "Under $10", value: "10" }, { label: "Under $20", value: "20" }, { label: "Under $30", value: "30" }].map((p) => (
          <FilterLink key={p.value} href={buildUrl({ maxPrice: p.value || undefined, page: undefined })} active={(maxPrice ?? "") === p.value} label={p.label} />
        ))}
      </FilterGroup>

      <FilterGroup label="Rating">
        {[{ label: "Any Rating", value: "" }, { label: "4★ & up", value: "4" }, { label: "3★ & up", value: "3" }].map((r) => (
          <FilterLink key={r.value} href={buildUrl({ minRating: r.value || undefined, page: undefined })} active={(minRating ?? "") === r.value} label={r.label} />
        ))}
      </FilterGroup>

      <div className="px-4 py-4">
        <p className="text-xs uppercase tracking-widest text-[#94a3b8] font-semibold mb-3">Availability</p>
        <Link
          href={buildUrl({ inStock: inStockOnly ? undefined : "true", page: undefined })}
          className="flex items-center gap-2.5 text-sm px-2.5 py-2 rounded-lg text-[#475569] hover:bg-[#f1f4f9]"
        >
          <span className={`w-4 h-4 rounded border flex items-center justify-center ${inStockOnly ? "bg-[#1e3a5f] border-[#1e3a5f]" : "border-[#cbd5e1]"}`}>
            {inStockOnly && <span className="w-2 h-2 bg-white rounded-sm" />}
          </span>
          In stock only
        </Link>
      </div>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-4">
      <p className="text-xs uppercase tracking-widest text-[#94a3b8] font-semibold mb-3">{label}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function FilterLink({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={`block text-sm px-2.5 py-2 rounded-lg transition-colors truncate ${
        active ? "bg-[#1e3a5f] text-white font-semibold" : "text-[#475569] hover:bg-[#f1f4f9]"
      }`}
    >
      {label}
    </Link>
  );
}
