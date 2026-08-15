import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { orders, orderItems, books } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AccountNav } from "@/components/account/AccountNav";
import { OrderStatusBadge } from "@/components/account/OrderStatusBadge";
import { getCurrentUser } from "@/lib/auth";
import { getHeaderCounts } from "@/lib/header-data";
import { Package } from "lucide-react";

export const metadata: Metadata = { title: "My Orders" };

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?redirect=/account/orders");

  const headerCounts = await getHeaderCounts();

  const userOrders = await db.select().from(orders).where(eq(orders.userId, user.id)).orderBy(desc(orders.createdAt));
  const withItems = await Promise.all(
    userOrders.map(async (order) => {
      const items = await db
        .select({
          id: orderItems.id, quantity: orderItems.quantity, price: orderItems.price,
          formatName: orderItems.formatName, bookTitle: orderItems.bookTitle,
          bookSlug: books.slug, bookCover: books.coverImage,
        })
        .from(orderItems)
        .leftJoin(books, eq(orderItems.bookId, books.id))
        .where(eq(orderItems.orderId, order.id));
      return { ...order, items };
    })
  );

  return (
    <div className="bg-[#f8f9fc] min-h-screen">
      <Navbar user={user} cartCount={headerCounts.cartCount} wishlistCount={headerCounts.wishlistCount} />

      <main id="main" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-2xl font-bold text-[#0f172a] mb-6">My Orders</h1>

        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <AccountNav />

          <div>
            {withItems.length === 0 ? (
              <div className="bg-white rounded-xl border border-[#e2e8f0] p-16 text-center">
                <Package className="w-14 h-14 text-[#cbd5e1] mx-auto mb-4" />
                <h2 className="text-lg font-bold text-[#0f172a] mb-1">You haven&apos;t placed an order yet.</h2>
                <p className="text-sm text-[#475569] mb-6">When you do, your order history will show up here.</p>
                <Link href="/shop" className="inline-block bg-[#1e3a5f] text-white px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-[#132644]">
                  Browse Books
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {withItems.map((order) => (
                  <details key={order.id} className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden group">
                    <summary className="flex items-center justify-between gap-4 px-5 py-4 cursor-pointer list-none">
                      <div>
                        <p className="font-bold text-sm text-[#0f172a]">Order #{order.id.slice(0, 8).toUpperCase()}</p>
                        <p className="text-xs text-[#94a3b8] mt-0.5">
                          {new Date(order.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })} · {order.items.length} item{order.items.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <OrderStatusBadge status={order.status} />
                          <p className="text-sm font-bold text-[#0f172a] mt-1">${Number(order.totalAmount).toFixed(2)}</p>
                        </div>
                        <span className="text-[#94a3b8] text-xs font-semibold group-open:rotate-180 transition-transform">▾</span>
                      </div>
                    </summary>

                    <div className="border-t border-[#e2e8f0] px-5 py-4 bg-[#f8f9fc]">
                      <ul className="space-y-3 mb-4">
                        {order.items.map((item) => (
                          <li key={item.id} className="flex items-center gap-3">
                            <div className="relative w-10 h-14 rounded overflow-hidden bg-[#e2e8f0] shrink-0">
                              {item.bookCover && <Image src={item.bookCover} alt={item.bookTitle} fill className="object-cover" sizes="40px" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              {item.bookSlug ? (
                                <Link href={`/books/${item.bookSlug}`} className="text-sm font-semibold text-[#0f172a] hover:text-[#2d5a9e] truncate block">{item.bookTitle}</Link>
                              ) : (
                                <p className="text-sm font-semibold text-[#0f172a] truncate">{item.bookTitle}</p>
                              )}
                              <p className="text-xs text-[#94a3b8]">{item.formatName === "EBOOK" ? "PDF eBook" : item.formatName} × {item.quantity}</p>
                            </div>
                            <p className="text-sm font-semibold text-[#0f172a]">${(Number(item.price) * item.quantity).toFixed(2)}</p>
                          </li>
                        ))}
                      </ul>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs border-t border-[#e2e8f0] pt-3">
                        <SummaryLine label="Subtotal" value={`$${Number(order.subtotalAmount).toFixed(2)}`} />
                        <SummaryLine label="Shipping" value={`$${Number(order.shippingAmount).toFixed(2)}`} />
                        <SummaryLine label="Tax" value={`$${Number(order.taxAmount).toFixed(2)}`} />
                        <SummaryLine label="Total" value={`$${Number(order.totalAmount).toFixed(2)}`} bold />
                      </div>
                      {order.items.some((i) => i.formatName === "EBOOK") && order.status !== "PENDING" && (
                        <Link href="/account/library" className="inline-block mt-4 text-sm font-semibold text-[#2d5a9e] hover:underline">
                          Go to My Books to read or download →
                        </Link>
                      )}
                    </div>
                  </details>
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

function SummaryLine({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div>
      <p className="text-[#94a3b8]">{label}</p>
      <p className={`mt-0.5 ${bold ? "font-bold text-[#0f172a]" : "font-medium text-[#475569]"}`}>{value}</p>
    </div>
  );
}
