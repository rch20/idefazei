import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./TreasuryPdfPreview.tsx", import.meta.url), "utf8");

describe("prévia móvel do PDF da Tesouraria", () => {
  it("mantém ações explícitas para sair e reutilizar o arquivo", () => {
    expect(source).toContain("Voltar");
    expect(source).toContain("Compartilhar");
    expect(source).toContain("Baixar");
    expect(source).toContain("Imprimir");
  });

  it("usa compartilhamento nativo de arquivo e download como fallback", () => {
    expect(source).toContain("navigator.share");
    expect(source).toContain("navigator.canShare");
    expect(source).toContain("downloadTreasuryPdf(blob, fileName)");
    expect(source).toContain('type: "application/pdf"');
  });

  it("mantém a prévia dentro do painel em vez de abrir uma janela órfã", () => {
    expect(source).toContain("showCloseButton={false}");
    expect(source).toContain("Prévia do relatório de Tesouraria em PDF");
    expect(source).not.toContain('window.open("", "_blank"');
  });
});
