"use client";

import React, { useEffect, useState } from "react";
import { Plus, Loader2, Trash2, MapPin, Star, X } from "lucide-react";

interface Address {
  id: number;
  fullName: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  isDefault: boolean;
}

const EMPTY = { fullName: "", addressLine1: "", addressLine2: "", city: "", state: "", postalCode: "", country: "United States", phone: "" };

export function AddressManager() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = () => {
    fetch("/api/account/addresses")
      .then((r) => r.json())
      .then((d) => setAddresses(d.addresses ?? []))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const res = await fetch("/api/account/addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (res.ok) {
      setForm(EMPTY);
      setShowForm(false);
      load();
    } else {
      setError(data.error || "Could not save address");
    }
  };

  const remove = async (id: number) => {
    await fetch("/api/account/addresses", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  };

  const setDefault = async (id: number) => {
    await fetch("/api/account/addresses", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    load();
  };

  if (loading) {
    return <div className="space-y-3">{[1, 2].map((i) => <div key={i} className="h-24 bg-white rounded-xl skeleton" />)}</div>;
  }

  return (
    <div className="space-y-4">
      {addresses.length === 0 && !showForm && (
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-10 text-center">
          <MapPin className="w-10 h-10 text-[#cbd5e1] mx-auto mb-3" />
          <p className="text-sm text-[#475569] mb-4">You haven&apos;t saved any addresses yet.</p>
        </div>
      )}

      {addresses.map((a) => (
        <div key={a.id} className="bg-white rounded-xl border border-[#e2e8f0] p-5 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <p className="font-semibold text-sm text-[#0f172a]">{a.fullName}</p>
              {a.isDefault && <span className="badge badge-new text-[9px]">Default</span>}
            </div>
            <p className="text-sm text-[#475569]">{a.addressLine1}{a.addressLine2 ? `, ${a.addressLine2}` : ""}</p>
            <p className="text-sm text-[#475569]">{a.city}, {a.state} {a.postalCode}</p>
            <p className="text-sm text-[#475569]">{a.country} · {a.phone}</p>
          </div>
          <div className="flex flex-col gap-2 items-end shrink-0">
            {!a.isDefault && (
              <button onClick={() => setDefault(a.id)} className="flex items-center gap-1 text-xs text-[#2d5a9e] hover:underline font-medium">
                <Star className="w-3 h-3" /> Set default
              </button>
            )}
            <button onClick={() => remove(a.id)} className="flex items-center gap-1 text-xs text-red-600 hover:underline font-medium">
              <Trash2 className="w-3 h-3" /> Remove
            </button>
          </div>
        </div>
      ))}

      {showForm ? (
        <form onSubmit={submit} className="bg-white rounded-xl border border-[#e2e8f0] p-5 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-sm text-[#0f172a]">New Address</h3>
            <button type="button" onClick={() => setShowForm(false)} aria-label="Cancel" className="text-[#94a3b8] hover:text-[#475569]"><X className="w-4 h-4" /></button>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Full Name" value={form.fullName} onChange={(v) => setForm({ ...form, fullName: v })} required />
            <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} required />
          </div>
          <Field label="Address Line 1" value={form.addressLine1} onChange={(v) => setForm({ ...form, addressLine1: v })} required />
          <Field label="Address Line 2 (optional)" value={form.addressLine2} onChange={(v) => setForm({ ...form, addressLine2: v })} />
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} required />
            <Field label="State" value={form.state} onChange={(v) => setForm({ ...form, state: v })} required />
            <Field label="Postal Code" value={form.postalCode} onChange={(v) => setForm({ ...form, postalCode: v })} required />
          </div>
          <Field label="Country" value={form.country} onChange={(v) => setForm({ ...form, country: v })} required />
          <button type="submit" disabled={saving} className="bg-[#1e3a5f] text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#132644] disabled:opacity-60 flex items-center gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />} Save Address
          </button>
        </form>
      ) : (
        <button onClick={() => setShowForm(true)} className="w-full flex items-center justify-center gap-2 border-2 border-dashed border-[#e2e8f0] rounded-xl py-4 text-sm font-semibold text-[#475569] hover:border-[#1e3a5f] hover:text-[#1e3a5f] transition-colors">
          <Plus className="w-4 h-4" /> Add New Address
        </button>
      )}
    </div>
  );
}

function Field({ label, value, onChange, required }: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#475569] mb-1">{label}</label>
      <input
        value={value} onChange={(e) => onChange(e.target.value)} required={required}
        className="w-full border border-[#e2e8f0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#2d5a9e]/20 focus:border-[#2d5a9e]"
      />
    </div>
  );
}
