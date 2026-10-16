import { describe, expect, it } from "vitest";
import { toggleJourneyNoteStage } from "./journeyNote";

describe("toggleJourneyNoteStage", () => {
  it("abre a observação da etapa e carrega a nota existente", () => {
    expect(
      toggleJourneyNoteStage(null, "fundamentos", "Acompanhamento iniciado")
    ).toEqual({
      stage: "fundamentos",
      note: "Acompanhamento iniciado",
    });
  });

  it("fecha a observação da etapa ativa e limpa o rascunho visual", () => {
    expect(
      toggleJourneyNoteStage("fundamentos", "fundamentos", "Rascunho não salvo")
    ).toEqual({
      stage: null,
      note: "",
    });
  });

  it("troca de etapa sem fechar o painel e carrega a nota da nova etapa", () => {
    expect(
      toggleJourneyNoteStage("fundamentos", "celula", "Nota da Célula")
    ).toEqual({
      stage: "celula",
      note: "Nota da Célula",
    });
  });
});
