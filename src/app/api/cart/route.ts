import { NextResponse } from "next/server";
import { db } from "@/db";
import { carts, cartItems, bookFormats, books } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { cookies } from "next/headers";
import { csrfGuard } from "@/lib/csrf";
import { z } from "zod";

async function resolveCart() {
  const user = await getCurrentUser();
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("velora_session_id")?.value;

  const [cart] = user
    ? await db.select().from(carts).where(eq(carts.userId, user.id)).limit(1)
    : sessionId
      ? await db.select().from(carts).where(eq(carts.sessionId, sessionId)).limit(1)
      : [];

  return { user, sessionId, cart };
}

export async function GET() {
  try {
    const { cart } = await resolveCart();
    if (!cart) return NextResponse.json({ items: [], subtotal: 0 });

    const items = await db
      .select({
        id: cartItems.id,
        quantity: cartItems.quantity,
        book: { id: books.id, title: books.title, slug: books.slug, coverImage: books.coverImage },
        format: {
          id: bookFormats.id,
          format: bookFormats.format,
          price: bookFormats.price,
          stock: bookFormats.stock,
          reservedStock: bookFormats.reservedStock,
        },
      })
      .from(cartItems)
      .innerJoin(books, eq(cartItems.bookId, books.id))
      .innerJoin(bookFormats, eq(cartItems.formatId, bookFormats.id))
      .where(eq(cartItems.cartId, cart.id));

    const subtotal = items.reduce((acc, item) => acc + Number(item.format.price) * item.quantity, 0);
    return NextResponse.json({ items, subtotal });
  } catch (error) {
    console.error("Cart fetch error:", error);
    return NextResponse.json({ error: "Could not load cart" }, { status: 500 });
  }
}

const addSchema = z.object({
  bookId: z.number().int().positive(),
  formatId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(10).default(1),
});

export async function POST(request: Request) {
  const csrf = csrfGuard(request);
  if (csrf) return csrf;

  try {
    const parsed = addSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });
    }
    const { bookId, formatId, quantity } = parsed.data;

    const [format] = await db.select().from(bookFormats).where(eq(bookFormats.id, formatId)).limit(1);
    if (!format || format.bookId !== bookId) {
      return NextResponse.json({ success: false, error: "That book format could not be found" }, { status: 404 });
    }

    const { user, sessionId: existingSessionId, cart: existingCart } = await resolveCart();
    let cart = existingCart;
    let sessionId = existingSessionId;

    const cookieStore = await cookies();
    if (!user && !sessionId) {
      sessionId = crypto.randomUUID();
      cookieStore.set("velora_session_id", sessionId, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    if (!cart) {
      [cart] = await db
        .insert(carts)
        .values({ userId: user ? user.id : null, sessionId: user ? null : sessionId })
        .returning();
    }

    const [existingItem] = await db
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.cartId, cart.id), eq(cartItems.formatId, formatId)))
      .limit(1);

    const requestedQty = (existingItem?.quantity ?? 0) + quantity;

    // Server-side inventory validation — physical stock is finite; digital is not.
    if (format.format !== "EBOOK") {
      const available = format.stock - format.reservedStock;
      if (available <= 0) {
        return NextResponse.json({ success: false, error: "This item is currently out of stock" }, { status: 409 });
      }
      if (requestedQty > available) {
        return NextResponse.json(
          { success: false, error: `Only ${available} left in stock`, available },
          { status: 409 }
        );
      }
    } else if (existingItem) {
      // A digital edition can only ever be owned/carted once.
      return NextResponse.json({ success: true, note: "Already in cart" });
    }

    if (existingItem) {
      await db.update(cartItems).set({ quantity: Math.min(requestedQty, 10), updatedAt: new Date() }).where(eq(cartItems.id, existingItem.id));
    } else {
      await db.insert(cartItems).values({ cartId: cart.id, bookId, formatId, quantity: format.format === "EBOOK" ? 1 : quantity });
    }

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return NextResponse.redirect(new URL("/cart", request.url), { status: 303 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Cart add error:", error);
    return NextResponse.json({ success: false, error: "Could not add item to cart" }, { status: 500 });
  }
}

const patchSchema = z.object({
  itemId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(10),
});

/** Update a cart line's quantity. Scoped to the caller's own cart (no IDOR). */
export async function PATCH(request: Request) {
  const csrf = csrfGuard(request);
  if (csrf) return csrf;

  try {
    const parsed = patchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });

    const { cart } = await resolveCart();
    if (!cart) return NextResponse.json({ success: false, error: "Cart not found" }, { status: 404 });

    const [item] = await db
      .select({ id: cartItems.id, formatId: cartItems.formatId })
      .from(cartItems)
      .where(and(eq(cartItems.id, parsed.data.itemId), eq(cartItems.cartId, cart.id)))
      .limit(1);
    if (!item) return NextResponse.json({ success: false, error: "Item not found in your cart" }, { status: 404 });

    const [format] = await db.select().from(bookFormats).where(eq(bookFormats.id, item.formatId)).limit(1);
    if (format && format.format !== "EBOOK") {
      const available = format.stock - format.reservedStock;
      if (parsed.data.quantity > available) {
        return NextResponse.json(
          { success: false, error: `Only ${available} left in stock`, available },
          { status: 409 }
        );
      }
    }

    await db
      .update(cartItems)
      .set({ quantity: parsed.data.quantity, updatedAt: new Date() })
      .where(eq(cartItems.id, item.id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Cart update error:", error);
    return NextResponse.json({ success: false, error: "Could not update item" }, { status: 500 });
  }
}

const deleteSchema = z.object({ itemId: z.number().int().positive() });

/** Remove a cart line. Scoped to the caller's own cart (no IDOR). */
export async function DELETE(request: Request) {
  const csrf = csrfGuard(request);
  if (csrf) return csrf;

  try {
    const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ success: false, error: "Invalid request" }, { status: 400 });

    const { cart } = await resolveCart();
    if (!cart) return NextResponse.json({ success: false, error: "Cart not found" }, { status: 404 });

    await db.delete(cartItems).where(and(eq(cartItems.id, parsed.data.itemId), eq(cartItems.cartId, cart.id)));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Cart delete error:", error);
    return NextResponse.json({ success: false, error: "Could not remove item" }, { status: 500 });
  }
}
