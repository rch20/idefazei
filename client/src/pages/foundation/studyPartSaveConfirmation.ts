export type StudyPartSavePayload = {
  churchId: number;
  studyId: number;
  blockId: number;
  title: string;
  content: string;
  reflectionPrompt: string | null;
  active: boolean;
};

const normalizedReflection = (value: string | null | undefined) =>
  value?.trim() || null;

/** Mesmos limites do contrato updateQuestionBlock; não inicia uma mutation inválida. */
export function validateStudyPartSave(
  payload: StudyPartSavePayload
): string | null {
  const titleLength = payload.title.trim().length;
  if (titleLength < 3 || titleLength > 160)
    return "O nome da etapa deve ter entre 3 e 160 caracteres.";
  const contentLength = payload.content.trim().length;
  if (contentLength < 1 || contentLength > 12_000)
    return "Preencha o conteúdo da etapa com até 12.000 caracteres.";
  if ((payload.reflectionPrompt?.trim().length ?? 0) > 1_000)
    return "A reflexão da etapa deve ter até 1.000 caracteres.";
  return null;
}

/** Uma resposta HTTP/tRPC de sucesso não basta se não confirma o bloco enviado. */
export function confirmsStudyPartSave(
  payload: StudyPartSavePayload,
  result: unknown
): boolean {
  if (!result || typeof result !== "object") return false;
  const saved = result as Record<string, unknown>;
  return (
    saved.id === payload.blockId &&
    saved.churchId === payload.churchId &&
    saved.studyId === payload.studyId &&
    saved.title === payload.title.trim() &&
    saved.content === payload.content.trim() &&
    (typeof saved.reflectionPrompt === "string" ||
      saved.reflectionPrompt == null) &&
    normalizedReflection(
      saved.reflectionPrompt as string | null | undefined
    ) === normalizedReflection(payload.reflectionPrompt) &&
    saved.active === payload.active
  );
}

/** Só usa códigos reconhecidos. Nunca reproduz mensagens, SQL, payload ou credenciais. */
export function studySaveErrorMessage(error: unknown): string {
  const data =
    error && typeof error === "object"
      ? (error as { data?: { requestId?: unknown } }).data
      : undefined;
  const message = studySaveErrorBaseMessage(error);
  return typeof data?.requestId === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      data.requestId
    )
    ? `${message} Referência: ${data.requestId}.`
    : message;
}

function studySaveErrorBaseMessage(error: unknown): string {
  const data =
    error && typeof error === "object"
      ? (error as { data?: { code?: unknown } }).data
      : undefined;
  switch (data?.code) {
    case "BAD_REQUEST":
      return "Revise os campos da etapa. O servidor recusou os dados; seu texto continua nesta tela.";
    case "UNAUTHORIZED":
      return "Sua sessão precisa ser renovada. O salvamento não foi confirmado; não feche a edição antes de recuperar seu texto.";
    case "FORBIDDEN":
      return "Sua conta não tem permissão para salvar este conteúdo. Seu texto continua nesta tela.";
    case "NOT_FOUND":
      return "O estudo ou a etapa não foi encontrado no acesso atual. Seu texto continua nesta tela.";
    case "CONFLICT":
      return "O salvamento entrou em conflito com outra operação. Seu texto continua nesta tela; confira o registro antes de continuar.";
    case "SAVE_CONFIRMATION_MISMATCH":
      return "A resposta do servidor não confirmou o conteúdo enviado. Seu texto continua nesta tela; confira o bloco salvo antes de tentar novamente.";
    default:
      return "Não foi possível confirmar o salvamento. Seu texto continua nesta tela. Tente novamente.";
  }
}
