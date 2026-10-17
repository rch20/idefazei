import { describe, expect, it } from "vitest";
import {
  createFoundationNoteState,
  NOTE_VERSION_REQUIRED,
} from "./foundationNoteState";
const key = "100:22:77:84";
const base = { reflection: "Base A", reflectionVersion: 0 };
function initial() {
  return createFoundationNoteState({ [key]: base });
}
const result = (
  reflection = "Texto A",
  reflectionVersion = 1,
  unchanged = false
) => ({ success: true, reflection, reflectionVersion, unchanged });

describe("estado versionado da anotação", () => {
  it("não grava versão zero inferida nem limpa o bloqueio ao digitar", () => {
    const store = createFoundationNoteState();
    store.hydrate(key, { reflection: "Legado", reflectionVersion: undefined });
    store.edit(key, "Meu rascunho");
    expect(store.beginSave(key, "Meu rascunho")).toBeNull();
    expect(store.get(key)).toMatchObject({
      versionKnown: false,
      draft: "Meu rascunho",
      error: NOTE_VERSION_REQUIRED,
    });
  });
  it("aceita versão zero explicitamente recebida do servidor", () => {
    const store = createFoundationNoteState();
    store.hydrate(key, base);
    store.edit(key, "Texto A");
    expect(store.beginSave(key, "Texto A")).toMatchObject({
      expectedVersion: 0,
    });
  });
  it("uma leitura da mesma base não apaga o rascunho", () => {
    const store = initial();
    store.edit(key, "Novo B");
    store.hydrate(key, base, { source: "remote" });
    expect(store.getDraft(key)).toBe("Novo B");
    expect(store.getVersion(key)).toBe(0);
  });
  it("digitação B durante A fica pendente e só usa revisão1 após ACK", () => {
    const store = initial();
    store.edit(key, "Texto A");
    const a = store.beginSave(key, "Texto A")!;
    store.edit(key, "Texto B");
    expect(store.getVersion(key)).toBe(0);
    expect(store.completeSave(key, a.token, result())).toMatchObject({
      accepted: true,
    });
    expect(store.getDraft(key)).toBe("Texto B");
    expect(store.hasUnsaved(key)).toBe(true);
    expect(store.beginSave(key, "Texto B")).toMatchObject({
      expectedVersion: 1,
    });
  });
  it("eco do próprio salvamento antes do ACK não abre conflito", () => {
    const store = initial();
    store.edit(key, "Texto A");
    const a = store.beginSave(key, "Texto A")!;
    store.edit(key, "Texto B");
    store.hydrate(
      key,
      {
        reflection: "Texto A",
        reflectionVersion: 1,
      },
      { source: "remote" }
    );
    expect(store.get(key)?.conflict).toBeNull();
    expect(store.getVersion(key)).toBe(0);
    store.completeSave(key, a.token, result());
    expect(store.getDraft(key)).toBe("Texto B");
    expect(store.getVersion(key)).toBe(1);
  });
  it.each([
    {},
    { success: true },
    { success: true, reflection: "Texto A", reflectionVersion: 1 },
    result("Outra nota"),
    result("Texto A", 0),
    result("Texto A", -1),
    result("Texto A", 1.5),
    { ...result(), reflection: 123 },
    { ...result(), unchanged: "true" },
    result("Texto A", Number.MAX_SAFE_INTEGER + 1),
  ])("não aceita resposta parcial ou inconsistente %#", invalid => {
    const store = initial();
    store.edit(key, "Texto A");
    const save = store.beginSave(key, "Texto A")!;
    expect(store.completeSave(key, save.token, invalid)).toMatchObject({
      accepted: false,
      invalid: true,
    });
    expect(store.getVersion(key)).toBe(0);
    expect(store.getDraft(key)).toBe("Texto A");
    expect(store.hasUnsaved(key)).toBe(true);
  });
  it("no-op de confirmação perdida pode retornar revisão atual com mesmo texto", () => {
    const store = initial();
    store.edit(key, "Texto A");
    const save = store.beginSave(key, "Texto A")!;
    expect(
      store.completeSave(key, save.token, result("Texto A", 2, true))
    ).toMatchObject({ accepted: true });
    expect(store.getVersion(key)).toBe(2);
    expect(store.hasUnsaved(key)).toBe(false);
  });
  it("erro preserva rascunho e revisão antiga para retry explícito", () => {
    const store = initial();
    store.edit(key, "Texto A");
    const save = store.beginSave(key, "Texto A")!;
    store.failSave(key, save.token);
    expect(store.getVersion(key)).toBe(0);
    expect(store.getDraft(key)).toBe("Texto A");
    expect(store.beginSave(key, "Texto A")).toMatchObject({
      expectedVersion: 0,
    });
  });
  it("reconsulta nova vira candidata, nunca rebases/reenvio silencioso", () => {
    const store = initial();
    store.edit(key, "Local B");
    store.hydrate(
      key,
      {
        reflection: "Remoto C",
        reflectionVersion: 5,
      },
      { source: "remote" }
    );
    expect(store.getDraft(key)).toBe("Local B");
    expect(store.getVersion(key)).toBe(0);
    expect(store.beginSave(key, "Local B")).toMatchObject({
      expectedVersion: 0,
    });
  });
  it("conflito congela o texto/revisão apresentados mesmo após novo foco", () => {
    const store = initial();
    store.edit(key, "Local B");
    store.markConflict(key, { reflection: "Remoto C", reflectionVersion: 1 });
    store.hydrate(
      key,
      {
        reflection: "Terceiro D",
        reflectionVersion: 2,
      },
      { source: "remote" }
    );
    expect(store.get(key)?.conflict?.remote).toEqual({
      reflection: "Remoto C",
      reflectionVersion: 1,
    });
    expect(store.beginSave(key, "Local B")).toBeNull();
    expect(store.hasUnsaved(key)).toBe(true);
  });
  it.each(["mine", "combined", "remote"])(
    "decisão %s é explícita e usa o snapshot apresentado",
    kind => {
      const store = initial();
      store.edit(key, "Local B");
      store.markConflict(key, { reflection: "Remoto C", reflectionVersion: 3 });
      if (kind === "remote") {
        expect(store.resolveUseRemote(key)).toEqual({
          reflection: "Remoto C",
          reflectionVersion: 3,
        });
        expect(store.getDraft(key)).toBe("Remoto C");
        expect(store.hasUnsaved(key)).toBe(false);
      } else {
        const value =
          kind === "mine"
            ? store.resolveKeepMine(key)
            : store.resolveCombined(key, "Texto combinado deliberadamente");
        expect(value).toMatchObject({ expectedVersion: 3 });
        expect(store.getVersion(key)).toBe(3);
        expect(store.get(key)?.conflict).toBeNull();
        expect(store.hasUnsaved(key)).toBe(true);
      }
    }
  );
  it("uma resposta antiga não conclui a nova tentativa", () => {
    const store = initial();
    store.edit(key, "Texto A");
    const old = store.beginSave(key, "Texto A")!;
    store.failSave(key, old.token);
    const next = store.beginSave(key, "Texto A")!;
    expect(store.completeSave(key, old.token, result())).toMatchObject({
      accepted: false,
      stale: true,
    });
    expect(store.get(key)?.inFlight?.token).toBe(next.token);
    expect(store.getVersion(key)).toBe(0);
  });
  it("uma leitura antiga não reduz revisão confirmada", () => {
    const store = initial();
    store.edit(key, "Texto A");
    const save = store.beginSave(key, "Texto A")!;
    store.completeSave(key, save.token, result());
    store.hydrate(key, base);
    expect(store.getVersion(key)).toBe(1);
    expect(store.getDraft(key)).toBe("Texto A");
  });
  it("notas de outra igreja/matrícula/etapa têm estados independentes", () => {
    const store = initial();
    store.edit(key, "Texto A");
    store.markConflict(key, null);
    const other = "200:23:77:85";
    store.hydrate(other, base);
    store.edit(other, "Outra nota");
    expect(store.beginSave(other, "Outra nota")).toMatchObject({
      expectedVersion: 0,
    });
    expect(store.get(key)?.status).toBe("conflict");
  });
});
