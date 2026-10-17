import { describe, expect, it } from "vitest";
import { assertFoundationImportPayload } from "./foundationImportPayloadGuard";
import type { FoundationImportPayload } from "./foundationImport";

function payload(): FoundationImportPayload {
  return {
    templateVersion: 2,
    courseId: 10,
    courseName: "Turma sintética",
    study: {
      title: "Conhecendo o amor",
      weekStart: "2026-10-19",
      moduleTitle: null,
      summary: null,
      content: null,
      publish: false,
    },
    blocks: ["Leia", "Entenda", "Responda", "Aplique"].map(
      (title, position) => ({
        title,
        position,
        content: "Conteúdo sintético",
        reflectionPrompt: null,
        publish: true,
      })
    ),
    questions: [
      {
        blockTitle: "Responda",
        blockPosition: 2,
        prompt: "Qual a opção?",
        options: [
          { id: "a", label: "Primeira" },
          { id: "b", label: "Segunda" },
        ],
        correctOptionId: "b",
        explanation: "Explicação pedagógica",
        publish: true,
      },
    ],
    class: null,
    materials: [],
  };
}
function denied(value: FoundationImportPayload, courseId = 10) {
  expect(() => assertFoundationImportPayload(value, courseId)).toThrow(
    expect.objectContaining({ code: "PRECONDITION_FAILED" })
  );
}
describe("revalidação da importação v2 antes do commit", () => {
  it("aceita o modelo v2 sem modificar os campos opcionais", () => {
    const value = payload();
    const before = structuredClone(value);
    expect(() => assertFoundationImportPayload(value, 10)).not.toThrow();
    expect(value).toEqual(before);
  });
  it("mantém os drafts anteriores sem versão compatíveis", () => {
    const value = payload();
    delete value.templateVersion;
    value.study.publish = true;
    value.blocks = value.blocks.slice(0, 1);
    expect(() => assertFoundationImportPayload(value, 10)).not.toThrow();
  });
  it("não usa courseId de outro conteúdo para substituir a turma do draft", () =>
    denied(payload(), 20));
  it("bloqueia versão desconhecida", () =>
    denied({ ...payload(), templateVersion: 3 } as any));
  it("impede uma tentativa v2 de publicar ao importar", () => {
    const value = payload();
    value.study.publish = true;
    denied(value);
  });
  it.each(["posição", "título", "conteúdo", "reflexão", "publicação"])(
    "revalida %s do bloco",
    field => {
      const value = payload();
      if (field === "posição") value.blocks[1].position = 0;
      if (field === "título") value.blocks[1].title = "Outra etapa";
      if (field === "conteúdo") value.blocks[1].content = " ";
      if (field === "reflexão")
        value.blocks[1].reflectionPrompt = "a".repeat(1001);
      if (field === "publicação") value.blocks[1].publish = false;
      denied(value);
    }
  );
  it.each([2, 4, 6])("aceita %i alternativas com gabarito presente", count => {
    const value = payload();
    value.questions[0].options = [..."abcdef"]
      .slice(0, count)
      .map(id => ({ id, label: `Alternativa ${id}` }));
    value.questions[0].correctOptionId =
      value.questions[0].options[count - 1].id;
    expect(() => assertFoundationImportPayload(value, 10)).not.toThrow();
  });
  it.each(["vazia", "lacuna", "duplicada", "gabarito", "etapa", "explicação"])(
    "bloqueia pergunta com %s inválida",
    reason => {
      const value = payload();
      const question = value.questions[0];
      if (reason === "vazia") question.options[0].label = " ";
      if (reason === "lacuna") question.options[1].id = "c";
      if (reason === "duplicada") question.options[1].id = "a";
      if (reason === "gabarito") question.correctOptionId = "f";
      if (reason === "etapa") question.blockPosition = 1;
      if (reason === "explicação") question.explanation = " ";
      denied(value);
    }
  );
  it("não inventa pergunta quando nenhuma foi informada", () => {
    const value = payload();
    value.questions = [];
    expect(() => assertFoundationImportPayload(value, 10)).not.toThrow();
    expect(value.questions).toHaveLength(0);
  });
  it("rejeita aula fora do domingo ou antes da semana", () => {
    const value = payload();
    value.class = { classDate: "2026-10-24", status: "planejada", notes: null };
    denied(value);
    value.class.classDate = "2026-10-18";
    denied(value);
    value.class.classDate = "2026-10-25";
    expect(() => assertFoundationImportPayload(value, 10)).not.toThrow();
  });
  it("rejeita datas inexistentes mesmo com formato ISO", () => {
    const value = payload();
    value.study.weekStart = "2026-02-30";
    denied(value);
  });
  it("rejeita materiais com ordem duplicada", () => {
    const value = payload();
    value.materials = [
      { position: 0, title: "Material 1", notes: null },
      { position: 0, title: "Material 2", notes: null },
    ];
    denied(value);
  });
  it("não expõe conteúdo nem detalhes internos na rejeição", () => {
    const value = payload();
    value.study.title = "a".repeat(161);
    try {
      assertFoundationImportPayload(value, 10);
      throw Error("REJEICAO_NAO_OCORREU");
    } catch (error: any) {
      expect(error.code).toBe("PRECONDITION_FAILED");
      expect(error.message).not.toContain(value.study.title);
      expect(error.message).not.toContain("Zod");
    }
  });
});
