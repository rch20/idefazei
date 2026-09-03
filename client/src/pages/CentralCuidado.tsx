import { useChurch } from "@/components/ChurchLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, CheckCircle2, ChevronRight, Clock3, HeartHandshake, MapPinned, PhoneCall, Users } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

const priorityConfig = {
  alta: { label: "Prioridade alta", card: "border-rose-200 bg-rose-50/60", badge: "border-rose-200 bg-rose-100 text-rose-700" },
  media: { label: "Atenção", card: "border-amber-200 bg-amber-50/60", badge: "border-amber-200 bg-amber-100 text-amber-700" },
  normal: { label: "Em acompanhamento", card: "border-green-200 bg-green-50/60", badge: "border-green-200 bg-green-100 text-green-700" },
} as const;

export default function CentralCuidado() {
  const { churchId } = useChurch();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const queue = trpc.care.myQueue.useQuery({ churchId });
  const visits = trpc.care.visits.useQuery({ churchId });
  const scope = trpc.people.journeyScope.useQuery({ churchId });
  const registerFirstContact = trpc.care.registerFirstContact.useMutation({
    onSuccess: async () => {
      toast.success("Primeiro contato registrado.");
      await Promise.all([
        utils.care.myQueue.invalidate({ churchId }),
        utils.dashboard.careAttention.invalidate({ churchId }),
      ]);
    },
    onError: (error) => toast.error(error.message || "Não foi possível registrar o contato."),
  });

  const items = queue.data ?? [];
  const visitItems = visits.data ?? [];
  const high = items.filter((item) => item.priority === "alta").length;
  const medium = items.filter((item) => item.priority === "media").length;

  function openPerson(personId: number) {
    navigate(`/app/pessoas?personId=${personId}&section=cuidado`);
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
              <HeartHandshake className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-navy">Cuidado</h1>
              <p className="mt-0.5 text-sm text-muted-foreground">{scope.data?.canManageAll ? "Veja o que precisa da atenção da igreja." : "Veja o que precisa da sua atenção."}</p>
            </div>
          </div>
        </div>
        {scope.data?.canManageAll && <Button variant="outline" className="w-full gap-2 sm:w-auto" onClick={() => navigate("/app/pessoas")}>
          <Users className="h-4 w-4" /> Ver todas as pessoas
        </Button>}
      </header>

      {!scope.isLoading && !scope.data?.canManageAll && !scope.data?.linkedPersonId && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Sua conta ainda não está vinculada a uma Pessoa.</p>
          <p className="mt-1 text-xs">Peça a um pastor para fazer o vínculo em Configurações → Perfis e Hierarquia. Assim sua fila mostrará somente as pessoas sob seu cuidado.</p>
        </div>
      )}

      <section className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="card-sacred p-3 sm:p-4">
          <p className="text-xl font-bold font-display text-rose-700 sm:text-2xl">{high}</p>
          <p className="text-[11px] font-medium text-muted-foreground sm:text-xs">Prioridade alta</p>
        </div>
        <div className="card-sacred p-3 sm:p-4">
          <p className="text-xl font-bold font-display text-amber-700 sm:text-2xl">{medium}</p>
          <p className="text-[11px] font-medium text-muted-foreground sm:text-xs">Atenção</p>
        </div>
        <div className="card-sacred p-3 sm:p-4">
          <p className="text-xl font-bold font-display text-navy sm:text-2xl">{items.length}</p>
          <p className="text-[11px] font-medium text-muted-foreground sm:text-xs">Na sua fila</p>
        </div>
      </section>

      {visits.isError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Não foi possível carregar as solicitações de visita agora.
        </div>
      ) : visitItems.length > 0 && (
        <section className="card-sacred overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-amber-100 bg-amber-50/70 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                <MapPinned className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-navy">Visitas solicitadas</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">Pedidos de visita gerados no acompanhamento da Consolidação.</p>
              </div>
            </div>
            <Badge variant="outline" className="w-fit border-amber-200 bg-white text-amber-800">{visitItems.length} {visitItems.length === 1 ? "visita" : "visitas"}</Badge>
          </div>

          <div className="divide-y divide-border/70">
            {visitItems.map((visit) => {
              const statusLabel = {
                solicitada: "Visita solicitada",
                agendada: "Visita agendada",
                em_andamento: "Visita em andamento",
                realizada: "Visita realizada",
                cancelada: "Visita cancelada",
              }[visit.status];
              const isOpen = ["solicitada", "agendada", "em_andamento"].includes(visit.status);
              return (
                <article key={visit.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-navy">{visit.personName}</h3>
                      <Badge variant="outline" className="border-indigo-200 bg-indigo-50 text-indigo-700">Visita #{visit.id}</Badge>
                      <Badge variant="outline" className={isOpen ? "border-amber-200 bg-amber-50 text-amber-800" : "border-slate-200 bg-slate-50 text-slate-700"}>{statusLabel}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">Motivo do encaminhamento: {visit.caseReason}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{visit.assignedToName ? `Responsável: ${visit.assignedToName}` : "Aguardando responsável"}{visit.scheduledAt ? ` · ${new Date(visit.scheduledAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}` : ""}{visit.notes ? ` · ${visit.notes}` : ""}</p>
                  </div>
                  <Button variant="outline" className="w-full gap-2 sm:w-auto" onClick={() => navigate("/app/consolidacao")}>Acompanhar caso <ChevronRight className="h-4 w-4" /></Button>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {queue.isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((key) => <div key={key} className="h-36 animate-pulse rounded-xl bg-muted" />)}
        </div>
      ) : queue.isError ? (
        <div className="card-sacred flex flex-col items-center gap-3 p-8 text-center">
          <AlertTriangle className="h-8 w-8 text-rose-600" />
          <p className="font-semibold text-navy">Não foi possível carregar sua fila</p>
          <Button variant="outline" onClick={() => queue.refetch()}>Tentar novamente</Button>
        </div>
      ) : items.length === 0 ? (
        <div className="card-sacred flex flex-col items-center gap-3 p-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-700"><CheckCircle2 className="h-6 w-6" /></div>
          <p className="font-semibold text-navy">Sua fila está em dia</p>
          <p className="max-w-sm text-sm text-muted-foreground">Não há pessoas sob sua responsabilidade com pendências prioritárias no momento.</p>
        </div>
      ) : (
        <section className="space-y-3">
          {items.map((item) => {
            const config = priorityConfig[item.priority];
            const canRegisterContact = item.nextStep === "Registrar primeiro contato";
            return (
              <article key={item.person.id} className={`rounded-xl border p-4 sm:p-5 ${config.card}`}>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-lg font-bold text-navy">{item.person.fullName}</h2>
                      <Badge variant="outline" className={`text-[11px] ${config.badge}`}>{config.label}</Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {item.person.phone && <span>{item.person.phone}</span>}
                      {item.cell?.cellName && <span>Célula: {item.cell.cellName}</span>}
                      {item.careAssignment && <span>Responsável definido</span>}
                    </div>
                    <div className="mt-3 rounded-lg border border-white/60 bg-white/65 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Próximo passo</p>
                      <p className="mt-1 text-sm font-semibold text-navy">{item.nextStep}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.reasons.join(" · ")}</p>
                    </div>
                  </div>
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-44">
                    {canRegisterContact && (
                      <Button
                        className="gap-2 bg-navy text-white hover:bg-navy-light"
                        onClick={() => registerFirstContact.mutate({ churchId, personId: item.person.id })}
                        disabled={registerFirstContact.isPending}
                      >
                        <PhoneCall className="h-4 w-4" />
                        {registerFirstContact.isPending ? "Registrando…" : "Registrar contato"}
                      </Button>
                    )}
                    <Button variant="outline" className="gap-2" onClick={() => openPerson(item.person.id)}>
                      Abrir ficha <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5" />A fila é ordenada por prioridade e mostra somente pessoas dentro do seu escopo de cuidado.</p>
    </div>
  );
}
