import type { CellValue, Workbook, Worksheet } from "exceljs";
import { parseCivilDateAsUtcNoon } from "./civilDate";
import type {
  FoundationImportContext,
  FoundationImportPayload,
  FoundationImportPreview,
  FoundationImportProblem,
} from "./foundationImport";

export const FOUNDATION_V2_HEADERS = {
  ESTUDO: [
    "Nome da turma (conferência)",
    "Título do estudo",
    "Início da semana",
    "Nome do módulo (opcional)",
    "Objetivo ou resumo (opcional)",
    "Introdução do estudo (opcional)",
    "Validação",
  ],
  BLOCOS: ["Ordem", "Etapa", "Conteúdo da etapa", "Para refletir (opcional)", "Validação"],
  PERGUNTAS: [
    "Ordem da pergunta",
    "Enunciado",
    "Alternativa A",
    "Alternativa B",
    "Alternativa C (opcional)",
    "Alternativa D (opcional)",
    "Alternativa E (opcional)",
    "Alternativa F (opcional)",
    "Resposta correta",
    "Explicação da resposta",
    "Validação",
  ],
  AULA: ["Data da aula", "Status da aula", "Observação (opcional)", "Validação"],
  MATERIAIS: ["Ordem", "Título na Biblioteca Digital", "Observação (opcional)", "Validação"],
} as const;

const REQUIRED = ["ESTUDO", "BLOCOS", "PERGUNTAS"] as const;
const OPTIONAL = ["AULA", "MATERIAIS"] as const;
const MAX_ROWS = 300;
const MAX_COLUMNS = 32;
const MAX_MATERIALS = 20;
const STAGES = ["Leia", "Entenda", "Responda", "Aplique"] as const;

type SheetName = keyof typeof FOUNDATION_V2_HEADERS;
type ParsedRow = { rowNumber: number; values: Record<string, unknown> };

function columnName(index: number) {
  let n = index;
  let result = "";
  while (n > 0) {
    const remainder = (n - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

function isFormula(value: unknown) {
  return Boolean(
    value &&
      typeof value === "object" &&
      (("formula" in value && typeof (value as { formula?: unknown }).formula === "string") ||
        ("sharedFormula" in value && typeof (value as { sharedFormula?: unknown }).sharedFormula === "string")),
  );
}

function rawValue(value: unknown): unknown {
  if (isFormula(value)) return (value as { result?: unknown }).result ?? "";
  if (value && typeof value === "object") {
    if ("richText" in value && Array.isArray((value as { richText?: unknown }).richText)) {
      return (value as { richText: Array<{ text?: string }> }).richText.map((part) => part.text ?? "").join("");
    }
    if ("text" in value && typeof (value as { text?: unknown }).text === "string") return (value as { text: string }).text;
  }
  return value;
}

function text(value: unknown) {
  const unwrapped = rawValue(value);
  if (unwrapped instanceof Date) {
    return `${String(unwrapped.getUTCFullYear()).padStart(4, "0")}-${String(unwrapped.getUTCMonth() + 1).padStart(2, "0")}-${String(unwrapped.getUTCDate()).padStart(2, "0")}`;
  }
  // Do not flatten paragraph breaks in editorial v2 content.
  return String(unwrapped ?? "").replace(/\r\n?/g, "\n").trim();
}

function blank(value: unknown) {
  return text(value) === "";
}

function normalizeFoundationImportTitle(value: unknown) {
  return text(value).replace(/\s+/g, " ").trim().toLocaleLowerCase("pt-BR");
}

function parseInteger(value: unknown) {
  const normalized = text(value);
  if (!/^\d+$/.test(normalized)) return null;
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function excelDate(value: number, date1904: boolean) {
  if (!Number.isFinite(value)) return "";
  const epoch = date1904 ? Date.UTC(1904, 0, 1) : Date.UTC(1899, 11, 30);
  const date = new Date(epoch + Math.floor(value) * 86_400_000);
  if (Number.isNaN(date.getTime())) return "";
  return `${String(date.getUTCFullYear()).padStart(4, "0")}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function dateText(value: unknown, date1904: boolean) {
  const unwrapped = rawValue(value);
  if (unwrapped instanceof Date) return text(unwrapped);
  if (typeof unwrapped === "number") return excelDate(unwrapped, date1904);
  const valueText = String(unwrapped ?? "").trim();
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(valueText);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?)?$/.exec(valueText);
  return iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : valueText;
}

function validDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Boolean(parseCivilDateAsUtcNoon(value));
}

function dimension(sheet: Worksheet) {
  return { rows: Math.max(sheet.actualRowCount, sheet.rowCount, 1), columns: Math.max(sheet.actualColumnCount, sheet.columnCount, 1) };
}

function add(problems: FoundationImportProblem[], sheet: string, row: number | null, field: string | null, code: string, message: string, severity: "erro" | "aviso" = "erro") {
  problems.push({ sheet, row, field, code, message, severity });
}

function maxLength(problems: FoundationImportProblem[], sheet: string, row: number, field: string, value: string, limit: number) {
  if (value.length > limit) add(problems, sheet, row, field, "CAMPO_LONGO_DEMAIS", `O campo deve ter no máximo ${limit} caracteres.`);
}

function headerMatches(sheet: Worksheet | undefined, expected: readonly string[]) {
  if (!sheet) return false;
  const d = dimension(sheet);
  const actual = expected.map((_header, index) => text(sheet.getCell(4, index + 1).value));
  if (actual.some((value, index) => value !== expected[index])) return false;
  for (let column = expected.length + 1; column <= d.columns; column += 1) {
    if (!blank(sheet.getCell(4, column).value)) return false;
  }
  return true;
}

export function isFoundationV2Workbook(workbook: Pick<Workbook, "getWorksheet">) {
  return REQUIRED.every((name) => headerMatches(workbook.getWorksheet(name), FOUNDATION_V2_HEADERS[name]));
}

export function hasFoundationV2Header(workbook: Pick<Workbook, "getWorksheet">) {
  return [...REQUIRED, ...OPTIONAL].some((name) => headerMatches(workbook.getWorksheet(name), FOUNDATION_V2_HEADERS[name]));
}

function rows(sheet: Worksheet | undefined, sheetName: SheetName, problems: FoundationImportProblem[]) {
  const headers = FOUNDATION_V2_HEADERS[sheetName];
  if (!sheet) return [] as ParsedRow[];
  const d = dimension(sheet);
  if (d.rows > MAX_ROWS || d.columns > MAX_COLUMNS) {
    add(problems, sheetName, null, null, "PLANILHA_GRANDE_DEMAIS", `A aba ${sheetName} excede o limite de ${MAX_ROWS} linhas ou ${MAX_COLUMNS} colunas.`);
    return [] as ParsedRow[];
  }
  headers.forEach((header, index) => {
    if (text(sheet.getCell(4, index + 1).value) !== header) add(problems, sheetName, 4, columnName(index + 1), "CABECALHO_INVALIDO", `A coluna ${columnName(index + 1)} deve ser “${header}”.`);
  });
  for (let column = headers.length + 1; column <= d.columns; column += 1) {
    if (!blank(sheet.getCell(4, column).value)) add(problems, sheetName, 4, columnName(column), "CABECALHO_INVALIDO", "Há uma coluna extra; use somente os cabeçalhos exatos do gabarito v2.");
  }
  for (let row = 4; row <= d.rows; row += 1) {
    for (let column = 1; column <= Math.min(d.columns, headers.length); column += 1) {
      const value = sheet.getCell(row, column).value as CellValue;
      if (isFormula(value) && headers[column - 1] !== "Validação") add(problems, sheetName, row, headers[column - 1], "FORMULA_CAMPO_EDITORIAL", "Fórmulas, inclusive sharedFormula, só são permitidas na coluna Validação.");
    }
  }
  const result: ParsedRow[] = [];
  for (let row = 5; row <= d.rows; row += 1) {
    const values = Object.fromEntries(headers.map((header, index) => [header, sheet.getCell(row, index + 1).value ?? null]));
    if (headers.filter((header) => header !== "Validação").every((header) => blank(values[header]))) continue;
    result.push({ rowNumber: row, values });
  }
  return result;
}

function status(value: unknown, problems: FoundationImportProblem[], row: number) {
  const normalized = text(value).toLocaleLowerCase("pt-BR");
  if (normalized === "planejada") return "planejada" as const;
  if (normalized === "realizada") return "realizada" as const;
  if (normalized === "cancelada") return "cancelada" as const;
  add(problems, "AULA", row, "Status da aula", "STATUS_AULA_INVALIDO", "Use Planejada, Realizada ou Cancelada.");
  return "planejada" as const;
}

export function parseFoundationWorkbookV2(workbook: Workbook, context: FoundationImportContext, problems: FoundationImportProblem[]): FoundationImportPreview {
  const date1904 = Boolean(workbook.properties.date1904);
  const studyRows = rows(workbook.getWorksheet("ESTUDO"), "ESTUDO", problems);
  const blockRows = rows(workbook.getWorksheet("BLOCOS"), "BLOCOS", problems);
  const questionRows = rows(workbook.getWorksheet("PERGUNTAS"), "PERGUNTAS", problems);
  const classRows = workbook.getWorksheet("AULA") ? rows(workbook.getWorksheet("AULA"), "AULA", problems) : [];
  const materialRows = workbook.getWorksheet("MATERIAIS") ? rows(workbook.getWorksheet("MATERIAIS"), "MATERIAIS", problems) : [];

  if (studyRows.length !== 1) add(problems, "ESTUDO", null, null, "ESTUDO_DEVE_TER_UMA_LINHA", "Preencha exatamente uma linha na aba ESTUDO.");
  const studyRow = studyRows[0];
  const study = studyRow?.values ?? {};
  const courseName = text(study["Nome da turma (conferência)"]);
  const title = text(study["Título do estudo"]);
  const weekStart = dateText(study["Início da semana"], date1904);
  const moduleTitle = text(study["Nome do módulo (opcional)"]);
  const summary = text(study["Objetivo ou resumo (opcional)"]);
  const content = text(study["Introdução do estudo (opcional)"]);
  if (!studyRow) add(problems, "ESTUDO", null, null, "ESTUDO_VAZIO", "Informe o título e a data de início da semana.");
  else {
    if (courseName && normalizeFoundationImportTitle(courseName) !== normalizeFoundationImportTitle(context.courseName)) add(problems, "ESTUDO", studyRow.rowNumber, "Nome da turma (conferência)", "TURMA_DIVERGENTE", `O arquivo informa “${courseName}”, mas a turma selecionada é “${context.courseName}”.`);
    if (title.length < 3) add(problems, "ESTUDO", studyRow.rowNumber, "Título do estudo", "TITULO_INVALIDO", "Informe um título com pelo menos 3 caracteres.");
    maxLength(problems, "ESTUDO", studyRow.rowNumber, "Título do estudo", title, 160);
    if (!validDate(weekStart)) add(problems, "ESTUDO", studyRow.rowNumber, "Início da semana", "DATA_SEMANA_INVALIDA", "Informe uma data civil válida em DD/MM/AAAA, AAAA-MM-DD ou uma data nativa do Excel.");
    if (context.existingWeekStarts.includes(weekStart)) add(problems, "ESTUDO", studyRow.rowNumber, "Início da semana", "SEMANA_DUPLICADA", "Já existe um estudo nesta turma com essa data de início.");
    if (moduleTitle && !context.moduleTitles.some((item) => normalizeFoundationImportTitle(item) === normalizeFoundationImportTitle(moduleTitle))) add(problems, "ESTUDO", studyRow.rowNumber, "Nome do módulo (opcional)", "MODULO_NAO_ENCONTRADO", `O módulo “${moduleTitle}” não existe nesta turma.`);
    maxLength(problems, "ESTUDO", studyRow.rowNumber, "Nome do módulo (opcional)", moduleTitle, 160);
    maxLength(problems, "ESTUDO", studyRow.rowNumber, "Objetivo ou resumo (opcional)", summary, 500);
    maxLength(problems, "ESTUDO", studyRow.rowNumber, "Introdução do estudo (opcional)", content, 12000);
  }

  const blocks: FoundationImportPayload["blocks"] = [];
  const byOrder = new Map<number, ParsedRow>();
  for (const row of blockRows) {
    const order = parseInteger(row.values.Ordem);
    const stage = text(row.values.Etapa);
    if (order === null || order < 1 || order > 4) add(problems, "BLOCOS", row.rowNumber, "Ordem", "ORDEM_ETAPA_INVALIDA", "As quatro etapas devem usar as ordens 1, 2, 3 e 4, sem repetição.");
    if (!STAGES.includes(stage as typeof STAGES[number])) add(problems, "BLOCOS", row.rowNumber, "Etapa", "ETAPA_INVALIDA", "Use exatamente Leia, Entenda, Responda e Aplique.");
    if (order !== null && byOrder.has(order)) add(problems, "BLOCOS", row.rowNumber, "Ordem", "ORDEM_DUPLICADA", "A ordem da etapa não pode se repetir.");
    if (order !== null && order >= 1 && order <= 4 && !byOrder.has(order)) byOrder.set(order, row);
  }
  for (let order = 1; order <= 4; order += 1) {
    const row = byOrder.get(order);
    const values = row?.values ?? {};
    const expectedStage = STAGES[order - 1];
    const stage = text(values.Etapa);
    if (!row) add(problems, "BLOCOS", order + 4, "Ordem", "ETAPA_AUSENTE", `Informe a etapa ${order} (${expectedStage}).`);
    if (stage && stage !== expectedStage) add(problems, "BLOCOS", row!.rowNumber, "Etapa", "ETAPA_FORA_DE_ORDEM", `A ordem ${order} deve ser a etapa ${expectedStage}.`);
    const blockContent = text(values["Conteúdo da etapa"]);
    const reflectionPrompt = text(values["Para refletir (opcional)"]);
    if (!blockContent) add(problems, "BLOCOS", row?.rowNumber ?? order + 4, "Conteúdo da etapa", "CONTEUDO_BLOCO_AUSENTE", `Informe o conteúdo da etapa ${expectedStage}.`);
    maxLength(problems, "BLOCOS", row?.rowNumber ?? order + 4, "Conteúdo da etapa", blockContent, 12000);
    maxLength(problems, "BLOCOS", row?.rowNumber ?? order + 4, "Para refletir (opcional)", reflectionPrompt, 1000);
    blocks.push({ position: order - 1, title: expectedStage, content: blockContent, reflectionPrompt: reflectionPrompt || null, publish: true });
  }

  const questions: FoundationImportPayload["questions"] = [];
  const orders = new Set<number>();
  if (questionRows.length > 20) add(problems, "PERGUNTAS", null, null, "MUITAS_PERGUNTAS", "O gabarito v2 oferece no máximo 20 linhas de perguntas.");
  const labels = ["Alternativa A", "Alternativa B", "Alternativa C (opcional)", "Alternativa D (opcional)", "Alternativa E (opcional)", "Alternativa F (opcional)"] as const;
  for (const row of questionRows) {
    const values = row.values;
    const order = parseInteger(values["Ordem da pergunta"]);
    const prompt = text(values.Enunciado);
    const optionValues = labels.map((label) => text(values[label]));
    const correct = text(values["Resposta correta"]).toLowerCase();
    const explanation = text(values["Explicação da resposta"]);
    if (order === null || order < 1 || order > 20) add(problems, "PERGUNTAS", row.rowNumber, "Ordem da pergunta", "ORDEM_PERGUNTA_INVALIDA", "A ordem deve ser um número inteiro de 1 a 20.");
    if (order !== null && orders.has(order)) add(problems, "PERGUNTAS", row.rowNumber, "Ordem da pergunta", "ORDEM_DUPLICADA", "A ordem da pergunta não pode se repetir.");
    if (order !== null) orders.add(order);
    if (prompt.length < 3) add(problems, "PERGUNTAS", row.rowNumber, "Enunciado", "PERGUNTA_INVALIDA", "Informe um enunciado com pelo menos 3 caracteres.");
    const firstBlank = optionValues.findIndex((value) => !value);
    if (optionValues.filter(Boolean).length < 2) add(problems, "PERGUNTAS", row.rowNumber, "Alternativas", "ALTERNATIVAS_INCOMPLETAS", "Preencha pelo menos as alternativas A e B.");
    if (firstBlank >= 0 && optionValues.slice(firstBlank + 1).some(Boolean)) add(problems, "PERGUNTAS", row.rowNumber, "Alternativas", "ALTERNATIVAS_COM_LACUNA", "Preencha as alternativas em sequência, sem lacunas entre A e F.");
    if (!/^[a-f]$/.test(correct)) add(problems, "PERGUNTAS", row.rowNumber, "Resposta correta", "RESPOSTA_CORRETA_INVALIDA", "Escolha explicitamente uma resposta entre A e F.");
    else if (!optionValues[correct.charCodeAt(0) - 97]) add(problems, "PERGUNTAS", row.rowNumber, "Resposta correta", "GABARITO_SEM_ALTERNATIVA", "A resposta correta deve apontar para uma alternativa preenchida.");
    if (!explanation) add(problems, "PERGUNTAS", row.rowNumber, "Explicação da resposta", "EXPLICACAO_AUSENTE", "Informe a explicação da resposta.");
    maxLength(problems, "PERGUNTAS", row.rowNumber, "Enunciado", prompt, 4000);
    optionValues.forEach((value, index) => maxLength(problems, "PERGUNTAS", row.rowNumber, labels[index], value, 500));
    maxLength(problems, "PERGUNTAS", row.rowNumber, "Explicação da resposta", explanation, 4000);
    const validPosition = order !== null && order >= 1 && order <= 20 ? order : undefined;
    questions.push({ position: validPosition, blockTitle: "Responda", blockPosition: 2, prompt, options: optionValues.flatMap((label, index) => label ? [{ id: String.fromCharCode(97 + index), label }] : []), correctOptionId: /^[a-f]$/.test(correct) ? correct : "", explanation, publish: true });
  }
  questions.sort((left, right) => (left.position ?? 0) - (right.position ?? 0));
  if (!questions.length) add(problems, "PERGUNTAS", null, null, "SEM_PERGUNTAS", "Nenhuma pergunta foi informada; o estudo poderá ser criado, mas a preparação ficará sem perguntas.", "aviso");

  let importedClass: FoundationImportPayload["class"] = null;
  const meaningfulClassRows = classRows.filter((row) => ["Data da aula", "Status da aula", "Observação (opcional)"].some((field) => !blank(row.values[field])));
  if (meaningfulClassRows.length > 1) add(problems, "AULA", null, null, "AULA_DEVE_TER_UMA_LINHA", "Informe no máximo uma aula presencial.");
  const classRow = meaningfulClassRows[0];
  if (classRow) {
    const classDate = dateText(classRow.values["Data da aula"], date1904);
    const classStatus = status(classRow.values["Status da aula"], problems, classRow.rowNumber);
    const notes = text(classRow.values["Observação (opcional)"]);
    if (!validDate(classDate)) add(problems, "AULA", classRow.rowNumber, "Data da aula", "DATA_AULA_INVALIDA", "Informe uma data civil válida.");
    else if (parseCivilDateAsUtcNoon(classDate)?.getUTCDay() !== 0) add(problems, "AULA", classRow.rowNumber, "Data da aula", "DATA_NAO_DOMINGO", "A data da aula presencial deve cair em um domingo.");
    if (validDate(weekStart) && validDate(classDate) && classDate < weekStart) add(problems, "AULA", classRow.rowNumber, "Data da aula", "AULA_ANTES_DA_SEMANA", "A aula não pode ocorrer antes do início da semana do estudo.");
    maxLength(problems, "AULA", classRow.rowNumber, "Observação (opcional)", notes, 2000);
    importedClass = { classDate, status: classStatus, notes: notes || null };
  }

  const materials: FoundationImportPayload["materials"] = [];
  const materialOrders = new Set<number>();
  if (materialRows.length > MAX_MATERIALS) add(problems, "MATERIAIS", null, null, "MUITOS_MATERIAIS", `O arquivo pode ter no máximo ${MAX_MATERIALS} materiais.`);
  for (const row of materialRows) {
    const order = parseInteger(row.values.Ordem);
    const materialTitle = text(row.values["Título na Biblioteca Digital"]);
    const notes = text(row.values["Observação (opcional)"]);
    if (order === null || order < 1) add(problems, "MATERIAIS", row.rowNumber, "Ordem", "ORDEM_MATERIAL_INVALIDA", "A ordem deve ser um número inteiro positivo.");
    if (order !== null && materialOrders.has(order)) add(problems, "MATERIAIS", row.rowNumber, "Ordem", "ORDEM_DUPLICADA", "A ordem do material não pode se repetir.");
    if (order !== null) materialOrders.add(order);
    if (!materialTitle) add(problems, "MATERIAIS", row.rowNumber, "Título na Biblioteca Digital", "TITULO_MATERIAL_AUSENTE", "Informe o título de um material já existente na Biblioteca Digital.");
    const matches = context.materials.filter((item) => normalizeFoundationImportTitle(item.title) === normalizeFoundationImportTitle(materialTitle));
    if (materialTitle && !matches.length) add(problems, "MATERIAIS", row.rowNumber, "Título na Biblioteca Digital", "MATERIAL_NAO_ENCONTRADO", `O material “${materialTitle}” não foi encontrado na Biblioteca desta igreja.`);
    if (matches.length > 1) add(problems, "MATERIAIS", row.rowNumber, "Título na Biblioteca Digital", "MATERIAL_AMBIGUO", `Há mais de um material com o título “${materialTitle}”. Renomeie os materiais ou escolha um título único.`);
    maxLength(problems, "MATERIAIS", row.rowNumber, "Observação (opcional)", notes, 2000);
    materials.push({ position: Math.max(0, (order ?? materials.length + 1) - 1), title: materialTitle, notes: notes || null });
  }
  materials.sort((left, right) => left.position - right.position);

  const payload: FoundationImportPayload = {
    templateVersion: 2,
    courseId: context.courseId,
    courseName: context.courseName,
    study: { title, weekStart, moduleTitle: moduleTitle || null, summary: summary || null, content: content || null, publish: false },
    blocks,
    questions,
    class: importedClass,
    materials,
  };
  const errors = problems.filter((problem) => problem.severity === "erro").length;
  const warnings = problems.filter((problem) => problem.severity === "aviso").length;
  return {
    payload,
    summary: { templateVersion: 2, studyTitle: title || null, weekStart: weekStart || null, counts: { blocks: blocks.length, questions: questions.length, materials: materials.length }, classIncluded: Boolean(importedClass), publishStudy: false, errors, warnings, problems },
  };
}
