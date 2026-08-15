import { NextResponse } from "next/server";
import { db } from "@/db";
import { coupons } from "@/db/schema";
import { eq } from "drizzle-orm";
import { validateCoupon, computeDiscount } from "@/lib/pricing";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { z } from "zod";
import { csrfGuard } from "@/lib/csrf";

const schema = z.object({
  code: z.string().trim().min(1).max(40),
  subtotal: z.number().min(0).max(1_000_000),
});

/** Server-side coupon validation. Never trust client discount math. */
export async function POST(request: Request) {
  const __csrf = csrfGuard(request);
  if (__csrf) return __csrf;

  const rl = rateLimit(`coupon:${clientKey(request)}`, 15, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const [coupon] = await db
    .select()
    .from(coupons)
    .where(eq(coupons.code, parsed.data.code.toUpperCase()))
    .limit(1);

  const check = validateCoupon(
    coupon
      ? {
          isActive: coupon.isActive,
          expiresAt: coupon.expiresAt,
          usageLimit: coupon.usageLimit,
          usageCount: coupon.usageCount,
          minOrderAmount: Number(coupon.minOrderAmount),
        }
      : null,
    parsed.data.subtotal
  );

  if (!check.valid || !coupon) {
    return NextResponse.json({ valid: false, reason: check.reason ?? "Coupon not found" });
  }

  const discount = computeDiscount(
    {
      discountPercent: coupon.discountPercent,
      fixedAmount: coupon.fixedAmount ? Number(coupon.fixedAmount) : null,
      maxDiscount: coupon.maxDiscount ? Number(coupon.maxDiscount) : null,
    },
    parsed.data.subtotal
  );

  return NextResponse.json({ valid: true, discount, code: coupon.code });
}
