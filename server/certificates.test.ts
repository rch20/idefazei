import { describe, expect, it } from "vitest";
import { generateCertificatePDF } from "./certificates";

describe("geração do modelo moderno de certificados", () => {
  it.each(["fundamentos", "batismo", "lideres"] as const)("gera PDF válido para %s", async (type) => {
    const pdf = await generateCertificatePDF({
      type,
      memberName: "Nome do Membro",
      churchName: "Igreja Cristã Viver",
      pastorName: "João",
      signatureLabel: "Pastor(a) Presidente",
      verse: "Uma mensagem ou versículo de exemplo para o certificado.",
      courseName: type === "fundamentos" ? "Escola de Fundamentos" : undefined,
      date: "2026-09-09",
    });

    expect(pdf.byteLength).toBeGreaterThan(1000);
    expect(new TextDecoder().decode(pdf.slice(0, 5))).toBe("%PDF-");
  });

  it("aceita personalização de nome, subtítulo e frase mantendo o modelo protegido", async () => {
    const pdf = await generateCertificatePDF({
      type: "fundamentos",
      memberName: "Maria Rocha",
      churchName: "Igreja Cristã Viver",
      template: {
        modelKey: "modern-v1",
        title: "CERTIFICADO DE CONCLUSÃO",
        subtitle: "Escola de Discípulos",
        body: "concluiu sua formação em discipulado cristão",
      },
    });

    expect(pdf.byteLength).toBeGreaterThan(1000);
    expect(new TextDecoder().decode(pdf.slice(0, 5))).toBe("%PDF-");
  });
});
