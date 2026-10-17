import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { FOUNDATION_V2_HEADERS } from "./foundationImportV2";
import { parseFoundationWorkbook } from "./foundationImport";

const fixturePath = process.env.FOUNDATION_V2_FIXTURE_PATH ?? resolve(process.cwd(), "client/src/documents/foundation/gabarito-escola-fundamentos-v2-vazio.xlsx");
const context = {
  courseId: 10,
  courseName: "Turma Fundamentos",
  moduleTitles: ["Módulo 1"],
  materials: [{ id: 1, title: "Material existente" }],
  existingWeekStarts: [],
};

function addSheet(workbook: ExcelJS.Workbook, name: keyof typeof FOUNDATION_V2_HEADERS, rows: unknown[][] = []) {
  const worksheet = workbook.addWorksheet(name);
  worksheet.getRow(4).values = [...FOUNDATION_V2_HEADERS[name]];
  rows.forEach((row, index) => {
    worksheet.getRow(index + 5).values = [...row];
  });
  return worksheet;
}

function v2Workbook({
  study = ["Turma Fundamentos", "Estudo v2", "19/10/2026", "Módulo 1", "", ""],
  blocks = [
    [1, "Leia", "Leia um parágrafo.\nPreserve esta quebra.", "O que chamou atenção?"],
    [2, "Entenda", "Entenda o contexto.", ""],
    [3, "Responda", "Escolha com atenção.", ""],
    [4, "Aplique", "Pratique nesta semana.", ""],
  ],
  questions = [[2, "Qual é a resposta?", "Sim", "Não", "Talvez", "", "", "", "c", "Porque o texto explica."]],
  classRow = [] as unknown[],
  materialRows = [] as unknown[][],
}: {
  study?: unknown[];
  blocks?: unknown[][];
  questions?: unknown[][];
  classRow?: unknown[];
  materialRows?: unknown[][];
} = {}) {
  const workbook = new ExcelJS.Workbook();
  workbook.addWorksheet("LEIA-ME");
  addSheet(workbook, "ESTUDO", [study]);
  addSheet(workbook, "BLOCOS", blocks);
  addSheet(workbook, "PERGUNTAS", questions);
  addSheet(workbook, "AULA", classRow.length ? [classRow] : []);
  addSheet(workbook, "MATERIAIS", materialRows);
  workbook.addWorksheet("LISTAS").state = "hidden";
  return workbook;
}

async function parse(workbook: ExcelJS.Workbook, customContext = context) {
  return parseFoundationWorkbook(Buffer.from(await workbook.xlsx.writeBuffer()), customContext);
}

function codes(result: Awaited<ReturnType<typeof parse>>) {
  return result.summary.problems.map((problem) => problem.code);
}

describe("foundationImport v2", () => {
  it("lê o gabarito vazio real como v2 e preserva as quatro etapas pendentes", async () => {
    expect(existsSync(fixturePath), `Fixture v2 ausente: ${fixturePath}`).toBe(true);
    const result = await parseFoundationWorkbook(readFileSync(resolve(fixturePath)), context);
    expect(result.summary.templateVersion).toBe(2);
    expect(result.payload.templateVersion).toBe(2);
    expect(result.payload.study.publish).toBe(false);
    expect(result.summary.publishStudy).toBe(false);
    expect(result.payload.blocks).toEqual([
      { position: 0, title: "Leia", content: "", reflectionPrompt: null, publish: true },
      { position: 1, title: "Entenda", content: "", reflectionPrompt: null, publish: true },
      { position: 2, title: "Responda", content: "", reflectionPrompt: null, publish: true },
      { position: 3, title: "Aplique", content: "", reflectionPrompt: null, publish: true },
    ]);
    expect(codes(result)).toEqual(expect.arrayContaining(["ESTUDO_VAZIO", "CONTEUDO_BLOCO_AUSENTE"]));
  });

  it("importa estudo, reflexão, aula e material; mantém parágrafos e ordena perguntas", async () => {
    const result = await parse(v2Workbook({
      questions: [
        [2, "Segunda pergunta", "A", "B", "", "", "", "", "b", "Explicação 2"],
        [1, "Primeira pergunta", "A", "B", "C", "D", "E", "F", "f", "Explicação 1"],
      ],
      classRow: ["25/10/2026", "Planejada", "Encontro"],
      materialRows: [[1, "Material existente", "Leitura"]],
    }));
    expect(result.summary.errors).toBe(0);
    expect(result.payload.templateVersion).toBe(2);
    expect(result.payload.study).toMatchObject({
      title: "Estudo v2",
      weekStart: "2026-10-19",
      moduleTitle: "Módulo 1",
      summary: null,
      content: null,
      publish: false,
    });
    expect(result.payload.blocks[0]).toMatchObject({ position: 0, title: "Leia", reflectionPrompt: "O que chamou atenção?", publish: true });
    expect(result.payload.blocks[0]?.content).toContain("\n");
    expect(result.payload.questions.map((question) => question.position)).toEqual([1, 2]);
    expect(result.payload.questions[0]?.options).toHaveLength(6);
    expect(result.payload.questions[0]?.correctOptionId).toBe("f");
    expect(result.payload.questions.every((question) => question.blockTitle === "Responda" && question.blockPosition === 2 && question.publish)).toBe(true);
    expect(result.payload.class).toEqual({ classDate: "2026-10-25", status: "planejada", notes: "Encontro" });
    expect(result.payload.materials[0]).toMatchObject({ position: 0, title: "Material existente" });
  });

  it("aceita duas, quatro e seis alternativas, mas bloqueia lacuna e gabarito inexistente", async () => {
    const valid = await parse(v2Workbook({
      questions: [
        [1, "Duas", "A", "B", "", "", "", "", "a", "Explicação"],
        [2, "Quatro", "A", "B", "C", "D", "", "", "d", "Explicação"],
        [3, "Seis", "A", "B", "C", "D", "E", "F", "f", "Explicação"],
      ],
    }));
    expect(valid.summary.errors).toBe(0);
    expect(valid.payload.questions.map((question) => question.options.length)).toEqual([2, 4, 6]);

    const invalid = await parse(v2Workbook({
      questions: [[1, "Lacuna", "A", "B", "", "D", "", "", "c", "Explicação"]],
    }));
    expect(codes(invalid)).toEqual(expect.arrayContaining(["ALTERNATIVAS_COM_LACUNA", "GABARITO_SEM_ALTERNATIVA"]));
  });

  it("preserva conteúdo parcial para a prévia e aponta ordens, etapas e campos ausentes", async () => {
    const result = await parse(v2Workbook({
      blocks: [
        [1, "Leia", "Conteúdo"],
        [1, "Entenda", "Outro"],
        [3, "Responda", ""],
      ],
      questions: [[9, "Parcial", "A", "", "", "", "", "", "", ""]],
    }));
    expect(result.payload.blocks).toHaveLength(4);
    expect(result.payload.blocks[0]?.content).toBe("Conteúdo");
    expect(result.payload.questions[0]?.prompt).toBe("Parcial");
    expect(codes(result)).toEqual(expect.arrayContaining([
      "ORDEM_DUPLICADA",
      "ETAPA_AUSENTE",
      "ALTERNATIVAS_INCOMPLETAS",
      "RESPOSTA_CORRETA_INVALIDA",
      "EXPLICACAO_AUSENTE",
    ]));
  });

  it("aceita data nativa 1904 e rejeita fórmulas editoriais, linhas inválidas e aula parcial", async () => {
    const workbook = v2Workbook({ classRow: ["", "Planejada", "sem data"] });
    workbook.properties.date1904 = true;
    workbook.getWorksheet("ESTUDO")!.getCell("C5").value = 4453;
    workbook.getWorksheet("ESTUDO")!.getCell("B5").value = { formula: "1+1", result: "Título" } as never;
    workbook.getWorksheet("PERGUNTAS")!.getCell("K5").value = { formula: "IF(A5=1,\"OK\",\"\")", result: "OK" } as never;
    const result = await parse(workbook);
    expect(result.payload.study.weekStart).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(codes(result)).toEqual(expect.arrayContaining(["FORMULA_CAMPO_EDITORIAL", "DATA_AULA_INVALIDA"]));
  });

  it("bloqueia cabeçalhos v2 misturados ou inválidos sem cair silenciosamente no legado", async () => {
    const workbook = v2Workbook();
    workbook.getWorksheet("BLOCOS")!.getCell("B4").value = "Título do bloco";
    const result = await parse(workbook);
    expect(result.summary.templateVersion).toBe(2);
    expect(result.summary.errors).toBeGreaterThan(0);
    expect(codes(result)).toContain("MODELO_V2_INVALIDO_OU_MISTURADO");
  });
});
