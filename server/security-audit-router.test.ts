import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getChurchMemberByUserId: vi.fn(),
  getActiveChurchUserById: vi.fn(),
  listSecurityAuditHolds: vi.fn(),
  getSecurityAuditHoldById: vi.fn(),
  getSecurityAuditHoldByIdempotencyKey: vi.fn(),
  getSecurityAuditHoldEvents: vi.fn(),
  createSecurityAuditHold: vi.fn(),
  reviewSecurityAuditHold: vi.fn(),
  releaseSecurityAuditHold: vi.fn(),
}));

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return { ...actual, ...mocks };
});

import { appRouter } from "./routers";

const hold = {
  id: 5,
  churchId: 23,
  eventType: "security.tenant_access_denied",
  reason: "jwt_host_mismatch",
  procedurePath: "escolaFundamentos.listCourses",
  sessionChurchId: 23,
  targetChurchId: 42,
  sourceFingerprint: "source-a",
  status: "active",
  holdReason: "Investigação de mismatch entre tenants",
  createdByChurchUserId: 77,
  createdAt: new Date("2026-09-21T05:00:00.000Z"),
  startsAt: new Date("2026-09-21T05:00:00.000Z"),
  expiresAt: new Date("2026-10-20T05:00:00.000Z"),
  reviewDueAt: new Date("2026-10-01T05:00:00.000Z"),
  lastReviewedByChurchUserId: null,
  lastReviewedAt: null,
  releasedByChurchUserId: null,
  releasedAt: null,
  releaseReason: null,
  expiredAt: null,
  idempotencyKey: "incident-2026-001",
};
const holdEvent = {
  id: 11,
  churchId: 23,
  holdId: 5,
  action: "opened",
  actorChurchUserId: 77,
  previousStatus: null,
  newStatus: "active",
  previousExpiresAt: null,
  newExpiresAt: hold.expiresAt,
  previousReviewDueAt: null,
  newReviewDueAt: hold.reviewDueAt,
  reason: hold.holdReason,
  metadata: null,
  occurredAt: hold.createdAt,
  createdAt: hold.createdAt,
};

function makeContext(role = "pastor_presidente") {
  return {
    user: {
      id: 7,
      openId: "manus-user-7",
      name: "Administrador de teste",
      email: "admin@example.test",
      role: "user",
      authSource: "manus",
    },
    req: { headers: {} },
    res: {},
    tenantChurchId: null,
    tenantSlug: null,
    tenantMismatch: false,
    __memberRole: role,
  } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getChurchMemberByUserId.mockImplementation(
    async (_userId, churchId) => ({
      id: 77,
      churchId,
      userId: 7,
      personId: null,
      role: "pastor_presidente",
    })
  );
  mocks.getActiveChurchUserById.mockResolvedValue({
    id: 7,
    churchId: 23,
    role: "pastor_presidente",
    personId: null,
  });
  mocks.listSecurityAuditHolds.mockResolvedValue([hold]);
  mocks.getSecurityAuditHoldById.mockResolvedValue(hold);
  mocks.getSecurityAuditHoldByIdempotencyKey.mockResolvedValue(null);
  mocks.getSecurityAuditHoldEvents.mockResolvedValue([holdEvent]);
  mocks.createSecurityAuditHold.mockResolvedValue(5);
  mocks.reviewSecurityAuditHold.mockResolvedValue(hold);
  mocks.releaseSecurityAuditHold.mockResolvedValue({
    ...hold,
    status: "released",
  });
});

describe("securityAudit tRPC", () => {
  it("lista holds somente depois de validar o administrador no tenant", async () => {
    const caller = appRouter.createCaller(makeContext());

    await expect(
      caller.securityAudit.listHolds({ churchId: 23, status: "active" })
    ).resolves.toMatchObject([
      { hold, state: { status: "active", displayState: "active" } },
    ]);
    expect(mocks.getChurchMemberByUserId).toHaveBeenCalledWith(7, 23);
    expect(mocks.listSecurityAuditHolds).toHaveBeenCalledWith(23, "active");
  });

  it("bloqueia usuário sem papel administrativo", async () => {
    mocks.getChurchMemberByUserId.mockResolvedValue({
      id: 77,
      churchId: 23,
      userId: 7,
      personId: null,
      role: "membro",
    });
    const caller = appRouter.createCaller(makeContext("membro"));

    await expect(
      caller.securityAudit.listHolds({ churchId: 23 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.listSecurityAuditHolds).not.toHaveBeenCalled();
  });

  it("bloqueia tentativa de consultar outro tenant antes da query", async () => {
    mocks.getChurchMemberByUserId.mockResolvedValue(null);
    const caller = appRouter.createCaller(makeContext());

    await expect(
      caller.securityAudit.getHold({ churchId: 999, holdId: 5 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.getSecurityAuditHoldById).not.toHaveBeenCalled();
  });

  it("retorna o hold com estado derivado e histórico append-only", async () => {
    const caller = appRouter.createCaller(makeContext());

    await expect(
      caller.securityAudit.getHold({ churchId: 23, holdId: 5 })
    ).resolves.toMatchObject({
      hold,
      state: { status: "active", displayState: "active" },
      events: [holdEvent],
    });
    expect(mocks.getSecurityAuditHoldEvents).toHaveBeenCalledWith(23, 5);
  });

  it("permite leitura ao Secretário, mas restringe mutações aos Pastores", async () => {
    mocks.getChurchMemberByUserId.mockResolvedValue({
      id: 77,
      churchId: 23,
      userId: 7,
      personId: null,
      role: "secretario",
    });
    const caller = appRouter.createCaller(makeContext("secretario"));

    await expect(
      caller.securityAudit.listHolds({ churchId: 23 })
    ).resolves.toHaveLength(1);
    await expect(
      caller.securityAudit.releaseHold({
        churchId: 23,
        holdId: 5,
        releaseReason: "Investigação concluída",
      })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("bloqueia mismatch do tenant do JWT antes da autorização do painel", async () => {
    const caller = appRouter.createCaller({
      ...makeContext(),
      user: {
        id: -7,
        openId: "church-user-7",
        name: "Pastor de teste",
        email: "pastor@example.test",
        role: "user",
        authSource: "church",
        churchId: 23,
      },
      tenantChurchId: 999,
      tenantSlug: "outra-igreja",
      tenantMismatch: true,
    } as never);

    await expect(
      caller.securityAudit.listHolds({ churchId: 23 })
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.listSecurityAuditHolds).not.toHaveBeenCalled();
    expect(mocks.getChurchMemberByUserId).not.toHaveBeenCalled();
  });

  it("abre hold com actor server-side e não aceita autoria do cliente", async () => {
    const caller = appRouter.createCaller(makeContext());

    const result = await caller.securityAudit.openHold({
      churchId: 23,
      holdReason: "Investigação de mismatch entre tenants",
      startsAt: new Date("2026-09-21T05:00:00.000Z"),
      expiresAt: new Date("2026-10-20T05:00:00.000Z"),
      reviewDueAt: new Date("2026-10-01T05:00:00.000Z"),
      reason: "jwt_host_mismatch",
      procedurePath: "escolaFundamentos.listCourses",
      sessionChurchId: 23,
      targetChurchId: 42,
      sourceFingerprint: "source-a",
      idempotencyKey: "incident-2026-001",
    });

    expect(result).toMatchObject({
      hold,
      idempotentReplay: false,
      state: { status: "active", displayState: "active" },
    });
    expect(mocks.createSecurityAuditHold).toHaveBeenCalledWith(
      expect.objectContaining({
        churchId: 23,
        eventType: "security.tenant_access_denied",
        createdByChurchUserId: 77,
      })
    );
  });

  it("torna abertura idempotente e não cria duplicata", async () => {
    mocks.getSecurityAuditHoldByIdempotencyKey.mockResolvedValue(hold);
    const caller = appRouter.createCaller(makeContext());

    const result = await caller.securityAudit.openHold({
      churchId: 23,
      holdReason: "Investigação de mismatch entre tenants",
      startsAt: new Date("2026-09-21T05:00:00.000Z"),
      expiresAt: new Date("2026-10-20T05:00:00.000Z"),
      idempotencyKey: "incident-2026-001",
    });

    expect(result).toMatchObject({
      hold,
      idempotentReplay: true,
      state: { status: "active", displayState: "active" },
    });
    expect(mocks.createSecurityAuditHold).not.toHaveBeenCalled();
  });

  it("revisa o prazo com o actor e horário do servidor", async () => {
    const caller = appRouter.createCaller(makeContext());

    await expect(
      caller.securityAudit.reviewHold({
        churchId: 23,
        holdId: 5,
        expiresAt: new Date("2026-10-20T05:00:00.000Z"),
        reviewDueAt: new Date("2026-10-01T05:00:00.000Z"),
      })
    ).resolves.toMatchObject({
      hold,
      state: { status: "active", displayState: "active" },
    });
    expect(mocks.reviewSecurityAuditHold).toHaveBeenCalledWith(
      expect.objectContaining({
        churchId: 23,
        holdId: 5,
        reviewedByChurchUserId: 77,
        reviewedAt: expect.any(Date),
      })
    );
  });

  it("libera o hold com motivo obrigatório e autoria server-side", async () => {
    const caller = appRouter.createCaller(makeContext());

    await expect(
      caller.securityAudit.releaseHold({
        churchId: 23,
        holdId: 5,
        releaseReason: "Investigação concluída",
      })
    ).resolves.toMatchObject({
      hold: { status: "released" },
      state: { status: "released", displayState: "released" },
    });
    expect(mocks.releaseSecurityAuditHold).toHaveBeenCalledWith(
      expect.objectContaining({
        churchId: 23,
        holdId: 5,
        releasedByChurchUserId: 77,
        releasedAt: expect.any(Date),
        releaseReason: "Investigação concluída",
      })
    );
  });
});
