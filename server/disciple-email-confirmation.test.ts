import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    getChurchBySlug: vi.fn(),
    getChurchUserByEmail: vi.fn(),
    findPossiblePeopleByIdentity: vi.fn(),
    createPerson: vi.fn(),
  };
});

vi.mock("./auth", async () => {
  const actual = await vi.importActual<typeof import("./auth")>("./auth");
  return { ...actual, createChurchUser: vi.fn() };
});

vi.mock("./emailVerification", async () => {
  const actual = await vi.importActual<typeof import("./emailVerification")>("./emailVerification");
  return {
    ...actual,
    confirmEmailVerificationToken: vi.fn(),
    isEmailVerificationDeliveryConfigured: vi.fn(),
    issueEmailVerification: vi.fn(),
  };
});

import { appRouter } from "./routers";
import { ENV } from "./_core/env";
import { createChurchUser } from "./auth";
import { createPerson, findPossiblePeopleByIdentity, getChurchBySlug, getChurchUserByEmail } from "./db";
import { confirmEmailVerificationToken, isEmailVerificationDeliveryConfigured, issueEmailVerification } from "./emailVerification";

function createContext(): TrpcContext {
  return {
    user: null,
    req: { headers: {}, socket: { remoteAddress: "127.0.0.1" } } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
    tenantChurchId: 100,
    tenantSlug: "igreja-teste",
  };
}

const validInput = {
  churchSlug: "igreja-teste",
  name: "Maria da Silva",
  email: "maria@example.com",
  emailConfirmation: "maria@example.com",
  password: "SenhaSegura123",
  birthDate: "1990-01-01",
  phone: "11999998888",
  whatsapp: "11999998888",
  zipCode: "01001-000",
  street: "Praça da Sé",
  number: "10",
  neighborhood: "Sé",
  city: "São Paulo",
  state: "SP",
};

describe("register.disciple — confirmação de e-mail", () => {
  const originalEmailVerificationEnabled = ENV.emailVerificationEnabled;

  beforeEach(() => {
    vi.clearAllMocks();
    ENV.emailVerificationEnabled = true;
    vi.mocked(getChurchBySlug).mockResolvedValue({ id: 100, slug: "igreja-teste", name: "Igreja Teste", active: true, publicRegistrationEnabled: true } as never);
    vi.mocked(getChurchUserByEmail).mockResolvedValue(null);
    vi.mocked(findPossiblePeopleByIdentity).mockResolvedValue([]);
    vi.mocked(createPerson).mockResolvedValue({ id: 501, fullName: "Maria da Silva" } as never);
    vi.mocked(createChurchUser).mockResolvedValue({ id: 601, email: "maria@example.com", name: "Maria da Silva" } as never);
    vi.mocked(isEmailVerificationDeliveryConfigured).mockReturnValue(true);
    vi.mocked(issueEmailVerification).mockResolvedValue({ sent: true, rateLimited: false });
  });

  afterAll(() => {
    ENV.emailVerificationEnabled = originalEmailVerificationEnabled;
  });

  it("cria a conta pendente e solicita o envio do link", async () => {
    const result = await appRouter.createCaller(createContext()).register.disciple(validInput);

    expect(result).toMatchObject({ success: true, emailVerificationPending: true });
    expect(createChurchUser).toHaveBeenCalledWith(expect.objectContaining({
      emailVerificationRequired: true,
      personId: 501,
    }));
    expect(issueEmailVerification).toHaveBeenCalledWith(expect.objectContaining({
      churchId: 100,
      churchUserId: 601,
      email: "maria@example.com",
    }));
  });

  it("recusa e-mails diferentes antes de criar a Pessoa ou a conta", async () => {
    await expect(appRouter.createCaller(createContext()).register.disciple({
      ...validInput,
      emailConfirmation: "maria+erro@example.com",
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });

    expect(createPerson).not.toHaveBeenCalled();
    expect(createChurchUser).not.toHaveBeenCalled();
    expect(issueEmailVerification).not.toHaveBeenCalled();
  });

  it("confirma um token válido e rejeita um token inválido", async () => {
    vi.mocked(confirmEmailVerificationToken).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const caller = appRouter.createCaller(createContext());

    await expect(caller.churchAuth.confirmEmail({ token: "a".repeat(32) })).resolves.toMatchObject({ success: true });
    await expect(caller.churchAuth.confirmEmail({ token: "b".repeat(32) })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("não expõe detalhes do SMTP quando o envio falha", async () => {
    vi.mocked(issueEmailVerification).mockRejectedValueOnce(new Error("senha SMTP inválida"));

    await expect(appRouter.createCaller(createContext()).register.disciple(validInput)).rejects.toMatchObject({
      code: "SERVICE_UNAVAILABLE",
      message: expect.stringContaining("Não foi possível enviar a confirmação"),
    });
  });
});
