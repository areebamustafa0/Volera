import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { orders, wishlists, libraries } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AccountNav } from "@/components/account/AccountNav";
import { getCurrentUser } from "@/lib/auth";
import { getHeaderCounts } from "@/lib/header-data";
import { OrderStatusBadge } from "@/components/account/OrderStatusBadge";
import { Package, Heart, Library, ArrowRight, ShieldCheck, AlertTriangle } from "lucide-react";

export const metadata: Metadata = { title: "My Account" };

export default async function AccountDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?redirect=/account");

  const headerCounts = await getHeaderCounts();

  const [orderStats, wishlistStats, libraryStats, recentOrders] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(orders).where(eq(orders.userId, user.id)),
    db.select({ count: sql<number>`count(*)::int` }).from(wishlists).where(eq(wishlists.userId, user.id)),
    db.select({ count: sql<number>`count(*)::int` }).from(libraries).where(eq(libraries.userId, user.id)),
    db.select().from(orders).where(eq(orders.userId, user.id)).orderBy(desc(orders.createdAt)).limit(3),
  ]);

  return (
    <div className="bg-[#f8f9fc] min-h-screen">
      <Navbar user={user} cartCount={headerCounts.cartCount} wishlistCount={headerCounts.wishlistCount} />

      <main id="main" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#0f172a]">Welcome back, {user.name.split(" ")[0]}</h1>
          <p className="text-[#475569] text-sm mt-1">{user.email}</p>
          {!user.emailVerified && (
            <div className="mt-3 inline-flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium px-3 py-2 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5" /> Please verify your email to unlock checkout, downloads, and reviews.
            </div>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <AccountNav />

          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatCard href="/account/orders" icon={Package} label="Orders" value={orderStats[0]?.count ?? 0} color="text-blue-600 bg-blue-50" />
              <StatCard href="/account/wishlist" icon={Heart} label="Wishlist Items" value={wishlistStats[0]?.count ?? 0} color="text-red-500 bg-red-50" />
              <StatCard href="/account/library" icon={Library} label="Books Owned" value={libraryStats[0]?.count ?? 0} color="text-emerald-600 bg-emerald-50" />
            </div>

            <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#e2e8f0]">
                <h2 className="font-bold text-[#0f172a]">Recent Orders</h2>
                <Link href="/account/orders" className="text-sm font-semibold text-[#2d5a9e] hover:underline flex items-center gap-1">
                  View all <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              {recentOrders.length === 0 ? (
                <div className="p-10 text-center">
                  <Package className="w-10 h-10 text-[#cbd5e1] mx-auto mb-3" />
                  <p className="text-sm text-[#475569] mb-4">You haven&apos;t placed an order yet.</p>
                  <Link href="/shop" className="inline-block bg-[#1e3a5f] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#132644]">
                    Start Shopping
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-[#e2e8f0]">
                  {recentOrders.map((o) => (
                    <li key={o.id} className="flex items-center justify-between px-5 py-4">
                      <div>
                        <p className="font-semibold text-sm text-[#0f172a]">Order #{o.id.slice(0, 8).toUpperCase()}</p>
                        <p className="text-xs text-[#94a3b8]">{new Date(o.createdAt).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <OrderStatusBadge status={o.status} />
                        <p className="text-sm font-bold text-[#0f172a] mt-1">${Number(o.totalAmount).toFixed(2)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white rounded-xl border border-[#e2e8f0] p-5 flex items-center gap-4">
              <ShieldCheck className="w-8 h-8 text-[#1e3a5f] shrink-0" />
              <div>
                <p className="font-semibold text-sm text-[#0f172a]">Your account is protected</p>
                <p className="text-xs text-[#475569] mt-0.5">Passwords are securely hashed and downloads are access-controlled per purchase.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function StatCard({ href, icon: Icon, label, value, color }: { href: string; icon: React.ComponentType<{ className?: string }>; label: string; value: number; color: string }) {
  return (
    <Link href={href} className="bg-white rounded-xl border border-[#e2e8f0] p-5 hover:shadow-md hover:border-[#cbd5e1] transition-all">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${color}`}>
        <Icon className="w-4.5 h-4.5" />
      </div>
      <p className="text-2xl font-bold text-[#0f172a]">{value}</p>
      <p className="text-xs text-[#94a3b8] font-medium mt-0.5">{label}</p>
    </Link>
  );
}


