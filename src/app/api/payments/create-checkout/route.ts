import { NextResponse } from "next/server";
import { db } from "@/db";
import { carts, cartItems, bookFormats, books, authors, orders, orderItems, coupons, addresses } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { computeTotals, validateCoupon, type PricingLine } from "@/lib/pricing";
import { isStripeConfigured, getStripe } from "@/lib/payments/stripe";
import { reserveStock, expireStaleReservations, releaseReservation, InsufficientStockError, RESERVATION_MINUTES } from "@/services/inventory.service";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { captureException } from "@/lib/monitoring";
import { csrfGuard } from "@/lib/csrf";
import { z } from "zod";
import crypto from "crypto";

const shippingSchema = z.object({
  fullName: z.string().min(2).max(120),
  addressLine1: z.string().min(3).max(200),
  addressLine2: z.string().max(200).optional().or(z.literal("")),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  postalCode: z.string().min(2).max(20),
  country: z.string().min(2).max(80).default("United States"),
  phone: z.string().min(5).max(40).optional().or(z.literal("")),
});

const checkoutSchema = z.object({
  couponCode: z.string().trim().max(40).optional(),
  addressId: z.number().int().positive().optional(),
  shipping: shippingSchema.optional(),
});

export async function POST(request: Request) {
  const csrf = csrfGuard(request);
  if (csrf) return csrf;

  const rl = rateLimit(`checkout:${clientKey(request)}`, 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many checkout attempts. Please try again shortly." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    );
  }

  /**
   * HARD REQUIREMENT: a real payment provider must be configured.
   * There is no environment variable, flag, or code path that can bypass
   * this. Missing Stripe credentials => checkout is unavailable, always.
   */
  if (!isStripeConfigured()) {
    await captureException(new Error("Checkout attempted while Stripe is not configured"));
    return NextResponse.json(
      {
        error: "Payments are not configured. No order was created and no charge was made.",
        code: "PAYMENTS_NOT_CONFIGURED",
      },
      { status: 503 }
    );
  }

  let createdOrderId: string | null = null;

  try {
    const parsed = checkoutSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid checkout payload" }, { status: 400 });
    }

    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Please sign in to check out" }, { status: 401 });

    // Email verification gate for purchases
    if (!user.emailVerified) {
      return NextResponse.json(
        { error: "Please verify your email address before checking out.", code: "EMAIL_UNVERIFIED" },
        { status: 403 }
      );
    }

    void expireStaleReservations().catch(() => undefined);

    const [activeCart] = await db.select().from(carts).where(eq(carts.userId, user.id)).limit(1);
    if (!activeCart) return NextResponse.json({ error: "Your bag is empty" }, { status: 400 });

    const lines = await db
      .select({
        quantity: cartItems.quantity,
        bookId: cartItems.bookId,
        formatId: cartItems.formatId,
        format: bookFormats.format,
        price: bookFormats.price,
        stock: bookFormats.stock,
        reserved: bookFormats.reservedStock,
        title: books.title,
        authorName: authors.name,
      })
      .from(cartItems)
      .innerJoin(bookFormats, eq(cartItems.formatId, bookFormats.id))
      .innerJoin(books, eq(cartItems.bookId, books.id))
      .innerJoin(authors, eq(books.authorId, authors.id))
      .where(eq(cartItems.cartId, activeCart.id));

    if (lines.length === 0) return NextResponse.json({ error: "Your bag is empty" }, { status: 400 });

    /**
     * Idempotency: a stable fingerprint of (cart, contents, coupon). Rapid
     * repeated clicks resolve to the SAME order and the SAME Stripe session
     * instead of creating duplicates.
     */
    const fingerprint = crypto
      .createHash("sha256")
      .update(
        JSON.stringify({
          cart: activeCart.id,
          coupon: parsed.data.couponCode ?? "",
          items: lines
            .map((l) => `${l.formatId}x${l.quantity}@${l.price}`)
            .sort(),
        })
      )
      .digest("hex")
      .slice(0, 48);
    const idempotencyKey = `co_${activeCart.id}_${fingerprint}`;

    const [existing] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.idempotencyKey, idempotencyKey), eq(orders.status, "PENDING")))
      .limit(1);

    if (existing?.stripeSessionId) {
      const session = await getStripe().checkout.sessions.retrieve(existing.stripeSessionId);
      if (session.status === "open" && session.url) {
        return NextResponse.json({ mode: "stripe", url: session.url, reused: true });
      }
    }

    const pricingLines: PricingLine[] = lines.map((l) => ({
      format: l.format as PricingLine["format"],
      unitPrice: Number(l.price),
      quantity: l.quantity,
    }));
    const subtotal = pricingLines.reduce((a, l) => a + l.unitPrice * l.quantity, 0);
    const hasPhysical = pricingLines.some((l) => l.format !== "EBOOK");

    // Available-to-sell check (stock minus other customers' reservations)
    for (const line of lines) {
      if (line.format === "EBOOK") continue;
      if (line.stock - line.reserved < line.quantity) {
        return NextResponse.json(
          { error: `"${line.title}" (${line.format}) is no longer available in that quantity` },
          { status: 409 }
        );
      }
    }

    // Shipping address snapshot
    let shippingSnapshot: Record<string, string> | null = null;
    if (hasPhysical) {
      if (parsed.data.addressId) {
        const [saved] = await db
          .select()
          .from(addresses)
          .where(and(eq(addresses.id, parsed.data.addressId), eq(addresses.userId, user.id)))
          .limit(1);
        if (!saved) return NextResponse.json({ error: "Address not found" }, { status: 404 });
        shippingSnapshot = {
          fullName: saved.fullName,
          addressLine1: saved.addressLine1,
          addressLine2: saved.addressLine2 ?? "",
          city: saved.city,
          state: saved.state,
          postalCode: saved.postalCode,
          country: saved.country,
          phone: saved.phone,
        };
      } else if (parsed.data.shipping) {
        const s = parsed.data.shipping;
        shippingSnapshot = {
          fullName: s.fullName,
          addressLine1: s.addressLine1,
          addressLine2: s.addressLine2 ?? "",
          city: s.city,
          state: s.state,
          postalCode: s.postalCode,
          country: s.country,
          phone: s.phone ?? "",
        };
      } else {
        return NextResponse.json({ error: "A delivery address is required for physical books" }, { status: 400 });
      }
    }

    // Coupon — validated server-side
    let couponId: number | null = null;
    let couponRow: typeof coupons.$inferSelect | undefined;
    if (parsed.data.couponCode) {
      [couponRow] = await db
        .select()
        .from(coupons)
        .where(eq(coupons.code, parsed.data.couponCode.toUpperCase()))
        .limit(1);
      const check = validateCoupon(
        couponRow
          ? {
              isActive: couponRow.isActive,
              expiresAt: couponRow.expiresAt,
              usageLimit: couponRow.usageLimit,
              usageCount: couponRow.usageCount,
              minOrderAmount: Number(couponRow.minOrderAmount),
            }
          : null,
        subtotal
      );
      if (!check.valid) return NextResponse.json({ error: check.reason }, { status: 400 });
      couponId = couponRow!.id;
    }

    const totals = computeTotals(
      pricingLines,
      couponRow
        ? {
            discountPercent: couponRow.discountPercent,
            fixedAmount: couponRow.fixedAmount ? Number(couponRow.fixedAmount) : null,
            maxDiscount: couponRow.maxDiscount ? Number(couponRow.maxDiscount) : null,
          }
        : null
    );

    // Order + items + inventory reservation — one atomic transaction
    const newOrder = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(orders)
        .values({
          userId: user.id,
          status: "PENDING",
          subtotalAmount: totals.subtotal.toFixed(2),
          discountAmount: totals.discount.toFixed(2),
          shippingAmount: totals.shipping.toFixed(2),
          taxAmount: totals.tax.toFixed(2),
          totalAmount: totals.total.toFixed(2),
          currency: "usd",
          couponId,
          idempotencyKey,
          reservationExpiresAt: new Date(Date.now() + RESERVATION_MINUTES * 60_000),
          shippingAddress: shippingSnapshot ? JSON.stringify(shippingSnapshot) : null,
        })
        .returning();

      await tx.insert(orderItems).values(
        lines.map((line) => ({
          orderId: created.id,
          bookId: line.bookId,
          formatId: line.formatId,
          price: line.price,
          quantity: line.quantity,
          formatName: line.format,
          // Immutable snapshots
          bookTitle: line.title,
          authorName: line.authorName,
          lineSubtotal: (Number(line.price) * line.quantity).toFixed(2),
        }))
      );

      await reserveStock(
        tx,
        lines.map((l) => ({ formatId: l.formatId, quantity: l.quantity, title: l.title, format: l.format }))
      );

      return created;
    });
    createdOrderId = newOrder.id;

    const origin = new URL(request.url).origin;
    const session = await getStripe().checkout.sessions.create(
      {
        mode: "payment",
        customer_email: user.email,
        metadata: { orderId: newOrder.id },
        expires_at: Math.floor(Date.now() / 1000) + RESERVATION_MINUTES * 60,
        line_items: [
          ...lines.map((l) => ({
            price_data: {
              currency: "usd",
              product_data: { name: `${l.title} — ${l.format}` },
              unit_amount: Math.round(Number(l.price) * 100),
            },
            quantity: l.quantity,
          })),
          ...(totals.discount > 0
            ? [{
                price_data: {
                  currency: "usd",
                  product_data: { name: `Coupon ${parsed.data.couponCode}` },
                  unit_amount: -Math.round(totals.discount * 100),
                },
                quantity: 1,
              }]
            : []),
          ...(totals.shipping > 0
            ? [{
                price_data: {
                  currency: "usd",
                  product_data: { name: "Shipping" },
                  unit_amount: Math.round(totals.shipping * 100),
                },
                quantity: 1,
              }]
            : []),
          ...(totals.tax > 0
            ? [{
                price_data: {
                  currency: "usd",
                  product_data: { name: "Tax" },
                  unit_amount: Math.round(totals.tax * 100),
                },
                quantity: 1,
              }]
            : []),
        ],
        success_url: `${origin}/order-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/cart?cancelled=1`,
      },
      // Stripe-side idempotency guards against duplicate sessions too
      { idempotencyKey }
    );

    await db.update(orders).set({ stripeSessionId: session.id }).where(eq(orders.id, newOrder.id));
    return NextResponse.json({ mode: "stripe", url: session.url });
  } catch (error) {
    // Roll back reservation + order so nothing is orphaned or held
    if (createdOrderId) {
      await releaseReservation(createdOrderId).catch(() => undefined);
      await db
        .update(orders)
        .set({ status: "CANCELLED", paymentStatus: "SESSION_FAILED" })
        .where(eq(orders.id, createdOrderId))
        .catch(() => undefined);
    }
    if (error instanceof InsufficientStockError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    await captureException(error, { route: "create-checkout" });
    return NextResponse.json({ error: "Unable to create checkout session" }, { status: 500 });
  }
}
