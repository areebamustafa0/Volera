import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { db } from "@/db";
import { books, authors, bookChapters, libraries } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { verifyEntitlement } from "@/services/download.service";
import { Reader } from "@/components/reader/Reader";
import { Lock } from "lucide-react";

export const metadata: Metadata = { title: "Reader", robots: { index: false } };

type Props = { params: Promise<{ bookId: string }> };

export default async function ReaderPage({ params }: Props) {
  const { bookId } = await params;
  const id = Number(bookId);
  if (!Number.isInteger(id)) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/auth/login?redirect=/reader/${id}`);

  // Ownership gate: EBOOK entitlement on a PAID order
  const entitlement = await verifyEntitlement(user.id, id);
  if (!entitlement.ok) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="max-w-md text-center bg-white p-10 rounded-xl border border-gray-200">
          <Lock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">You don&apos;t own this book</h1>
          <p className="text-gray-600 mb-6 text-sm">{entitlement.error}</p>
          <div className="flex gap-3 justify-center">
            <Link href="/shop?format=ebook" className="bg-blue-900 text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-blue-800">
              Browse eBooks
            </Link>
            <Link href="/account/library" className="border border-gray-300 px-6 py-2.5 rounded-lg font-semibold text-sm hover:border-gray-500">
              My Books
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const [bookRow] = await db
    .select({ title: books.title, authorName: authors.name })
    .from(books)
    .innerJoin(authors, eq(books.authorId, authors.id))
    .where(eq(books.id, id))
    .limit(1);
  if (!bookRow) notFound();

  // Lightweight table of contents
  const chapterList = await db
    .select({ number: bookChapters.chapterNumber, title: bookChapters.title })
    .from(bookChapters)
    .where(eq(bookChapters.bookId, id))
    .orderBy(asc(bookChapters.chapterNumber));

  if (chapterList.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
        <div className="max-w-md text-center bg-white p-10 rounded-xl border border-gray-200">
          <h1 className="text-2xl font-bold mb-2">Content coming soon</h1>
          <p className="text-gray-600 mb-6 text-sm">
            The readable text for &ldquo;{bookRow.title}&rdquo; is being prepared. Your purchase is safe.
          </p>
          <Link href="/account/library" className="bg-blue-900 text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-blue-800">
            Back to My Books
          </Link>
        </div>
      </div>
    );
  }

  // Resume where the reader left off
  const [entry] = await db
    .select()
    .from(libraries)
    .where(and(eq(libraries.userId, user.id), eq(libraries.bookId, id)))
    .limit(1);

  const match = entry?.currentChapter?.match(/(\d+)/);
  const saved = match ? Number(match[1]) : chapterList[0].number;
  const startNum = chapterList.some((c) => c.number === saved) ? saved : chapterList[0].number;

  const [row] = await db
    .select()
    .from(bookChapters)
    .where(and(eq(bookChapters.bookId, id), eq(bookChapters.chapterNumber, startNum)))
    .limit(1);

  return (
    <Reader
      bookId={id}
      bookTitle={bookRow.title}
      authorName={bookRow.authorName}
      chapterList={chapterList}
      initialChapter={{
        number: row.chapterNumber,
        title: row.title,
        paragraphs: row.content.split(/\n\n+/).map((p) => p.trim()).filter(Boolean),
      }}
      initialProgress={entry?.progressPercentage ?? 0}
    />
  );
}
