import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { CERTIFICATE_ARTBOARD } from "../shared/certificateTemplate";
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
    const document = await PDFDocument.load(pdf);
    const page = document.getPage(0);
    expect(page.getWidth()).toBeCloseTo(CERTIFICATE_ARTBOARD.pdfWidth, 1);
    expect(page.getHeight()).toBeCloseTo(CERTIFICATE_ARTBOARD.pdfHeight, 1);
  });

  it("aceita conteúdo longo sem alterar a página nem o modelo protegido", async () => {
    const pdf = await generateCertificatePDF({
      type: "batismo",
      memberName: "Uma pessoa com um nome muito extenso para validar o limite seguro",
      churchName: "Igreja Cristã Viver",
      pastorName: "Pr. Luiz Rocha",
      signatureLabel: "Pastor Presidente",
      verse: "Uma mensagem extensa para verificar que o versículo permanece em sua região própria.",
      template: {
        modelKey: "modern-v1",
        title: "CERTIFICADO DE BATISMO",
        subtitle: "Uma formação cristã extraordinariamente longa para teste",
        body: "Uma frase longa de reconhecimento para validar a composição do documento.",
      },
    });
    const document = await PDFDocument.load(pdf);
    expect(document.getPageCount()).toBe(1);
    expect(document.getPage(0).getWidth()).toBeCloseTo(CERTIFICATE_ARTBOARD.pdfWidth, 1);
    expect(document.getPage(0).getHeight()).toBeCloseTo(CERTIFICATE_ARTBOARD.pdfHeight, 1);
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
