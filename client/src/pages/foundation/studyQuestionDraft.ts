export type QuestionOptionDraft = { id: string; label: string };
export type StudyQuestionDraft = {
  prompt: string;
  options: QuestionOptionDraft[];
  correctOptionId: string;
  explanation: string;
};

export const MAX_QUESTION_OPTIONS = 6;
export const MIN_QUESTION_OPTIONS = 2;

export function validateStudyQuestionDraft(
  draft: StudyQuestionDraft
): string | null {
  if (draft.prompt.trim().length < 3 || draft.prompt.trim().length > 4000) {
    return "Escreva uma pergunta com 3 a 4.000 caracteres.";
  }
  if (
    draft.options.length < MIN_QUESTION_OPTIONS ||
    draft.options.length > MAX_QUESTION_OPTIONS
  ) {
    return "Use de duas a seis alternativas.";
  }
  if (
    draft.options.some(
      option => !option.label.trim() || option.label.trim().length > 500
    )
  ) {
    return "Preencha todas as alternativas, com até 500 caracteres cada.";
  }
  const ids = draft.options.map(option => option.id);
  if (
    ids.some(id => !id || id.length > 80) ||
    new Set(ids).size !== ids.length
  ) {
    return "As alternativas precisam ter identificadores distintos.";
  }
  const labels = draft.options.map(option =>
    option.label.trim().toLocaleLowerCase("pt-BR")
  );
  if (new Set(labels).size !== labels.length) {
    return "Use textos diferentes nas alternativas.";
  }
  if (!draft.options.some(option => option.id === draft.correctOptionId)) {
    return "Marque a resposta correta entre as alternativas.";
  }
  if (!draft.explanation.trim() || draft.explanation.trim().length > 4000) {
    return "Explique a resposta em até 4.000 caracteres.";
  }
  return null;
}

export function nextQuestionOptionId(
  options: QuestionOptionDraft[]
): string | null {
  if (options.length >= MAX_QUESTION_OPTIONS) return null;
  return (
    ["a", "b", "c", "d", "e", "f"].find(
      id => !options.some(option => option.id === id)
    ) ?? null
  );
}
