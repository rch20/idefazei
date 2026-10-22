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

vi.mock("./rateLimit", () => {
  const hits: Array<{ key: string; at: number }> = [];
  const id = (r: { bucket: string; key: string }) => `${r.bucket}|${r.key}`;
  const count = (key: string, windowSec: number) => hits.filter(h => h.key === key && Date.now() - h.at < windowSec * 1000).length;
  return {
    requestIp: (req: { headers: Record<string, string> }) => req.headers["cf-connecting-ip"] ?? "unknown",
    rateLimitWait: async (rules: Array<{ bucket: string; key: string; max: number; windowSec: number }>) => (rules.some(r => count(id(r), r.windowSec) >= r.max) ? 900 : 0),
    rateLimitRecordAll: async (rules: Array<{ bucket: string; key: string }>) => { for (const r of rules) hits.push({ key: id(r), at: Date.now() }); },
    rateLimitClear: async () => undefined,
    enforceRateLimit: async () => undefined,
    enforcePublicRateLimit: async () => undefined,
    consumeMailBudget: async () => undefined,
    rateLimitCount: async () => 0,
  };
});

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

describe("adminAuth.login — limite de tentativas", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("bloqueia a origem após várias senhas erradas, sem consultar o banco de novo", async () => {
    authMocks.loginSuperAdmin.mockResolvedValue(null);
    const caller = appRouter.createCaller({
      user: null,
      req: { protocol: "https", headers: { "cf-connecting-ip": "203.0.113.77" } },
      res: {},
    } as unknown as TrpcContext);

    for (let i = 0; i < 5; i++) {
      await expect(caller.adminAuth.login({ email: "limite@idefazei.com.br", password: "senha-errada" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    }
    await expect(caller.adminAuth.login({ email: "limite@idefazei.com.br", password: "senha-errada" })).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
    expect(authMocks.loginSuperAdmin).toHaveBeenCalledTimes(5);
  });
});
