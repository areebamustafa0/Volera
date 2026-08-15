"use client";

import React, { useState } from "react";
import { Loader2, Check, ShieldCheck } from "lucide-react";

export function PasswordForm() {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (form.newPassword !== form.confirm) {
      setError("New passwords do not match");
      return;
    }
    if (form.newPassword.length < 8) {
      setError("New password must be at least 8 characters");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/account/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (res.ok) {
      setDone(true);
      setForm({ currentPassword: "", newPassword: "", confirm: "" });
      setTimeout(() => setDone(false), 3000);
    } else {
      setError(data.error || "Could not update password");
    }
  };

  return (
    <form onSubmit={submit} className="bg-white rounded-xl border border-[#e2e8f0] p-6 space-y-4 max-w-lg">
      <h2 className="font-bold text-[#0f172a] flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-[#1e3a5f]" /> Change Password</h2>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Field label="Current Password" type="password" value={form.currentPassword} onChange={(v) => setForm({ ...form, currentPassword: v })} />
      <Field label="New Password" type="password" value={form.newPassword} onChange={(v) => setForm({ ...form, newPassword: v })} hint="At least 8 characters" />
      <Field label="Confirm New Password" type="password" value={form.confirm} onChange={(v) => setForm({ ...form, confirm: v })} />
      <button type="submit" disabled={saving} className="bg-[#1e3a5f] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#132644] disabled:opacity-60 flex items-center gap-2">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : done ? <Check className="w-4 h-4" /> : null}
        {done ? "Password Updated" : "Update Password"}
      </button>
    </form>
  );
}

function Field({ label, type, value, onChange, hint }: { label: string; type: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#475569] mb-1.5">{label}</label>
      <input
        type={type} required minLength={type === "password" ? undefined : undefined} value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d5a9e]/20 focus:border-[#2d5a9e]"
      />
      {hint && <p className="text-xs text-[#94a3b8] mt-1">{hint}</p>}
    </div>
  );
}
