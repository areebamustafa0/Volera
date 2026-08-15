"use client";

import React, { useState, useEffect } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { useRouter } from "next/navigation";
import { Lock, ArrowRight, Tag, ShieldCheck } from "lucide-react";
import { computeShipping, computeTax } from "@/lib/pricing";

interface CartResponse {
  items: { id: number; quantity: number; book: { title: string }; format: { format: string; price: string } }[];
  subtotal: number;
}

export default function CheckoutPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cartData, setCartData] = useState<CartResponse>({ items: [], subtotal: 0 });
  const [taxRate, setTaxRate] = useState(0);

  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponMsg, setCouponMsg] = useState("");

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "United States",
    phone: "",
  });

  useEffect(() => {
    fetch("/api/cart")
      .then((res) => res.json())
      .then((data) => setCartData(data))
      .catch(() => undefined);

    // Tax rate is configured server-side; the client only mirrors it for display.
    fetch("/api/pricing-config")
      .then((res) => res.json())
      .then((d) => setTaxRate(Number(d.taxRate) || 0))
      .catch(() => undefined);
  }, []);

  const hasPhysical = cartData.items.some((i) => i.format.format !== "EBOOK");
  const discount = appliedCoupon?.discount ?? 0;
  /**
   * Display-only estimate using the SAME pricing helpers as the server.
   * The authoritative figures are always recomputed server-side at checkout.
   */
  const afterDiscount = Math.max(cartData.subtotal - discount, 0);
  const pricingLines = cartData.items.map((i) => ({
    format: i.format.format as "HARDCOVER" | "PAPERBACK" | "EBOOK",
    unitPrice: Number(i.format.price),
    quantity: i.quantity,
  }));
  const shipping = computeShipping(pricingLines, afterDiscount);
  const tax = computeTax(afterDiscount, shipping, { taxRate: taxRate ?? 0 });
  const total = Math.round((afterDiscount + shipping + tax) * 100) / 100;

  const applyCoupon = async () => {
    setCouponMsg("");
    const res = await fetch("/api/coupons/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: couponCode, subtotal: cartData.subtotal }),
    });
    const data = await res.json();
    if (data.valid) {
      setAppliedCoupon({ code: data.code, discount: data.discount });
      setCouponMsg(`Coupon ${data.code} applied — you save $${data.discount.toFixed(2)}`);
    } else {
      setAppliedCoupon(null);
      setCouponMsg(data.reason ?? "Invalid coupon");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/payments/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          couponCode: appliedCoupon?.code,
          // Full address snapshot is stored on the order for physical goods
          shipping: hasPhysical
            ? {
                fullName: formData.fullName,
                addressLine1: formData.addressLine1,
                addressLine2: formData.addressLine2,
                city: formData.city,
                state: formData.state,
                postalCode: formData.postalCode,
                country: formData.country,
                phone: formData.phone,
              }
            : undefined,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (data.code === "PAYMENTS_NOT_CONFIGURED") {
          setError(
            "Payments are not configured on this deployment, so no order was created and no charge was made. " +
              "Add STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET to enable checkout."
          );
        } else if (data.code === "EMAIL_UNVERIFIED") {
          setError("Please verify your email address before checking out. Check your inbox for the link.");
        } else {
          setError(data.error ?? "Checkout failed");
        }
        setLoading(false);
        return;
      }

      // Hosted Stripe Checkout — payment is confirmed later by the signed webhook
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError("Checkout session could not be started.");
      setLoading(false);
    } catch {
      setError("Unable to reach the payment service");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F3EC] text-[#171513]">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-[#A88A55] font-semibold mb-8">
          <Lock className="w-3.5 h-3.5" /> Secure Encrypted Checkout · Prices verified server-side
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Customer & shipping */}
          <div className="lg:col-span-7 space-y-8 bg-white p-8 rounded-2xl border border-[#171513]/10 shadow-sm">
            <div>
              <h3 className="font-serif font-bold text-2xl mb-1">Customer & Delivery</h3>
              <p className="text-xs text-[#171513]/60 font-light">
                {hasPhysical ? "Where should we deliver your physical editions?" : "Digital-only order — no shipping required. Access is granted instantly after payment."}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Full Name" value={formData.fullName} onChange={(v) => setFormData({ ...formData, fullName: v })} required />
              <Field label="Email Address" type="email" value={formData.email} onChange={(v) => setFormData({ ...formData, email: v })} required />
            </div>

            {hasPhysical && (
              <>
                <Field label="Street Address" value={formData.addressLine1} onChange={(v) => setFormData({ ...formData, addressLine1: v })} required />
                <Field label="Apartment, suite (optional)" value={formData.addressLine2} onChange={(v) => setFormData({ ...formData, addressLine2: v })} />
                <div className="grid grid-cols-3 gap-4">
                  <Field label="City" value={formData.city} onChange={(v) => setFormData({ ...formData, city: v })} required />
                  <Field label="State" value={formData.state} onChange={(v) => setFormData({ ...formData, state: v })} required />
                  <Field label="Postal Code" value={formData.postalCode} onChange={(v) => setFormData({ ...formData, postalCode: v })} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Country" value={formData.country} onChange={(v) => setFormData({ ...formData, country: v })} required />
                  <Field label="Phone" value={formData.phone} onChange={(v) => setFormData({ ...formData, phone: v })} required />
                </div>
              </>
            )}

            <div className="pt-6 border-t border-[#171513]/10 flex items-start gap-3 bg-[#FCFAF6] p-4 rounded-xl border border-[#171513]/10">
              <ShieldCheck className="w-5 h-5 text-[#C8A96B] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-[#171513]/70 leading-relaxed">
                Payment is processed by <strong>Stripe</strong> on encrypted infrastructure. Velora never sees or stores
                card numbers. Order status is set exclusively by our signature-verified payment webhook — never by the
                browser. If Stripe is not configured, checkout is disabled outright rather than simulated.
              </p>
            </div>
          </div>

          {/* Summary */}
          <div className="lg:col-span-5 bg-white p-8 rounded-2xl border border-[#171513]/10 space-y-6 shadow-sm">
            <h3 className="font-serif font-bold text-xl pb-4 border-b border-[#171513]/15">Order Summary</h3>

            <div className="space-y-4 max-h-64 overflow-y-auto">
              {cartData.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4 text-sm">
                  <div>
                    <p className="font-serif font-semibold">{item.book.title}</p>
                    <p className="text-xs text-[#171513]/60">{item.format.format} × {item.quantity}</p>
                  </div>
                  <span className="font-semibold">${(Number(item.format.price) * item.quantity).toFixed(2)}</span>
                </div>
              ))}
              {cartData.items.length === 0 && <p className="text-sm text-[#171513]/50 italic">Your bag is empty.</p>}
            </div>

            {/* Coupon */}
            <div className="pt-4 border-t border-[#171513]/15">
              <label className="flex items-center gap-1 text-xs uppercase tracking-wider text-[#A88A55] font-semibold mb-2">
                <Tag className="w-3.5 h-3.5" /> Coupon Code
              </label>
              <div className="flex gap-2">
                <input
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="VELORA10"
                  className="flex-1 bg-[#F7F3EC] border border-[#171513]/20 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#C8A96B]"
                />
                <button type="button" onClick={applyCoupon} className="border border-[#171513]/20 px-4 py-2 rounded-lg text-xs font-semibold hover:border-[#C8A96B]">
                  Apply
                </button>
              </div>
              {couponMsg && <p className={`text-xs mt-2 ${appliedCoupon ? "text-green-700" : "text-red-600"}`}>{couponMsg}</p>}
            </div>

            <div className="space-y-3 text-sm font-light pt-4 border-t border-[#171513]/15">
              <Row label="Subtotal" value={`$${cartData.subtotal.toFixed(2)}`} />
              {discount > 0 && <Row label={`Discount (${appliedCoupon?.code})`} value={`−$${discount.toFixed(2)}`} accent />}
              <Row label="Shipping" value={shipping === 0 ? "FREE" : `$${shipping.toFixed(2)}`} />
              {tax > 0 && <Row label="Estimated tax" value={`$${tax.toFixed(2)}`} />}
              <div className="flex justify-between font-serif font-bold text-lg pt-4 border-t border-[#171513]/15">
                <span>Total</span>
                <span className="text-[#C8A96B]">${total.toFixed(2)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || cartData.items.length === 0}
              className="w-full bg-[#171513] text-[#F7F3EC] py-4 rounded-xl font-semibold hover:bg-[#C8A96B] hover:text-[#171513] transition-colors flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
            >
              {loading ? "Creating secure session…" : `Pay $${total.toFixed(2)} Securely`} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      <Footer />
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required = false }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-wider text-[#A88A55] font-semibold mb-2">{label}</label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[#F7F3EC] border border-[#171513]/20 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-[#C8A96B]"
      />
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-[#171513]/70">{label}</span>
      <span className={`font-semibold ${accent ? "text-green-700" : ""}`}>{value}</span>
    </div>
  );
}
