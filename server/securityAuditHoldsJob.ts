import type { Request, Response } from "express";
import { eq } from "drizzle-orm";

import { churches } from "../drizzle/schema";
import { sdk } from "./_core/sdk";
import { getDb, expireSecurityAuditHolds } from "./db";

export async function securityAuditHoldsExpirationHandler(
  req: Request,
  res: Response
) {
  try {
    let user;
    try {
      user = await sdk.authenticateRequest(req);
    } catch {
      return res.status(403).json({ error: "cron-only" });
    }
    if (!user.isCron || !user.taskUid) {
      return res.status(403).json({ error: "cron-only" });
    }

    const db = await getDb();
    if (!db) return res.status(500).json({ error: "database unavailable" });

    const tenants = await db
      .select({ id: churches.id })
      .from(churches)
      .where(eq(churches.active, true));
    const now = new Date();
    let expiredHolds = 0;

    for (const tenant of tenants) {
      expiredHolds += await expireSecurityAuditHolds(tenant.id, now);
    }

    return res.json({
      ok: true,
      tenantsChecked: tenants.length,
      expiredHolds,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("[securityAuditHoldsExpiration] Error:", error);
    return res.status(500).json({
      error: "security-hold-expiration-failed",
      timestamp: new Date().toISOString(),
    });
  }
}
