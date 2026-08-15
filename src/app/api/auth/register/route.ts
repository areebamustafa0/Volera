import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, emailVerificationTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { signToken } from "@/lib/auth";
import { cookies } from "next/headers";
import { registerSchema } from "@/lib/validation";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { csrfGuard } from "@/lib/csrf";
import { sendEmail, emailTemplates } from "@/lib/email";

export async function POST(request: Request) {
  const csrf = csrfGuard(request);
  if (csrf) return csrf;

  const rl = rateLimit(`register:${clientKey(request)}`, 3, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { success: false, error: "Too many sign-up attempts. Please wait a minute." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    );
  }

  try {
    const parsed = registerSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? "Invalid details" },
        { status: 400 }
      );
    }
    const name = parsed.data.name.trim();
    const email = parsed.data.email.toLowerCase();

    const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing) {
      return NextResponse.json({ success: false, error: "Email already registered" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    const [newUser] = await db
      .insert(users)
      .values({ name, email, passwordHash, role: "CUSTOMER" })
      .returning();

    // Issue verification token — required before checkout/reviews/downloads
    const token = crypto.randomBytes(32).toString("hex");
    await db.insert(emailVerificationTokens).values({
      userId: newUser.id,
      token,
      expiresAt: new Date(Date.now() + 24 * 60 * 60_000),
    });

    const origin = new URL(request.url).origin;
    await sendEmail({
      to: email,
      subject: "Verify your Velora Books account",
      html: emailTemplates.verifyEmail(`${origin}/auth/verify?token=${token}`),
    });

    const session = signToken({ id: newUser.id });
    const cookieStore = await cookies();
    cookieStore.set("velora_token", session, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return NextResponse.json({
      success: true,
      emailVerified: false,
      message: "Account created. Please check your email to verify your address.",
    });
  } catch {
    return NextResponse.json({ success: false, error: "Registration failed" }, { status: 500 });
  }
}
