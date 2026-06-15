import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Check, X, Zap, Crown, Building2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { toast } from "sonner";

const PLANS = [
  {
    id: "basico",
    name: "Básico",
    icon: Zap,
    price: { monthly: 97, annual: 77 },
    description: "Ideal para igrejas que estão começando sua jornada digital",
    color: "border-[#c9a84c]/30",
    badge: null,
    features: {
      members: "Até 200 membros",
      cells: "Até 10 células",
      users: "Até 5 usuários",
      storage: "1 GB de armazenamento",
    },
    included: [
      "Cadastro de pessoas",
      "Gestão de famílias",
      "Módulo Ganhar Almas",
      "Consolidação básica",
      "Funil de Discipulado",
      "Células (básico)",
      "Eventos",
      "Mural de avisos",
      "Portal do Visitante",
      "Suporte por email",
    ],
    excluded: [
      "Mapa geográfico de células",
      "Radar Espiritual",
      "Árvore de Discipulado",
      "Biblioteca Digital",
      "Relatórios avançados",
      "API de integração",
      "Suporte prioritário",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    icon: Crown,
    price: { monthly: 197, annual: 157 },
    description: "Para igrejas em crescimento que precisam de ferramentas completas",
    color: "border-[#1e3a5f]",
    badge: "Mais popular",
    features: {
      members: "Até 1.000 membros",
      cells: "Até 50 células",
      users: "Até 20 usuários",
      storage: "10 GB de armazenamento",
    },
    included: [
      "Tudo do Básico",
      "Mapa geográfico de células",
      "Radar Espiritual",
      "Árvore de Discipulado",
      "Biblioteca Digital",
      "Ministérios e Escalas",
      "Pedidos de Oração",
      "Relatórios avançados",
      "Dashboard executivo completo",
      "Notificações automáticas",
      "Suporte prioritário",
    ],
    excluded: [
      "API de integração",
      "Múltiplas filiais",
      "White-label",
      "Gerente de conta dedicado",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    icon: Building2,
    price: { monthly: 497, annual: 397 },
    description: "Para denominações e redes de igrejas com múltiplas unidades",
    color: "border-[#c9a84c]",
    badge: "Completo",
    features: {
      members: "Membros ilimitados",
      cells: "Células ilimitadas",
      users: "Usuários ilimitados",
      storage: "100 GB de armazenamento",
    },
    included: [
      "Tudo do Pro",
      "Múltiplas filiais",
      "API de integração",
      "White-label completo",
      "Relatórios consolidados",
      "Gerente de conta dedicado",
      "Treinamento personalizado",
      "SLA garantido 99,9%",
      "Backup diário",
      "Migração assistida",
      "Suporte 24/7",
    ],
    excluded: [],
  },
];

const PLAN_IDS: Record<string, "basic" | "pro" | "enterprise"> = {
  basico: "basic",
  pro: "pro",
  enterprise: "enterprise",
};

export default function Planos() {
  const [annual, setAnnual] = useState(false);
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const checkoutMutation = trpc.stripe.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      if (data.url) window.open(data.url, "_blank");
      toast.info("Redirecionando para o checkout Stripe...");
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao iniciar checkout");
    },
  });

  function handleSelectPlan(planId: string) {
    if (!user) {
      navigate("/cadastro-igreja");
      return;
    }
    const churchId = (user as { churchId?: number })?.churchId ?? 0;
    checkoutMutation.mutate({
      plan: PLAN_IDS[planId],
      churchId,
      origin: window.location.origin,
      interval: annual ? "year" : "month",
    });
  }

  return (
    <div className="min-h-screen bg-[#f5f0e8]">
      {/* Sacred geometry background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden opacity-[0.04]" aria-hidden="true">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <circle cx="50%" cy="30%" r="400" fill="none" stroke="#c9a84c" strokeWidth="1" />
          <circle cx="50%" cy="30%" r="600" fill="none" stroke="#c9a84c" strokeWidth="0.7" />
          <circle cx="20%" cy="60%" r="300" fill="none" stroke="#c9a84c" strokeWidth="0.8" />
          <circle cx="80%" cy="70%" r="250" fill="none" stroke="#c9a84c" strokeWidth="0.6" />
        </svg>
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-[#1e3a5f]/10 bg-[#f5f0e8]/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/">
            <div className="flex items-center gap-3 cursor-pointer">
              <div className="w-8 h-8 bg-[#1e3a5f] rounded-lg flex items-center justify-center">
                <span className="text-[#c9a84c] text-sm font-bold">✦</span>
              </div>
              <div>
                <div className="font-serif font-bold text-[#1e3a5f] text-lg leading-none">Lampas</div>
                <div className="text-[10px] tracking-[0.2em] text-[#c9a84c] uppercase">Plataforma Ministerial</div>
              </div>
            </div>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-[#1e3a5f]/60 hover:text-[#1e3a5f]">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>
        </div>
      </header>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-16">
        {/* Title */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#c9a84c]/30 bg-[#c9a84c]/5 mb-6">
            <span className="text-[#c9a84c] text-xs tracking-widest uppercase font-medium">Planos e Preços</span>
          </div>
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-[#1e3a5f] mb-4">
            Escolha o plano ideal<br />para sua igreja
          </h1>
          <p className="font-serif italic text-[#1e3a5f]/60 text-lg max-w-2xl mx-auto">
            Todos os planos incluem 14 dias de teste gratuito. Sem cartão de crédito.
          </p>

          {/* Toggle anual/mensal */}
          <div className="flex items-center justify-center gap-4 mt-8">
            <span className={`text-sm font-medium ${!annual ? "text-[#1e3a5f]" : "text-[#1e3a5f]/40"}`}>Mensal</span>
            <button
              onClick={() => setAnnual(!annual)}
              className={`relative w-12 h-6 rounded-full transition-colors ${annual ? "bg-[#1e3a5f]" : "bg-[#1e3a5f]/20"}`}
            >
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${annual ? "translate-x-7" : "translate-x-1"}`} />
            </button>
            <span className={`text-sm font-medium ${annual ? "text-[#1e3a5f]" : "text-[#1e3a5f]/40"}`}>
              Anual
              <span className="ml-2 text-xs text-[#c9a84c] font-semibold">-20%</span>
            </span>
          </div>
        </div>

        {/* Plans grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {PLANS.map((plan) => {
            const Icon = plan.icon;
            const price = annual ? plan.price.annual : plan.price.monthly;
            const isPopular = plan.badge === "Mais popular";
            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl border-2 ${plan.color} p-8 shadow-sm hover:shadow-md transition-shadow ${isPopular ? "ring-2 ring-[#1e3a5f]/20" : ""}`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className={`${isPopular ? "bg-[#1e3a5f] text-white" : "bg-[#c9a84c] text-white"} px-4 py-1`}>
                      {plan.badge}
                    </Badge>
                  </div>
                )}

                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isPopular ? "bg-[#1e3a5f]" : "bg-[#1e3a5f]/10"}`}>
                    <Icon className={`w-5 h-5 ${isPopular ? "text-white" : "text-[#1e3a5f]"}`} />
                  </div>
                  <div>
                    <h3 className="font-serif font-bold text-[#1e3a5f] text-xl">{plan.name}</h3>
                  </div>
                </div>

                <p className="text-[#1e3a5f]/60 text-sm mb-6">{plan.description}</p>

                <div className="mb-6">
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-bold text-[#1e3a5f]">R$ {price}</span>
                    <span className="text-[#1e3a5f]/40 text-sm mb-1">/mês</span>
                  </div>
                  {annual && (
                    <p className="text-xs text-[#c9a84c] mt-1">Cobrado anualmente · R$ {price * 12}/ano</p>
                  )}
                </div>

                {/* Features */}
                <div className="space-y-1 mb-6 p-4 bg-[#f5f0e8]/50 rounded-xl">
                  {Object.values(plan.features).map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-[#1e3a5f]/70">
                      <span className="text-[#c9a84c]">✦</span>
                      {f}
                    </div>
                  ))}
                </div>

                <Button
                  className={`w-full ${isPopular ? "bg-[#1e3a5f] hover:bg-[#162d4a] text-white" : "bg-[#1e3a5f]/10 hover:bg-[#1e3a5f]/20 text-[#1e3a5f]"}`}
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={checkoutMutation.isPending}
                >
                  {checkoutMutation.isPending ? "Aguarde..." : user ? "Assinar agora" : "Começar gratuitamente"}
                </Button>

                <div className="mt-6 space-y-2">
                  {plan.included.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-[#1e3a5f]/70">
                      <Check className="w-4 h-4 text-green-500 shrink-0" />
                      {f}
                    </div>
                  ))}
                  {plan.excluded.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-[#1e3a5f]/30">
                      <X className="w-4 h-4 shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
          <h2 className="font-serif text-2xl font-bold text-[#1e3a5f] text-center mb-8">Perguntas frequentes</h2>
          <div className="space-y-4">
            {[
              { q: "Posso mudar de plano a qualquer momento?", a: "Sim. Você pode fazer upgrade ou downgrade do seu plano a qualquer momento. As mudanças são aplicadas imediatamente." },
              { q: "O período de teste é realmente gratuito?", a: "Sim, 14 dias completamente gratuitos, sem necessidade de cartão de crédito. Você só paga se decidir continuar." },
              { q: "Como funciona o suporte?", a: "Todos os planos incluem suporte por email. O plano Pro inclui suporte prioritário com resposta em até 4 horas. O Enterprise inclui suporte 24/7 e gerente dedicado." },
              { q: "Meus dados ficam seguros?", a: "Sim. Cada igreja tem seus dados completamente isolados. Utilizamos criptografia em trânsito e em repouso, com backups automáticos diários." },
              { q: "Posso exportar meus dados?", a: "Sim. Você pode exportar todos os seus dados a qualquer momento em formato CSV ou Excel." },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-xl p-6 border border-[#1e3a5f]/10">
                <h3 className="font-semibold text-[#1e3a5f] mb-2">{item.q}</h3>
                <p className="text-[#1e3a5f]/60 text-sm">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
