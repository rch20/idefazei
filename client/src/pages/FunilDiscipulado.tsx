import { useMemo, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { Check, Circle, CircleDot, Search } from "lucide-react";
import { useChurch } from "@/components/ChurchLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { AdaptiveFormDialogBody, AdaptiveFormDialogContent, AdaptiveFormDialogFooter, adaptiveFormDialogHeaderClassName } from "@/components/AdaptiveFormDialog";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";

const STAGES = [
  { key: "nova_alma", label: "Nova Alma", short: "Nova alma" },
  { key: "consolidacao", label: "Consolidação", short: "Consolid." },
  { key: "fundamentos", label: "Fundamentos", short: "Fundam." },
  { key: "batismo", label: "Batismo", short: "Batismo" },
  { key: "encontro_com_deus", label: "Encontro com Deus", short: "Encontro" },
  { key: "escola_de_lideres", label: "Escola de Líderes", short: "Escola" },
  { key: "lideranca", label: "Liderança", short: "Liderança" },
  { key: "multiplicador", label: "Multiplicador", short: "Multipl." },
] as const;

type StageKey = (typeof STAGES)[number]["key"];
type StageStatus = "concluida" | "pendente" | "nao_registrada";
type FilterKey = "todas" | "sem_batismo" | "sem_encontro" | "encontro_sem_batismo" | "sem_fundamentos" | "sem_registro";

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: "todas", label: "Todas" },
  { key: "sem_batismo", label: "Ainda não batizadas" },
  { key: "sem_encontro", label: "Sem Encontro com Deus" },
  { key: "encontro_sem_batismo", label: "Encontro sem Batismo" },
  { key: "sem_fundamentos", label: "Sem Fundamentos" },
  { key: "sem_registro", label: "Sem nenhuma etapa" },
];

const PAGE_SIZE = 60;

const STATUS_LABEL: Record<StageStatus, string> = { concluida: "Concluída", pendente: "A fazer", nao_registrada: "Sem registro" };

type CellTarget = { personId: number; personName: string; stage: StageKey; status: StageStatus } | null;

function StatusIcon({ status }: { status: StageStatus }) {
  if (status === "concluida") return <Check className="h-4 w-4 text-emerald-700" aria-hidden="true" />;
  if (status === "pendente") return <CircleDot className="h-4 w-4 text-amber-600" aria-hidden="true" />;
  return <Circle className="h-4 w-4 text-slate-300" aria-hidden="true" />;
}

const STATUS_CELL: Record<StageStatus, string> = {
  concluida: "border-emerald-200 bg-emerald-50",
  pendente: "border-amber-200 bg-amber-50",
  nao_registrada: "border-slate-200 bg-white",
};

export default function FunilDiscipulado() {
  const { churchId } = useChurch();
  const [filter, setFilter] = useState<FilterKey>("todas");
  const [search, setSearch] = useState("");
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [target, setTarget] = useState<CellTarget>(null);

  const { data: people, isLoading, isError: peopleError, refetch: refetchPeople } = trpc.people.list.useQuery({ churchId });
  const boardQuery = trpc.people.journeyBoard.useQuery({ churchId });
  const { data: journeyScope } = trpc.people.journeyScope.useQuery({ churchId });
  const updateStage = trpc.people.updateJourneyStage.useMutation({
    onSuccess: async () => {
      setTarget(null);
      await Promise.all([boardQuery.refetch(), refetchPeople()]);
      toast.success("Etapa atualizada no prontuário.");
    },
    onError: (error) => toast.error(error.message || "Não foi possível atualizar a etapa."),
  });

  const canEditPerson = (personId: number) => Boolean(journeyScope?.canManageAll || journeyScope?.personIds.includes(personId));

  // Estado de cada etapa de cada pessoa, vindo do mesmo registro do Prontuário.
  const statusByPerson = useMemo(() => {
    const map = new Map<number, Map<string, StageStatus>>();
    for (const row of boardQuery.data ?? []) {
      const byStage = map.get(row.personId) ?? new Map<string, StageStatus>();
      byStage.set(row.stage, row.status as StageStatus);
      map.set(row.personId, byStage);
    }
    return map;
  }, [boardQuery.data]);

  const statusOf = (personId: number, stage: StageKey): StageStatus => statusByPerson.get(personId)?.get(stage) ?? "nao_registrada";

  const legacyCellPeople = (people ?? []).filter((person) => person.discipleshipStage === "celula");

  const rows = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("pt-BR");
    return (people ?? []).filter((person) => {
      if (query && !String(person.fullName ?? "").toLocaleLowerCase("pt-BR").includes(query)) return false;
      const done = (stage: StageKey) => (statusByPerson.get(person.id)?.get(stage) ?? "nao_registrada") === "concluida";
      switch (filter) {
        case "sem_batismo": return !done("batismo");
        case "sem_encontro": return !done("encontro_com_deus");
        case "encontro_sem_batismo": return done("encontro_com_deus") && !done("batismo");
        case "sem_fundamentos": return !done("fundamentos");
        case "sem_registro": return !STAGES.some((stage) => (statusByPerson.get(person.id)?.get(stage.key) ?? "nao_registrada") !== "nao_registrada");
        default: return true;
      }
    });
  }, [people, search, filter, statusByPerson]);

  const shown = rows.slice(0, visible);
  const stageLabel = (key: string) => STAGES.find((stage) => stage.key === key)?.label ?? key;
  const loading = isLoading || boardQuery.isLoading;

  function act(status: StageStatus) {
    if (!target) return;
    updateStage.mutate({ churchId, id: target.personId, stage: target.stage, status });
  }

  const targetOptions: Array<{ status: StageStatus; label: string; primary?: boolean }> = !target
    ? []
    : target.status === "concluida"
      ? [{ status: "pendente", label: "Reabrir etapa (a fazer)" }]
      : target.status === "pendente"
        ? [{ status: "concluida", label: "Concluir etapa", primary: true }, { status: "nao_registrada", label: "Voltar para sem registro" }]
        : [{ status: "concluida", label: "Concluir etapa", primary: true }, { status: "pendente", label: "Marcar como a fazer" }];

  const targetPersonLacksBaptism = target?.stage === "encontro_com_deus" && statusOf(target.personId, "batismo") !== "concluida";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold font-display text-navy">Painel da formação</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Veja de uma vez em que etapa cada pessoa está. As etapas são independentes: não há ordem obrigatória, e alguém pode fazer o Encontro com Deus antes do Batismo. Toque numa etapa para concluir; o histórico completo fica no Prontuário da pessoa.
        </p>
      </div>

      {!journeyScope?.canManageAll && !journeyScope?.linkedPersonId && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Seu acesso está em modo de leitura. Peça ao administrador para vincular sua conta à sua ficha de Pessoa em <strong>Configurações → Perfis e Hierarquia</strong>.
        </div>
      )}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar pessoas por etapa">
          {FILTERS.map((item) => (
            <Button key={item.key} type="button" size="sm" variant={filter === item.key ? "default" : "outline"} className={filter === item.key ? "bg-navy text-white" : "border-navy/20 text-navy"} aria-pressed={filter === item.key} onClick={() => { setFilter(item.key); setVisible(PAGE_SIZE); }}>{item.label}</Button>
          ))}
        </div>
        <div className="relative w-full lg:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input aria-label="Buscar pessoa" placeholder="Buscar por nome" value={search} onChange={(event) => { setSearch(event.target.value); setVisible(PAGE_SIZE); }} className="pl-9" />
        </div>
      </div>

      <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Check className="h-3.5 w-3.5 text-emerald-700" aria-hidden="true" />Concluída</span>
        <span className="inline-flex items-center gap-1"><CircleDot className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />A fazer</span>
        <span className="inline-flex items-center gap-1"><Circle className="h-3.5 w-3.5 text-slate-300" aria-hidden="true" />Sem registro</span>
        <span>{rows.length} {rows.length === 1 ? "pessoa" : "pessoas"}</span>
      </p>

      {loading ? (
        <div className="space-y-2" aria-label="Carregando painel">{[1, 2, 3, 4].map((item) => <div key={item} className="h-14 animate-pulse rounded-xl bg-muted" />)}</div>
      ) : peopleError || boardQuery.isError ? (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">Não foi possível carregar o painel. <Button type="button" size="sm" variant="outline" className="ml-2" onClick={() => { void refetchPeople(); void boardQuery.refetch(); }}>Tentar novamente</Button></div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-muted-foreground">Nenhuma pessoa neste filtro.</div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[820px] text-sm">
            <caption className="sr-only">Etapas da formação de cada pessoa</caption>
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
                <th scope="col" className="sticky left-0 z-10 bg-muted px-3 py-2 font-semibold">Pessoa</th>
                {STAGES.map((stage) => <th key={stage.key} scope="col" className="px-1 py-2 text-center font-semibold" title={stage.label}>{stage.short}</th>)}
              </tr>
            </thead>
            <tbody>
              {shown.map((person) => {
                const editable = canEditPerson(person.id);
                return (
                  <tr key={person.id} className="border-b border-border/60 last:border-0">
                    <th scope="row" className="sticky left-0 z-10 bg-card px-3 py-2 text-left font-medium">
                      <Link href={`/app/pessoas?personId=${person.id}&section=jornada`} className="block max-w-[14rem] truncate text-navy hover:underline">{person.fullName}</Link>
                      <Badge variant="outline" className="mt-1 border-navy/15 text-[10px] font-normal text-muted-foreground">Etapa principal: {stageLabel(String(person.discipleshipStage ?? "nova_alma"))}</Badge>
                    </th>
                    {STAGES.map((stage) => {
                      const status = statusOf(person.id, stage.key);
                      return (
                        <td key={stage.key} className="px-1 py-1.5 text-center">
                          <button
                            type="button"
                            disabled={!editable}
                            onClick={() => setTarget({ personId: person.id, personName: String(person.fullName ?? ""), stage: stage.key, status })}
                            aria-label={`${person.fullName}: ${stage.label}, ${STATUS_LABEL[status]}${editable ? ". Tocar para alterar." : ""}`}
                            className={`mx-auto flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${STATUS_CELL[status]} ${editable ? "hover:border-navy/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70" : "cursor-default opacity-90"}`}
                          >
                            <StatusIcon status={status} />
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {rows.length > shown.length && (
        <div className="text-center"><Button type="button" variant="outline" onClick={() => setVisible((current) => current + PAGE_SIZE)}>Mostrar mais ({rows.length - shown.length})</Button></div>
      )}

      {!isLoading && legacyCellPeople.length > 0 && (
        <section className="rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4" aria-labelledby="legacy-cell-records">
          <h2 id="legacy-cell-records" className="text-sm font-semibold text-navy">Registros antigos de Célula</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{legacyCellPeople.length} registro{legacyCellPeople.length === 1 ? "" : "s"} antigo{legacyCellPeople.length === 1 ? "" : "s"} de Célula foi{legacyCellPeople.length === 1 ? "" : "ram"} preservado{legacyCellPeople.length === 1 ? "" : "s"}. A participação atual deve ser consultada e administrada em Células.</p>
        </section>
      )}

      {target && (
        <Dialog open onOpenChange={(open) => { if (!open && !updateStage.isPending) setTarget(null); }}>
          <AdaptiveFormDialogContent className="sm:max-w-md">
            <div className={adaptiveFormDialogHeaderClassName}>
              <DialogTitle className="font-display text-navy">{stageLabel(target.stage)}</DialogTitle>
              <DialogDescription className="mt-1 text-sm text-muted-foreground">{target.personName} · hoje: <strong>{STATUS_LABEL[target.status]}</strong>. A alteração fica registrada no Prontuário, com data e responsável.</DialogDescription>
            </div>
            <AdaptiveFormDialogBody>
              {targetPersonLacksBaptism && <p className="rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">Esta pessoa ainda não tem o Batismo registrado. Tudo bem registrar o Encontro com Deus antes dele.</p>}
              {target.stage === "batismo" && target.status !== "concluida" && <p className="rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">Ao concluir o Batismo aqui, a data não é preenchida na ficha. Se quiser a data de batismo, informe-a na aba Dados da pessoa.</p>}
            </AdaptiveFormDialogBody>
            <AdaptiveFormDialogFooter>
              <Button type="button" variant="outline" disabled={updateStage.isPending} onClick={() => setTarget(null)}>Cancelar</Button>
              {targetOptions.map((option) => (
                <Button key={option.status} type="button" disabled={updateStage.isPending} variant={option.primary ? "default" : "outline"} className={option.primary ? "bg-navy text-white hover:bg-navy-light" : "border-navy/20 text-navy"} onClick={() => act(option.status)}>{option.label}</Button>
              ))}
            </AdaptiveFormDialogFooter>
          </AdaptiveFormDialogContent>
        </Dialog>
      )}
    </div>
  );
}
