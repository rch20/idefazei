import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const schema = readFileSync(resolve(root, "drizzle/schema.ts"), "utf8");
const migration = readFileSync(resolve(root, "drizzle/0073_consolidation_idempotency.sql"), "utf8");
const db = readFileSync(resolve(root, "server/db.ts"), "utf8");
const routers = readFileSync(resolve(root, "server/routers.ts"), "utf8");

function readClient(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

describe("idempotência de Consolidação", () => {
  it("mantém uma chave por tenant para referrals e follow-ups e uma visita por follow-up", () => {
    expect(schema).toContain("idempotencyKey: varchar(\"idempotencyKey\", { length: 64 })");
    expect(schema).toContain("uniqueIndex(\"consolidation_referral_idempotency_unique\").on(table.churchId, table.idempotencyKey)");
    expect(schema).toContain("uniqueIndex(\"consolidation_follow_up_idempotency_unique\").on(table.churchId, table.referralId, table.idempotencyKey)");
    expect(schema).toContain("sourceFollowUpId: int(\"sourceFollowUpId\")");
    expect(schema).toContain("uniqueIndex(\"care_visit_source_follow_up_unique\").on(table.churchId, table.sourceFollowUpId)");
  });

  it("tem migration aditiva correspondente e sem alteração de dados históricos", () => {
    expect(migration).toContain("ALTER TABLE consolidation_referrals");
    expect(migration).toContain("ALTER TABLE consolidation_follow_ups");
    expect(migration).toContain("ALTER TABLE care_visits");
    expect(migration).not.toMatch(/DROP\\s+(TABLE|COLUMN|INDEX)/i);
    expect(migration).not.toMatch(/DELETE\\s+FROM/i);
  });

  it("bloqueia concorrência por pessoa e devolve o mesmo resultado em retry", () => {
    const referralBlock = db.slice(db.indexOf("export async function createConsolidationReferralCase"), db.indexOf("export async function createConsolidationReferralCase") + 4200);
    expect(referralBlock).toContain("eq(consolidationReferrals.idempotencyKey, data.idempotencyKey)");
    expect(referralBlock).toContain(".for(\"update\")");
    expect(referralBlock).toContain("if (existing[0]) return existing[0]");

    const followUpBlock = db.slice(db.indexOf("export async function recordConsolidationFollowUp"), db.indexOf("export async function recordConsolidationFollowUp") + 7600);
    expect(followUpBlock).toContain("eq(consolidationFollowUps.idempotencyKey, data.idempotencyKey)");
    expect(followUpBlock).toContain("eq(careVisits.sourceFollowUpId, existingFollowUp[0].id)");
    expect(followUpBlock).toContain("await tx.update(consolidationReferrals)");
  });

  it("não mantém o fluxo moderno chamando as três escritas separadas", () => {
    expect(routers).toContain("recordConsolidationFollowUp");
    expect(routers).not.toContain("createConsolidationFollowUp({");
    expect(routers).not.toContain("createCareVisit({");
    expect(routers).toMatch(/createReferral:[\s\S]*?idempotencyKey: z\.string\(\)/);
    expect(routers).toMatch(/recordFollowUp:[\s\S]*?idempotencyKey: z\.string\(\)/);
    expect(routers).toMatch(/registerFirstContact:[\s\S]*?idempotencyKey: z\.string\(\)/);
  });

  it("propaga a chave pelos pontos de entrada sem misturar estados de domínio", () => {
    for (const path of [
      "client/src/pages/Pessoas.tsx",
      "client/src/pages/AppLider.tsx",
      "client/src/pages/Celulas.tsx",
      "client/src/components/ConsolidationReferralBox.tsx",
      "client/src/pages/Consolidacao.tsx",
      "client/src/pages/CentralCuidado.tsx",
      "client/src/pages/RadarEspiritual.tsx",
    ]) {
      expect(readClient(path), path).toContain("idempotencyKey");
    }
  });
});
