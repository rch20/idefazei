export type StageNotePayload = {
  churchId: number;
  courseId: number;
  enrollmentId: number;
  studyId: number;
  blockId: number | null;
  reflection: string | null;
};

/** Captura o destino e o texto antes de trocar de etapa. Sem rede ou estado global. */
export function createStageNoteQueue() {
  let tail: Promise<void> = Promise.resolve();
  return {
    save(
      payload: StageNotePayload,
      persist: (note: StageNotePayload) => Promise<unknown>
    ) {
      const snapshot = { ...payload };
      const operation = tail
        .then(() => persist(snapshot))
        .then(() => undefined);
      // Uma falha não cancela os próximos salvamentos; o chamador mantém o rascunho.
      tail = operation.catch(() => undefined);
      return operation;
    },
  };
}
