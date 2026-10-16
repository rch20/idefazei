// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  beginFoundationCreation,
  clearFoundationCreationScope,
  confirmAndClearFoundationCreation,
  createMemoryFoundationCreationStorage,
  findFoundationCreation,
  foundationCreationErrorMessage,
  foundationCreationRequest,
  isFoundationCreationConflict,
  setFoundationCreationStorageAdapter,
  updateFoundationCreation,
} from "./foundationCreationOutbox";
vi.mock("@/hooks/useChurchAuth", () => ({
  useChurchAuth: () => ({ user: null }),
}));
const scope = {
  origin: "https://qa.example.test",
  churchId: 100,
  accountId: 42,
};
const snapshot = {
  churchId: 100,
  courseId: 55,
  moduleId: null,
  weekStart: "2026-10-19",
  title: "Conteúdo sintético",
  template: "biblico" as const,
};
beforeEach(() =>
  setFoundationCreationStorageAdapter(createMemoryFoundationCreationStorage())
);
afterEach(() => {
  setFoundationCreationStorageAdapter(null);
  vi.useRealTimers();
});

describe("outbox de criação — adaptador atômico em memória", () => {
  it("mantém UUID e snapshot no reenvio com conteúdo alterado localmente", async () => {
    const first = await beginFoundationCreation(
      scope,
      "study",
      "new",
      snapshot
    );
    const retry = await beginFoundationCreation(scope, "study", "new", {
      ...snapshot,
      title: "Edição local não enviada",
    });
    expect(retry.clientRequestId).toBe(first.clientRequestId);
    expect(retry.snapshot).toEqual(snapshot);
    expect(foundationCreationRequest(retry)).toMatchObject({
      clientRequestId: first.clientRequestId,
      requestSchemaVersion: 1,
      title: snapshot.title,
    });
  });
  it("claim concorrente preserva uma única chave mesmo em duas abas lógicas", async () => {
    const [a, b] = await Promise.all([
      beginFoundationCreation(scope, "study", "new", snapshot),
      beginFoundationCreation(scope, "study", "new", snapshot),
    ]);
    expect(a.clientRequestId).toBe(b.clientRequestId);
  });
  it("origem, igreja e conta não compartilham registro", async () => {
    const a = await beginFoundationCreation(scope, "study", "new", snapshot);
    const b = await beginFoundationCreation(
      { ...scope, accountId: 43 },
      "study",
      "new",
      snapshot
    );
    const c = await beginFoundationCreation(
      { ...scope, churchId: 200 },
      "study",
      "new",
      { ...snapshot, churchId: 200 }
    );
    const d = await beginFoundationCreation(
      { ...scope, origin: "https://other.example.test" },
      "study",
      "new",
      snapshot
    );
    expect(new Set([a, b, c, d].map(r => r.clientRequestId)).size).toBe(4);
  });
  it("operações e blocos diferentes mantêm identidades próprias", async () => {
    const a = await beginFoundationCreation(scope, "study", "new", snapshot);
    const b = await beginFoundationCreation(scope, "question", "block-12", {
      churchId: 100,
      studyId: 77,
      blockId: 12,
      prompt: "Qual atitude?",
      options: [],
      correctOptionId: "a",
      explanation: "QA",
    });
    expect(a.clientRequestId).not.toBe(b.clientRequestId);
  });
  it("resultado desconhecido não expira para uma nova UUID silenciosamente", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-16T00:00:00Z"));
    const first = await beginFoundationCreation(
      scope,
      "study",
      "new",
      snapshot
    );
    await updateFoundationCreation(first, "unknown");
    vi.setSystemTime(new Date("2026-10-20T00:00:00Z"));
    expect(
      (await findFoundationCreation(scope, "study", "new"))?.clientRequestId
    ).toBe(first.clientRequestId);
    expect(
      (await beginFoundationCreation(scope, "study", "new", snapshot))
        .clientRequestId
    ).toBe(first.clientRequestId);
  });
  it("somente confirmação permite começar uma nova criação lógica", async () => {
    const first = await beginFoundationCreation(
      scope,
      "study",
      "new",
      snapshot
    );
    await confirmAndClearFoundationCreation(first, 301);
    expect(await findFoundationCreation(scope, "study", "new")).toBeNull();
    expect(
      (await beginFoundationCreation(scope, "study", "new", snapshot))
        .clientRequestId
    ).not.toBe(first.clientRequestId);
  });
  it("resposta antiga não regrava nem apaga a tentativa seguinte", async () => {
    const old = await beginFoundationCreation(scope, "study", "new", snapshot);
    await confirmAndClearFoundationCreation(old, 301);
    const next = await beginFoundationCreation(scope, "study", "new", {
      ...snapshot,
      title: "Próximo estudo",
    });
    await updateFoundationCreation(old, "unknown");
    await confirmAndClearFoundationCreation(old, 301);
    expect(
      (await findFoundationCreation(scope, "study", "new"))?.clientRequestId
    ).toBe(next.clientRequestId);
  });
  it("limpeza de escopo não apaga rascunho de outra conta", async () => {
    await beginFoundationCreation(scope, "study", "new", snapshot);
    const other = { ...scope, accountId: 43 };
    await beginFoundationCreation(other, "study", "new", snapshot);
    await clearFoundationCreationScope(scope);
    expect(await findFoundationCreation(scope, "study", "new")).toBeNull();
    expect(await findFoundationCreation(other, "study", "new")).not.toBeNull();
  });
  it("falha de storage não retorna pedido pronto para enviar", async () => {
    const adapter = createMemoryFoundationCreationStorage();
    adapter.claim = async () => {
      throw new Error("quota outbox");
    };
    setFoundationCreationStorageAdapter(adapter);
    await expect(
      beginFoundationCreation(scope, "study", "new", snapshot)
    ).rejects.toThrow("quota");
  });
  it("reconhece conflito tRPC sem depender da serialização da causa", () => {
    expect(
      isFoundationCreationConflict({
        data: { code: "CONFLICT" },
        message: "Esta tentativa já foi usada com outro conteúdo.",
      })
    ).toBe(true);
    expect(
      isFoundationCreationConflict({
        data: { code: "CONFLICT" },
        message: "Outro conflito",
      })
    ).toBe(false);
  });
  it("não exibe erros brutos de banco ou de infraestrutura", () => {
    expect(
      foundationCreationErrorMessage(
        new Error("SQL params SENSITIVE_SYNTHETIC_MARKER")
      )
    ).not.toContain("SENSITIVE_SYNTHETIC_MARKER");
    expect(
      foundationCreationErrorMessage(new Error("IndexedDB quota"))
    ).toContain("armazenamento");
    expect(
      foundationCreationErrorMessage({ data: { code: "FORBIDDEN" } })
    ).toContain("permissão");
  });
});
