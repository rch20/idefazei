import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "AreaMembro.tsx"), "utf8");

describe("Área do Membro — contato e login", () => {
  it("oferece edição do próprio telefone e WhatsApp", () => {
    expect(source).toContain("updateMyContact");
    expect(source).toContain("Editar contato");
    expect(source).toContain('id="member-phone"');
    expect(source).toContain('id="member-whatsapp"');
  });

  it("explica que o contato cadastrado pode ser usado no login", () => {
    expect(source).toContain("Telefone para login");
    expect(source).toContain("Este número será aceito como identificador de login.");
    expect(source).toContain("O WhatsApp também pode ser usado no login.");
    expect(source).toContain("O e-mail continua sendo o mesmo.");
  });

  it("oferece contribuição on-line a qualquer usuário autenticado com Pessoa vinculada sem expor histórico pessoal", () => {
    expect(source).toContain("canSubmitOnlineContribution");
    expect(source).not.toContain("isMemberSession");
    expect(source).toContain("treasury.pixForMember.useQuery");
    expect(source).not.toContain("treasury.myOnlineContributions.useQuery");
    expect(source).toContain("Enviar contribuição");
    expect(source).toContain("Envie sua própria contribuição");
    expect(source).not.toContain("Meus envios recentes");
  });

  it("envia tipo, valor, data, hash do comprovante e chave de idempotência", () => {
    expect(source).toContain("uploadOnlineContributionProof");
    expect(source).toContain("treasury.submitOnlineContribution.useMutation");
    expect(source).toContain("informedAmountCents: amountCents");
    expect(source).toContain("proofSha256: proof.sha256");
    expect(source).toContain("idempotencyKey");
    expect(source).toContain('id="online-contribution-proof"');
  });
  it("mostra uma confirmação de gratidão após o envio sem expor o status interno Em análise", () => {
    expect(source).toContain("contributionThankYouOpen");
    expect(source).toContain("Obrigado por sua contribuição");
    expect(source).toContain("contributionThankYouMessage");
    expect(source).not.toContain('"Em análise"');
  });
});
