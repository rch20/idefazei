export type StageNotePayload = {
  churchId: number;
  courseId: number;
  enrollmentId: number;
  studyId: number;
  blockId: number | null;
  reflection: string | null;
  /** A versão é obrigatória no caminho de produção; opcional apenas para o contrato legado. */
  expectedVersion?: number;
  /** Permite que o dispatch descubra a versão confirmada apenas ao iniciar. */
  versioned?: boolean;
};

export type StageNoteKey = string;

export class StageNoteQueueInvalidatedError extends Error {
  readonly code = "STAGE_NOTE_QUEUE_INVALIDATED";

  constructor() {
    super("A tentativa de salvar esta anotação foi invalidada.");
    this.name = "StageNoteQueueInvalidatedError";
  }
}

export function getStageNoteKey(
  payload: Pick<
    StageNotePayload,
    "churchId" | "enrollmentId" | "studyId" | "blockId"
  >
): StageNoteKey {
  return `${payload.churchId}:${payload.enrollmentId}:${payload.studyId}:${payload.blockId ?? "legacy"}`;
}

/**
 * Fila serial de autosave.
 *
 * A serialização continua compatível com a fila antiga, mas uma nota conflitante
 * pode ser pausada/invalida sem deixar uma resolução humana prender operações de
 * outras notas. O snapshot é capturado antes de entrar na fila.
 */
export function createStageNoteQueue() {
  let legacyTail: Promise<void> = Promise.resolve();
  const tails = new Map<StageNoteKey, Promise<void>>();
  const paused = new Set<StageNoteKey>();
  const generations = new Map<StageNoteKey, number>();

  const generationFor = (key: StageNoteKey) => generations.get(key) ?? 0;

  const save = (
    payload: StageNotePayload,
    persist: (note: StageNotePayload) => Promise<unknown>
  ) => {
    const snapshot = { ...payload };
    const key = getStageNoteKey(snapshot);
    const generation = generationFor(key);
    // O caminho versionado isola cada anotação. O payload legado continua
    // serializado globalmente para não mudar o contrato dos testes antigos.
    const queueKey =
      snapshot.versioned || snapshot.expectedVersion !== undefined
        ? key
        : "legacy";
    const tail =
      queueKey === "legacy"
        ? legacyTail
        : (tails.get(queueKey) ?? Promise.resolve());
    const operation = tail.then(async () => {
      if (paused.has(key) || generation !== generationFor(key)) {
        throw new StageNoteQueueInvalidatedError();
      }
      await persist(snapshot);
    });

    // A falha de um item nunca cancela o próximo item da fila global.
    const nextTail = operation.then(
      () => undefined,
      () => undefined
    );
    if (queueKey === "legacy") legacyTail = nextTail;
    else tails.set(queueKey, nextTail);
    return operation;
  };

  return {
    save,
    pause(key: StageNoteKey) {
      paused.add(key);
    },
    resume(key: StageNoteKey) {
      paused.delete(key);
    },
    invalidate(key: StageNoteKey) {
      generations.set(key, generationFor(key) + 1);
    },
    isPaused(key: StageNoteKey) {
      return paused.has(key);
    },
    getPendingTail() {
      return Promise.all([legacyTail, ...Array.from(tails.values())]).then(
        () => undefined
      );
    },
  };
}
