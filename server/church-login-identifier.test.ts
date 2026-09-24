import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./db", () => ({
  getChurchById: vi.fn(),
  getDb: vi.fn(),
}));

import { getChurchById, getDb } from "./db";
import { hashPassword, loginChurchUser, normalizeChurchLoginIdentifier } from "./auth";

const password = "SenhaSegura123";
const churchUser = {
  id: 12,
  churchId: 34,
  name: "João da Silva",
  email: "joao@example.com",
  passwordHash: hashPassword(password),
  role: "membro",
  personId: 77,
  active: true,
  registrationStatus: "approved",
  approvedAt: new Date("2026-01-01"),
  approvedByChurchUserId: null,
  rejectionReason: null,
  lastLoginAt: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

function updateChain() {
  const updateWhere = vi.fn().mockResolvedValue(undefined);
  const set = vi.fn(() => ({ where: updateWhere }));
  return { update: vi.fn(() => ({ set })) };
}

function emailDatabase() {
  const limit = vi.fn().mockResolvedValue([churchUser]);
  const where = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where }));
  return { ...updateChain(), select: vi.fn(() => ({ from })) };
}

function phoneDatabase(personRows: Array<{ id: number }>, userRows: Array<typeof churchUser>) {
  const personLimit = vi.fn().mockResolvedValue(personRows);
  const personWhere = vi.fn(() => ({ limit: personLimit }));
  const personFrom = vi.fn(() => ({ where: personWhere }));
  const userLimit = vi.fn().mockResolvedValue(userRows);
  const userWhere = vi.fn(() => ({ limit: userLimit }));
  const userFrom = vi.fn(() => ({ where: userWhere }));
  const select = vi.fn()
    .mockImplementationOnce(() => ({ from: personFrom }))
    .mockImplementationOnce(() => ({ from: userFrom }));
  return { ...updateChain(), select };
}

describe("login por e-mail ou telefone", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getChurchById).mockResolvedValue({ id: churchUser.churchId, active: true } as never);
  });

  it("normaliza e-mail sem alterar a identidade", () => {
    expect(normalizeChurchLoginIdentifier("  JOAO@EXAMPLE.COM ")).toEqual({
      kind: "email",
      value: "joao@example.com",
    });
  });

  it("normaliza telefone brasileiro com máscara", () => {
    expect(normalizeChurchLoginIdentifier("+55 (11) 99999-8888")).toEqual({
      kind: "phone",
      value: "5511999998888",
    });
  });

  it("rejeita identificador curto ou e-mail inválido", () => {
    expect(normalizeChurchLoginIdentifier("123456789")).toEqual({ kind: "invalid", value: null });
    expect(normalizeChurchLoginIdentifier("joao@")).toEqual({ kind: "invalid", value: null });
    expect(normalizeChurchLoginIdentifier("joao#example")).toEqual({ kind: "invalid", value: null });
  });

  it("mantém o login existente por e-mail", async () => {
    vi.mocked(getDb).mockResolvedValue(emailDatabase() as never);

    const result = await loginChurchUser(" JOAO@EXAMPLE.COM ", password, 34);

    expect(result?.user).toMatchObject({ id: churchUser.id, email: churchUser.email, churchId: churchUser.churchId });
  });

  it("encontra a conta pelo telefone da Pessoa dentro do tenant", async () => {
    vi.mocked(getDb).mockResolvedValue(phoneDatabase([{ id: churchUser.personId }], [churchUser]) as never);

    const result = await loginChurchUser("(11) 99999-8888", password, 34);

    expect(result?.user).toMatchObject({ id: churchUser.id, churchId: churchUser.churchId });
  });

  it("não escolhe uma conta quando o telefone é compartilhado", async () => {
    vi.mocked(getDb).mockResolvedValue(phoneDatabase([{ id: churchUser.personId }, { id: 78 }], [churchUser]) as never);

    await expect(loginChurchUser("(11) 99999-8888", password, 34)).resolves.toBeNull();
  });

  it("não tenta resolver telefone sem o tenant do host", async () => {
    vi.mocked(getDb).mockResolvedValue(phoneDatabase([{ id: churchUser.personId }], [churchUser]) as never);

    await expect(loginChurchUser("(11) 99999-8888", password)).resolves.toBeNull();
  });
});
