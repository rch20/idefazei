import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const routerSource = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
const dbSource = readFileSync(new URL("./onlineContributions.ts", import.meta.url), "utf8");
const serverSource = readFileSync(new URL("./_core/index.ts", import.meta.url), "utf8");
const schemaSource = readFileSync(new URL("../drizzle/schema.ts", import.meta.url), "utf8");

function blockBetween(source: string, start: string, end: string) {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  expect(startIndex).toBeGreaterThanOrEqual(0);
  expect(endIndex).toBeGreaterThan(startIndex);
  return source.slice(startIndex, endIndex);
}

describe("backend de contribuições on-line", () => {
  it("mantém o envio restrito à sessão própria do membro e ao tenant", () => {
    const submit = blockBetween(routerSource, "submitOnlineContribution:", "approveOnlineContribution:");
    expect(submit).toContain("requireOnlineContributionChurchUser(ctx.user.id, input.churchId)");
    expect(submit).toContain("personId: access.personId");
    expect(submit).toContain("submittedByChurchUserId: access.churchUserId");
    expect(submit).toContain("expectedPrefix = `churches/${input.churchId}/treasury/online-contributions/${access.churchUserId}/`");
    expect(submit).toContain("idempotencyKey");
  });

  it("não cria lançamento financeiro no envio e exige aprovação para o livro-caixa", () => {
    const create = blockBetween(dbSource, "export async function createOnlineContribution", "export async function approveOnlineContribution");
    const approve = blockBetween(dbSource, "export async function approveOnlineContribution", "export async function rejectOnlineContribution");
    expect(create).toContain('status: "pendente"');
    expect(create).toContain('action: "contribuicao_enviada"');
    expect(create).not.toContain("financialTransactions).values");
    expect(approve).toContain("financialTransactions).values");
    expect(approve).toContain('status: "confirmado"');
    expect(approve).toContain('action: "contribuicao_aprovada"');
    expect(approve).toContain("financialTransactionId: transactionId");
  });

  it("preserva idempotência, lock de revisão e isolamento da igreja", () => {
    expect(schemaSource).toContain("online_contributions_church_submitter_idempotency_unique");
    expect(dbSource).toContain(".for(\"update\")");
    expect(dbSource).toContain("eq(onlineContributions.churchId, data.churchId)");
    expect(dbSource).toContain("eq(financialPeriodClosures.churchId, data.churchId)");
  });

  it("valida o comprovante por tipo, assinatura e prefixo privado do tenant", () => {
    const upload = blockBetween(serverSource, 'app.post("/api/treasury/online-contribution-proof"', "// Gabarito Excel");
    expect(upload).toContain("TREASURY_ATTACHMENT_MIME_TYPES");
    expect(upload).toContain("matchesTreasuryAttachmentSignature");
    expect(upload).toContain("churches/${churchUser.churchId}/treasury/online-contributions/${churchUser.id}/");
    expect(upload).toContain("createHash(\"sha256\")");
    expect(upload).not.toContain("res.json({ url:");
  });

  it("protege a consulta de Tesouraria e não expõe a chave física do comprovante", () => {
    const list = blockBetween(routerSource, "onlineContributions:", "onlineContribution:");
    const detail = blockBetween(routerSource, "onlineContribution:", "submitOnlineContribution:");
    expect(list).toContain("requireTreasuryAccess(ctx.user.id, input.churchId)");
    expect(detail).toContain("requireTreasuryAccess(ctx.user.id, input.churchId)");
    expect(routerSource).toContain("storageGetSignedUrl(row.contribution.proofFileKey)");
    expect(routerSource).toContain("const { proofFileKey: _proofFileKey, proofUrl: _proofUrl");
  });
});
