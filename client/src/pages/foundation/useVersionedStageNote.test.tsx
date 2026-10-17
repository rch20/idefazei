// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  NOTE_SAVE_TIMEOUT_MS,
  preloadFoundationNoteState,
  useVersionedStageNote,
} from "./useVersionedStageNote";
const scope = {
  churchId: 100,
  courseId: 11,
  enrollmentId: 22,
  studyId: 77,
  blockId: 84,
};
const snapshot = { reflection: "Base", reflectionVersion: 0 };
const ok = (reflection: string, reflectionVersion = 1, unchanged = false) => ({
  success: true,
  reflection,
  reflectionVersion,
  unchanged,
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((a, b) => {
    resolve = a;
    reject = b;
  });
  return { promise, resolve, reject };
}
const tick = () => act(() => vi.advanceTimersByTimeAsync(700));
beforeAll(async () => {
  await preloadFoundationNoteState();
});
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});
function setup(overrides: Record<string, any> = {}) {
  const options = {
    scope,
    snapshot,
    persist: vi.fn(async (input: any) =>
      ok(input.reflection, input.expectedVersion + 1)
    ),
    read: vi.fn(async () => ({ reflection: "Remoto A", reflectionVersion: 1 })),
    onSaved: vi.fn(),
    onError: vi.fn(),
    ...overrides,
  };
  const hook = renderHook(props => useVersionedStageNote(props), {
    initialProps: options,
  });
  return { ...hook, options };
}
describe("hook versionado usado pelo aluno", () => {
  it("consolida digitação pelo debounce e só confirma depois do retorno", async () => {
    const response = deferred<unknown>();
    const view = setup({ persist: vi.fn(() => response.promise) });
    act(() => view.result.current.edit("Texto A"));
    await act(() => vi.advanceTimersByTimeAsync(699));
    expect(view.options.persist).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(1));
    expect(view.result.current.isSaving).toBe(true);
    expect(view.result.current.hasUnsaved).toBe(true);
    await act(async () => response.resolve(ok("Texto A")));
    expect(view.result.current.hasUnsaved).toBe(false);
    expect(view.options.onSaved).toHaveBeenCalledOnce();
  });
  it("não permite que reconsulta da mesma base apague a digitação", () => {
    const view = setup();
    act(() => view.result.current.edit("Texto A"));
    view.rerender({ ...view.options, snapshot: { ...snapshot } });
    expect(view.result.current.value).toBe("Texto A");
    expect(view.result.current.hasUnsaved).toBe(true);
  });
  it("envia B com revisão de A somente após a confirmação de A", async () => {
    const first = deferred<unknown>();
    const persist = vi
      .fn()
      .mockImplementationOnce(() => first.promise)
      .mockImplementation(async input =>
        ok(input.reflection, input.expectedVersion + 1)
      );
    const view = setup({ persist });
    act(() => view.result.current.edit("A"));
    await tick();
    act(() => view.result.current.edit("B"));
    await tick();
    expect(persist).toHaveBeenCalledOnce();
    await act(async () => first.resolve(ok("A")));
    expect(persist).toHaveBeenCalledTimes(2);
    expect(persist.mock.calls[1][0]).toMatchObject({
      reflection: "B",
      expectedVersion: 1,
    });
    expect(view.result.current.value).toBe("B");
  });
  it("leitura confirmada libera B mesmo quando o ACK de A nunca chega", async () => {
    const first = deferred<unknown>();
    const persist = vi
      .fn()
      .mockImplementationOnce(() => first.promise)
      .mockImplementation(async input =>
        ok(input.reflection, input.expectedVersion + 1)
      );
    const view = setup({ persist });
    act(() => view.result.current.edit("A"));
    await tick();
    act(() => view.result.current.edit("B"));
    await tick();
    expect(persist).toHaveBeenCalledOnce();
    await act(async () =>
      view.rerender({
        ...view.options,
        snapshot: { reflection: "A", reflectionVersion: 1 },
      })
    );
    expect(persist).toHaveBeenCalledTimes(2);
    expect(persist.mock.calls[1][0]).toMatchObject({
      reflection: "B",
      expectedVersion: 1,
    });
    expect(view.result.current.value).toBe("B");
    expect(view.result.current.hasUnsaved).toBe(false);
    await act(async () => first.resolve(ok("A")));
    expect(view.result.current.value).toBe("B");
    expect(view.options.onSaved).toHaveBeenCalledTimes(2);
  });
  it("timeout não confirma nem reenvia e mantém o texto até decisão explícita", async () => {
    const response = deferred<unknown>();
    const view = setup({ persist: vi.fn(() => response.promise) });
    act(() => view.result.current.edit("A"));
    await tick();
    await act(() => vi.advanceTimersByTimeAsync(NOTE_SAVE_TIMEOUT_MS));
    expect(view.result.current.isSaving).toBe(false);
    expect(view.result.current.hasError).toBe(true);
    expect(view.result.current.value).toBe("A");
    expect(view.result.current.hasUnsaved).toBe(true);
    expect(view.options.persist).toHaveBeenCalledOnce();
    expect(view.options.onSaved).not.toHaveBeenCalled();
    await act(async () => response.resolve(ok("A")));
    expect(view.result.current.hasError).toBe(true);
    expect(view.options.onSaved).not.toHaveBeenCalled();
  });
  it("flush aguarda ACK sem duplicar a mesma tentativa", async () => {
    const response = deferred<unknown>();
    const view = setup({ persist: vi.fn(() => response.promise) });
    act(() => view.result.current.edit("A"));
    await tick();
    let flushed!: Promise<boolean>;
    act(() => {
      flushed = view.result.current.flush();
    });
    await act(async () => response.resolve(ok("A")));
    expect(await flushed).toBe(true);
    expect(view.options.persist).toHaveBeenCalledOnce();
  });
  it("falha não dispara retry cego e flush explícito mantém a mesma base", async () => {
    const persist = vi
      .fn()
      .mockRejectedValueOnce(Error("Falha de transporte"))
      .mockImplementation(async input =>
        ok(input.reflection, input.expectedVersion + 1)
      );
    const view = setup({ persist });
    act(() => view.result.current.edit("A"));
    await tick();
    await act(() => vi.advanceTimersByTimeAsync(20000));
    expect(persist).toHaveBeenCalledOnce();
    expect(view.result.current.hasError).toBe(true);
    expect(view.result.current.value).toBe("A");
    await act(async () => {
      expect(await view.result.current.flush()).toBe(true);
    });
    expect(persist.mock.calls.map(c => c[0].expectedVersion)).toEqual([0, 0]);
  });
  it("resposta incompleta nunca mostra nota confirmada", async () => {
    const view = setup({ persist: vi.fn(async () => ({ success: true })) });
    act(() => view.result.current.edit("A"));
    await tick();
    expect(view.result.current.hasError).toBe(true);
    expect(view.result.current.hasUnsaved).toBe(true);
    expect(view.options.onSaved).not.toHaveBeenCalled();
    expect(view.result.current.value).toBe("A");
  });
  it("conflito preserva B e só mantém meu texto contra a revisão apresentada", async () => {
    const conflict = Object.assign(Error("NOTE_VERSION_CONFLICT"), {
      data: { code: "CONFLICT" },
    });
    const persist = vi
      .fn()
      .mockRejectedValueOnce(conflict)
      .mockImplementation(async input =>
        ok(input.reflection, input.expectedVersion + 1)
      );
    const view = setup({ persist });
    act(() => view.result.current.edit("Local B"));
    await tick();
    expect(view.result.current.conflict?.remote).toEqual({
      reflection: "Remoto A",
      reflectionVersion: 1,
    });
    expect(view.result.current.value).toBe("Local B");
    view.rerender({
      ...view.options,
      snapshot: { reflection: "Terceiro C", reflectionVersion: 2 },
    });
    expect(view.result.current.conflict?.remote?.reflectionVersion).toBe(1);
    await act(async () => view.result.current.keepMine());
    expect(persist.mock.calls[1][0]).toMatchObject({
      reflection: "Local B",
      expectedVersion: 1,
    });
  });
  it("usar remoto não faz nova gravação e mantém apenas o texto escolhido", async () => {
    const view = setup({
      persist: vi.fn(async () => {
        throw Error("NOTE_VERSION_CONFLICT");
      }),
    });
    act(() => view.result.current.edit("Local B"));
    await tick();
    act(() => view.result.current.useRemote());
    expect(view.options.persist).toHaveBeenCalledOnce();
    expect(view.result.current.value).toBe("Remoto A");
    expect(view.result.current.hasUnsaved).toBe(false);
  });
  it("sem revisão válida nenhum salvamento é permitido, inclusive após digitar", async () => {
    const view = setup({
      snapshot: { reflection: "Legado", reflectionVersion: undefined },
    });
    act(() => view.result.current.edit("Texto seguro"));
    await tick();
    await act(async () => {
      expect(await view.result.current.flush()).toBe(false);
    });
    expect(view.options.persist).not.toHaveBeenCalled();
    expect(view.result.current.value).toBe("Texto seguro");
  });
  it("nota B tem fila independente mesmo com A sem resposta", async () => {
    const never = deferred<unknown>();
    const persist = vi
      .fn()
      .mockImplementationOnce(() => never.promise)
      .mockImplementation(async input =>
        ok(input.reflection, input.expectedVersion + 1)
      );
    const view = setup({ persist });
    act(() => view.result.current.edit("Nota A"));
    await tick();
    view.rerender({ ...view.options, scope: { ...scope, blockId: 85 } });
    act(() => view.result.current.edit("Nota B"));
    await tick();
    expect(persist).toHaveBeenCalledTimes(2);
    expect(persist.mock.calls[1][0]).toMatchObject({
      blockId: 85,
      reflection: "Nota B",
      expectedVersion: 0,
    });
    expect(view.result.current.hasUnsaved).toBe(false);
    await act(async () => never.resolve(ok("Nota A")));
  });
});
