import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { libraries, books, authors, bookFormats } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { BookActions } from "@/components/library/BookActions";
import { AccountNav } from "@/components/account/AccountNav";
import { getCurrentUser } from "@/lib/auth";
import { getHeaderCounts } from "@/lib/header-data";
import { BookOpen, Library, Clock, Download, CheckCircle } from "lucide-react";

export const metadata: Metadata = { title: "My Books" };

export default async function MyBooksPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?redirect=/account/library");
  const headerCounts = await getHeaderCounts();

  const owned = await db
    .select({
      libraryId: libraries.id,
      bookId: books.id,
      title: books.title,
      slug: books.slug,
      coverImage: books.coverImage,
      authorName: authors.name,
      progress: libraries.progressPercentage,
      status: libraries.status,
      format: bookFormats.format,
      purchasedAt: libraries.createdAt,
      updatedAt: libraries.updatedAt,
    })
    .from(libraries)
    .innerJoin(books, eq(libraries.bookId, books.id))
    .innerJoin(authors, eq(books.authorId, authors.id))
    .leftJoin(bookFormats, eq(libraries.formatId, bookFormats.id))
    .where(eq(libraries.userId, user.id))
    .orderBy(desc(libraries.updatedAt));

  const reading = owned.filter((b) => (b.progress ?? 0) > 0 && (b.progress ?? 0) < 100);

  return (
    <div className="bg-[#f8f9fc] min-h-screen">
      <Navbar user={user} cartCount={headerCounts.cartCount} wishlistCount={headerCounts.wishlistCount} />

      <main id="main" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#0f172a] flex items-center gap-3">
              <Library className="w-6 h-6 text-[#1e3a5f]" />
              My Books &amp; Downloads
            </h1>
            <p className="text-[#475569] text-sm mt-1">
              {owned.length} {owned.length === 1 ? "book" : "books"} purchased · Read online or download PDF
            </p>
          </div>
          <Link
            href="/shop?format=ebook"
            className="inline-flex items-center gap-2 bg-[#1e3a5f] text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#132644] transition-colors shrink-0"
          >
            <BookOpen className="w-4 h-4" />
            Browse eBooks
          </Link>
        </div>

        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <AccountNav />
        <div>
        {owned.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#e2e8f0] text-center py-20">
            <BookOpen className="w-16 h-16 text-[#cbd5e1] mx-auto mb-5" />
            <h2 className="text-xl font-bold text-[#0f172a] mb-2">Your library is waiting for its first title.</h2>
            <p className="text-[#475569] text-sm mb-7 max-w-sm mx-auto">
              Buy any eBook and the PDF appears here instantly, ready to read or download.
            </p>
            <Link href="/shop?format=ebook" className="inline-flex items-center gap-2 bg-[#1e3a5f] text-white px-7 py-3.5 rounded-xl font-bold text-sm hover:bg-[#132644] transition-colors">
              Browse PDF eBooks
            </Link>
          </div>
        ) : (
          <div className="space-y-10">
            {/* Continue reading */}
            {reading.length > 0 && (
              <section>
                <h2 className="font-bold text-[#0f172a] mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#2d5a9e]" />
                  Continue Reading
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {reading.map((b) => (
                    <div key={b.libraryId} className="bg-white rounded-xl border border-[#e2e8f0] p-4 flex gap-4 hover:shadow-sm transition-shadow">
                      <Link href={`/books/${b.slug}`} className="relative w-16 h-24 shrink-0 rounded-lg overflow-hidden bg-[#e2e8f0]">
                        <Image src={b.coverImage} alt={b.title} fill className="object-cover" sizes="64px" />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link href={`/books/${b.slug}`} className="font-semibold text-[#0f172a] text-sm line-clamp-2 hover:text-[#2d5a9e] transition-colors">
                          {b.title}
                        </Link>
                        <p className="text-xs text-[#94a3b8] mt-0.5 mb-3">{b.authorName}</p>
                        <div className="mb-1.5">
                          <div className="h-1.5 bg-[#e2e8f0] rounded-full overflow-hidden">
                            <div className="h-full bg-[#2d5a9e] rounded-full transition-all" style={{ width: `${b.progress ?? 0}%` }} />
                          </div>
                          <p className="text-xs text-[#94a3b8] mt-1">{b.progress ?? 0}% complete</p>
                        </div>
                        <Link href={`/reader/${b.bookId}`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2d5a9e] hover:underline">
                          <BookOpen className="w-3.5 h-3.5" /> Continue reading
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* All books grid */}
            <section>
              <h2 className="font-bold text-[#0f172a] mb-4 flex items-center gap-2">
                <Download className="w-4 h-4 text-[#059669]" />
                All My Books
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {owned.map((b) => (
                  <div key={b.libraryId} className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden hover:shadow-sm transition-shadow flex flex-col">
                    <div className="flex gap-4 p-4">
                      <Link href={`/books/${b.slug}`} className="relative w-20 h-28 shrink-0 rounded-lg overflow-hidden bg-[#e2e8f0] shadow-sm">
                        <Image src={b.coverImage} alt={b.title} fill className="object-cover" sizes="80px" />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link href={`/books/${b.slug}`} className="font-semibold text-[#0f172a] text-sm line-clamp-2 hover:text-[#2d5a9e] transition-colors leading-snug">
                          {b.title}
                        </Link>
                        <p className="text-xs text-[#94a3b8] mt-0.5 mb-2">{b.authorName}</p>

                        <div className="flex flex-wrap gap-1.5 mb-3">
                          <span className="badge badge-pdf text-[9px]">PDF</span>
                          {(b.progress ?? 0) >= 100 ? (
                            <span className="badge bg-blue-100 text-blue-700 text-[9px]">
                              <CheckCircle className="w-2.5 h-2.5" /> Done
                            </span>
                          ) : (b.progress ?? 0) > 0 ? (
                            <span className="badge badge-new text-[9px]">{b.progress}% read</span>
                          ) : null}
                        </div>

                        {(b.progress ?? 0) > 0 && (b.progress ?? 0) < 100 && (
                          <div className="h-1 bg-[#e2e8f0] rounded-full overflow-hidden">
                            <div className="h-full bg-[#2d5a9e]" style={{ width: `${b.progress}%` }} />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-auto px-4 pb-4">
                      <BookActions bookId={b.bookId} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}
        </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
