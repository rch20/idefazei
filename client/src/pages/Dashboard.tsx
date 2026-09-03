import { trpc } from "@/lib/trpc";
import { useChurch } from "@/components/ChurchLayout";
import { ReportButton } from "@/components/ReportButton";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { buildDashboardMetricValues } from "./dashboardMetrics";
import {
  AlertTriangle,
  BookOpen,
  Cake,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Flame,
  Globe,
  Heart,
  Layers,
  Music,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { Link } from "wouter";
import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

// ─── STAGE LABELS ─────────────────────────────────────────────────────────────

const stageConfig: Record<string, { label: string; color: string; badgeClass: string }> = {
  nova_alma: { label: "Nova Alma", color: "#3b82f6", badgeClass: "badge-nova-alma" },
  consolidacao: { label: "Consolidação", color: "#f59e0b", badgeClass: "badge-consolidacao" },
  fundamentos: { label: "Fundamentos", color: "#8b5cf6", badgeClass: "badge-fundamentos" },
  celula: { label: "Célula", color: "#22c55e", badgeClass: "badge-celula" },
  batismo: { label: "Batismo", color: "#06b6d4", badgeClass: "badge-batismo" },
  encontro_com_deus: { label: "Encontro com Deus", color: "#f43f5e", badgeClass: "badge-encontro" },
  escola_de_lideres: { label: "Escola de Líderes", color: "#f97316", badgeClass: "badge-escola" },
  lideranca: { label: "Liderança", color: "#6366f1", badgeClass: "badge-lideranca" },
  multiplicador: { label: "Multiplicador", color: "#10b981", badgeClass: "badge-multiplicador" },
};

// ─── METRIC CARD ──────────────────────────────────────────────────────────────

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sub?: string;
  color?: string;
}) {
  return (
    <div className="metric-card animate-fade-in-up">
      <div className="flex items-start justify-between">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `${color ?? "#1e3a5f"}18` }}
        >
          <Icon className="w-5 h-5" style={{ color: color ?? "#1e3a5f" }} />
        </div>
        <TrendingUp className="w-4 h-4 text-muted-foreground" />
      </div>
      <div>
        <p className="text-2xl font-bold font-display text-navy">{value}</p>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── RADAR ESPIRITUAL ─────────────────────────────────────────────────────────

function RadarEspiritual({ churchId }: { churchId: number }) {
  const { data, isLoading } = trpc.dashboard.radarEspiritual.useQuery({ churchId });

  const items = [
    {
      key: "semCelula",
      label: "Sem Célula",
      desc: "Pessoas não inseridas em célula",
      color: "#f59e0b",
      icon: Globe,
    },
    {
      key: "semDiscipulador",
      label: "Sem Discipulador",
      desc: "Pessoas sem acompanhamento",
      color: "#f43f5e",
      icon: Users,
    },
    {
      key: "semConsolidacao",
      label: "Sem Consolidação",
      desc: "Novas almas sem consolidador",
      color: "#ef4444",
      icon: Heart,
    },
    {
      key: "semCurso",
      label: "Sem Curso",
      desc: "Pessoas sem matrícula em curso",
      color: "#8b5cf6",
      icon: BookOpen,
    },
  ];

  return (
    <div className="card-sacred p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
          <Zap className="w-5 h-5 text-amber-600" />
        </div>
        <div>
          <h2 className="font-display font-bold text-navy text-lg">Radar Espiritual</h2>
          <p className="text-xs text-muted-foreground">Pessoas que precisam de atenção</p>
        </div>
        <Link href="/app/radar" className="ml-auto">
          <Button variant="ghost" size="sm" className="gap-1 text-xs text-navy hover:bg-amber-50">
            Ver detalhes <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const count = (data as any)?.[item.key] ?? 0;
            const isAlert = count > 0;
            return (
              <div
                key={item.key}
                className={`flex items-center gap-4 p-3 rounded-xl border transition-colors ${
                  isAlert
                    ? "bg-red-50/50 border-red-100"
                    : "bg-green-50/50 border-green-100"
                }`}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: `${item.color}18` }}
                >
                  <item.icon className="w-4 h-4" style={{ color: item.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-navy">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="text-2xl font-bold font-display"
                    style={{ color: isAlert ? item.color : "#22c55e" }}
                  >
                    {count}
                  </span>
                  {isAlert && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── FUNIL VISUAL ─────────────────────────────────────────────────────────────

function FunilVisual({ churchId }: { churchId: number }) {
  const { data, isLoading } = trpc.dashboard.discipleshipFunnel.useQuery({ churchId });

  const chartData = (data ?? []).map((d) => ({
    name: stageConfig[d.stage]?.label ?? d.stage,
    value: d.count,
    color: stageConfig[d.stage]?.color ?? "#888",
  }));

  const total = chartData.reduce((s, d) => s + d.value, 0);

  return (
    <div className="card-sacred p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center">
          <Layers className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h2 className="font-display font-bold text-navy text-lg">Funil de Discipulado</h2>
          <p className="text-xs text-muted-foreground">Distribuição por etapa espiritual</p>
        </div>
      </div>

      {isLoading ? (
        <div className="h-48 bg-muted rounded-lg animate-pulse" />
      ) : total === 0 ? (
        <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
          Nenhuma pessoa cadastrada ainda
        </div>
      ) : (
        <div className="flex gap-6 items-center">
          <div className="w-36 h-36 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={65}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [value, "pessoas"]}
                  contentStyle={{
                    background: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 space-y-1.5">
            {chartData.map((d) => (
              <div key={d.name} className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: d.color }}
                />
                <span className="text-xs text-foreground flex-1 truncate">{d.name}</span>
                <span className="text-xs font-semibold text-navy">{d.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ÁRVORE DE DISCIPULADO ────────────────────────────────────────────────────

function ArvoreDiscipulado({ churchId }: { churchId: number }) {
  const { data, isLoading } = trpc.dashboard.discipleshipTree.useQuery({ churchId });

  // Build tree structure
  const roots = (data ?? []).filter((p) => !p.wonById);
  const byWonById = new Map<number, typeof data>();
  (data ?? []).forEach((p) => {
    if (p.wonById) {
      const arr = byWonById.get(p.wonById) ?? [];
      arr.push(p);
      byWonById.set(p.wonById, arr);
    }
  });

  function TreeNode({
    person,
    depth = 0,
  }: {
    person: NonNullable<typeof data>[0];
    depth?: number;
  }) {
    const children = byWonById.get(person.id) ?? [];
    const cfg = stageConfig[person.discipleshipStage ?? "nova_alma"];

    return (
      <div className={`${depth > 0 ? "ml-6 border-l border-dashed border-gold/30 pl-4" : ""}`}>
        <div className="flex items-center gap-2 py-1.5 group">
          <div className="w-7 h-7 rounded-full bg-cream-dark flex items-center justify-center text-xs font-bold text-navy flex-shrink-0">
            {person.fullName.charAt(0)}
          </div>
          <span className="text-sm font-medium text-navy truncate">{person.fullName}</span>
          <span
            className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${cfg?.badgeClass}`}
          >
            {cfg?.label}
          </span>
          {children.length > 0 && (
            <span className="text-xs text-muted-foreground ml-auto">
              {children.length} discípulo{children.length > 1 ? "s" : ""}
            </span>
          )}
        </div>
        {children.slice(0, 5).map((child) => (
          <TreeNode key={child.id} person={child} depth={depth + 1} />
        ))}
        {children.length > 5 && (
          <p className="ml-6 text-xs text-muted-foreground py-1">
            +{children.length - 5} mais...
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="card-sacred p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
          <ChevronRight className="w-5 h-5 text-emerald-600" />
        </div>
        <div>
          <h2 className="font-display font-bold text-navy text-lg">Árvore de Discipulado</h2>
          <p className="text-xs text-muted-foreground">Genealogia espiritual da igreja</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      ) : roots.length === 0 ? (
        <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
          Nenhuma relação de discipulado registrada
        </div>
      ) : (
        <div className="max-h-72 overflow-y-auto space-y-1 pr-2">
          {roots.slice(0, 20).map((root) => (
            <TreeNode key={root.id} person={root} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── ONBOARDING PROGRESS BANNER ──────────────────────────────────────────────

function OnboardingBanner({ churchId }: { churchId: number }) {
  const { data, isLoading } = trpc.onboarding.get.useQuery({ churchId });

  if (isLoading) return null;

  const steps = [
    data?.stepWelcome ?? false,
    data?.stepImportMembers ?? false,
    data?.stepCreateCell ?? false,
    data?.stepInviteLeaders ?? false,
  ];
  const completed = steps.filter(Boolean).length;
  const total = steps.length;
  const pct = Math.round((completed / total) * 100);

  if (pct >= 100) return null;

  return (
    <div className="rounded-xl border border-gold/30 bg-gold/5 px-5 py-4 flex items-center gap-4 animate-fade-in-up">
      <div className="w-10 h-10 rounded-xl bg-gold/15 flex items-center justify-center flex-shrink-0">
        <CheckCircle2 className="w-5 h-5 text-gold" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-sm font-semibold text-navy">
            Configuração inicial da igreja
          </p>
          <span className="text-xs font-bold text-gold">{pct}% concluído</span>
        </div>
        <Progress
          value={pct}
          className="h-1.5 bg-gold/20 [&>div]:bg-gold"
        />
        <p className="text-xs text-muted-foreground mt-1.5">
          {completed} de {total} etapas concluídas
        </p>
      </div>
      <Link
        href="/onboarding"
        className="flex-shrink-0 text-xs font-semibold text-gold hover:text-gold/80 border border-gold/30 rounded-lg px-3 py-1.5 transition-colors hover:bg-gold/10"
      >
        Continuar →
      </Link>
    </div>
  );
}

// ─── SUBSCRIPTION BANNER ────────────────────────────────────────────────────

function SubscriptionBanner({ churchId }: { churchId: number }) {
  const { data: sub, isLoading } = trpc.stripe.getSubscription.useQuery({ churchId });

  const upgradeMutation = trpc.stripe.createCheckoutSession.useMutation({
    onSuccess: (data) => {
      if (data.url) window.open(data.url, "_blank");
    },
  });

  if (isLoading || !sub) return null;

  // Se tem assinatura ativa, mostrar plano atual
  if (sub.status === "active" || sub.status === "trialing") {
    const planLabel: Record<string, string> = { basic: "Básico", pro: "Pro", enterprise: "Enterprise" };
    const label = planLabel[sub.plan ?? ""] ?? sub.plan ?? "Ativo";
    return (
      <div className="rounded-xl border border-[#1e3a5f]/20 bg-[#1e3a5f]/5 px-5 py-3 flex items-center gap-3 animate-fade-in-up">
        <CreditCard className="w-4 h-4 text-[#1e3a5f]/60 flex-shrink-0" />
        <p className="text-sm text-[#1e3a5f]/70 flex-1">
          Plano <strong className="text-[#1e3a5f]">{label}</strong>
          {sub.status === "trialing" && " — período de avaliação"}
        </p>
        <Link href="/app/faturamento" className="text-xs font-semibold text-[#1e3a5f]/60 hover:text-[#1e3a5f] border border-[#1e3a5f]/20 rounded-lg px-3 py-1.5 transition-colors hover:bg-[#1e3a5f]/10">
          Gerenciar assinatura
        </Link>
      </div>
    );
  }

  // Sem assinatura ativa — mostrar banner de upgrade
  return (
    <div className="rounded-xl border border-amber-300/40 bg-amber-50/60 px-5 py-4 flex items-center gap-4 animate-fade-in-up">
      <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
        <CreditCard className="w-5 h-5 text-amber-600" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-900">Você está no período de avaliação gratuita</p>
        <p className="text-xs text-amber-700 mt-0.5">Assine um plano para continuar usando a plataforma após o período de teste.</p>
      </div>
      <button
        onClick={() => upgradeMutation.mutate({ plan: "pro", churchId, origin: window.location.origin })}
        disabled={upgradeMutation.isPending}
        className="flex-shrink-0 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg px-4 py-2 transition-colors disabled:opacity-50"
      >
        {upgradeMutation.isPending ? "Aguarde..." : "Assinar agora"}
      </button>
    </div>
  );
}

// ─── FILA DE CUIDADO ──────────────────────────────────────────────────────────

function CareAttentionPanel({ churchId }: { churchId: number }) {
  const { data, isLoading, isError, refetch } = trpc.dashboard.careAttention.useQuery({ churchId });
  const pending = (data ?? []).filter((item) => item.reasons.length > 0);

  return (
    <section className="card-sacred p-5 sm:p-6" aria-labelledby="care-attention-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-50">
            <Heart className="h-5 w-5 text-rose-600" aria-hidden="true" />
          </div>
          <div>
            <h2 id="care-attention-title" className="font-display text-lg font-bold text-navy">Pessoas que precisam de cuidado</h2>
            <p className="text-xs text-muted-foreground">Pendências claras para a equipe agir com contexto.</p>
          </div>
        </div>
        <span className={`w-fit rounded-full border px-2.5 py-1 text-xs font-semibold ${pending.length > 0 ? "border-rose-200 bg-rose-50 text-rose-700" : "border-green-200 bg-green-50 text-green-700"}`}>
          {pending.length > 0 ? `${pending.length} pendente${pending.length === 1 ? "" : "s"}` : "Tudo em dia"}
        </span>
      </div>

      {isLoading ? (
        <div className="mt-5 space-y-2" aria-label="Carregando pendências de cuidado">
          {[1, 2, 3].map((item) => <div key={item} className="h-14 animate-pulse rounded-lg bg-muted" />)}
        </div>
      ) : isError ? (
        <div className="mt-5 flex flex-col items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Não foi possível carregar a fila de cuidado.
          <Button type="button" variant="outline" size="sm" onClick={() => refetch()}>Tentar novamente</Button>
        </div>
      ) : pending.length === 0 ? (
        <div className="mt-5 rounded-lg border border-green-100 bg-green-50/60 p-4 text-sm text-green-800">
          Nenhuma pendência crítica foi identificada. Continue registrando os contatos e os próximos passos.
        </div>
      ) : (
        <div className="mt-5 space-y-2">
          {pending.slice(0, 5).map((item) => {
            const high = item.priority === "alta";
            return (
              <div key={item.person.id} className="flex flex-col gap-3 rounded-xl border border-border bg-cream-dark/40 p-3 sm:flex-row sm:items-center">
                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${high ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>
                  {item.person.fullName.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-navy">{item.person.fullName}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{item.reasons.join(" · ")}</p>
                  <p className="mt-1 text-xs font-medium text-navy">Próximo passo: {item.nextStep}</p>
                </div>
                <Link href={`/app/pessoas?personId=${item.person.id}&section=cuidado`} className="w-fit rounded-lg border border-navy/20 px-3 py-1.5 text-xs font-semibold text-navy transition-colors hover:bg-navy/5">
                  Ver pessoa
                </Link>
              </div>
            );
          })}
          {pending.length > 5 && <p className="pt-1 text-center text-xs text-muted-foreground">Mostrando 5 de {pending.length} pendências.</p>}
        </div>
      )}
    </section>
  );
}

function BirthdayTodayCard({ churchId }: { churchId: number }) {
  const today = useMemo(() => new Date(), []);
  const birthdaysQuery = trpc.people.birthdays.useQuery({
    churchId,
    month: today.getMonth() + 1,
    day: today.getDate(),
  });
  const birthdays = birthdaysQuery.data ?? [];

  return (
    <section className="card-sacred p-5" aria-labelledby="birthday-today-title">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold"><Cake className="h-5 w-5" aria-hidden="true" /></div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div><h2 id="birthday-today-title" className="font-display text-lg font-bold text-navy">Aniversariantes de hoje</h2><p className="mt-0.5 text-xs text-muted-foreground">Um lembrete para cuidar e celebrar.</p></div>
            <Link href="/app/pessoas?view=birthdays" className="shrink-0"><Button type="button" variant="ghost" size="sm" className="gap-1 text-xs text-navy hover:bg-gold/10">Ver lista <ChevronRight className="h-3.5 w-3.5" /></Button></Link>
          </div>
          {birthdaysQuery.isLoading ? <div className="mt-4 h-10 animate-pulse rounded-lg bg-muted" aria-label="Carregando aniversariantes" /> : birthdaysQuery.isError ? <p className="mt-4 text-sm text-muted-foreground">Não foi possível carregar a lista agora.</p> : birthdays.length === 0 ? <p className="mt-4 rounded-lg bg-muted/40 px-3 py-2 text-sm text-muted-foreground">Nenhum aniversariante registrado hoje.</p> : <div className="mt-4 flex flex-wrap gap-2">{birthdays.slice(0, 4).map((person) => <span key={person.id} className="rounded-full border border-gold/25 bg-gold/5 px-3 py-1.5 text-xs font-medium text-navy">{person.fullName}</span>)}{birthdays.length > 4 && <span className="rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground">+{birthdays.length - 4}</span>}</div>}
        </div>
      </div>
    </section>
  );
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const { churchId } = useChurch();
  const utils = trpc.useUtils();
  const { data: stats, isLoading, isError } = trpc.dashboard.stats.useQuery({ churchId });
  const metricValues = buildDashboardMetricValues(stats);

  const metrics = metricValues ? [
    {
      icon: Users,
      label: "Pessoas ativas",
      value: metricValues.totalMembers,
      color: "#1e3a5f",
      sub: "Pessoas cadastradas na igreja",
    },
    {
      icon: Flame,
      label: "Novas Almas",
      value: metricValues.newSouls,
      color: "#f59e0b",
      sub: "Aguardando consolidação",
    },
    {
      icon: Heart,
      label: "Consolidados",
      value: metricValues.consolidated,
      color: "#22c55e",
      sub: "Processo concluído",
    },
    {
      icon: Globe,
      label: "Células em funcionamento",
      value: metricValues.totalCells,
      color: "#6366f1",
      sub: "Grupos em funcionamento",
    },
    {
      icon: Users,
      label: "Líderes",
      value: metricValues.totalLeaders,
      color: "#c9a84c",
      sub: "Pessoas com responsabilidade",
    },
    {
      icon: Music,
      label: "Ministérios",
      value: metricValues.totalMinistries,
      color: "#f43f5e",
      sub: "Ministérios ativos",
    },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Onboarding Progress Banner */}
      <OnboardingBanner churchId={churchId} />
      {/* Subscription Plan Banner */}
      <SubscriptionBanner churchId={churchId} />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-navy">Visão geral da igreja</h1>
          <p className="text-sm text-muted-foreground mt-1">
            O que precisa da sua atenção e como a igreja está avançando
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 text-xs text-gold font-medium bg-gold/10 px-3 py-1.5 rounded-full border border-gold/20">
            Receber → Direcionar → Cuidar → Desenvolver
          </div>
          <ReportButton
            label="Exportar Relatório"
            onFetch={() => utils.reports.dashboard.fetch({ churchId })}
          />
        </div>
      </div>

      {/* Metrics Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6" aria-label="Carregando métricas do Dashboard">
          {[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="h-36 animate-pulse rounded-xl bg-muted" />)}
        </div>
      ) : isError || !metricValues ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Não foi possível carregar as métricas do Dashboard. Atualize a página para tentar novamente.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 animate-stagger md:grid-cols-3 lg:grid-cols-6">
          {metrics.map((m) => (
            <MetricCard key={m.label} {...m} />
          ))}
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FunilVisual churchId={churchId} />
        <RadarEspiritual churchId={churchId} />
      </div>

      <BirthdayTodayCard churchId={churchId} />

      <CareAttentionPanel churchId={churchId} />

      {/* Tree */}
      <ArvoreDiscipulado churchId={churchId} />
    </div>
  );
}
