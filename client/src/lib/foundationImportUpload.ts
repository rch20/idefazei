import { getChurchToken } from "@/hooks/useChurchAuth";

export type FoundationImportTemplateVersion = 1 | 2;

export type FoundationImportProblem = {
  sheet: string;
  row: number | null;
  field: string | null;
  code: string;
  message: string;
  severity: "erro" | "aviso";
};

export type FoundationImportOption = {
  id: string;
  label: string;
};

export type FoundationImportPayload = {
  templateVersion?: FoundationImportTemplateVersion;
  courseId: number;
  courseName: string;
  study: {
    title: string;
    weekStart: string;
    publish: boolean;
    summary?: string | null;
    content?: string | null;
    moduleTitle?: string | null;
  };
  blocks: Array<{
    position: number;
    title: string;
    content?: string;
    reflectionPrompt?: string | null;
    publish: boolean;
  }>;
  questions: Array<{
    blockTitle: string;
    blockPosition?: number;
    prompt: string;
    options?: FoundationImportOption[];
    correctOptionId?: string;
    explanation?: string;
    publish: boolean;
  }>;
  class?: {
    classDate: string;
    status: "planejada" | "realizada" | "cancelada";
    notes: string | null;
  } | null;
  materials?: Array<{
    position: number;
    title: string;
    notes: string | null;
  }>;
};

export type FoundationImportSummary = {
  templateVersion?: FoundationImportTemplateVersion;
  studyTitle: string | null;
  weekStart: string | null;
  counts: { blocks: number; questions: number; materials: number };
  classIncluded: boolean;
  publishStudy: boolean;
  errors: number;
  warnings: number;
  problems: FoundationImportProblem[];
};

export type FoundationImportPreview = {
  draftId: number;
  expiresAt: string | Date;
  sourceFilename: string;
  payload: FoundationImportPayload;
  summary: FoundationImportSummary;
};

type FoundationImportResponse = Partial<FoundationImportPreview> & {
  error?: string;
  message?: string;
};

/**
 * A ausência de versão é intencionalmente tratada como legado. Assim, uma
 * resposta antiga continua usando o fluxo Escola já conhecido, enquanto a v2
 * só é ativada quando o servidor a identifica explicitamente.
 */
export function getFoundationImportTemplateVersion(
  preview: Pick<FoundationImportPreview, "payload" | "summary">,
): FoundationImportTemplateVersion {
  return preview.payload.templateVersion ?? preview.summary.templateVersion ?? 1;
}

function responseErrorMessage(result: FoundationImportResponse) {
  return result.error ?? result.message ?? "Não foi possível validar o gabarito.";
}

export async function uploadFoundationImportPreview(file: File, courseId: number): Promise<FoundationImportPreview> {
  if (!file.name.toLocaleLowerCase().endsWith(".xlsx")) {
    throw new Error("Escolha um arquivo .xlsx.");
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error("O gabarito deve ter no máximo 2 MB.");
  }
  const token = getChurchToken();
  if (!token) {
    throw new Error("Sua sessão expirou. Entre novamente para enviar o gabarito.");
  }

  const formData = new FormData();
  formData.append("courseId", String(courseId));
  formData.append("file", file);
  const response = await fetch("/api/escola-fundamentos/import/preview", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  let result: FoundationImportResponse;
  try {
    result = (await response.json()) as FoundationImportResponse;
  } catch {
    throw new Error(response.ok ? "A prévia retornou uma resposta inválida." : "Não foi possível validar o gabarito.");
  }

  if (!response.ok || !result.draftId || !result.summary || !result.payload) {
    throw new Error(responseErrorMessage(result));
  }

  // O upload nunca confirma: draftId é o único identificador usado depois,
  // e o payload recebido aqui serve apenas para a revisão local da prévia.
  return result as FoundationImportPreview;
}
