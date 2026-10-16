import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(import.meta.dirname, "..");
const schema = readFileSync(resolve(root, "drizzle/schema.ts"), "utf8");
const migration = readFileSync(resolve(root, "drizzle/0090_public_donations.sql"), "utf8");
const router = readFileSync(resolve(root, "server/routers.ts"), "utf8");
const service = readFileSync(resolve(root, "server/publicDonations.ts"), "utf8");
const ledger = JSON.parse(readFileSync(resolve(root, "drizzle/custom-migrations.json"), "utf8")) as { entries: Array<{ id: string; file: string; sha256: string }> };

describe("doações públicas — contrato seguro", () => {
  it("mantém opt-in e snapshot PIX por tenant", () => {
    expect(schema).toContain('publicDonationEnabled: boolean("publicDonationEnabled")');
    expect(schema).toContain('export const publicDonationSubmissions = mysqlTable');
    expect(schema).toContain('uniqueIndex("public_donation_church_idempotency_unique")');
    expect(schema).toContain('uniqueIndex("public_donation_church_transaction_unique")');
    expect(migration).toContain("publicDonationEnabled BOOLEAN NOT NULL DEFAULT FALSE");
    expect(migration).toContain("pixKeySnapshot VARCHAR(255) NOT NULL");
  });

  it("não aceita churchId do visitante e valida o comprovante no tenant resolvido", () => {
    expect(router).toContain("if (!ctx.tenantSlug)");
    expect(router).toContain("getChurchBySlug(ctx.tenantSlug)");
    expect(router).toContain("isPublicDonationProofKeyForChurch(input.proofFileKey, church.id)");
    expect(router).toContain("consentAccepted: z.literal(true)");
  });

  it("aprova de forma transacional e cria uma única entrada confirmada", () => {
    expect(service).toContain("db.transaction(async tx => {");
    expect(service).toContain('status: "confirmado"');
    expect(service).toContain('type: "entrada"');
    expect(service).toContain("financialTransactionId: transactionId");
    expect(service).toContain("publicDonationId: donation.id");
    expect(migration).toContain("UNIQUE KEY public_donation_church_transaction_unique");
  });

  it("bloqueia reenvio do mesmo comprovante por tenant sem misturar igrejas", () => {
    expect(service).toContain("const ACTIVE_PUBLIC_DONATION_STATUSES");
    expect(service).toContain("eq(publicDonationSubmissions.churchId, data.churchId)");
    expect(service).toContain("eq(publicDonationSubmissions.proofSha256, data.proofSha256)");
    expect(service).toContain("inArray(publicDonationSubmissions.status, ACTIVE_PUBLIC_DONATION_STATUSES)");
    expect(service).toContain('.for("update")');
    expect(service).toContain("PUBLIC_DONATION_DUPLICATE_MESSAGE");
  });

  it("bloqueia aprovação quando outro envio ativo usa o mesmo hash", () => {
    expect(service).toContain("ne(publicDonationSubmissions.id, data.id)");
    expect(service).toContain("Resolva a possível duplicidade do comprovante antes de aprovar esta doação.");
    expect(sectionSource()).toContain("hasDuplicateProof");
  });

  it("registra a migration no ledger com checksum exato", () => {
    const entry = ledger.entries.find(item => item.id === "0090");
    expect(entry).toMatchObject({ id: "0090", file: "drizzle/0090_public_donations.sql" });
    expect(entry?.sha256).toBe(createHash("sha256").update(migration).digest("hex"));
  });
});

function sectionSource() {
  return readFileSync(resolve(root, "client/src/components/PublicDonationsSection.tsx"), "utf8");
}
