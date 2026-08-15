import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyWebhookSignature, isStripeConfigured } from "@/lib/payments/stripe";
import { confirmOrder, failOrderAndRefund, StockUnavailableError } from "@/services/order.service";
import { captureException } from "@/lib/monitoring";
import type Stripe from "stripe";

/**
 * Stripe webhook — signature-verified and idempotent. The ONLY path that can
 * mark an order PAID in production. Before confirming we validate that the
 * payment context (order link, amount, currency) matches our own records.
 */
export async function POST(request: Request) {
  if (!isStripeConfigured()) {
    return NextResponse.json({ error: "Stripe webhooks are not configured" }, { status: 400 });
  }

  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");

  let event: Stripe.Event;
  try {
    event = verifyWebhookSignature(payload, signature);
  } catch (err) {
    await captureException(err, { route: "webhook", stage: "signature" });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId;
        if (!orderId) {
          await captureException(new Error("Stripe session missing orderId metadata"), { sessionId: session.id });
          break;
        }

        const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
        if (!order) {
          await captureException(new Error("Webhook referenced unknown order"), { orderId });
          break;
        }

        // Payment context validation — never trust metadata alone
        if (order.stripeSessionId && order.stripeSessionId !== session.id) {
          await captureException(new Error("Stripe session/order mismatch"), { orderId, sessionId: session.id });
          return NextResponse.json({ error: "Session mismatch" }, { status: 400 });
        }

        const expectedCents = Math.round(Number(order.totalAmount) * 100);
        const paidCents = session.amount_total ?? 0;
        if (paidCents !== expectedCents) {
          await captureException(new Error("Stripe amount mismatch — refusing to fulfil"), {
            orderId,
            expectedCents,
            paidCents,
          });
          return NextResponse.json({ error: "Amount mismatch" }, { status: 400 });
        }
        if ((session.currency ?? "usd").toLowerCase() !== (order.currency ?? "usd").toLowerCase()) {
          await captureException(new Error("Stripe currency mismatch"), { orderId });
          return NextResponse.json({ error: "Currency mismatch" }, { status: 400 });
        }
        if (session.payment_status !== "paid") {
          break; // await async settlement
        }

        await db
          .update(orders)
          .set({ paymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null })
          .where(eq(orders.id, orderId));

        try {
          await confirmOrder(orderId);
        } catch (err) {
          if (err instanceof StockUnavailableError) {
            // Paid but cannot fulfil → cancel + automatic refund
            await failOrderAndRefund(orderId, err.message);
            return NextResponse.json({ received: true, refunded: true });
          }
          throw err;
        }
        break;
      }

      case "checkout.session.expired":
      case "checkout.session.async_payment_failed":
      case "payment_intent.payment_failed": {
        const obj = event.data.object as { metadata?: { orderId?: string } };
        const orderId = obj.metadata?.orderId;
        if (orderId) {
          await db
            .update(orders)
            .set({ status: "CANCELLED", paymentStatus: "FAILED", updatedAt: new Date() })
            .where(eq(orders.id, orderId));
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : null;
        if (pi) {
          await db
            .update(orders)
            .set({ status: "REFUNDED", paymentStatus: "REFUNDED", updatedAt: new Date() })
            .where(eq(orders.paymentIntentId, pi));
        }
        break;
      }

      default:
        break;
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    await captureException(error, { route: "webhook", type: event.type });
    // 500 → Stripe retries; confirmOrder idempotency makes this safe
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
