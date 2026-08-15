import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { wishlists, books, authors, bookFormats } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AccountNav } from "@/components/account/AccountNav";
import { BookCard } from "@/components/books/BookCard";
import { getCurrentUser } from "@/lib/auth";
import { getHeaderCounts } from "@/lib/header-data";
import { Heart } from "lucide-react";

export const metadata: Metadata = { title: "My Wishlist" };

export default async function WishlistPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?redirect=/account/wishlist");

  const headerCounts = await getHeaderCounts();

  const rows = await db
    .select({
      bookId: books.id, title: books.title, slug: books.slug, coverImage: books.coverImage,
      rating: books.rating, reviewCount: books.reviewCount, authorName: authors.name,
    })
    .from(wishlists)
    .innerJoin(books, eq(wishlists.bookId, books.id))
    .innerJoin(authors, eq(books.authorId, authors.id))
    .where(eq(wishlists.userId, user.id))
    .orderBy(desc(wishlists.createdAt));

  const bookIds = rows.map((r) => r.bookId);
  const allFormats = bookIds.length ? await db.select().from(bookFormats) : [];
  const formatsByBook = new Map<number, typeof allFormats>();
  for (const f of allFormats) {
    if (!bookIds.includes(f.bookId)) continue;
    formatsByBook.set(f.bookId, [...(formatsByBook.get(f.bookId) ?? []), f]);
  }

  return (
    <div className="bg-[#f8f9fc] min-h-screen">
      <Navbar user={user} cartCount={headerCounts.cartCount} wishlistCount={headerCounts.wishlistCount} />

      <main id="main" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-2xl font-bold text-[#0f172a] mb-6">My Wishlist</h1>

        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <AccountNav />

          <div>
            {rows.length === 0 ? (
              <div className="bg-white rounded-xl border border-[#e2e8f0] p-16 text-center">
                <Heart className="w-14 h-14 text-[#cbd5e1] mx-auto mb-4" />
                <h2 className="text-lg font-bold text-[#0f172a] mb-1">Save books here and come back later.</h2>
                <p className="text-sm text-[#475569] mb-6">Tap the heart on any book to add it to your wishlist.</p>
                <Link href="/shop" className="inline-block bg-[#1e3a5f] text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#132644]">
                  Browse Books
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {rows.map((r) => (
                  <BookCard
                    key={r.bookId}
                    wishlisted
                    book={{
                      id: r.bookId, title: r.title, slug: r.slug, coverImage: r.coverImage,
                      rating: r.rating, reviewCount: r.reviewCount, author: { name: r.authorName },
                      formats: (formatsByBook.get(r.bookId) ?? []).map((f) => ({ id: f.id, format: f.format, price: f.price, stock: f.stock - f.reservedStock })),
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
