import { NextResponse } from "next/server";
import { expireStaleReservations } from "@/services/inventory.service";
import { cleanupStalePendingOrders } from "@/services/order.service";
import { captureException } from "@/lib/monitoring";
import { getCurrentUser } from "@/lib/auth";
import crypto from "crypto";

/**
 * Scheduled housekeeping. Point a cron at this endpoint (Vercel Cron, GitHub
 * Actions, or any scheduler):
 *
 *   0 * * * *  ->  GET /api/maintenance/cleanup   (hourly)
 *
 * Authorization: either a valid CRON_SECRET bearer token, or an authenticated
 * ADMIN session. Never publicly invocable.
 */
function authorizeCron(request: Request): boolean {
  const configured = process.env.CRON_SECRET;
  if (!configured) return false;

  const header = request.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!provided) return false;

  const a = Buffer.from(provided);
  const b = Buffer.from(configured);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  let authorized = authorizeCron(request);

  if (!authorized) {
    const user = await getCurrentUser();
    authorized = user?.role === "ADMIN";
  }

  if (!authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Release inventory held by expired checkout sessions (30-min window)
    const { expired: reservationsExpired } = await expireStaleReservations();

    // 2. Mark long-abandoned PENDING orders as expired (24-hour window)
    const ordersExpired = await cleanupStalePendingOrders(60 * 24);

    return NextResponse.json({
      success: true,
      reservationsExpired,
      ordersExpired,
      ranAt: new Date().toISOString(),
    });
  } catch (error) {
    await captureException(error, { route: "maintenance/cleanup" });
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
