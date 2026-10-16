import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const section = readFileSync(new URL("./PublicDonationsSection.tsx", import.meta.url), "utf8");
const host = readFileSync(new URL("./TreasuryQuickActionHost.tsx", import.meta.url), "utf8");
const publicPage = readFileSync(new URL("../pages/DoacaoPublica.tsx", import.meta.url), "utf8");
const tenantPage = readFileSync(new URL("../pages/TenantPublicPage.tsx", import.meta.url), "utf8");

describe("doações públicas — interface", () => {
  it("oferece o opt-in no tenant e uma rota pública sem login", () => {
    expect(tenantPage).toContain('trpc.treasury.publicDonationSettings.useQuery');
    expect(tenantPage).toContain('href="/doacao"');
    expect(publicPage).toContain('trpc.treasury.publicDonationSettings.useQuery');
    expect(publicPage).toContain('trpc.treasury.submitPublicDonation.useMutation');
    expect(publicPage).toContain("uploadPublicDonationProof");
  });

  it("mantém pedido de oração, comprovante privado e confirmação pós-envio", () => {
    expect(publicPage).toContain('id="public-donation-prayer"');
    expect(publicPage).toContain('id="public-donation-proof"');
    expect(publicPage).toContain("Contribuição recebida");
    expect(section).toContain("Pedido de oração");
    expect(section).toContain("signedProofUrl");
  });

  it("expõe a fila separada no Acesso rápido e só lança após aprovação", () => {
    expect(host).toContain('"doacoes-publicas"');
    expect(host).toContain("PublicDonationsSection");
    expect(host).toContain("Doações pela página pública");
    expect(section).toContain("approvePublicDonation");
    expect(section).toContain("rejectPublicDonation");
    expect(section).toContain("Aprovar e lançar");
    expect(section).toContain("fora dos totais financeiros");
  });

  it("não apresenta o nome genérico antigo ao usuário", () => {
    expect(section).toContain("Doações pela página pública");
    expect(section).not.toContain(">Doações públicas</");
  });

  it("mantém controles válidos, sem botão interativo aninhado", () => {
    expect(section).toContain("<article");
    expect(section).toContain('aria-expanded={active}');
    expect(section).not.toMatch(/<button[\s\S]*<article/);
  });
});
