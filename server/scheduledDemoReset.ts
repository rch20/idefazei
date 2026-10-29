/**
 * Reset do ambiente de demonstração — acionado pelo Heartbeat (cron).
 *
 * Rota: POST /api/scheduled/reset-demo-tenant
 *
 * Recria a igreja demo com dados limpos, para que a demonstração esteja sempre
 * apresentável mesmo que prospects tenham editado tudo.
 *
 * Após o deploy, para rodar toda madrugada, criar o cron com:
 *   manus-heartbeat create \
 *     --name reset-demo-tenant \
 *     --cron "0 0 6 * * *" \
 *     --path /api/scheduled/reset-demo-tenant \
 *     --description "Reset noturno do ambiente de demonstração"
 */

import type { Request, Response } from "express";
import { sdk } from "./_core/sdk";

export async function resetDemoTenantHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) return res.status(403).json({ error: "cron-only" });
    const { DEMO_TENANT_ENABLED } = await import("./db");
    if (!DEMO_TENANT_ENABLED) return res.status(200).json({ ok: true, skipped: "demo-disabled" });
    const { seedDemoTenant } = await import("./demoSeed");
    const result = await seedDemoTenant();
    return res.status(200).json({ ok: true, churchId: result.churchId });
  } catch (error) {
    console.error("[reset-demo-tenant] falhou:", error);
    return res.status(500).json({ error: "reset-failed" });
  }
}
