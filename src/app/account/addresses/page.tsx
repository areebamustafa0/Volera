import React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AccountNav } from "@/components/account/AccountNav";
import { AddressManager } from "@/components/account/AddressManager";
import { getCurrentUser } from "@/lib/auth";
import { getHeaderCounts } from "@/lib/header-data";

export const metadata: Metadata = { title: "My Addresses" };

export default async function AddressesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?redirect=/account/addresses");
  const headerCounts = await getHeaderCounts();

  return (
    <div className="bg-[#f8f9fc] min-h-screen">
      <Navbar user={user} cartCount={headerCounts.cartCount} wishlistCount={headerCounts.wishlistCount} />
      <main id="main" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-2xl font-bold text-[#0f172a] mb-6">My Addresses</h1>
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <AccountNav />
          <div className="max-w-2xl">
            <AddressManager />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
