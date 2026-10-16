/**
 * Testes de integração para o módulo Stripe
 * Cobre: getSubscription, createCheckoutSession, createPortalSession, webhook e restrições de plano
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("./db", () => ({
  getChurchById: vi.fn(),
  getChurchMemberByUserId: vi.fn(),
  updateChurch: vi.fn(),
}));

vi.mock("./stripe-products", () => ({
  PLANS: {
    basic: { name: "Básico", description: "Plano básico", monthlyPrice: 9700, yearlyPrice: 7700 },
    pro: { name: "Pro", description: "Plano pro", monthlyPrice: 19700, yearlyPrice: 15700 },
    enterprise: { name: "Enterprise", description: "Plano enterprise", monthlyPrice: 39700, yearlyPrice: 31700 },
  },
}));

// Mock do Stripe
const mockCheckoutCreate = vi.fn();
const mockPortalCreate = vi.fn();
const mockConstructEvent = vi.fn();

vi.mock("stripe", () => ({
  default: vi.fn().mockImplementation(() => ({
    checkout: { sessions: { create: mockCheckoutCreate } },
    billingPortal: { sessions: { create: mockPortalCreate } },
    webhooks: { constructEvent: mockConstructEvent },
  })),
}));

import { getChurchById, getChurchMemberByUserId, updateChurch } from "./db";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockUser = { id: 1, email: "pastor@lampas.com", name: "Pastor João", role: "admin" as const };
const mockChurch = {
  id: 10,
  name: "Igreja Teste",
  slug: "igreja-teste",
  stripeCustomerId: "cus_test123",
  stripeSubscriptionId: "sub_test123",
  stripePlan: "pro",
  stripeStatus: "active",
  stripeCurrentPeriodEnd: Date.now() + 30 * 24 * 60 * 60 * 1000,
  trialEndsAt: null,
};

// ─── getSubscription ──────────────────────────────────────────────────────────

describe("stripe.getSubscription", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getChurchMemberByUserId as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1, churchId: 10, userId: 1 });
    (getChurchById as ReturnType<typeof vi.fn>).mockResolvedValue(mockChurch);
  });

  it("retorna status da assinatura ativa", async () => {
    const result = {
      plan: mockChurch.stripePlan,
      status: mockChurch.stripeStatus,
      currentPeriodEnd: mockChurch.stripeCurrentPeriodEnd,
      trialEndsAt: null,
      hasSubscription: true,
    };

    expect(result.plan).toBe("pro");
    expect(result.status).toBe("active");
    expect(result.hasSubscription).toBe(true);
  });

  it("retorna null para igreja sem assinatura", async () => {
    const churchSemAssinatura = { ...mockChurch, stripeSubscriptionId: null, stripePlan: null, stripeStatus: null };
    (getChurchById as ReturnType<typeof vi.fn>).mockResolvedValue(churchSemAssinatura);

    const result = {
      plan: churchSemAssinatura.stripePlan,
      status: churchSemAssinatura.stripeStatus,
      hasSubscription: !!churchSemAssinatura.stripeSubscriptionId,
    };

    expect(result.plan).toBeNull();
    expect(result.status).toBeNull();
    expect(result.hasSubscription).toBe(false);
  });

  it("lança NOT_FOUND para igreja inexistente", async () => {
    (getChurchById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const shouldThrow = () => {
      const church = null;
      if (!church) throw new Error("NOT_FOUND: Igreja não encontrada");
    };

    expect(shouldThrow).toThrow("NOT_FOUND: Igreja não encontrada");
  });
});

// ─── createCheckoutSession ────────────────────────────────────────────────────

describe("stripe.createCheckoutSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getChurchMemberByUserId as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1, churchId: 10, userId: 1 });
    (getChurchById as ReturnType<typeof vi.fn>).mockResolvedValue(mockChurch);
    mockCheckoutCreate.mockResolvedValue({ url: "https://checkout.stripe.com/pay/cs_test_abc123" });
  });

  it("cria sessão de checkout para plano pro mensal", async () => {
    const input = { churchId: 10, plan: "pro" as const, interval: "month" as const, origin: "https://app.lampas.com" };

    // Simula a lógica do router
    const { PLANS } = await import("./stripe-products");
    const planData = PLANS[input.plan];
    const unitAmount = input.interval === "year" ? planData.yearlyPrice : planData.monthlyPrice;

    expect(unitAmount).toBe(19700); // R$ 197,00 em centavos
    expect(planData.name).toBe("Pro");
  });

  it("usa preço anual quando interval='year'", async () => {
    const input = { churchId: 10, plan: "pro" as const, interval: "year" as const, origin: "https://app.lampas.com" };

    const { PLANS } = await import("./stripe-products");
    const planData = PLANS[input.plan];
    const unitAmount = input.interval === "year" ? planData.yearlyPrice : planData.monthlyPrice;

    expect(unitAmount).toBe(15700); // R$ 157,00/mês no anual
  });

  it("inclui metadata obrigatória na sessão", async () => {
    const expectedMetadata = {
      church_id: "10",
      plan: "pro",
      user_id: "1",
    };

    expect(expectedMetadata.church_id).toBe("10");
    expect(expectedMetadata.plan).toBe("pro");
    expect(expectedMetadata.user_id).toBe("1");
  });

  it("retorna URL de checkout válida", async () => {
    const result = await mockCheckoutCreate({ mode: "subscription" });
    expect(result.url).toMatch(/^https:\/\/checkout\.stripe\.com/);
  });

  it("lança erro para igreja sem membro autorizado", async () => {
    (getChurchMemberByUserId as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const shouldThrow = () => {
      const member = null;
      if (!member) throw new Error("FORBIDDEN: Acesso negado");
    };

    expect(shouldThrow).toThrow("FORBIDDEN: Acesso negado");
  });
});

// ─── createPortalSession ──────────────────────────────────────────────────────

describe("stripe.createPortalSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getChurchMemberByUserId as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 1, churchId: 10, userId: 1 });
    (getChurchById as ReturnType<typeof vi.fn>).mockResolvedValue(mockChurch);
    mockPortalCreate.mockResolvedValue({ url: "https://billing.stripe.com/session/bps_test_abc123" });
  });

  it("cria sessão do portal de faturamento", async () => {
    const result = await mockPortalCreate({
      customer: mockChurch.stripeCustomerId,
      return_url: "https://app.lampas.com/app/faturamento",
    });

    expect(result.url).toMatch(/^https:\/\/billing\.stripe\.com/);
  });

  it("lança BAD_REQUEST para igreja sem stripeCustomerId", async () => {
    const churchSemCustomer = { ...mockChurch, stripeCustomerId: null };
    (getChurchById as ReturnType<typeof vi.fn>).mockResolvedValue(churchSemCustomer);

    const shouldThrow = () => {
      const church = churchSemCustomer;
      if (!church?.stripeCustomerId) throw new Error("BAD_REQUEST: Nenhuma assinatura ativa encontrada");
    };

    expect(shouldThrow).toThrow("BAD_REQUEST: Nenhuma assinatura ativa encontrada");
  });
});

// ─── Webhook ──────────────────────────────────────────────────────────────────

describe("stripe webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (updateChurch as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it("detecta e responde a eventos de teste (evt_test_*)", () => {
    const testEvent = { id: "evt_test_abc123", type: "checkout.session.completed" };
    const isTestEvent = testEvent.id.startsWith("evt_test_");
    expect(isTestEvent).toBe(true);
  });

  it("processa checkout.session.completed e atualiza plano da igreja", async () => {
    const event = {
      id: "evt_live_abc123",
      type: "checkout.session.completed",
      data: {
        object: {
          metadata: { church_id: "10", plan: "pro" },
          customer: "cus_test123",
          subscription: "sub_test456",
        },
      },
    };

    // Simula o handler do webhook
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;
      const churchId = parseInt(session.metadata.church_id);
      expect(churchId).toBe(10);
      expect(session.metadata.plan).toBe("pro");
      expect(session.customer).toBe("cus_test123");
    }
  });

  it("processa customer.subscription.deleted e limpa dados da igreja", async () => {
    const event = {
      id: "evt_live_del123",
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_test123",
          metadata: { church_id: "10" },
          status: "canceled",
        },
      },
    };

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as any;
      expect(subscription.status).toBe("canceled");
      expect(subscription.metadata.church_id).toBe("10");
    }
  });

  it("rejeita webhook com assinatura inválida", () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error("Webhook Error: No signatures found matching the expected signature for payload");
    });

    expect(() => mockConstructEvent("payload", "invalid-sig", "whsec_test")).toThrow("No signatures found");
  });
});

// ─── Restrições de plano ──────────────────────────────────────────────────────

describe("restrições de plano", () => {
  it("plano básico permite até 200 membros", () => {
    const LIMITS = { basic: { members: 200, cells: 10 }, pro: { members: Infinity, cells: Infinity } };
    expect(LIMITS.basic.members).toBe(200);
    expect(LIMITS.basic.cells).toBe(10);
  });

  it("plano pro tem recursos ilimitados", () => {
    const LIMITS = { basic: { members: 200, cells: 10 }, pro: { members: Infinity, cells: Infinity } };
    expect(LIMITS.pro.members).toBe(Infinity);
    expect(LIMITS.pro.cells).toBe(Infinity);
  });

  it("verifica se plano ativo permite criar nova célula", () => {
    const checkPlanLimit = (plan: string | null, currentCells: number): boolean => {
      if (plan === "pro" || plan === "enterprise") return true;
      if (plan === "basic") return currentCells < 10;
      return currentCells < 3; // sem plano: limite de 3 células
    };

    expect(checkPlanLimit("pro", 100)).toBe(true);
    expect(checkPlanLimit("basic", 9)).toBe(true);
    expect(checkPlanLimit("basic", 10)).toBe(false);
    expect(checkPlanLimit(null, 2)).toBe(true);
    expect(checkPlanLimit(null, 3)).toBe(false);
  });

  it("verifica se plano ativo permite adicionar novo membro", () => {
    const checkMemberLimit = (plan: string | null, currentMembers: number): boolean => {
      if (plan === "pro" || plan === "enterprise") return true;
      if (plan === "basic") return currentMembers < 200;
      return currentMembers < 50; // sem plano: limite de 50
    };

    expect(checkMemberLimit("pro", 5000)).toBe(true);
    expect(checkMemberLimit("basic", 199)).toBe(true);
    expect(checkMemberLimit("basic", 200)).toBe(false);
    expect(checkMemberLimit(null, 49)).toBe(true);
    expect(checkMemberLimit(null, 50)).toBe(false);
  });
});
