import { useChurch } from "@/components/ChurchLayout";
import { ConsolidationMinistryPanel } from "@/components/ConsolidationMinistryPanel";
import { ConsolidationAssignmentControl } from "@/components/ConsolidationAssignmentControl";
import { VisitAssignmentControl } from "@/components/VisitAssignmentControl";
import { useChurchAuth } from "@/hooks/useChurchAuth";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, CalendarClock, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Circle, ClipboardCheck, Clock3, Heart, MapPinned, Phone, MessageCircle, MessageSquare, Home, BookOpen, Users, HandHeart, Church, Send, UserCheck } from "lucide-react";
import { ReportButton } from "@/components/ReportButton";
import { toast } from "sonner";

const CHECKLIST_ITEMS = [
  { key: "callMade", label: "Ligação realizada", icon: Phone },
  { key: "messageSent", label: "Mensagem enviada", icon: MessageSquare },
  { key: "visitMade", label: "Visita realizada", icon: Home },
  { key: "bibleDelivered", label: "Bíblia entregue", icon: BookOpen },
  { key: "whatsappGroupAdded", label: "Incluído no grupo WhatsApp", icon: Users },
  { key: "prayerMade", label: "Oração realizada", icon: HandHeart },
  { key: "addedToCell", label: "Inserido em célula", icon: Church },
] as const;

type ChecklistKey = (typeof CHECKLIST_ITEMS)[number]["key"];

function getWhatsAppLink(contact: string, personName: string) {
  const number = contact.replace(/\D/g, "");
  const internationalNumber = number.length >= 10 && !number.startsWith("55") ? `55${number}` : number;
  const message = encodeURIComponent(`Olá, ${personName}. Tudo bem? Sou da equipe de cuidado da igreja e gostaria de conversar com você.`);
  return `https://wa.me/${internationalNumber}?text=${message}`;
}

const initialFollowUpForm = {
  contactChannel: "whatsapp" as const,
  outcome: "conversou" as const,
  notes: "",
  nextAction: "",
  nextActionAt: "",
  visitStatus: "nao_necessaria" as const,
  visitAssigneePersonId: "",
  visitScheduledAt: "",
};

function getMonthDays(month: Date) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const firstWeekday = firstDay.getDay();
  const totalDays = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  return Array.from({ length: firstWeekday + totalDays }, (_, index) => index < firstWeekday ? null : new Date(month.getFullYear(), month.getMonth(), index - firstWeekday + 1));
}

function getLocalDayKey(value: Date | string) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function toDateTimeLocal(value: Date | string) {
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function getCareDueLabel(referral: { careDueStatus: string; hoursUntilCareDue: number | null; careDueAt: Date | string }) {
  if (referral.careDueStatus === "atrasado") return `Atrasado há ${Math.max(1, Math.abs(referral.hoursUntilCareDue ?? 0))}h`;
  if (referral.careDueStatus === "proximo") return (referral.hoursUntilCareDue ?? 0) <= 24 ? "Vence nas próximas 24h" : "Vence em até 48h";
  return `Prazo: ${new Date(referral.careDueAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}`;
}

export default function Consolidacao() {
  const { churchId } = useChurch();
  const { user } = useChurchAuth();
  const utils = trpc.useUtils();
  const [caseFilter, setCaseFilter] = useState<"ativos" | "fila" | "atrasados" | "encerrados" | "todos">("ativos");
  const [visitFilter, setVisitFilter] = useState<"pendentes" | "agendadas" | "realizadas" | "todas">("pendentes");
  const effectiveRolesQuery = trpc.churchAuth.effectiveRoles.useQuery(
    { churchId },
    { enabled: Boolean(churchId && user) }
  );
  const effectiveRoles = effectiveRolesQuery.data ?? [];
  const rolesReady = effectiveRolesQuery.isFetched;
  const ministryStructureQuery = trpc.consolidation.structure.useQuery({ churchId }, { enabled: rolesReady });
  const capabilities = ministryStructureQuery.data?.capabilities;
  const isVisitOnly = rolesReady && Boolean(capabilities?.canWorkVisits) && !Boolean(capabilities?.canWorkConsolidation);
  const canAccessVisits = Boolean(capabilities?.canWorkVisits || capabilities?.canManageVisits);
  const { data: consolidations, isLoading, refetch } = trpc.consolidation.list.useQuery({ churchId }, { enabled: rolesReady && !isVisitOnly });
  const { data: souls } = trpc.consolidation.souls.useQuery({ churchId }, { enabled: rolesReady && !isVisitOnly });
  const referralsQuery = trpc.consolidation.referrals.useQuery({ churchId }, { enabled: rolesReady && !isVisitOnly });
  const consolidatorsQuery = trpc.consolidation.consolidators.useQuery({ churchId }, { enabled: rolesReady && Boolean(capabilities?.canManageConsolidation) });
  const visitorsQuery = trpc.consolidation.visitors.useQuery({ churchId }, { enabled: rolesReady && !isVisitOnly });
  const visitsQuery = trpc.consolidation.visits.useQuery({ churchId }, { enabled: rolesReady && canAccessVisits });
  const { data: cells = [] } = trpc.cells.list.useQuery({ churchId }, { enabled: rolesReady && !isVisitOnly });
  const [selectedCellByConsolidation, setSelectedCellByConsolidation] = useState<Record<number, string>>({});
  const [selectedCellByReferral, setSelectedCellByReferral] = useState<Record<number, string>>({});
  const [closingReferralId, setClosingReferralId] = useState<number | null>(null);
  const [closeReferralNotes, setCloseReferralNotes] = useState("");
  const [trackingReferralId, setTrackingReferralId] = useState<number | null>(null);
  const [followUpForm, setFollowUpForm] = useState(initialFollowUpForm);
  const [activeSection, setActiveSection] = useState<"consolidacao" | "visitas">("consolidacao");
  const [visitNotesById, setVisitNotesById] = useState<Record<number, string>>({});
  const [careDueInputByReferral, setCareDueInputByReferral] = useState<Record<number, string>>({});
  const [visitCalendarMonth, setVisitCalendarMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));

  useEffect(() => {
    if (isVisitOnly) setActiveSection("visitas");
  }, [isVisitOnly]);
  const followUpsQuery = trpc.consolidation.followUps.useQuery(
    { churchId, referralId: trackingReferralId ?? 0 },
    { enabled: Boolean(trackingReferralId) }
  );
  const hasFullOverview = Boolean(capabilities?.canManageConsolidation);

  const updateChecklist = trpc.consolidation.updateChecklist.useMutation({
    onSuccess: () => refetch(),
    onError: () => toast.error("Erro ao atualizar checklist"),
  });
  const integrateIntoCell = trpc.consolidation.integrateIntoCell.useMutation({
    onSuccess: () => {
      refetch();
      toast.success("Pessoa integrada à Célula e cuidado transferido ao líder.");
    },
    onError: (error: { message: string }) => toast.error(error.message),
  });
  const approveReferral = trpc.consolidation.approveReferral.useMutation({
    onSuccess: () => {
      toast.success("Consolidação aceita pela liderança. O caso agora está pronto para ser assumido.");
      referralsQuery.refetch();
    },
    onError: (error: { message: string }) => toast.error(error.message),
  });
  const acceptReferral = trpc.consolidation.acceptReferral.useMutation({
    onSuccess: () => {
      toast.success("Encaminhamento assumido. A Pessoa agora está em sua carteira de cuidado.");
      referralsQuery.refetch();
    },
    onError: (error: { message: string }) => toast.error(error.message),
  });
  const recordFollowUp = trpc.consolidation.recordFollowUp.useMutation({
    onSuccess: async () => {
      toast.success("Acompanhamento registrado no histórico do caso.");
      setFollowUpForm(initialFollowUpForm);
      await Promise.all([followUpsQuery.refetch(), referralsQuery.refetch()]);
    },
    onError: (error: { message: string }) => toast.error(error.message || "Não foi possível registrar o acompanhamento."),
  });
  const closeReferral = trpc.consolidation.closeReferral.useMutation({
    onSuccess: () => {
      toast.success("Cuidado encerrado com histórico preservado.");
      setClosingReferralId(null);
      setCloseReferralNotes("");
      referralsQuery.refetch();
    },
    onError: (error: { message: string }) => toast.error(error.message),
  });
  const integrateReferralIntoCell = trpc.consolidation.integrateReferralIntoCell.useMutation({
    onSuccess: async (result) => {
      toast.success(`Pessoa integrada à ${result.cellName}. O cuidado agora segue com o líder da Célula.`);
      setSelectedCellByReferral((current) => {
        const next = { ...current };
        delete next[result.referral?.id ?? 0];
        return next;
      });
      await referralsQuery.refetch();
    },
    onError: (error: { message: string }) => toast.error(error.message || "Não foi possível integrar a Pessoa em uma Célula."),
  });
  const acceptVisit = trpc.consolidation.acceptVisit.useMutation({
    onSuccess: async () => {
      toast.success("Visita aceita. Ela agora está sob seu cuidado.");
      await visitsQuery.refetch();
    },
    onError: (error: { message: string }) => toast.error(error.message || "Não foi possível aceitar a visita."),
  });
  const completeVisit = trpc.consolidation.completeVisit.useMutation({
    onSuccess: async () => {
      toast.success("Visita registrada no histórico do caso.");
      setVisitNotesById({});
      await Promise.all([visitsQuery.refetch(), referralsQuery.refetch()]);
    },
    onError: (error: { message: string }) => toast.error(error.message || "Não foi possível registrar a visita."),
  });
  const updateCareDue = trpc.consolidation.updateReferralCareDue.useMutation({
    onSuccess: async () => {
      toast.success("Prazo de cuidado atualizado.");
      await referralsQuery.refetch();
    },
    onError: (error: { message: string }) => toast.error(error.message),
  });

  const soulsMap = new Map((souls ?? []).map((s) => [s.id, s]));
  const allReferrals = referralsQuery.data ?? [];
  const referralAlerts = allReferrals.filter((referral) => ["atrasado", "proximo"].includes(referral.careDueStatus));
  const overdueReferrals = referralAlerts.filter((referral) => referral.careDueStatus === "atrasado");
  const activeReferrals = allReferrals.filter((referral) => referral.status !== "encerrado");
  const unassignedReferrals = activeReferrals.filter((referral) => !referral.assignedToPersonId && !referral.acceptedByPersonId);
  const filteredReferrals = allReferrals.filter((referral) => caseFilter === "todos" || (caseFilter === "ativos" && referral.status !== "encerrado") || (caseFilter === "fila" && referral.status !== "encerrado" && !referral.assignedToPersonId && !referral.acceptedByPersonId) || (caseFilter === "atrasados" && referral.careDueStatus === "atrasado") || (caseFilter === "encerrados" && referral.status === "encerrado"));
  const allVisits = visitsQuery.data ?? [];
  const filteredVisits = allVisits.filter((visit) => visitFilter === "todas" || (visitFilter === "pendentes" && !["realizada", "cancelada"].includes(visit.status)) || (visitFilter === "agendadas" && visit.status === "agendada") || (visitFilter === "realizadas" && visit.status === "realizada"));

  function toggleItem(consolidationId: number, key: ChecklistKey, current: boolean) {
    updateChecklist.mutate({
      id: consolidationId,
      churchId,
      [key]: !current,
    });
  }

  function getProgress(c: NonNullable<typeof consolidations>[0]) {
    const items = CHECKLIST_ITEMS.map((i) => (c as any)[i.key] as boolean);
    const done = items.filter(Boolean).length;
    return { done, total: items.length, pct: Math.round((done / items.length) * 100) };
  }

  function openTracking(referralId: number) {
    setTrackingReferralId((current) => current === referralId ? null : referralId);
    setFollowUpForm(initialFollowUpForm);
  }

  function submitFollowUp(referralId: number) {
    if (followUpForm.notes.trim().length < 3) {
      toast.error("Descreva como foi o contato antes de salvar.");
      return;
    }
    recordFollowUp.mutate({
      churchId,
      referralId,
      contactChannel: followUpForm.contactChannel,
      outcome: followUpForm.outcome,
      notes: followUpForm.notes.trim(),
      nextAction: followUpForm.nextAction.trim() || undefined,
      nextActionAt: followUpForm.nextActionAt ? new Date(followUpForm.nextActionAt).toISOString() : undefined,
      visitStatus: followUpForm.visitStatus,
      visitAssigneePersonId: followUpForm.visitAssigneePersonId ? Number(followUpForm.visitAssigneePersonId) : undefined,
      visitScheduledAt: followUpForm.visitScheduledAt ? new Date(followUpForm.visitScheduledAt).toISOString() : undefined,
    });
  }

  if (activeSection === "visitas" && canAccessVisits) {
    const visits = filteredVisits;
    const monthDays = getMonthDays(visitCalendarMonth);
    const scheduledVisitsByDay = new Map<string, typeof visits>();
    visits.filter((visit) => visit.scheduledAt).forEach((visit) => {
      const key = getLocalDayKey(visit.scheduledAt!);
      scheduledVisitsByDay.set(key, [...(scheduledVisitsByDay.get(key) ?? []), visit]);
    });
    const monthLabel = visitCalendarMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div><h1 className="text-2xl font-bold font-display text-navy">Consolidação</h1><p className="mt-1 text-sm text-muted-foreground">Visitas atribuídas à sua função de cuidado.</p></div>
          <div className="flex flex-col gap-2 sm:items-end"><div className="inline-flex rounded-lg border border-border bg-background p-1"><Button size="sm" variant="ghost" onClick={() => setActiveSection("consolidacao")}>Consolidação</Button><Button size="sm" className="bg-navy text-white hover:bg-navy-light">Visitas</Button></div><Select value={visitFilter} onValueChange={(value) => setVisitFilter(value as typeof visitFilter)}><SelectTrigger className="w-full bg-background sm:w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pendentes">Visitas pendentes</SelectItem><SelectItem value="agendadas">Agendadas</SelectItem><SelectItem value="realizadas">Realizadas</SelectItem><SelectItem value="todas">Todas as Visitas</SelectItem></SelectContent></Select></div>
        </div>
        <ConsolidationMinistryPanel churchId={churchId} />
        {visitsQuery.isLoading ? <div className="h-44 animate-pulse rounded-xl bg-muted" /> : visits.length === 0 ? (
          <div className="card-sacred p-12 text-center"><MapPinned className="mx-auto h-8 w-8 text-amber-600" /><p className="mt-3 font-semibold text-navy">Nenhuma visita pendente</p><p className="mt-1 text-sm text-muted-foreground">Quando uma visita for atribuída a você, ela aparecerá aqui.</p></div>
        ) : <>
          <section className="card-sacred overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-gold" /><div><h2 className="font-semibold text-navy">Calendário de visitas</h2><p className="text-xs text-muted-foreground">Apenas visitas com data e horário agendados.</p></div></div>
              <div className="flex items-center gap-1 rounded-lg bg-muted/50 p-1"><Button type="button" size="icon" variant="ghost" aria-label="Mês anterior" onClick={() => setVisitCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button><span className="min-w-36 px-2 text-center text-sm font-medium capitalize text-navy">{monthLabel}</span><Button type="button" size="icon" variant="ghost" aria-label="Próximo mês" onClick={() => setVisitCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></Button></div>
            </div>
            <div className="grid grid-cols-7 border-l border-t border-border/70 bg-background">
              {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((day) => <div key={day} className="border-b border-r border-border/70 bg-muted/40 px-1 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{day}</div>)}
              {monthDays.map((day, index) => {
                const key = day ? getLocalDayKey(day) : `blank-${index}`;
                const dayVisits = day ? scheduledVisitsByDay.get(key) ?? [] : [];
                const isToday = day && getLocalDayKey(day) === getLocalDayKey(new Date());
                return <div key={key} className="min-h-18 border-b border-r border-border/70 p-1.5 sm:min-h-24">{day && <><span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-medium ${isToday ? "bg-navy text-white" : "text-navy"}`}>{day.getDate()}</span><div className="mt-1 space-y-1">{dayVisits.slice(0, 2).map((visit) => <span key={visit.id} title={`${visit.personName} · ${new Date(visit.scheduledAt!).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`} className="block truncate rounded bg-amber-100 px-1 py-0.5 text-[9px] font-medium text-amber-900 sm:text-[10px]">{visit.personName}</span>)}{dayVisits.length > 2 && <span className="block text-[9px] text-muted-foreground">+{dayVisits.length - 2} visita{dayVisits.length - 2 === 1 ? "" : "s"}</span>}</div></>}</div>;
              })}
            </div>
          </section>
          <div className="space-y-4">{visits.map((visit) => (
          <article key={visit.id} className="card-sacred p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-navy">{visit.personName}</p><Badge variant="outline">Visita #{visit.id}</Badge></div><p className="mt-1 text-xs text-muted-foreground">Solicitada por {visit.requestedByName}{visit.assignedToName ? ` · Visitador: ${visit.assignedToName}` : " · Aguardando atribuição"}</p></div><Badge variant="outline" className="w-fit border-amber-200 bg-amber-50 text-amber-800">{visit.scheduledAt ? new Date(visit.scheduledAt).toLocaleString("pt-BR") : "Aguardando agendamento"}</Badge></div>
            <div className="mt-3 rounded-lg border border-amber-100 bg-amber-50/50 p-3 text-sm"><p><strong>Motivo:</strong> {visit.reason}</p>{visit.notes && <p className="mt-1 text-muted-foreground">{visit.notes}</p>}</div>
            {visit.contactNumber && <a href={getWhatsAppLink(visit.contactNumber, visit.personName)} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center text-sm font-medium text-green-700 hover:underline"><MessageCircle className="mr-2 h-4 w-4" />Conversar no WhatsApp</a>}
            {visit.address && <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground"><MapPinned className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />{visit.address}</p>}
            {visit.canAccept && <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50/60 p-3"><p className="text-sm text-blue-950">Esta visita está disponível para a equipe. Ao aceitar, ela ficará sob sua responsabilidade.</p><Button type="button" className="mt-2 w-full bg-navy text-white hover:bg-navy-light sm:w-auto" disabled={acceptVisit.isPending} onClick={() => acceptVisit.mutate({ churchId, visitId: visit.id })}><UserCheck className="mr-2 h-4 w-4" />{acceptVisit.isPending ? "Aceitando…" : "Aceitar visita"}</Button></div>}
            {visit.canAssign && <VisitAssignmentControl churchId={churchId} visit={{ id: visit.id, assignedToPersonId: visit.assignedToPersonId, scheduledAt: visit.scheduledAt, status: visit.status }} visitors={visitorsQuery.data ?? []} onSaved={async () => { await visitsQuery.refetch(); }} />}
            {visit.canComplete && <div className="mt-4 border-t border-border pt-3"><Label htmlFor={`visit-notes-${visit.id}`}>Registro da visita *</Label><Textarea id={`visit-notes-${visit.id}`} rows={3} className="mt-1" value={visitNotesById[visit.id] ?? ""} onChange={(event) => setVisitNotesById((current) => ({ ...current, [visit.id]: event.target.value }))} placeholder="Como foi a visita, necessidades identificadas e próximos cuidados." /><div className="mt-2 flex justify-end"><Button type="button" className="bg-green-600 text-white hover:bg-green-700" disabled={completeVisit.isPending || (visitNotesById[visit.id]?.trim().length ?? 0) < 3} onClick={() => completeVisit.mutate({ churchId, visitId: visit.id, notes: visitNotesById[visit.id].trim() })}><CheckCircle2 className="mr-2 h-4 w-4" />Registrar visita realizada</Button></div></div>}
          </article>
        ))}</div>
        </>}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-navy">Consolidação</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {hasFullOverview ? "Acompanhe a jornada de cuidado das Pessoas da igreja" : "Acompanhe somente os casos sob sua responsabilidade"}
          </p>
        </div>
        <ReportButton
          label="Exportar Relatório"
          onFetch={() => utils.reports.consolidation.fetch({ churchId })}
        />
      </div>

      <section className="rounded-xl border border-border bg-background p-4 sm:p-5" aria-label="Jornada de cuidado">
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-navy sm:justify-between">
          <span className="rounded-full bg-amber-50 px-3 py-1.5 text-amber-800">1. Indicação</span>
          <ChevronRight className="hidden h-4 w-4 text-muted-foreground sm:block" aria-hidden="true" />
          <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-indigo-800">2. Aprovação pastoral</span>
          <ChevronRight className="hidden h-4 w-4 text-muted-foreground sm:block" aria-hidden="true" />
          <span className="rounded-full bg-blue-50 px-3 py-1.5 text-blue-800">3. Consolidador assume</span>
          <ChevronRight className="hidden h-4 w-4 text-muted-foreground sm:block" aria-hidden="true" />
          <span className="rounded-full bg-green-50 px-3 py-1.5 text-green-800">4. Acompanhamento</span>
          <ChevronRight className="hidden h-4 w-4 text-muted-foreground sm:block" aria-hidden="true" />
          <span className="rounded-full bg-rose-50 px-3 py-1.5 text-rose-800">5. Visita, se necessária</span>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">A Pessoa continua com a mesma ficha; somente o estado do cuidado e o responsável mudam ao longo da jornada.</p>
      </section>

      {canAccessVisits && <div className="inline-flex rounded-lg border border-border bg-background p-1"><Button size="sm" className="bg-navy text-white hover:bg-navy-light">Consolidação</Button><Button size="sm" variant="ghost" onClick={() => setActiveSection("visitas")}><MapPinned className="mr-2 h-4 w-4" />Visitas</Button></div>}

      <ConsolidationMinistryPanel churchId={churchId} />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><div className="metric-card"><p className="text-2xl font-bold text-navy">{activeReferrals.length}</p><p className="text-sm text-muted-foreground">Casos ativos</p></div><div className="metric-card"><p className="text-2xl font-bold text-amber-700">{unassignedReferrals.length}</p><p className="text-sm text-muted-foreground">Sem responsável</p></div><div className="metric-card"><p className="text-2xl font-bold text-rose-700">{overdueReferrals.length}</p><p className="text-sm text-muted-foreground">Com prazo vencido</p></div><div className="metric-card"><p className="text-2xl font-bold text-indigo-700">{allVisits.filter((visit) => !["realizada", "cancelada"].includes(visit.status)).length}</p><p className="text-sm text-muted-foreground">Visitas pendentes</p></div></section>

      {referralAlerts.length > 0 && <section className={`rounded-2xl border p-4 sm:p-5 ${overdueReferrals.length > 0 ? "border-rose-200 bg-rose-50" : "border-amber-200 bg-amber-50"}`}><div className="flex items-start gap-3"><div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${overdueReferrals.length > 0 ? "bg-rose-100" : "bg-amber-100"}`}><AlertTriangle className={`h-5 w-5 ${overdueReferrals.length > 0 ? "text-rose-700" : "text-amber-700"}`} /></div><div><h2 className="font-display text-lg font-semibold text-navy">Atenção aos prazos de cuidado</h2><p className="mt-1 text-sm text-muted-foreground">{overdueReferrals.length > 0 ? `${overdueReferrals.length} caso${overdueReferrals.length === 1 ? "" : "s"} está${overdueReferrals.length === 1 ? "" : "ão"} atrasado${overdueReferrals.length === 1 ? "" : "s"}. ` : ""}{referralAlerts.length - overdueReferrals.length > 0 ? `${referralAlerts.length - overdueReferrals.length} caso${referralAlerts.length - overdueReferrals.length === 1 ? "" : "s"} vence${referralAlerts.length - overdueReferrals.length === 1 ? "" : "m"} nas próximas 48 horas.` : ""}</p></div></div></section>}

      <section className="rounded-2xl border border-rose-200 bg-rose-50/40 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100">
            <Send className="h-5 w-5 text-rose-600" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-navy">Fila de cuidado</h2>
            <p className="mt-1 text-xs text-muted-foreground">Pessoas encaminhadas porque precisam de acompanhamento. Primeiro o Pastor aprova; depois um Consolidador assume o caso.</p>
          </div></div><Select value={caseFilter} onValueChange={(value) => setCaseFilter(value as typeof caseFilter)}><SelectTrigger className="w-full bg-background sm:w-48"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ativos">Casos ativos</SelectItem><SelectItem value="fila">Sem responsável</SelectItem><SelectItem value="atrasados">Atrasados</SelectItem><SelectItem value="encerrados">Encerrados</SelectItem><SelectItem value="todos">Todos os casos</SelectItem></SelectContent></Select></div>
        {filteredReferrals.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed border-rose-200 bg-background/70 p-3 text-sm text-muted-foreground">Não há encaminhamentos de resgate na sua fila neste momento.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {filteredReferrals.map((referral) => {
              const isPending = referral.status === "pendente";
              const isApproved = referral.status === "aprovado";
              const isInFollowUp = referral.status === "em_acompanhamento";
              return (
                <article key={referral.id} className="rounded-xl border border-rose-100 bg-background p-4 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-navy">{referral.personName}</p>
                        <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${referral.status === "encerrado" ? "border-green-200 bg-green-50 text-green-700" : referral.status === "em_acompanhamento" ? "border-blue-200 bg-blue-50 text-blue-700" : referral.status === "aprovado" ? "border-indigo-200 bg-indigo-50 text-indigo-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>{referral.status === "pendente" ? "Aguardando aprovação pastoral" : referral.status === "aprovado" ? "Aprovado, aguardando Consolidador" : referral.status === "aceito" ? "Assumido pelo Consolidador" : referral.status === "em_acompanhamento" ? "Em acompanhamento" : "Encerrado"}</span>
                        {referral.careDueStatus !== "encerrado" && <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${referral.careDueStatus === "atrasado" ? "border-rose-200 bg-rose-50 text-rose-700" : referral.careDueStatus === "proximo" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-slate-200 bg-slate-50 text-slate-600"}`}><Clock3 className="h-3 w-3" />{getCareDueLabel(referral)}</span>}
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">Indicado por {referral.referredByName} · origem: {referral.sourceName} · {new Date(referral.referredAt).toLocaleDateString("pt-BR")}{referral.preferredConsolidatorName ? ` · Preferência: ${referral.preferredConsolidatorName}` : ""}</p>
                      <p className="mt-3 text-sm font-medium text-navy">Motivo: <span className="font-normal text-foreground">{referral.reason}</span></p>
                      {referral.notes && <p className="mt-1 text-sm text-muted-foreground">{referral.notes}</p>}
                    </div>
                    <div className="flex shrink-0 flex-col gap-2 sm:w-44">
                      {referral.canAssign && <ConsolidationAssignmentControl churchId={churchId} referral={referral} candidates={consolidatorsQuery.data ?? []} canAssign={Boolean(referral.canAssign)} onSaved={async () => { await referralsQuery.refetch(); }} />}
                      {isPending && referral.canApprove && <Button size="sm" className="bg-navy text-white hover:bg-navy-light" disabled={approveReferral.isPending} onClick={() => approveReferral.mutate({ churchId, id: referral.id })}><CheckCircle2 className="mr-2 h-4 w-4" />Aprovar encaminhamento</Button>}
                      {isApproved && referral.canAccept && <Button size="sm" className="bg-navy text-white hover:bg-navy-light" disabled={acceptReferral.isPending} onClick={() => acceptReferral.mutate({ churchId, id: referral.id })}><UserCheck className="mr-2 h-4 w-4" />Assumir cuidado</Button>}
                      {!isPending && referral.status !== "encerrado" && <Button size="sm" variant="outline" onClick={() => openTracking(referral.id)}><ClipboardCheck className="mr-2 h-4 w-4" />{trackingReferralId === referral.id ? "Fechar painel" : "Acompanhar caso"}</Button>}
                      {isInFollowUp && <Button size="sm" variant="outline" onClick={() => setClosingReferralId(referral.id)}>Encerrar cuidado</Button>}
                      {referral.acceptedByName && <p className="text-center text-[11px] text-muted-foreground">Responsável: {referral.acceptedByName}</p>}
                    </div>
                  </div>
                  {referral.canIntegrate && (
                    <div className="mt-4 rounded-lg border border-green-200 bg-green-50/70 p-3">
                      <p className="text-sm font-semibold text-green-900">Próximo destino da Pessoa</p>
                      <p className="mt-1 text-xs text-green-800">O cuidado já teve acompanhamento. O Pastor pode concluir esta etapa integrando a Pessoa em uma Célula ativa.</p>
                      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                        <label className="sr-only" htmlFor={`referral-cell-${referral.id}`}>Célula de destino</label>
                        <select
                          id={`referral-cell-${referral.id}`}
                          value={selectedCellByReferral[referral.id] ?? ""}
                          onChange={(event) => setSelectedCellByReferral((current) => ({ ...current, [referral.id]: event.target.value }))}
                          className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500/70"
                        >
                          <option value="">Selecione a Célula de destino</option>
                          {cells.filter((cell) => Boolean(cell.leaderId)).map((cell) => <option key={cell.id} value={cell.id}>{cell.name}</option>)}
                        </select>
                        <Button
                          type="button"
                          size="sm"
                          className="bg-green-600 text-white hover:bg-green-700"
                          disabled={!selectedCellByReferral[referral.id] || integrateReferralIntoCell.isPending}
                          onClick={() => integrateReferralIntoCell.mutate({ churchId, referralId: referral.id, cellId: Number(selectedCellByReferral[referral.id]) })}
                        >
                          {integrateReferralIntoCell.isPending ? "Concluindo…" : "Concluir e integrar"}
                        </Button>
                      </div>
                    </div>
                  )}
                  {referral.contactNumber && (
                    <div className="mt-3 flex flex-col gap-2 rounded-lg border border-green-200 bg-green-50/60 p-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="flex items-center gap-2 text-sm text-green-800"><Phone className="h-4 w-4" />{referral.contactNumber}</p>
                      <a href={getWhatsAppLink(referral.contactNumber, referral.personName)} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center justify-center rounded-md bg-[#25D366] px-3 text-sm font-medium text-white transition-colors hover:bg-[#1fb65a]">
                        <MessageCircle className="mr-2 h-4 w-4" />Conversar no WhatsApp
                      </a>
                    </div>
                  )}
                  {trackingReferralId === referral.id && (
                    <div className="mt-4 rounded-xl border border-navy/15 bg-navy/[0.025] p-4">
                      <div className="flex items-start gap-3">
                        <ClipboardCheck className="mt-0.5 h-5 w-5 shrink-0 text-navy" />
                        <div>
                          <h3 className="font-semibold text-navy">Acompanhamento do caso</h3>
                          <p className="mt-0.5 text-xs text-muted-foreground">Registre como foi o contato, programe a próxima ação e sinalize se há necessidade de visita.</p>
                        </div>
                      </div>
                      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/60 p-3">
                        <Label htmlFor={`care-due-${referral.id}`} className="flex items-center gap-2 text-amber-900"><Clock3 className="h-4 w-4" />Prazo de cuidado</Label>
                        <p className="mt-1 text-xs text-muted-foreground">Defina quando este caso deve receber atenção. Alertas aparecem nas 48 horas anteriores e após o vencimento.</p>
                        <div className="mt-2 flex flex-col gap-2 sm:flex-row"><Input id={`care-due-${referral.id}`} type="datetime-local" className="bg-background" value={careDueInputByReferral[referral.id] ?? toDateTimeLocal(referral.careDueAt)} onChange={(event) => setCareDueInputByReferral((current) => ({ ...current, [referral.id]: event.target.value }))} /><Button type="button" size="sm" variant="outline" disabled={updateCareDue.isPending} onClick={() => { const value = careDueInputByReferral[referral.id] ?? toDateTimeLocal(referral.careDueAt); if (!value) return; updateCareDue.mutate({ churchId, id: referral.id, careDueAt: new Date(value).toISOString() }); }}>{updateCareDue.isPending ? "Salvando…" : "Atualizar prazo"}</Button></div>
                      </div>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div>
                          <Label>Canal do contato</Label>
                          <Select value={followUpForm.contactChannel} onValueChange={(value) => setFollowUpForm((current) => ({ ...current, contactChannel: value as typeof current.contactChannel }))}>
                            <SelectTrigger className="mt-1 bg-background"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="whatsapp">WhatsApp</SelectItem><SelectItem value="ligacao">Ligação</SelectItem><SelectItem value="mensagem">Mensagem</SelectItem><SelectItem value="visita">Visita</SelectItem><SelectItem value="presencial">Presencial</SelectItem><SelectItem value="outro">Outro</SelectItem></SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Resultado</Label>
                          <Select value={followUpForm.outcome} onValueChange={(value) => setFollowUpForm((current) => ({ ...current, outcome: value as typeof current.outcome }))}>
                            <SelectTrigger className="mt-1 bg-background"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="conversou">Conversou</SelectItem><SelectItem value="sem_resposta">Sem resposta</SelectItem><SelectItem value="retornar">Precisa retornar</SelectItem><SelectItem value="agendou_visita">Visita agendada</SelectItem><SelectItem value="visitou">Visita realizada</SelectItem><SelectItem value="recusou_contato">Recusou contato</SelectItem><SelectItem value="outro">Outro</SelectItem></SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="mt-3">
                        <Label htmlFor={`followup-notes-${referral.id}`}>Como foi o contato? *</Label>
                        <Textarea id={`followup-notes-${referral.id}`} rows={3} className="mt-1 bg-background" value={followUpForm.notes} onChange={(event) => setFollowUpForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Ex.: conversou, relatou dificuldade e aceitou receber uma visita esta semana." />
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div>
                          <Label htmlFor={`next-action-${referral.id}`}>Próxima ação</Label>
                          <Input id={`next-action-${referral.id}`} className="mt-1 bg-background" value={followUpForm.nextAction} onChange={(event) => setFollowUpForm((current) => ({ ...current, nextAction: event.target.value }))} placeholder="Ex.: ligar novamente" />
                        </div>
                        <div>
                          <Label htmlFor={`next-action-at-${referral.id}`}>Data de retorno</Label>
                          <Input id={`next-action-at-${referral.id}`} className="mt-1 bg-background" type="datetime-local" value={followUpForm.nextActionAt} onChange={(event) => setFollowUpForm((current) => ({ ...current, nextActionAt: event.target.value }))} />
                        </div>
                      </div>
                      <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/70 p-3">
                        <Label className="flex items-center gap-2 text-amber-900"><MapPinned className="h-4 w-4" />Necessidade de visita</Label>
                        <Select value={followUpForm.visitStatus} onValueChange={(value) => setFollowUpForm((current) => ({ ...current, visitStatus: value as typeof current.visitStatus }))}>
                          <SelectTrigger className="mt-2 bg-background"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="nao_necessaria">Não é necessária</SelectItem><SelectItem value="solicitada">Solicitar visita</SelectItem><SelectItem value="agendada">Visita agendada</SelectItem><SelectItem value="realizada">Visita realizada</SelectItem><SelectItem value="cancelada">Visita cancelada</SelectItem></SelectContent>
                        </Select>
                        {(["solicitada", "agendada"] as string[]).includes(followUpForm.visitStatus) && (
                          <div className="mt-3 grid gap-3 sm:grid-cols-2">
                            <div>
                              <Label htmlFor={`visit-assignee-${referral.id}`}>Designar Visitador</Label>
                              <Select value={followUpForm.visitAssigneePersonId} onValueChange={(value) => setFollowUpForm((current) => ({ ...current, visitAssigneePersonId: value }))}>
                                <SelectTrigger id={`visit-assignee-${referral.id}`} className="mt-1 bg-background"><SelectValue placeholder="Selecione um Visitador" /></SelectTrigger>
                                <SelectContent>{(visitorsQuery.data ?? []).map((visitor) => <SelectItem key={visitor.personId} value={String(visitor.personId)}>{visitor.name}</SelectItem>)}</SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor={`visit-scheduled-${referral.id}`}>Data e horário</Label>
                              <Input id={`visit-scheduled-${referral.id}`} className="mt-1 bg-background" type="datetime-local" value={followUpForm.visitScheduledAt} onChange={(event) => setFollowUpForm((current) => ({ ...current, visitScheduledAt: event.target.value }))} />
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="mt-3 flex justify-end"><Button type="button" className="bg-navy text-white hover:bg-navy-light" disabled={recordFollowUp.isPending || followUpForm.notes.trim().length < 3} onClick={() => submitFollowUp(referral.id)}>{recordFollowUp.isPending ? "Salvando…" : "Salvar acompanhamento"}</Button></div>

                      <div className="mt-5 border-t border-navy/10 pt-4">
                        <div className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-gold" /><h4 className="text-sm font-semibold text-navy">Linha do tempo do caso</h4></div>
                        {followUpsQuery.isLoading ? <p className="mt-3 text-sm text-muted-foreground">Carregando histórico…</p> : (followUpsQuery.data ?? []).length === 0 ? <p className="mt-3 rounded-lg border border-dashed border-border bg-background/60 p-3 text-sm text-muted-foreground">Ainda não há contatos registrados neste caso.</p> : <div className="mt-3 space-y-3">{(followUpsQuery.data ?? []).map((followUp) => (
                          <div key={followUp.id} className="rounded-lg border border-border bg-background p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium text-navy">{followUp.outcome.replace(/_/g, " ")} · {followUp.contactChannel}</p><span className="text-[11px] text-muted-foreground">{new Date(followUp.createdAt).toLocaleString("pt-BR")}</span></div>
                            <p className="mt-2 text-sm text-foreground">{followUp.notes}</p>
                            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground"><span>Por {followUp.recordedByName}</span>{followUp.nextAction && <span>Próxima ação: {followUp.nextAction}{followUp.nextActionAt ? ` · ${new Date(followUp.nextActionAt).toLocaleString("pt-BR")}` : ""}</span>}{followUp.visitStatus !== "nao_necessaria" && <span className="font-medium text-amber-800">Visita: {followUp.visitStatus.replace(/_/g, " ")}{followUp.visitAssigneeName ? ` · ${followUp.visitAssigneeName}` : ""}{followUp.visitScheduledAt ? ` · ${new Date(followUp.visitScheduledAt).toLocaleString("pt-BR")}` : ""}</span>}</div>
                          </div>
                        ))}</div>}
                      </div>
                    </div>
                  )}
                  {closingReferralId === referral.id && (
                    <div className="mt-4 rounded-lg border border-border bg-muted/30 p-3">
                      <label htmlFor={`close-referral-${referral.id}`} className="text-xs font-medium text-navy">Resultado do acompanhamento *</label>
                      <Textarea id={`close-referral-${referral.id}`} className="mt-2 bg-background" rows={2} value={closeReferralNotes} onChange={(event) => setCloseReferralNotes(event.target.value)} placeholder="Ex.: contato retomado e Pessoa voltará à próxima Célula." />
                      <div className="mt-2 flex justify-end gap-2">
                        <Button size="sm" type="button" variant="ghost" onClick={() => { setClosingReferralId(null); setCloseReferralNotes(""); }}>Cancelar</Button>
                        <Button size="sm" type="button" className="bg-green-600 text-white hover:bg-green-700" disabled={closeReferral.isPending || closeReferralNotes.trim().length < 3} onClick={() => closeReferral.mutate({ churchId, id: referral.id, closeNotes: closeReferralNotes.trim() })}>Confirmar encerramento</Button>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <details className="rounded-2xl border border-border bg-background p-4 sm:p-5">
        <summary className="cursor-pointer list-none text-sm font-semibold text-navy outline-none focus-visible:ring-2 focus-visible:ring-gold/70">Registros antigos de checklist <span className="ml-1 text-xs font-normal text-muted-foreground">(mantidos apenas para histórico)</span></summary>
        <div className="mt-4">
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="h-48 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (consolidations ?? []).length === 0 ? (
        <div className="card-sacred p-12 flex flex-col items-center gap-3 text-center">
          <div className="w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center">
            <Heart className="w-7 h-7 text-rose-500" />
          </div>
          <p className="font-semibold text-navy">Nenhuma consolidação em andamento</p>
          <p className="text-sm text-muted-foreground">
            {hasFullOverview ? "Atribua consolidadores às Novas Almas para começar" : "Quando uma Nova Alma for atribuída a você, ela aparecerá nesta fila."}
          </p>
        </div>
      ) : (
        <div className="space-y-4 animate-stagger">
          {(consolidations ?? []).map((c) => {
            const soul = soulsMap.get(c.soulId);
            const { done, total, pct } = getProgress(c);
            const isComplete = c.status === "consolidado";

            return (
              <div key={c.id} className={`card-sacred p-5 ${isComplete ? "opacity-75" : ""}`}>
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center">
                      <Heart className="w-5 h-5 text-rose-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-navy">{soul?.name ?? "Alma"}</p>
                      <p className="text-xs text-muted-foreground">
                        {soul?.phone ?? "Sem telefone"} · {soul?.origin}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!hasFullOverview && (
                      <span className="text-xs px-2 py-0.5 rounded-full border font-medium bg-navy/5 text-navy border-navy/15">
                        Sua responsabilidade
                      </span>
                    )}
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                        isComplete
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {isComplete ? "Consolidado" : "Em Consolidação"}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Progresso</span>
                    <span className="font-semibold text-navy">
                      {done}/{total} etapas
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        background: pct === 100 ? "#22c55e" : "#c9a84c",
                      }}
                    />
                  </div>
                </div>

                {/* Checklist */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {CHECKLIST_ITEMS.map((item) => {
                    const checked = (c as any)[item.key] as boolean;
                    if (item.key === "addedToCell" && !checked && !isComplete) {
                      const selectedCellId = selectedCellByConsolidation[c.id] ?? "";
                      return (
                        <div key={item.key} className="rounded-lg border border-gold/40 bg-gold/5 p-2.5 sm:col-span-2">
                          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-navy">
                            <Church className="h-4 w-4 text-gold" />
                            Integrar em Célula
                          </div>
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <label className="sr-only" htmlFor={`cell-${c.id}`}>Selecione a Célula para {soul?.name ?? "esta pessoa"}</label>
                            <select
                              id={`cell-${c.id}`}
                              value={selectedCellId}
                              onChange={(event) => setSelectedCellByConsolidation((current) => ({ ...current, [c.id]: event.target.value }))}
                              className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
                            >
                              <option value="">Selecione uma Célula ativa</option>
                              {cells.map((cell) => <option key={cell.id} value={cell.id}>{cell.name}</option>)}
                            </select>
                            <Button
                              type="button"
                              size="sm"
                              className="bg-navy text-white hover:bg-navy-light"
                              disabled={!selectedCellId || integrateIntoCell.isPending}
                              onClick={() => integrateIntoCell.mutate({ churchId, consolidationId: c.id, cellId: Number(selectedCellId) })}
                            >
                              {integrateIntoCell.isPending ? "Integrando…" : "Integrar"}
                            </Button>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <button
                        key={item.key}
                        onClick={() => !isComplete && toggleItem(c.id, item.key, checked)}
                        disabled={isComplete}
                        className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-left transition-all ${
                          checked
                            ? "bg-green-50 border-green-200 text-green-700"
                            : "bg-cream-dark border-border text-muted-foreground hover:border-gold/40"
                        } ${isComplete ? "cursor-default" : "cursor-pointer"}`}
                      >
                        {checked ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 flex-shrink-0" />
                        )}
                        <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="text-xs font-medium">{item.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Mark complete */}
                {!isComplete && done === total && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <Button
                      onClick={() =>
                        updateChecklist.mutate({
                          id: c.id,
                          churchId,
                          status: "consolidado",
                        })
                      }
                      className="w-full bg-green-600 hover:bg-green-700 text-white"
                      size="sm"
                    >
                      Marcar como Consolidado ✓
                    </Button>
                  </div>
                )}

                {/* Notes */}
                {c.notes && (
                  <p className="mt-3 text-xs text-muted-foreground bg-muted rounded-lg p-2">
                    {c.notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
        </div>
      </details>
    </div>
  );
}
