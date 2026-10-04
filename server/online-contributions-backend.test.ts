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
  it("permite envio a qualquer usuário da igreja vinculado à própria Pessoa e preserva o tenant", () => {
    const submit = blockBetween(routerSource, "submitOnlineContribution:", "approveOnlineContribution:");
    expect(submit).toMatch(/requireOnlineContributionActor\s*\(\s*ctx\.user\.id\s*,\s*input\.churchId\s*\)/);
    expect(submit).toContain("personId: access.personId");
    expect(submit).toContain("submittedByChurchUserId: access.churchUserId");
    expect(submit).toMatch(/isOnlineContributionProofKeyForActor\s*\(\s*input\.proofFileKey\s*,\s*input\.churchId\s*,\s*access\.churchUserId\s*\)/);
    expect(submit).toContain("idempotencyKey");
  });

  it("resolve pastor, líder, tesoureiro e membro pelo mesmo vínculo e rejeita usuário sem Pessoa", () => {
    const guard = blockBetween(routerSource, "async function requireOnlineContributionActor", "async function presentOnlineContribution");
    expect(guard).toContain("requireChurchMember(userId, churchId)");
    expect(guard).toContain("return { actor, churchUserId: actor.id, personId: actor.personId }");
    expect(guard).toContain("Seu usuário precisa estar vinculado a uma Pessoa");
    expect(guard).not.toContain("userId >= 0");
  });

  it("permite mensagem a pastores e tesoureiros, mas preserva a chave PIX exclusiva dos pastores", () => {
    const access = blockBetween(routerSource, "async function requireTreasuryAccess", "type TreasuryReportSignatureRole").replace(/\s+/g, " ");
    const keyMutation = blockBetween(routerSource, "savePixSettings:", "updatePixThankYouMessage:");
    const messageMutation = blockBetween(routerSource, "updatePixThankYouMessage:", "myOnlineContributions:");
    expect(access).toContain("canManageStructure: roles.some");
    expect(access).toContain('"pastor_presidente", "pastor_local"');
    expect(access).toContain("canManageThankYouMessage: roles.some");
    expect(access).toContain('"pastor_presidente", "pastor_local", "tesoureiro"');
    expect(keyMutation).toContain("access.canManageStructure");
    expect(messageMutation).toContain("access.canManageThankYouMessage");
    expect(messageMutation).toContain("updateTreasuryPixThankYouMessage");
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
    expect(upload).toContain("uploadOnlineContributionProof");
    expect(upload).toContain('createHash("sha256")');
    expect(upload).not.toContain("res.json({ url:");
  });

  it("protege a consulta de Tesouraria e não expõe a chave física do comprovante", () => {
    const list = blockBetween(routerSource, "onlineContributions:", "onlineContribution:");
    const detail = blockBetween(routerSource, "onlineContribution:", "submitOnlineContribution:");
    expect(list).toContain("requireTreasuryAccess(ctx.user.id, input.churchId)");
    expect(detail).toContain("requireTreasuryAccess(ctx.user.id, input.churchId)");
    expect(routerSource).toContain("getOnlineContributionProofSignedUrl");
    expect(routerSource).toContain("isOnlineContributionProofKeyForActor");
    expect(routerSource).toContain("proofFileKey: _proofFileKey");
    expect(routerSource).toContain("proofUrl: _proofUrl");
  });

  it("usa asset privado do Cloudinary e mantém a referência sem segredo no banco", () => {
    const proofStorageSource = readFileSync(new URL("./onlineContributionProofStorage.ts", import.meta.url), "utf8");
    expect(proofStorageSource).toContain('type: "private"');
    expect(proofStorageSource).toContain('resourceType = input.mimeType === "application/pdf" ? "raw" : "image"');
    expect(proofStorageSource).toContain("private_download_url");
    expect(proofStorageSource).toContain("base64url");
    expect(proofStorageSource).toContain("ENV.cloudinaryApiSecret");
    expect(proofStorageSource).toContain('resourceType === "raw" ? `.${format}` : ""');
  });
});
