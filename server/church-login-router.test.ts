import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./auth", async () => {
  const actual = await vi.importActual<typeof import("./auth")>("./auth");
  return {
    ...actual,
    loginChurchUser: vi.fn(),
  };
});

import { loginChurchUser } from "./auth";
import { appRouter } from "./routers";

function createContext(): TrpcContext {
  return {
    user: null,
    req: { headers: {}, socket: { remoteAddress: "127.0.0.1" } } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
    tenantChurchId: 34,
    tenantSlug: "igreja-teste",
  };
}

describe("churchAuth.login", () => {
  it("aceita o identificador único e encaminha o tenant para o login", async () => {
    vi.mocked(loginChurchUser).mockResolvedValue({
      token: "token-de-teste",
      user: { id: 12, name: "João", email: "joao@example.com", role: "membro", churchId: 34 },
    });

    const result = await appRouter.createCaller(createContext()).churchAuth.login({
      identifier: "(11) 99999-8888",
      password: "SenhaSegura123",
    });

    expect(result.token).toBe("token-de-teste");
    expect(loginChurchUser).toHaveBeenCalledWith("(11) 99999-8888", "SenhaSegura123", 34);
  });

  it("mantém compatibilidade transitória com clientes que enviam email", async () => {
    vi.mocked(loginChurchUser).mockResolvedValue({
      token: "token-de-teste",
      user: { id: 12, name: "João", email: "joao@example.com", role: "membro", churchId: 34 },
    });

    await appRouter.createCaller(createContext()).churchAuth.login({
      email: "joao@example.com",
      password: "SenhaSegura123",
    });

    expect(loginChurchUser).toHaveBeenCalledWith("joao@example.com", "SenhaSegura123", 34);
  });
});
