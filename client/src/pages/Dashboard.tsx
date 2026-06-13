import { trpc } from "@/lib/trpc";
import { useChurch } from "@/components/ChurchLayout";
import {
  AlertTriangle,
  BookOpen,
  ChevronRight,
  Flame,
  Globe,
  Heart,
  Layers,
  Music,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
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

// ─── MAIN DASHBOARD ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const { churchId } = useChurch();
  const { data: stats, isLoading } = trpc.dashboard.stats.useQuery({ churchId });

  const metrics = [
    {
      icon: Users,
      label: "Membros Ativos",
      value: stats?.totalMembers ?? 0,
      color: "#1e3a5f",
      sub: "Total de pessoas ativas",
    },
    {
      icon: Flame,
      label: "Novas Almas",
      value: stats?.newSouls ?? 0,
      color: "#f59e0b",
      sub: "Aguardando consolidação",
    },
    {
      icon: Heart,
      label: "Consolidados",
      value: stats?.consolidated ?? 0,
      color: "#22c55e",
      sub: "Processo concluído",
    },
    {
      icon: Globe,
      label: "Células Ativas",
      value: stats?.totalCells ?? 0,
      color: "#6366f1",
      sub: "Grupos em funcionamento",
    },
    {
      icon: Users,
      label: "Líderes",
      value: stats?.totalLeaders ?? 0,
      color: "#c9a84c",
      sub: "Pastores, supervisores e líderes",
    },
    {
      icon: Music,
      label: "Ministérios",
      value: stats?.totalMinistries ?? 0,
      color: "#f43f5e",
      sub: "Ministérios ativos",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-navy">Dashboard Executivo</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visão geral do crescimento e discipulado
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-gold font-medium bg-gold/10 px-3 py-1.5 rounded-full border border-gold/20">
          Ganhar → Consolidar → Discipular → Multiplicar
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 animate-stagger">
        {metrics.map((m) => (
          <MetricCard key={m.label} {...m} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FunilVisual churchId={churchId} />
        <RadarEspiritual churchId={churchId} />
      </div>

      {/* Tree */}
      <ArvoreDiscipulado churchId={churchId} />
    </div>
  );
}
