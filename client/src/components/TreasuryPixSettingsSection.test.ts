import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const componentSource = readFileSync(
  new URL("./TreasuryPixSettingsSection.tsx", import.meta.url),
  "utf8"
);
const pageSource = readFileSync(
  new URL("../pages/Tesouraria.tsx", import.meta.url),
  "utf8"
);

describe("TreasuryPixSettingsSection — configuração PIX do tenant", () => {
  it("consulta e salva sempre usando o churchId do tenant atual", () => {
    expect(componentSource).toContain("trpc.treasury.pixSettings.useQuery");
    expect(componentSource).toContain(
      "trpc.treasury.savePixSettings.useMutation"
    );
    expect(componentSource).toContain("{ churchId }");
    expect(componentSource).toContain("churchId,");
    expect(componentSource).toContain(
      "utils.treasury.pixSettings.invalidate({ churchId })"
    );
  });

  it("cobre tipos de chave e os dados necessários para o recebedor", () => {
    expect(componentSource).toContain(
      'type PixKeyType = "cpf" | "cnpj" | "email" | "telefone" | "aleatoria" | "outro"'
    );
    expect(componentSource).toContain('htmlFor="treasury-pix-key-type"');
    expect(componentSource).toContain('htmlFor="treasury-pix-key"');
    expect(componentSource).toContain('htmlFor="treasury-pix-recipient"');
    expect(componentSource).toContain('htmlFor="treasury-pix-institution"');
    expect(componentSource).toContain("pixKeyType: form.pixKeyType");
    expect(componentSource).toContain("recipientName");
  });

  it("mantém a alteração restrita a pastores e orienta os demais perfis", () => {
    expect(componentSource).toContain("canManageStructure");
    expect(componentSource).toContain("pastores podem alterar a chave PIX.");
    expect(componentSource).toContain("Solicite a um pastor");
    expect(pageSource).toContain(
      "<TreasuryPixSettingsSection churchId={churchId} canManageStructure={canManageStructure} />"
    );
  });

  it("oferece estados claros de carregamento, erro, ausência e sucesso", () => {
    expect(componentSource).toContain("Carregando configuração PIX");
    expect(componentSource).toContain(
      "Não foi possível carregar a configuração PIX desta igreja."
    );
    expect(componentSource).toContain("Ainda não configurada");
    expect(componentSource).toContain("Chave PIX salva para esta igreja.");
    expect(componentSource).toContain("Atualizar chave PIX");
  });
});
