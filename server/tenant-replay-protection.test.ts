import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

/**
 * Reforço de segurança: um token de igreja usado no subdomínio de OUTRA igreja deve ser
 * bloqueado em qualquer rota autenticada — não só nas que exigem tenantProcedure. Isso
 * protege rotas como peopleRouter.list, que confirmam o vínculo pelo churchId do próprio
 * usuário, mas não verificavam (antes desta correção) se a sessão também combina com o
 * host da requisição.
 */
const dbMocks = vi.hoisted(() => ({
  getChurchMemberByUserId: vi.fn(),
  getActiveChurchUserById: vi.fn(),
  getPeopleByChurch: vi.fn(),
  getJourneyManagedPersonIds: vi.fn(),
  recordSecurityAccessAuditEvent: vi.fn(),
}));

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return { ...actual, ...dbMocks };
});

import { appRouter } from "./routers";

const CHURCH_A = 301;
const CHURCH_B = 302;

function churchContext(options: { tenantMismatch: boolean }): TrpcContext {
  return {
    user: {
      id: -9,
      openId: "church:9",
      name: "Membro de teste",
      email: "membro@example.test",
      loginMethod: "church-jwt",
      role: "membro",
      churchId: CHURCH_A,
      authSource: "church",
      createdAt: new Date("2026-09-21T12:00:00.000Z"),
      updatedAt: new Date("2026-09-21T12:00:00.000Z"),
      lastSignedIn: new Date("2026-09-21T12:00:00.000Z"),
    },
    req: { headers: {}, socket: { remoteAddress: "127.0.0.1" } } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
    tenantChurchId: CHURCH_A,
    requestedTenantChurchId: options.tenantMismatch ? CHURCH_B : CHURCH_A,
    tenantSlug: options.tenantMismatch ? "igreja-b" : "igreja-a",
    tenantMismatch: options.tenantMismatch,
  };
}

describe("bloqueio de replay de token entre subdomínios (rotas sem tenantProcedure)", () => {
  it("bloqueia peopleRouter.list quando o host não é o da própria igreja, mesmo pedindo o churchId correto", async () => {
    const caller = appRouter.createCaller(churchContext({ tenantMismatch: true }));

    await expect(caller.people.list({ churchId: CHURCH_A })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMocks.getChurchMemberByUserId).not.toHaveBeenCalled();
    expect(dbMocks.getActiveChurchUserById).not.toHaveBeenCalled();
    expect(dbMocks.getPeopleByChurch).not.toHaveBeenCalled();
  });

  it("permite a mesma rota quando o host confere com a igreja da sessão", async () => {
    dbMocks.getActiveChurchUserById.mockResolvedValue({ id: 9, churchId: CHURCH_A, personId: 55, role: "pastor_presidente", active: true });
    dbMocks.getJourneyManagedPersonIds.mockResolvedValue([]);
    dbMocks.getPeopleByChurch.mockResolvedValue([]);

    const caller = appRouter.createCaller(churchContext({ tenantMismatch: false }));

    await expect(caller.people.list({ churchId: CHURCH_A })).resolves.toEqual([]);
  });
});
