import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    getChurchBySlug: vi.fn(),
    createPublicRegistrationLead: vi.fn(),
    getPublicRegistrationLeadsByChurch: vi.fn(),
    updatePublicRegistrationLeadStatus: vi.fn(),
  };
});

import { appRouter } from "./routers";
import { createPublicRegistrationLead, getChurchBySlug } from "./db";

function createContext(tenantSlug: string | null = "igreja-teste"): TrpcContext {
  return {
    user: null,
    req: { headers: {}, socket: { remoteAddress: "127.0.0.1" } } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
    tenantChurchId: 100,
    tenantSlug,
  };
}

const validInput = {
  churchSlug: "igreja-teste",
  name: "Maria da Silva",
  whatsapp: "(11) 99999-8888",
  email: "maria@example.com",
  zipCode: "01001-000",
  street: "Praça da Sé",
  number: "10",
  neighborhood: "Sé",
  city: "São Paulo",
  state: "SP",
  source: "evento" as const,
  campaign: "Culto de domingo",
  consentAccepted: true as const,
  website: "",
};

describe("publicRegistration.submit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getChurchBySlug).mockResolvedValue({ id: 100, active: true, publicRegistrationEnabled: true } as never);
    vi.mocked(createPublicRegistrationLead).mockResolvedValue({ created: true, duplicate: false, lead: null } as never);
  });

  it("valida o tenant pelo host e encaminha o cadastro sem criar conta", async () => {
    const caller = appRouter.createCaller(createContext());

    await expect(caller.publicRegistration.submit(validInput)).resolves.toMatchObject({
      success: true,
      duplicate: false,
    });
    expect(getChurchBySlug).toHaveBeenCalledWith("igreja-teste");
    expect(createPublicRegistrationLead).toHaveBeenCalledWith(expect.objectContaining({
      churchId: 100,
      name: "Maria da Silva",
      whatsapp: "(11) 99999-8888",
      source: "evento",
      campaign: "Culto de domingo",
      consentAccepted: true,
    }));
  });

  it("bloqueia envio quando o host pertence a outra igreja", async () => {
    const caller = appRouter.createCaller(createContext("outra-igreja"));

    await expect(caller.publicRegistration.submit(validInput)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(createPublicRegistrationLead).not.toHaveBeenCalled();
  });

  it("aceita o honeypot sem persistir dados e sem revelar comportamento ao robô", async () => {
    const caller = appRouter.createCaller(null);

    await expect(caller.publicRegistration.submit({ ...validInput, website: "https://bot.invalid" })).resolves.toEqual({
      success: true,
      duplicate: false,
      message: "Cadastro recebido.",
    });
    expect(getChurchBySlug).not.toHaveBeenCalled();
    expect(createPublicRegistrationLead).not.toHaveBeenCalled();
  });

  it("retorna confirmação neutra quando o WhatsApp já foi recebido nesta igreja", async () => {
    vi.mocked(createPublicRegistrationLead).mockResolvedValue({ created: false, duplicate: true, lead: null } as never);
    const caller = appRouter.createCaller(createContext());

    await expect(caller.publicRegistration.submit(validInput)).resolves.toMatchObject({
      success: true,
      duplicate: true,
      message: expect.stringContaining("Já recebemos"),
    });
  });

  it("exige consentimento explícito", async () => {
    const caller = appRouter.createCaller(createContext());

    await expect(caller.publicRegistration.submit({ ...validInput, consentAccepted: false as never })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(createPublicRegistrationLead).not.toHaveBeenCalled();
  });
});
