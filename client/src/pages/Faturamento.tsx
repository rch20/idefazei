import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useChurch } from "@/components/ChurchLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  CreditCard,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ExternalLink,
  Zap,
  Crown,
  Building2,
  ArrowRight,
} from "lucide-react";

const PLAN_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  basic: { label: "Básico", icon: <Zap className="h-4 w-4" />, color: "bg-blue-100 text-blue-800" },
  pro: { label: "Pro", icon: <Crown className="h-4 w-4" />, color: "bg-purple-100 text-purple-800" },
  enterprise: { label: "Enterprise", icon: <Building2 className="h-4 w-4" />, color: "bg-amber-100 text-amber-800" },
};

const STATUS_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  active: { label: "Ativa", icon: <CheckCircle className="h-4 w-4" />, color: "bg-green-100 text-green-800" },
  trialing: { label: "Período de Teste", icon: <CheckCircle className="h-4 w-4" />, color: "bg-blue-100 text-blue-800" },
  past_due: { label: "Pagamento Pendente", icon: <AlertTriangle className="h-4 w-4" />, color: "bg-yellow-100 text-yellow-800" },
  canceled: { label: "Cancelada", icon: <XCircle className="h-4 w-4" />, color: "bg-red-100 text-red-800" },
};

const PLANS = [
  {
    key: "basic" as const,
    name: "Básico",
    icon: <Zap className="h-6 w-6 text-blue-600" />,
    monthlyPrice: "R$ 97",
    yearlyPrice: "R$ 970",
    description: "Ideal para igrejas em crescimento",
    features: ["Até 200 membros", "Até 10 células", "Módulos essenciais", "Relatórios básicos", "Suporte por e-mail"],
    color: "border-blue-200",
    highlight: false,
  },
  {
    key: "pro" as const,
    name: "Pro",
    icon: <Crown className="h-6 w-6 text-purple-600" />,
    monthlyPrice: "R$ 197",
    yearlyPrice: "R$ 1.970",
    description: "Para igrejas que querem crescer com propósito",
    features: ["Membros ilimitados", "Células ilimitadas", "Todos os módulos", "Certificados PDF", "Suporte prioritário"],
    color: "border-purple-400",
    highlight: true,
  },
  {
    key: "enterprise" as const,
    name: "Enterprise",
    icon: <Building2 className="h-6 w-6 text-amber-600" />,
    monthlyPrice: "R$ 397",
    yearlyPrice: "R$ 3.970",
    description: "Para redes de igrejas e ministérios",
    features: ["Multi-campus (10 igrejas)", "Tudo do Pro", "IA Pastoral", "API de integração", "Gerente dedicado"],
    color: "border-amber-300",
    highlight: false,
  },
];

export default function Faturamento() {
  const { churchId } = useChurch();
  const [, navigate] = useLocation();
  const [interval, setInterval] = useState<"month" | "year">("month");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const { data: subscription, isLoading } = trpc.stripe.getSubscription.useQuery(
    { churchId },
    { enabled: !!churchId }
  );

  const checkoutMutation = trpc.stripe.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.open(data.url, "_blank");
        toast.info("Redirecionando para o checkout...");
      }
      setLoadingPlan(null);
    },
    onError: (err) => {
      toast.error(err.message);
      setLoadingPlan(null);
    },
  });

  const portalMutation = trpc.stripe.createPortalSession.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        window.open(data.url, "_blank");
        toast.info("Abrindo portal de faturamento...");
      }
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  // Mostrar toast de sucesso se voltou do checkout
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "1") {
      toast.success("Assinatura ativada com sucesso! Bem-vindo à Ide Fazei.");
      navigate("/app/faturamento", { replace: true });
    }
    if (params.get("canceled") === "1") {
      toast.info("Checkout cancelado. Você pode assinar quando quiser.");
      navigate("/app/faturamento", { replace: true });
    }
  }, []);

  const handleSubscribe = (planKey: "basic" | "pro" | "enterprise") => {
    if (!churchId) return;
    setLoadingPlan(planKey);
    checkoutMutation.mutate({
      churchId,
      plan: planKey,
      interval,
      origin: window.location.origin,
    });
  };

  const handleOpenPortal = () => {
    if (!churchId) return;
    portalMutation.mutate({ churchId, origin: window.location.origin });
  };

  const currentPlan = PLAN_LABELS[subscription?.plan ?? ""];
  const currentStatus = STATUS_LABELS[subscription?.status ?? ""];

  return (
    <div className="p-6 space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Faturamento</h1>
        <p className="text-muted-foreground mt-1">Gerencie sua assinatura e plano da plataforma Ide Fazei</p>
      </div>

      {/* Status da assinatura atual */}
      {!isLoading && subscription?.hasSubscription && (
        <Card className="border-l-4 border-l-green-500">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-green-600" />
              Assinatura Atual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4 items-center">
              {currentPlan && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Plano:</span>
                  <Badge className={`${currentPlan.color} flex items-center gap-1`}>
                    {currentPlan.icon}
                    {currentPlan.label}
                  </Badge>
                </div>
              )}
              {currentStatus && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Badge className={`${currentStatus.color} flex items-center gap-1`}>
                    {currentStatus.icon}
                    {currentStatus.label}
                  </Badge>
                </div>
              )}
              {subscription?.currentPeriodEnd && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Próxima cobrança:</span>
                  <span className="text-sm font-medium">
                    {new Date(subscription.currentPeriodEnd).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              )}
            </div>
            <Separator />
            <Button
              variant="outline"
              onClick={handleOpenPortal}
              disabled={portalMutation.isPending}
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              {portalMutation.isPending ? "Abrindo..." : "Gerenciar Assinatura"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Use o portal para atualizar forma de pagamento, ver faturas, fazer upgrade/downgrade ou cancelar.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Sem assinatura */}
      {!isLoading && !subscription?.hasSubscription && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-amber-900">Você está no período de avaliação gratuita</p>
                <p className="text-sm text-amber-700 mt-1">
                  Assine um plano para continuar usando a plataforma após o período de teste.
                  Use o cartão <strong>4242 4242 4242 4242</strong> para testar o checkout.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Seletor de intervalo */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Escolha seu Plano</h2>
        <div className="flex items-center gap-2 mb-6">
          <button
            onClick={() => setInterval("month")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              interval === "month"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Mensal
          </button>
          <button
            onClick={() => setInterval("year")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              interval === "year"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            Anual
            <span className="ml-2 text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full">
              2 meses grátis
            </span>
          </button>
        </div>

        {/* Cards de planos */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan) => {
            const isCurrent = subscription?.plan === plan.key;
            const price = interval === "year" ? plan.yearlyPrice : plan.monthlyPrice;
            const period = interval === "year" ? "/ano" : "/mês";

            return (
              <Card
                key={plan.key}
                className={`relative ${plan.color} border-2 ${plan.highlight ? "shadow-lg scale-105" : ""}`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-purple-600 text-white text-xs px-3">Mais Popular</Badge>
                  </div>
                )}
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    {plan.icon}
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                  <div className="mt-3">
                    <span className="text-3xl font-bold text-foreground">{price}</span>
                    <span className="text-muted-foreground text-sm">{period}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={plan.highlight ? "default" : "outline"}
                    disabled={isCurrent || loadingPlan === plan.key}
                    onClick={() => handleSubscribe(plan.key)}
                  >
                    {isCurrent ? (
                      "Plano Atual"
                    ) : loadingPlan === plan.key ? (
                      "Aguarde..."
                    ) : (
                      <span className="flex items-center gap-2">
                        Assinar {plan.name}
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Nota de teste */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            <strong>Modo de teste:</strong> Use o cartão <code className="bg-background px-1 rounded">4242 4242 4242 4242</code>{" "}
            com qualquer data futura e CVC para testar o checkout. Nenhuma cobrança real será feita até que você ative
            as chaves de produção em <strong>Configurações → Pagamento</strong>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
