export type FoundationImportPreviewStage = "autorizacao" | "upload" | "catalogo" | "parser" | "rascunho";

const stageLabels: Record<FoundationImportPreviewStage, string> = {
  autorizacao: "autorização",
  upload: "recebimento do arquivo",
  catalogo: "catálogo da turma",
  parser: "leitura do Excel",
  rascunho: "salvamento da prévia",
};

function safeErrorName(error: unknown) {
  const name = error instanceof Error ? error.name : "UnknownError";
  return /^[A-Za-z][A-Za-z0-9_]*$/.test(name) ? name : "UnknownError";
}

export function createFoundationImportRequestId() {
  return Math.random().toString(36).slice(2, 10).toUpperCase().padEnd(8, "0");
}

export function describeFoundationImportFailure(
  stage: FoundationImportPreviewStage,
  requestId: string,
  error: unknown,
) {
  const normalizedRequestId = (requestId.replace(/[^A-Z0-9-]/gi, "").slice(0, 32) || "SEM-CODIGO").toUpperCase();
  const code = `FUNDAMENTOS_IMPORT_${stage.toUpperCase()}_${normalizedRequestId}`;
  return {
    code,
    userMessage: `Não foi possível validar o gabarito durante a etapa de ${stageLabels[stage]}. Código de atendimento: ${code}.`,
    logContext: {
      code,
      stage,
      errorName: safeErrorName(error),
    },
  } as const;
}
