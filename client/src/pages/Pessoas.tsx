import { useChurch } from "@/components/ChurchLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { ArrowRight, BriefcaseBusiness, Cake, Clock3, HeartHandshake, MessageCircle, Plus, Search, Send, ShieldCheck, User, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const STAGES_LABELS: Record<string, string> = {
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

const STAGE_BADGE: Record<string, string> = {
  nova_alma: "badge-nova-alma",
  consolidacao: "badge-consolidacao",
  fundamentos: "badge-fundamentos",
  celula: "badge-celula",
  batismo: "badge-batismo",
  encontro_com_deus: "badge-encontro",
  escola_de_lideres: "badge-escola",
  lideranca: "badge-lideranca",
  multiplicador: "badge-multiplicador",
};

const CARE_ROLE_LABELS: Record<string, string> = {
  quem_ganhou: "Quem ganhou",
  consolidador: "Consolidador",
  lider_celula: "Líder de célula",
  discipulador: "Discipulador",
  pastor: "Pastor",
};

const MINISTRY_TYPE_LABELS: Record<string, string> = {
  consolidacao: "Consolidação",
  visitas: "Visitas",
  louvor: "Louvor",
  infantil: "Infantil",
  recepcao: "Recepção",
  midia: "Mídia",
  intercessao: "Intercessão",
  evangelismo: "Evangelismo",
  casais: "Casais",
  jovens: "Jovens",
  outro: "Outro",
};

const EFFECTIVE_ACCESS_LABELS: Record<string, string> = {
  pastor_presidente: "Pastor presidente",
  pastor_local: "Pastor local",
  secretario: "Secretaria",
  supervisor: "Supervisor",
  lider: "Líder de célula",
  consolidador: "Consolidador",
  visitador: "Visitador",
  lider_consolidacao: "Líder de Consolidação",
  supervisor_consolidacao: "Supervisor de Consolidação",
  lider_visitas: "Líder de Visitas",
  supervisor_visitas: "Supervisor de Visitas",
  tesoureiro: "Tesouraria",
  comunicacao: "Comunicação",
};

function formatEffectiveAccess(role: string) {
  return EFFECTIVE_ACCESS_LABELS[role] ?? role.split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

function civilDateParts(value: string | Date | null | undefined) {
  if (!value) return null;
  const raw = typeof value === "string" ? value.slice(0, 10) : value.toISOString().slice(0, 10);
  const [year, month, day] = raw.split("-").map(Number);
  return year && month && day ? { year, month, day } : null;
}

function formatBirthday(value: string | Date | null | undefined) {
  const parts = civilDateParts(value);
  if (!parts) return "Data não informada";
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long" }).format(new Date(parts.year, parts.month - 1, parts.day));
}

function birthdayAge(value: string | Date | null | undefined, referenceYear: number) {
  const parts = civilDateParts(value);
  return parts ? Math.max(0, referenceYear - parts.year) : null;
}

function birthdayWhatsappHref(person: { fullName: string; phone?: string | null; whatsapp?: string | null }) {
  const digits = (person.whatsapp || person.phone || "").replace(/\\D/g, "");
  if (!digits) return null;
  const international = digits.startsWith("55") ? digits : `55${digits}`;
  const message = `Olá, ${person.fullName}! A igreja deseja felicitar você pelo seu aniversário. Que Deus abençoe sua vida.`;
  return `https://wa.me/${international}?text=${encodeURIComponent(message)}`;
}

const defaultForm = {
  fullName: "",
  cpf: "",
  rg: "",
  birthDate: "",
  gender: "" as any,
  maritalStatus: "" as any,
  profession: "",
  education: "",
  phone: "",
  whatsapp: "",
  email: "",
  zipCode: "",
  street: "",
  number: "",
  neighborhood: "",
  city: "",
  state: "",
  conversionDate: "",
  baptismDate: "",
  previousChurch: "",
  pastoralNotes: "",
  discipleshipStage: "nova_alma" as any,
};

export default function Pessoas() {
  const { churchId } = useChurch();
  const [location, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(defaultForm);
  const [selectedPerson, setSelectedPerson] = useState<any>(null);
  const [personSection, setPersonSection] = useState<"resumo" | "participacoes" | "cuidado" | "historico">("resumo");
  const [birthdaysOpen, setBirthdaysOpen] = useState(false);
  const [birthdayView, setBirthdayView] = useState<"today" | "month">("today");
  const currentDate = useMemo(() => new Date(), []);
  const birthdayMonth = currentDate.getMonth() + 1;
  const birthdayDay = currentDate.getDate();
  const [birthdayMonthFilter, setBirthdayMonthFilter] = useState(birthdayMonth);
  const [careForm, setCareForm] = useState({ responsiblePersonId: "", role: "consolidador", notes: "", releaseAccess: true });
  const [selectedCellId, setSelectedCellId] = useState("");
  const [referralForm, setReferralForm] = useState({ reason: "", notes: "", preferredConsolidatorId: "" });
  const utils = trpc.useUtils();

  const { data: people, isLoading, refetch } = trpc.people.list.useQuery({ churchId, search: search || undefined });
  const birthdaysQuery = trpc.people.birthdays.useQuery(
    { churchId, month: birthdayMonthFilter, day: birthdayView === "today" ? birthdayDay : undefined },
    { enabled: birthdaysOpen }
  );
  const careAttention = trpc.dashboard.careAttention.useQuery({ churchId });
  const currentCare = trpc.care.getCurrent.useQuery(
    { churchId, personId: selectedPerson?.id ?? 0 },
    { enabled: Boolean(selectedPerson?.id) }
  );
  const careHistory = trpc.care.history.useQuery(
    { churchId, personId: selectedPerson?.id ?? 0 },
    { enabled: Boolean(selectedPerson?.id) }
  );
  const cellsQuery = trpc.cells.list.useQuery({ churchId });
  const effectiveRolesQuery = trpc.churchAuth.effectiveRoles.useQuery({ churchId });
  const effectiveRoles = effectiveRolesQuery.data ?? [];
  const isPastor = effectiveRoles.some((role) => ["pastor_presidente", "pastor_local"].includes(role));
  const canManageJourney = isPastor || effectiveRoles.some((role) => ["lider", "supervisor", "consolidador"].includes(role));
  const canManageCellParticipation = isPastor || effectiveRoles.some((role) => ["lider", "supervisor"].includes(role));
  const canCreateReferral = canManageJourney;
  const canManageMinistryFunctions = isPastor;
  const personMembershipsQuery = trpc.ministries.personMemberships.useQuery(
    { churchId, personId: selectedPerson?.id ?? 0 },
    { enabled: Boolean(selectedPerson?.id && canManageMinistryFunctions) }
  );
  const personAccessQuery = trpc.ministries.personAccess.useQuery(
    { churchId, personId: selectedPerson?.id ?? 0 },
    { enabled: Boolean(selectedPerson?.id && canManageMinistryFunctions) }
  );
  const personFunctionsQuery = trpc.ministries.personFunctions.useQuery(
    { churchId, personId: selectedPerson?.id ?? 0 },
    { enabled: Boolean(selectedPerson?.id && canManageMinistryFunctions) }
  );
  const currentCell = trpc.cells.personMembership.useQuery(
    { churchId, personId: selectedPerson?.id ?? 0 },
    { enabled: Boolean(selectedPerson?.id) }
  );
  const cellHistory = trpc.cells.membershipHistory.useQuery(
    { churchId, personId: selectedPerson?.id ?? 0 },
    { enabled: Boolean(selectedPerson?.id) }
  );
  const consolidatorsQuery = trpc.consolidation.consolidators.useQuery({ churchId }, { enabled: canCreateReferral });
  const createPerson = trpc.people.create.useMutation({
    onSuccess: () => {
      toast.success("Pessoa cadastrada com sucesso!");
      setOpen(false);
      setForm(defaultForm);
      refetch();
    },
    onError: () => toast.error("Erro ao cadastrar pessoa"),
  });
  const assignCare = trpc.care.assign.useMutation({
    onSuccess: async (result) => {
      toast.success(result?.accessReleased ? "Responsável atualizado e acesso liberado." : "Responsável pelo cuidado atualizado.");
      setCareForm((current) => ({ ...current, notes: "" }));
      await Promise.all([currentCare.refetch(), careHistory.refetch(), careAttention.refetch()]);
    },
    onError: (error) => toast.error(error.message || "Não foi possível atualizar o responsável."),
  });
  const startConsolidation = trpc.consolidation.create.useMutation({
    onSuccess: async () => {
      toast.success("Consolidação iniciada e responsável atualizado.");
      await Promise.all([
        currentCare.refetch(),
        careHistory.refetch(),
        careAttention.refetch(),
        utils.souls.list.invalidate({ churchId }),
      ]);
    },
    onError: (error) => toast.error(error.message || "Não foi possível iniciar a consolidação."),
  });
  const createReferral = trpc.consolidation.createReferral.useMutation({
    onSuccess: async () => {
      toast.success("Encaminhamento enviado para a fila de Consolidação.");
      setReferralForm({ reason: "", notes: "", preferredConsolidatorId: "" });
      await utils.consolidation.referrals.invalidate({ churchId });
    },
    onError: (error) => toast.error(error.message || "Não foi possível enviar o encaminhamento."),
  });
  const assignCell = trpc.cells.assignPerson.useMutation({
    onSuccess: async (result) => {
      toast.success(result.transferred ? "Pessoa transferida de célula com histórico preservado." : "Pessoa integrada à célula.");
      setSelectedCellId("");
      await Promise.all([currentCell.refetch(), cellHistory.refetch(), currentCare.refetch(), careAttention.refetch(), refetch()]);
    },
    onError: (error) => toast.error(error.message || "Não foi possível integrar a pessoa à célula."),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data: any = { churchId, ...form };
    Object.keys(data).forEach((k) => {
      if (data[k] === "") data[k] = undefined;
    });
    createPerson.mutate(data);
  }

  const selectedAttention = (careAttention.data ?? []).find((item) => item.person.id === selectedPerson?.id);
  const currentResponsible = (people ?? []).find((person) => person.id === currentCare.data?.responsiblePersonId);
  const participationCount = (currentCell.data ? 1 : 0) + (personMembershipsQuery.data?.length ?? 0);
  const accessSummaryText = personAccessQuery.data?.accountLinked ? `${personAccessQuery.data.roles.length} acesso(s) efetivo(s)` : "Sem login vinculado";
  const nextStepLabel = selectedAttention?.nextStep === "Registrar primeiro contato"
    ? "Abrir Consolidação"
    : selectedAttention?.nextStep === "Enviar para célula"
      ? "Abrir Participações"
      : selectedAttention?.nextStep === "Definir responsável"
        ? "Abrir Cuidado"
        : selectedAttention?.nextStep === "Iniciar consolidação"
          ? "Abrir Cuidado"
          : null;
  const canActOnNextStep = Boolean(
    selectedAttention && selectedAttention.nextStep !== "Acompanhamento em dia" && (
      selectedAttention.nextStep === "Enviar para célula" ? canManageCellParticipation : canManageJourney
    )
  );

  useEffect(() => {
    const params = new URLSearchParams(location.split("?")[1] ?? "");
    if (params.get("view") === "birthdays") {
      setBirthdayView("today");
      setBirthdayMonthFilter(birthdayMonth);
      setBirthdaysOpen(true);
    }
  }, [location, birthdayMonth]);

  useEffect(() => {
    const params = new URLSearchParams(location.split("?")[1] ?? "");
    const personId = Number(params.get("personId"));
    const person = (people ?? []).find((candidate) => candidate.id === personId);
    if (person && selectedPerson?.id !== person.id) openPersonJourney(person);
  }, [location, people, selectedPerson?.id]);

  const careTimeline = selectedPerson
    ? [
        ...(selectedAttention?.soul
          ? [{ date: selectedAttention.soul.decisionDate, title: "Nova Alma registrada", detail: "Decisão e origem espiritual registradas." }]
          : []),
        ...(careHistory.data ?? []).map((item) => ({
          date: item.startedAt,
          title: "Responsável pelo cuidado definido",
          detail: `${CARE_ROLE_LABELS[item.role] ?? item.role}${item.notes ? ` · ${item.notes}` : ""}`,
        })),
        ...(selectedAttention?.consolidation?.callDate
          ? [{ date: selectedAttention.consolidation.callDate, title: "Primeiro contato realizado", detail: "Contato de consolidação registrado." }]
          : []),
        ...(selectedAttention?.consolidation?.messageDate
          ? [{ date: selectedAttention.consolidation.messageDate, title: "Mensagem enviada", detail: "Ação de consolidação registrada." }]
          : []),
        ...(selectedAttention?.consolidation?.visitDate
          ? [{ date: selectedAttention.consolidation.visitDate, title: "Visita realizada", detail: "Ação de consolidação registrada." }]
          : []),
        ...(selectedAttention?.consolidation?.prayerDate
          ? [{ date: selectedAttention.consolidation.prayerDate, title: "Oração realizada", detail: "Ação de consolidação registrada." }]
          : []),
        ...(cellHistory.data ?? []).map((membership) => ({
          date: membership.joinedAt,
          title: membership.active ? "Integrada à Célula" : "Histórico de Célula",
          detail: membership.active ? `Célula atual: ${membership.cellName}` : `Participou da Célula ${membership.cellName}`,
        })),
      ]
        .filter((item) => item.date)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : [];

  function openPersonJourney(person: any) {
    setSelectedPerson(person);
    setPersonSection("resumo");
    setCareForm({ responsiblePersonId: "", role: "consolidador", notes: "", releaseAccess: true });
    setSelectedCellId("");
    setReferralForm({ reason: "", notes: "", preferredConsolidatorId: "" });
  }

  function saveCareAssignment() {
    if (!selectedPerson || !careForm.responsiblePersonId) {
      toast.error("Selecione a pessoa responsável pelo cuidado.");
      return;
    }
    assignCare.mutate({
      churchId,
      personId: selectedPerson.id,
      responsiblePersonId: Number(careForm.responsiblePersonId),
      role: careForm.role as "quem_ganhou" | "consolidador" | "lider_celula" | "discipulador" | "pastor",
      notes: careForm.notes.trim() || undefined,
      releaseAccess: careForm.releaseAccess,
    });
  }

  function handleStartConsolidation() {
    const consolidatorId = Number(careForm.responsiblePersonId) || currentCare.data?.responsiblePersonId;
    if (!selectedAttention?.soul) {
      toast.error("Esta pessoa não possui uma Nova Alma pendente de consolidação.");
      return;
    }
    if (!consolidatorId) {
      toast.error("Defina primeiro o consolidador responsável.");
      return;
    }
    startConsolidation.mutate({ churchId, soulId: selectedAttention.soul.id, consolidatorId });
  }

  function handleCellAssignment() {
    if (!selectedPerson || !selectedCellId) {
      toast.error("Selecione uma célula ativa.");
      return;
    }
    assignCell.mutate({ churchId, personId: selectedPerson.id, cellId: Number(selectedCellId) });
  }

  function handleCreateReferral() {
    if (!selectedPerson || referralForm.reason.trim().length < 3) {
      toast.error("Informe o motivo do encaminhamento para Consolidação.");
      return;
    }
    createReferral.mutate({
      churchId,
      personId: selectedPerson.id,
      reason: referralForm.reason.trim(),
      notes: referralForm.notes.trim() || undefined,
      preferredConsolidatorId: referralForm.preferredConsolidatorId ? Number(referralForm.preferredConsolidatorId) : undefined,
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-navy">Pessoas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Um cadastro único para acompanhar pessoas, participações e cuidado.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => { setBirthdayView("today"); setBirthdayMonthFilter(birthdayMonth); setBirthdaysOpen(true); }} className="gap-2 border-gold/40 text-navy hover:bg-gold/10">
            <Cake className="h-4 w-4 text-gold" />
            Aniversariantes
          </Button>
          <Button onClick={() => setOpen(true)} className="bg-navy hover:bg-navy-light text-white gap-2">
            <Plus className="w-4 h-4" />
            Nova Pessoa
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, e-mail ou telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Dialog open={birthdaysOpen} onOpenChange={setBirthdaysOpen}>
        <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-navy"><Cake className="h-5 w-5 text-gold" />Aniversariantes</DialogTitle>
            <DialogDescription>Consulte os aniversários das Pessoas ativas da sua igreja para planejar o cuidado e o contato.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-[1fr_1fr_10rem]">
              <Button type="button" variant={birthdayView === "today" ? "default" : "outline"} onClick={() => { setBirthdayView("today"); setBirthdayMonthFilter(birthdayMonth); }} className={birthdayView === "today" ? "bg-navy text-white hover:bg-navy-light" : "text-navy"}>Hoje · {String(birthdayDay).padStart(2, "0")}/{String(birthdayMonth).padStart(2, "0")}</Button>
              <Button type="button" variant={birthdayView === "month" ? "default" : "outline"} onClick={() => setBirthdayView("month")} className={birthdayView === "month" ? "bg-navy text-white hover:bg-navy-light" : "text-navy"}>Este mês</Button>
              <select aria-label="Mês dos aniversariantes" value={birthdayMonthFilter} onChange={(event) => { setBirthdayMonthFilter(Number(event.target.value)); setBirthdayView("month"); }} className="h-10 rounded-md border border-input bg-background px-3 text-sm text-navy">
                {Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(new Date(2024, index, 1))}</option>)}
              </select>
            </div>
            <p className="text-xs text-muted-foreground">{birthdayView === "today" ? `Aniversariantes de hoje, ${formatBirthday(new Date(currentDate.getFullYear(), birthdayMonth - 1, birthdayDay))}.` : `Aniversariantes de ${new Intl.DateTimeFormat("pt-BR", { month: "long" }).format(new Date(2024, birthdayMonthFilter - 1, 1))}.`}</p>
            {birthdaysQuery.isLoading ? <div className="space-y-2">{[1, 2, 3].map((item) => <div key={item} className="h-16 animate-pulse rounded-xl bg-muted" />)}</div> : birthdaysQuery.isError ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">Não foi possível carregar os aniversariantes. Atualize a página e tente novamente.</div> : (birthdaysQuery.data ?? []).length === 0 ? <div className="rounded-xl border border-dashed border-gold/35 bg-gold/5 p-8 text-center"><Cake className="mx-auto h-8 w-8 text-gold/60" /><p className="mt-2 font-medium text-navy">Nenhum aniversariante encontrado</p><p className="mt-1 text-sm text-muted-foreground">Pessoas sem data de nascimento não aparecem nesta lista.</p></div> : <div className="divide-y divide-border rounded-xl border border-border">{(birthdaysQuery.data ?? []).map((person) => { const parts = civilDateParts(person.birthDate); const age = birthdayAge(person.birthDate, currentDate.getFullYear()); const whatsappHref = birthdayWhatsappHref(person); return <div key={person.id} className="flex min-w-0 items-center gap-3 p-3 sm:gap-4 sm:p-4"><div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-gold/10 text-center text-navy"><strong className="font-display text-lg leading-none">{parts?.day ?? "—"}</strong><span className="mt-0.5 text-[9px] uppercase text-gold">{parts ? new Intl.DateTimeFormat("pt-BR", { month: "short" }).format(new Date(2024, parts.month - 1, 1)).replace(".", "") : ""}</span></div><div className="min-w-0 flex-1"><p className="truncate font-semibold text-navy">{person.fullName}</p><p className="mt-0.5 text-xs text-muted-foreground">{formatBirthday(person.birthDate)}{age !== null ? ` · ${age} anos` : ""}{person.phone ? ` · ${person.phone}` : ""}</p></div>{whatsappHref ? <a href={whatsappHref} target="_blank" rel="noreferrer" aria-label={`Enviar parabéns para ${person.fullName} pelo WhatsApp`} title="Enviar parabéns pelo WhatsApp" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100"><MessageCircle className="h-4 w-4" /></a> : <span className="shrink-0 text-[11px] text-muted-foreground">Sem contato</span>}</div>; })}</div>}
          </div>
        </DialogContent>
      </Dialog>

      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {Object.entries(STAGES_LABELS).slice(0, 5).map(([key, label]) => {
          const count = (people ?? []).filter((p) => p.discipleshipStage === key).length;
          return (
            <div key={key} className="card-sacred p-3 text-center">
              <p className="text-xl font-bold font-display text-navy">{count}</p>
              <p className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium mt-1 ${STAGE_BADGE[key]}`}>
                {label}
              </p>
            </div>
          );
        })}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (people ?? []).length === 0 ? (
        <div className="card-sacred flex flex-col items-center gap-3 p-10 text-center sm:p-12">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-navy/10">
            <Users className="h-7 w-7 text-navy" />
          </div>
          <p className="font-semibold text-navy">{search ? "Nenhuma Pessoa encontrada" : "Nenhuma Pessoa cadastrada"}</p>
          <p className="max-w-sm text-sm text-muted-foreground">{search ? "Tente outro nome, e-mail ou telefone, ou limpe a busca." : "Comece pela recepção: cadastre a primeira Pessoa da sua igreja."}</p>
          {search ? (
            <Button type="button" variant="outline" onClick={() => setSearch("")}>Limpar busca</Button>
          ) : (
            <Button type="button" className="bg-navy text-white hover:bg-navy-light" onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Cadastrar primeira Pessoa</Button>
          )}
        </div>
      ) : (
        <div className="space-y-2 animate-stagger">
          {(people ?? []).map((person) => (
            <button
              key={person.id}
              type="button"
              onClick={() => openPersonJourney(person)}
              className="card-sacred flex w-full items-center gap-4 p-4 text-left transition-colors hover:border-gold/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
              aria-label={`Abrir jornada de cuidado de ${person.fullName}`}
            >
              <div className="w-10 h-10 rounded-full bg-cream-dark flex items-center justify-center flex-shrink-0">
                {person.photoUrl ? (
                  <img src={person.photoUrl} alt={person.fullName} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-navy">{person.fullName.charAt(0)}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-navy">{person.fullName}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  {person.phone && <span className="text-xs text-muted-foreground">{person.phone}</span>}
                  {person.email && <span className="text-xs text-muted-foreground hidden sm:block">{person.email}</span>}
                  {person.city && <span className="text-xs text-muted-foreground hidden md:block">{person.city}/{person.state}</span>}
                </div>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${STAGE_BADGE[person.discipleshipStage ?? "nova_alma"]}`}>
                Jornada: {STAGES_LABELS[person.discipleshipStage ?? "nova_alma"]}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-navy flex items-center gap-2">
              <User className="w-5 h-5" />
              Cadastrar Pessoa
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <Tabs defaultValue="pessoal" className="w-full">
              <TabsList className="grid grid-cols-4 w-full mb-4">
                <TabsTrigger value="pessoal">Pessoal</TabsTrigger>
                <TabsTrigger value="contato">Contato</TabsTrigger>
                <TabsTrigger value="endereco">Endereço</TabsTrigger>
                <TabsTrigger value="espiritual">Espiritual</TabsTrigger>
              </TabsList>

              <TabsContent value="pessoal" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Nome Completo *</Label>
                    <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
                  </div>
                  <div>
                    <Label>CPF</Label>
                    <Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} placeholder="000.000.000-00" />
                  </div>
                  <div>
                    <Label>RG</Label>
                    <Input value={form.rg} onChange={(e) => setForm({ ...form, rg: e.target.value })} />
                  </div>
                  <div>
                    <Label>Data de Nascimento *</Label>
                    <Input type="date" max={new Date().toISOString().slice(0, 10)} required value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
                  </div>
                  <div>
                    <Label>Sexo</Label>
                    <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v as any })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="masculino">Masculino</SelectItem>
                        <SelectItem value="feminino">Feminino</SelectItem>
                        <SelectItem value="outro">Outro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Estado Civil</Label>
                    <Select value={form.maritalStatus} onValueChange={(v) => setForm({ ...form, maritalStatus: v as any })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solteiro">Solteiro(a)</SelectItem>
                        <SelectItem value="casado">Casado(a)</SelectItem>
                        <SelectItem value="divorciado">Divorciado(a)</SelectItem>
                        <SelectItem value="viuvo">Viúvo(a)</SelectItem>
                        <SelectItem value="uniao_estavel">União Estável</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Profissão</Label>
                    <Input value={form.profession} onChange={(e) => setForm({ ...form, profession: e.target.value })} />
                  </div>
                  <div>
                    <Label>Escolaridade</Label>
                    <Input value={form.education} onChange={(e) => setForm({ ...form, education: e.target.value })} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="contato" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Telefone</Label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(00) 00000-0000" />
                  </div>
                  <div>
                    <Label>WhatsApp</Label>
                    <Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="(00) 00000-0000" />
                  </div>
                  <div className="col-span-2">
                    <Label>E-mail</Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="endereco" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>CEP</Label>
                    <Input value={form.zipCode} onChange={(e) => setForm({ ...form, zipCode: e.target.value })} placeholder="00000-000" />
                  </div>
                  <div>
                    <Label>Número</Label>
                    <Input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <Label>Rua</Label>
                    <Input value={form.street} onChange={(e) => setForm({ ...form, street: e.target.value })} />
                  </div>
                  <div>
                    <Label>Bairro</Label>
                    <Input value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} />
                  </div>
                  <div>
                    <Label>Cidade</Label>
                    <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                  </div>
                  <div>
                    <Label>Estado</Label>
                    <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} maxLength={2} placeholder="SP" />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="espiritual" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Data de Conversão</Label>
                    <Input type="date" value={form.conversionDate} onChange={(e) => setForm({ ...form, conversionDate: e.target.value })} />
                  </div>
                  <div>
                    <Label>Data do Batismo</Label>
                    <Input type="date" value={form.baptismDate} onChange={(e) => setForm({ ...form, baptismDate: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <Label>Igreja Anterior</Label>
                    <Input value={form.previousChurch} onChange={(e) => setForm({ ...form, previousChurch: e.target.value })} />
                  </div>
                  <div className="col-span-2">
                    <Label>Jornada atual</Label>
                    <Select value={form.discipleshipStage} onValueChange={(v) => setForm({ ...form, discipleshipStage: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(STAGES_LABELS).map(([v, l]) => (
                          <SelectItem key={v} value={v}>{l}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label>Observações Pastorais</Label>
                    <Textarea value={form.pastoralNotes} onChange={(e) => setForm({ ...form, pastoralNotes: e.target.value })} rows={3} />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex gap-3 mt-6">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">Cancelar</Button>
              <Button type="submit" className="flex-1 bg-navy hover:bg-navy-light text-white" disabled={createPerson.isPending}>
                {createPerson.isPending ? "Salvando..." : "Cadastrar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedPerson)} onOpenChange={(nextOpen) => !nextOpen && setSelectedPerson(null)}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-navy"><HeartHandshake className="h-5 w-5 text-rose-600" />{selectedPerson?.fullName}</DialogTitle>
            <DialogDescription>Uma Pessoa, várias participações e um histórico único de cuidado.</DialogDescription>
          </DialogHeader>

          <div role="tablist" aria-label="Seções da ficha da Pessoa" className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1 sm:grid-cols-4">
            {[
              ["resumo", "Resumo"],
              ["participacoes", "Participações"],
              ["cuidado", "Cuidado"],
              ["historico", "Histórico"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={personSection === value}
                onClick={() => setPersonSection(value as typeof personSection)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${personSection === value ? "bg-background text-navy shadow-sm" : "text-muted-foreground hover:bg-background/70 hover:text-navy"}`}
              >
                {label}
              </button>
            ))}
          </div>

          {personSection === "resumo" && selectedPerson && <div className="grid gap-2 sm:grid-cols-4">
            <div className="rounded-lg border border-border bg-muted/30 p-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Jornada</p><p className="mt-1 text-sm font-semibold text-navy">{STAGES_LABELS[selectedPerson.discipleshipStage ?? "nova_alma"]}</p></div>
            <div className="rounded-lg border border-border bg-muted/30 p-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Participações</p><p className="mt-1 text-sm font-semibold text-navy">{participationCount} ativa(s)</p></div>
            <div className="rounded-lg border border-border bg-muted/30 p-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Responsabilidade</p><p className="mt-1 truncate text-sm font-semibold text-navy">{currentResponsible?.fullName ?? "Não definida"}</p></div>
            {canManageMinistryFunctions && <div className="rounded-lg border border-border bg-muted/30 p-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Acesso</p><p className="mt-1 text-sm font-semibold text-navy">{accessSummaryText}</p></div>}
          </div>}

          {personSection === "resumo" && selectedAttention && (
            <div className={`rounded-xl border p-4 ${selectedAttention.priority === "alta" ? "border-rose-200 bg-rose-50/60" : selectedAttention.priority === "media" ? "border-amber-200 bg-amber-50/60" : "border-green-200 bg-green-50/60"}`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <ShieldCheck className={`mt-0.5 h-5 w-5 shrink-0 ${selectedAttention.priority === "alta" ? "text-rose-600" : selectedAttention.priority === "media" ? "text-amber-600" : "text-green-600"}`} />
                  <div>
                    <p className="text-sm font-semibold text-navy">Próximo passo: {selectedAttention.nextStep}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{selectedAttention.reasons.length > 0 ? selectedAttention.reasons.join(" · ") : "Não há pendências críticas no momento."}</p>
                  </div>
                </div>
                {canActOnNextStep && nextStepLabel && (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full shrink-0 gap-2 sm:w-auto"
                    onClick={() => {
                      if (selectedAttention.nextStep === "Registrar primeiro contato") {
                        navigate("/app/consolidacao");
                      } else if (selectedAttention.nextStep === "Enviar para célula") {
                        setPersonSection("participacoes");
                      } else {
                        setPersonSection("cuidado");
                      }
                    }}
                  >
                    {nextStepLabel} <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          )}

          {personSection === "cuidado" && <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded-xl border border-border p-4">
              <h3 className="text-sm font-semibold text-navy">Responsável atual</h3>
              {currentCare.isLoading ? <p className="mt-2 text-sm text-muted-foreground">Carregando…</p> : currentCare.data ? (
                <div className="mt-3 space-y-1">
                  <p className="font-medium text-navy">{currentResponsible?.fullName ?? "Pessoa vinculada"}</p>
                  <Badge variant="outline" className="text-xs">{CARE_ROLE_LABELS[currentCare.data.role] ?? currentCare.data.role}</Badge>
                </div>
              ) : <p className="mt-2 text-sm text-rose-700">Nenhum responsável definido.</p>}
            </section>
            <section className="rounded-xl border border-border p-4">
              <h3 className="text-sm font-semibold text-navy">Histórico de cuidado</h3>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground"><Clock3 className="h-4 w-4" />{careHistory.data?.length ?? 0} atribuição(ões) registrada(s)</p>
            </section>
          </div>}

          {personSection === "historico" && <section className="rounded-xl border border-border p-4">
            <h3 className="text-sm font-semibold text-navy">Linha do tempo de acompanhamento</h3>
            {careTimeline.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Ainda não há ações de cuidado registradas.</p>
            ) : (
              <div className="mt-4 space-y-4 border-l border-gold/30 pl-4">
                {careTimeline.slice(0, 10).map((event, index) => (
                  <div key={`${event.title}-${index}`} className="relative">
                    <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-gold" />
                    <p className="text-sm font-medium text-navy">{event.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{event.detail}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{new Date(event.date).toLocaleDateString("pt-BR")}</p>
                  </div>
                ))}
              </div>
            )}
          </section>}

          {personSection === "cuidado" && canManageJourney && (
            <section className="rounded-xl border border-gold/25 bg-gold/5 p-4">
              <h3 className="text-sm font-semibold text-navy">Definir responsável pelo cuidado</h3>
            <p className="mt-1 text-xs text-muted-foreground">Ao atualizar, o responsável anterior é preservado no histórico e deixa de ficar ativo.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="care-responsible">Responsável *</Label>
                <Select value={careForm.responsiblePersonId} onValueChange={(value) => setCareForm((current) => ({ ...current, responsiblePersonId: value }))}>
                  <SelectTrigger id="care-responsible" className="mt-1 bg-background"><SelectValue placeholder="Selecione uma pessoa" /></SelectTrigger>
                  <SelectContent>{(people ?? []).map((person) => <SelectItem key={person.id} value={String(person.id)}>{person.fullName}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="care-role">Função no cuidado *</Label>
                <Select value={careForm.role} onValueChange={(value) => setCareForm((current) => ({ ...current, role: value }))}>
                  <SelectTrigger id="care-role" className="mt-1 bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(CARE_ROLE_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <label className="mt-3 flex items-start gap-3 rounded-lg border border-border/70 bg-background/70 p-3 text-sm">
              <input
                type="checkbox"
                checked={careForm.releaseAccess}
                onChange={(event) => setCareForm((current) => ({ ...current, releaseAccess: event.target.checked }))}
                className="mt-0.5 h-4 w-4 accent-navy"
              />
              <span>
                <span className="block font-medium text-navy">Liberar acesso ao login após salvar</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">A conta pendente desta Pessoa será aprovada e ativada. Desmarque para apenas registrar o responsável.</span>
              </span>
            </label>
            <div className="mt-3">
              <Label htmlFor="care-notes">Observação</Label>
              <Textarea id="care-notes" className="mt-1 bg-background" rows={2} value={careForm.notes} onChange={(event) => setCareForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Ex.: responsável definido após primeiro contato" />
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              {selectedAttention?.nextStep === "Iniciar consolidação" && <Button type="button" variant="outline" onClick={handleStartConsolidation} disabled={startConsolidation.isPending}>Iniciar consolidação</Button>}
              <Button type="button" className="bg-navy text-white hover:bg-navy-light" onClick={saveCareAssignment} disabled={assignCare.isPending}>{assignCare.isPending ? "Salvando…" : "Atualizar responsável"}</Button>
            </div>
            </section>
          )}

          {personSection === "participacoes" && canManageMinistryFunctions && (
            <section className="rounded-xl border border-indigo-200 bg-indigo-50/35 p-4">
              <div className="flex items-start gap-3">
                <BriefcaseBusiness className="mt-0.5 h-5 w-5 shrink-0 text-indigo-700" />
                <div>
                  <h3 className="text-sm font-semibold text-navy">Participações e atuações</h3>
                  <p className="mt-1 text-xs text-muted-foreground">A Jornada é apenas um marcador. A Pessoa pode participar de vários Ministérios, e os acessos são calculados pelos vínculos ativos.</p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-indigo-100 bg-background/80 p-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-indigo-900">Ministérios da pessoa</h4>
                  {personMembershipsQuery.isLoading ? <p className="mt-2 text-xs text-muted-foreground">Carregando…</p> : (personMembershipsQuery.data ?? []).length === 0 ? (
                    <p className="mt-2 text-xs text-muted-foreground">Nenhum Ministério ativo.</p>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {(personMembershipsQuery.data ?? []).map((membership) => (
                        <div key={membership.id} className="flex items-start justify-between gap-2 rounded-md border border-border/70 px-2.5 py-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-navy">{membership.ministryName}</p>
                            <p className="text-[11px] text-muted-foreground">{MINISTRY_TYPE_LABELS[membership.ministryType] ?? "Ministério"} · Participante ativo</p>
                          </div>
                          {membership.isLeader && <Badge variant="outline" className="shrink-0 text-[10px]">Líder</Badge>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-lg border border-indigo-100 bg-background/80 p-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-indigo-900">Atuações na equipe</h4>
                  {(personFunctionsQuery.data ?? []).length === 0 ? (
                    <p className="mt-2 text-xs text-muted-foreground">Nenhuma função manual atribuída.</p>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {(personFunctionsQuery.data ?? []).map((assignment) => (
                        <div key={assignment.id} className="flex items-start justify-between gap-2 rounded-md border border-border/70 px-2.5 py-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-navy">{assignment.roleLabel}</p>
                            <p className="truncate text-[11px] text-muted-foreground">{assignment.ministryName}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-lg border border-indigo-100 bg-background/80 p-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-indigo-900">Acessos efetivos</h4>
                  {!personAccessQuery.data?.accountLinked ? (
                    <p className="mt-2 text-xs text-amber-800">Sem login ativo vinculado. A membresia e as funções ficam registradas, mas não há acesso para entrar no sistema.</p>
                  ) : (personAccessQuery.data.roles ?? []).length === 0 ? (
                    <p className="mt-2 text-xs text-muted-foreground">Login vinculado, mas nenhum acesso ministerial efetivo.</p>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {personAccessQuery.data.roles.map((role) => <Badge key={role} variant="outline" className="text-[10px]">{formatEffectiveAccess(role)}</Badge>)}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-indigo-100 bg-background/60 p-3 text-xs text-muted-foreground">
                Para adicionar ou alterar uma atuação, abra o painel do Ministério correspondente. Esta ficha resume os vínculos; a equipe administra suas próprias atuações no contexto correto.
              </div>
            </section>
          )}

          {personSection === "cuidado" && canCreateReferral && (
            <section className="rounded-xl border border-rose-200 bg-rose-50/45 p-4">
              <div className="flex items-start gap-3">
              <Send className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
              <div>
                <h3 className="text-sm font-semibold text-navy">Enviar para Consolidação</h3>
                <p className="mt-1 text-xs text-muted-foreground">Use quando esta Pessoa precisa de resgate: faltas recorrentes, ausência de resposta ou outra necessidade de cuidado. O encaminhamento entra na fila da equipe de Consolidação.</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="referral-reason">Motivo *</Label>
                <Input id="referral-reason" className="mt-1 bg-background" value={referralForm.reason} onChange={(event) => setReferralForm((current) => ({ ...current, reason: event.target.value }))} placeholder="Ex.: faltou à célula e não responde" />
              </div>
              <div>
                <Label htmlFor="referral-consolidator">Indicar Consolidador</Label>
                <Select value={referralForm.preferredConsolidatorId} onValueChange={(value) => setReferralForm((current) => ({ ...current, preferredConsolidatorId: value }))}>
                  <SelectTrigger id="referral-consolidator" className="mt-1 bg-background"><SelectValue placeholder="Disponibilizar para a equipe" /></SelectTrigger>
                  <SelectContent>
                    {(consolidatorsQuery.data ?? []).map((consolidator) => <SelectItem key={consolidator.personId} value={String(consolidator.personId)}>{consolidator.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-3">
              <Label htmlFor="referral-notes">Observação para o Consolidador</Label>
              <Textarea id="referral-notes" className="mt-1 bg-background" rows={2} value={referralForm.notes} onChange={(event) => setReferralForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Contexto que ajuda no primeiro contato, sem expor informações desnecessárias." />
            </div>
              <div className="mt-4 flex justify-end">
                <Button type="button" variant="outline" onClick={handleCreateReferral} disabled={createReferral.isPending} className="border-rose-200 text-rose-700 hover:bg-rose-100">
                <Send className="mr-2 h-4 w-4" />{createReferral.isPending ? "Enviando…" : "Enviar para Consolidação"}
                </Button>
              </div>
            </section>
          )}

          {personSection === "participacoes" && (
            <section className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
              <h3 className="text-sm font-semibold text-navy">Participação em Célula</h3>
            {currentCell.isLoading ? (
              <p className="mt-2 text-sm text-muted-foreground">Carregando vínculo de célula…</p>
            ) : currentCell.data ? (
              <div className="mt-2 rounded-lg border border-indigo-100 bg-background/80 p-3">
                <p className="text-sm font-medium text-navy">Célula ativa: {currentCell.data.cellName}</p>
                <p className="mt-1 text-xs text-muted-foreground">Desde {new Date(currentCell.data.joinedAt).toLocaleDateString("pt-BR")}. Escolher outra célula fará uma transferência, sem apagar o histórico.</p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-amber-800">Esta pessoa ainda não possui uma célula ativa.</p>
            )}
            {canManageCellParticipation ? (
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <Label htmlFor="journey-cell">Célula de destino</Label>
                  <Select value={selectedCellId} onValueChange={setSelectedCellId}>
                    <SelectTrigger id="journey-cell" className="mt-1 bg-background"><SelectValue placeholder="Selecione uma célula ativa" /></SelectTrigger>
                    <SelectContent>{(cellsQuery.data ?? []).map((cell) => <SelectItem key={cell.id} value={String(cell.id)}>{cell.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button type="button" variant="outline" onClick={handleCellAssignment} disabled={assignCell.isPending || (cellsQuery.data ?? []).length === 0}>
                  {assignCell.isPending ? "Atualizando…" : currentCell.data ? "Transferir" : "Integrar à Célula"}
                </Button>
              </div>
            ) : <p className="mt-3 text-xs text-muted-foreground">A integração e a transferência de Célula são feitas pelo Pastor ou pela liderança responsável.</p>}
              {cellHistory.data && cellHistory.data.length > 1 && <p className="mt-3 text-xs text-muted-foreground">{cellHistory.data.length - 1} vínculo(s) anterior(es) preservado(s) no histórico.</p>}
            </section>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
