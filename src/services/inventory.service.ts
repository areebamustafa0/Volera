import { db } from "@/db";
import { bookFormats, orders, orderItems } from "@/db/schema";
import { eq, and, sql, lt, inArray } from "drizzle-orm";
import { captureException } from "@/lib/monitoring";

/**
 * Inventory reservation ledger.
 *
 *   available = stock - reservedStock
 *
 * Checkout RESERVES units up-front, so two customers cannot both pass
 * validation for the last copy. Payment success CONSUMES the reservation
 * (stock down, reserved down). Expiry/cancellation RELEASES it.
 */
export const RESERVATION_MINUTES = 30;

export type ReservationLine = { formatId: number; quantity: number; title: string; format: string };

export class InsufficientStockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InsufficientStockError";
  }
}

/** Atomically reserves physical stock. Digital formats are unlimited. */
export async function reserveStock(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  lines: ReservationLine[]
): Promise<void> {
  for (const line of lines) {
    if (line.format === "EBOOK") continue;

    const updated = await tx
      .update(bookFormats)
      .set({ reservedStock: sql`${bookFormats.reservedStock} + ${line.quantity}` })
      .where(
        and(
          eq(bookFormats.id, line.formatId),
          // available must cover the requested quantity
          sql`${bookFormats.stock} - ${bookFormats.reservedStock} >= ${line.quantity}`
        )
      )
      .returning({ id: bookFormats.id });

    if (updated.length === 0) {
      throw new InsufficientStockError(`"${line.title}" (${line.format}) is no longer available in that quantity`);
    }
  }
}

/** Converts a reservation into a sale: stock down, reservation released. */
export async function consumeReservation(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  lines: { formatId: number; quantity: number; format: string }[]
): Promise<void> {
  for (const line of lines) {
    if (line.format === "EBOOK") continue;

    const updated = await tx
      .update(bookFormats)
      .set({
        stock: sql`${bookFormats.stock} - ${line.quantity}`,
        reservedStock: sql`GREATEST(${bookFormats.reservedStock} - ${line.quantity}, 0)`,
      })
      .where(and(eq(bookFormats.id, line.formatId), sql`${bookFormats.stock} >= ${line.quantity}`))
      .returning({ id: bookFormats.id });

    if (updated.length === 0) {
      throw new InsufficientStockError(`Stock unavailable for format ${line.formatId}`);
    }
  }
}

/** Releases a held reservation without selling (cancel / expiry / failure). */
export async function releaseReservation(orderId: string): Promise<void> {
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  for (const item of items) {
    if (item.formatName === "EBOOK" || !item.formatId) continue;
    await db
      .update(bookFormats)
      .set({ reservedStock: sql`GREATEST(${bookFormats.reservedStock} - ${item.quantity}, 0)` })
      .where(eq(bookFormats.id, item.formatId));
  }
}

/**
 * Scheduled housekeeping: expire abandoned PENDING orders and give their
 * reserved inventory back to the shop floor.
 */
export async function expireStaleReservations(): Promise<{ expired: number }> {
  const now = new Date();
  const stale = await db
    .select({ id: orders.id })
    .from(orders)
    .where(and(eq(orders.status, "PENDING"), lt(orders.reservationExpiresAt, now)));

  if (stale.length === 0) return { expired: 0 };

  for (const order of stale) {
    try {
      await releaseReservation(order.id);
    } catch (err) {
      await captureException(err, { orderId: order.id, stage: "release-reservation" });
    }
  }

  await db
    .update(orders)
    .set({ status: "CANCELLED", paymentStatus: "EXPIRED", updatedAt: now })
    .where(
      inArray(
        orders.id,
        stale.map((s) => s.id)
      )
    );

  return { expired: stale.length };
}

/** Available-to-sell for display and validation. */
export async function getAvailableStock(formatId: number): Promise<number> {
  const [row] = await db
    .select({ available: sql<number>`${bookFormats.stock} - ${bookFormats.reservedStock}` })
    .from(bookFormats)
    .where(eq(bookFormats.id, formatId))
    .limit(1);
  return row?.available ?? 0;
}
