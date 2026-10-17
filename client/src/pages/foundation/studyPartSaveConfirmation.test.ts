import { describe, expect, it } from "vitest";
import {
  confirmsStudyPartSave,
  studySaveErrorMessage,
  validateStudyPartSave,
  type StudyPartSavePayload,
} from "./studyPartSaveConfirmation";

const payload: StudyPartSavePayload = {
  churchId: 101,
  studyId: 77,
  blockId: 84,
  title: " Aplique ",
  content: " Ação sintética de QA. ",
  reflectionPrompt: " Como vou praticar? ",
  active: true,
};
const saved = {
  id: 84,
  churchId: 101,
  studyId: 77,
  title: "Aplique",
  content: "Ação sintética de QA.",
  reflectionPrompt: "Como vou praticar?",
  active: true,
};

describe("confirmação do salvamento da etapa", () => {
  it("aceita somente os dados e destino enviados, com a normalização do servidor", () => {
    expect(confirmsStudyPartSave(payload, saved)).toBe(true);
  });
  it.each(["id", "churchId", "studyId"])(
    "rejeita destino divergente: %s",
    key => {
      expect(confirmsStudyPartSave(payload, { ...saved, [key]: 999 })).toBe(
        false
      );
    }
  );
  it.each(["title", "content", "reflectionPrompt", "active"])(
    "rejeita conteúdo não confirmado: %s",
    key => {
      expect(
        confirmsStudyPartSave(payload, {
          ...saved,
          [key]: key === "active" ? false : "Valor anterior",
        })
      ).toBe(false);
    }
  );
  it.each([null, undefined, {}, { id: 84 }, "sucesso"])(
    "não confunde resposta incompleta com persistência",
    result => {
      expect(confirmsStudyPartSave(payload, result)).toBe(false);
    }
  );
  it("aceita reflexão opcional vazia normalizada para null", () => {
    expect(
      confirmsStudyPartSave(
        { ...payload, reflectionPrompt: "  " },
        { ...saved, reflectionPrompt: null }
      )
    ).toBe(true);
  });
  it("rejeita reflexão de tipo inválido sem lançar erro", () => {
    expect(
      confirmsStudyPartSave(payload, { ...saved, reflectionPrompt: 42 })
    ).toBe(false);
  });
});

describe("validação local espelha os limites da procedure", () => {
  it("permite payload válido", () =>
    expect(validateStudyPartSave(payload)).toBeNull());
  it.each(["", "ab", "x".repeat(161)])("bloqueia nome inválido", title => {
    expect(validateStudyPartSave({ ...payload, title })).toContain(
      "nome da etapa"
    );
  });
  it.each(["   ", "x".repeat(12001)])(
    "bloqueia conteúdo vazio ou excessivo",
    content => {
      expect(validateStudyPartSave({ ...payload, content })).toContain(
        "conteúdo da etapa"
      );
    }
  );
  it("aceita os limites superiores exatos", () => {
    expect(
      validateStudyPartSave({
        ...payload,
        title: "x".repeat(160),
        content: "x".repeat(12000),
        reflectionPrompt: "x".repeat(1000),
      })
    ).toBeNull();
  });
  it("bloqueia reflexão excessiva e permite ausência", () => {
    expect(
      validateStudyPartSave({ ...payload, reflectionPrompt: "x".repeat(1001) })
    ).toContain("reflexão");
    expect(
      validateStudyPartSave({ ...payload, reflectionPrompt: null })
    ).toBeNull();
  });
});

describe("mensagens seguras de salvamento", () => {
  it("mostra apenas o UUID de correlação gerado pelo servidor", () => {
    const requestId = "da8e1b2f-8b45-48c2-a07b-af388ba6ce6d";
    expect(
      studySaveErrorMessage({ data: { code: "BAD_REQUEST", requestId } })
    ).toContain(`Referência: ${requestId}`);
  });
  it.each([
    "SYNTHETIC_SECRET",
    "<script>PRIVATE</script>",
    "abc\nPRIVATE",
    123,
  ])("ignora referência não validada", requestId => {
    const message = studySaveErrorMessage({
      data: { code: "BAD_REQUEST", requestId },
    });
    expect(message).not.toContain("Referência:");
    expect(message).not.toMatch(/PRIVATE|SECRET|script/);
  });
  it.each([
    "BAD_REQUEST",
    "UNAUTHORIZED",
    "FORBIDDEN",
    "NOT_FOUND",
    "CONFLICT",
    "SAVE_CONFIRMATION_MISMATCH",
  ])("classifica %s sem expor mensagem ou dados do erro", code => {
    const message = studySaveErrorMessage({
      data: { code },
      message: "SQL e segredo fictício NÃO EXIBIR",
      payload: payload,
    });
    expect(message).not.toContain("SQL");
    expect(message).not.toContain("NÃO EXIBIR");
    expect(message).not.toContain(payload.content.trim());
  });
  it("não inventa timeout a partir de erro desconhecido", () => {
    const message = studySaveErrorMessage(new Error("Failed to fetch"));
    expect(message).toContain("Não foi possível confirmar");
    expect(message).not.toContain("timeout");
  });
  it("não confunde conflito com sucesso ou cria uma nova operação", () => {
    expect(studySaveErrorMessage({ data: { code: "CONFLICT" } })).toContain(
      "confira o registro"
    );
  });
});
