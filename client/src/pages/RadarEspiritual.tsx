import { useChurch } from "@/components/ChurchLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, ArrowRight, BookOpen, CheckCircle2, CircleAlert, Clock3, HeartHandshake, PhoneCall, RefreshCw, ShieldCheck, Users, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const priorityConfig = {
  alta: { label: "Prioridade alta", short: "Alta", card: "border-rose-200 bg-rose-50/60", badge: "border-rose-200 bg-rose-100 text-rose-700", icon: "text-rose-700" },
  media: { label: "Atenção", short: "Atenção", card: "border-amber-200 bg-amber-50/60", badge: "border-amber-200 bg-amber-100 text-amber-800", icon: "text-amber-700" },
  normal: { label: "Acompanhamento", short: "Em dia", card: "border-emerald-200 bg-emerald-50/60", badge: "border-emerald-200 bg-emerald-100 text-emerald-700", icon: "text-emerald-700" },
} as const;

const stageLabels: Record<string, string> = {
  nova_alma: "Nova Alma",
  consolidacao: "Consolidação",
  fundamentos: "Fundamentos",
  celula: "Célula",
  batismo: "Batismo",
  encontro_com_deus: "Encontro com Deus",
  escola_de_lideres: "Escola de Líderes",
  lideranca: "Liderança",
  multiplicador: "Multiplicador",
};

const signalIcons: Record<string, typeof Users> = {
  consolidacao_pendente: HeartHandshake,
  primeiro_contato_pendente: PhoneCall,
  visita_pendente: Clock3,
  follow_up_vencido: Clock3,
  sem_responsavel: ShieldCheck,
  sem_celula: Users,
  sem_discipulador: Users,
  ausencias_recentes: CircleAlert,
  pedido_oracao_pendente: HeartHandshake,
  sem_formacao: BookOpen,
};

type SignalFilter = "todos" | "consolidacao_pendente" | "primeiro_contato_pendente" | "visita_pendente" | "follow_up_vencido" | "sem_responsavel" | "sem_celula" | "sem_discipulador" | "ausencias_recentes" | "pedido_oracao_pendente" | "sem_formacao";
type PriorityFilter = "todas" | "alta" | "media" | "normal";

export default function RadarEspiritual() {
  const { churchId } = useChurch();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const radar = trpc.radar.list.useQuery({ churchId });
  const [signalFilter, setSignalFilter] = useState<SignalFilter>("todos");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("todas");
  const registerFirstContact = trpc.care.registerFirstContact.useMutation({
    onSuccess: async () => {
      toast.success("Primeiro contato registrado.");
      await Promise.all([
        utils.radar.list.invalidate({ churchId }),
        utils.care.myQueue.invalidate({ churchId }),
        utils.dashboard.careAttention.invalidate({ churchId }),
        utils.dashboard.radarEspiritual.invalidate({ churchId }),
      ]);
    },
    onError: (error) => toast.error(error.message || "Não foi possível registrar o contato."),
  });

  const items = useMemo(() => (radar.data?.items ?? []).filter((item) => {
    const matchesPriority = priorityFilter === "todas" || item.priority === priorityFilter;
    const matchesSignal = signalFilter === "todos" || item.signals.some((signal) => signal.key === signalFilter);
    return matchesPriority && matchesSignal;
  }), [radar.data?.items, priorityFilter, signalFilter]);

  function openPerson(personId: number) {
    navigate(`/app/pessoas?personId=${personId}`);
  }

  function openAction(item: (typeof items)[number]) {
    const key = item.signals.find((signal) => signal.severity === "alta")?.key ?? item.signals[0]?.key;
    if (key === "consolidacao_pendente" || key === "primeiro_contato_pendente" || key === "follow_up_vencido" || key === "visita_pendente") {
      navigate("/app/consolidacao");
    } else if (key === "sem_celula") {
      navigate("/app/celulas");
    } else {
      openPerson(item.person.id);
    }
  }

  const summary = radar.data?.summary;
  const hasActiveFilters = signalFilter !== "todos" || priorityFilter !== "todas";

  return (
    <div className="space-y-5 sm:space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 shadow-sm">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-navy sm:text-3xl">Radar Espiritual</h1>
              <p className="mt-1 text-sm text-muted-foreground">Sinais objetivos para orientar o cuidado pastoral.</p>
            </div>
          </div>
          <div className="mt-3 flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50/70 p-3 text-xs text-sky-900 sm:max-w-2xl">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />
            <p>O Radar não diagnostica a vida espiritual. Ele reúne registros de acompanhamento e mostra o motivo de cada sinal para apoiar uma abordagem cuidadosa.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" onClick={() => radar.refetch()} disabled={radar.isFetching}>
            <RefreshCw className={`h-4 w-4 ${radar.isFetching ? "animate-spin" : ""}`} /> Atualizar
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => navigate("/app/cuidado")}>
            <HeartHandshake className="h-4 w-4" /> Central de Cuidado
          </Button>
        </div>
      </header>

      {!radar.isLoading && radar.data?.scope.linkedPersonId === null && !radar.data.scope.canManageAll && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Sua conta ainda não está vinculada a uma Pessoa.</p>
          <p className="mt-1 text-xs">Peça a um pastor para fazer o vínculo em Configurações → Perfis e Hierarquia. O Radar mostrará somente pessoas sob sua responsabilidade.</p>
        </div>
      )}

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        <div className="card-sacred p-4"><p className="text-2xl font-bold font-display text-rose-700">{summary?.alta ?? 0}</p><p className="mt-1 text-xs font-medium text-muted-foreground">Prioridade alta</p></div>
        <div className="card-sacred p-4"><p className="text-2xl font-bold font-display text-amber-700">{summary?.media ?? 0}</p><p className="mt-1 text-xs font-medium text-muted-foreground">Atenção</p></div>
        <div className="card-sacred p-4"><p className="text-2xl font-bold font-display text-emerald-700">{summary?.normal ?? 0}</p><p className="mt-1 text-xs font-medium text-muted-foreground">Acompanhamento</p></div>
        <div className="card-sacred p-4"><p className="text-2xl font-bold font-display text-navy">{summary?.peopleWithSignals ?? 0}</p><p className="mt-1 text-xs font-medium text-muted-foreground">Pessoas com sinal</p></div>
      </section>

      <section className="card-sacred space-y-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div><h2 className="font-display text-lg font-bold text-navy">Fila de atenção</h2><p className="mt-1 text-xs text-muted-foreground">Ordenada por pontuação explicável, sem substituir o discernimento da liderança.</p></div>
          {hasActiveFilters && <Button variant="ghost" className="w-fit text-xs" onClick={() => { setSignalFilter("todos"); setPriorityFilter("todas"); }}>Limpar filtros</Button>}
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Filtrar por prioridade">
          {(["todas", "alta", "media", "normal"] as const).map((priority) => (
            <Button key={priority} type="button" size="sm" variant={priorityFilter === priority ? "default" : "outline"} className={priorityFilter === priority ? "bg-navy text-white hover:bg-navy-light" : ""} onClick={() => setPriorityFilter(priority)}>
              {priority === "todas" ? "Todas" : priorityConfig[priority].short}
            </Button>
          ))}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Filtrar por sinal">
          <Button type="button" size="sm" variant={signalFilter === "todos" ? "secondary" : "outline"} onClick={() => setSignalFilter("todos")} className="shrink-0">Todos os sinais</Button>
          {(radar.data?.availableSignals ?? []).map((signal) => (
            <Button key={signal.key} type="button" size="sm" variant={signalFilter === signal.key ? "secondary" : "outline"} onClick={() => setSignalFilter(signal.key as SignalFilter)} className="shrink-0">{signal.label}</Button>
          ))}
        </div>
      </section>

      {radar.isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((key) => <div key={key} className="h-48 animate-pulse rounded-xl bg-muted" />)}</div>
      ) : radar.isError ? (
        <div className="card-sacred flex flex-col items-center gap-3 p-10 text-center"><AlertTriangle className="h-8 w-8 text-rose-600" /><p className="font-semibold text-navy">Não foi possível carregar o Radar</p><Button variant="outline" onClick={() => radar.refetch()}>Tentar novamente</Button></div>
      ) : items.length === 0 ? (
        <div className="card-sacred flex flex-col items-center gap-3 p-10 text-center"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-6 w-6" /></div><p className="font-semibold text-navy">{hasActiveFilters ? "Nenhuma pessoa neste filtro" : "Nenhum sinal pendente"}</p><p className="max-w-md text-sm text-muted-foreground">{hasActiveFilters ? "Experimente limpar os filtros para visualizar a fila completa." : "Quando houver registros que indiquem atenção, eles aparecerão aqui com o motivo e o próximo passo."}</p></div>
      ) : (
        <section className="space-y-3">
          {items.map((item) => {
            const config = priorityConfig[item.priority];
            return (
              <article key={item.person.id} className={`rounded-2xl border p-4 sm:p-5 ${config.card}`}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><h2 className="font-display text-lg font-bold text-navy">{item.person.fullName}</h2><Badge variant="outline" className={config.badge}>{config.label}</Badge><Badge variant="outline" className="border-slate-200 bg-white/70 text-slate-700">Pontuação {item.score}</Badge></div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground"><span>Etapa: {stageLabels[item.person.discipleshipStage ?? ""] ?? "Não informada"}</span>{item.cell && <span>Célula: {item.cell.name}</span>}{item.careAssignment && <span>Responsável definido</span>}</div>
                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      {item.signals.map((signal) => { const Icon = signalIcons[signal.key] ?? CircleAlert; return <div key={signal.key} className="rounded-xl border border-white/70 bg-white/75 p-3"><div className="flex items-start gap-2"><Icon className={`mt-0.5 h-4 w-4 shrink-0 ${priorityConfig[signal.severity].icon}`} /><div className="min-w-0"><p className="text-sm font-semibold text-navy">{signal.label}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{signal.evidence}</p></div></div></div>; })}
                    </div>
                  </div>
                  <div className="flex w-full flex-col gap-2 lg:w-48 lg:shrink-0">
                    <div className="rounded-xl border border-white/70 bg-white/70 p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Próximo passo</p><p className="mt-1 text-sm font-semibold text-navy">{item.nextAction}</p></div>
                    {item.signals.some((signal) => signal.key === "primeiro_contato_pendente") && <Button className="gap-2 bg-navy text-white hover:bg-navy-light" onClick={() => registerFirstContact.mutate({ churchId, personId: item.person.id })} disabled={registerFirstContact.isPending}><PhoneCall className="h-4 w-4" />{registerFirstContact.isPending ? "Registrando…" : "Registrar contato"}</Button>}
                    <Button variant="outline" className="gap-2" onClick={() => openAction(item)}>Abrir ação <ArrowRight className="h-4 w-4" /></Button>
                    <Button variant="ghost" className="gap-2" onClick={() => openPerson(item.person.id)}>Abrir ficha <ArrowRight className="h-4 w-4" /></Button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      <p className="flex items-start gap-2 text-xs text-muted-foreground"><ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />Os sinais são calculados somente com registros do seu tenant e respeitam a responsabilidade pastoral da sua conta.</p>
    </div>
  );
}
