"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, BookOpen, Eye, EyeOff } from "lucide-react";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get("redirect") || "/account/library";

  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        mode === "login"
          ? { email: form.email, password: form.password }
          : { name: form.name, email: form.email, password: form.password }
      ),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) {
      router.push(redirectTo);
      router.refresh();
    } else {
      setError(data.error || "Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-[#e2e8f0] shadow-lg p-8">
      {/* Header */}
      <div className="text-center mb-7">
        <div className="w-12 h-12 bg-[#1e3a5f] rounded-xl flex items-center justify-center mx-auto mb-4">
          <BookOpen className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-[#0f172a]">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="text-[#475569] text-sm mt-1">
          {mode === "login" ? "Sign in to access your books and PDFs" : "Start buying books and reading PDFs instantly"}
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        {error && (
          <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">!</div>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {mode === "register" && (
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-[#0f172a] mb-1.5">
              Full name
            </label>
            <input
              id="name"
              type="text"
              required
              minLength={2}
              autoComplete="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-[#e2e8f0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d5a9e]/30 focus:border-[#2d5a9e] transition-all bg-[#f8f9fc] placeholder:text-[#94a3b8]"
              placeholder="Your full name"
            />
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-sm font-semibold text-[#0f172a] mb-1.5">
            Email address
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full border border-[#e2e8f0] rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d5a9e]/30 focus:border-[#2d5a9e] transition-all bg-[#f8f9fc] placeholder:text-[#94a3b8]"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="password" className="block text-sm font-semibold text-[#0f172a]">
              Password
            </label>
            {mode === "login" && (
              <Link href="/auth/forgot-password" className="text-xs text-[#2d5a9e] hover:underline">
                Forgot password?
              </Link>
            )}
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPw ? "text" : "password"}
              required
              minLength={mode === "register" ? 8 : 6}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full border border-[#e2e8f0] rounded-xl px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d5a9e]/30 focus:border-[#2d5a9e] transition-all bg-[#f8f9fc] placeholder:text-[#94a3b8]"
              placeholder={mode === "register" ? "At least 8 characters" : "Your password"}
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#475569] transition-colors"
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#1e3a5f] text-white py-3.5 rounded-xl font-bold text-sm hover:bg-[#132644] transition-colors disabled:opacity-60 flex items-center justify-center gap-2 mt-2 shadow-sm shadow-[#1e3a5f]/30"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {mode === "login" ? "Sign In" : "Create Account"}
        </button>
      </form>

      <div className="mt-5 text-center">
        <p className="text-sm text-[#475569]">
          {mode === "login" ? (
            <>New here?{" "}<Link href="/auth/register" className="text-[#2d5a9e] font-semibold hover:underline">Create an account</Link></>
          ) : (
            <>Already have an account?{" "}<Link href="/auth/login" className="text-[#2d5a9e] font-semibold hover:underline">Sign in</Link></>
          )}
        </p>
      </div>

      {mode === "login" && (
        <div className="mt-5 pt-5 border-t border-[#e2e8f0]">
          <p className="text-xs text-[#94a3b8] text-center font-medium mb-2">Demo accounts</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Customer", email: "customer@velorabooks.com", pw: "Customer123!" },
              { label: "Admin", email: "admin@velorabooks.com", pw: "Admin123!" },
            ].map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={() => setForm({ ...form, email: a.email, password: a.pw })}
                className="text-xs bg-[#f8f9fc] border border-[#e2e8f0] rounded-lg px-3 py-2 text-[#475569] hover:border-[#2d5a9e] hover:text-[#2d5a9e] transition-colors text-left"
              >
                <span className="font-semibold block">{a.label}</span>
                <span className="text-[#94a3b8] text-[10px]">Click to fill</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
