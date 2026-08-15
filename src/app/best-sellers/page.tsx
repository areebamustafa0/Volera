import React from "react";
import type { Metadata } from "next";
import { db } from "@/db";
import { books, authors, bookFormats } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { BookCard } from "@/components/books/BookCard";
import { getCurrentUser } from "@/lib/auth";
import { getHeaderCounts, getWishlistedIds } from "@/lib/header-data";
import { TrendingUp } from "lucide-react";

export const metadata: Metadata = { title: "Best Sellers" };

export default async function BestSellersPage() {
  const [user, headerCounts, wishlistedIds] = await Promise.all([getCurrentUser(), getHeaderCounts(), getWishlistedIds()]);

  const rows = await db
    .select({
      id: books.id, title: books.title, slug: books.slug, coverImage: books.coverImage,
      rating: books.rating, reviewCount: books.reviewCount, authorName: authors.name,
      minPrice: sql<string>`(select min(bf.price) from book_formats bf where bf.book_id = ${books.id})`.as("min_price"),
      cheapestFormatId: sql<number>`(select bf.id from book_formats bf where bf.book_id = ${books.id} order by bf.price asc limit 1)`,
      cheapestFormat: sql<string>`(select bf.format from book_formats bf where bf.book_id = ${books.id} order by bf.price asc limit 1)`,
      cheapestStock: sql<number>`(select bf.stock - bf.reserved_stock from book_formats bf where bf.book_id = ${books.id} order by bf.price asc limit 1)`,
    })
    .from(books)
    .innerJoin(authors, eq(books.authorId, authors.id))
    .where(eq(books.isBestseller, true))
    .orderBy(desc(books.reviewCount))
    .limit(48);

  return (
    <div className="bg-[#f8f9fc] min-h-screen">
      <Navbar user={user} cartCount={headerCounts.cartCount} wishlistCount={headerCounts.wishlistCount} />
      <main id="main" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-2xl font-bold text-[#0f172a] mb-1 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-[#e07b39]" /> Best Sellers
        </h1>
        <p className="text-[#475569] text-sm mb-8">Our most popular titles, ranked by reader reviews</p>

        {rows.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-16 text-center">
            <p className="text-[#475569]">No best sellers marked yet. Check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
            {rows.map((r) => (
              <BookCard
                key={r.id}
                wishlisted={wishlistedIds.has(r.id)}
                book={{
                  id: r.id, title: r.title, slug: r.slug, coverImage: r.coverImage,
                  rating: r.rating, reviewCount: r.reviewCount, author: { name: r.authorName },
                  formats: r.cheapestFormatId ? [{ id: r.cheapestFormatId, format: r.cheapestFormat, price: r.minPrice ?? "0", stock: r.cheapestStock }] : [],
                }}
              />
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
