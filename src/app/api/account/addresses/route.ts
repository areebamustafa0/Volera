import { NextResponse } from "next/server";
import { db } from "@/db";
import { addresses } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { csrfGuard } from "@/lib/csrf";
import { z } from "zod";

const addressSchema = z.object({
  fullName: z.string().min(2).max(100),
  addressLine1: z.string().min(3).max(200),
  addressLine2: z.string().max(200).optional().or(z.literal("")),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  postalCode: z.string().min(2).max(20),
  country: z.string().min(2).max(100),
  phone: z.string().min(5).max(30),
  isDefault: z.boolean().optional(),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db.select().from(addresses).where(eq(addresses.userId, user.id)).orderBy(desc(addresses.isDefault), desc(addresses.createdAt));
  return NextResponse.json({ addresses: rows });
}

export async function POST(request: Request) {
  const csrf = csrfGuard(request);
  if (csrf) return csrf;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = addressSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid address" }, { status: 400 });

  const existingCount = await db.select({ id: addresses.id }).from(addresses).where(eq(addresses.userId, user.id));
  const shouldBeDefault = parsed.data.isDefault || existingCount.length === 0;

  if (shouldBeDefault) {
    await db.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, user.id));
  }

  const [created] = await db.insert(addresses).values({
    userId: user.id,
    fullName: parsed.data.fullName,
    addressLine1: parsed.data.addressLine1,
    addressLine2: parsed.data.addressLine2 || null,
    city: parsed.data.city,
    state: parsed.data.state,
    postalCode: parsed.data.postalCode,
    country: parsed.data.country,
    phone: parsed.data.phone,
    isDefault: shouldBeDefault,
  }).returning();

  return NextResponse.json({ success: true, address: created }, { status: 201 });
}

const deleteSchema = z.object({ id: z.number().int().positive() });

export async function DELETE(request: Request) {
  const csrf = csrfGuard(request);
  if (csrf) return csrf;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  // Scoped to the caller's own addresses — no IDOR.
  await db.delete(addresses).where(and(eq(addresses.id, parsed.data.id), eq(addresses.userId, user.id)));
  return NextResponse.json({ success: true });
}

const setDefaultSchema = z.object({ id: z.number().int().positive() });

export async function PATCH(request: Request) {
  const csrf = csrfGuard(request);
  if (csrf) return csrf;

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = setDefaultSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const [own] = await db.select().from(addresses).where(and(eq(addresses.id, parsed.data.id), eq(addresses.userId, user.id))).limit(1);
  if (!own) return NextResponse.json({ error: "Address not found" }, { status: 404 });

  await db.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, user.id));
  await db.update(addresses).set({ isDefault: true }).where(eq(addresses.id, own.id));
  return NextResponse.json({ success: true });
}
