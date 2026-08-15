import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/db";
import { books, authors, categories, bookFormats } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { getCurrentUser } from "@/lib/auth";
import { getHeaderCounts, getWishlistedIds } from "@/lib/header-data";
import { BookCard } from "@/components/books/BookCard";
import { Search, BookOpen } from "lucide-react";

export const metadata: Metadata = { title: "Search Books" };

interface Props {
  searchParams: Promise<{ q?: string; format?: string; category?: string }>;
}

export default async function SearchPage({ searchParams }: Props) {
  const params = await searchParams;
  const [user, headerCounts, wishlistedIds, allCategories] = await Promise.all([
    getCurrentUser(), getHeaderCounts(), getWishlistedIds(),
    db.select().from(categories),
  ]);
  const q = (params.q || "").trim();
  const formatFilter = params.format || "";
  const categoryFilter = params.category || "";

  let results: {
    id: number; title: string; slug: string; coverImage: string;
    rating: string; reviewCount: number; authorName: string;
    price: string; format: string; formatId: number; stock: number; reservedStock: number;
  }[] = [];

  if (q) {
    const conditions = [
      sql`(${books.title} ILIKE ${`%${q}%`} OR ${authors.name} ILIKE ${`%${q}%`} OR ${books.isbn} ILIKE ${`%${q}%`} OR ${categories.name} ILIKE ${`%${q}%`} OR ${books.description} ILIKE ${`%${q}%`})`,
    ];
    if (formatFilter === "ebook") conditions.push(eq(bookFormats.format, "EBOOK"));
    if (formatFilter === "physical") conditions.push(sql`${bookFormats.format} != 'EBOOK'`);
    if (categoryFilter) {
      const cat = allCategories.find((c) => c.slug === categoryFilter);
      if (cat) conditions.push(eq(books.categoryId, cat.id));
    }

    const raw = await db
      .select({
        id: books.id, title: books.title, slug: books.slug, coverImage: books.coverImage,
        rating: books.rating, reviewCount: books.reviewCount, authorName: authors.name,
        price: bookFormats.price, format: bookFormats.format, formatId: bookFormats.id,
        stock: bookFormats.stock, reservedStock: bookFormats.reservedStock,
      })
      .from(books)
      .innerJoin(authors, eq(books.authorId, authors.id))
      .innerJoin(categories, eq(books.categoryId, categories.id))
      .innerJoin(bookFormats, eq(books.id, bookFormats.bookId))
      .where(and(...(conditions as Parameters<typeof and>)))
      .limit(60);

    const seen = new Map<number, typeof raw[0]>();
    for (const r of raw) {
      const ex = seen.get(r.id);
      if (!ex || (r.format === "EBOOK" && ex.format !== "EBOOK") || Number(r.price) < Number(ex.price))
        seen.set(r.id, r);
    }
    results = [...seen.values()];
  }

  const SUGGESTIONS = ["Fiction", "Business", "Self Development", "Science Fiction", "Technology"];

  return (
    <div className="bg-[#f8f9fc] min-h-screen">
      <Navbar user={user} cartCount={headerCounts.cartCount} wishlistCount={headerCounts.wishlistCount} />

      <main id="main" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="max-w-2xl mb-8">
          <h1 className="text-2xl font-bold text-[#0f172a] mb-4">
            {q ? `Search results for "${q}"` : "Search the catalog"}
          </h1>
          <form method="GET" role="search" className="flex gap-0 rounded-xl border border-[#e2e8f0] overflow-hidden focus-within:border-[#2d5a9e] focus-within:ring-2 focus-within:ring-[#2d5a9e]/20 bg-white transition-all shadow-sm">
            <span className="px-4 flex items-center text-[#94a3b8]">
              <Search className="w-5 h-5" />
            </span>
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search by title, author, or ISBN…"
              className="flex-1 py-3.5 text-sm outline-none bg-transparent text-[#0f172a] placeholder:text-[#94a3b8]"
              autoFocus={!q}
              aria-label="Search by title, author, or ISBN"
            />
            {formatFilter && <input type="hidden" name="format" value={formatFilter} />}
            {categoryFilter && <input type="hidden" name="category" value={categoryFilter} />}
            <button type="submit" className="px-5 bg-[#1e3a5f] text-white font-semibold text-sm hover:bg-[#132644] transition-colors whitespace-nowrap">
              Search
            </button>
          </form>

          {q && (
            <div className="flex flex-wrap gap-2 mt-3">
              {[{ label: "All formats", value: "" }, { label: "📄 PDF only", value: "ebook" }, { label: "📚 Print only", value: "physical" }].map((f) => (
                <Link
                  key={f.value}
                  href={`/search?q=${encodeURIComponent(q)}${f.value ? `&format=${f.value}` : ""}`}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                    formatFilter === f.value ? "bg-[#1e3a5f] text-white border-[#1e3a5f]" : "bg-white border-[#e2e8f0] text-[#475569] hover:border-[#1e3a5f] hover:text-[#1e3a5f]"
                  }`}
                >
                  {f.label}
                </Link>
              ))}
            </div>
          )}
        </div>

        {!q && (
          <div className="bg-white rounded-2xl border border-[#e2e8f0] p-10 text-center">
            <Search className="w-12 h-12 text-[#cbd5e1] mx-auto mb-4" />
            <h2 className="text-lg font-bold text-[#0f172a] mb-2">What are you looking for?</h2>
            <p className="text-[#475569] text-sm mb-6">Search by title, author name, ISBN, or category.</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTIONS.map((s) => (
                <Link key={s} href={`/search?q=${encodeURIComponent(s)}`} className="px-4 py-2 bg-[#f1f4f9] text-[#475569] rounded-full text-sm font-medium hover:bg-[#1e3a5f] hover:text-white transition-colors">
                  {s}
                </Link>
              ))}
            </div>
          </div>
        )}

        {q && results.length === 0 && (
          <div className="bg-white rounded-2xl border border-[#e2e8f0] p-14 text-center">
            <BookOpen className="w-12 h-12 text-[#cbd5e1] mx-auto mb-4" />
            <h2 className="text-lg font-bold text-[#0f172a] mb-1">We couldn&apos;t find any books matching your search.</h2>
            <p className="text-[#475569] text-sm mb-5">Try another title, author, or ISBN — or browse by category.</p>
            <Link href="/shop" className="inline-block bg-[#1e3a5f] text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#132644] transition-colors">
              Browse all books
            </Link>
          </div>
        )}

        {q && results.length > 0 && (
          <>
            <p className="text-sm text-[#94a3b8] mb-5">{results.length} result{results.length !== 1 ? "s" : ""} found</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
              {results.map((r) => (
                <BookCard
                  key={r.id}
                  wishlisted={wishlistedIds.has(r.id)}
                  book={{
                    id: r.id, title: r.title, slug: r.slug, coverImage: r.coverImage,
                    rating: r.rating, reviewCount: r.reviewCount,
                    author: { name: r.authorName },
                    formats: [{ id: r.formatId, format: r.format, price: r.price ?? "0", stock: r.stock - r.reservedStock }],
                  }}
                />
              ))}
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
