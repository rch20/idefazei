import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const authMocks = vi.hoisted(() => ({
  isInitialSuperAdminSetupAvailable: vi.fn(),
  createInitialSuperAdmin: vi.fn(),
  loginSuperAdmin: vi.fn(),
}));

vi.mock("./auth", () => ({
  loginChurchUser: vi.fn(),
  loginSuperAdmin: authMocks.loginSuperAdmin,
  createChurchUser: vi.fn(),
  createSuperAdmin: vi.fn(),
  createInitialSuperAdmin: authMocks.createInitialSuperAdmin,
  isInitialSuperAdminSetupAvailable: authMocks.isInitialSuperAdminSetupAvailable,
}));

import { appRouter } from "./routers";

const anonymousContext = {
  user: null,
  req: { protocol: "https", headers: {} },
  res: {},
} as unknown as TrpcContext;

describe("adminAuth.bootstrap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("informa o cadastro inicial apenas quando o bootstrap ainda está disponível", async () => {
    authMocks.isInitialSuperAdminSetupAvailable.mockResolvedValue(true);
    const caller = appRouter.createCaller(anonymousContext);

    await expect(caller.adminAuth.bootstrapStatus()).resolves.toEqual({ available: true });
  });

  it("rejeita código de configuração inválido sem criar uma conta administrativa", async () => {
    authMocks.createInitialSuperAdmin.mockResolvedValue({ ok: false, reason: "invalid_setup_token" });
    const caller = appRouter.createCaller(anonymousContext);

    await expect(caller.adminAuth.bootstrap({
      name: "Administrador Principal",
      email: "admin@idefazei.com.br",
      password: "senha-principal-segura",
      setupToken: "codigo-configuracao-invalido",
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(authMocks.loginSuperAdmin).not.toHaveBeenCalled();
  });

  it("cria o primeiro administrador e inicia a sessão uma única vez", async () => {
    authMocks.createInitialSuperAdmin.mockResolvedValue({ ok: true });
    authMocks.loginSuperAdmin.mockResolvedValue({
      token: "admin-jwt",
      admin: { id: 1, name: "Administrador Principal", email: "admin@idefazei.com.br" },
    });
    const caller = appRouter.createCaller(anonymousContext);

    await expect(caller.adminAuth.bootstrap({
      name: "Administrador Principal",
      email: "admin@idefazei.com.br",
      password: "senha-principal-segura",
      setupToken: "codigo-configuracao-seguro-123",
    })).resolves.toMatchObject({ token: "admin-jwt" });
    expect(authMocks.createInitialSuperAdmin).toHaveBeenCalledTimes(1);
    expect(authMocks.loginSuperAdmin).toHaveBeenCalledWith("admin@idefazei.com.br", "senha-principal-segura");
  });

  it("bloqueia uma segunda configuração pública após o primeiro administrador", async () => {
    authMocks.createInitialSuperAdmin.mockResolvedValue({ ok: false, reason: "already_configured" });
    const caller = appRouter.createCaller(anonymousContext);

    await expect(caller.adminAuth.bootstrap({
      name: "Outro Administrador",
      email: "outro@idefazei.com.br",
      password: "senha-principal-segura",
      setupToken: "codigo-configuracao-seguro-123",
    })).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
