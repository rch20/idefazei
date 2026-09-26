import { useChurch } from "@/components/ChurchLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AdaptiveFormDialogBody, AdaptiveFormDialogContent, AdaptiveFormDialogFooter, adaptiveFormDialogHeaderClassName } from "@/components/AdaptiveFormDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { AlertCircle, ArrowRight, BriefcaseBusiness, Cake, Clock3, HeartHandshake, MessageCircle, Plus, Search, Send, ShieldCheck, User, UserMinus, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { civilDateParts, currentCivilDateKey, currentCivilDateParts } from "@/lib/civilDate";
import { DISCIPLESHIP_STAGE_LABELS } from "@/lib/discipleshipState";
import { createIdempotencyKey } from "@/lib/idempotency";
import { PERSON_SECTION_VALUES, resolvePersonSection, type PersonSection } from "@/lib/personSection";
import { PersonExecutiveSummary } from "@/components/PersonExecutiveSummary";
import { PersonHistoryTimeline, type PersonHistoryEvent } from "@/components/PersonHistoryTimeline";
import { PersonSectionState, resolvePersonSectionState } from "@/components/PersonSectionState";
import { ConfirmDestructiveActionDialog } from "@/components/ConfirmDestructiveActionDialog";
import { CARE_ROLE_LABELS, getCareRoleLabel } from "@/lib/careLabels";

const STAGES_LABELS: Record<string, string> = DISCIPLESHIP_STAGE_LABELS;

const JOURNEY_STAGES = [
  "nova_alma",
  "consolidacao",
  "fundamentos",
  "celula",
  "batismo",
  "encontro_com_deus",
  "escola_de_lideres",
  "lideranca",
  "multiplicador",
] as const;

type JourneyStage = typeof JOURNEY_STAGES[number];
type JourneyStatus = "concluida" | "pendente" | "nao_registrada";
type DirectoryFilter = "todas" | JourneyStage | "sem_responsavel" | "atencao";
type PersonCareFocus = "discipulador" | null;
type PendingDestructiveAction =
  | { kind: "cell-removal"; personId: number; personName: string; cellId: number; cellName: string }
  | { kind: "pastoral-coverage-removal"; pastorPersonId: number; personName: string }
  | null;
const PERSON_SECTIONS = PERSON_SECTION_VALUES;
const PERSON_SECTION_OPTIONS: Array<{ value: PersonSection; label: string; description: string; pastoralOnly?: boolean }> = [
  { value: "resumo", label: "Resumo", description: "Visão geral, próximo passo e situação atual." },
  { value: "jornada", label: "Jornada", description: "Etapa principal, frentes paralelas e progresso." },
  { value: "cuidado", label: "Cuidado", description: "Responsável, acompanhamento e encaminhamentos." },
  { value: "participacoes", label: "Participações", description: "Célula atual, histórico e atuações ministeriais." },
  { value: "cobertura", label: "Cobertura espiritual", description: "Vínculo pastoral administrativo.", pastoralOnly: true },
  { value: "historico", label: "Histórico", description: "Eventos anteriores, sem alterar os estados atuais." },
];

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

const DIRECTORY_CARE_LABELS: Record<string, string> = {
  sem_responsavel: "Sem responsável",
  na_fila: "Na fila de cuidado",
  atrasado: "Cuidado atrasado",
  acompanhamento: "Em acompanhamento",
  em_dia: "Acompanhamento em dia",
};

const JOURNEY_STAGE_DESCRIPTIONS: Record<JourneyStage, string> = {
  nova_alma: "Primeiro registro e acolhimento da pessoa.",
  consolidacao: "Contato, cuidado inicial e acompanhamento próximo.",
  fundamentos: "Formação básica da fé e dos fundamentos cristãos.",
  celula: "Integração em uma Célula e vida em comunidade.",
  batismo: "Preparação e acompanhamento para o Batismo.",
  encontro_com_deus: "Participação e acompanhamento no Encontro com Deus.",
  escola_de_lideres: "Formação para servir e desenvolver liderança.",
  lideranca: "Exercício de liderança com responsabilidade e cuidado.",
  multiplicador: "Formação de novos discípulos e multiplicação do cuidado.",
};

const JOURNEY_STATUS_CLASS: Record<JourneyStatus, string> = {
  concluida: "border-emerald-200 bg-emerald-50 text-emerald-900",
  pendente: "border-rose-200 bg-rose-50 text-rose-900",
  nao_registrada: "border-slate-200 bg-slate-50/80 text-slate-600",
};

const JOURNEY_STATUS_BADGE_CLASS: Record<JourneyStatus, string> = {
  concluida: "border-emerald-200 bg-emerald-100 text-emerald-800",
  pendente: "border-rose-200 bg-rose-100 text-rose-800",
  nao_registrada: "border-slate-200 bg-white/80 text-slate-600",
};

const CONSOLIDATION_STATUS_LABELS: Record<string, string> = {
  pendente: "Pendente",
  aprovado: "Aprovado",
  aceito: "Aceito",
  em_acompanhamento: "Em acompanhamento",
  encerrado: "Encerrado",
  cancelado: "Cancelado",
};

const CONSOLIDATION_ACTION_LABELS: Record<string, string> = {
  atribuido: "Responsável atribuído",
  reatribuido: "Responsável alterado",
  aprovado: "Caso aprovado",
  aceito: "Caso assumido",
  devolvido_fila: "Caso devolvido à fila",
};

const CONTACT_CHANNEL_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  ligacao: "Ligação",
  mensagem: "Mensagem",
  visita: "Visita",
  presencial: "Presencial",
  outro: "Outro contato",
};

const FOLLOW_UP_OUTCOME_LABELS: Record<string, string> = {
  conversou: "Conversou",
  sem_resposta: "Sem resposta",
  retornar: "Retornar",
  agendou_visita: "Visita agendada",
  visitou: "Visita realizada",
  recusou_contato: "Contato recusado",
  outro: "Outro resultado",
};

const VISIT_STATUS_LABELS: Record<string, string> = {
  solicitada: "Solicitada",
  agendada: "Agendada",
  em_andamento: "Em andamento",
  realizada: "Realizada",
  cancelada: "Cancelada",
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

const defaultCoverageForm = {
  coveringPastorPersonId: "",
  coveringChurchName: "",
  coveringPastorName: "",
  coveringPastorPhone: "",
  coveringPastorWhatsapp: "",
  notes: "",
};

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
  const [formError, setFormError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [directoryFilter, setDirectoryFilter] = useState<DirectoryFilter>("todas");
  const [form, setForm] = useState(defaultForm);
  const [selectedPerson, setSelectedPerson] = useState<any>(null);
  const [pendingDestructiveAction, setPendingDestructiveAction] = useState<PendingDestructiveAction>(null);
  const consumedPersonDeepLinkRef = useRef<string | null>(null);
  const [journeyNoteStage, setJourneyNoteStage] = useState<JourneyStage | null>(null);
  const [journeyNote, setJourneyNote] = useState("");
  const [personSection, setPersonSection] = useState<PersonSection>("resumo");
  const [birthdaysOpen, setBirthdaysOpen] = useState(false);
  const [birthdayView, setBirthdayView] = useState<"today" | "month">("today");
  const currentCivilParts = useMemo(() => currentCivilDateParts(), []);
  const currentDate = useMemo(() => currentCivilParts ? new Date(currentCivilParts.year, currentCivilParts.month - 1, currentCivilParts.day) : new Date(), [currentCivilParts]);
  const birthdayMonth = currentCivilParts?.month ?? currentDate.getMonth() + 1;
  const birthdayDay = currentCivilParts?.day ?? currentDate.getDate();
  const [birthdayMonthFilter, setBirthdayMonthFilter] = useState(birthdayMonth);
  const [careForm, setCareForm] = useState({ responsiblePersonId: "", role: "consolidador", notes: "", releaseAccess: true });
  const [selectedCellId, setSelectedCellId] = useState("");
  const [referralForm, setReferralForm] = useState({ reason: "", notes: "", preferredConsolidatorId: "", idempotencyKey: createIdempotencyKey() });
  const [coverageForm, setCoverageForm] = useState(defaultCoverageForm);
  const utils = trpc.useUtils();

  const { data: people, isLoading, refetch } = trpc.people.list.useQuery({ churchId, search: search || undefined });
  const directoryQuery = trpc.people.directory.useQuery({ churchId, search: search || undefined });
  const routeParams = useMemo(() => {
    const search = typeof window !== "undefined" ? window.location.search : location.split("?")[1] ?? "";
    return new URLSearchParams(search);
  }, [location]);
  const routePersonId = Number(routeParams.get("personId"));
  const routeSection = routeParams.get("section");
  const requestedPersonSection = PERSON_SECTIONS.includes(routeSection as PersonSection)
    ? routeSection as PersonSection
    : "resumo";
  const requestedCareFocus: PersonCareFocus = routeParams.get("focus") === "discipulador" ? "discipulador" : null;
  const personDeepLinkKey = Number.isInteger(routePersonId) && routePersonId > 0
    ? `${routePersonId}:${requestedPersonSection}:${requestedCareFocus ?? ""}`
    : null;
  const linkedPersonQuery = trpc.people.getById.useQuery(
    { churchId, id: routePersonId },
    { enabled: Boolean(churchId && Number.isInteger(routePersonId) && routePersonId > 0) }
  );
  const birthdaysQuery = trpc.people.birthdays.useQuery(
    { churchId, month: birthdayMonthFilter, day: birthdayView === "today" ? birthdayDay : undefined },
    { enabled: birthdaysOpen }
  );
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
  const isPastorPresident = effectiveRoles.includes("pastor_presidente");
  const isPastor = effectiveRoles.some((role) => ["pastor_presidente", "pastor_local"].includes(role));
  const canManagePrimaryDiscipler = isPastor || effectiveRoles.includes("supervisor");
  const canReadExecutiveAttention = effectiveRoles.some((role) => ["pastor_presidente", "pastor_local", "secretario"].includes(role));
  const careAttention = trpc.dashboard.careAttention.useQuery(
    { churchId },
    { enabled: canReadExecutiveAttention },
  );
  const refreshCareAttention = () => canReadExecutiveAttention ? careAttention.refetch() : Promise.resolve();
  const canManageJourney = isPastor || effectiveRoles.some((role) => ["lider", "supervisor", "consolidador"].includes(role));
  const canManageCellParticipation = isPastor || effectiveRoles.some((role) => ["lider", "supervisor"].includes(role));
  const canCreateReferral = canManageJourney;
  const canManageMinistryFunctions = isPastor;
  const primaryDisciplerQuery = trpc.people.getById.useQuery(
    { churchId, id: selectedPerson?.discipledById ?? 0 },
    { enabled: Boolean(selectedPerson?.discipledById) },
  );
  const primaryDiscipler = primaryDisciplerQuery.data;
  const personMembershipsQuery = trpc.ministries.personMemberships.useQuery(
    { churchId, personId: selectedPerson?.id ?? 0 },
    { enabled: Boolean(selectedPerson?.id && canManageMinistryFunctions) }
  );
  const personAccessQuery = trpc.ministries.personAccess.useQuery(
    { churchId, personId: selectedPerson?.id ?? 0 },
    { enabled: Boolean(selectedPerson?.id && canManageMinistryFunctions) }
  );
  const pastoralCoverageCandidatesQuery = trpc.people.pastoralCoverageCandidates.useQuery(
    { churchId },
    { enabled: isPastorPresident }
  );
  const pastoralCoverageQuery = trpc.people.pastoralCoverage.useQuery(
    { churchId, pastorPersonId: selectedPerson?.id ?? 0 },
    { enabled: Boolean(selectedPerson?.id && isPastorPresident) }
  );
  const selectedPersonIsPastor = pastoralCoverageQuery.data?.isPastor === true;
  const canManagePastoralCoverage = Boolean(isPastorPresident && selectedPerson?.id && selectedPersonIsPastor);
  const pastoralCoverageAccessPending = effectiveRolesQuery.isLoading || pastoralCoverageQuery.isLoading;
  const resolvedRequestedSection = resolvePersonSection(requestedPersonSection, {
    canManagePastoralCoverage,
    accessPending: pastoralCoverageAccessPending,
  });
  const effectivePersonSection = resolvedRequestedSection ?? "resumo";
  const isPrimaryDisciplerFocus = effectivePersonSection === "cuidado" && requestedCareFocus === "discipulador";
  const personFunctionsQuery = trpc.ministries.personFunctions.useQuery(
    { churchId, personId: selectedPerson?.id ?? 0 },
    { enabled: Boolean(selectedPerson?.id && canManageMinistryFunctions) }
  );
  const cellParticipationQuery = trpc.cells.personParticipation.useQuery(
    { churchId, personId: selectedPerson?.id ?? 0 },
    { enabled: Boolean(selectedPerson?.id) }
  );
  const journeyQuery = trpc.people.journey.useQuery(
    { churchId, id: selectedPerson?.id ?? 0 },
    { enabled: Boolean(selectedPerson?.id) }
  );
  const consolidationHistoryQuery = trpc.people.consolidationHistory.useQuery(
    { churchId, id: selectedPerson?.id ?? 0 },
    { enabled: Boolean(selectedPerson?.id && canManageJourney) }
  );
  const cellHistory = trpc.cells.membershipHistory.useQuery(
    { churchId, personId: selectedPerson?.id ?? 0 },
    { enabled: Boolean(selectedPerson?.id) }
  );
  const consolidatorsQuery = trpc.consolidation.consolidators.useQuery({ churchId }, { enabled: canCreateReferral });
  const createPerson = trpc.people.create.useMutation({
    onSuccess: async () => {
      toast.success("Pessoa cadastrada com sucesso!");
      setOpen(false);
      setForm(defaultForm);
      setFormError(null);
      await Promise.all([refetch(), directoryQuery.refetch()]);
    },
    onError: (error) => {
      const message = error.message || "Erro ao cadastrar pessoa";
      setFormError(message);
      toast.error(message);
    },
  });
  const assignCare = trpc.care.assign.useMutation({
    onSuccess: async (result) => {
      const isPrimaryDiscipler = Boolean(result && "disciplerPersonId" in result);
      toast.success(isPrimaryDiscipler
        ? "Discipulador principal atualizado."
        : result?.accessReleased ? "Cuidado operacional atualizado e acesso liberado." : "Cuidado operacional atualizado.");
      if (result && "disciplerPersonId" in result) {
        setSelectedPerson((current: any) => current ? { ...current, discipledById: result.disciplerPersonId } : current);
      }
      setCareForm((current) => ({ ...current, notes: "" }));
      await Promise.all([currentCare.refetch(), careHistory.refetch(), refreshCareAttention(), directoryQuery.refetch()]);
    },
    onError: (error) => toast.error(error.message || "Não foi possível atualizar o responsável."),
  });
  const startConsolidation = trpc.consolidation.create.useMutation({
    onSuccess: async () => {
      toast.success("Consolidação iniciada. O discipulador principal permanece o mesmo.");
      await Promise.all([
        currentCare.refetch(),
        careHistory.refetch(),
        refreshCareAttention(),
        directoryQuery.refetch(),
        utils.souls.list.invalidate({ churchId }),
      ]);
    },
    onError: (error) => toast.error(error.message || "Não foi possível iniciar a consolidação."),
  });
  const createReferral = trpc.consolidation.createReferral.useMutation({
    onSuccess: async () => {
      toast.success("Encaminhamento enviado para a fila de Consolidação.");
      setReferralForm({ reason: "", notes: "", preferredConsolidatorId: "", idempotencyKey: createIdempotencyKey() });
      await Promise.all([utils.consolidation.referrals.invalidate({ churchId }), directoryQuery.refetch()]);
    },
    onError: (error) => toast.error(error.message || "Não foi possível enviar o encaminhamento."),
  });
  const updateJourneyStage = trpc.people.updateJourneyStage.useMutation({
    onSuccess: async (_, variables) => {
      toast.success(variables.status === "concluida" ? "Etapa marcada como concluída." : variables.status === "pendente" ? "Etapa marcada como pendente." : "Etapa redefinida como não registrada.");
      await Promise.all([journeyQuery.refetch(), refetch(), directoryQuery.refetch()]);
      setJourneyNoteStage(null);
      setJourneyNote("");
      if (variables.setCurrentStage) {
        setSelectedPerson((current: any) => current ? { ...current, discipleshipStage: variables.stage } : current);
      }
    },
    onError: (error) => toast.error(error.message || "Não foi possível atualizar a etapa."),
  });
  const setParallelJourneyStage = trpc.people.setParallelJourneyStage.useMutation({
    onSuccess: async (_, variables) => {
      toast.success(variables.isCurrent ? "Frente paralela ativada." : "Frente paralela removida.");
      await journeyQuery.refetch();
    },
    onError: (error) => toast.error(error.message || "Não foi possível atualizar a frente paralela."),
  });
  const savePastoralCoverage = trpc.people.savePastoralCoverage.useMutation({
    onSuccess: async () => {
      toast.success("Cobertura espiritual salva com histórico.");
      await pastoralCoverageQuery.refetch();
    },
    onError: (error) => toast.error(error.message || "Não foi possível salvar a cobertura espiritual."),
  });
  const removePastoralCoverage = trpc.people.removePastoralCoverage.useMutation({
    onSuccess: async () => {
      toast.success("Cobertura espiritual removida.");
      setPendingDestructiveAction(null);
      await pastoralCoverageQuery.refetch();
    },
    onError: (error) => toast.error(error.message || "Não foi possível remover a cobertura espiritual."),
  });
  const assignCell = trpc.cells.assignPerson.useMutation({
    onSuccess: async (result) => {
      toast.success(result.transferred ? "Pessoa transferida de célula com histórico preservado." : "Pessoa integrada à célula.");
      setSelectedCellId("");
      await Promise.all([cellParticipationQuery.refetch(), cellHistory.refetch(), currentCare.refetch(), refreshCareAttention(), refetch(), directoryQuery.refetch()]);
    },
    onError: (error) => toast.error(error.message || "Não foi possível integrar a pessoa à célula."),
  });
  const removeCell = trpc.cells.removePerson.useMutation({
    onSuccess: async () => {
      toast.success("Pessoa retirada da Célula. A Jornada principal foi preservada.");
      setPendingDestructiveAction(null);
      await Promise.all([cellParticipationQuery.refetch(), cellHistory.refetch(), currentCare.refetch(), refreshCareAttention(), refetch(), directoryQuery.refetch()]);
    },
    onError: (error) => toast.error(error.message || "Não foi possível retirar a pessoa da Célula."),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const data: any = { churchId, ...form };
    Object.keys(data).forEach((k) => {
      if (data[k] === "") data[k] = undefined;
    });
    createPerson.mutate(data);
  }

  const selectedAttention = (careAttention.data ?? []).find((item) => item.person.id === selectedPerson?.id);
  const currentResponsible = (people ?? []).find((person) => person.id === currentCare.data?.responsiblePersonId);
  const currentCell = cellParticipationQuery.data?.current ?? null;
  const attentionState = effectiveRolesQuery.isLoading
    ? "loading"
    : resolvePersonSectionState({
        enabled: canReadExecutiveAttention,
        isLoading: careAttention.isLoading,
        isError: careAttention.isError,
        isFetching: careAttention.isFetching,
        hasData: Array.isArray(careAttention.data),
        isEmpty: Array.isArray(careAttention.data) && careAttention.data.length === 0,
      });
  const cellParticipationState = resolvePersonSectionState({
    enabled: Boolean(selectedPerson?.id),
    isLoading: cellParticipationQuery.isLoading,
    isError: cellParticipationQuery.isError,
    isFetching: cellParticipationQuery.isFetching,
    hasData: cellParticipationQuery.data !== undefined,
    isEmpty: cellParticipationQuery.data !== undefined && !cellParticipationQuery.data?.current,
  });
  const cellHistoryState = resolvePersonSectionState({
    enabled: Boolean(selectedPerson?.id),
    isLoading: cellHistory.isLoading,
    isError: cellHistory.isError,
    isFetching: cellHistory.isFetching,
    hasData: Array.isArray(cellHistory.data),
    isEmpty: Array.isArray(cellHistory.data) && cellHistory.data.length === 0,
  });
  const currentCareState = resolvePersonSectionState({
    enabled: Boolean(selectedPerson?.id),
    isLoading: currentCare.isLoading,
    isError: currentCare.isError,
    isFetching: currentCare.isFetching,
    hasData: currentCare.data !== undefined,
    isEmpty: currentCare.data !== undefined && !currentCare.data,
  });
  const careHistoryState = resolvePersonSectionState({
    enabled: Boolean(selectedPerson?.id),
    isLoading: careHistory.isLoading,
    isError: careHistory.isError,
    isFetching: careHistory.isFetching,
    hasData: Array.isArray(careHistory.data),
    isEmpty: Array.isArray(careHistory.data) && careHistory.data.length === 0,
  });
  const journeyState = resolvePersonSectionState({
    enabled: Boolean(selectedPerson?.id),
    isLoading: journeyQuery.isLoading,
    isError: journeyQuery.isError,
    isFetching: journeyQuery.isFetching,
    hasData: journeyQuery.data !== undefined,
  });
  const personMembershipsState = resolvePersonSectionState({
    enabled: Boolean(selectedPerson?.id && canManageMinistryFunctions),
    isLoading: personMembershipsQuery.isLoading,
    isError: personMembershipsQuery.isError,
    isFetching: personMembershipsQuery.isFetching,
    hasData: Array.isArray(personMembershipsQuery.data),
    isEmpty: Array.isArray(personMembershipsQuery.data) && personMembershipsQuery.data.length === 0,
  });
  const personFunctionsState = resolvePersonSectionState({
    enabled: Boolean(selectedPerson?.id && canManageMinistryFunctions),
    isLoading: personFunctionsQuery.isLoading,
    isError: personFunctionsQuery.isError,
    isFetching: personFunctionsQuery.isFetching,
    hasData: Array.isArray(personFunctionsQuery.data),
    isEmpty: Array.isArray(personFunctionsQuery.data) && personFunctionsQuery.data.length === 0,
  });
  const personAccessState = resolvePersonSectionState({
    enabled: Boolean(selectedPerson?.id && canManageMinistryFunctions),
    isLoading: personAccessQuery.isLoading,
    isError: personAccessQuery.isError,
    isFetching: personAccessQuery.isFetching,
    hasData: personAccessQuery.data !== undefined,
  });
  const pastoralCoverageState = resolvePersonSectionState({
    enabled: Boolean(selectedPerson?.id && isPastorPresident),
    isLoading: pastoralCoverageQuery.isLoading,
    isError: pastoralCoverageQuery.isError,
    isFetching: pastoralCoverageQuery.isFetching,
    hasData: pastoralCoverageQuery.data !== undefined,
  });
  const directory = directoryQuery.data ?? [];
  const filteredDirectory = directory.filter(({ person, care }) => {
    if (JOURNEY_STAGES.includes(directoryFilter as JourneyStage)) {
      return person.discipleshipStage === directoryFilter || (directoryFilter === "consolidacao" && Boolean(care.referralId));
    }
    if (directoryFilter === "sem_responsavel") return care.status === "sem_responsavel" || care.status === "na_fila";
    if (directoryFilter === "atencao") return care.priority === "alta" || care.priority === "media";
    return true;
  });
  const directoryCounts = {
    total: directory.length,
    newSouls: directory.filter(({ person }) => person.discipleshipStage === "nova_alma").length,
    consolidation: directory.filter(({ person, care }) => person.discipleshipStage === "consolidacao" || Boolean(care.referralId)).length,
    withoutResponsible: directory.filter(({ care }) => care.status === "sem_responsavel" || care.status === "na_fila").length,
    attention: directory.filter(({ care }) => care.priority === "alta" || care.priority === "media").length,
  };
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
  const journeyProgressByStage = new Map(
    (journeyQuery.data?.progress ?? []).map((item) => [item.stage, item] as const)
  );
  const journeyCompletedCount = JOURNEY_STAGES.filter((stage) => journeyProgressByStage.get(stage)?.status === "concluida").length;
  const journeyPendingCount = JOURNEY_STAGES.filter((stage) => journeyProgressByStage.get(stage)?.status === "pendente").length;
  const journeyProgressPercent = Math.round((journeyCompletedCount / JOURNEY_STAGES.length) * 100);
  const parallelJourneyStages = JOURNEY_STAGES.filter((stage) => journeyProgressByStage.get(stage)?.isCurrent && selectedPerson?.discipleshipStage !== stage);

  useEffect(() => {
    const params = new URLSearchParams(location.split("?")[1] ?? "");
    if (params.get("view") === "birthdays") {
      setBirthdayView("today");
      setBirthdayMonthFilter(birthdayMonth);
      setBirthdaysOpen(true);
    }
  }, [location, birthdayMonth]);

  useEffect(() => {
    const coverage = pastoralCoverageQuery.data?.coverage;
    if (!selectedPerson?.id || !isPastorPresident || pastoralCoverageQuery.data?.isPastor !== true || pastoralCoverageQuery.isLoading) return;
    setCoverageForm(coverage ? {
      coveringPastorPersonId: coverage.coveringPastorPersonId ? String(coverage.coveringPastorPersonId) : "",
      coveringChurchName: coverage.coveringChurchName,
      coveringPastorName: coverage.coveringPastorName,
      coveringPastorPhone: coverage.coveringPastorPhone ?? "",
      coveringPastorWhatsapp: coverage.coveringPastorWhatsapp ?? "",
      notes: coverage.notes ?? "",
    } : defaultCoverageForm);
  }, [pastoralCoverageQuery.data?.coverage?.id, pastoralCoverageQuery.data?.coverage?.updatedAt, pastoralCoverageQuery.data?.isPastor, pastoralCoverageQuery.isLoading, selectedPerson?.id, isPastorPresident]);

  useEffect(() => {
    if (!personDeepLinkKey) {
      consumedPersonDeepLinkRef.current = null;
      return;
    }
    if (consumedPersonDeepLinkRef.current === personDeepLinkKey) return;
    const person = linkedPersonQuery.data ?? (people ?? []).find((candidate) => candidate.id === routePersonId);
    if (!person) return;
    consumedPersonDeepLinkRef.current = personDeepLinkKey;
    if (selectedPerson?.id !== person.id) {
      openPersonJourney(person, requestedPersonSection, requestedCareFocus);
    } else if (personSection !== requestedPersonSection) {
      setPersonSection(requestedPersonSection);
    }
  }, [linkedPersonQuery.data, people, personDeepLinkKey, requestedCareFocus, requestedPersonSection, routePersonId, selectedPerson?.id]);

  useEffect(() => {
    if (requestedPersonSection !== "cobertura" || !selectedPerson?.id || resolvedRequestedSection !== "resumo") return;
    setPersonSection("resumo");
    const nextLocation = getPersonHref(selectedPerson.id, "resumo");
    if (location !== nextLocation) navigate(nextLocation, { replace: true });
  }, [location, navigate, requestedPersonSection, resolvedRequestedSection, selectedPerson?.id]);

  const modernConsolidationTimeline: PersonHistoryEvent[] = (consolidationHistoryQuery.data ?? []).flatMap(({ referral, assignments, followUps, visits }) => [
    {
      id: `consolidation-referral-${referral.id}`,
      date: referral.referredAt,
      category: "consolidacao" as const,
      source: "moderno" as const,
      title: "Encaminhamento para Consolidação",
      detail: `${CONSOLIDATION_STATUS_LABELS[referral.status] ?? referral.status} · ${referral.reason}`,
    },
    ...assignments.map((assignment) => ({
      id: `consolidation-assignment-${assignment.id}`,
      date: assignment.createdAt,
      category: "consolidacao" as const,
      source: "moderno" as const,
      title: CONSOLIDATION_ACTION_LABELS[assignment.action] ?? "Atualização do caso",
      detail: assignment.notes ?? "Responsabilidade registrada no histórico da Consolidação.",
    })),
    ...followUps.map((followUp) => ({
      id: `consolidation-follow-up-${followUp.id}`,
      date: followUp.createdAt,
      category: "consolidacao" as const,
      source: "moderno" as const,
      title: `Acompanhamento por ${CONTACT_CHANNEL_LABELS[followUp.contactChannel] ?? followUp.contactChannel}`,
      detail: `${FOLLOW_UP_OUTCOME_LABELS[followUp.outcome] ?? followUp.outcome}${followUp.notes ? ` · ${followUp.notes}` : ""}${followUp.nextAction ? ` · Próxima ação: ${followUp.nextAction}` : ""}`,
    })),
    ...visits.map((visit) => ({
      id: `consolidation-visit-${visit.id}`,
      date: visit.completedAt ?? visit.cancelledAt ?? visit.scheduledAt ?? visit.createdAt,
      category: "consolidacao" as const,
      source: "moderno" as const,
      title: `Visita: ${VISIT_STATUS_LABELS[visit.status] ?? visit.status}`,
      detail: `${visit.reason}${visit.completionNotes ? ` · ${visit.completionNotes}` : ""}${visit.cancellationReason ? ` · ${visit.cancellationReason}` : ""}`,
    })),
    ...(referral.closedAt
      ? [{
          id: `consolidation-closed-${referral.id}`,
          date: referral.closedAt,
          category: "consolidacao" as const,
          source: "moderno" as const,
          title: `Caso de Consolidação ${CONSOLIDATION_STATUS_LABELS[referral.status] ?? referral.status}`,
          detail: referral.closeNotes ?? "Desfecho registrado no caso.",
        }]
      : []),
  ]);
  const hasModernConsolidationHistory = (consolidationHistoryQuery.data ?? []).length > 0;

  const historyTimeline: PersonHistoryEvent[] = selectedPerson
    ? [
        ...(selectedAttention?.soul
          ? [{ id: `care-soul-${selectedAttention.soul.id}`, date: selectedAttention.soul.decisionDate, category: "cuidado" as const, source: "anterior" as const, title: "Nova Alma registrada", detail: "Decisão e origem espiritual registradas." }]
          : []),
        ...(careHistory.data ?? []).map((item) => ({
          id: `care-assignment-${item.id}`,
          date: item.startedAt,
          category: "cuidado" as const,
          source: "moderno" as const,
          title: item.active ? "Responsável pelo cuidado definido" : "Responsável anterior pelo cuidado",
          detail: `${CARE_ROLE_LABELS[item.role] ?? item.role}${item.notes ? ` · ${item.notes}` : ""}`,
        })),
        ...(hasModernConsolidationHistory
          ? modernConsolidationTimeline
          : [
              ...(selectedAttention?.consolidation?.callDate
                ? [{ id: `legacy-consolidation-call-${selectedAttention.consolidation.callDate}`, date: selectedAttention.consolidation.callDate, category: "consolidacao" as const, source: "anterior" as const, title: "Primeiro contato realizado", detail: "Contato de Consolidação registrado no histórico anterior." }]
                : []),
              ...(selectedAttention?.consolidation?.messageDate
                ? [{ id: `legacy-consolidation-message-${selectedAttention.consolidation.messageDate}`, date: selectedAttention.consolidation.messageDate, category: "consolidacao" as const, source: "anterior" as const, title: "Mensagem enviada", detail: "Ação de Consolidação registrada no histórico anterior." }]
                : []),
              ...(selectedAttention?.consolidation?.visitDate
                ? [{ id: `legacy-consolidation-visit-${selectedAttention.consolidation.visitDate}`, date: selectedAttention.consolidation.visitDate, category: "consolidacao" as const, source: "anterior" as const, title: "Visita realizada", detail: "Ação de Consolidação registrada no histórico anterior." }]
                : []),
              ...(selectedAttention?.consolidation?.prayerDate
                ? [{ id: `legacy-consolidation-prayer-${selectedAttention.consolidation.prayerDate}`, date: selectedAttention.consolidation.prayerDate, category: "consolidacao" as const, source: "anterior" as const, title: "Oração realizada", detail: "Ação de Consolidação registrada no histórico anterior." }]
                : []),
            ]),
        ...(journeyQuery.data?.events ?? []).map((event) => ({
          id: `journey-${event.id}`,
          date: event.createdAt,
          category: "jornada" as const,
          source: "jornada" as const,
          title: `${STAGES_LABELS[event.stage] ?? event.stage}: ${event.status === "concluida" ? "Concluída" : event.status === "pendente" ? "Pendente" : "Não registrada"}`,
          detail: `${event.actorName ?? "Usuário da igreja"}${event.notes ? ` · ${event.notes}` : ""}`,
        })),
        ...(cellHistory.data ?? []).map((membership) => ({
          id: `cell-${membership.id}`,
          date: membership.active ? membership.joinedAt : membership.leftAt ?? membership.joinedAt,
          category: "celula" as const,
          source: "moderno" as const,
          title: membership.active ? `Entrada na Célula ${membership.cellName}` : `Saída da Célula ${membership.cellName}`,
          detail: membership.active ? "Participação atual preservada na seção Participações." : "Participação encerrada; a Jornada principal não foi alterada.",
        })),
      ]
        .filter((item) => item.date)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .map((item, index) => ({ ...item, isLatest: index === 0 }))
    : [];
  const historyQueries = [careHistory, journeyQuery, cellHistory, ...(canManageJourney ? [consolidationHistoryQuery] : [])];
  const historyHasError = historyQueries.some((query) => query.isError);
  const historyIsLoading = historyQueries.some((query) => query.isLoading);
  const historyIsFetching = historyQueries.some((query) => query.isFetching);
  const historyState = resolvePersonSectionState({
    enabled: Boolean(selectedPerson?.id),
    isLoading: historyIsLoading,
    isError: historyHasError,
    isFetching: historyIsFetching,
    hasData: historyTimeline.length > 0,
    isEmpty: !historyIsLoading && !historyHasError && historyTimeline.length === 0,
  });
  const refreshHistory = () => Promise.all(historyQueries.map((query) => query.refetch()));

  function getPersonHref(personId: number, section: PersonSection) {
    const [path, queryString] = location.split("?");
    const params = new URLSearchParams(queryString ?? "");
    params.set("personId", String(personId));
    params.set("section", section);
    if (section !== "cuidado") params.delete("focus");
    return `${path}?${params.toString()}`;
  }

  function selectPersonSection(section: PersonSection) {
    setPersonSection(section);
    if (selectedPerson?.id) {
      const nextLocation = getPersonHref(selectedPerson.id, section);
      if (location !== nextLocation) navigate(nextLocation);
    }
  }

  function openPersonJourney(person: any, section: PersonSection = "resumo", careFocus: PersonCareFocus = null) {
    setSelectedPerson(person);
    setPersonSection(section);
    setJourneyNoteStage(null);
    setJourneyNote("");
    setCareForm({ responsiblePersonId: "", role: careFocus === "discipulador" ? "discipulador" : "consolidador", notes: "", releaseAccess: true });
    setSelectedCellId("");
    setReferralForm({ reason: "", notes: "", preferredConsolidatorId: "", idempotencyKey: createIdempotencyKey() });
    setCoverageForm(defaultCoverageForm);
    const nextLocation = getPersonHref(person.id, section);
    if (location !== nextLocation) navigate(nextLocation);
  }

  function closePersonJourney() {
    setSelectedPerson(null);
    setPendingDestructiveAction(null);
    setJourneyNoteStage(null);
    setJourneyNote("");
    setCoverageForm(defaultCoverageForm);
    const [path, queryString] = location.split("?");
    const params = new URLSearchParams(queryString ?? "");
    params.delete("personId");
    params.delete("section");
    params.delete("focus");
    const query = params.toString();
    if (queryString?.includes("personId") || queryString?.includes("section")) navigate(`${path}${query ? `?${query}` : ""}`);
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

  function handleCellRemoval() {
    if (!selectedPerson || !currentCell) return;
    setPendingDestructiveAction({
      kind: "cell-removal",
      personId: selectedPerson.id,
      personName: selectedPerson.fullName,
      cellId: currentCell.cellId,
      cellName: currentCell.cellName,
    });
  }

  function confirmPendingDestructiveAction() {
    if (!pendingDestructiveAction) return;
    if (pendingDestructiveAction.kind === "cell-removal") {
      removeCell.mutate({ churchId, personId: pendingDestructiveAction.personId, cellId: pendingDestructiveAction.cellId });
      return;
    }
    removePastoralCoverage.mutate({ churchId, pastorPersonId: pendingDestructiveAction.pastorPersonId });
  }

  function handleCreateReferral() {
    if (!selectedPerson || referralForm.reason.trim().length < 3) {
      toast.error("Informe o motivo do encaminhamento para Consolidação.");
      return;
    }
    createReferral.mutate({
      churchId,
      personId: selectedPerson.id,
      idempotencyKey: referralForm.idempotencyKey,
      reason: referralForm.reason.trim(),
      notes: referralForm.notes.trim() || undefined,
      preferredConsolidatorId: referralForm.preferredConsolidatorId ? Number(referralForm.preferredConsolidatorId) : undefined,
    });
  }

  function handleSavePastoralCoverage() {
    if (!selectedPerson) return;
    if (coverageForm.coveringChurchName.trim().length < 2 || coverageForm.coveringPastorName.trim().length < 2) {
      toast.error("Informe a igreja e o pastor que oferecem a cobertura espiritual.");
      return;
    }
    savePastoralCoverage.mutate({
      churchId,
      pastorPersonId: selectedPerson.id,
      coveringPastorPersonId: coverageForm.coveringPastorPersonId ? Number(coverageForm.coveringPastorPersonId) : null,
      coveringChurchName: coverageForm.coveringChurchName.trim(),
      coveringPastorName: coverageForm.coveringPastorName.trim(),
      coveringPastorPhone: coverageForm.coveringPastorPhone.trim() || undefined,
      coveringPastorWhatsapp: coverageForm.coveringPastorWhatsapp.trim() || undefined,
      notes: coverageForm.notes.trim() || undefined,
    });
  }

  function handleRemovePastoralCoverage() {
    if (!selectedPerson || !pastoralCoverageQuery.data?.coverage) return;
    setPendingDestructiveAction({
      kind: "pastoral-coverage-removal",
      pastorPersonId: selectedPerson.id,
      personName: selectedPerson.fullName,
    });
  }

  function handleSummaryPrimaryAction() {
    if (!selectedAttention || !selectedPerson) return;
    if (selectedAttention.nextStep === "Registrar primeiro contato") {
      toast.info("Abrindo o caso de Consolidação desta Pessoa.");
      navigate(`/app/consolidacao?personId=${selectedPerson.id}&from=pessoas&returnSection=${effectivePersonSection}`);
      return;
    }
    if (selectedAttention.nextStep === "Enviar para célula") {
      toast.info("Abrindo Participações para integrar a Pessoa em uma Célula.");
      selectPersonSection("participacoes");
      return;
    }
    toast.info("Abrindo Cuidado para atualizar o próximo passo.");
    selectPersonSection("cuidado");
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
          <Button onClick={() => { setFormError(null); setOpen(true); }} className="bg-navy hover:bg-navy-light text-white gap-2">
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

      {/* Resumo operacional */}
      <section aria-label="Resumo operacional de Pessoas" className="grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3">
        {([
          ["todas", directoryCounts.total, "Pessoas", "border-navy/15 bg-navy/[0.03]"],
          ["nova_alma", directoryCounts.newSouls, "Novas Almas", "border-amber-200 bg-amber-50/60"],
          ["consolidacao", directoryCounts.consolidation, "Consolidação", "border-indigo-200 bg-indigo-50/60"],
          ["sem_responsavel", directoryCounts.withoutResponsible, "Sem responsável", "border-rose-200 bg-rose-50/60"],
          ["atencao", directoryCounts.attention, "Com atenção", "border-gold/30 bg-gold/10"],
        ] as const).map(([filter, count, label, tone]) => (
          <button
            key={filter}
            type="button"
            onClick={() => setDirectoryFilter(filter)}
            aria-pressed={directoryFilter === filter}
            className={`rounded-xl border p-3 text-left transition hover:-translate-y-px hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 ${tone} ${directoryFilter === filter ? "ring-2 ring-navy/20 shadow-sm" : ""}`}
          >
            <p className="text-xl font-bold font-display text-navy">{count}</p>
            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
          </button>
        ))}
      </section>

      <div className="flex min-w-0 items-center gap-2 overflow-x-auto pb-1" aria-label="Filtros de Jornada">
        {(Object.entries(STAGES_LABELS) as Array<[JourneyStage, string]>).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setDirectoryFilter(key)}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-[11px] font-medium transition ${directoryFilter === key ? `${STAGE_BADGE[key]} ring-1 ring-navy/10` : "border-border bg-background text-muted-foreground hover:border-gold/40 hover:text-navy"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading || directoryQuery.isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredDirectory.length === 0 ? (
        <div className="card-sacred flex flex-col items-center gap-3 p-10 text-center sm:p-12">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-navy/10">
            <Users className="h-7 w-7 text-navy" />
          </div>
          <p className="font-semibold text-navy">{search ? "Nenhuma Pessoa encontrada" : directoryFilter !== "todas" ? "Nenhuma Pessoa neste filtro" : "Nenhuma Pessoa cadastrada"}</p>
          <p className="max-w-sm text-sm text-muted-foreground">{search || directoryFilter !== "todas" ? "Ajuste a busca ou limpe o filtro para consultar outras Pessoas." : "Comece pela recepção: cadastre a primeira Pessoa da sua igreja."}</p>
          {search ? (
            <Button type="button" variant="outline" onClick={() => setSearch("")}>Limpar busca</Button>
          ) : directoryFilter !== "todas" ? (
            <Button type="button" variant="outline" onClick={() => setDirectoryFilter("todas")}>Limpar filtro</Button>
          ) : (
            <Button type="button" className="bg-navy text-white hover:bg-navy-light" onClick={() => { setFormError(null); setOpen(true); }}><Plus className="mr-2 h-4 w-4" />Cadastrar primeira Pessoa</Button>
          )}
        </div>
      ) : (
        <div className="space-y-2 animate-stagger">
          {filteredDirectory.map(({ person, care, cell }) => (
            <button
              key={person.id}
              type="button"
              onClick={() => openPersonJourney(person)}
              className="card-sacred flex w-full items-start gap-3 p-3 text-left transition-colors hover:border-gold/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70 sm:items-center sm:gap-4 sm:p-4"
              aria-label={`Abrir ficha de ${person.fullName}`}
            >
              <div className="w-10 h-10 rounded-full bg-cream-dark flex items-center justify-center flex-shrink-0">
                {person.photoUrl ? (
                  <img src={person.photoUrl} alt={person.fullName} className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-navy">{person.fullName.charAt(0)}</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <p className="truncate font-semibold text-navy">{person.fullName}</p>
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${STAGE_BADGE[person.discipleshipStage ?? "nova_alma"]}`}>{STAGES_LABELS[person.discipleshipStage ?? "nova_alma"]}</span>
                </div>
                <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
                  {cell && <span className="truncate">Célula: {cell.name}</span>}
                  <span className={`rounded-full border px-2 py-0.5 ${care.priority === "alta" ? "border-rose-200 bg-rose-50 text-rose-700" : care.priority === "media" ? "border-amber-200 bg-amber-50 text-amber-800" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>{DIRECTORY_CARE_LABELS[care.status]}</span>
                  {care.responsibleName && <span className="hidden truncate sm:inline">Responsável: {care.responsibleName}</span>}
                </div>
              </div>
              <span className="hidden shrink-0 text-xs font-semibold text-navy sm:inline">Abrir ficha</span>
              <ArrowRight className="mt-2 h-4 w-4 shrink-0 text-muted-foreground sm:mt-0" aria-hidden="true" />
            </button>
          ))}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (nextOpen) setFormError(null); }}>
        <AdaptiveFormDialogContent className="sm:max-w-2xl">
          <div className={adaptiveFormDialogHeaderClassName}>
            <DialogTitle className="font-display text-navy flex items-center gap-2">
              <User className="w-5 h-5" />
              Cadastrar Pessoa
            </DialogTitle>
          </div>
          <form onSubmit={handleSubmit} className="contents">
            <AdaptiveFormDialogBody>
              {formError && <div role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{formError}</div>}
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
                    <Input type="date" max={currentCivilDateKey()} required value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })} />
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
                    <Label>WhatsApp *</Label>
                    <Input required minLength={10} maxLength={20} value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="(00) 00000-0000" />
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

            </AdaptiveFormDialogBody>
            <AdaptiveFormDialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" className="bg-navy hover:bg-navy-light text-white" disabled={createPerson.isPending}>
                {createPerson.isPending ? "Salvando..." : "Cadastrar"}
              </Button>
            </AdaptiveFormDialogFooter>
          </form>
        </AdaptiveFormDialogContent>
      </Dialog>

      <Dialog open={Boolean(selectedPerson)} onOpenChange={(nextOpen) => !nextOpen && closePersonJourney()}>
        <AdaptiveFormDialogContent className="sm:max-w-4xl lg:max-w-5xl">
          <div className={adaptiveFormDialogHeaderClassName}>
            <DialogTitle className="flex items-center gap-2 font-display text-navy"><HeartHandshake className="h-5 w-5 text-rose-600" />{selectedPerson?.fullName}</DialogTitle>
            <p className="mt-1 text-sm text-muted-foreground">Uma Pessoa, várias participações e um histórico único de cuidado.</p>
          </div>

          <AdaptiveFormDialogBody className="space-y-5">
          <div className="sm:hidden rounded-xl border border-border bg-muted/40 p-3" aria-label="Navegação da ficha no celular">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Área da ficha</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Uma área por vez para manter a leitura simples.</p>
              </div>
              <Badge variant="outline" className="shrink-0 border-navy/15 bg-background text-[10px] text-navy">{PERSON_SECTION_OPTIONS.find((option) => option.value === effectivePersonSection)?.label}</Badge>
            </div>
            <Select value={effectivePersonSection} onValueChange={(value) => selectPersonSection(value as PersonSection)}>
              <SelectTrigger id="person-section-mobile" aria-label="Seção atual da ficha da Pessoa" className="mt-3 min-h-11 w-full bg-background text-sm text-navy">
                <SelectValue placeholder="Escolha uma área" />
              </SelectTrigger>
              <SelectContent>
                {PERSON_SECTION_OPTIONS.filter((option) => !option.pastoralOnly || canManagePastoralCoverage).map((option) => (
                  <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
              {PERSON_SECTION_OPTIONS.find((option) => option.value === effectivePersonSection)?.description}
            </p>
          </div>

          <div role="tablist" aria-label="Seções da ficha da Pessoa" className={`hidden gap-1 rounded-xl bg-muted p-1 sm:grid ${canManagePastoralCoverage ? "sm:grid-cols-6" : "sm:grid-cols-5"}`}>
            {PERSON_SECTION_OPTIONS.filter((option) => !option.pastoralOnly || canManagePastoralCoverage).map(({ value, label }) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={effectivePersonSection === value}
                aria-controls="person-section-content"
                onClick={() => selectPersonSection(value as PersonSection)}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${effectivePersonSection === value ? "bg-background text-navy shadow-sm" : "text-muted-foreground hover:bg-background/70 hover:text-navy"}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div id="person-section-content" role="tabpanel" tabIndex={-1} aria-label={`Conteúdo da seção ${PERSON_SECTION_OPTIONS.find((option) => option.value === effectivePersonSection)?.label ?? "Resumo"}`} className="space-y-5">
          {effectivePersonSection === "jornada" && selectedPerson && (
            <section className="rounded-xl border border-navy/10 bg-gradient-to-br from-navy/[0.03] via-background to-gold/[0.08] p-4 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-navy">Jornada do discípulo</h3>
                    <Badge variant="outline" className="border-navy/15 bg-background text-[10px] text-navy">{journeyProgressPercent}% concluída</Badge>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Consulte o caminho de formação sem perder o histórico. A etapa principal é alterada em Acompanhamento da Jornada; aqui você registra progresso, observações e histórico de cada etapa.</p>
                </div>
                <div className="w-full shrink-0 sm:w-64">
                  <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground"><span>Progresso da jornada</span><span>{journeyCompletedCount}/{JOURNEY_STAGES.length}</span></div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200" aria-label={`${journeyProgressPercent}% da Jornada concluída`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={journeyProgressPercent}><div className="h-full rounded-full bg-gradient-to-r from-navy to-gold transition-all" style={{ width: `${journeyProgressPercent}%` }} /></div>
                  <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground"><span>{journeyPendingCount} pendente{journeyPendingCount === 1 ? "" : "s"}</span><span>Etapa principal: {STAGES_LABELS[selectedPerson.discipleshipStage ?? "nova_alma"]}</span></div>
                </div>
              </div>
              <div className="mt-4 rounded-lg border border-gold/25 bg-gold/5 px-3 py-2.5 text-xs text-navy">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">Frentes atuais</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">Participações formativas que acontecem em paralelo à etapa principal.</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {parallelJourneyStages.length > 0 ? parallelJourneyStages.map((stage) => <Badge key={stage} variant="outline" className="border-gold/40 bg-background text-[10px] text-navy">{STAGES_LABELS[stage]}</Badge>) : <span className="text-[11px] text-muted-foreground">Nenhuma frente paralela ativa</span>}
                  </div>
                </div>
              </div>
              <div className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50/45 px-3 py-2.5 text-xs text-navy">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">Participação em Célula</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">Independente da etapa principal da Jornada.</p>
                  </div>
                  <Badge variant="outline" className={(cellParticipationState === "ready" || cellParticipationState === "refreshing") && cellParticipationQuery.data?.status === "integrada" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-amber-300 bg-amber-50 text-amber-800"}>
                    {cellParticipationState === "loading" ? "Carregando…" : cellParticipationState === "error" ? "Não disponível" : cellParticipationState === "unavailable" ? "Indisponível" : cellParticipationQuery.data?.status === "integrada" ? "Integrada" : "Pendente"}
                  </Badge>
                </div>
                {cellParticipationState === "loading" ? <PersonSectionState kind="loading" title="Carregando vínculo de Célula…" className="mt-3 border-0 bg-transparent p-0" /> : cellParticipationState === "error" ? <PersonSectionState kind="error" title="Não foi possível carregar a participação em Célula" onRetry={cellParticipationQuery.refetch} retrying={cellParticipationQuery.isFetching} className="mt-3" /> : cellParticipationState === "unavailable" ? <PersonSectionState kind="unavailable" title="Participação em Célula indisponível" className="mt-3" /> : (
                  <>
                    {cellParticipationState === "refreshing" && <PersonSectionState kind="refreshing" title="Atualizando participação…" description="O vínculo atual continua visível." className="mt-3 border-0 bg-transparent p-0" />}
                    <div className="mt-2 grid gap-2 sm:grid-cols-2">
                      <p><span className="font-medium">Célula atual:</span> {currentCell?.cellName ?? "Sem Célula"}</p>
                      <p className="text-muted-foreground">{cellParticipationQuery.data?.hasHistory ? `${cellParticipationQuery.data.previousCount} participação(ões) anterior(es) no histórico.` : "Nenhuma participação anterior registrada."}</p>
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">Pendente significa apenas que não há vínculo ativo no momento; não altera nem retrocede a Jornada.</p>
                  </>
                )}
              </div>

              {journeyState === "loading" ? <div className="mt-5 space-y-2">{JOURNEY_STAGES.slice(0, 5).map((stage) => <div key={stage} className="h-16 animate-pulse rounded-xl bg-background/70" />)}</div> : journeyState === "error" ? (
                <div className="mt-5"><PersonSectionState kind="error" title="Não foi possível carregar a Jornada" onRetry={journeyQuery.refetch} retrying={journeyQuery.isFetching} /></div>
              ) : journeyState === "unavailable" ? (
                <div className="mt-5"><PersonSectionState kind="unavailable" title="Jornada indisponível" /></div>
              ) : (
                <>
                {journeyState === "refreshing" && <PersonSectionState kind="refreshing" title="Atualizando Jornada…" description="O progresso atual continua visível." className="mt-5" />}
                <div className="mt-5 space-y-3">
                  {JOURNEY_STAGES.map((stage: JourneyStage) => {
                    const progress = journeyProgressByStage.get(stage);
                    const status: JourneyStatus = progress?.status ?? "nao_registrada";
                    const isCurrent = selectedPerson.discipleshipStage === stage;
                    const statusLabel = status === "concluida" ? "Concluída" : status === "pendente" ? "Pendente" : "Não registrada";
                    const isParallelCurrent = Boolean(progress?.isCurrent) && !isCurrent;
                    const statusClass = `${JOURNEY_STATUS_CLASS[status]} ${isCurrent ? "border-gold/70 bg-gold/10 ring-2 ring-gold/35 shadow-sm" : isParallelCurrent ? "border-gold/50 bg-gold/[0.04]" : ""}`;
                    const noteForUpdate = journeyNoteStage === stage ? journeyNote.trim() || undefined : progress?.notes ?? undefined;
                    return (
                      <div key={stage} className={`rounded-2xl border p-4 shadow-sm transition-[border-color,box-shadow,transform] duration-200 hover:-translate-y-px hover:shadow-md ${statusClass}`}>
                        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.72fr)] lg:items-start">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${isCurrent ? "border-gold bg-gold/20 text-navy" : JOURNEY_STATUS_BADGE_CLASS[status]}`} aria-hidden="true">
                              <span className="text-sm font-bold">{JOURNEY_STAGES.indexOf(stage) + 1}</span>
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-semibold leading-5 text-navy">{STAGES_LABELS[stage]}</p>
                                {isCurrent && <Badge variant="outline" className="border-gold/40 bg-gold/15 text-[10px] text-navy">Etapa principal</Badge>}
                                {isParallelCurrent && <Badge variant="outline" className="border-gold/40 bg-gold/15 text-[10px] text-navy">Frente atual</Badge>}
                              </div>
                              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
                                <span className="font-semibold text-foreground/80">{statusLabel}</span>
                                {progress?.notes && <span className="text-muted-foreground">{progress.notes}</span>}
                              </div>
                              <p className="mt-2 max-w-2xl text-xs leading-relaxed text-muted-foreground">{JOURNEY_STAGE_DESCRIPTIONS[stage]}</p>
                            </div>
                          </div>
                          {canManageJourney && (
                            <div className="rounded-xl border border-current/10 bg-background/55 p-2.5 lg:min-w-0">
                              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Ações da etapa</p>
                              <div className="flex flex-wrap gap-2 lg:justify-end">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-9 text-[11px] text-navy"
                                  onClick={() => {
                                    setJourneyNoteStage(stage);
                                    setJourneyNote(progress?.notes ?? "");
                                  }}
                                >
                                  {journeyNoteStage === stage ? "Fechar nota" : "Observação"}
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className={`h-9 text-[11px] ${status === "concluida" ? "border-emerald-300 bg-emerald-100/70 text-emerald-900 hover:bg-emerald-100" : status === "pendente" ? "border-rose-300 bg-rose-100/70 text-rose-900 hover:bg-rose-100" : "border-slate-300 bg-white/80 text-slate-800 hover:bg-white"}`}
                                  disabled={updateJourneyStage.isPending}
                                  onClick={() => updateJourneyStage.mutate({ churchId, id: selectedPerson.id, stage, status: status === "concluida" ? "pendente" : "concluida", notes: noteForUpdate })}
                                >
                                  {status === "concluida" ? "Marcar pendente" : "Concluir etapa"}
                                </Button>
                                {status === "nao_registrada" && <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-9 border-rose-300 bg-rose-100/70 text-[11px] text-rose-900 hover:bg-rose-100"
                                  disabled={updateJourneyStage.isPending}
                                  onClick={() => updateJourneyStage.mutate({ churchId, id: selectedPerson.id, stage, status: "pendente", notes: noteForUpdate })}
                                >
                                  Marcar pendente
                                </Button>}
                                {status !== "nao_registrada" && <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-9 text-[11px] text-navy"
                                  disabled={updateJourneyStage.isPending}
                                  onClick={() => updateJourneyStage.mutate({ churchId, id: selectedPerson.id, stage, status: "nao_registrada", notes: noteForUpdate })}
                                >
                                  Não registrada
                                </Button>}
                                {isPastor && !isCurrent && <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-9 border-gold/40 bg-gold/10 text-[11px] text-navy hover:bg-gold/20"
                                  disabled={setParallelJourneyStage.isPending}
                                  onClick={() => setParallelJourneyStage.mutate({ churchId, id: selectedPerson.id, stage, isCurrent: !isParallelCurrent })}
                                >
                                  {isParallelCurrent ? "Remover frente atual" : "Tornar frente atual"}
                                </Button>}
                              </div>
                            </div>
                          )}
                        </div>
                        {canManageJourney && journeyNoteStage === stage && (
                          <div className="mt-4 border-t border-current/10 pt-4">
                            <Label htmlFor={`journey-note-${stage}`} className="text-[11px]">Observação desta atualização</Label>
                            <Textarea id={`journey-note-${stage}`} value={journeyNote} onChange={(event) => setJourneyNote(event.target.value)} maxLength={1000} rows={2} className="mt-1 bg-background text-xs" placeholder="Ex.: participou do encontro e pediu acompanhamento." />
                            <p className="mt-1 text-[10px] opacity-70">A observação fica no evento do histórico; limite de 1.000 caracteres.</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                </>
              )}
              {!canManageJourney && <p className="mt-3 text-xs text-muted-foreground">Você pode consultar esta jornada, mas a atualização é feita pela liderança responsável.</p>}
            </section>
          )}

          {effectivePersonSection === "resumo" && selectedPerson && (
            <PersonExecutiveSummary
              stageLabel={STAGES_LABELS[selectedPerson.discipleshipStage ?? "nova_alma"]}
              currentCellName={currentCell?.cellName}
              cellStatus={cellParticipationQuery.data?.status}
              hasCellHistory={Boolean(cellParticipationQuery.data?.hasHistory)}
              responsibleName={currentResponsible?.fullName}
              attention={selectedAttention}
              attentionState={attentionState}
              onAttentionRetry={canReadExecutiveAttention ? careAttention.refetch : undefined}
              attentionRetrying={careAttention.isFetching}
              canActOnNextStep={canActOnNextStep}
              nextStepLabel={nextStepLabel}
              onPrimaryAction={handleSummaryPrimaryAction}
            />
          )}

          {effectivePersonSection === "resumo" && canManagePastoralCoverage && (
            <button type="button" onClick={() => selectPersonSection("cobertura")} className="flex w-full items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50/35 p-4 text-left transition hover:bg-indigo-50">
              <span className="flex min-w-0 items-center gap-3"><ShieldCheck className="h-5 w-5 shrink-0 text-indigo-700" /><span><span className="block text-sm font-semibold text-navy">Cobertura espiritual</span><span className="mt-0.5 block text-xs text-muted-foreground">{selectedPersonIsPastor ? "Gerencie quem oferece cobertura a este Pastor." : "Confira o vínculo pastoral para liberar esta configuração."}</span></span></span><ArrowRight className="h-4 w-4 shrink-0 text-indigo-700" />
            </button>
          )}

          {effectivePersonSection === "cobertura" && canManagePastoralCoverage && (
            <section className="rounded-xl border border-indigo-200 bg-indigo-50/35 p-4">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-indigo-700" />
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-navy">Cobertura espiritual</h3>
                  <p className="mt-1 text-xs text-muted-foreground">Registre quem oferece cobertura pastoral a este Pastor. Esta relação é administrativa e não substitui o responsável interno pelo cuidado.</p>
                </div>
              </div>

              {pastoralCoverageState === "loading" ? (
                <PersonSectionState kind="loading" title="Carregando cobertura espiritual…" className="mt-4 border-0 bg-transparent p-0" />
              ) : pastoralCoverageState === "error" ? (
                <PersonSectionState kind="error" title="Não foi possível carregar a cobertura espiritual" onRetry={pastoralCoverageQuery.refetch} retrying={pastoralCoverageQuery.isFetching} className="mt-4" />
              ) : pastoralCoverageState === "unavailable" ? (
                <PersonSectionState kind="unavailable" title="Cobertura espiritual indisponível" className="mt-4" />
              ) : !selectedPersonIsPastor ? (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <p className="font-semibold">Cargo pastoral não reconhecido nesta Pessoa</p>
                  <p className="mt-1 text-xs leading-relaxed">Para cadastrar a cobertura espiritual, o Administrador Presidente precisa vincular esta ficha a uma conta em <strong>Configurações → Pessoas e acessos</strong> e atribuir o cargo Pastor Presidente ou Pastor Local. Depois, reabra a ficha e esta tela exibirá os campos para cadastrar ou atualizar a cobertura.</p>
                </div>
              ) : personAccessState === "loading" ? (
                <PersonSectionState kind="loading" title="Carregando acesso da Pessoa…" className="mt-4 border-0 bg-transparent p-0" />
              ) : personAccessState === "error" ? (
                <PersonSectionState kind="error" title="Não foi possível carregar o acesso da Pessoa" onRetry={personAccessQuery.refetch} retrying={personAccessQuery.isFetching} className="mt-4" />
              ) : (
                <>
                  {pastoralCoverageQuery.data?.coverage ? (
                    <div className="mt-4 rounded-lg border border-indigo-100 bg-background/80 p-3">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-navy">{pastoralCoverageQuery.data.coverage.coveringPastorName}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{pastoralCoverageQuery.data.coverage.coveringChurchName}</p>
                        </div>
                        <Badge variant="outline" className="w-fit text-[10px]">Cobertura cadastrada</Badge>
                      </div>
                      {pastoralCoverageQuery.data.coverage.notes && <p className="mt-2 text-xs text-muted-foreground">{pastoralCoverageQuery.data.coverage.notes}</p>}
                      <p className="mt-2 text-[10px] text-muted-foreground">Atualizada em {new Date(pastoralCoverageQuery.data.coverage.updatedAt).toLocaleString("pt-BR")} por {pastoralCoverageQuery.data.coverage.updatedByName ?? "Administrador Presidente"}.</p>
                    </div>
                  ) : (
                    <p className="mt-4 rounded-lg border border-dashed border-indigo-200 bg-background/60 p-3 text-xs text-muted-foreground">Nenhuma cobertura espiritual cadastrada para este Pastor.</p>
                  )}

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="coverage-pastor-person">Pastor interno de cobertura</Label>
                      <Select
                        value={coverageForm.coveringPastorPersonId || "externo"}
                        onValueChange={(value) => {
                          const candidate = (pastoralCoverageCandidatesQuery.data ?? []).find((item) => String(item.personId) === value);
                          setCoverageForm((current) => ({
                            ...current,
                            coveringPastorPersonId: value === "externo" ? "" : value,
                            coveringPastorName: candidate?.fullName ?? (value === "externo" ? "" : current.coveringPastorName),
                          }));
                        }}
                      >
                        <SelectTrigger id="coverage-pastor-person" className="mt-1 bg-background"><SelectValue placeholder="Externo ou selecione um Pastor" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="externo">Pastor externo / informar manualmente</SelectItem>
                          {(pastoralCoverageCandidatesQuery.data ?? [])
                            .filter((candidate) => candidate.personId !== selectedPerson.id)
                            .map((candidate) => <SelectItem key={candidate.personId} value={String(candidate.personId)}>{candidate.fullName} · {candidate.role === "pastor_presidente" ? "Pastor Presidente" : "Pastor Local"}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="coverage-church">Igreja que oferece a cobertura *</Label>
                      <Input id="coverage-church" className="mt-1 bg-background" value={coverageForm.coveringChurchName} onChange={(event) => setCoverageForm((current) => ({ ...current, coveringChurchName: event.target.value }))} placeholder="Ex.: Igreja Comunidade da Graça" maxLength={255} />
                    </div>
                    <div>
                      <Label htmlFor="coverage-pastor-name">Pastor que oferece a cobertura *</Label>
                      <Input id="coverage-pastor-name" className="mt-1 bg-background" value={coverageForm.coveringPastorName} onChange={(event) => setCoverageForm((current) => ({ ...current, coveringPastorName: event.target.value }))} disabled={Boolean(coverageForm.coveringPastorPersonId)} placeholder="Ex.: Apóstolo França" maxLength={255} />
                    </div>
                    <div>
                      <Label htmlFor="coverage-pastor-phone">Telefone</Label>
                      <Input id="coverage-pastor-phone" className="mt-1 bg-background" value={coverageForm.coveringPastorPhone} onChange={(event) => setCoverageForm((current) => ({ ...current, coveringPastorPhone: event.target.value }))} placeholder="(11) 99999-9999" maxLength={20} />
                    </div>
                    <div>
                      <Label htmlFor="coverage-pastor-whatsapp">WhatsApp</Label>
                      <Input id="coverage-pastor-whatsapp" className="mt-1 bg-background" value={coverageForm.coveringPastorWhatsapp} onChange={(event) => setCoverageForm((current) => ({ ...current, coveringPastorWhatsapp: event.target.value }))} placeholder="(11) 99999-9999" maxLength={20} />
                    </div>
                    <div className="sm:col-span-2">
                      <Label htmlFor="coverage-notes">Observação administrativa</Label>
                      <Textarea id="coverage-notes" className="mt-1 bg-background" rows={2} value={coverageForm.notes} onChange={(event) => setCoverageForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Ex.: cobertura ministerial acordada com a liderança da igreja." maxLength={1000} />
                    </div>
                  </div>
                  <p className="mt-2 text-[10px] text-muted-foreground">Somente o Administrador Presidente pode cadastrar, alterar ou remover esta informação.</p>
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                    {pastoralCoverageQuery.data?.coverage && <Button type="button" variant="outline" className="border-rose-200 text-rose-700 hover:bg-rose-50" onClick={handleRemovePastoralCoverage} disabled={removePastoralCoverage.isPending}>{removePastoralCoverage.isPending ? "Removendo…" : "Remover cobertura"}</Button>}
                    <Button type="button" className="bg-navy text-white hover:bg-navy-light" onClick={handleSavePastoralCoverage} disabled={savePastoralCoverage.isPending}>{savePastoralCoverage.isPending ? "Salvando…" : pastoralCoverageQuery.data?.coverage ? "Atualizar cobertura" : "Salvar cobertura"}</Button>
                  </div>

                  <div className="mt-5 border-t border-indigo-100 pt-4">
                    <h4 className="text-xs font-semibold uppercase tracking-wide text-indigo-900">Histórico da cobertura</h4>
                    {(pastoralCoverageQuery.data?.events ?? []).length === 0 ? (
                      <p className="mt-2 text-xs text-muted-foreground">Nenhuma alteração registrada.</p>
                    ) : (
                      <div className="mt-3 space-y-2">
                        {(pastoralCoverageQuery.data?.events ?? []).slice(0, 5).map((event) => (
                          <div key={event.id} className="rounded-md border border-indigo-100 bg-background/70 p-2.5">
                            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                              <p className="text-xs font-medium text-navy">{event.action === "criada" ? "Cobertura cadastrada" : event.action === "atualizada" ? "Cobertura atualizada" : "Cobertura removida"}</p>
                              <p className="text-[10px] text-muted-foreground">{new Date(event.createdAt).toLocaleString("pt-BR")}</p>
                            </div>
                            <p className="mt-1 text-[11px] text-muted-foreground">{event.coveringPastorName} · {event.coveringChurchName} · por {event.changedByName ?? "Administrador Presidente"}</p>
                            {event.notes && <p className="mt-1 text-[11px] text-muted-foreground">{event.notes}</p>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </section>
          )}

          {effectivePersonSection === "cuidado" && <div className="grid gap-4 md:grid-cols-2">
            <section className={`rounded-xl border p-4 ${isPrimaryDisciplerFocus ? "border-indigo-200 bg-indigo-50/40" : "border-border"}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-navy">Discipulador principal</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">É o vínculo principal de acompanhamento da Pessoa. Consolidação e Célula podem apoiar sem substituí-lo.</p>
                </div>
                <Badge variant="outline" className="shrink-0 border-indigo-200 bg-indigo-50 text-[10px] text-indigo-800">Relação principal</Badge>
              </div>
              {selectedPerson?.discipledById ? (
                <div className="mt-3 rounded-lg border border-indigo-100 bg-background/80 p-3">
                  <p className="font-medium text-navy">{primaryDiscipler?.fullName ?? "Pessoa vinculada"}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Discipulador definido pela liderança.</p>
                </div>
              ) : (
                <PersonSectionState kind="empty" title="Nenhum discipulador definido" description="A ausência é válida até que a liderança escolha uma pessoa responsável." className="mt-3" />
              )}
              {!canManagePrimaryDiscipler && <p className="mt-3 text-[11px] text-muted-foreground">Somente Pastores ou Supervisores podem definir o discipulador principal.</p>}
            </section>
            <section className="rounded-xl border border-border p-4">
              <div>
                <h3 className="text-sm font-semibold text-navy">Cuidado operacional</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Este cartão mostra um apoio operacional por papel, quando houver. Consolidação e Célula mantêm seus próprios registros e não substituem o discipulador principal.</p>
              </div>
              {currentCareState === "loading" ? <PersonSectionState kind="loading" title="Carregando cuidado operacional…" className="mt-3 border-0 bg-transparent p-0" /> : currentCareState === "error" ? <PersonSectionState kind="error" title="Não foi possível carregar o cuidado operacional" onRetry={currentCare.refetch} retrying={currentCare.isFetching} className="mt-3" /> : currentCareState === "unavailable" ? <PersonSectionState kind="unavailable" title="Cuidado operacional indisponível" className="mt-3" /> : currentCare.data ? (
                <div className="mt-3 space-y-1">
                  <p className="font-medium text-navy">{currentResponsible?.fullName ?? "Pessoa vinculada"}</p>
                  <Badge variant="outline" className="text-xs">{getCareRoleLabel(currentCare.data.role)}</Badge>
                </div>
              ) : <PersonSectionState kind="empty" title="Nenhum cuidado operacional definido" description="Isso é válido quando o discipulador principal conduz o acompanhamento sem apoio adicional." className="mt-3" />}
            </section>
            <section className="rounded-xl border border-border p-4">
              <h3 className="text-sm font-semibold text-navy">Histórico de cuidado</h3>
              {careHistoryState === "loading" ? <PersonSectionState kind="loading" title="Carregando histórico de cuidado…" className="mt-3 border-0 bg-transparent p-0" /> : careHistoryState === "error" ? <PersonSectionState kind="error" title="Não foi possível carregar o histórico de cuidado" onRetry={careHistory.refetch} retrying={careHistory.isFetching} className="mt-3" /> : careHistoryState === "unavailable" ? <PersonSectionState kind="unavailable" title="Histórico de cuidado indisponível" className="mt-3" /> : careHistoryState === "empty" ? <PersonSectionState kind="empty" title="Nenhuma atribuição registrada" description="O histórico ficará disponível quando houver uma atribuição de cuidado." className="mt-3" /> : (
                <>
                  {careHistoryState === "refreshing" && <PersonSectionState kind="refreshing" title="Atualizando histórico…" className="mt-3 border-0 bg-transparent p-0" />}
                  <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground"><Clock3 className="h-4 w-4" />{careHistory.data?.length ?? 0} atribuição(ões) registrada(s)</p>
                </>
              )}
            </section>
          </div>}

          {effectivePersonSection === "historico" && (
            historyState === "loading" ? <PersonSectionState kind="loading" title="Carregando histórico…" /> : historyState === "error" ? <PersonSectionState kind="error" title="Não foi possível carregar o histórico" onRetry={refreshHistory} retrying={historyIsFetching} /> : historyState === "unavailable" ? <PersonSectionState kind="unavailable" title="Histórico indisponível" /> : historyState === "empty" ? <PersonSectionState kind="empty" title="Ainda não há atividades históricas registradas" description="A situação atual da Pessoa continua disponível no Resumo, na Jornada e em Participações." /> : (
              <div className="space-y-3">
                {(historyState === "refreshing" || historyHasError) && <PersonSectionState kind={historyHasError ? "error" : "refreshing"} title={historyHasError ? "Atualização parcial do histórico" : "Atualizando histórico…"} description={historyHasError ? "Algumas fontes não responderam. Os eventos já carregados continuam visíveis." : "Os eventos atuais continuam visíveis."} onRetry={historyHasError ? refreshHistory : undefined} retrying={historyIsFetching} />}
                <PersonHistoryTimeline events={historyTimeline} />
              </div>
            )
          )}

          {effectivePersonSection === "cuidado" && (isPrimaryDisciplerFocus ? canManagePrimaryDiscipler : canManageJourney) && (
            <section className="rounded-xl border border-gold/25 bg-gold/5 p-4">
            <h3 className="text-sm font-semibold text-navy">{isPrimaryDisciplerFocus ? "Definir discipulador principal" : "Definir cuidado operacional"}</h3>
            <p className="mt-1 text-xs text-muted-foreground">{isPrimaryDisciplerFocus ? "Esta ação altera somente o discipulador principal. Ela não encerra a Consolidação nem altera a participação em Célula." : "Este apoio é independente do discipulador principal. Ao atualizar o mesmo papel, o vínculo anterior é preservado no histórico."}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="care-responsible">Pessoa responsável pelo apoio *</Label>
                <Select value={careForm.responsiblePersonId} onValueChange={(value) => setCareForm((current) => ({ ...current, responsiblePersonId: value }))}>
                  <SelectTrigger id="care-responsible" className="mt-1 bg-background"><SelectValue placeholder="Selecione uma pessoa" /></SelectTrigger>
                  <SelectContent>{(people ?? []).filter((person) => person.id !== selectedPerson?.id).map((person) => <SelectItem key={person.id} value={String(person.id)}>{person.fullName}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              {!isPrimaryDisciplerFocus ? <div>
                <Label htmlFor="care-role">Função no cuidado *</Label>
                  <Select value={careForm.role} onValueChange={(value) => setCareForm((current) => ({ ...current, role: value }))}>
                    <SelectTrigger id="care-role" className="mt-1 bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(CARE_ROLE_LABELS).filter(([value]) => value !== "discipulador").map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                </Select>
              </div> : <div className="rounded-lg border border-indigo-100 bg-background/80 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-indigo-900">Função</p><p className="mt-1 text-sm font-medium text-navy">Discipulador principal</p><p className="mt-1 text-xs text-muted-foreground">A Consolidação e a Célula permanecem independentes.</p></div>}
            </div>
            {!isPrimaryDisciplerFocus && <label className="mt-3 flex items-start gap-3 rounded-lg border border-border/70 bg-background/70 p-3 text-sm">
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
            </label>}
            <div className="mt-3">
              <Label htmlFor="care-notes">Observação</Label>
              <Textarea id="care-notes" className="mt-1 bg-background" rows={2} value={careForm.notes} onChange={(event) => setCareForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Ex.: responsável definido após primeiro contato" />
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
              {selectedAttention?.nextStep === "Iniciar consolidação" && !isPrimaryDisciplerFocus && <Button type="button" variant="outline" onClick={handleStartConsolidation} disabled={startConsolidation.isPending}>Iniciar consolidação</Button>}
              <Button type="button" className="bg-navy text-white hover:bg-navy-light" onClick={saveCareAssignment} disabled={assignCare.isPending || !canManagePrimaryDiscipler && isPrimaryDisciplerFocus}>{assignCare.isPending ? "Salvando…" : isPrimaryDisciplerFocus ? "Salvar discipulador" : "Salvar cuidado operacional"}</Button>
            </div>
            </section>
          )}

          {effectivePersonSection === "participacoes" && canManageMinistryFunctions && (
            <section className="rounded-xl border border-indigo-200 bg-indigo-50/35 p-4">
              <div className="flex items-start gap-3">
                <BriefcaseBusiness className="mt-0.5 h-5 w-5 shrink-0 text-indigo-700" />
                <div>
                  <h3 className="text-sm font-semibold text-navy">Participações e atuações</h3>
                  <p className="mt-1 text-xs text-muted-foreground">A Jornada é a etapa principal. A Pessoa pode participar de vários Ministérios e cursos paralelamente, sem criar uma segunda etapa principal.</p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-indigo-100 bg-background/80 p-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-indigo-900">Ministérios da pessoa</h4>
                  {personMembershipsState === "loading" ? <PersonSectionState kind="loading" title="Carregando Ministérios…" className="mt-2 border-0 bg-transparent p-0 text-xs" /> : personMembershipsState === "error" ? <PersonSectionState kind="error" title="Não foi possível carregar Ministérios" onRetry={personMembershipsQuery.refetch} retrying={personMembershipsQuery.isFetching} className="mt-2" /> : personMembershipsState === "unavailable" ? <PersonSectionState kind="unavailable" title="Ministérios indisponíveis" className="mt-2" /> : personMembershipsState === "empty" ? (
                    <PersonSectionState kind="empty" title="Nenhum Ministério ativo" className="mt-2" />
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
                  {personFunctionsState === "loading" ? <PersonSectionState kind="loading" title="Carregando atuações…" className="mt-2 border-0 bg-transparent p-0 text-xs" /> : personFunctionsState === "error" ? <PersonSectionState kind="error" title="Não foi possível carregar atuações" onRetry={personFunctionsQuery.refetch} retrying={personFunctionsQuery.isFetching} className="mt-2" /> : personFunctionsState === "unavailable" ? <PersonSectionState kind="unavailable" title="Atuações indisponíveis" className="mt-2" /> : personFunctionsState === "empty" ? (
                    <PersonSectionState kind="empty" title="Nenhuma função manual atribuída" className="mt-2" />
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
                  {personAccessState === "loading" ? <PersonSectionState kind="loading" title="Carregando acessos…" className="mt-2 border-0 bg-transparent p-0 text-xs" /> : personAccessState === "error" ? <PersonSectionState kind="error" title="Não foi possível carregar acessos" onRetry={personAccessQuery.refetch} retrying={personAccessQuery.isFetching} className="mt-2" /> : personAccessState === "unavailable" ? <PersonSectionState kind="unavailable" title="Acessos indisponíveis" className="mt-2" /> : !personAccessQuery.data?.accountLinked ? (
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

          {effectivePersonSection === "cuidado" && canCreateReferral && (
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

          {effectivePersonSection === "participacoes" && (
            <section className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold text-navy">Participação em Célula</h3>
                  <p className="mt-1 text-xs text-muted-foreground">A participação comunitária é independente da etapa principal da Jornada.</p>
                </div>
                <Badge variant="outline" className={cellParticipationState === "ready" && cellParticipationQuery.data?.status === "integrada" ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-amber-300 bg-amber-50 text-amber-800"}>
                  {cellParticipationState === "loading" ? "Carregando…" : cellParticipationState === "error" ? "Não disponível" : cellParticipationState === "unavailable" ? "Indisponível" : cellParticipationQuery.data?.status === "integrada" ? "Integrada" : "Pendente"}
                </Badge>
              </div>
            {cellParticipationState === "loading" ? (
              <PersonSectionState kind="loading" title="Carregando vínculo de Célula…" className="mt-3 border-0 bg-transparent p-0" />
            ) : cellParticipationState === "error" ? (
              <PersonSectionState kind="error" title="Não foi possível carregar a participação em Célula" onRetry={cellParticipationQuery.refetch} retrying={cellParticipationQuery.isFetching} className="mt-3" />
            ) : cellParticipationState === "unavailable" ? (
              <PersonSectionState kind="unavailable" title="Participação em Célula indisponível" className="mt-3" />
            ) : cellParticipationState === "refreshing" ? (
              <>
                <PersonSectionState kind="refreshing" title="Atualizando participação…" description="O vínculo atual continua visível." className="mt-3 border-0 bg-transparent p-0" />
                {currentCell ? (
                  <div className="mt-2 rounded-lg border border-indigo-100 bg-background/80 p-3">
                    <p className="text-sm font-medium text-navy">Célula atual: {currentCell.cellName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">O vínculo atual permanece visível enquanto a atualização termina.</p>
                  </div>
                ) : <PersonSectionState kind="empty" title="Sem Célula" description="A participação anterior continua preservada no histórico." className="mt-2" />}
              </>
            ) : currentCell ? (
              <div className="mt-2 rounded-lg border border-indigo-100 bg-background/80 p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-navy">Célula atual: {currentCell.cellName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Desde {new Date(currentCell.joinedAt).toLocaleDateString("pt-BR")}. Escolher outra célula fará uma transferência, sem apagar o histórico.</p>
                  </div>
                  {canManageCellParticipation && <Button type="button" size="sm" variant="outline" className="shrink-0 border-rose-200 bg-background text-rose-700 hover:bg-rose-50" onClick={handleCellRemoval} disabled={removeCell.isPending}>
                    <UserMinus className="mr-1.5 h-4 w-4" />{removeCell.isPending ? "Retirando…" : "Sair da Célula"}
                  </Button>}
                </div>
              </div>
            ) : (
              <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50/70 p-3">
                <p className="text-sm font-medium text-amber-900">Célula atual: Sem Célula</p>
                <p className="mt-1 text-xs text-amber-800">Participação: Pendente. Isso é válido para quem nunca participou ou para quem saiu de uma Célula.</p>
              </div>
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
                  {assignCell.isPending ? "Atualizando…" : currentCell ? "Transferir" : "Integrar à Célula"}
                </Button>
              </div>
            ) : <p className="mt-3 text-xs text-muted-foreground">A integração e a transferência de Célula são feitas pelo Pastor ou pela liderança responsável.</p>}
              <div className="mt-3 rounded-lg border border-indigo-100 bg-background/70 px-3 py-2 text-xs text-muted-foreground">
                {cellHistoryState === "loading" ? <PersonSectionState kind="loading" title="Carregando histórico de Célula…" className="border-0 bg-transparent p-0" /> : cellHistoryState === "error" ? <PersonSectionState kind="error" title="Não foi possível carregar o histórico de Célula" onRetry={cellHistory.refetch} retrying={cellHistory.isFetching} className="border-0 bg-transparent p-0" /> : cellHistoryState === "unavailable" ? <PersonSectionState kind="unavailable" title="Histórico de Célula indisponível" className="border-0 bg-transparent p-0" /> : cellHistoryState === "empty" ? <PersonSectionState kind="empty" title="Nenhuma participação anterior registrada" className="border-0 bg-transparent p-0" /> : (
                  <>{cellHistoryState === "refreshing" && <PersonSectionState kind="refreshing" title="Atualizando histórico…" className="mb-2 border-0 bg-transparent p-0" />}{cellHistory.data && cellHistory.data.length > 0 ? `${cellHistory.data.filter((membership) => !membership.active).length} participação(ões) anterior(es) preservada(s) no histórico.` : "Nenhuma participação anterior registrada."}</>
                )}
              </div>
            </section>
          )}
          </div>
          </AdaptiveFormDialogBody>
        </AdaptiveFormDialogContent>
      </Dialog>
      <ConfirmDestructiveActionDialog
        open={Boolean(pendingDestructiveAction)}
        title={pendingDestructiveAction?.kind === "pastoral-coverage-removal" ? "Remover cobertura espiritual?" : "Retirar da Célula?"}
        description={pendingDestructiveAction?.kind === "pastoral-coverage-removal"
          ? `A cobertura espiritual atual de ${pendingDestructiveAction.personName} será removida desta ficha. O histórico da cobertura será preservado.`
          : pendingDestructiveAction
            ? `Você está prestes a retirar ${pendingDestructiveAction.personName} da Célula ${pendingDestructiveAction.cellName}. O histórico da participação será preservado e a Jornada principal não será alterada.`
            : "Confirme a ação para continuar."}
        cancelLabel={pendingDestructiveAction?.kind === "pastoral-coverage-removal" ? "Manter cobertura" : "Manter na Célula"}
        confirmLabel={pendingDestructiveAction?.kind === "pastoral-coverage-removal" ? "Remover cobertura" : "Retirar da Célula"}
        pendingLabel={pendingDestructiveAction?.kind === "pastoral-coverage-removal" ? "Removendo…" : "Retirando…"}
        pending={removeCell.isPending || removePastoralCoverage.isPending}
        onOpenChange={(open) => !open && setPendingDestructiveAction(null)}
        onCancel={() => setPendingDestructiveAction(null)}
        onConfirm={confirmPendingDestructiveAction}
      />
    </div>
  );
}
