import { NextResponse } from "next/server";
import { getConfiguredTaxRate, FREE_SHIPPING_THRESHOLD, FLAT_SHIPPING } from "@/lib/pricing";

/**
 * Public, non-sensitive storefront pricing configuration so the client can
 * display accurate estimates. Authoritative totals are always recomputed
 * server-side at checkout — this endpoint is presentation only.
 */
export async function GET() {
  return NextResponse.json(
    {
      taxRate: getConfiguredTaxRate(),
      freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
      flatShipping: FLAT_SHIPPING,
      currency: "usd",
    },
    { headers: { "Cache-Control": "public, max-age=300" } }
  );
}
