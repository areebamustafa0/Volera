"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ShoppingCart, Check, Star, Heart, AlertCircle } from "lucide-react";

export interface BookCardProps {
  book: {
    id: number;
    title: string;
    slug: string;
    coverImage: string;
    rating: string | number;
    reviewCount: number;
    author: { name: string };
    formats?: { id: number; format: string; price: string; originalPrice?: string | null; stock?: number }[];
    isNewArrival?: boolean;
  };
  wishlisted?: boolean;
}

export function BookCard({ book, wishlisted = false }: BookCardProps) {
  const router = useRouter();
  const [added, setAdded] = useState(false);
  const [adding, setAdding] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(wishlisted);
  const [wishBusy, setWishBusy] = useState(false);
  const [cartError, setCartError] = useState("");

  const formats = book.formats ?? [];
  const primaryFormat = formats[0];
  const ebookFmt = formats.find((f) => f.format === "EBOOK");
  const lowestPrice = formats.length ? Math.min(...formats.map((f) => Number(f.price))) : 0;
  const hasPdf = Boolean(ebookFmt);
  const outOfStock = primaryFormat && primaryFormat.format !== "EBOOK" && (primaryFormat.stock ?? 1) <= 0;

  const addToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!primaryFormat || adding || outOfStock) return;
    setAdding(true);
    setCartError("");
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId: book.id, formatId: primaryFormat.id, quantity: 1 }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setAdded(true);
        router.refresh();
        setTimeout(() => setAdded(false), 2200);
      } else {
        setCartError(data.error || "Could not add to cart");
        setTimeout(() => setCartError(""), 3000);
      }
    } finally {
      setAdding(false);
    }
  };

  const toggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (wishBusy) return;
    setWishBusy(true);
    const next = !isWishlisted;
    setIsWishlisted(next); // optimistic
    try {
      const res = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId: book.id }),
      });
      if (res.status === 401) {
        setIsWishlisted(!next);
        router.push(`/auth/login?redirect=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      if (!res.ok) setIsWishlisted(!next);
      else router.refresh();
    } catch {
      setIsWishlisted(!next);
    } finally {
      setWishBusy(false);
    }
  };

  return (
    <div className="group relative flex flex-col bg-white rounded-xl border border-[#e2e8f0] overflow-hidden hover:shadow-md hover:border-[#cbd5e1] transition-all duration-200">
      {/* Cover */}
      <Link href={`/books/${book.slug}`} className="relative block aspect-[2/3] overflow-hidden bg-[#f1f4f9] shrink-0">
        <Image
          src={book.coverImage}
          alt={`Cover of ${book.title}`}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover book-cover"
        />
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {hasPdf && <span className="badge badge-pdf text-[9px]">PDF</span>}
          {book.isNewArrival && <span className="badge badge-new text-[9px]">New</span>}
          {outOfStock && <span className="badge bg-red-100 text-red-700 text-[9px]">Out of Stock</span>}
        </div>
      </Link>

      {/* Wishlist button */}
      <button
        onClick={toggleWishlist}
        disabled={wishBusy}
        aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
        aria-pressed={isWishlisted}
        className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-sm hover:bg-white transition-colors disabled:opacity-60"
      >
        <Heart className={`w-4 h-4 transition-colors ${isWishlisted ? "fill-red-500 text-red-500" : "text-[#475569]"}`} />
      </button>

      {/* Info */}
      <div className="flex flex-col flex-1 p-3">
        <Link href={`/books/${book.slug}`}>
          <h3 className="font-semibold text-[#0f172a] text-sm leading-snug line-clamp-2 hover:text-[#2d5a9e] transition-colors mb-1 min-h-[2.5rem]">
            {book.title}
          </h3>
        </Link>
        <p className="text-xs text-[#94a3b8] mb-2 truncate">{book.author?.name}</p>

        <div className="flex items-center gap-1 mb-3">
          <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
          <span className="text-xs font-semibold text-[#0f172a]">{Number(book.rating).toFixed(1)}</span>
          <span className="text-xs text-[#94a3b8]">({book.reviewCount})</span>
        </div>

        <div className="flex items-center justify-between mt-auto gap-2">
          <div className="flex items-baseline gap-1.5">
            <span className="font-bold text-[#1e3a5f] text-base">
              {lowestPrice > 0 ? `$${lowestPrice.toFixed(2)}` : "Free"}
            </span>
            {primaryFormat?.originalPrice && Number(primaryFormat.originalPrice) > lowestPrice && (
              <span className="text-xs text-[#94a3b8] line-through">${Number(primaryFormat.originalPrice).toFixed(2)}</span>
            )}
          </div>
          <button
            onClick={addToCart}
            disabled={adding || formats.length === 0 || outOfStock}
            aria-label={added ? "Added to cart" : `Add ${book.title} to cart`}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
              added ? "bg-emerald-500 text-white" : "bg-[#1e3a5f] text-white hover:bg-[#132644]"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {added ? (<><Check className="w-3.5 h-3.5" /> Added</>) : (<><ShoppingCart className="w-3.5 h-3.5" /> Add</>)}
          </button>
        </div>
        {cartError && (
          <p className="flex items-center gap-1 text-[11px] text-red-600 mt-1.5">
            <AlertCircle className="w-3 h-3 shrink-0" /> {cartError}
          </p>
        )}
      </div>
    </div>
  );
}
