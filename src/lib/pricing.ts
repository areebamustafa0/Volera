/**
 * Pure, deterministic price computation. Never trust client-submitted prices —
 * the server recalculates everything from database values using these helpers.
 * All amounts are handled as numbers rounded to cents at the boundary.
 */

export type FormatName = "HARDCOVER" | "PAPERBACK" | "EBOOK";

export interface PricingLine {
  format: FormatName;
  unitPrice: number;
  quantity: number;
}

export interface CouponSpec {
  discountPercent?: number | null;
  fixedAmount?: number | null;
  minOrderAmount?: number | null;
  maxDiscount?: number | null;
  expiresAt?: Date | null;
  isActive?: boolean;
  usageLimit?: number | null;
  usageCount?: number;
}

export interface TotalsOptions {
  /** Fractional rate, e.g. 0.0825 for 8.25%. Defaults to TAX_RATE env or 0. */
  taxRate?: number;
  /** Some jurisdictions tax delivery charges. Defaults to false. */
  taxShipping?: boolean;
}

export const FREE_SHIPPING_THRESHOLD = 75;
export const FLAT_SHIPPING = 5.99;

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Configured tax rate, validated and clamped to a sane range. */
export function getConfiguredTaxRate(): number {
  const raw = Number(process.env.TAX_RATE);
  if (!Number.isFinite(raw) || raw < 0 || raw > 1) return 0;
  return raw;
}

export function validateCoupon(
  coupon: CouponSpec | null | undefined,
  subtotal: number
): { valid: boolean; reason?: string } {
  if (!coupon) return { valid: false, reason: "Coupon not found" };
  if (coupon.isActive === false) return { valid: false, reason: "Coupon is no longer active" };
  if (coupon.expiresAt && coupon.expiresAt.getTime() < Date.now()) {
    return { valid: false, reason: "Coupon has expired" };
  }
  if (coupon.usageLimit != null && (coupon.usageCount ?? 0) >= coupon.usageLimit) {
    return { valid: false, reason: "Coupon usage limit reached" };
  }
  const min = coupon.minOrderAmount ?? 0;
  if (subtotal < min) {
    return { valid: false, reason: `Order must be at least $${min.toFixed(2)} to use this coupon` };
  }
  return { valid: true };
}

export function computeDiscount(coupon: CouponSpec, subtotal: number): number {
  let discount = 0;
  if (coupon.discountPercent) {
    discount = subtotal * (coupon.discountPercent / 100);
  } else if (coupon.fixedAmount) {
    discount = coupon.fixedAmount;
  }
  if (coupon.maxDiscount != null) {
    discount = Math.min(discount, coupon.maxDiscount);
  }
  return round2(Math.min(discount, subtotal));
}

/**
 * Shipping rules:
 *   - digital-only orders never pay shipping
 *   - physical/mixed orders ship free at/above the threshold (post-discount)
 *   - otherwise a flat rate applies
 */
export function computeShipping(lines: PricingLine[], amountAfterDiscount: number): number {
  const hasPhysical = lines.some((l) => l.format !== "EBOOK");
  if (!hasPhysical) return 0;
  if (amountAfterDiscount <= 0) return 0;
  return amountAfterDiscount >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING;
}

/** Tax is charged on the discounted goods total (and optionally shipping). */
export function computeTax(
  amountAfterDiscount: number,
  shipping: number,
  options: TotalsOptions = {}
): number {
  const rate = options.taxRate ?? getConfiguredTaxRate();
  if (rate <= 0) return 0;
  const base = Math.max(amountAfterDiscount, 0) + (options.taxShipping ? shipping : 0);
  return round2(base * rate);
}

export function computeTotals(
  lines: PricingLine[],
  coupon: CouponSpec | null,
  options: TotalsOptions = {}
): {
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  hasPhysical: boolean;
  hasDigital: boolean;
} {
  const subtotal = round2(lines.reduce((acc, l) => acc + l.unitPrice * l.quantity, 0));
  const discount = coupon ? computeDiscount(coupon, subtotal) : 0;
  const hasPhysical = lines.some((l) => l.format !== "EBOOK");
  const hasDigital = lines.some((l) => l.format === "EBOOK");

  const afterDiscount = round2(subtotal - discount);
  const shipping = computeShipping(lines, afterDiscount);
  const tax = computeTax(afterDiscount, shipping, options);
  const total = round2(Math.max(afterDiscount + shipping + tax, 0));

  return { subtotal, discount, shipping, tax, total, hasPhysical, hasDigital };
}
