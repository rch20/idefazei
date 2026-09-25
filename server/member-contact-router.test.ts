import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    getActiveChurchUserById: vi.fn(),
    updatePersonContact: vi.fn(),
  };
});

import { getActiveChurchUserById, updatePersonContact } from "./db";
import { appRouter } from "./routers";

function createContext(overrides: Partial<TrpcContext> = {}): TrpcContext {
  return {
    user: {
      id: -12,
      openId: "church:12",
      name: "João da Silva",
      email: "joao@example.com",
      loginMethod: "church-jwt",
      role: "membro",
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
      lastSignedIn: new Date("2026-01-01"),
      churchId: 34,
      authSource: "church",
    },
    req: { headers: {}, socket: { remoteAddress: "127.0.0.1" } } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
    tenantChurchId: 34,
    tenantSlug: "igreja-teste",
    ...overrides,
  };
}

const person = {
  id: 77,
  churchId: 34,
  fullName: "João da Silva",
  phone: "(11) 99999-8888",
  whatsapp: null,
};

function mockLinkedChurchUser() {
  vi.mocked(getActiveChurchUserById).mockResolvedValue({
    id: 12,
    churchId: 34,
    personId: 77,
    name: "João da Silva",
    email: "joao@example.com",
    role: "membro",
    active: true,
  } as never);
}

describe("people.updateMyContact", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("atualiza somente o contato da Pessoa vinculada à sessão", async () => {
    mockLinkedChurchUser();
    vi.mocked(updatePersonContact).mockResolvedValue(person as never);

    const result = await appRouter.createCaller(createContext()).people.updateMyContact({
      churchId: 34,
      phone: "(11) 99999-8888",
      whatsapp: "+55 (11) 98888-7777",
    });

    expect(result).toEqual(person);
    expect(updatePersonContact).toHaveBeenCalledWith(34, 77, {
      phone: "(11) 99999-8888",
      whatsapp: "+55 (11) 98888-7777",
    });
  });

  it("rejeita telefone inválido antes de escrever", async () => {
    mockLinkedChurchUser();

    await expect(appRouter.createCaller(createContext()).people.updateMyContact({
      churchId: 34,
      phone: "123",
      whatsapp: null,
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(updatePersonContact).not.toHaveBeenCalled();
  });

  it("não permite escrever em outro tenant", async () => {
    mockLinkedChurchUser();

    await expect(appRouter.createCaller(createContext()).people.updateMyContact({
      churchId: 35,
      phone: "(11) 99999-8888",
      whatsapp: null,
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(updatePersonContact).not.toHaveBeenCalled();
  });

  it("traduz telefone já usado por outra Pessoa em conflito compreensível", async () => {
    mockLinkedChurchUser();
    vi.mocked(updatePersonContact).mockRejectedValue(new Error("PERSON_CONTACT_ALREADY_IN_USE"));

    await expect(appRouter.createCaller(createContext()).people.updateMyContact({
      churchId: 34,
      phone: "(11) 99999-8888",
      whatsapp: null,
    })).rejects.toMatchObject({
      code: "CONFLICT",
      message: "Este telefone já está cadastrado para outra Pessoa nesta igreja.",
    });
  });
});
