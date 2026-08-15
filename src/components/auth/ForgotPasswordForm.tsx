"use client";
import React, { useState } from "react";
import Link from "next/link";
import { Loader2, Mail, ArrowLeft } from "lucide-react";
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setLoading(true);
    await fetch("/api/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) }).catch(() => {});
    setLoading(false); setDone(true);
  };
  return (
    <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-lg p-8">
      <div className="text-center mb-7">
        <div className="w-12 h-12 bg-[#1e3a5f] rounded-xl flex items-center justify-center mx-auto mb-4"><Mail className="w-6 h-6 text-white" /></div>
        <h1 className="text-2xl font-bold text-[#0f172a]">Reset your password</h1>
        <p className="text-[#475569] text-sm mt-1">Enter your email and we'll send a reset link</p>
      </div>
      {done ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
          <p className="text-green-800 font-semibold text-sm">If that email exists, a reset link is on its way.</p>
          <Link href="/auth/login" className="inline-flex items-center gap-2 mt-4 text-sm text-[#2d5a9e] hover:underline"><ArrowLeft className="w-4 h-4" /> Back to login</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-[#0f172a] mb-1.5">Email address</label>
            <input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} className="w-full border border-[#e2e8f0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d5a9e]/30 focus:border-[#2d5a9e] bg-[#f8f9fc]" placeholder="you@example.com" />
          </div>
          <button type="submit" disabled={loading} className="w-full bg-[#1e3a5f] text-white py-3.5 rounded-xl font-bold text-sm hover:bg-[#132644] transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />} Send Reset Link
          </button>
          <Link href="/auth/login" className="flex items-center justify-center gap-2 text-sm text-[#475569] hover:text-[#1e3a5f] transition-colors"><ArrowLeft className="w-4 h-4" /> Back to login</Link>
        </form>
      )}
    </div>
  );
}
