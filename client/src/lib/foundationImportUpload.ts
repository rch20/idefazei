import { getChurchToken } from "@/hooks/useChurchAuth";

export type FoundationImportProblem = {
  sheet: string;
  row: number | null;
  field: string | null;
  code: string;
  message: string;
  severity: "erro" | "aviso";
};

export type FoundationImportPreview = {
  draftId: number;
  expiresAt: string | Date;
  sourceFilename: string;
  payload: {
    courseId: number;
    courseName: string;
    study: { title: string; weekStart: string; publish: boolean };
    blocks: Array<{ position: number; title: string; publish: boolean }>;
    questions: Array<{ blockTitle: string; prompt: string; publish: boolean }>;
    class: { classDate: string; status: "planejada" | "realizada" | "cancelada"; notes: string | null } | null;
    materials: Array<{ position: number; title: string; notes: string | null }>;
  };
  summary: {
    studyTitle: string | null;
    weekStart: string | null;
    counts: { blocks: number; questions: number; materials: number };
    classIncluded: boolean;
    publishStudy: boolean;
    errors: number;
    warnings: number;
    problems: FoundationImportProblem[];
  };
};

export async function uploadFoundationImportPreview(file: File, courseId: number) {
  if (!file.name.toLocaleLowerCase().endsWith(".xlsx")) throw new Error("Escolha um arquivo .xlsx.");
  if (file.size > 2 * 1024 * 1024) throw new Error("O gabarito deve ter no máximo 2 MB.");
  const token = getChurchToken();
  if (!token) throw new Error("Sua sessão expirou. Entre novamente para enviar o gabarito.");
  const formData = new FormData();
  formData.append("courseId", String(courseId));
  formData.append("file", file);
  const response = await fetch("/api/escola-fundamentos/import/preview", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const result = await response.json() as Partial<FoundationImportPreview> & { error?: string };
  if (!response.ok || !result.draftId || !result.summary || !result.payload) throw new Error(result.error ?? "Não foi possível validar o gabarito.");
  return result as FoundationImportPreview;
}
