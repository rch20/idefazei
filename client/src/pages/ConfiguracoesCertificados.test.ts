import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pageSource = readFileSync(new URL("./ConfiguracoesCertificados.tsx", import.meta.url), "utf8");
const artboardSource = readFileSync(new URL("../components/CertificateArtboard.tsx", import.meta.url), "utf8");
const templateSource = readFileSync(new URL("../../../shared/certificateTemplate.ts", import.meta.url), "utf8");

describe("Configurações de Certificados", () => {
  it("exibe o aviso de construção e bloqueia a prévia enquanto o modelo não está aprovado", () => {
    expect(pageSource).toContain("CERTIFICATES_UNDER_CONSTRUCTION = true");
    expect(pageSource).toContain("Certificados em construção");
    expect(pageSource).toContain("A prévia e a emissão permanecem temporariamente indisponíveis");
    expect(pageSource).toContain("disabled={CERTIFICATES_UNDER_CONSTRUCTION}");
    expect(pageSource).toContain("enabled: !!churchId && !CERTIFICATES_UNDER_CONSTRUCTION");
    expect(pageSource).toContain("A criação e a emissão de tipos adicionais serão liberadas depois");
  });

  it("usa uma prévia interna fullscreen e mantém a emissão explícita separada", () => {
    expect(pageSource).toContain("<CertificatePreviewDialog");
    expect(pageSource).toContain("h-[100dvh] w-screen");
    expect(pageSource).toContain("Prévia do certificado");
    expect(pageSource).toContain("const emitCustomCertificateMutation = trpc.certificates.generate.useMutation");
    expect(pageSource).toContain("function closePreview(open: boolean)");
  });

  it("mantém o preview tenant-aware e usa os valores atuais do formulário", () => {
    expect(pageSource).toContain("const { churchId, churchName } = useChurch();");
    expect(pageSource).toContain("churchName={churchName}");
    expect(pageSource).toContain("pastorName={pastorName}");
    expect(pageSource).toContain("logoUrl={logoUrl}");
    expect(pageSource).toContain("verse={previewType === \"fundamentos\" ? verseFundamentos");
  });

  it("mantém os três tipos existentes e permite conteúdo sem editor livre", () => {
    expect(pageSource).toContain('"fundamentos"');
    expect(pageSource).toContain('"batismo"');
    expect(pageSource).toContain('"lideres"');
    expect(pageSource).toContain("Conteúdo dos Certificados");
    expect(pageSource).toContain("Modelo moderno");
    expect(pageSource).toContain("Frase de reconhecimento");
  });

  it("usa artboard horizontal fixo, zonas semânticas e controles de ampliação", () => {
    expect(pageSource).toContain("ZoomIn");
    expect(pageSource).toContain("ZoomOut");
    expect(artboardSource).toContain("preserveAspectRatio");
    expect(artboardSource).toContain("viewBox={`0 0 ${width} ${height}`}");
    expect(artboardSource).toContain("CERTIFICATE_LAYOUT.footer");
    expect(templateSource).toContain("CERTIFICATE_ARTBOARD");
    expect(templateSource).toContain("CERTIFICATE_TEXT_LIMITS");
  });

  it("permite gerenciar tipos personalizados sem liberar edição gráfica", () => {
    expect(pageSource).toContain("trpc.certificates.listCustomTypes.useQuery");
    expect(pageSource).toContain("trpc.certificates.createCustomType.useMutation");
    expect(pageSource).toContain("trpc.certificates.updateCustomType.useMutation");
    expect(pageSource).toContain("trpc.certificates.archiveCustomType.useMutation");
    expect(pageSource).toContain("Novo tipo");
    expect(pageSource).toContain("Modelo moderno");
  });

  it("permite emitir o tipo personalizado para uma pessoa da igreja", () => {
    expect(pageSource).toContain("emitCustomCertificateMutation");
    expect(pageSource).toContain("customTypeId: emitTarget.id");
    expect(pageSource).toContain("people as Array<{ id: number; fullName: string }>");
    expect(pageSource).toContain("Gerar PDF");
  });
});
