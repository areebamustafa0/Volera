import React from "react";
import { db } from "@/db";
import { orders, orderItems, books } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import Link from "next/link";
import { CheckCircle, BookOpen, Package } from "lucide-react";

export default async function OrderSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string; orderId?: string }>;
}) {
  const params = await searchParams;
  const user = await getCurrentUser();

  let order = null;
  if (params.orderId) {
    [order] = await db.select().from(orders).where(eq(orders.id, params.orderId)).limit(1);
  } else if (params.session_id) {
    [order] = await db.select().from(orders).where(eq(orders.stripeSessionId, params.session_id)).limit(1);
  }

  const items = order
    ? await db
        .select({ bookTitle: books.title, bookSlug: books.slug, formatName: orderItems.formatName, quantity: orderItems.quantity })
        .from(orderItems)
        .innerJoin(books, eq(orderItems.bookId, books.id))
        .where(eq(orderItems.orderId, order.id))
    : [];

  const hasDigital = items.some((i) => i.formatName === "EBOOK");
  const hasPhysical = items.some((i) => i.formatName !== "EBOOK");

  return (
    <div className="min-h-screen bg-[#F7F3EC] text-[#171513]">
      <Navbar user={user} />
      <main className="max-w-2xl mx-auto px-4 py-20 text-center">
        <CheckCircle className="w-16 h-16 text-[#C8A96B] mx-auto mb-6" />
        <span className="text-xs uppercase tracking-[0.3em] text-[#A88A55] font-semibold block mb-2">Payment Verified</span>
        <h1 className="font-serif text-4xl sm:text-5xl font-bold mb-4">Your order has been confirmed.</h1>
        {order && (
          <p className="text-sm text-[#171513]/70 mb-8">
            Order <span className="font-mono font-semibold">#{order.id.slice(0, 8)}</span> · ${Number(order.totalAmount).toFixed(2)} · Status:{" "}
            <span className="font-semibold text-[#C8A96B]">{order.status}</span>
          </p>
        )}

        <div className="bg-white rounded-2xl border border-[#171513]/10 p-8 text-left space-y-4 mb-8 shadow-sm">
          {items.map((i, idx) => (
            <div key={idx} className="flex justify-between text-sm">
              <span>
                {i.bookTitle} <span className="text-[#171513]/50">({i.formatName} × {i.quantity})</span>
              </span>
            </div>
          ))}
          {hasDigital && (
            <div className="pt-4 border-t border-[#171513]/10 flex items-start gap-3 bg-[#C8A96B]/10 p-4 rounded-xl">
              <BookOpen className="w-5 h-5 text-[#C8A96B] flex-shrink-0 mt-0.5" />
              <p className="text-sm">
                Your eBook{items.filter((i) => i.formatName === "EBOOK").length > 1 ? "s are" : " is"} now available in{" "}
                <Link href="/account/library" className="font-semibold underline text-[#171513]">My Library</Link>. Read online or download securely.
              </p>
            </div>
          )}
          {hasPhysical && (
            <div className="flex items-start gap-3 bg-[#FCFAF6] p-4 rounded-xl border border-[#171513]/10">
              <Package className="w-5 h-5 text-[#A88A55] flex-shrink-0 mt-0.5" />
              <p className="text-sm">Your physical editions will ship within 1–2 business days. Tracking details will be emailed to you.</p>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {hasDigital && (
            <Link href="/account/library" className="bg-[#171513] text-[#F7F3EC] px-8 py-4 rounded-xl font-semibold hover:bg-[#C8A96B] hover:text-[#171513]">
              Open My Library
            </Link>
          )}
          <Link href="/account/orders" className="border border-[#171513]/30 px-8 py-4 rounded-xl font-semibold hover:border-[#171513]">
            View Order History
          </Link>
          <Link href="/shop" className="border border-[#171513]/30 px-8 py-4 rounded-xl font-semibold hover:border-[#171513]">
            Continue Browsing
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
