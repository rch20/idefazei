import { describe, expect, it, vi } from "vitest";
import { createStageNoteQueue, type StageNotePayload } from "./stageNoteQueue";
const note: StageNotePayload = {
  churchId: 1,
  courseId: 2,
  studyId: 3,
  blockId: 4,
  reflection: "Leia",
};
describe("anotações individuais por etapa", () => {
  it("aguarda o salvamento anterior antes de enviar o texto mais recente", async () => {
    const queue = createStageNoteQueue();
    let release!: () => void;
    const first = new Promise<void>(resolve => {
      release = resolve;
    });
    const persist = vi
      .fn()
      .mockImplementationOnce(() => first)
      .mockResolvedValue(undefined);
    const a = queue.save(note, persist);
    const b = queue.save({ ...note, reflection: "Leia revisada" }, persist);
    await Promise.resolve();
    expect(persist).toHaveBeenCalledTimes(1);
    release();
    await Promise.all([a, b]);
    expect(persist.mock.calls.map(call => call[0].reflection)).toEqual([
      "Leia",
      "Leia revisada",
    ]);
  });
  it("captura a etapa e o texto sem reutilizar o objeto alterado", async () => {
    const queue = createStageNoteQueue();
    const payload = { ...note };
    const persist = vi.fn().mockResolvedValue(undefined);
    const saved = queue.save(payload, persist);
    payload.blockId = 5;
    payload.reflection = "Entenda";
    await saved;
    expect(persist).toHaveBeenCalledWith(note);
  });
  it("propaga falha e permite nova tentativa sem perder a fila", async () => {
    const queue = createStageNoteQueue();
    const persist = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue(undefined);
    await expect(queue.save(note, persist)).rejects.toThrow("offline");
    await expect(queue.save(note, persist)).resolves.toBeUndefined();
    expect(persist).toHaveBeenCalledTimes(2);
  });
  it("mantém o contrato legado separado de cada etapa e de cada igreja", async () => {
    const queue = createStageNoteQueue();
    const persist = vi.fn().mockResolvedValue(undefined);
    await queue.save(
      { ...note, blockId: null, reflection: "Geral antiga" },
      persist
    );
    await queue.save(
      { ...note, churchId: 9, blockId: 5, reflection: "Entenda" },
      persist
    );
    expect(persist.mock.calls[0][0].blockId).toBeNull();
    expect(persist.mock.calls[1][0]).toMatchObject({
      churchId: 9,
      blockId: 5,
      reflection: "Entenda",
    });
  });
});
