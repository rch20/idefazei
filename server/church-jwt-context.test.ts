import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  getActiveChurchUserById: vi.fn(),
  getActiveSuperAdminById: vi.fn(),
  getChurchBySlug: vi.fn(),
}));

vi.mock("./auth", () => ({
  verifyToken: vi.fn(),
}));

vi.mock("./_core/sdk", () => ({
  sdk: {
    authenticateRequest: vi.fn(),
  },
}));

import { verifyToken } from "./auth";
import { getActiveChurchUserById, getActiveSuperAdminById, getChurchBySlug } from "./db";
import { sdk } from "./_core/sdk";
import { createContext } from "./_core/context";

const activeChurchUser = {
  id: 7,
  churchId: 23,
  name: "Pastor Samuel",
  email: "pastor@igreja.com",
  role: "pastor_presidente",
  active: true,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  lastLoginAt: new Date("2026-01-02"),
};

function makeRequest(headers: Record<string, string> = {}) {
  return {
    req: { headers } as never,
    res: {} as never,
  };
}

describe("contexto de autenticação da igreja", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getChurchBySlug as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (sdk.authenticateRequest as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Sem sessão Manus"));
  });

  it("aceita o JWT da igreja e expõe o churchId da sessão", async () => {
    (verifyToken as ReturnType<typeof vi.fn>).mockResolvedValue({
      sub: "7",
      churchId: 23,
      role: "pastor_presidente",
      type: "church",
    });
    (getActiveChurchUserById as ReturnType<typeof vi.fn>).mockResolvedValue(activeChurchUser);

    const context = await createContext(makeRequest({ authorization: "Bearer jwt-valido" }));

    expect(context.user).toMatchObject({
      id: -7,
      churchId: 23,
      email: "pastor@igreja.com",
      role: "pastor_presidente",
      authSource: "church",
    });
    expect(context.tenantChurchId).toBe(23);
  });

  it("rejeita token cujo churchId não coincide com o usuário ativo", async () => {
    (verifyToken as ReturnType<typeof vi.fn>).mockResolvedValue({
      sub: "7",
      churchId: 99,
      role: "pastor_presidente",
      type: "church",
    });
    (getActiveChurchUserById as ReturnType<typeof vi.fn>).mockResolvedValue(activeChurchUser);

    const context = await createContext(makeRequest({ authorization: "Bearer jwt-invalido" }));

    expect(context.user).toBeNull();
    expect(context.tenantChurchId).toBeNull();
  });

  it("não permite que subdomínio diferente substitua o tenant do JWT", async () => {
    (verifyToken as ReturnType<typeof vi.fn>).mockResolvedValue({
      sub: "7",
      churchId: 23,
      role: "pastor_presidente",
      type: "church",
    });
    (getActiveChurchUserById as ReturnType<typeof vi.fn>).mockResolvedValue(activeChurchUser);
    (getChurchBySlug as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 99, slug: "outra-igreja" });

    const context = await createContext(
      makeRequest({ authorization: "Bearer jwt-valido", host: "outra-igreja.ide28.com.br" })
    );

    expect(context.user?.churchId).toBe(23);
    expect(context.tenantChurchId).toBe(23);
  });

  it("aceita somente um Super Admin ativo para rotas administrativas", async () => {
    (verifyToken as ReturnType<typeof vi.fn>).mockResolvedValue({
      sub: "3",
      type: "admin",
    });
    (getActiveSuperAdminById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 3,
      name: "Administração Lampas",
      email: "admin@lampas.com.br",
      active: true,
      createdAt: new Date("2026-01-01"),
    });

    const context = await createContext(makeRequest({ authorization: "Bearer admin-jwt-valido" }));

    expect(context.user).toMatchObject({
      id: -3,
      role: "admin",
      authSource: "admin",
    });
    expect(context.tenantChurchId).toBeNull();
  });
});
