import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./ConfiguracoesCertificados.tsx", import.meta.url), "utf8");

describe("Configurações de Certificados", () => {
  it("usa uma prévia interna em vez de abrir uma janela assíncrona", () => {
    expect(source).toContain("<CertificatePreviewDialog");
    expect(source).toContain("Prévia usando os dados atuais");
    expect(source).not.toContain("window.open(data.url");
    expect(source).not.toContain("trpc.certificates.generate.useMutation");
  });

  it("mantém o preview tenant-aware e usa os valores atuais do formulário", () => {
    expect(source).toContain("const { churchId, churchName } = useChurch();");
    expect(source).toContain("churchName={churchName}");
    expect(source).toContain("pastorName={pastorName}");
    expect(source).toContain("logoUrl={logoUrl}");
    expect(source).toContain("verse={previewType === \"fundamentos\" ? verseFundamentos");
  });

  it("mantém os três tipos existentes de certificado", () => {
    expect(source).toContain('"fundamentos"');
    expect(source).toContain('"batismo"');
    expect(source).toContain('"lideres"');
  });

  it("reserva uma área fixa para assinatura e versículo no mobile", () => {
    expect(source).toContain("pb-[20%]");
    expect(source).toContain("bottom-[6.5%]");
    expect(source).toContain("line-clamp-3");
    expect(source).toContain("bottom-[2%]");
  });
});
