// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearFoundationCreationLocalDatabase,
  FOUNDATION_CREATION_DATABASE_NAME,
} from "./foundationCreationStorage";
afterEach(() => vi.unstubAllGlobals());
describe("limpeza da outbox local independente do editor", () => {
  it("encerra normalmente sem IndexedDB disponível", async () => {
    vi.stubGlobal("indexedDB", undefined);
    await expect(
      clearFoundationCreationLocalDatabase()
    ).resolves.toBeUndefined();
  });
  it("remove apenas o banco técnico de criação e aguarda confirmação", async () => {
    const request: Record<string, any> = {};
    const remove = vi.fn(() => {
      queueMicrotask(() => request.onsuccess());
      return request;
    });
    vi.stubGlobal("indexedDB", { deleteDatabase: remove });
    await clearFoundationCreationLocalDatabase();
    expect(remove).toHaveBeenCalledWith(FOUNDATION_CREATION_DATABASE_NAME);
  });
  it.each(["onerror", "onblocked"])(
    "retorna erro seguro em %s",
    async event => {
      const request: Record<string, any> = {};
      vi.stubGlobal("indexedDB", {
        deleteDatabase: () => {
          queueMicrotask(() => request[event]());
          return request;
        },
      });
      await expect(clearFoundationCreationLocalDatabase()).rejects.toThrow(
        /armazenamento local de criação/
      );
    }
  );
});
