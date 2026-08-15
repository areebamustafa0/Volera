import Stripe from "stripe";
import { getStripeSecretKey, getStripeWebhookSecret } from "@/lib/secrets";

/**
 * Stripe client. There is no test/mock fallback: if Stripe is not configured,
 * checkout is unavailable. Payment state is only ever set by verified webhook
 * events, never by the browser.
 */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.trim());
}

export function isStripeWebhookConfigured(): boolean {
  return Boolean(process.env.STRIPE_WEBHOOK_SECRET && process.env.STRIPE_WEBHOOK_SECRET.trim());
}

let client: Stripe | null = null;

export function getStripe(): Stripe {
  if (!client) {
    client = new Stripe(getStripeSecretKey(), { apiVersion: "2026-07-29.dahlia" });
  }
  return client;
}

export function verifyWebhookSignature(payload: string | Buffer, signature: string | null): Stripe.Event {
  if (!signature) throw new Error("Missing stripe-signature header");
  return getStripe().webhooks.constructEvent(payload, signature, getStripeWebhookSecret());
}
