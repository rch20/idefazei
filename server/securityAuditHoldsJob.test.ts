import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  authenticateRequest: vi.fn(),
  getDb: vi.fn(),
  expireSecurityAuditHolds: vi.fn(),
}));

vi.mock("./_core/sdk", () => ({
  sdk: { authenticateRequest: mocks.authenticateRequest },
}));
vi.mock("./db", () => ({
  getDb: mocks.getDb,
  expireSecurityAuditHolds: mocks.expireSecurityAuditHolds,
}));

import { securityAuditHoldsExpirationHandler } from "./securityAuditHoldsJob";

function makeResponse() {
  const response = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      response.statusCode = code;
      return response;
    },
    json(body: unknown) {
      response.body = body;
      return response;
    },
  };
  return response;
}

function makeRequest() {
  return { headers: {} } as never;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.authenticateRequest.mockResolvedValue({
    isCron: true,
    taskUid: "task-security-holds",
  });
  mocks.getDb.mockResolvedValue({
    select: () => ({
      from: () => ({
        where: async () => [{ id: 23 }, { id: 42 }],
      }),
    }),
  });
  mocks.expireSecurityAuditHolds.mockResolvedValue(1);
});

describe("securityAuditHoldsExpirationHandler", () => {
  it("rejeita uma requisição sem sessão Heartbeat válida", async () => {
    mocks.authenticateRequest.mockRejectedValue(new Error("not authenticated"));
    const response = makeResponse();

    await securityAuditHoldsExpirationHandler(makeRequest(), response as never);

    expect(response.statusCode).toBe(403);
    expect(response.body).toEqual({ error: "cron-only" });
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("rejeita uma sessão de usuário comum", async () => {
    mocks.authenticateRequest.mockResolvedValue({
      isCron: false,
      taskUid: undefined,
    });
    const response = makeResponse();

    await securityAuditHoldsExpirationHandler(makeRequest(), response as never);

    expect(response.statusCode).toBe(403);
    expect(response.body).toEqual({ error: "cron-only" });
    expect(mocks.getDb).not.toHaveBeenCalled();
  });

  it("expira holds dos tenants ativos e retorna apenas contadores", async () => {
    const response = makeResponse();

    await securityAuditHoldsExpirationHandler(makeRequest(), response as never);

    expect(response.statusCode).toBe(200);
    expect(response.body).toMatchObject({
      ok: true,
      tenantsChecked: 2,
      expiredHolds: 2,
    });
    expect(mocks.expireSecurityAuditHolds).toHaveBeenCalledTimes(2);
    expect(mocks.expireSecurityAuditHolds).toHaveBeenNthCalledWith(
      1,
      23,
      expect.any(Date)
    );
    expect(mocks.expireSecurityAuditHolds).toHaveBeenNthCalledWith(
      2,
      42,
      expect.any(Date)
    );
  });

  it("retorna erro controlado quando o banco não está disponível", async () => {
    mocks.getDb.mockResolvedValue(null);
    const response = makeResponse();

    await securityAuditHoldsExpirationHandler(makeRequest(), response as never);

    expect(response.statusCode).toBe(500);
    expect(response.body).toEqual({ error: "database unavailable" });
  });
});
