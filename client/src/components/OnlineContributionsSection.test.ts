import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync(new URL("./OnlineContributionsSection.tsx", import.meta.url), "utf8");
const treasurySource = readFileSync(new URL("../pages/Tesouraria.tsx", import.meta.url), "utf8");


describe("Tesouraria — contribuições on-line", () => {
  it("integra a fila tenant-aware ao painel da Tesouraria", () => {
    expect(treasurySource).toContain("OnlineContributionsSection");
    expect(pageSource).toContain("trpc.treasury.onlineContributions.useQuery");
    expect(pageSource).toContain("{ churchId }");
    expect(pageSource).toContain('statusFilter === "pendente"');
    expect(pageSource).toContain("Buscar por nome ou número");
  });

  it("abre o comprovante em uma prévia modal por URL assinada e não expõe a chave privada", () => {
    expect(pageSource).toContain("signedProofUrl");
    expect(pageSource).toContain("Ver comprovante");
    expect(pageSource).toContain("proofPreviewOpen");
    expect(pageSource).toContain("openProofPreview");
    expect(pageSource).toContain("Prévia do comprovante");
    expect(pageSource).toContain("iframe");
    expect(pageSource).not.toContain('target="_blank"');
    expect(pageSource).not.toContain("proofFileKey");
  });

  it("exige conferência de valor, data, conta e categoria antes da aprovação", () => {
    expect(pageSource).toContain("trpc.treasury.approveOnlineContribution.useMutation");
    expect(pageSource).toContain("confirmedAmountCents");
    expect(pageSource).toContain("paymentDate");
    expect(pageSource).toContain("accountId");
    expect(pageSource).toContain("categoryId");
    expect(pageSource).toContain("Aprovar e lançar");
    expect(pageSource).toContain("overview.invalidate");
  });

  it("exige motivo para recusar e preserva o caminho de aprovação separado", () => {
    expect(pageSource).toContain("trpc.treasury.rejectOnlineContribution.useMutation");
    expect(pageSource).toContain("rejectionReason");
    expect(pageSource).toContain("length < 5");
    expect(pageSource).toContain("Confirmar recusa");
    expect(pageSource).toContain("Recusar contribuição");
  });

  it("diferencia em análise, aprovada e recusada com estados vazios e carregamento", () => {
    expect(pageSource).toContain('"Em análise"');
    expect(pageSource).toContain('"Aprovada"');
    expect(pageSource).toContain('"Recusada"');
    expect(pageSource).toContain("Nenhuma contribuição aguardando conferência");
    expect(pageSource).toContain("contributionsQuery.isLoading");
    expect(pageSource).toContain('role="alert"');
  });
});
