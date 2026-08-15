import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderItems, books } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

/** GET /api/orders — the authenticated customer's order history. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userOrders = await db
    .select()
    .from(orders)
    .where(eq(orders.userId, user.id))
    .orderBy(desc(orders.createdAt));

  const withItems = await Promise.all(
    userOrders.map(async (order) => {
      const items = await db
        .select({
          id: orderItems.id,
          quantity: orderItems.quantity,
          price: orderItems.price,
          formatName: orderItems.formatName,
          bookId: orderItems.bookId,
          bookTitle: books.title,
          bookSlug: books.slug,
          bookCover: books.coverImage,
        })
        .from(orderItems)
        .innerJoin(books, eq(orderItems.bookId, books.id))
        .where(eq(orderItems.orderId, order.id));
      return { ...order, items };
    })
  );

  return NextResponse.json({ orders: withItems });
}
