import React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AccountNav } from "@/components/account/AccountNav";
import { PasswordForm } from "@/components/account/PasswordForm";
import { getCurrentUser } from "@/lib/auth";
import { getHeaderCounts } from "@/lib/header-data";
import { ShieldCheck, Mail } from "lucide-react";

export const metadata: Metadata = { title: "Account Security" };

export default async function SecurityPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login?redirect=/account/security");
  const headerCounts = await getHeaderCounts();

  return (
    <div className="bg-[#f8f9fc] min-h-screen">
      <Navbar user={user} cartCount={headerCounts.cartCount} wishlistCount={headerCounts.wishlistCount} />
      <main id="main" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-2xl font-bold text-[#0f172a] mb-6">Account Security</h1>
        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <AccountNav />
          <div className="space-y-4 max-w-lg">
            <div className="bg-white rounded-xl border border-[#e2e8f0] p-5 flex items-center gap-3">
              <Mail className="w-5 h-5 text-[#1e3a5f] shrink-0" />
              <div>
                <p className="text-sm font-semibold text-[#0f172a]">Email verification</p>
                <p className="text-xs text-[#475569] mt-0.5">
                  {user.emailVerified ? "Your email address is verified." : "Your email is not verified yet. Check your inbox for a verification link."}
                </p>
              </div>
              <span className={`ml-auto text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded-full shrink-0 ${user.emailVerified ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                {user.emailVerified ? "Verified" : "Pending"}
              </span>
            </div>
            <PasswordForm />
            <div className="bg-white rounded-xl border border-[#e2e8f0] p-5 flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-[#1e3a5f] shrink-0" />
              <p className="text-xs text-[#475569]">Passwords are hashed with bcrypt and never stored or logged in plain text.</p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
