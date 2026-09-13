import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    getActiveChurchUserById: vi.fn(),
    hasActiveWebPushSubscription: vi.fn(),
    upsertWebPushSubscription: vi.fn(),
    revokeWebPushSubscription: vi.fn(),
  };
});

import { appRouter } from "./routers";
import {
  getActiveChurchUserById,
  hasActiveWebPushSubscription,
  revokeWebPushSubscription,
  upsertWebPushSubscription,
} from "./db";

const actor = {
  id: 2,
  churchId: 100,
  name: "Usuário Teste",
  email: "teste@igreja.test",
  role: "membro",
  active: true,
};

function createContext(userId = -actor.id): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `church:${Math.abs(userId)}`,
      name: actor.name,
      email: actor.email,
      loginMethod: "church-jwt",
      role: actor.role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      churchId: actor.churchId,
      authSource: "church",
    },
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
    tenantChurchId: actor.churchId,
    tenantSlug: "igreja-teste",
  };
}

describe("notifications.webPush*", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getActiveChurchUserById).mockResolvedValue(actor as never);
    vi.mocked(hasActiveWebPushSubscription).mockResolvedValue(false);
    vi.mocked(upsertWebPushSubscription).mockResolvedValue({ subscribed: true });
    vi.mocked(revokeWebPushSubscription).mockResolvedValue(true);
  });

  it("consulta o status somente no tenant e usuário autenticados", async () => {
    const caller = appRouter.createCaller(createContext());

    await expect(caller.notifications.webPushStatus({ churchId: 100 })).resolves.toEqual({ subscribed: false });
    expect(hasActiveWebPushSubscription).toHaveBeenCalledWith({ churchId: 100, churchUserId: 2 });
  });

  it("registra novamente a mesma subscription sem devolver chaves ao cliente", async () => {
    const caller = appRouter.createCaller(createContext());
    const input = {
      churchId: 100,
      endpoint: "https://push.example.test/subscription/abc",
      keys: { p256dh: "p".repeat(32), auth: "a".repeat(16) },
      userAgent: "iPhone Safari",
    };

    await expect(caller.notifications.webPushSubscribe(input)).resolves.toEqual({ subscribed: true });
    expect(upsertWebPushSubscription).toHaveBeenCalledWith({
      churchId: 100,
      churchUserId: 2,
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      userAgent: input.userAgent,
    });
  });

  it("revoga somente a subscription pertencente ao usuário autenticado", async () => {
    const caller = appRouter.createCaller(createContext());
    const endpoint = "https://push.example.test/subscription/abc";

    await expect(caller.notifications.webPushUnsubscribe({ churchId: 100, endpoint })).resolves.toEqual({ subscribed: false });
    expect(revokeWebPushSubscription).toHaveBeenCalledWith({ churchId: 100, churchUserId: 2, endpoint });
  });

  it("bloqueia acesso quando a sessão pertence a outra igreja", async () => {
    vi.mocked(getActiveChurchUserById).mockResolvedValue({ ...actor, churchId: 200 } as never);
    const caller = appRouter.createCaller(createContext());

    await expect(caller.notifications.webPushStatus({ churchId: 100 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(hasActiveWebPushSubscription).not.toHaveBeenCalled();
  });

  it("rejeita endpoints que não usam HTTPS", async () => {
    const caller = appRouter.createCaller(createContext());

    await expect(caller.notifications.webPushSubscribe({
      churchId: 100,
      endpoint: "http://push.example.test/subscription/abc",
      keys: { p256dh: "p".repeat(32), auth: "a".repeat(16) },
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(upsertWebPushSubscription).not.toHaveBeenCalled();
  });
});
