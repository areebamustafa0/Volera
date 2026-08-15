import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/db";
import { categories, books } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { getCurrentUser } from "@/lib/auth";
import { getHeaderCounts } from "@/lib/header-data";
import { BookOpen, ArrowRight } from "lucide-react";

export const metadata: Metadata = { title: "Browse Categories" };

const GRADIENTS = [
  "from-blue-600 to-blue-800", "from-emerald-600 to-emerald-800",
  "from-purple-600 to-purple-800", "from-rose-600 to-rose-800",
  "from-amber-600 to-amber-800", "from-sky-600 to-sky-800",
  "from-teal-600 to-teal-800", "from-indigo-600 to-indigo-800",
  "from-fuchsia-600 to-fuchsia-800",
];

export default async function CategoriesPage() {
  const [user, headerCounts, rows] = await Promise.all([
    getCurrentUser(),
    getHeaderCounts(),
    db
      .select({
        id: categories.id, name: categories.name, slug: categories.slug, description: categories.description,
        bookCount: sql<number>`count(${books.id})::int`,
      })
      .from(categories)
      .leftJoin(books, eq(books.categoryId, categories.id))
      .groupBy(categories.id)
      .orderBy(categories.name),
  ]);

  return (
    <div className="bg-[#f8f9fc] min-h-screen">
      <Navbar user={user} cartCount={headerCounts.cartCount} wishlistCount={headerCounts.wishlistCount} />
      <main id="main" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-2xl font-bold text-[#0f172a] mb-1">Browse by Category</h1>
        <p className="text-[#475569] text-sm mb-8">Find the genre that speaks to you</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {rows.map((cat, i) => (
            <Link
              key={cat.id}
              href={`/shop?category=${cat.slug}`}
              className={`group relative bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]} rounded-2xl p-6 overflow-hidden min-h-[160px] flex flex-col justify-between`}
            >
              <BookOpen className="absolute right-4 bottom-4 w-16 h-16 opacity-10 group-hover:opacity-20 transition-opacity text-white" />
              <div>
                <h2 className="font-bold text-white text-xl">{cat.name}</h2>
                {cat.description && <p className="text-white/70 text-sm mt-1.5 max-w-xs">{cat.description}</p>}
              </div>
              <div className="flex items-center justify-between mt-6">
                <span className="text-white/90 text-sm font-medium">{cat.bookCount} book{cat.bookCount !== 1 ? "s" : ""}</span>
                <span className="text-white/90 text-sm font-medium flex items-center gap-1">
                  Shop now <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </Link>
          ))}
        </div>

        {rows.length === 0 && (
          <div className="bg-white rounded-xl border border-[#e2e8f0] p-16 text-center">
            <p className="text-[#475569]">No categories available yet.</p>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
