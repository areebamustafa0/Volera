import { db } from "@/db";
import { orders, orderItems, bookFormats, libraries, cartItems, carts, coupons, users } from "@/db/schema";
import { eq, and, gte, lt, sql, inArray } from "drizzle-orm";
import { sendEmail, emailTemplates } from "@/lib/email";
import { captureException } from "@/lib/monitoring";
import { consumeReservation, releaseReservation, InsufficientStockError } from "@/services/inventory.service";

export class StockUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StockUnavailableError";
  }
}

/**
 * Idempotent, transactional order confirmation — the single source of truth
 * called by the Stripe webhook and (development-only) test mode.
 *
 *   lock order FOR UPDATE
 *   ├─ already PAID → no-op (idempotent)
 *   ├─ decrement physical stock (guarded: stock >= qty, else abort)
 *   ├─ mark PAID
 *   ├─ grant EBOOK-only library entitlements
 *   ├─ clear ONLY the cart lines belonging to this order
 *   └─ increment coupon usage guarded by usage_limit (no over-redemption)
 */
export async function confirmOrder(
  orderId: string
): Promise<{ confirmed: boolean; alreadyConfirmed?: boolean }> {
  let result: { confirmed: boolean; alreadyConfirmed?: boolean } = {
    confirmed: false,
    alreadyConfirmed: false,
  };

  await db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).for("update").limit(1);

    if (!order) throw new Error(`Order ${orderId} not found`);
    if (order.status !== "PENDING") {
      result = { confirmed: false, alreadyConfirmed: true };
      return;
    }

    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, order.id));

    // 1. Convert the held reservation into a sale (stock down, hold released)
    try {
      await consumeReservation(
        tx,
        items
          .filter((i) => i.formatId != null)
          .map((i) => ({ formatId: i.formatId!, quantity: i.quantity, format: i.formatName }))
      );
    } catch (err) {
      if (err instanceof InsufficientStockError) {
        throw new StockUnavailableError(err.message);
      }
      throw err;
    }

    // 2. Mark paid
    await tx
      .update(orders)
      .set({ status: "PAID", paymentStatus: "COMPLETED", reservationExpiresAt: null, updatedAt: new Date() })
      .where(eq(orders.id, order.id));

    // 3. Digital entitlements — strictly EBOOK formats
    if (order.userId) {
      for (const item of items) {
        if (item.formatName !== "EBOOK" || !item.formatId || !item.bookId) continue;
        await tx
          .insert(libraries)
          .values({
            userId: order.userId,
            bookId: item.bookId,
            formatId: item.formatId,
            purchaseOrderId: order.id,
            progressPercentage: 0,
            status: "READING",
          })
          .onConflictDoNothing();
      }
    }

    // 4. Clear ONLY the purchased lines — items still being shopped survive
    if (order.userId) {
      const purchasedFormatIds = items.map((i) => i.formatId).filter((id): id is number => id != null);
      if (purchasedFormatIds.length > 0) {
        const userCarts = await tx.select({ id: carts.id }).from(carts).where(eq(carts.userId, order.userId));
        for (const cart of userCarts) {
          await tx
            .delete(cartItems)
            .where(and(eq(cartItems.cartId, cart.id), inArray(cartItems.formatId, purchasedFormatIds)));
        }
      }
    }

    // 5. Coupon usage — conditional so concurrent orders can't exceed the limit
    if (order.couponId) {
      const bumped = await tx
        .update(coupons)
        .set({ usageCount: sql`${coupons.usageCount} + 1` })
        .where(
          and(
            eq(coupons.id, order.couponId),
            sql`(${coupons.usageLimit} is null or ${coupons.usageCount} < ${coupons.usageLimit})`
          )
        )
        .returning({ id: coupons.id });
      if (bumped.length === 0) {
        // Limit was exhausted by a concurrent order; honour this order but log it.
        await captureException(new Error("Coupon usage limit exceeded at confirmation"), {
          orderId: order.id,
          couponId: order.couponId,
        });
      }
    }

    result = { confirmed: true, alreadyConfirmed: false };
  });

  if (result.confirmed) {
    try {
      const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
      if (order?.userId) {
        const [customer] = await db
          .select({ email: users.email })
          .from(users)
          .where(eq(users.id, order.userId))
          .limit(1);
        const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
        if (customer) {
          await sendEmail({
            to: customer.email,
            subject: `Velora Books — Order #${order.id.slice(0, 8)} confirmed`,
            html: emailTemplates.orderConfirmation(
              order.id.slice(0, 8),
              Number(order.totalAmount).toFixed(2),
              items.some((i) => i.formatName === "EBOOK")
            ),
          });
        }
      }
    } catch (err) {
      await captureException(err, { orderId });
    }
  }

  return result;
}

/**
 * Payment captured but stock could not be honoured: cancel and refund.
 * Never leave a customer charged without an order.
 */
export async function failOrderAndRefund(orderId: string, reason: string) {
  await releaseReservation(orderId).catch(() => undefined);
  await db
    .update(orders)
    .set({ status: "CANCELLED", paymentStatus: "REFUND_PENDING", updatedAt: new Date() })
    .where(eq(orders.id, orderId));

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);

  if (order?.paymentIntentId && process.env.STRIPE_SECRET_KEY) {
    try {
      const { getStripe } = await import("@/lib/payments/stripe");
      await getStripe().refunds.create({ payment_intent: order.paymentIntentId });
      await db
        .update(orders)
        .set({ status: "REFUNDED", paymentStatus: "REFUNDED", updatedAt: new Date() })
        .where(eq(orders.id, orderId));
    } catch (err) {
      await captureException(err, { orderId, stage: "auto-refund" });
    }
  }

  await captureException(new Error(`Order auto-cancelled: ${reason}`), { orderId });

  if (order?.userId) {
    const [customer] = await db.select({ email: users.email }).from(users).where(eq(users.id, order.userId)).limit(1);
    if (customer) {
      await sendEmail({
        to: customer.email,
        subject: `Velora Books — Order #${orderId.slice(0, 8)} could not be fulfilled`,
        html: `<p>We're sorry — an item in your order sold out before payment completed. Your payment is being refunded in full.</p><p>Reason: ${reason}</p>`,
      }).catch(() => undefined);
    }
  }
}

/** Housekeeping: expire abandoned PENDING orders (e.g. Stripe session dropped). */
export async function cleanupStalePendingOrders(olderThanMinutes = 120): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanMinutes * 60_000);
  const stale = await db
    .update(orders)
    .set({ status: "CANCELLED", paymentStatus: "EXPIRED", updatedAt: new Date() })
    .where(and(eq(orders.status, "PENDING"), lt(orders.createdAt, cutoff)))
    .returning({ id: orders.id });
  return stale.length;
}
