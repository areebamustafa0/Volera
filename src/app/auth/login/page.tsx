import React, { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { AuthForm } from "@/components/auth/AuthForm";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Sign In" };

export default async function Page() {
  const user = await getCurrentUser();
  if (user) redirect("/account/library");

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-md w-full mx-auto px-4 py-12">
        <Suspense fallback={<div className="bg-white p-8 rounded-xl text-center text-sm">Loading…</div>}>
          <AuthForm mode="login" />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
