import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";
export const metadata: Metadata = { title: "Reset Password" };
export default function Page() {
  return (
    <div className="bg-[#f8f9fc] min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-md w-full mx-auto px-4 py-12">
        <ForgotPasswordForm />
      </main>
      <Footer />
    </div>
  );
}
