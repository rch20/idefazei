import { use, useEffect, useRef, useState } from "react";
import type {
  FoundationNoteSnapshot,
  FoundationNoteStore,
} from "./foundationNoteState";
import {
  createStageNoteQueue,
  getStageNoteKey,
  type StageNotePayload,
  StageNoteQueueInvalidatedError,
} from "./stageNoteQueue";

// Promise estável por módulo. O destino só importa valores puros, nunca React/UI.
let stateFactory:
  | typeof import("./foundationNoteState").createFoundationNoteState
  | undefined;
const noteStateModule = import("./foundationNoteState").then(module => {
  stateFactory = module.createFoundationNoteState;
  return module;
});
export const preloadFoundationNoteState = () => noteStateModule;
export const NOTE_SAVE_TIMEOUT_MS = 30_000;

type Scope = Omit<
  StageNotePayload,
  "reflection" | "expectedVersion" | "versioned"
>;
type SnapshotInput = {
  reflection: string | null | undefined;
  reflectionVersion: number | null | undefined;
};
type Options = {
  scope: Scope | null;
  snapshot: SnapshotInput | null;
  persist: (
    note: StageNotePayload & { expectedVersion: number }
  ) => Promise<unknown>;
  read: (scope: Scope) => Promise<FoundationNoteSnapshot>;
  onSaved?: (scope: Scope, snapshot: FoundationNoteSnapshot) => void;
  onError?: (message: string) => void;
};
function isConflict(error: unknown) {
  const value = error as {
    message?: string;
    code?: string;
    data?: { code?: string };
  };
  return (
    value?.message === "NOTE_VERSION_CONFLICT" ||
    value?.code === "CONFLICT" ||
    value?.data?.code === "CONFLICT"
  );
}

/** Uma única fonte de estado por identidade de nota; não persiste dados pedagógicos paralelos. */
export function useVersionedStageNote(options: Options) {
  const createFoundationNoteState =
    stateFactory ?? use(noteStateModule).createFoundationNoteState;
  const latest = useRef(options);
  latest.current = options;
  const store = useRef<FoundationNoteStore>(null!);
  if (!store.current) store.current = createFoundationNoteState();
  const queue = useRef(createStageNoteQueue());
  const confirmations = useRef(
    new Map<
      string,
      { token: number; confirm: (snapshot: FoundationNoteSnapshot) => void }
    >()
  );
  const pending = useRef(
    new Map<string, { text: string | null; promise: Promise<void> }>()
  );
  const reading = useRef(new Set<string>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);
  const [revision, render] = useState(0);
  const [flushing, setFlushing] = useState(false);
  const key = options.scope ? getStageNoteKey(options.scope) : null;
  const activeKey = useRef(key);
  activeKey.current = key;
  const refresh = () => {
    if (alive.current) render(value => value + 1);
  };
  const clearTimer = () => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      clearTimer();
    };
  }, []);
  useEffect(() => {
    clearTimer();
    if (!key || !options.snapshot) return;
    store.current.hydrate(key, options.snapshot, { source: "remote" });
    const observed = store.current.get(key);
    const confirmation = confirmations.current.get(key);
    if (observed?.ownEcho && observed.inFlight?.token === confirmation?.token)
      confirmation?.confirm(observed.ownEcho);
    refresh();
  }, [key, options.snapshot?.reflection, options.snapshot?.reflectionVersion]);

  const loadConflict = async (
    scope: Scope,
    conflictKey = getStageNoteKey(scope)
  ) => {
    if (reading.current.has(conflictKey)) return;
    reading.current.add(conflictKey);
    refresh();
    try {
      const remote = await latest.current.read(scope);
      store.current.setConflictRemote(conflictKey, remote);
    } catch {
      // Sem revisão remota confirmada, o rascunho permanece e nenhuma decisão grava.
    } finally {
      reading.current.delete(conflictKey);
      refresh();
    }
  };
  const save = (scope: Scope, text: string | null): Promise<void> => {
    const noteKey = getStageNoteKey(scope);
    const previous = pending.current.get(noteKey);
    if (previous && previous.text === text) return previous.promise;
    let operation: Promise<void>;
    operation = queue.current
      .save({ ...scope, reflection: text, versioned: true }, async snapshot => {
        const dispatch = store.current.beginSave(noteKey, snapshot.reflection);
        if (!dispatch) throw new StageNoteQueueInvalidatedError();
        refresh();
        let timeout: ReturnType<typeof setTimeout> | undefined;
        const observed = new Promise<unknown>((resolve, reject) => {
          confirmations.current.set(noteKey, {
            token: dispatch.token,
            confirm: confirmed =>
              resolve({ success: true, ...confirmed, unchanged: true }),
          });
          timeout = setTimeout(
            () => reject(Error("NOTE_SAVE_TIMEOUT")),
            NOTE_SAVE_TIMEOUT_MS
          );
        });
        try {
          const sent = latest.current.persist({
            ...snapshot,
            expectedVersion: dispatch.expectedVersion,
          });
          const result = await Promise.race([sent, observed]);
          const accepted = store.current.completeSave(
            noteKey,
            dispatch.token,
            result
          );
          if (!accepted.accepted || !("snapshot" in accepted))
            throw Error("INVALID_SAVE_RESULT");
          latest.current.onSaved?.(scope, accepted.snapshot);
          refresh();
        } catch (error) {
          store.current.failSave(noteKey, dispatch.token);
          if (isConflict(error)) {
            queue.current.pause(noteKey);
            queue.current.invalidate(noteKey);
            store.current.markConflict(noteKey, null);
            refresh();
            void loadConflict(scope, noteKey);
          } else {
            // Invalidar itens já enfileirados evita reenvio cego após falha sem confirmação.
            queue.current.invalidate(noteKey);
            latest.current.onError?.(
              "Não foi possível confirmar o salvamento. Seu texto foi preservado. Tente novamente."
            );
            refresh();
          }
          throw error;
        } finally {
          if (timeout !== undefined) clearTimeout(timeout);
          if (confirmations.current.get(noteKey)?.token === dispatch.token)
            confirmations.current.delete(noteKey);
        }
      })
      .finally(() => {
        if (pending.current.get(noteKey)?.promise === operation)
          pending.current.delete(noteKey);
        refresh();
      });
    pending.current.set(noteKey, { text, promise: operation });
    return operation;
  };

  const entry = key ? store.current.get(key) : null;
  const value = entry?.draft ?? options.snapshot?.reflection ?? "";
  const hasUnsaved = Boolean(key && store.current.hasUnsaved(key));
  useEffect(() => {
    clearTimer();
    if (
      !key ||
      !options.scope ||
      !entry ||
      entry.conflict ||
      !entry.versionKnown
    )
      return;
    if (entry.status === "error" || !store.current.hasUnsaved(key)) return;
    const scope = { ...options.scope };
    const draft = entry.draft;
    // Uma alteração durante o pedido mantém a mesma identidade e espera o ACK anterior.
    if (entry.inFlight?.reflection === draft) return;
    timer.current = setTimeout(() => {
      timer.current = null;
      void save(scope, draft).catch(() => undefined);
    }, 700);
    return clearTimer;
  }, [key, entry?.draft, entry?.status, entry?.versionKnown, entry?.conflict]);
  useEffect(() => {
    if (!hasUnsaved) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasUnsaved]);

  const edit = (text: string) => {
    if (!key) return;
    store.current.edit(key, text);
    refresh();
  };
  const flush = async () => {
    clearTimer();
    const scope = latest.current.scope;
    if (!scope || !key) return !hasUnsaved;
    if (store.current.get(key)?.conflict || !store.current.isVersionKnown(key))
      return false;
    if (!store.current.hasUnsaved(key)) return true;
    setFlushing(true);
    try {
      await save({ ...scope }, store.current.getDraft(key));
      // Nova digitação durante o flush não pode ser descartada por saída/navegação.
      return !store.current.hasUnsaved(key);
    } catch {
      return false;
    } finally {
      if (alive.current) setFlushing(false);
    }
  };
  const resolve = (kind: "remote" | "mine" | "combined", combined?: string) => {
    clearTimer();
    const scope = latest.current.scope;
    if (!key || !scope || !store.current.get(key)?.conflict?.remote) return;
    queue.current.invalidate(key);
    if (kind === "remote") {
      const snapshot = store.current.resolveUseRemote(key);
      queue.current.resume(key);
      if (snapshot) latest.current.onSaved?.(scope, snapshot);
      refresh();
      return;
    }
    const draft =
      kind === "mine"
        ? store.current.resolveKeepMine(key)
        : store.current.resolveCombined(key, combined ?? "");
    queue.current.resume(key);
    refresh();
    if (draft) void save({ ...scope }, draft.reflection).catch(() => undefined);
  };
  return {
    value,
    edit,
    flush,
    isSaving: entry?.status === "saving",
    hasError: entry?.status === "error",
    hasUnsaved,
    flushing,
    versionKnown: entry?.versionKnown ?? false,
    conflict: entry?.conflict ?? null,
    loadingRemote: Boolean(key && reading.current.has(key)),
    retry: () => void flush(),
    retryRemote: () => {
      if (options.scope) void loadConflict({ ...options.scope });
    },
    useRemote: () => resolve("remote"),
    keepMine: () => resolve("mine"),
    combine: (text: string) => resolve("combined", text),
    revision,
  };
}
