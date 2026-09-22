import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { hasForbiddenVbaEntry, inspectXlsxContainer, isXlsxFileSignature, parseFoundationWorkbook } from "./foundationImport";

const headers = {
  ESTUDO: ["Nome exato da turma", "Título do estudo", "Data de início da semana (AAAA-MM-DD)", "Nome do módulo", "Objetivo ou resumo", "Introdução / roteiro geral", "Publicar ao importar?", "Validação"],
  BLOCOS: ["Ordem", "Título do bloco", "Conteúdo da leitura", "Publicar ao importar?", "Validação"],
  PERGUNTAS: ["Ordem do bloco", "Título exato do bloco", "Enunciado da pergunta", "Alternativa A", "Alternativa B", "Resposta correta", "Explicação do gabarito", "Publicar ao importar?", "Validação"],
  AULA: ["Data do domingo (AAAA-MM-DD)", "Status da aula", "Observação para o professor", "Validação"],
  MATERIAIS: ["Ordem", "Título exato na Biblioteca Digital", "Observação", "Validação"],
} as const;

function sheet(workbook: ExcelJS.Workbook, name: keyof typeof headers, rows: unknown[][]) {
  const worksheet = workbook.addWorksheet(name);
  worksheet.getRow(4).values = [...headers[name]];
  rows.forEach((values, index) => {
    worksheet.getRow(index + 5).values = [...values];
  });
  return worksheet;
}

function workbook(overrides: Partial<Record<keyof typeof headers, unknown[][]>> = {}) {
  const wb = new ExcelJS.Workbook();
  wb.addWorksheet("LEIA-ME").getCell("A1").value = "Gabarito";
  sheet(wb, "ESTUDO", overrides.ESTUDO ?? [["Fundamentos da Fé", "O que é a fé?", "2026-09-21", "Alicerces da fé", "Compreender a fé", "Introdução do estudo", "Sim"]]);
  sheet(wb, "BLOCOS", overrides.BLOCOS ?? [[1, "A Palavra", "A fé é fortalecida pela Palavra.", "Sim"], [2, "Na prática", "A fé aparece nas decisões.", "Sim"]]);
  sheet(wb, "PERGUNTAS", overrides.PERGUNTAS ?? [[1, "A Palavra", "O que fortalece a fé?", "A Palavra", "A pressa", "A", "A Palavra ensina e fortalece.", "Sim"], [2, "Na prática", "Como a fé aparece?", "Na perseverança", "Na desistência", "A", "A fé conduz à perseverança.", "Sim"]]);
  sheet(wb, "AULA", overrides.AULA ?? [["2026-09-27", "Planejada", "Aprofundar o tema."]]);
  sheet(wb, "MATERIAIS", overrides.MATERIAIS ?? [[1, "Material de fé", "Leitura complementar"]]);
  return wb;
}

async function bufferFor(wb: ExcelJS.Workbook) {
  return Buffer.from(await wb.xlsx.writeBuffer());
}

const context = {
  courseId: 10,
  courseName: "Fundamentos da Fé",
  moduleTitles: ["Alicerces da fé"],
  materials: [{ id: 21, title: "Material de fé" }],
  existingWeekStarts: [],
};

describe("foundationImport", () => {
  it("normaliza o gabarito oficial em um payload pronto para prévia", async () => {
    const result = await parseFoundationWorkbook(await bufferFor(workbook()), context);
    expect(result.summary.errors).toBe(0);
    expect(result.payload.courseId).toBe(10);
    expect(result.payload.study.title).toBe("O que é a fé?");
    expect(result.payload.blocks.map((block) => block.position)).toEqual([0, 1]);
    expect(result.payload.questions[0]?.options).toEqual([{ id: "a", label: "A Palavra" }, { id: "b", label: "A pressa" }]);
    expect(result.payload.questions[0]?.correctOptionId).toBe("a");
    expect(result.payload.class?.classDate).toBe("2026-09-27");
    expect(result.payload.materials[0]?.notes).toBe("Leitura complementar");
  });

  it("aponta linha e código quando a pergunta e a aula estão inválidas", async () => {
    const result = await parseFoundationWorkbook(await bufferFor(workbook({
      PERGUNTAS: [[1, "Bloco inexistente", "Pergunta válida", "Sim", "Não", "A", "Explicação", "Sim"]],
      AULA: [["2026-09-26", "Planejada", "Aula"]],
    })), context);
    expect(result.summary.errors).toBeGreaterThanOrEqual(2);
    expect(result.summary.problems).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "BLOCO_NAO_ENCONTRADO", sheet: "PERGUNTAS", row: 5 }),
      expect.objectContaining({ code: "DATA_NAO_DOMINGO", sheet: "AULA", row: 5 }),
    ]));
  });

  it("rejeita fórmula em campo editorial e permite fórmula somente na coluna de validação", async () => {
    const wb = workbook();
    wb.getWorksheet("ESTUDO")!.getCell("B5").value = { formula: "1+1", result: 2 };
    wb.getWorksheet("ESTUDO")!.getCell("H5").value = { formula: 'IF(A5<>"","OK","")', result: "OK" };
    const result = await parseFoundationWorkbook(await bufferFor(wb), context);
    expect(result.summary.problems).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "FORMULA_CAMPO_EDITORIAL", field: "Título do estudo" }),
    ]));
  });

  it("rejeita uma semana já existente sem alterar o payload recebido", async () => {
    const result = await parseFoundationWorkbook(await bufferFor(workbook()), { ...context, existingWeekStarts: ["2026-09-21"] });
    expect(result.summary.problems).toEqual(expect.arrayContaining([expect.objectContaining({ code: "SEMANA_DUPLICADA" })]));
    expect(result.payload.study.weekStart).toBe("2026-09-21");
  });

  it("rejeita ordem duplicada e turma divergente antes da confirmação", async () => {
    const result = await parseFoundationWorkbook(await bufferFor(workbook({
      ESTUDO: [["Outra turma", "O que é a fé?", "2026-09-21", "Alicerces da fé", "Compreender a fé", "Introdução do estudo", "Sim"]],
      BLOCOS: [[1, "A Palavra", "Conteúdo", "Sim"], [1, "Na prática", "Conteúdo", "Sim"]],
    })), context);
    expect(result.summary.problems).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "TURMA_DIVERGENTE" }),
      expect.objectContaining({ code: "ORDEM_DUPLICADA" }),
    ]));
  });

  it("sinaliza a ausência de uma aba obrigatória", async () => {
    const wb = workbook();
    wb.removeWorksheet(wb.getWorksheet("PERGUNTAS")!.id);
    const result = await parseFoundationWorkbook(await bufferFor(wb), context);
    expect(result.summary.problems).toEqual(expect.arrayContaining([expect.objectContaining({ code: "ABA_OBRIGATORIA_AUSENTE", sheet: "PERGUNTAS" })]));
  });

  it("reconhece a assinatura e o container ZIP de um xlsx", async () => {
    const valid = await bufferFor(workbook());
    const inspection = inspectXlsxContainer(valid);
    expect(isXlsxFileSignature(valid)).toBe(true);
    expect(inspection.hasCentralDirectory).toBe(true);
    expect(inspection.containsVba).toBe(false);
    expect(inspection.exceedsLimits).toBe(false);
    expect(isXlsxFileSignature(Buffer.from("not-an-xlsx"))).toBe(false);
  });

  it("detecta projeto VBA no container antes do carregamento", async () => {
    const valid = await bufferFor(workbook());
    const withMacroMarker = Buffer.concat([valid, Buffer.from("xl/vbaProject.bin", "utf8")]);
    expect(hasForbiddenVbaEntry(withMacroMarker)).toBe(true);
  });

  it("rejeita um container ZIP falso antes da validação editorial", async () => {
    await expect(parseFoundationWorkbook(Buffer.from([0x50, 0x4b, 0x03, 0x04]), context)).rejects.toThrow("Não foi possível ler o arquivo Excel");
  });
});
