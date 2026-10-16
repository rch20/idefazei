import { describe, expect, it } from "vitest";
import {
  nextQuestionOptionId,
  validateStudyQuestionDraft,
  type StudyQuestionDraft,
} from "./studyQuestionDraft";
const valid = (): StudyQuestionDraft => ({
  prompt: "Qual atitude encoraja?",
  options: [
    { id: "a", label: "Ouvir com atenção" },
    { id: "b", label: "Ignorar" },
  ],
  correctOptionId: "a",
  explanation: "Ouvir demonstra cuidado. Observe a necessidade da pessoa.",
});
describe("Fase 4 — contrato local de uma nova pergunta", () => {
  it("aceita duas alternativas e o mesmo payload já suportado pelo servidor", () =>
    expect(validateStudyQuestionDraft(valid())).toBeNull());
  it("aceita seis alternativas sem reduzir a capacidade do servidor", () => {
    const draft = valid();
    draft.options = ["a", "b", "c", "d", "e", "f"].map(id => ({
      id,
      label: "Alternativa " + id,
    }));
    expect(validateStudyQuestionDraft(draft)).toBeNull();
    expect(nextQuestionOptionId(draft.options)).toBeNull();
  });
  it("recusa sete alternativas", () => {
    const draft = valid();
    draft.options = Array.from({ length: 7 }, (_, i) => ({
      id: String(i),
      label: "Opção " + i,
    }));
    expect(validateStudyQuestionDraft(draft)).toBe(
      "Use de duas a seis alternativas."
    );
  });
  it("recusa alternativa vazia", () => {
    const draft = valid();
    draft.options[0].label = "  ";
    expect(validateStudyQuestionDraft(draft)).toContain("Preencha todas");
  });
  it("recusa textos duplicados apenas no novo formulário, sem mexer em registros antigos", () => {
    const draft = valid();
    draft.options[1].label = " ouvir com ATENÇÃO ";
    expect(validateStudyQuestionDraft(draft)).toBe(
      "Use textos diferentes nas alternativas."
    );
  });
  it("recusa IDs duplicados", () => {
    const draft = valid();
    draft.options[1].id = "a";
    expect(validateStudyQuestionDraft(draft)).toContain(
      "identificadores distintos"
    );
  });
  it("exige nova escolha quando a alternativa correta é removida", () => {
    const draft = valid();
    draft.correctOptionId = "removida";
    expect(validateStudyQuestionDraft(draft)).toBe(
      "Marque a resposta correta entre as alternativas."
    );
  });
  it("mantém explicação obrigatória", () => {
    const draft = valid();
    draft.explanation = " ";
    expect(validateStudyQuestionDraft(draft)).toContain("Explique a resposta");
  });
  it("não renumera identificadores de alternativas que já estão no rascunho", () => {
    const options = [
      { id: "a", label: "A" },
      { id: "c", label: "C" },
    ];
    expect(nextQuestionOptionId(options)).toBe("b");
    expect(options.map(option => option.id)).toEqual(["a", "c"]);
  });
});
