import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { useChurch } from "@/components/ChurchLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowLeft, Calendar, CheckCircle2, ClipboardCheck, Copy, Heart, History, Link2, MapPin, MessageCircle, MoreHorizontal, Plus, RefreshCw, Send, Settings, ShieldCheck, Smartphone, UserRoundCheck, Users, UtensilsCrossed } from "lucide-react";

const EVENT_STATUS_LABELS: Record<string, string> = { rascunho: "Rascunho", planejamento: "Planejamento", confirmado: "Confirmado", em_andamento: "Em andamento", encerrado: "Encerrado", cancelado: "Cancelado" };
const ENROLLMENT_STATUS_LABELS: Record<string, string> = { inscrito: "Inscrito", confirmado: "Confirmado", participou: "Participou", concluiu: "Concluiu", cancelado: "Cancelado" };
const REVIEW_STATUS_LABELS: Record<string, string> = { recebida: "Recebida", em_analise: "Em análise", confirmada: "Confirmada", precisa_correcao: "Precisa de correção", rejeitada: "Rejeitada" };
const CHECKLIST_STATUS_LABELS: Record<string, string> = { pendente: "Pendente", em_andamento: "Em andamento", concluida: "Concluída", cancelada: "Cancelada" };
const TEAM_CATEGORY_LABELS: Record<string, string> = { lideranca: "Liderança", espiritual: "Espiritual", apoio: "Apoio", operacional: "Operacional", manual: "Personalizada" };
const CHECKLIST_CATEGORY_LABELS: Record<string, string> = { estrutura: "Estrutura e local", discipulos: "Discípulos", servos: "Servos e equipes", intercessao: "Intercessão", alimentacao: "Alimentação", logistica: "Logística", comunicacao: "Comunicação", pos_encontro: "Pós-encontro", outro: "Outro" };

const emptyServantForm = { personId: "", teamId: "", roleMode: "catalogo", roleName: "", assignmentType: "membro", notes: "" };
const emptyTeamForm = { name: "", category: "operacional", requiredCount: "", notes: "" };
const emptyChecklistForm = { title: "", category: "outro", assignedPersonId: "", dueAt: "", notes: "" };
const emptySettingsForm = { name: "", date: "", endDate: "", location: "", maxParticipants: "", description: "", generalNotes: "", responsiblePersonId: "" };

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-BR");
}

function formatDateTime(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("pt-BR");
}

function dateInputValue(value: Date | string | null | undefined) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

export default function EncontroComDeusDetalhe() {
  const { eventId: eventIdParam } = useParams<{ eventId: string }>();
  const eventId = Number(eventIdParam);
  const { churchId, churchName } = useChurch();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const [enrollOpen, setEnrollOpen] = useState(false);
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [discipleDetails, setDiscipleDetails] = useState<any>(null);
  const [reviewStatus, setReviewStatus] = useState("recebida");
  const [reviewNotes, setReviewNotes] = useState("");
  const [servantOpen, setServantOpen] = useState(false);
  const [servantForm, setServantForm] = useState(emptyServantForm);
  const [teamOpen, setTeamOpen] = useState(false);
  const [teamForm, setTeamForm] = useState(emptyTeamForm);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [checklistForm, setChecklistForm] = useState(emptyChecklistForm);
  const [shareOpen, setShareOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState(emptySettingsForm);

  const validEventId = Number.isInteger(eventId) && eventId > 0;
  const overview = trpc.encontro.getOverview.useQuery({ churchId, eventId }, { enabled: Boolean(churchId && validEventId) });
  const enrollments = trpc.encontro.getEnrollments.useQuery({ churchId, eventId }, { enabled: Boolean(churchId && validEventId) });
  const teams = trpc.encontro.listTeams.useQuery({ churchId, eventId }, { enabled: Boolean(churchId && validEventId) });
  const servants = trpc.encontro.listServants.useQuery({ churchId, eventId }, { enabled: Boolean(churchId && validEventId) });
  const checklist = trpc.encontro.listChecklist.useQuery({ churchId, eventId }, { enabled: Boolean(churchId && validEventId) });
  const history = trpc.encontro.getHistory.useQuery({ churchId, eventId }, { enabled: Boolean(churchId && validEventId) });
  const publicForm = trpc.encontro.getPublicForm.useQuery({ churchId, eventId }, { enabled: Boolean(churchId && validEventId) });
  const people = trpc.people.list.useQuery({ churchId }, { enabled: Boolean(churchId && validEventId) });

  const invalidateEncounter = async () => {
    await Promise.all([
      utils.encontro.getOverview.invalidate({ churchId, eventId }),
      utils.encontro.getEnrollments.invalidate({ churchId, eventId }),
      utils.encontro.listTeams.invalidate({ churchId, eventId }),
      utils.encontro.listServants.invalidate({ churchId, eventId }),
      utils.encontro.listChecklist.invalidate({ churchId, eventId }),
      utils.encontro.getHistory.invalidate({ churchId, eventId }),
      utils.encontro.getPublicForm.invalidate({ churchId, eventId }),
    ]);
  };

  const updateEvent = trpc.encontro.updateEvent.useMutation({ onSuccess: () => { toast.success("Encontro atualizado."); invalidateEncounter(); }, onError: (error) => toast.error(error.message) });
  const enroll = trpc.encontro.enroll.useMutation({ onSuccess: () => { toast.success("Discípulo inscrito."); setEnrollOpen(false); setSelectedPersonId(""); invalidateEncounter(); }, onError: (error) => toast.error(error.message) });
  const updateEnrollment = trpc.encontro.updateEnrollment.useMutation({ onSuccess: () => invalidateEncounter(), onError: (error) => toast.error(error.message) });
  const reviewForm = trpc.encontro.reviewDiscipleForm.useMutation({ onSuccess: () => { toast.success("Ficha revisada."); setDiscipleDetails(null); invalidateEncounter(); }, onError: (error) => toast.error(error.message) });
  const createTeam = trpc.encontro.createTeam.useMutation({ onSuccess: () => { toast.success("Equipe adicionada."); setTeamOpen(false); setTeamForm(emptyTeamForm); invalidateEncounter(); }, onError: (error) => toast.error(error.message) });
  const assignServant = trpc.encontro.assignServant.useMutation({ onSuccess: () => { toast.success("Servo atribuído."); setServantOpen(false); setServantForm(emptyServantForm); invalidateEncounter(); }, onError: (error) => toast.error(error.message) });
  const removeServant = trpc.encontro.removeServant.useMutation({ onSuccess: () => { toast.success("Atribuição retirada."); invalidateEncounter(); }, onError: (error) => toast.error(error.message) });
  const createChecklist = trpc.encontro.createChecklistItem.useMutation({ onSuccess: () => { toast.success("Pendência adicionada."); setChecklistOpen(false); setChecklistForm(emptyChecklistForm); invalidateEncounter(); }, onError: (error) => toast.error(error.message) });
  const updateChecklist = trpc.encontro.updateChecklistItem.useMutation({ onSuccess: () => invalidateEncounter(), onError: (error) => toast.error(error.message) });
  const rotatePublicForm = trpc.encontro.rotatePublicForm.useMutation({ onSuccess: () => { toast.success("Link da ficha criado com segurança."); invalidateEncounter(); }, onError: (error) => toast.error(error.message) });
  const setPublicFormActive = trpc.encontro.setPublicFormActive.useMutation({ onSuccess: () => { toast.success("Disponibilidade da ficha atualizada."); invalidateEncounter(); }, onError: (error) => toast.error(error.message) });

  const event = overview.data?.event;
  const summary = overview.data?.summary;
  const canManageAll = Boolean(overview.data?.access.canManageAll);

  useEffect(() => {
    if (!event) return;
    setSettingsForm({
      name: event.name,
      date: dateInputValue(event.date),
      endDate: dateInputValue(event.endDate),
      location: event.location ?? "",
      maxParticipants: event.maxParticipants ? String(event.maxParticipants) : "",
      description: event.description ?? "",
      generalNotes: event.generalNotes ?? "",
      responsiblePersonId: event.responsiblePersonId ? String(event.responsiblePersonId) : "",
    });
  }, [event]);
  const formLink = publicForm.data?.publicToken ? `${window.location.origin}/encontro/ficha/${publicForm.data.publicToken}` : "";
  const shareText = event ? `Olá! ${churchName} convida você a preencher sua ficha para o ${event.name}.\n\n${formLink}` : formLink;
  const canUseNativeShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  const teamServants = useMemo(() => {
    const grouped = new Map<number, typeof servants.data>();
    for (const item of servants.data ?? []) {
      const key = item.assignment.teamId ?? 0;
      grouped.set(key, [...(grouped.get(key) ?? []), item]);
    }
    return grouped;
  }, [servants.data]);
  const unassignedServants = teamServants.get(0) ?? [];

  function openDiscipleDetails(item: any) {
    setDiscipleDetails(item);
    setReviewStatus(item.form?.reviewStatus ?? "recebida");
    setReviewNotes(item.form?.reviewNotes ?? "");
  }

  async function copyLink() {
    if (!formLink) return;
    try {
      await navigator.clipboard.writeText(formLink);
      toast.success("Link copiado.");
    } catch {
      window.prompt("Copie o link da ficha:", formLink);
    }
  }

  async function nativeShare() {
    if (!event || !formLink || !canUseNativeShare) return;
    try {
      await navigator.share({ title: `Ficha — ${event.name}`, text: `Preencha sua ficha para o ${event.name}, da ${churchName}.`, url: formLink });
      setShareOpen(false);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Não foi possível abrir o compartilhamento do aparelho.");
    }
  }

  function shareWhatsApp() {
    if (!formLink) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank", "noopener,noreferrer");
  }

  function saveSettings() {
    if (!settingsForm.name.trim() || !settingsForm.date) {
      toast.error("Informe o nome e a data inicial do encontro.");
      return;
    }
    if (settingsForm.endDate && settingsForm.endDate < settingsForm.date) {
      toast.error("A data final não pode ser anterior à data inicial.");
      return;
    }
    updateEvent.mutate({
      id: eventId,
      churchId,
      name: settingsForm.name.trim(),
      date: settingsForm.date,
      endDate: settingsForm.endDate || null,
      location: settingsForm.location.trim() || null,
      maxParticipants: settingsForm.maxParticipants ? Number(settingsForm.maxParticipants) : null,
      description: settingsForm.description.trim() || null,
      generalNotes: settingsForm.generalNotes.trim() || null,
      ...(canManageAll ? { responsiblePersonId: settingsForm.responsiblePersonId ? Number(settingsForm.responsiblePersonId) : null } : {}),
    });
  }

  if (!validEventId) return <div className="p-6 text-sm text-rose-700">Identificador de encontro inválido.</div>;
  if (overview.isLoading) return <div className="grid gap-4 p-4 sm:p-6"><div className="h-32 animate-pulse rounded-2xl bg-muted" /><div className="h-64 animate-pulse rounded-2xl bg-muted" /></div>;
  if (overview.error || !event) return <div className="p-4 sm:p-6"><Card className="border-rose-200 bg-rose-50"><CardContent className="p-6"><p className="font-semibold text-rose-900">Não foi possível abrir este encontro.</p><p className="mt-1 text-sm text-rose-700">{overview.error?.message ?? "Encontro não encontrado."}</p><Button variant="outline" className="mt-4" onClick={() => navigate("/app/encontro-com-deus")}><ArrowLeft className="mr-2 h-4 w-4" /> Voltar</Button></CardContent></Card></div>;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <header className="rounded-3xl border border-[#1e3a5f]/10 bg-white p-5 shadow-sm sm:p-6">
        <Button variant="ghost" size="sm" className="mb-4 -ml-2 gap-2 text-muted-foreground" onClick={() => navigate("/app/encontro-com-deus")}><ArrowLeft className="h-4 w-4" /> Todos os encontros</Button>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h1 className="font-display text-2xl font-bold text-[#1e3a5f] sm:text-3xl">{event.name}</h1><Badge variant="outline">{EVENT_STATUS_LABELS[event.status]}</Badge></div><div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground"><span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" />{formatDate(event.date)}{event.endDate ? ` a ${formatDate(event.endDate)}` : ""}</span>{event.location && <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" />{event.location}</span>}</div>{event.description && <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{event.description}</p>}</div>
          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col"><Select value={event.status} onValueChange={(status) => updateEvent.mutate({ id: event.id, churchId, status: status as any })}><SelectTrigger className="min-w-44"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(EVENT_STATUS_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select><Button className="gap-2" onClick={() => publicForm.data ? setShareOpen(true) : rotatePublicForm.mutate({ churchId, eventId })}>{publicForm.data ? <Send className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}{publicForm.data ? "Compartilhar ficha" : "Criar ficha online"}</Button></div>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Metric label="Discípulos" value={summary?.enrollmentCount ?? 0} icon={Users} /><Metric label="Confirmados" value={summary?.confirmedCount ?? 0} icon={UserRoundCheck} /><Metric label="Servos" value={summary?.servantCount ?? 0} icon={Heart} /><Metric label="Pendências" value={summary?.pendingChecklistCount ?? 0} icon={ClipboardCheck} /></section>

      <Tabs defaultValue="visao" className="space-y-4"><TabsList className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-xl bg-[#1e3a5f]/5 p-1"><TabsTrigger value="visao">Visão geral</TabsTrigger><TabsTrigger value="discipulos">Discípulos</TabsTrigger><TabsTrigger value="servos">Servos e equipes</TabsTrigger><TabsTrigger value="checklist">Checklist</TabsTrigger><TabsTrigger value="configuracoes"><Settings className="mr-1.5 h-4 w-4" /> Configurações</TabsTrigger><TabsTrigger value="historico">Histórico</TabsTrigger></TabsList>

        <TabsContent value="visao" className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Card><CardHeader><CardTitle className="text-[#1e3a5f]">Preparação do encontro</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><Info label="Período" value={`${formatDate(event.date)}${event.endDate ? ` a ${formatDate(event.endDate)}` : ""}`} /><Info label="Local" value={event.location || "Não definido"} /><Info label="Limite de discípulos" value={event.maxParticipants ? String(event.maxParticipants) : "Sem limite"} /><Info label="Equipes ativas" value={String(summary?.teamCount ?? 0)} /><div className="sm:col-span-2"><Info label="Observações gerais" value={event.generalNotes || "Nenhuma observação registrada."} /></div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-[#1e3a5f]">Ficha online</CardTitle></CardHeader><CardContent className="space-y-4">{publicForm.data ? <><div className={`rounded-xl p-4 ${publicForm.data.active ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}><p className="font-semibold">{publicForm.data.active ? "Recebendo fichas" : "Ficha pausada"}</p><p className="mt-1 text-xs opacity-80">O link pode ser pausado ou renovado sem afetar fichas já recebidas.</p></div><div className="rounded-xl border bg-muted/20 p-3"><p className="break-all font-mono text-xs text-muted-foreground">{formLink}</p></div><div className="grid gap-2 sm:grid-cols-2"><Button variant="outline" onClick={() => setPublicFormActive.mutate({ churchId, eventId, active: !publicForm.data!.active })}>{publicForm.data.active ? "Pausar ficha" : "Reativar ficha"}</Button><Button variant="outline" onClick={() => rotatePublicForm.mutate({ churchId, eventId })}><RefreshCw className="mr-2 h-4 w-4" /> Renovar link</Button></div></> : <div className="rounded-xl border border-dashed p-6 text-center"><Link2 className="mx-auto mb-3 h-8 w-8 text-[#c9a84c]" /><p className="text-sm text-muted-foreground">Crie um link exclusivo para os discípulos preencherem a ficha sem login.</p><Button className="mt-4" onClick={() => rotatePublicForm.mutate({ churchId, eventId })}>Criar ficha online</Button></div>}</CardContent></Card>
        </TabsContent>

        <TabsContent value="discipulos" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-display text-xl font-bold text-[#1e3a5f]">Discípulos</h2><p className="text-sm text-muted-foreground">Participantes que serão ministrados. Este vínculo não libera acesso ao módulo.</p></div><Dialog open={enrollOpen} onOpenChange={setEnrollOpen}><DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Inscrever Pessoa</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Inscrever discípulo</DialogTitle><DialogDescription>Selecione uma Pessoa já cadastrada nesta igreja.</DialogDescription></DialogHeader><div className="space-y-4"><Select value={selectedPersonId} onValueChange={setSelectedPersonId}><SelectTrigger><SelectValue placeholder="Selecione a Pessoa" /></SelectTrigger><SelectContent>{(people.data ?? []).map((person) => <SelectItem key={person.id} value={String(person.id)}>{person.fullName}</SelectItem>)}</SelectContent></Select><Button className="w-full" disabled={!selectedPersonId || enroll.isPending} onClick={() => enroll.mutate({ churchId, encounterEventId: eventId, personId: Number(selectedPersonId) })}>{enroll.isPending ? "Inscrevendo..." : "Confirmar inscrição"}</Button></div></DialogContent></Dialog></div>
          <Card><CardContent className="p-0"><div className="divide-y">{(enrollments.data ?? []).length === 0 ? <Empty text="Nenhum discípulo inscrito ainda." /> : (enrollments.data ?? []).map((item) => <div key={item.enrollment.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center"><button type="button" className="min-w-0 text-left" onClick={() => item.form && openDiscipleDetails(item)}><p className="truncate font-semibold text-[#1e3a5f]">{item.person.fullName}</p><p className="mt-1 text-xs text-muted-foreground">{item.form ? `${item.form.age} anos · ficha ${REVIEW_STATUS_LABELS[item.form.reviewStatus].toLowerCase()}` : "Inscrição manual · ficha não preenchida"}</p></button><Badge variant="outline" className="w-fit">{item.form ? REVIEW_STATUS_LABELS[item.form.reviewStatus] : "Sem ficha"}</Badge><Select value={item.enrollment.status} onValueChange={(status) => updateEnrollment.mutate({ id: item.enrollment.id, churchId, status: status as any })}><SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(ENROLLMENT_STATUS_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>)}</div></CardContent></Card>
        </TabsContent>

        <TabsContent value="servos" className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-display text-xl font-bold text-[#1e3a5f]">Servos e equipes</h2><p className="text-sm text-muted-foreground">Funções específicas deste encontro, sem alterar o cargo permanente da Pessoa.</p></div><div className="flex gap-2"><Dialog open={teamOpen} onOpenChange={setTeamOpen}><DialogTrigger asChild><Button variant="outline"><Plus className="mr-2 h-4 w-4" /> Nova equipe</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Adicionar equipe ou frente</DialogTitle></DialogHeader><div className="space-y-4"><div><Label>Nome *</Label><Input value={teamForm.name} onChange={(event) => setTeamForm({ ...teamForm, name: event.target.value })} /></div><div><Label>Categoria</Label><Select value={teamForm.category} onValueChange={(value) => setTeamForm({ ...teamForm, category: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(TEAM_CATEGORY_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div><div><Label>Quantidade necessária</Label><Input type="number" min="1" value={teamForm.requiredCount} onChange={(event) => setTeamForm({ ...teamForm, requiredCount: event.target.value })} /></div><div><Label>Observações</Label><Textarea value={teamForm.notes} onChange={(event) => setTeamForm({ ...teamForm, notes: event.target.value })} /></div><Button className="w-full" disabled={!teamForm.name.trim()} onClick={() => createTeam.mutate({ churchId, eventId, name: teamForm.name, category: teamForm.category as any, requiredCount: teamForm.requiredCount ? Number(teamForm.requiredCount) : null, notes: teamForm.notes || null })}>Adicionar equipe</Button></div></DialogContent></Dialog><Dialog open={servantOpen} onOpenChange={setServantOpen}><DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Adicionar servo</Button></DialogTrigger><DialogContent className="max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Atribuir servo</DialogTitle><DialogDescription>Escolha uma função do catálogo ou informe uma função manual válida somente para este encontro.</DialogDescription></DialogHeader><div className="space-y-4"><div><Label>Pessoa *</Label><Select value={servantForm.personId} onValueChange={(value) => setServantForm({ ...servantForm, personId: value })}><SelectTrigger><SelectValue placeholder="Selecione a Pessoa" /></SelectTrigger><SelectContent>{(people.data ?? []).map((person) => <SelectItem key={person.id} value={String(person.id)}>{person.fullName}</SelectItem>)}</SelectContent></Select></div><div><Label>Equipe</Label><Select value={servantForm.teamId || "sem_equipe"} onValueChange={(value) => setServantForm({ ...servantForm, teamId: value === "sem_equipe" ? "" : value, roleName: value === "sem_equipe" || servantForm.roleMode === "manual" ? servantForm.roleName : teams.data?.find((team) => String(team.id) === value)?.name ?? "" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sem_equipe">Sem equipe</SelectItem>{(teams.data ?? []).map((team) => <SelectItem key={team.id} value={String(team.id)}>{team.name}</SelectItem>)}</SelectContent></Select></div><div><Label>Origem da função</Label><Select value={servantForm.roleMode} onValueChange={(value) => setServantForm({ ...servantForm, roleMode: value, roleName: value === "manual" ? "" : teams.data?.find((team) => String(team.id) === servantForm.teamId)?.name ?? "" })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="catalogo">Função/equipe predefinida</SelectItem><SelectItem value="manual">Adicionar função manual</SelectItem></SelectContent></Select></div><div><Label>{servantForm.roleMode === "manual" ? "Nome da função manual *" : "Função *"}</Label><Input value={servantForm.roleName} onChange={(event) => setServantForm({ ...servantForm, roleName: event.target.value })} placeholder={servantForm.roleMode === "manual" ? "Ex.: Apoio aos quartos" : "Selecione uma equipe ou informe a função"} /></div><div><Label>Tipo de atribuição</Label><Select value={servantForm.assignmentType} onValueChange={(value) => setServantForm({ ...servantForm, assignmentType: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="responsavel">Responsável</SelectItem><SelectItem value="membro">Membro</SelectItem><SelectItem value="substituto">Substituto</SelectItem></SelectContent></Select></div><div><Label>Observações</Label><Textarea value={servantForm.notes} onChange={(event) => setServantForm({ ...servantForm, notes: event.target.value })} /></div><Button className="w-full" disabled={!servantForm.personId || !servantForm.roleName.trim()} onClick={() => assignServant.mutate({ churchId, eventId, personId: Number(servantForm.personId), teamId: servantForm.teamId ? Number(servantForm.teamId) : null, roleKey: servantForm.roleMode === "manual" ? null : servantForm.roleName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "_"), roleName: servantForm.roleName, roleSource: servantForm.roleMode as any, assignmentType: servantForm.assignmentType as any, notes: servantForm.notes || null })}>Confirmar atribuição</Button></div></DialogContent></Dialog></div></div>
          <div className="grid gap-4 lg:grid-cols-2">{(teams.data ?? []).map((team) => { const members = teamServants.get(team.id) ?? []; return <Card key={team.id}><CardHeader className="pb-3"><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-lg text-[#1e3a5f]">{team.name}</CardTitle><p className="mt-1 text-xs text-muted-foreground">{TEAM_CATEGORY_LABELS[team.category]}{team.source === "manual" ? " · criada manualmente" : ""}</p></div><Badge variant="outline">{members.length}{team.requiredCount ? `/${team.requiredCount}` : ""}</Badge></div></CardHeader><CardContent><div className="space-y-2">{members.length === 0 ? <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">Nenhum servo atribuído.</p> : members.map((member) => <div key={member.assignment.id} className="flex items-center justify-between gap-3 rounded-xl bg-muted/30 p-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-[#1e3a5f]">{member.person.fullName}</p><p className="truncate text-xs text-muted-foreground">{member.assignment.roleName} · {member.assignment.assignmentType}</p></div><Button variant="ghost" size="icon" title="Retirar atribuição" onClick={() => removeServant.mutate({ id: member.assignment.id, churchId, eventId })}><MoreHorizontal className="h-4 w-4" /></Button></div>)}</div></CardContent></Card>; })}</div>
          {unassignedServants.length > 0 && <Card><CardHeader className="pb-3"><div className="flex items-start justify-between gap-3"><div><CardTitle className="text-lg text-[#1e3a5f]">Funções avulsas</CardTitle><p className="mt-1 text-xs text-muted-foreground">Responsabilidades manuais que ainda não foram vinculadas a uma equipe.</p></div><Badge variant="outline">{unassignedServants.length}</Badge></div></CardHeader><CardContent><div className="grid gap-2 sm:grid-cols-2">{unassignedServants.map((member) => <div key={member.assignment.id} className="flex items-center justify-between gap-3 rounded-xl bg-muted/30 p-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-[#1e3a5f]">{member.person.fullName}</p><p className="truncate text-xs text-muted-foreground">{member.assignment.roleName} · {member.assignment.assignmentType}</p></div><Button variant="ghost" size="icon" title="Retirar atribuição" onClick={() => removeServant.mutate({ id: member.assignment.id, churchId, eventId })}><MoreHorizontal className="h-4 w-4" /></Button></div>)}</div></CardContent></Card>}
        </TabsContent>

        <TabsContent value="checklist" className="space-y-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-display text-xl font-bold text-[#1e3a5f]">Checklist de preparação</h2><p className="text-sm text-muted-foreground">Acompanhe prazos, responsáveis e pendências antes do encontro.</p></div><Dialog open={checklistOpen} onOpenChange={setChecklistOpen}><DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Nova pendência</Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>Adicionar pendência</DialogTitle></DialogHeader><div className="space-y-4"><div><Label>Tarefa *</Label><Input value={checklistForm.title} onChange={(event) => setChecklistForm({ ...checklistForm, title: event.target.value })} /></div><div><Label>Categoria</Label><Select value={checklistForm.category} onValueChange={(value) => setChecklistForm({ ...checklistForm, category: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(CHECKLIST_CATEGORY_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div><div><Label>Responsável</Label><Select value={checklistForm.assignedPersonId || "sem_responsavel"} onValueChange={(value) => setChecklistForm({ ...checklistForm, assignedPersonId: value === "sem_responsavel" ? "" : value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sem_responsavel">Definir depois</SelectItem>{(people.data ?? []).map((person) => <SelectItem key={person.id} value={String(person.id)}>{person.fullName}</SelectItem>)}</SelectContent></Select></div><div><Label>Prazo</Label><Input type="datetime-local" value={checklistForm.dueAt} onChange={(event) => setChecklistForm({ ...checklistForm, dueAt: event.target.value })} /></div><div><Label>Observações</Label><Textarea value={checklistForm.notes} onChange={(event) => setChecklistForm({ ...checklistForm, notes: event.target.value })} /></div><Button className="w-full" disabled={!checklistForm.title.trim()} onClick={() => createChecklist.mutate({ churchId, eventId, title: checklistForm.title, category: checklistForm.category as any, assignedPersonId: checklistForm.assignedPersonId ? Number(checklistForm.assignedPersonId) : null, dueAt: checklistForm.dueAt ? new Date(checklistForm.dueAt) : null, notes: checklistForm.notes || null })}>Adicionar pendência</Button></div></DialogContent></Dialog></div><Card><CardContent className="p-0"><div className="divide-y">{(checklist.data ?? []).length === 0 ? <Empty text="Nenhuma pendência cadastrada." /> : (checklist.data ?? []).map(({ item, assignee }) => <div key={item.id} className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="font-semibold text-[#1e3a5f]">{item.title}</p><p className="mt-1 text-xs text-muted-foreground">{CHECKLIST_CATEGORY_LABELS[item.category]}{assignee?.fullName ? ` · ${assignee.fullName}` : ""}{item.dueAt ? ` · até ${formatDateTime(item.dueAt)}` : ""}</p></div><Select value={item.status} onValueChange={(status) => updateChecklist.mutate({ id: item.id, eventId, churchId, status: status as any })}><SelectTrigger className="w-full sm:w-44"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(CHECKLIST_STATUS_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>)}</div></CardContent></Card></TabsContent>

        <TabsContent value="configuracoes"><Card><CardHeader><CardTitle className="flex items-center gap-2 text-[#1e3a5f]"><Settings className="h-5 w-5" /> Configurações do encontro</CardTitle><p className="text-sm text-muted-foreground">Atualize os dados operacionais sem alterar inscrições, equipes ou histórico.</p></CardHeader><CardContent className="space-y-5"><div className="grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><Label>Nome do encontro *</Label><Input value={settingsForm.name} onChange={(event) => setSettingsForm({ ...settingsForm, name: event.target.value })} /></div><div><Label>Data inicial *</Label><Input type="date" value={settingsForm.date} onChange={(event) => setSettingsForm({ ...settingsForm, date: event.target.value })} /></div><div><Label>Data final</Label><Input type="date" min={settingsForm.date || undefined} value={settingsForm.endDate} onChange={(event) => setSettingsForm({ ...settingsForm, endDate: event.target.value })} /></div><div><Label>Local</Label><Input value={settingsForm.location} onChange={(event) => setSettingsForm({ ...settingsForm, location: event.target.value })} /></div><div><Label>Limite de discípulos</Label><Input type="number" min="1" value={settingsForm.maxParticipants} onChange={(event) => setSettingsForm({ ...settingsForm, maxParticipants: event.target.value })} placeholder="Sem limite" /></div>{canManageAll && <div className="sm:col-span-2"><Label>Responsável pela coordenação</Label><Select value={settingsForm.responsiblePersonId || "sem_responsavel"} onValueChange={(value) => setSettingsForm({ ...settingsForm, responsiblePersonId: value === "sem_responsavel" ? "" : value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="sem_responsavel">Sem responsável definido</SelectItem>{(people.data ?? []).map((person) => <SelectItem key={person.id} value={String(person.id)}>{person.fullName}</SelectItem>)}</SelectContent></Select></div>}<div className="sm:col-span-2"><Label>Descrição pública</Label><Textarea rows={3} value={settingsForm.description} onChange={(event) => setSettingsForm({ ...settingsForm, description: event.target.value })} /></div><div className="sm:col-span-2"><Label>Observações internas</Label><Textarea rows={4} value={settingsForm.generalNotes} onChange={(event) => setSettingsForm({ ...settingsForm, generalNotes: event.target.value })} /></div></div><Button className="w-full sm:w-auto" disabled={updateEvent.isPending} onClick={saveSettings}>{updateEvent.isPending ? "Salvando..." : "Salvar configurações"}</Button></CardContent></Card></TabsContent>

        <TabsContent value="historico"><Card><CardHeader><CardTitle className="flex items-center gap-2 text-[#1e3a5f]"><History className="h-5 w-5" /> Histórico operacional</CardTitle></CardHeader><CardContent><div className="space-y-3">{(history.data ?? []).length === 0 ? <Empty text="O histórico será criado conforme o encontro for organizado." /> : (history.data ?? []).map((item) => <div key={item.id} className="grid grid-cols-[auto_1fr] gap-3"><span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-[#c9a84c]" /><div className="border-b pb-3 last:border-0"><p className="text-sm font-medium text-[#1e3a5f]">{item.action.replaceAll("_", " ")}</p><p className="mt-1 text-xs text-muted-foreground">{formatDateTime(item.createdAt)}</p></div></div>)}</div></CardContent></Card></TabsContent>
      </Tabs>

      <Dialog open={Boolean(discipleDetails)} onOpenChange={(open) => !open && setDiscipleDetails(null)}><DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle className="font-display text-[#1e3a5f]">Ficha do discípulo</DialogTitle><DialogDescription>Dados privados para organização e acompanhamento deste encontro.</DialogDescription></DialogHeader>{discipleDetails?.form && <div className="space-y-5"><section className="grid gap-3 rounded-2xl bg-[#1e3a5f]/5 p-4 sm:grid-cols-2"><Info label="Nome completo" value={discipleDetails.form.fullName} /><Info label="Idade" value={`${discipleDetails.form.age} anos`} /><Info label="Telefone" value={discipleDetails.form.phone} /><Info label="Igreja que participa" value={discipleDetails.form.attendingChurch} /></section><section className="grid gap-3 sm:grid-cols-2"><Info label="Mãe, pai ou responsável" value={discipleDetails.form.guardianName} /><Info label="Telefone do responsável" value={discipleDetails.form.guardianPhone} /><Info label="Amigo de confiança" value={discipleDetails.form.friendName} /><Info label="Telefone do amigo" value={discipleDetails.form.friendPhone} /><Info label="Quem convidou" value={discipleDetails.form.invitedByName} /><Info label="Ficha enviada em" value={formatDateTime(discipleDetails.form.submittedAt)} /></section><div><Label>Situação da ficha</Label><Select value={reviewStatus} onValueChange={setReviewStatus}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(REVIEW_STATUS_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div><div><Label>Observações da análise</Label><Textarea rows={3} value={reviewNotes} onChange={(event) => setReviewNotes(event.target.value)} placeholder="Orientações internas da coordenação" /></div><Button className="w-full" disabled={reviewForm.isPending} onClick={() => reviewForm.mutate({ id: discipleDetails.form.id, eventId, churchId, reviewStatus: reviewStatus as any, reviewNotes: reviewNotes.trim() || null })}>{reviewForm.isPending ? "Salvando..." : "Salvar revisão da ficha"}</Button></div>}</DialogContent></Dialog>

      <Dialog open={shareOpen} onOpenChange={setShareOpen}><DialogContent className="max-w-md"><DialogHeader><DialogTitle>Compartilhar ficha do discípulo</DialogTitle><DialogDescription>Envie o link oficial deste encontro. O discípulo não precisará fazer login.</DialogDescription></DialogHeader><div className="space-y-3"><Button className="w-full justify-start gap-3" disabled={!canUseNativeShare || !publicForm.data?.active} onClick={nativeShare}><Smartphone className="h-5 w-5" /><span className="text-left"><span className="block">Compartilhar pelo celular</span><span className="block text-xs font-normal opacity-75">{canUseNativeShare ? "Abrir opções do aparelho" : "Indisponível neste navegador"}</span></span></Button><Button variant="outline" className="w-full justify-start gap-3" disabled={!publicForm.data?.active} onClick={shareWhatsApp}><MessageCircle className="h-5 w-5" /><span className="text-left"><span className="block">WhatsApp</span><span className="block text-xs font-normal text-muted-foreground">Mensagem pronta com o link</span></span></Button><Button variant="outline" className="w-full justify-start gap-3" onClick={copyLink}><Copy className="h-5 w-5" /> Copiar link</Button>{!publicForm.data?.active && <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">A ficha está pausada. Reative-a na Visão geral antes de compartilhar.</p>}</div></DialogContent></Dialog>
    </div>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Users }) { return <div className="rounded-2xl border border-[#1e3a5f]/10 bg-white p-4 shadow-sm"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#1e3a5f]/5 text-[#1e3a5f]"><Icon className="h-4 w-4" /></span><div><p className="text-xl font-bold text-[#1e3a5f]">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div></div></div>; }
function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 whitespace-pre-line text-sm font-medium text-[#1e3a5f]">{value}</p></div>; }
function Empty({ text }: { text: string }) { return <div className="p-8 text-center"><UtensilsCrossed className="mx-auto mb-3 h-8 w-8 text-[#c9a84c]/70" /><p className="text-sm text-muted-foreground">{text}</p></div>; }
