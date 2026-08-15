import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Download, BookOpen, TrendingUp, Shield, Zap, Sparkles } from "lucide-react";
import { db } from "@/db";
import { books, authors, categories, bookFormats } from "@/db/schema";
import { desc, eq, and, sql } from "drizzle-orm";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { getCurrentUser } from "@/lib/auth";
import { getHeaderCounts, getWishlistedIds } from "@/lib/header-data";
import { NewsletterSignup } from "@/components/layout/NewsletterSignup";
import { BookCard } from "@/components/books/BookCard";

export const revalidate = 60;

export default async function HomePage() {
  const [user, headerCounts, wishlistedIds, allCategories, totalBooksRow, featuredBooks, bestSellers, newBooks] = await Promise.all([
    getCurrentUser(),
    getHeaderCounts(),
    getWishlistedIds(),
    db.select({ id: categories.id, name: categories.name, slug: categories.slug }).from(categories).limit(9),
    db.select({ count: sql<number>`count(*)::int` }).from(books),
    fetchBookCards({ isFeatured: true }, 6),
    fetchBookCards({ isBestseller: true }, 6),
    fetchBookCards({}, 8, desc(books.createdAt)),
  ]);

  const totalBooks = totalBooksRow[0]?.count ?? 0;

  const FEATURES = [
    { icon: Zap, title: "Instant PDF Access", body: "Buy an eBook and the PDF is ready in seconds. No waiting, no delays.", color: "bg-amber-50 text-amber-600" },
    { icon: BookOpen, title: "Read Online", body: "Built-in reader with adjustable font, night mode, and chapter bookmarks.", color: "bg-blue-50 text-blue-600" },
    { icon: Download, title: "Download Forever", body: "PDF files are yours to keep. Download up to 10 times per title per day.", color: "bg-green-50 text-green-600" },
    { icon: Shield, title: "Secure Payments", body: "Every transaction is encrypted. Your data is never shared.", color: "bg-purple-50 text-purple-600" },
  ];

  return (
    <div className="bg-[#f8f9fc] min-h-screen">
      <Navbar user={user} cartCount={headerCounts.cartCount} wishlistCount={headerCounts.wishlistCount} />

      <main id="main">
        {/* ── Hero ───────────────────────────────────────── */}
        <section className="relative bg-[#1e3a5f] overflow-hidden">
          <div className="absolute inset-0 opacity-[0.06]" aria-hidden>
            <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 25% 50%, white 1px, transparent 1px), radial-gradient(circle at 75% 50%, white 1px, transparent 1px)", backgroundSize: "48px 48px" }} />
          </div>
          <div className="absolute right-0 top-0 bottom-0 w-1/2 hidden lg:block">
            <div className="absolute inset-0 bg-gradient-to-r from-[#1e3a5f] to-transparent z-10" />
            <Image
              src="https://images.unsplash.com/photo-1507842217343-583bb7270b66?auto=format&fit=crop&q=80&w=1200"
              alt=""
              fill
              className="object-cover opacity-30"
              priority
            />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
            <div className="max-w-2xl">
              {totalBooks > 0 && (
                <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-1.5 mb-6">
                  <span className="w-2 h-2 rounded-full bg-[#e07b39] animate-pulse" />
                  <span className="text-white/90 text-sm font-medium">
                    {totalBooks} {totalBooks === 1 ? "Book" : "Books"} Available
                  </span>
                </div>
              )}
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.08] tracking-tight mb-5 text-balance">
                Find Your Next Great Read
              </h1>
              <p className="text-white/75 text-lg md:text-xl mb-8 leading-relaxed max-w-xl">
                Explore books across fiction, romance, fantasy, business, technology, self-development and more.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/shop"
                  className="inline-flex items-center gap-2 bg-[#e07b39] text-white px-6 py-3.5 rounded-xl font-semibold text-sm hover:bg-[#d06b2a] transition-colors shadow-lg shadow-orange-900/30"
                >
                  <TrendingUp className="w-4 h-4" />
                  Browse Books
                </Link>
                <Link
                  href="/shop?format=ebook"
                  className="inline-flex items-center gap-2 bg-white/10 border border-white/25 text-white px-6 py-3.5 rounded-xl font-semibold text-sm hover:bg-white/20 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Explore eBooks
                </Link>
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-8 text-sm text-white/60">
                <span className="flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Secure checkout</span>
                <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5" /> Instant PDF delivery</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Why Shop With Us ───────────────────────────── */}
        <section className="bg-white border-b border-[#e2e8f0]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {FEATURES.map(({ icon: Icon, title, body, color }) => (
                <div key={title} className="flex gap-4 items-start">
                  <div className={`${color} p-2.5 rounded-xl shrink-0`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#0f172a] text-sm">{title}</p>
                    <p className="text-xs text-[#475569] mt-0.5 leading-relaxed hidden md:block">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Featured Books ─────────────────────────────── */}
        {featuredBooks.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
            <SectionHeader title="Featured Books" sub="Handpicked by our editors" href="/shop?featured=true" />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5 mt-8">
              {featuredBooks.map((book) => (
                <BookCard key={book.id} book={toCardBook(book)} wishlisted={wishlistedIds.has(book.id)} />
              ))}
            </div>
          </section>
        )}

        {/* ── Categories ─────────────────────────────────── */}
        <section className="bg-white border-y border-[#e2e8f0]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
            <SectionHeader title="Browse by Category" sub="Find the genre that speaks to you" href="/categories" />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-8">
              {allCategories.map((cat, i) => {
                const gradients = [
                  "from-blue-600 to-blue-800", "from-emerald-600 to-emerald-800",
                  "from-purple-600 to-purple-800", "from-rose-600 to-rose-800",
                  "from-amber-600 to-amber-800", "from-sky-600 to-sky-800",
                  "from-teal-600 to-teal-800", "from-indigo-600 to-indigo-800",
                  "from-fuchsia-600 to-fuchsia-800",
                ];
                return (
                  <Link
                    key={cat.id}
                    href={`/shop?category=${cat.slug}`}
                    className={`group relative bg-gradient-to-br ${gradients[i % gradients.length]} rounded-xl p-5 overflow-hidden`}
                  >
                    <BookOpen className="absolute right-3 bottom-3 w-9 h-9 opacity-10 group-hover:opacity-20 transition-opacity text-white" />
                    <p className="font-bold text-white text-sm">{cat.name}</p>
                    <p className="text-white/70 text-xs mt-1 flex items-center gap-1">
                      View all <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Best Sellers ───────────────────────────────── */}
        {bestSellers.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
            <SectionHeader title="Best Sellers" sub="Our most popular titles" href="/best-sellers" />
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5 mt-8">
              {bestSellers.map((book) => (
                <BookCard key={book.id} book={toCardBook(book)} wishlisted={wishlistedIds.has(book.id)} />
              ))}
            </div>
          </section>
        )}

        {/* ── New Releases ───────────────────────────────── */}
        {newBooks.length > 0 && (
          <section className="bg-white border-y border-[#e2e8f0]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
              <SectionHeader title="New Releases" sub="Recently added to our catalog" href="/new-releases" />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5 mt-8">
                {newBooks.map((book) => (
                  <BookCard key={book.id} book={toCardBook(book)} wishlisted={wishlistedIds.has(book.id)} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── eBooks Banner ──────────────────────────────── */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="relative bg-gradient-to-br from-[#1e3a5f] to-[#2d5a9e] rounded-2xl overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-48 opacity-10 hidden sm:block" aria-hidden>
              <div className="text-[10rem] leading-none text-white font-bold">PDF</div>
            </div>
            <div className="relative z-10 px-6 sm:px-8 md:px-12 py-10">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <div className="flex-1">
                  <div className="badge badge-pdf mb-3"><Sparkles className="w-3 h-3" /> PDF eBooks</div>
                  <h2 className="text-2xl md:text-3xl font-bold text-white leading-tight">
                    Buy once. Read forever.
                  </h2>
                  <p className="text-white/70 mt-2 max-w-lg">
                    Every eBook comes with instant PDF access. Read online in our built-in reader or download the file to any device — it&apos;s yours permanently.
                  </p>
                </div>
                <Link
                  href="/shop?format=ebook"
                  className="inline-flex items-center gap-2 bg-white text-[#1e3a5f] px-6 py-3.5 rounded-xl font-bold text-sm hover:bg-[#f1f4f9] transition-colors shrink-0"
                >
                  Browse eBooks
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Newsletter ─────────────────────────────────── */}
        <section className="bg-white border-t border-[#e2e8f0]">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-14 text-center">
            <h2 className="text-2xl font-bold text-[#0f172a] mb-2">Stay in the loop</h2>
            <p className="text-[#475569] mb-7">New arrivals, author spotlights, and exclusive deals — in your inbox.</p>
            <NewsletterSignup />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}

/* ── Shared query for homepage book rows ─────────────────── */
async function fetchBookCards(
  where: { isFeatured?: boolean; isBestseller?: boolean },
  limit: number,
  orderBy?: ReturnType<typeof desc>
) {
  const joinConditions = [eq(books.id, bookFormats.bookId), eq(bookFormats.format, "EBOOK")];
  if (where.isFeatured) joinConditions.push(eq(books.isFeatured, true));
  if (where.isBestseller) joinConditions.push(eq(books.isBestseller, true));

  const rows = await db
    .select({
      id: books.id, title: books.title, slug: books.slug, coverImage: books.coverImage,
      authorName: authors.name, price: bookFormats.price, rating: books.rating,
      reviewCount: books.reviewCount, formatId: bookFormats.id,
    })
    .from(books)
    .innerJoin(authors, eq(books.authorId, authors.id))
    .innerJoin(bookFormats, and(...joinConditions))
    .orderBy(orderBy ?? desc(books.reviewCount))
    .limit(limit);
  return rows;
}

function toCardBook(book: {
  id: number; title: string; slug: string; coverImage: string;
  authorName: string; price: string | null; rating: string | null;
  reviewCount: number; formatId: number;
}) {
  return {
    id: book.id, title: book.title, slug: book.slug, coverImage: book.coverImage,
    rating: book.rating ?? "0", reviewCount: book.reviewCount,
    author: { name: book.authorName },
    formats: [{ id: book.formatId, format: "EBOOK", price: book.price ?? "0" }],
  };
}

/* ── Section header ──────────────────────────────────────── */
function SectionHeader({ title, sub, href }: { title: string; sub: string; href: string }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h2 className="text-2xl font-bold text-[#0f172a]">{title}</h2>
        <p className="text-[#475569] text-sm mt-0.5">{sub}</p>
      </div>
      <Link
        href={href}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#2d5a9e] hover:text-[#1e3a5f] transition-colors shrink-0"
      >
        View all <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
