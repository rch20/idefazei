/** @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadModuleWithRetry } from "./lazyWithRetry";

describe("loadModuleWithRetry", () => {
  beforeEach(() => {
    sessionStorage.clear();
    Object.defineProperty(window, "__ideFazeiRecover", {
      configurable: true,
      value: vi.fn().mockResolvedValue(undefined),
    });
  });

  it("retorna o módulo e limpa a marca de retry após carregar", async () => {
    sessionStorage.setItem("ide_fazei_lazy_retry:leadership-professor", "1");
    const module = { default: () => null };

    await expect(
      loadModuleWithRetry("leadership-professor", async () => module)
    ).resolves.toBe(module);

    expect(
      sessionStorage.getItem("ide_fazei_lazy_retry:leadership-professor")
    ).toBeNull();
  });

  it("aciona uma única recuperação para falha de importação dinâmica", async () => {
    const recover = vi.mocked(window.__ideFazeiRecover!);
    const error = new Error(
      "Failed to fetch dynamically imported module: https://example.invalid/chunk.js"
    );

    await expect(
      loadModuleWithRetry("leadership-professor", async () => {
        throw error;
      })
    ).rejects.toBe(error);

    expect(recover).toHaveBeenCalledTimes(1);
    expect(
      sessionStorage.getItem("ide_fazei_lazy_retry:leadership-professor")
    ).toBe("1");
  });

  it("não repete a recuperação quando o módulo falha novamente na mesma sessão", async () => {
    const recover = vi.mocked(window.__ideFazeiRecover!);
    sessionStorage.setItem("ide_fazei_lazy_retry:leadership-professor", "1");

    await expect(
      loadModuleWithRetry("leadership-professor", async () => {
        throw new Error("Failed to fetch dynamically imported module");
      })
    ).rejects.toThrow("Failed to fetch dynamically imported module");

    expect(recover).not.toHaveBeenCalled();
  });

  it("propaga erros de runtime sem recarregar a aplicação", async () => {
    const recover = vi.mocked(window.__ideFazeiRecover!);

    await expect(
      loadModuleWithRetry("leadership-professor", async () => {
        throw new Error("Cannot read properties of undefined");
      })
    ).rejects.toThrow("Cannot read properties of undefined");

    expect(recover).not.toHaveBeenCalled();
    expect(
      sessionStorage.getItem("ide_fazei_lazy_retry:leadership-professor")
    ).toBeNull();
  });

  it("deixa a recuperação manual assumir quando sessionStorage está indisponível", async () => {
    const recover = vi.mocked(window.__ideFazeiRecover!);
    const descriptor = Object.getOwnPropertyDescriptor(
      window,
      "sessionStorage"
    );

    Object.defineProperty(window, "sessionStorage", {
      configurable: true,
      get() {
        throw new Error("Storage is disabled");
      },
    });

    try {
      await expect(
        loadModuleWithRetry("leadership-professor", async () => {
          throw new Error("Failed to fetch dynamically imported module");
        })
      ).rejects.toThrow("Failed to fetch dynamically imported module");

      expect(recover).not.toHaveBeenCalled();
    } finally {
      Object.defineProperty(window, "sessionStorage", descriptor);
    }
  });
});
