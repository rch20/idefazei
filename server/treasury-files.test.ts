import { describe, expect, it } from "vitest";
import { matchesTreasuryAttachmentSignature, safeTreasuryAttachmentName } from "./treasury-files";

describe("segurança de comprovantes financeiros", () => {
  it("aceita assinaturas reais dos formatos permitidos", () => {
    expect(matchesTreasuryAttachmentSignature(Buffer.from("%PDF-1.7\n"), "application/pdf")).toBe(true);
    expect(matchesTreasuryAttachmentSignature(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), "image/png")).toBe(true);
    expect(matchesTreasuryAttachmentSignature(Buffer.from([0xff, 0xd8, 0xff, 0xe0]), "image/jpeg")).toBe(true);
    expect(matchesTreasuryAttachmentSignature(Buffer.from("RIFF1234WEBP"), "image/webp")).toBe(true);
  });

  it("rejeita conteúdo disfarçado apenas com MIME permitido", () => {
    expect(matchesTreasuryAttachmentSignature(Buffer.from("<script>alert(1)</script>"), "application/pdf")).toBe(false);
    expect(matchesTreasuryAttachmentSignature(Buffer.from("not-an-image"), "image/png")).toBe(false);
    expect(matchesTreasuryAttachmentSignature(Buffer.from("%PDF-1.7"), "text/html")).toBe(false);
  });

  it("normaliza o nome sem duplicar extensão", () => {
    expect(safeTreasuryAttachmentName("Extrato agosto.pdf", "application/pdf")).toBe("Extrato_agosto.pdf");
    expect(safeTreasuryAttachmentName("comprovante.JPG", "image/jpeg")).toBe("comprovante.jpg");
    expect(safeTreasuryAttachmentName("../../segredo.webp", "image/webp")).toBe("segredo.webp");
  });
});
