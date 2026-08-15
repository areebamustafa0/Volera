import { db } from "@/db";
import { adminAuditLogs } from "@/db/schema";
import { desc } from "drizzle-orm";
import { captureException } from "@/lib/monitoring";
import type { SessionUser } from "@/lib/auth";

/**
 * Immutable trail of privileged mutations: who changed what, from what value
 * to what value, and from where. Never blocks the operation it records.
 */
export async function recordAudit(params: {
  admin: SessionUser;
  action: string;
  resource: string;
  resourceId?: string | number | null;
  oldValue?: unknown;
  newValue?: unknown;
  request?: Request;
}): Promise<void> {
  try {
    const ip =
      params.request?.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? null;

    await db.insert(adminAuditLogs).values({
      adminId: params.admin.id,
      adminEmail: params.admin.email,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId != null ? String(params.resourceId) : null,
      oldValue: params.oldValue !== undefined ? JSON.stringify(params.oldValue).slice(0, 4000) : null,
      newValue: params.newValue !== undefined ? JSON.stringify(params.newValue).slice(0, 4000) : null,
      ipAddress: ip,
    });
  } catch (err) {
    await captureException(err, { stage: "audit" });
  }
}

export async function listAuditLogs(limit = 100) {
  return db.select().from(adminAuditLogs).orderBy(desc(adminAuditLogs.createdAt)).limit(limit);
}
