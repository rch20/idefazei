import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  getDb: vi.fn(),
  getActiveChurchUserById: vi.fn(),
  getChurchById: vi.fn(),
  getChurchBySlug: vi.fn(),
}));

vi.mock("./_core/sdk", () => ({
  sdk: {
    authenticateRequest: vi.fn(),
  },
}));

import { getActiveChurchUserById, getChurchById, getChurchBySlug, getDb } from "./db";
import { hashPassword, loginChurchUser } from "./auth";
import { createContext } from "./_core/context";
import { protectedProcedure, router } from "./_core/trpc";
import { sdk } from "./_core/sdk";

const password = "SenhaSegura123";
const churchUser = {
  id: 12,
  churchId: 34,
  name: "Pastora Ana",
  email: "ana@igreja.com",
  passwordHash: hashPassword(password),
  role: "pastor_presidente",
  active: true,
  lastLoginAt: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

const protectedRouter = router({
  currentSession: protectedProcedure.query(({ ctx }) => ctx.user),
});

function databaseMock() {
  const limit = vi.fn().mockResolvedValue([churchUser]);
  const where = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where }));
  const select = vi.fn(() => ({ from }));
  const updateWhere = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn(() => ({ where: updateWhere }));
  const update = vi.fn(() => ({ set }));
  return { select, update };
}

describe("fluxo de login da igreja para procedure protegida", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getDb as ReturnType<typeof vi.fn>).mockResolvedValue(databaseMock());
    (getActiveChurchUserById as ReturnType<typeof vi.fn>).mockResolvedValue(churchUser);
    (getChurchById as ReturnType<typeof vi.fn>).mockResolvedValue({ id: churchUser.churchId, active: true });
    (getChurchBySlug as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (sdk.authenticateRequest as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Sem sessão Manus"));
  });

  it("emite o JWT no login e o aceita em uma procedure protegida", async () => {
    const login = await loginChurchUser(churchUser.email, password);
    expect(login?.token).toBeTruthy();

    const context = await createContext({
      req: { headers: { authorization: `Bearer ${login?.token}` } } as never,
      res: {} as never,
    });
    const session = await protectedRouter.createCaller(context).currentSession();

    expect(session).toMatchObject({
      id: -churchUser.id,
      churchId: churchUser.churchId,
      authSource: "church",
    });
  });
});
