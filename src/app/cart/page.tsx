import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { db } from "@/db";
import { carts, cartItems, bookFormats, books, authors } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { cookies } from "next/headers";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ShoppingCart, ArrowRight, Trash2, Tag, Shield, Zap, RefreshCcw } from "lucide-react";
import { CartActions } from "@/components/cart/CartActions";
import { getWishlistedIds } from "@/lib/header-data";

export const metadata: Metadata = { title: "Your Cart" };

export default async function CartPage() {
  const currentUser = await getCurrentUser();
  const wishlistedIds = await getWishlistedIds();
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("velora_session_id")?.value;

  const [cart] = currentUser
    ? await db.select().from(carts).where(eq(carts.userId, currentUser.id)).limit(1)
    : sessionId
      ? await db.select().from(carts).where(eq(carts.sessionId, sessionId)).limit(1)
      : [undefined];

  const items = cart
    ? await db
        .select({
          id: cartItems.id,
          quantity: cartItems.quantity,
          bookId: books.id,
          bookTitle: books.title,
          bookSlug: books.slug,
          bookCover: books.coverImage,
          authorName: authors.name,
          formatId: bookFormats.id,
          format: bookFormats.format,
          price: bookFormats.price,
          stock: bookFormats.stock,
          reservedStock: bookFormats.reservedStock,
        })
        .from(cartItems)
        .innerJoin(books, eq(cartItems.bookId, books.id))
        .innerJoin(authors, eq(books.authorId, authors.id))
        .innerJoin(bookFormats, eq(cartItems.formatId, bookFormats.id))
        .where(eq(cartItems.cartId, cart.id))
    : [];

  const subtotal = items.reduce((acc, i) => acc + Number(i.price) * i.quantity, 0);
  const shipping = items.some((i) => i.format !== "EBOOK") && subtotal < 75 ? 5.99 : 0;
  const total = subtotal + shipping;
  const hasPhysical = items.some((i) => i.format !== "EBOOK");
  const hasPdf = items.some((i) => i.format === "EBOOK");

  return (
    <div className="bg-[#f8f9fc] min-h-screen">
      <Navbar user={currentUser} cartCount={items.reduce((a, i) => a + i.quantity, 0)} wishlistCount={wishlistedIds.size} />

      <main id="main" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-2xl font-bold text-[#0f172a] mb-8 flex items-center gap-3">
          <ShoppingCart className="w-6 h-6 text-[#1e3a5f]" />
          Shopping Cart
          {items.length > 0 && (
            <span className="text-sm font-normal text-[#94a3b8]">
              ({items.reduce((a, i) => a + i.quantity, 0)} item{items.reduce((a, i) => a + i.quantity, 0) !== 1 ? "s" : ""})
            </span>
          )}
        </h1>

        {items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#e2e8f0] text-center py-20 px-6">
            <ShoppingCart className="w-16 h-16 text-[#cbd5e1] mx-auto mb-5" />
            <h2 className="text-xl font-bold text-[#0f172a] mb-2">Your cart is waiting for a good book.</h2>
            <p className="text-[#475569] mb-7 max-w-sm mx-auto">
              Browse our catalog and add your favourites to get started.
            </p>
            <Link href="/shop" className="inline-flex items-center gap-2 bg-[#1e3a5f] text-white px-7 py-3.5 rounded-xl font-bold text-sm hover:bg-[#132644] transition-colors">
              Browse Books <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_340px] items-start">
            {/* Items */}
            <div className="space-y-3">
              {hasPdf && (
                <div className="flex items-center gap-2.5 bg-[#f0fdf4] border border-[#22c55e]/40 rounded-xl px-4 py-3">
                  <Zap className="w-4 h-4 text-[#059669] shrink-0" />
                  <p className="text-sm text-[#065f46] font-medium">
                    PDF eBooks in your cart are delivered instantly after payment.
                  </p>
                </div>
              )}

              {items.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-xl border border-[#e2e8f0] p-4 flex gap-4 items-start"
                >
                  <Link href={`/books/${item.bookSlug}`} className="relative w-16 h-24 shrink-0 rounded-lg overflow-hidden bg-[#e2e8f0] shadow-sm">
                    <Image src={item.bookCover} alt={item.bookTitle} fill className="object-cover" sizes="64px" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/books/${item.bookSlug}`} className="font-semibold text-[#0f172a] hover:text-[#2d5a9e] text-sm leading-snug line-clamp-2 transition-colors">
                      {item.bookTitle}
                    </Link>
                    <p className="text-xs text-[#94a3b8] mt-0.5 mb-2">{item.authorName}</p>
                    <div className="flex items-center gap-2">
                      {item.format === "EBOOK" ? (
                        <span className="badge badge-pdf text-[9px]">PDF eBook</span>
                      ) : (
                        <span className="badge badge-new text-[9px]">{item.format}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2 shrink-0">
                    <p className="font-bold text-[#0f172a]">
                      ${(Number(item.price) * item.quantity).toFixed(2)}
                    </p>
                    <p className="text-xs text-[#94a3b8]">${Number(item.price).toFixed(2)} each</p>
                    <CartActions
                      itemId={item.id}
                      quantity={item.quantity}
                      isEbook={item.format === "EBOOK"}
                      maxQuantity={Math.max(1, item.stock - item.reservedStock)}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Order summary */}
            <div className="lg:sticky lg:top-24 space-y-4">
              <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
                <div className="px-5 py-4 border-b border-[#e2e8f0] bg-[#f8f9fc]">
                  <h2 className="font-bold text-[#0f172a]">Order Summary</h2>
                </div>
                <div className="p-5 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#475569]">Subtotal</span>
                    <span className="font-semibold text-[#0f172a]">${subtotal.toFixed(2)}</span>
                  </div>
                  {hasPhysical && (
                    <div className="flex justify-between text-sm">
                      <span className="text-[#475569]">Shipping</span>
                      <span className={`font-semibold ${shipping === 0 ? "text-[#059669]" : "text-[#0f172a]"}`}>
                        {shipping === 0 ? "Free" : `$${shipping.toFixed(2)}`}
                      </span>
                    </div>
                  )}
                  {hasPhysical && subtotal < 75 && subtotal > 0 && (
                    <div className="bg-[#fef3c7] rounded-lg px-3 py-2 text-xs text-[#92400e]">
                      Add ${(75 - subtotal).toFixed(2)} more for free shipping
                    </div>
                  )}
                  <div className="border-t border-[#e2e8f0] pt-3 flex justify-between">
                    <span className="font-bold text-[#0f172a]">Total</span>
                    <span className="font-bold text-xl text-[#1e3a5f]">${total.toFixed(2)}</span>
                  </div>
                </div>
                <div className="px-5 pb-5 space-y-2">
                  <Link
                    href={currentUser ? "/checkout" : "/auth/login?redirect=/checkout"}
                    className="w-full flex items-center justify-center gap-2 bg-[#1e3a5f] text-white py-3.5 rounded-xl font-bold text-sm hover:bg-[#132644] transition-colors shadow-sm"
                  >
                    {currentUser ? "Proceed to Checkout" : "Sign in to Checkout"}
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/shop"
                    className="w-full flex items-center justify-center gap-2 border border-[#e2e8f0] text-[#475569] py-3 rounded-xl text-sm font-semibold hover:border-[#1e3a5f] hover:text-[#1e3a5f] transition-colors"
                  >
                    <RefreshCcw className="w-4 h-4" />
                    Continue Shopping
                  </Link>
                </div>
              </div>

              {/* Trust */}
              <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 space-y-3">
                {[
                  { icon: Shield, text: "SSL encrypted, secure checkout" },
                  { icon: Zap, text: "Instant PDF access after payment" },
                  { icon: Tag, text: "Satisfaction guaranteed" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-3 text-sm text-[#475569]">
                    <Icon className="w-4 h-4 text-[#059669] shrink-0" />
                    {text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
