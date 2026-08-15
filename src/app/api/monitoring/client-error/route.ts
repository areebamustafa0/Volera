import { NextResponse } from "next/server";
import { captureException } from "@/lib/monitoring";
import { rateLimit, clientKey } from "@/lib/rate-limit";
import { z } from "zod";

const schema = z.object({
  message: z.string().max(1000),
  digest: z.string().max(200).optional(),
  path: z.string().max(500).optional(),
  fatal: z.boolean().optional(),
});

/** Receives browser-side error reports from the React error boundaries. */
export async function POST(request: Request) {
  const rl = rateLimit(`clienterr:${clientKey(request)}`, 20, 60_000);
  if (!rl.ok) return NextResponse.json({ ok: true }); // silently drop floods

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: true });

  await captureException(new Error(`[client] ${parsed.data.message}`), {
    digest: parsed.data.digest,
    path: parsed.data.path,
    fatal: parsed.data.fatal ?? false,
    source: "browser",
  });

  return NextResponse.json({ ok: true });
}
