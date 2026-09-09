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

  it("mantém os três tipos existentes e permite conteúdo sem editor livre", () => {
    expect(source).toContain('"fundamentos"');
    expect(source).toContain('"batismo"');
    expect(source).toContain('"lideres"');
    expect(source).toContain("Conteúdo dos Certificados");
    expect(source).toContain("Modelo moderno");
    expect(source).toContain("Frase de reconhecimento");
  });

  it("protege a hierarquia moderna e separa assinatura e versículo no mobile", () => {
    expect(source).toContain("rounded-full border-[10px]");
    expect(source).toContain("grid grid-cols-2");
    expect(source).toContain("hidden w-[23%]");
    expect(source).toContain("sm:hidden");
    expect(source).toContain("line-clamp-2");
  });
});
