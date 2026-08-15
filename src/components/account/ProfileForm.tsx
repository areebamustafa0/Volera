"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";

export function ProfileForm({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const [value, setValue] = useState(name);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setDone(false);
    const res = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: value }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (res.ok) {
      setDone(true);
      router.refresh();
      setTimeout(() => setDone(false), 3000);
    } else {
      setError(data.error || "Could not update profile");
    }
  };

  return (
    <form onSubmit={submit} className="bg-white rounded-xl border border-[#e2e8f0] p-6 space-y-4 max-w-lg">
      <h2 className="font-bold text-[#0f172a]">Personal Information</h2>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div>
        <label htmlFor="profile-name" className="block text-xs font-semibold text-[#475569] mb-1.5">Full Name</label>
        <input
          id="profile-name" required minLength={2} value={value} onChange={(e) => setValue(e.target.value)}
          className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d5a9e]/20 focus:border-[#2d5a9e]"
        />
      </div>
      <div>
        <label className="block text-xs font-semibold text-[#475569] mb-1.5">Email Address</label>
        <input value={email} disabled className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2.5 text-sm bg-[#f8f9fc] text-[#94a3b8]" />
        <p className="text-xs text-[#94a3b8] mt-1">Contact support to change your email address.</p>
      </div>
      <button type="submit" disabled={saving} className="bg-[#1e3a5f] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#132644] disabled:opacity-60 flex items-center gap-2">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : done ? <Check className="w-4 h-4" /> : null}
        {done ? "Saved" : "Save Changes"}
      </button>
    </form>
  );
}
