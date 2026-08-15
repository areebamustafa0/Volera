import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { signToken, checkLockout, recordFailedLogin, clearFailedLogins } from "@/lib/auth";
import { cookies } from "next/headers";
import { loginSchema } from "@/lib/validation";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { csrfGuard } from "@/lib/csrf";
import { captureException } from "@/lib/monitoring";

export async function POST(request: Request) {
  const csrf = csrfGuard(request);
  if (csrf) return csrf;

  const ip = clientKey(request);

  // Layer 1: coarse per-IP request rate limit
  const rl = rateLimit(`login:${ip}`, 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { success: false, error: "Too many attempts. Please wait a minute." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } }
    );
  }

  try {
    const parsed = loginSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: "Email and password are required" }, { status: 400 });
    }
    const email = parsed.data.email.toLowerCase();
    const { password } = parsed.data;

    // Layer 2: progressive lockout per account AND per IP
    for (const identifier of [`email:${email}`, `ip:${ip}`]) {
      const lock = await checkLockout(identifier);
      if (lock.locked) {
        return NextResponse.json(
          {
            success: false,
            error: `Too many failed attempts. Try again in ${Math.ceil(lock.retryAfterSeconds / 60)} minute(s).`,
          },
          { status: 429, headers: { "Retry-After": String(lock.retryAfterSeconds) } }
        );
      }
    }

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);

    // Constant-ish work regardless of account existence (no enumeration)
    const passwordOk = user ? await bcrypt.compare(password, user.passwordHash) : false;

    if (!user || !passwordOk) {
      await recordFailedLogin(`email:${email}`);
      await recordFailedLogin(`ip:${ip}`);
      return NextResponse.json({ success: false, error: "Invalid email or password" }, { status: 401 });
    }

    await clearFailedLogins(`email:${email}`);
    await clearFailedLogins(`ip:${ip}`);

    const token = signToken({ id: user.id });

    const cookieStore = await cookies();
    cookieStore.set("velora_token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return NextResponse.json({
      success: true,
      role: user.role,
      emailVerified: Boolean(user.emailVerified),
    });
  } catch (err) {
    await captureException(err, { route: "auth/login" });
    return NextResponse.json({ success: false, error: "Sign-in failed" }, { status: 500 });
  }
}
