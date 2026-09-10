import { describe, expect, it } from "vitest";
import { CERTIFICATE_ARTBOARD, CERTIFICATE_LAYOUT, createCertificateRenderModel } from "../shared/certificateTemplate";

describe("contrato visual do certificado", () => {
  it("mantém o artboard A4 horizontal estável", () => {
    expect(CERTIFICATE_ARTBOARD.width / CERTIFICATE_ARTBOARD.height).toBeCloseTo(1.414, 2);
    expect(CERTIFICATE_ARTBOARD.pdfWidth / CERTIFICATE_ARTBOARD.pdfHeight).toBeCloseTo(1.414, 2);
    expect(CERTIFICATE_LAYOUT.footer.dividerY).toBeGreaterThan(CERTIFICATE_LAYOUT.content.course.y);
  });

  it.each(["fundamentos", "batismo", "lideres"] as const)("limita textos do tipo %s sem segunda linha estrutural", (type) => {
    const model = createCertificateRenderModel({
      type,
      memberName: "Uma pessoa com um nome excepcionalmente comprido que não deve colidir com o rodapé",
      churchName: "Uma igreja com um nome muito extenso para testar os limites de identidade",
      pastorName: "Um pastor com nome muito extenso para testar a assinatura",
      signatureLabel: "Pastor Presidente da Igreja Local e Responsável pela Formação",
      verse: "Uma mensagem muito longa para garantir que o versículo permaneça em sua região sem tocar na formação ou nas assinaturas.",
      dateLabel: "09 de setembro de 2026",
      template: {
        modelKey: "modern-v1",
        title: "UM TÍTULO DE CERTIFICADO MUITO EXTENSO PARA TESTE",
        subtitle: "Uma formação cristã com um nome extenso demais para caber sem limite",
        body: "Uma frase de reconhecimento extensa para validar a limitação segura do corpo do documento sem permitir colisões.",
      },
    });

    expect(model.title.lineCount).toBe(1);
    expect(model.subtitle.lineCount).toBe(1);
    expect(model.memberName.lineCount).toBe(1);
    expect(model.body.lineCount).toBeLessThanOrEqual(3);
    expect(model.verse.lineCount).toBeLessThanOrEqual(CERTIFICATE_LAYOUT.verse.maxLines);
    expect(model.subtitle.text.length).toBeLessThanOrEqual(90);
    expect(model.memberName.text.length).toBeLessThanOrEqual(90);
  });
});
