/**
 * Definição dos planos da plataforma Ide Fazei
 *
 * Preços em centavos (BRL):
 * - Básico:     R$ 97/mês  | R$ 970/ano  (2 meses grátis)
 * - Pro:        R$ 197/mês | R$ 1.970/ano
 * - Enterprise: R$ 397/mês | R$ 3.970/ano
 */

export const PLANS = {
  basic: {
    name: "Básico",
    description: "Ideal para igrejas em crescimento",
    monthlyPrice: 9700,   // R$ 97,00
    yearlyPrice: 97000,   // R$ 970,00
    currency: "brl",
    features: [
      "Até 200 membros",
      "Até 10 células",
      "Módulos: Almas, Consolidação, Batismo",
      "Relatórios básicos",
      "Suporte por e-mail",
    ],
    limits: {
      members: 200,
      cells: 10,
    },
  },
  pro: {
    name: "Pro",
    description: "Para igrejas que querem crescer com propósito",
    monthlyPrice: 19700,  // R$ 197,00
    yearlyPrice: 197000,  // R$ 1.970,00
    currency: "brl",
    features: [
      "Membros ilimitados",
      "Células ilimitadas",
      "Todos os módulos incluídos",
      "Certificados PDF personalizados",
      "Relatórios avançados",
      "Suporte prioritário",
    ],
    limits: {
      members: -1, // ilimitado
      cells: -1,
    },
  },
  enterprise: {
    name: "Enterprise",
    description: "Para redes de igrejas e ministérios",
    monthlyPrice: 39700,  // R$ 397,00
    yearlyPrice: 397000,  // R$ 3.970,00
    currency: "brl",
    features: [
      "Multi-campus (até 10 igrejas)",
      "Membros ilimitados",
      "Todas as funcionalidades Pro",
      "IA Pastoral (M30)",
      "API de integração",
      "Gerente de conta dedicado",
      "SLA 99,9%",
    ],
    limits: {
      members: -1,
      cells: -1,
      campuses: 10,
    },
  },
} as const;

export type PlanKey = keyof typeof PLANS;

export function getPlanByKey(key: string): (typeof PLANS)[PlanKey] | null {
  if (key in PLANS) return PLANS[key as PlanKey];
  return null;
}
