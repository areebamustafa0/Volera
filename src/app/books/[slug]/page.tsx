import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { db } from "@/db";
import { books, authors, categories, bookFormats } from "@/db/schema";
import { eq, and, desc, ne } from "drizzle-orm";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { getCurrentUser } from "@/lib/auth";
import { getHeaderCounts, getWishlistedIds } from "@/lib/header-data";
import { Download, BookOpen, Star, ChevronRight, ShieldCheck, Zap, Globe } from "lucide-react";
import { BuyButton } from "@/components/books/BuyButton";
import { WishlistToggle } from "@/components/books/WishlistToggle";
import { BookCard } from "@/components/books/BookCard";
import { ReviewsSection } from "@/components/books/ReviewsSection";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [row] = await db.select({ title: books.title, description: books.description }).from(books).where(eq(books.slug, slug)).limit(1);
  if (!row) return {};
  return {
    title: row.title,
    description: row.description.slice(0, 155),
    alternates: { canonical: `/books/${slug}` },
    openGraph: { title: row.title, description: row.description.slice(0, 155), type: "book" },
  };
}

export default async function BookDetailPage({ params }: Props) {
  const { slug } = await params;
  const [user, headerCounts, wishlistedIds, bookData] = await Promise.all([
    getCurrentUser(), getHeaderCounts(), getWishlistedIds(),
    db
      .select({
        id: books.id, title: books.title, slug: books.slug, description: books.description,
        isbn: books.isbn, coverImage: books.coverImage, rating: books.rating,
        reviewCount: books.reviewCount, pages: books.pages, language: books.language,
        publicationDate: books.publicationDate, publisher: books.publisher,
        authorId: books.authorId, authorName: authors.name, authorBio: authors.bio, authorImage: authors.image,
        categoryId: categories.id, categoryName: categories.name, categorySlug: categories.slug,
      })
      .from(books)
      .innerJoin(authors, eq(books.authorId, authors.id))
      .innerJoin(categories, eq(books.categoryId, categories.id))
      .where(eq(books.slug, slug))
      .limit(1),
  ]);

  const book = bookData[0];
  if (!book) notFound();

  const [formats, relatedRows] = await Promise.all([
    db.select().from(bookFormats).where(eq(bookFormats.bookId, book.id)),
    db
      .select({
        id: books.id, title: books.title, slug: books.slug, coverImage: books.coverImage,
        rating: books.rating, reviewCount: books.reviewCount, authorName: authors.name,
        price: bookFormats.price, formatId: bookFormats.id, format: bookFormats.format,
      })
      .from(books)
      .innerJoin(authors, eq(books.authorId, authors.id))
      .innerJoin(bookFormats, and(eq(books.id, bookFormats.bookId), eq(bookFormats.format, "EBOOK")))
      .where(and(eq(books.categoryId, book.categoryId), ne(books.id, book.id)))
      .orderBy(desc(books.rating))
      .limit(4),
  ]);

  const ebookFmt = formats.find((f) => f.format === "EBOOK");
  const physicalFmts = formats.filter((f) => f.format !== "EBOOK");
  const ratingNum = Number(book.rating);
  const fullStars = Math.floor(ratingNum);
  const hasHalf = ratingNum - fullStars >= 0.5;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Book",
    name: book.title,
    author: { "@type": "Person", name: book.authorName },
    isbn: book.isbn,
    numberOfPages: book.pages,
    inLanguage: book.language,
    aggregateRating: book.reviewCount > 0 ? {
      "@type": "AggregateRating", ratingValue: ratingNum, reviewCount: book.reviewCount,
    } : undefined,
    offers: formats.map((f) => ({
      "@type": "Offer", price: f.price, priceCurrency: "USD",
      availability: f.format === "EBOOK" || f.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    })),
  };

  return (
    <div className="bg-[#f8f9fc] min-h-screen">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Navbar user={user} cartCount={headerCounts.cartCount} wishlistCount={headerCounts.wishlistCount} />

      <main id="main">
        <div className="bg-white border-b border-[#e2e8f0]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-[#94a3b8]">
              <Link href="/" className="hover:text-[#1e3a5f] transition-colors">Home</Link>
              <ChevronRight className="w-3 h-3" aria-hidden />
              <Link href="/shop" className="hover:text-[#1e3a5f] transition-colors">Shop</Link>
              <ChevronRight className="w-3 h-3" aria-hidden />
              <Link href={`/shop?category=${book.categorySlug}`} className="hover:text-[#1e3a5f] transition-colors">
                {book.categoryName}
              </Link>
              <ChevronRight className="w-3 h-3" aria-hidden />
              <span className="text-[#0f172a] font-medium truncate max-w-[160px]" aria-current="page">{book.title}</span>
            </nav>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid md:grid-cols-[300px_1fr] xl:grid-cols-[340px_1fr] gap-10">
            {/* Left — Cover + Trust badges */}
            <div>
              <div className="md:sticky md:top-24">
                <div className="relative aspect-[2/3] rounded-2xl overflow-hidden bg-[#e2e8f0] shadow-xl mb-5">
                  <Image
                    src={book.coverImage}
                    alt={`Cover of ${book.title} by ${book.authorName}`}
                    fill
                    className="object-cover"
                    priority
                    sizes="(max-width: 768px) 100vw, 340px"
                  />
                  {ebookFmt && (
                    <div className="absolute top-3 left-3">
                      <span className="badge badge-pdf">PDF Available</span>
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-xl border border-[#e2e8f0] divide-y divide-[#e2e8f0] overflow-hidden">
                  {[
                    { icon: Zap, text: "Instant PDF delivery" },
                    { icon: Download, text: "Download up to 10×/day" },
                    { icon: ShieldCheck, text: "Secure, encrypted checkout" },
                    { icon: Globe, text: "Read on any device" },
                  ].map(({ icon: Icon, text }) => (
                    <div key={text} className="flex items-center gap-3 px-4 py-3 text-sm text-[#475569]">
                      <Icon className="w-4 h-4 text-[#1e3a5f] shrink-0" aria-hidden />
                      {text}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right — Info & purchase */}
            <div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-[#2d5a9e] mb-2">
                    <Link href={`/shop?category=${book.categorySlug}`} className="hover:underline">{book.categoryName}</Link>
                  </p>
                  <h1 className="text-3xl md:text-4xl font-bold text-[#0f172a] leading-tight mb-2">{book.title}</h1>
                  <p className="text-[#475569] text-base mb-5">
                    by <span className="font-semibold text-[#0f172a]">{book.authorName}</span>
                  </p>
                </div>
                <WishlistToggle bookId={book.id} initialWishlisted={wishlistedIds.has(book.id)} />
              </div>

              {/* Rating */}
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-[#e2e8f0]">
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${i < fullStars ? "fill-amber-400 text-amber-400" : i === fullStars && hasHalf ? "fill-amber-200 text-amber-400" : "text-[#e2e8f0]"}`}
                      aria-hidden
                    />
                  ))}
                </div>
                <span className="font-bold text-[#0f172a] text-sm">{ratingNum.toFixed(1)}</span>
                <a href="#reviews-heading" className="text-[#94a3b8] text-sm hover:text-[#2d5a9e] hover:underline">
                  ({book.reviewCount.toLocaleString()} review{book.reviewCount !== 1 ? "s" : ""})
                </a>
              </div>

              {/* Purchase panels */}
              <div className="space-y-3 mb-8">
                {ebookFmt && (
                  <div className="bg-[#f0fdf4] border-2 border-[#22c55e] rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="badge badge-pdf">PDF eBook</span>
                      <span className="text-xs text-[#059669] font-semibold">Instant Access</span>
                    </div>
                    <p className="text-3xl font-bold text-[#1e3a5f]">${Number(ebookFmt.price).toFixed(2)}</p>
                    <p className="text-xs text-[#475569] mt-1 mb-4">
                      Download PDF immediately · Read online · Keep forever
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      <BuyButton
                        bookId={book.id} formatId={ebookFmt.id} mode="buy" label="Buy Now"
                        className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 bg-[#1e3a5f] text-white px-5 py-3 rounded-xl font-bold text-sm hover:bg-[#132644] transition-colors shadow-sm"
                      />
                      <BuyButton
                        bookId={book.id} formatId={ebookFmt.id} mode="cart" label="Add to Cart"
                        className="flex-1 min-w-[140px] inline-flex items-center justify-center gap-2 border-2 border-[#1e3a5f] text-[#1e3a5f] px-5 py-3 rounded-xl font-semibold text-sm hover:bg-[#1e3a5f] hover:text-white transition-colors"
                      />
                    </div>
                  </div>
                )}

                {physicalFmts.map((fmt) => {
                  const available = fmt.stock - fmt.reservedStock;
                  return (
                    <div key={fmt.id} className="bg-white border border-[#e2e8f0] rounded-xl p-5">
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div>
                          <p className="font-semibold text-[#0f172a] flex items-center gap-2">
                            <BookOpen className="w-4 h-4 text-[#475569]" aria-hidden />
                            {fmt.format === "HARDCOVER" ? "Hardcover" : fmt.format === "PAPERBACK" ? "Paperback" : fmt.format}
                          </p>
                          <p className="text-2xl font-bold text-[#0f172a] mt-1">${Number(fmt.price).toFixed(2)}</p>
                          {available > 0 ? (
                            <p className="text-xs text-[#059669] mt-1 flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-[#059669]" aria-hidden />
                              {available < 5 ? `Only ${available} left` : "In stock"} — ships in 1–3 days
                            </p>
                          ) : (
                            <p className="text-xs text-[#dc2626] mt-1 font-medium">Out of stock</p>
                          )}
                        </div>
                        <BuyButton
                          bookId={book.id} formatId={fmt.id} mode="cart" label="Add to Cart" disabled={available <= 0}
                          className="inline-flex items-center gap-2 bg-[#0f172a] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#1e293b] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mb-8">
                <h2 className="font-bold text-lg text-[#0f172a] mb-3">About this book</h2>
                <p className="text-[#475569] leading-relaxed">{book.description}</p>
              </div>

              {book.authorBio && (
                <div className="mb-8 bg-white rounded-xl border border-[#e2e8f0] p-5 flex gap-4">
                  {book.authorImage && (
                    <div className="relative w-16 h-16 rounded-full overflow-hidden bg-[#e2e8f0] shrink-0">
                      <Image src={book.authorImage} alt={book.authorName} fill className="object-cover" sizes="64px" />
                    </div>
                  )}
                  <div>
                    <h2 className="font-bold text-sm text-[#0f172a] mb-1">About the Author — {book.authorName}</h2>
                    <p className="text-sm text-[#475569] leading-relaxed">{book.authorBio}</p>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#e2e8f0] bg-[#f8f9fc]">
                  <h2 className="font-bold text-sm text-[#0f172a]">Book Details</h2>
                </div>
                <dl className="divide-y divide-[#e2e8f0]">
                  {[
                    ["Publisher", book.publisher || "—"],
                    ["Author", book.authorName],
                    ["ISBN", book.isbn],
                    ["Pages", String(book.pages)],
                    ["Language", book.language],
                    ["Published", book.publicationDate ? new Date(book.publicationDate).getFullYear().toString() : "—"],
                    ...(ebookFmt ? [["Format", "PDF eBook"], ["File size", ebookFmt.fileSize ?? "—"]] : []),
                    ...(physicalFmts.length ? [["Physical format", physicalFmts.map((f) => f.format).join(", ")]] : []),
                  ].map(([label, value]) => (
                    <div key={label} className="grid grid-cols-2 px-5 py-3 text-sm">
                      <dt className="text-[#94a3b8] font-medium">{label}</dt>
                      <dd className="text-[#0f172a] font-semibold">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <ReviewsSection bookId={book.id} averageRating={ratingNum} reviewCount={book.reviewCount} />
            </div>
          </div>

          {relatedRows.length > 0 && (
            <section className="mt-14">
              <h2 className="text-xl font-bold text-[#0f172a] mb-6">You might also like</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
                {relatedRows.map((r) => (
                  <BookCard
                    key={r.id}
                    wishlisted={wishlistedIds.has(r.id)}
                    book={{
                      id: r.id, title: r.title, slug: r.slug, coverImage: r.coverImage,
                      rating: r.rating, reviewCount: r.reviewCount, author: { name: r.authorName },
                      formats: [{ id: r.formatId, format: r.format, price: r.price }],
                    }}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
