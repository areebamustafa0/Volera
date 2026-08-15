import { cookies } from "next/headers";
import { cache } from "react";
import { db } from "@/db";
import { carts, cartItems, wishlists } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";

/**
 * Real cart + wishlist counts for the header badges. Cached per-request so
 * every page can call this without duplicating the cart/session lookup.
 */
export const getHeaderCounts = cache(async (): Promise<{ cartCount: number; wishlistCount: number }> => {
  const user = await getCurrentUser();
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("velora_session_id")?.value;

  const [cart] = user
    ? await db.select({ id: carts.id }).from(carts).where(eq(carts.userId, user.id)).limit(1)
    : sessionId
      ? await db.select({ id: carts.id }).from(carts).where(eq(carts.sessionId, sessionId)).limit(1)
      : [];

  const [cartAgg] = cart
    ? await db
        .select({ total: sql<number>`coalesce(sum(${cartItems.quantity}), 0)::int` })
        .from(cartItems)
        .where(eq(cartItems.cartId, cart.id))
    : [{ total: 0 }];

  const [wishlistAgg] = user
    ? await db
        .select({ total: sql<number>`count(*)::int` })
        .from(wishlists)
        .where(eq(wishlists.userId, user.id))
    : [{ total: 0 }];

  return { cartCount: cartAgg?.total ?? 0, wishlistCount: wishlistAgg?.total ?? 0 };
});

/** Returns the set of book ids the current user has wishlisted (empty for guests). */
export const getWishlistedIds = cache(async (): Promise<Set<number>> => {
  const user = await getCurrentUser();
  if (!user) return new Set();
  const rows = await db.select({ bookId: wishlists.bookId }).from(wishlists).where(eq(wishlists.userId, user.id));
  return new Set(rows.map((r) => r.bookId));
});
