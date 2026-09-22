import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { isXlsxFileSignature, parseFoundationWorkbook } from "./foundationImport";

const headers = {
  ESTUDO: ["Nome exato da turma", "Título do estudo", "Data de início da semana (AAAA-MM-DD)", "Nome do módulo", "Objetivo ou resumo", "Introdução / roteiro geral", "Publicar ao importar?", "Validação"],
  BLOCOS: ["Ordem", "Título do bloco", "Conteúdo da leitura", "Publicar ao importar?", "Validação"],
  PERGUNTAS: ["Ordem do bloco", "Título exato do bloco", "Enunciado da pergunta", "Alternativa A", "Alternativa B", "Resposta correta", "Explicação do gabarito", "Publicar ao importar?", "Validação"],
  AULA: ["Data do domingo (AAAA-MM-DD)", "Status da aula", "Observação para o professor", "Validação"],
  MATERIAIS: ["Ordem", "Título exato na Biblioteca Digital", "Observação", "Validação"],
} as const;

function sheet(name: keyof typeof headers, rows: unknown[][]) {
  return XLSX.utils.aoa_to_sheet([[], [], [], headers[name], ...rows]);
}

function workbook(overrides: Partial<Record<keyof typeof headers, unknown[][]>> = {}) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Gabarito"]]), "LEIA-ME");
  XLSX.utils.book_append_sheet(wb, sheet("ESTUDO", overrides.ESTUDO ?? [["Fundamentos da Fé", "O que é a fé?", "2026-09-21", "Alicerces da fé", "Compreender a fé", "Introdução do estudo", "Sim"]]), "ESTUDO");
  XLSX.utils.book_append_sheet(wb, sheet("BLOCOS", overrides.BLOCOS ?? [[1, "A Palavra", "A fé é fortalecida pela Palavra.", "Sim"], [2, "Na prática", "A fé aparece nas decisões.", "Sim"]]), "BLOCOS");
  XLSX.utils.book_append_sheet(wb, sheet("PERGUNTAS", overrides.PERGUNTAS ?? [[1, "A Palavra", "O que fortalece a fé?", "A Palavra", "A pressa", "A", "A Palavra ensina e fortalece.", "Sim"], [2, "Na prática", "Como a fé aparece?", "Na perseverança", "Na desistência", "A", "A fé conduz à perseverança.", "Sim"]]), "PERGUNTAS");
  XLSX.utils.book_append_sheet(wb, sheet("AULA", overrides.AULA ?? [["2026-09-27", "Planejada", "Aprofundar o tema."]]), "AULA");
  XLSX.utils.book_append_sheet(wb, sheet("MATERIAIS", overrides.MATERIAIS ?? [[1, "Material de fé", "Leitura complementar"]]), "MATERIAIS");
  return wb;
}

function bufferFor(wb: XLSX.WorkBook) {
  return Buffer.from(XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
}

const context = {
  courseId: 10,
  courseName: "Fundamentos da Fé",
  moduleTitles: ["Alicerces da fé"],
  materials: [{ id: 21, title: "Material de fé" }],
  existingWeekStarts: [],
};

describe("foundationImport", () => {
  it("normaliza o gabarito oficial em um payload pronto para prévia", () => {
    const result = parseFoundationWorkbook(bufferFor(workbook()), context);
    expect(result.summary.errors).toBe(0);
    expect(result.payload.courseId).toBe(10);
    expect(result.payload.study.title).toBe("O que é a fé?");
    expect(result.payload.blocks.map((block) => block.position)).toEqual([0, 1]);
    expect(result.payload.questions[0]?.options).toEqual([{ id: "a", label: "A Palavra" }, { id: "b", label: "A pressa" }]);
    expect(result.payload.questions[0]?.correctOptionId).toBe("a");
    expect(result.payload.class?.classDate).toBe("2026-09-27");
  });

  it("aponta linha e código quando a pergunta e a aula estão inválidas", () => {
    const result = parseFoundationWorkbook(bufferFor(workbook({
      PERGUNTAS: [[1, "Bloco inexistente", "Pergunta válida", "Sim", "Não", "A", "Explicação", "Sim"]],
      AULA: [["2026-09-26", "Planejada", "Aula"]],
    })), context);
    expect(result.summary.errors).toBeGreaterThanOrEqual(2);
    expect(result.summary.problems).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "BLOCO_NAO_ENCONTRADO", sheet: "PERGUNTAS", row: 5 }),
      expect.objectContaining({ code: "DATA_NAO_DOMINGO", sheet: "AULA", row: 5 }),
    ]));
  });

  it("rejeita fórmula em campo editorial e permite fórmula somente na coluna de validação", () => {
    const wb = workbook();
    const ws = wb.Sheets.ESTUDO;
    ws.B5 = { t: "n", f: "1+1", v: 2 };
    ws.H5 = { t: "s", f: 'IF(A5<>"","OK","")', v: "OK" };
    const result = parseFoundationWorkbook(bufferFor(wb), context);
    expect(result.summary.problems).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "FORMULA_CAMPO_EDITORIAL", field: "Título do estudo" }),
    ]));
  });

  it("rejeita uma semana já existente sem alterar o payload recebido", () => {
    const result = parseFoundationWorkbook(bufferFor(workbook()), { ...context, existingWeekStarts: ["2026-09-21"] });
    expect(result.summary.problems).toEqual(expect.arrayContaining([expect.objectContaining({ code: "SEMANA_DUPLICADA" })]));
    expect(result.payload.study.weekStart).toBe("2026-09-21");
  });

  it("rejeita ordem duplicada e turma divergente antes da confirmação", () => {
    const result = parseFoundationWorkbook(bufferFor(workbook({
      ESTUDO: [["Outra turma", "O que é a fé?", "2026-09-21", "Alicerces da fé", "Compreender a fé", "Introdução do estudo", "Sim"]],
      BLOCOS: [[1, "A Palavra", "Conteúdo", "Sim"], [1, "Na prática", "Conteúdo", "Sim"]],
    })), context);
    expect(result.summary.problems).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "TURMA_DIVERGENTE" }),
      expect.objectContaining({ code: "ORDEM_DUPLICADA" }),
    ]));
  });

  it("sinaliza a ausência de uma aba obrigatória", () => {
    const wb = workbook();
    delete wb.Sheets.PERGUNTAS;
    wb.SheetNames = wb.SheetNames.filter((name) => name !== "PERGUNTAS");
    const result = parseFoundationWorkbook(bufferFor(wb), context);
    expect(result.summary.problems).toEqual(expect.arrayContaining([expect.objectContaining({ code: "ABA_OBRIGATORIA_AUSENTE", sheet: "PERGUNTAS" })]));
  });

  it("reconhece a assinatura ZIP de um xlsx e não confunde um texto com Excel", () => {
    const valid = bufferFor(workbook());
    expect(isXlsxFileSignature(valid)).toBe(true);
    expect(isXlsxFileSignature(Buffer.from("not-an-xlsx"))).toBe(false);
  });
});
