import * as XLSX from "xlsx";
import { parseCivilDateAsUtcNoon } from "./civilDate";

export type FoundationImportProblem = {
  sheet: string;
  row: number | null;
  field: string | null;
  code: string;
  message: string;
  severity: "erro" | "aviso";
};

export type FoundationImportPayload = {
  courseId: number;
  courseName: string;
  study: {
    title: string;
    weekStart: string;
    moduleTitle: string | null;
    summary: string | null;
    content: string | null;
    publish: boolean;
  };
  blocks: Array<{
    position: number;
    title: string;
    content: string;
    publish: boolean;
  }>;
  questions: Array<{
    blockTitle: string;
    blockPosition: number;
    prompt: string;
    options: Array<{ id: string; label: string }>;
    correctOptionId: string;
    explanation: string;
    publish: boolean;
  }>;
  class: {
    classDate: string;
    status: "planejada" | "realizada" | "cancelada";
    notes: string | null;
  } | null;
  materials: Array<{
    position: number;
    title: string;
    notes: string | null;
  }>;
};

export type FoundationImportSummary = {
  studyTitle: string | null;
  weekStart: string | null;
  counts: {
    blocks: number;
    questions: number;
    materials: number;
  };
  classIncluded: boolean;
  publishStudy: boolean;
  errors: number;
  warnings: number;
  problems: FoundationImportProblem[];
};

export type FoundationImportPreview = {
  payload: FoundationImportPayload;
  summary: FoundationImportSummary;
};

export type FoundationImportContext = {
  courseId: number;
  courseName: string;
  moduleTitles: string[];
  materials: Array<{ id: number; title: string }>;
  existingWeekStarts: string[];
};

export class FoundationImportError extends Error {
  constructor(
    message: string,
    public readonly code: "NOT_FOUND" | "FORBIDDEN" | "CONFLICT" | "PRECONDITION_FAILED" | "BAD_REQUEST" = "BAD_REQUEST",
  ) {
    super(message);
    this.name = "FoundationImportError";
  }
}

const REQUIRED_SHEETS = ["ESTUDO", "BLOCOS", "PERGUNTAS"] as const;
const OPTIONAL_SHEETS = ["AULA", "MATERIAIS"] as const;
const MAX_BLOCKS = 200;
const MAX_QUESTIONS = 400;
const MAX_MATERIALS = 20;
const MAX_SHEETS = 7;

const HEADERS = {
  ESTUDO: [
    "Nome exato da turma",
    "Título do estudo",
    "Data de início da semana (AAAA-MM-DD)",
    "Nome do módulo",
    "Objetivo ou resumo",
    "Introdução / roteiro geral",
    "Publicar ao importar?",
    "Validação",
  ],
  BLOCOS: ["Ordem", "Título do bloco", "Conteúdo da leitura", "Publicar ao importar?", "Validação"],
  PERGUNTAS: [
    "Ordem do bloco",
    "Título exato do bloco",
    "Enunciado da pergunta",
    "Alternativa A",
    "Alternativa B",
    "Resposta correta",
    "Explicação do gabarito",
    "Publicar ao importar?",
    "Validação",
  ],
  AULA: ["Data do domingo (AAAA-MM-DD)", "Status da aula", "Observação para o professor", "Validação"],
  MATERIAIS: ["Ordem", "Título exato na Biblioteca Digital", "Observação", "Validação"],
} as const;

function normalizeText(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function normalizeFoundationImportTitle(value: unknown) {
  return normalizeText(value).toLocaleLowerCase("pt-BR");
}

function isBlank(value: unknown) {
  return normalizeText(value) === "";
}

function columnName(index: number) {
  return XLSX.utils.encode_col(index);
}

function cellAddress(row: number, column: number) {
  return `${columnName(column)}${row + 1}`;
}

function excelDateValue(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const date = new Date(Date.UTC(1899, 11, 30) + Math.floor(value) * 86_400_000);
  if (Number.isNaN(date.getTime())) return null;
  return `${String(date.getUTCFullYear()).padStart(4, "0")}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function cellText(value: unknown) {
  if (value instanceof Date) {
    return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(value.getUTCDate()).padStart(2, "0")}`;
  }
  return normalizeText(value);
}

function cellDateText(value: unknown) {
  if (value instanceof Date) {
    return `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, "0")}-${String(value.getUTCDate()).padStart(2, "0")}`;
  }
  return normalizeText(excelDateValue(value) ?? value);
}

function isValidCivilDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Boolean(parseCivilDateAsUtcNoon(value));
}

function parseBoolean(value: unknown, problems: FoundationImportProblem[], sheet: string, row: number, field: string) {
  const text = cellText(value).toLocaleLowerCase("pt-BR");
  if (!text) return false;
  if (["sim", "s", "true", "yes"].includes(text)) return true;
  if (["não", "nao", "n", "false", "no"].includes(text)) return false;
  problems.push({ sheet, row, field, code: "VALOR_PUBLICACAO_INVALIDO", message: "Use Sim ou Não.", severity: "erro" });
  return false;
}

function parseInteger(value: unknown) {
  const text = cellText(value);
  if (!/^\d+$/.test(text)) return null;
  const parsed = Number(text);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function addProblem(
  problems: FoundationImportProblem[],
  sheet: string,
  row: number | null,
  field: string | null,
  code: string,
  message: string,
  severity: "erro" | "aviso" = "erro",
) {
  problems.push({ sheet, row, field, code, message, severity });
}

function sheetRows(
  workbook: XLSX.WorkBook,
  sheetName: keyof typeof HEADERS,
  problems: FoundationImportProblem[],
) {
  const worksheet = workbook.Sheets[sheetName];
  const expectedHeaders = HEADERS[sheetName];
  if (!worksheet) return [] as Array<{ rowNumber: number; values: Record<string, unknown> }>;
  const range = XLSX.utils.decode_range(worksheet["!ref"] ?? "A1:A1");
  const actualHeaders = expectedHeaders.map((_header, index) => cellText(worksheet[cellAddress(3, index)]?.v));
  expectedHeaders.forEach((header, index) => {
    if (actualHeaders[index] !== header) {
      addProblem(problems, sheetName, 4, columnName(index), "CABECALHO_INVALIDO", `A coluna ${columnName(index)} deve ser “${header}”.`);
    }
  });

  for (let row = 3; row <= range.e.r; row += 1) {
    for (let column = 0; column <= Math.min(range.e.c, expectedHeaders.length - 1); column += 1) {
      const cell = worksheet[cellAddress(row, column)];
      if (cell?.f && expectedHeaders[column] !== "Validação") {
        addProblem(problems, sheetName, row + 1, expectedHeaders[column], "FORMULA_CAMPO_EDITORIAL", "Use valores escritos no campo editorial; fórmulas só são permitidas na coluna Validação.");
      }
    }
  }

  const rows: Array<{ rowNumber: number; values: Record<string, unknown> }> = [];
  for (let row = 4; row <= range.e.r; row += 1) {
    const values = Object.fromEntries(expectedHeaders.map((header, index) => [header, worksheet[cellAddress(row, index)]?.v ?? null]));
    const editorialValues = expectedHeaders.filter((header) => header !== "Validação").map((header) => values[header]);
    if (editorialValues.every(isBlank)) continue;
    rows.push({ rowNumber: row + 1, values });
  }
  return rows;
}

function parseStatus(value: unknown, problems: FoundationImportProblem[], row: number) {
  const normalized = cellText(value).toLocaleLowerCase("pt-BR");
  if (normalized === "planejada") return "planejada" as const;
  if (normalized === "realizada") return "realizada" as const;
  if (normalized === "cancelada") return "cancelada" as const;
  addProblem(problems, "AULA", row, "Status da aula", "STATUS_AULA_INVALIDO", "Use Planejada, Realizada ou Cancelada.");
  return "planejada" as const;
}

function checkMaxLength(
  problems: FoundationImportProblem[],
  sheet: string,
  row: number,
  field: string,
  value: string,
  max: number,
) {
  if (value.length > max) addProblem(problems, sheet, row, field, "CAMPO_LONGO_DEMAIS", `O campo deve ter no máximo ${max} caracteres.`);
}

export function parseFoundationWorkbook(buffer: Buffer, context: FoundationImportContext): FoundationImportPreview {
  const problems: FoundationImportProblem[] = [];
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer", cellFormula: true, cellDates: false, bookVBA: true });
  } catch {
    throw new FoundationImportError("Não foi possível ler o arquivo Excel. Use o gabarito .xlsx oficial.", "BAD_REQUEST");
  }

  if (workbook.vbaraw) {
    addProblem(problems, "ARQUIVO", null, null, "MACRO_NAO_PERMITIDA", "Arquivos com macros não são aceitos.");
  }
  if (workbook.SheetNames.length > MAX_SHEETS) {
    addProblem(problems, "ARQUIVO", null, null, "MUITAS_ABAS", `O arquivo pode ter no máximo ${MAX_SHEETS} abas.`);
  }
  for (const sheetName of REQUIRED_SHEETS) {
    if (!workbook.SheetNames.includes(sheetName)) addProblem(problems, sheetName, null, null, "ABA_OBRIGATORIA_AUSENTE", `A aba ${sheetName} não foi encontrada.`);
  }
  for (const sheetName of workbook.SheetNames) {
    if (sheetName !== "LEIA-ME" && sheetName !== "LISTAS" && !REQUIRED_SHEETS.includes(sheetName as typeof REQUIRED_SHEETS[number]) && !OPTIONAL_SHEETS.includes(sheetName as typeof OPTIONAL_SHEETS[number])) {
      addProblem(problems, sheetName, null, null, "ABA_NAO_RECONHECIDA", "A aba não faz parte do gabarito oficial.", "aviso");
    }
  }

  const studyRows = sheetRows(workbook, "ESTUDO", problems);
  const blockRows = sheetRows(workbook, "BLOCOS", problems);
  const questionRows = sheetRows(workbook, "PERGUNTAS", problems);
  const classRows = workbook.SheetNames.includes("AULA") ? sheetRows(workbook, "AULA", problems) : [];
  const materialRows = workbook.SheetNames.includes("MATERIAIS") ? sheetRows(workbook, "MATERIAIS", problems) : [];

  if (studyRows.length !== 1) addProblem(problems, "ESTUDO", null, null, "ESTUDO_DEVE_TER_UMA_LINHA", "Preencha exatamente uma linha na aba ESTUDO.");
  const studyRow = studyRows[0];
  const studyValues = studyRow?.values ?? {};
  const courseName = cellText(studyValues["Nome exato da turma"]);
  const title = cellText(studyValues["Título do estudo"]);
  const weekStart = cellDateText(studyValues["Data de início da semana (AAAA-MM-DD)"]);
  const moduleTitle = cellText(studyValues["Nome do módulo"]);
  const summary = cellText(studyValues["Objetivo ou resumo"]);
  const content = cellText(studyValues["Introdução / roteiro geral"]);
  const publishStudy = parseBoolean(studyValues["Publicar ao importar?"], problems, "ESTUDO", studyRow?.rowNumber ?? 5, "Publicar ao importar?");

  if (!studyRow) {
    addProblem(problems, "ESTUDO", null, null, "ESTUDO_VAZIO", "Informe turma, título e data de início da semana.");
  } else {
    if (courseName && normalizeFoundationImportTitle(courseName) !== normalizeFoundationImportTitle(context.courseName)) addProblem(problems, "ESTUDO", studyRow.rowNumber, "Nome exato da turma", "TURMA_DIVERGENTE", `O arquivo informa “${courseName}”, mas a turma selecionada é “${context.courseName}”.`);
    if (title.length < 3) addProblem(problems, "ESTUDO", studyRow.rowNumber, "Título do estudo", "TITULO_INVALIDO", "Informe um título com pelo menos 3 caracteres.");
    if (!isValidCivilDate(weekStart)) addProblem(problems, "ESTUDO", studyRow.rowNumber, "Data de início da semana (AAAA-MM-DD)", "DATA_SEMANA_INVALIDA", "Informe uma data civil válida no formato AAAA-MM-DD.");
    if (context.existingWeekStarts.includes(weekStart)) addProblem(problems, "ESTUDO", studyRow.rowNumber, "Data de início da semana (AAAA-MM-DD)", "SEMANA_DUPLICADA", "Já existe um estudo nesta turma com essa data de início.");
    if (moduleTitle && !context.moduleTitles.some((item) => normalizeFoundationImportTitle(item) === normalizeFoundationImportTitle(moduleTitle))) addProblem(problems, "ESTUDO", studyRow.rowNumber, "Nome do módulo", "MODULO_NAO_ENCONTRADO", `O módulo “${moduleTitle}” não existe nesta turma.`);
    checkMaxLength(problems, "ESTUDO", studyRow.rowNumber, "Objetivo ou resumo", summary, 500);
    checkMaxLength(problems, "ESTUDO", studyRow.rowNumber, "Introdução / roteiro geral", content, 12000);
  }

  if (blockRows.length > MAX_BLOCKS) addProblem(problems, "BLOCOS", null, null, "MUITOS_BLOCOS", `O arquivo pode ter no máximo ${MAX_BLOCKS} blocos.`);
  const blocks: FoundationImportPayload["blocks"] = [];
  const blockKeys = new Set<string>();
  const blockPositionByTitle = new Map<string, number>();
  for (const row of blockRows) {
    const values = row.values;
    const rawTitle = cellText(values["Título do bloco"]);
    const rawContent = cellText(values["Conteúdo da leitura"]);
    if (!rawTitle && !rawContent) continue;
    const order = parseInteger(values.Ordem);
    const publish = parseBoolean(values["Publicar ao importar?"], problems, "BLOCOS", row.rowNumber, "Publicar ao importar?");
    if (!order || order < 1) addProblem(problems, "BLOCOS", row.rowNumber, "Ordem", "ORDEM_INVALIDA", "A ordem deve ser um número inteiro positivo.");
    if (order && blocks.some((block) => block.position === order - 1)) addProblem(problems, "BLOCOS", row.rowNumber, "Ordem", "ORDEM_DUPLICADA", "A ordem do bloco não pode se repetir.");
    if (rawTitle.length < 3) addProblem(problems, "BLOCOS", row.rowNumber, "Título do bloco", "TITULO_BLOCO_INVALIDO", "Informe um título com pelo menos 3 caracteres.");
    if (!rawContent) addProblem(problems, "BLOCOS", row.rowNumber, "Conteúdo da leitura", "CONTEUDO_BLOCO_AUSENTE", "Informe o conteúdo da leitura.");
    const key = normalizeFoundationImportTitle(rawTitle);
    if (key && blockKeys.has(key)) addProblem(problems, "BLOCOS", row.rowNumber, "Título do bloco", "TITULO_BLOCO_DUPLICADO", "O título do bloco não pode se repetir.");
    if (key) blockKeys.add(key);
    checkMaxLength(problems, "BLOCOS", row.rowNumber, "Conteúdo da leitura", rawContent, 12000);
    const position = order ? order - 1 : blocks.length;
    blocks.push({ position, title: rawTitle, content: rawContent, publish });
    if (key) blockPositionByTitle.set(key, position);
  }
  blocks.sort((left, right) => left.position - right.position);
  if (!blocks.length) addProblem(problems, "BLOCOS", null, null, "BLOCOS_AUSENTES", "Inclua pelo menos um bloco de leitura.");
  if (blocks.some((block) => !block.publish) && publishStudy) addProblem(problems, "BLOCOS", null, "Publicar ao importar?", "ESTUDO_PUBLICADO_COM_BLOCO_RASCUNHO", "Um estudo publicado não pode conter blocos marcados como Não.");

  if (questionRows.length > MAX_QUESTIONS) addProblem(problems, "PERGUNTAS", null, null, "MUITAS_PERGUNTAS", `O arquivo pode ter no máximo ${MAX_QUESTIONS} perguntas.`);
  const questions: FoundationImportPayload["questions"] = [];
  const questionPositionByBlock = new Map<number, number>();
  for (const row of questionRows) {
    const values = row.values;
    const blockTitle = cellText(values["Título exato do bloco"]);
    const prompt = cellText(values["Enunciado da pergunta"]);
    const optionA = cellText(values["Alternativa A"]);
    const optionB = cellText(values["Alternativa B"]);
    if (!blockTitle && !prompt && !optionA && !optionB) continue;
    const blockOrder = parseInteger(values["Ordem do bloco"]);
    const correct = cellText(values["Resposta correta"]).toUpperCase();
    const explanation = cellText(values["Explicação do gabarito"]);
    const publish = parseBoolean(values["Publicar ao importar?"], problems, "PERGUNTAS", row.rowNumber, "Publicar ao importar?");
    const blockKey = normalizeFoundationImportTitle(blockTitle);
    const blockPosition = blockPositionByTitle.get(blockKey);
    if (blockPosition === undefined) addProblem(problems, "PERGUNTAS", row.rowNumber, "Título exato do bloco", "BLOCO_NAO_ENCONTRADO", `O bloco “${blockTitle}” não foi encontrado na aba BLOCOS.`);
    if (blockPosition !== undefined && blockOrder !== null && blockOrder !== blockPosition + 1) addProblem(problems, "PERGUNTAS", row.rowNumber, "Ordem do bloco", "ORDEM_BLOCO_DIVERGENTE", "A ordem do bloco não corresponde ao título informado.");
    if (prompt.length < 3) addProblem(problems, "PERGUNTAS", row.rowNumber, "Enunciado da pergunta", "PERGUNTA_INVALIDA", "Informe um enunciado com pelo menos 3 caracteres.");
    if (!optionA || !optionB) addProblem(problems, "PERGUNTAS", row.rowNumber, "Alternativas", "ALTERNATIVAS_INCOMPLETAS", "Preencha as alternativas A e B.");
    if (correct !== "A" && correct !== "B") addProblem(problems, "PERGUNTAS", row.rowNumber, "Resposta correta", "RESPOSTA_CORRETA_INVALIDA", "A resposta correta deve ser A ou B.");
    if (!explanation) addProblem(problems, "PERGUNTAS", row.rowNumber, "Explicação do gabarito", "EXPLICACAO_AUSENTE", "Informe uma explicação que ajude o discípulo a aprender.");
    if (blockPosition !== undefined && !blocks[blockPosition]?.publish && publish) addProblem(problems, "PERGUNTAS", row.rowNumber, "Publicar ao importar?", "PERGUNTA_EM_BLOCO_RASCUNHO", "Não publique uma pergunta dentro de um bloco marcado como Não.");
    checkMaxLength(problems, "PERGUNTAS", row.rowNumber, "Enunciado da pergunta", prompt, 4000);
    checkMaxLength(problems, "PERGUNTAS", row.rowNumber, "Explicação do gabarito", explanation, 4000);
    const position = blockPosition === undefined ? 0 : (questionPositionByBlock.get(blockPosition) ?? 0);
    if (blockPosition !== undefined) questionPositionByBlock.set(blockPosition, position + 1);
    questions.push({ blockTitle, blockPosition: blockPosition ?? Math.max(0, (blockOrder ?? 1) - 1), prompt, options: [{ id: "a", label: optionA }, { id: "b", label: optionB }], correctOptionId: correct === "B" ? "b" : "a", explanation, publish });
  }
  if (!questions.length) addProblem(problems, "PERGUNTAS", null, null, "SEM_PERGUNTAS", "Nenhuma pergunta foi informada; o estudo poderá ser criado, mas a preparação ficará sem perguntas.", "aviso");

  let importedClass: FoundationImportPayload["class"] = null;
  const meaningfulClassRows = classRows.filter((row) => !isBlank(row.values["Data do domingo (AAAA-MM-DD)"]) || !isBlank(row.values["Observação para o professor"]));
  if (meaningfulClassRows.length > 1) addProblem(problems, "AULA", null, null, "AULA_DEVE_TER_UMA_LINHA", "Informe no máximo uma aula presencial.");
  const classRow = meaningfulClassRows[0];
  if (classRow) {
    const classDate = cellDateText(classRow.values["Data do domingo (AAAA-MM-DD)"]);
    const status = parseStatus(classRow.values["Status da aula"], problems, classRow.rowNumber);
    const notes = cellText(classRow.values["Observação para o professor"]);
    if (!isValidCivilDate(classDate)) addProblem(problems, "AULA", classRow.rowNumber, "Data do domingo (AAAA-MM-DD)", "DATA_AULA_INVALIDA", "Informe uma data civil válida no formato AAAA-MM-DD.");
    else if (parseCivilDateAsUtcNoon(classDate)?.getUTCDay() !== 0) addProblem(problems, "AULA", classRow.rowNumber, "Data do domingo (AAAA-MM-DD)", "DATA_NAO_DOMINGO", "A data da aula presencial deve cair em um domingo.");
    if (isValidCivilDate(weekStart) && isValidCivilDate(classDate) && classDate < weekStart) addProblem(problems, "AULA", classRow.rowNumber, "Data do domingo (AAAA-MM-DD)", "AULA_ANTES_DA_SEMANA", "A aula não pode ocorrer antes do início da semana do estudo.");
    checkMaxLength(problems, "AULA", classRow.rowNumber, "Observação para o professor", notes, 2000);
    importedClass = { classDate, status, notes: notes || null };
  }

  if (materialRows.length > MAX_MATERIALS) addProblem(problems, "MATERIAIS", null, null, "MUITOS_MATERIAIS", `O arquivo pode ter no máximo ${MAX_MATERIALS} materiais.`);
  const materials: FoundationImportPayload["materials"] = [];
  for (const row of materialRows) {
    const titleValue = cellText(row.values["Título exato na Biblioteca Digital"]);
    if (!titleValue) continue;
    const order = parseInteger(row.values.Ordem);
    const notes = cellText(row.values.Observação);
    if (!order || order < 1) addProblem(problems, "MATERIAIS", row.rowNumber, "Ordem", "ORDEM_MATERIAL_INVALIDA", "A ordem deve ser um número inteiro positivo.");
    const materialMatches = context.materials.filter((item) => normalizeFoundationImportTitle(item.title) === normalizeFoundationImportTitle(titleValue));
    if (!materialMatches.length) addProblem(problems, "MATERIAIS", row.rowNumber, "Título exato na Biblioteca Digital", "MATERIAL_NAO_ENCONTRADO", `O material “${titleValue}” não foi encontrado na Biblioteca desta igreja.`);
    if (materialMatches.length > 1) addProblem(problems, "MATERIAIS", row.rowNumber, "Título exato na Biblioteca Digital", "MATERIAL_AMBIGUO", `Há mais de um material com o título “${titleValue}”. Renomeie os materiais ou escolha um título único.`);
    materials.push({ position: Math.max(0, (order ?? materials.length + 1) - 1), title: titleValue, notes: notes || null });
  }
  materials.sort((left, right) => left.position - right.position);

  const payload: FoundationImportPayload = {
    courseId: context.courseId,
    courseName: context.courseName,
    study: { title, weekStart, moduleTitle: moduleTitle || null, summary: summary || null, content: content || null, publish: publishStudy },
    blocks,
    questions,
    class: importedClass,
    materials,
  };
  const errors = problems.filter((problem) => problem.severity === "erro").length;
  const warnings = problems.filter((problem) => problem.severity === "aviso").length;
  return {
    payload,
    summary: {
      studyTitle: title || null,
      weekStart: weekStart || null,
      counts: { blocks: blocks.length, questions: questions.length, materials: materials.length },
      classIncluded: Boolean(importedClass),
      publishStudy,
      errors,
      warnings,
      problems,
    },
  };
}

export function isXlsxFileSignature(buffer: Buffer) {
  return buffer.length >= 4 && buffer.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
}

export function sanitizeFoundationImportFilename(value: string) {
  const base = value.replace(/[\\/\r\n]/g, "_").trim();
  return (base || "gabarito-fundamentos.xlsx").slice(0, 255);
}
