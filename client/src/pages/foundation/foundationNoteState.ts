import {
  normalizeFoundationNoteText,
  NOTE_VERSION_CONFLICT,
  NOTE_VERSION_REQUIRED,
  type FoundationNoteSaveResult,
} from "@shared/foundationNoteValues";

export {
  normalizeFoundationNoteText,
  NOTE_VERSION_CONFLICT,
  NOTE_VERSION_REQUIRED,
} from "@shared/foundationNoteValues";
export type { FoundationNoteSaveResult } from "@shared/foundationNoteValues";

export type FoundationNoteSnapshot = {
  reflection: string | null;
  reflectionVersion: number;
};

export type FoundationNoteStatus =
  | "clean"
  | "dirty"
  | "saving"
  | "error"
  | "conflict";

export type FoundationNoteInFlight = FoundationNoteSnapshot & {
  token: number;
};

export type FoundationNoteConflict = {
  remote: FoundationNoteSnapshot | null;
  message: string;
};

export type FoundationNoteEntry = {
  key: string;
  confirmed: FoundationNoteSnapshot;
  /** A versão 0 só é gravável depois de uma leitura válida que a confirmou. */
  versionKnown: boolean;
  draft: string | null;
  inFlight: FoundationNoteInFlight | null;
  ownEcho: FoundationNoteSnapshot | null;
  remoteCandidate: FoundationNoteSnapshot | null;
  conflict: FoundationNoteConflict | null;
  status: FoundationNoteStatus;
  error: string | null;
};

export type FoundationNoteDispatch = {
  key: string;
  reflection: string | null;
  expectedVersion: number;
  token: number;
};

function isVersion(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

function snapshotEquals(a: FoundationNoteSnapshot, b: FoundationNoteSnapshot) {
  return (
    a.reflection === b.reflection && a.reflectionVersion === b.reflectionVersion
  );
}

function textEquals(a: string | null, b: string | null) {
  return normalizeFoundationNoteText(a) === normalizeFoundationNoteText(b);
}

function cloneSnapshot(
  snapshot: FoundationNoteSnapshot
): FoundationNoteSnapshot {
  return { ...snapshot };
}

function cloneEntry(entry: FoundationNoteEntry): FoundationNoteEntry {
  // Entradas têm apenas strings, números, booleanos e objetos simples.
  return JSON.parse(JSON.stringify(entry));
}

export type FoundationNoteStore = ReturnType<typeof createFoundationNoteState>;

/**
 * Estado determinístico de uma coleção de notas.
 *
 * O store não faz rede nem agenda timers: ele é uma fonte de verdade pequena
 * para a fila/UI e pode ser exercitado pelo harness sem um hook falso.
 */
export function createFoundationNoteState(
  initial: Record<string, FoundationNoteSnapshot> = {}
) {
  const entries = new Map<string, FoundationNoteEntry>();
  let token = 0;

  const ensure = (key: string, snapshot?: FoundationNoteSnapshot) => {
    const existing = entries.get(key);
    if (existing) return existing;
    const confirmed = snapshot
      ? cloneSnapshot(snapshot)
      : { reflection: null, reflectionVersion: 0 };
    const entry: FoundationNoteEntry = {
      key,
      confirmed,
      versionKnown: Boolean(snapshot),
      draft: confirmed.reflection,
      inFlight: null,
      ownEcho: null,
      remoteCandidate: null,
      conflict: null,
      status: "clean",
      error: null,
    };
    entries.set(key, entry);
    return entry;
  };

  for (const [key, snapshot] of Object.entries(initial)) ensure(key, snapshot);

  const get = (key: string) => {
    const entry = entries.get(key);
    return entry ? cloneEntry(entry) : null;
  };

  const getMutable = (key: string) => ensure(key);

  const setStatusFromDraft = (entry: FoundationNoteEntry) => {
    if (entry.conflict) return;
    if (entry.inFlight) {
      entry.status = "saving";
      return;
    }
    entry.status = textEquals(entry.draft, entry.confirmed.reflection)
      ? "clean"
      : "dirty";
  };

  const hydrate = (
    key: string,
    input: {
      reflection: string | null | undefined;
      reflectionVersion?: number | null;
    },
    options: {
      source?: "session" | "remote";
      allowMissingVersionForEmptySession?: boolean;
    } = {}
  ) => {
    const entry = getMutable(key);
    if (entry.conflict && options.source === "remote") {
      // Foco/reconexão não pode trocar a revisão apresentada no diálogo.
      return { accepted: false, conflict: true, frozen: true } as const;
    }
    const missingVersion = !isVersion(input.reflectionVersion);
    if (missingVersion) {
      if (
        !entry.inFlight &&
        !textEquals(entry.draft, entry.confirmed.reflection)
      ) {
        // Uma edição local mais nova sempre vence a resposta incompleta.
      } else if (normalizeFoundationNoteText(input.reflection) !== null) {
        // A leitura é útil para manter o texto visível, mas não autoriza
        // atualização: a versão continua explicitamente desconhecida.
        entry.draft = normalizeFoundationNoteText(input.reflection);
      }
      entry.status = "error";
      entry.error = NOTE_VERSION_REQUIRED;
      return { accepted: false, error: NOTE_VERSION_REQUIRED } as const;
    }
    const snapshot: FoundationNoteSnapshot = {
      reflection: normalizeFoundationNoteText(input.reflection),
      reflectionVersion: input.reflectionVersion!,
    };

    // A própria confirmação pode voltar por uma reconsulta antes do ack local.
    // Ela não é uma revisão externa e não deve abrir conflito nem rebasear B.
    if (
      entry.inFlight &&
      snapshot.reflectionVersion >= entry.inFlight.reflectionVersion &&
      textEquals(snapshot.reflection, entry.inFlight.reflection)
    ) {
      entry.ownEcho = snapshot;
      return { accepted: true, ownEcho: true, conflict: false } as const;
    }

    // Nunca permite que uma resposta atrasada reduza a revisão confirmada.
    if (snapshot.reflectionVersion < entry.confirmed.reflectionVersion)
      return { accepted: false, stale: true } as const;

    const localDirty = !textEquals(entry.draft, entry.confirmed.reflection);
    const hasLocalActivity = Boolean(entry.inFlight) || localDirty;
    if (hasLocalActivity && !snapshotEquals(snapshot, entry.confirmed)) {
      entry.remoteCandidate = snapshot;
      if (options.source === "remote") {
        // A leitura fresca é somente candidata: não rebaseia nem reenvia o
        // rascunho local automaticamente. O CAS decide o conflito no write.
        return { accepted: true, candidate: true, conflict: false } as const;
      }
      entry.conflict = {
        remote: snapshot,
        message:
          "Esta anotação foi alterada em outro aparelho. Seu texto foi preservado.",
      };
      entry.status = "conflict";
      return { accepted: true, conflict: true } as const;
    }

    entry.confirmed = snapshot;
    entry.versionKnown = true;
    entry.remoteCandidate = null;
    if (!hasLocalActivity) entry.draft = snapshot.reflection;
    entry.error = null;
    setStatusFromDraft(entry);
    return { accepted: true, conflict: false } as const;
  };

  const edit = (key: string, draft: string | null) => {
    const entry = getMutable(key);
    entry.draft = draft;
    if (!entry.versionKnown) {
      entry.status = "error";
      entry.error = NOTE_VERSION_REQUIRED;
    } else {
      entry.error = null;
      if (!entry.conflict) setStatusFromDraft(entry);
    }
  };

  const beginSave = (
    key: string,
    reflection: string | null,
    expectedVersion = getMutable(key).confirmed.reflectionVersion
  ): FoundationNoteDispatch | null => {
    const entry = getMutable(key);
    if (entry.conflict || !entry.versionKnown) {
      entry.status = entry.conflict ? "conflict" : "error";
      entry.error = entry.conflict
        ? NOTE_VERSION_CONFLICT
        : NOTE_VERSION_REQUIRED;
      return null;
    }
    if (!isVersion(expectedVersion)) {
      entry.status = "error";
      entry.error = NOTE_VERSION_REQUIRED;
      return null;
    }
    const normalized = normalizeFoundationNoteText(reflection);
    const currentVersion = entry.confirmed.reflectionVersion;
    // A caller may provide a base only when it is the confirmed base or an
    // explicitly selected remote revision during conflict resolution.
    if (expectedVersion !== currentVersion) {
      entry.status = "error";
      entry.error = NOTE_VERSION_CONFLICT;
      return null;
    }
    const nextToken = ++token;
    const flight: FoundationNoteInFlight = {
      reflection: normalized,
      reflectionVersion: expectedVersion,
      token: nextToken,
    };
    entry.inFlight = flight;
    entry.error = null;
    entry.status = "saving";
    return {
      key,
      reflection: normalized,
      expectedVersion,
      token: nextToken,
    };
  };

  const completeSave = (key: string, saveToken: number, result: unknown) => {
    const entry = getMutable(key);
    const flight = entry.inFlight;
    if (!flight || flight.token !== saveToken)
      return { accepted: false, stale: true } as const;
    if (
      !result ||
      typeof result !== "object" ||
      (result as { success?: unknown }).success !== true ||
      !isVersion(
        (result as { reflectionVersion?: unknown }).reflectionVersion
      ) ||
      typeof (result as { unchanged?: unknown }).unchanged !== "boolean" ||
      !("reflection" in (result as object)) ||
      !(
        (result as { reflection?: unknown }).reflection === null ||
        typeof (result as { reflection?: unknown }).reflection === "string"
      )
    ) {
      entry.inFlight = null;
      entry.status = "error";
      entry.error = "INVALID_SAVE_RESULT";
      return { accepted: false, invalid: true } as const;
    }
    const response = result as FoundationNoteSaveResult;
    const normalized = normalizeFoundationNoteText(response.reflection);
    if (
      response.reflectionVersion < flight.reflectionVersion ||
      !textEquals(normalized, flight.reflection) ||
      (!response.unchanged &&
        response.reflectionVersion !== flight.reflectionVersion + 1) ||
      (response.unchanged &&
        response.reflectionVersion < flight.reflectionVersion)
    ) {
      entry.inFlight = null;
      entry.status = "error";
      entry.error = "INVALID_SAVE_RESULT";
      return { accepted: false, invalid: true } as const;
    }
    const ownEcho = entry.ownEcho;
    entry.inFlight = null;
    entry.ownEcho = null;
    entry.confirmed = {
      reflection: normalized,
      reflectionVersion: Math.max(
        response.reflectionVersion,
        ownEcho?.reflectionVersion ?? response.reflectionVersion
      ),
    };
    entry.versionKnown = true;
    entry.error = null;
    // Não apaga uma digitação feita enquanto o pedido estava em voo.
    setStatusFromDraft(entry);
    return {
      accepted: true,
      snapshot: cloneSnapshot(entry.confirmed),
    } as const;
  };

  const failSave = (key: string, saveToken: number, error = "SAVE_FAILED") => {
    const entry = getMutable(key);
    if (!entry.inFlight || entry.inFlight.token !== saveToken)
      return { accepted: false, stale: true } as const;
    entry.inFlight = null;
    entry.ownEcho = null;
    entry.error = error;
    if (!entry.conflict) entry.status = "error";
    return { accepted: true } as const;
  };

  const markConflict = (key: string, remote: FoundationNoteSnapshot | null) => {
    const entry = getMutable(key);
    entry.inFlight = null;
    entry.remoteCandidate = remote ? cloneSnapshot(remote) : null;
    entry.conflict = {
      remote: remote ? cloneSnapshot(remote) : null,
      message:
        "Esta anotação foi alterada em outro aparelho. Seu texto foi preservado.",
    };
    entry.status = "conflict";
    entry.error = NOTE_VERSION_CONFLICT;
    return get(key);
  };

  const setConflictRemote = (
    key: string,
    remote: {
      reflection: string | null | undefined;
      reflectionVersion?: number | null;
    }
  ) => {
    const entry = getMutable(key);
    if (!entry.conflict || entry.remoteCandidate) return false;
    if (!isVersion(remote.reflectionVersion)) {
      entry.error = NOTE_VERSION_REQUIRED;
      entry.status = "error";
      return false;
    }
    const snapshot = {
      reflection: normalizeFoundationNoteText(remote.reflection),
      reflectionVersion: remote.reflectionVersion,
    };
    entry.remoteCandidate = snapshot;
    entry.conflict.remote = cloneSnapshot(snapshot);
    entry.error = NOTE_VERSION_CONFLICT;
    entry.status = "conflict";
    return true;
  };

  const resolveUseRemote = (key: string) => {
    const entry = getMutable(key);
    const remote = entry.remoteCandidate ?? entry.conflict?.remote;
    if (!remote) return null;
    entry.confirmed = cloneSnapshot(remote);
    entry.versionKnown = true;
    entry.draft = remote.reflection;
    entry.remoteCandidate = null;
    entry.conflict = null;
    entry.error = null;
    setStatusFromDraft(entry);
    return cloneSnapshot(remote);
  };

  const resolveLocal = (key: string, reflection?: string) => {
    const entry = getMutable(key);
    const remote = entry.conflict?.remote;
    if (!remote) return null;
    entry.confirmed = cloneSnapshot(remote);
    entry.versionKnown = true;
    if (reflection !== undefined) entry.draft = reflection;
    entry.remoteCandidate = null;
    entry.conflict = null;
    entry.error = null;
    setStatusFromDraft(entry);
    return {
      reflection: normalizeFoundationNoteText(entry.draft),
      expectedVersion: remote.reflectionVersion,
    };
  };
  const resolveKeepMine = (key: string) => resolveLocal(key);
  const resolveCombined = (key: string, reflection: string) =>
    resolveLocal(key, reflection);

  const hasUnsaved = (key: string) => {
    const entry = entries.get(key);
    return Boolean(
      entry &&
        (!entry.versionKnown ||
          entry.inFlight ||
          entry.conflict ||
          !textEquals(entry.draft, entry.confirmed.reflection))
    );
  };

  return {
    get,
    hydrate,
    edit,
    beginSave,
    completeSave,
    failSave,
    markConflict,
    setConflictRemote,
    resolveUseRemote,
    resolveKeepMine,
    resolveCombined,
    hasUnsaved,
    getVersion: (key: string) => getMutable(key).confirmed.reflectionVersion,
    isVersionKnown: (key: string) => getMutable(key).versionKnown,
    getDraft: (key: string) => getMutable(key).draft,
  };
}
