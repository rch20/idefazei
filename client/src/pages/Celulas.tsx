import { useChurch } from "@/components/ChurchLayout";
import { CellPublicSettingsDialog } from "@/components/CellPublicSettingsDialog";
import { OpenStreetMap } from "@/components/OpenStreetMap";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useChurchAuth } from "@/hooks/useChurchAuth";
import { trpc } from "@/lib/trpc";
import { CalendarCheck2, CheckCircle2, Eye, Globe, HeartHandshake, MapPin, Phone, Plus, Send, Settings2, Users, UserRound } from "lucide-react";
import { ReportButton } from "@/components/ReportButton";
import { useRef, useState } from "react";
import { toast } from "sonner";

const DAYS = [
  { value: "segunda", label: "Segunda-feira" },
  { value: "terca", label: "Terça-feira" },
  { value: "quarta", label: "Quarta-feira" },
  { value: "quinta", label: "Quinta-feira" },
  { value: "sexta", label: "Sexta-feira" },
  { value: "sabado", label: "Sábado" },
  { value: "domingo", label: "Domingo" },
];

const defaultForm = {
  name: "",
  leaderId: "",
  coLeaderId: "",
  supervisorId: "",
  address: "",
  addressNumber: "",
  addressComplement: "",
  zipCode: "",
  city: "",
  state: "",
  neighborhood: "",
  meetingDay: "quarta" as const,
  meetingTime: "19:30",
};

type ViaCepResponse = {
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
};

function formatCep(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

function getTodayInputValue() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatMeetingDate(value: Date | string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Data não informada";
  return date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export default function Celulas() {
  const { churchId } = useChurch();
  const { user } = useChurchAuth();
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<any>(null);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [selectedCandidateId, setSelectedCandidateId] = useState("");
  const [activeTab, setActiveTab] = useState("lista");
  const [form, setForm] = useState(defaultForm);
  const [cepStatus, setCepStatus] = useState<"idle" | "loading" | "found" | "not-found">("idle");
  const [cepError, setCepError] = useState("");
  const cepLookupSequence = useRef(0);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [meetingDate, setMeetingDate] = useState(getTodayInputValue);
  const [meetingTopic, setMeetingTopic] = useState("");
  const [meetingNotes, setMeetingNotes] = useState("");
  const [presentByPersonId, setPresentByPersonId] = useState<Record<number, boolean>>({});
  const [memberReferralReason, setMemberReferralReason] = useState("");
  const [publicSettingsOpen, setPublicSettingsOpen] = useState(false);
  const [leadershipForm, setLeadershipForm] = useState({ leaderId: "", coLeaderId: "", supervisorId: "" });

  const { data: cells, isLoading, refetch } = trpc.cells.list.useQuery({ churchId });
  const managementAccess = trpc.cells.managementAccess.useQuery({ churchId });
  const { data: people } = trpc.people.list.useQuery({ churchId }, { enabled: Boolean(managementAccess.data?.canCreateAny) });
  const effectiveRoles = trpc.churchAuth.effectiveRoles.useQuery({ churchId }, { enabled: Boolean(user?.churchId) });
  const memberCounts = trpc.cells.memberCounts.useQuery({ churchId });
  const cellMembers = trpc.cells.members.useQuery(
    { churchId, cellId: selectedCell?.id ?? 0 },
    { enabled: Boolean(selectedCell?.id) }
  );
  const meetingHistory = trpc.cells.meetingHistory.useQuery(
    { churchId, cellId: selectedCell?.id ?? 0 },
    { enabled: Boolean(selectedCell?.id) }
  );
  const meetingAccess = trpc.cells.meetingAccess.useQuery(
    { churchId, cellId: selectedCell?.id ?? 0 },
    { enabled: Boolean(selectedCell?.id) }
  );
  const assignmentCandidates = trpc.cells.assignmentCandidates.useQuery(
    { churchId, cellId: selectedCell?.id ?? 0 },
    { enabled: Boolean(selectedCell?.id && selectedCell?.canManage) }
  );
  const currentMemberCare = trpc.care.getCurrent.useQuery(
    { churchId, personId: selectedMember?.person.id ?? 0 },
    { enabled: Boolean(selectedMember?.person.id) }
  );
  const createCell = trpc.cells.create.useMutation({
    onSuccess: () => {
      toast.success("Célula criada com sucesso!");
      setOpen(false);
      setForm(defaultForm);
      refetch();
    },
    onError: (error) => toast.error(error.message || "Erro ao criar célula"),
  });
  const updateLeadership = trpc.cells.updateLeadership.useMutation({
    onSuccess: async (updated) => {
      toast.success("Liderança da Célula atualizada.");
      const refreshed = await refetch();
      setSelectedCell(refreshed.data?.find((cell) => cell.id === updated?.id) ?? updated);
    },
    onError: (error) => toast.error(error.message || "Não foi possível atualizar a liderança."),
  });
  const assignPerson = trpc.cells.assignPerson.useMutation({
    onSuccess: async () => {
      toast.success("Pessoa integrada à Célula.");
      setSelectedCandidateId("");
      await Promise.all([cellMembers.refetch(), assignmentCandidates.refetch(), memberCounts.refetch(), refetch()]);
    },
    onError: (error) => toast.error(error.message || "Não foi possível integrar a Pessoa à Célula."),
  });
  const recordMeeting = trpc.cells.recordMeeting.useMutation({
    onSuccess: async () => {
      toast.success("Encontro e presença registrados com sucesso.");
      setAttendanceOpen(false);
      await meetingHistory.refetch();
    },
    onError: (error) => toast.error(error.message || "Não foi possível registrar o encontro."),
  });
  const createReferral = trpc.consolidation.createReferral.useMutation({
    onSuccess: async () => {
      toast.success("Discípulo encaminhado para a fila de Consolidação.");
      setMemberReferralReason("");
      setSelectedMember(null);
      await utils.consolidation.referrals.invalidate({ churchId });
    },
    onError: (error) => toast.error(error.message || "Não foi possível encaminhar o discípulo."),
  });

  const totalCellMembers = (memberCounts.data ?? []).reduce((total, item) => total + Number(item.count), 0);
  const membersInSelectedCell = cellMembers.data ?? [];
  const presentCount = membersInSelectedCell.filter((item) => presentByPersonId[item.person.id]).length;
  const latestMeeting = meetingHistory.data?.[0];
  const roles = Array.from(new Set([user?.role, ...(effectiveRoles.data ?? [])].filter(Boolean)));
  const canPublishCells = roles.some((role) => role === "pastor_presidente" || role === "pastor_local");
  const canCreateCell = Boolean(managementAccess.data?.canCreateAny || managementAccess.data?.canCreateOwn);
  const pageTitle = canPublishCells ? "Células" : "Minhas Células";
  const pageSubtitle = canPublishCells ? "Organize as Células e direcione cada Pessoa para a sua equipe." : "Consulte as Células do seu escopo e cuide da sua equipe.";
  const mappedCells = (cells ?? []).flatMap((cell) => {
    const latitude = Number(cell.latitude);
    const longitude = Number(cell.longitude);
    return Number.isFinite(latitude) && Number.isFinite(longitude)
      ? [{ id: cell.id, title: cell.name, latitude, longitude }]
      : [];
  });

  async function lookupCep(value: string) {
    const cep = value.replace(/\D/g, "");
    const requestId = ++cepLookupSequence.current;
    setCepError("");
    if (!cep) {
      setCepStatus("idle");
      return;
    }
    if (cep.length !== 8) {
      setCepStatus("idle");
      setCepError("Digite um CEP válido com 8 números ou preencha o endereço manualmente.");
      return;
    }
    setCepStatus("loading");
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("CEP lookup failed");
      const data = await response.json() as ViaCepResponse;
      if (requestId !== cepLookupSequence.current) return;
      if (data.erro) {
        setCepStatus("not-found");
        setCepError("CEP não encontrado. Confira os números ou preencha o endereço manualmente.");
        return;
      }
      setForm((current) => ({
        ...current,
        zipCode: formatCep(data.cep ?? cep),
        address: data.logradouro || current.address,
        addressComplement: data.complemento || current.addressComplement,
        neighborhood: data.bairro || current.neighborhood,
        city: data.localidade || current.city,
        state: data.uf?.toUpperCase() || current.state,
      }));
      setCepStatus("found");
    } catch {
      if (requestId !== cepLookupSequence.current) return;
      setCepStatus("idle");
      setCepError("Não foi possível consultar o CEP agora. Você pode preencher o endereço manualmente.");
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.leaderId) {
      toast.error("Selecione uma Pessoa como líder da célula.");
      return;
    }
    const normalizedCep = form.zipCode.replace(/\D/g, "");
    if (normalizedCep && normalizedCep.length !== 8) {
      toast.error("Informe um CEP completo ou deixe o campo em branco para preencher o endereço manualmente.");
      return;
    }
    const normalizedAddress = [
      form.address.trim(),
      form.addressNumber.trim() ? `Nº ${form.addressNumber.trim()}` : "",
      form.addressComplement.trim(),
    ].filter(Boolean).join(", ");
    createCell.mutate({
      churchId,
      ...form,
      address: normalizedAddress || undefined,
      addressNumber: form.addressNumber.trim() || undefined,
      addressComplement: form.addressComplement.trim() || undefined,
      zipCode: normalizedCep || undefined,
      city: form.city.trim() || undefined,
      state: form.state.trim().toUpperCase() || undefined,
      neighborhood: form.neighborhood.trim() || undefined,
      leaderId: Number(form.leaderId),
      coLeaderId: form.coLeaderId ? Number(form.coLeaderId) : null,
      supervisorId: form.supervisorId ? Number(form.supervisorId) : null,
    });
  }

  function openCell(cell: any) {
    setSelectedCell(cell);
    setLeadershipForm({
      leaderId: cell.leaderId ? String(cell.leaderId) : "",
      coLeaderId: cell.coLeaderId ? String(cell.coLeaderId) : "",
      supervisorId: cell.supervisorId ? String(cell.supervisorId) : "",
    });
  }

  function saveLeadership() {
    if (!selectedCell || !leadershipForm.leaderId) {
      toast.error("Selecione o líder da Célula.");
      return;
    }
    updateLeadership.mutate({
      churchId,
      cellId: selectedCell.id,
      leaderId: Number(leadershipForm.leaderId),
      coLeaderId: leadershipForm.coLeaderId ? Number(leadershipForm.coLeaderId) : null,
      supervisorId: leadershipForm.supervisorId ? Number(leadershipForm.supervisorId) : null,
    });
  }

  function openAttendanceDialog() {
    const initialPresence = Object.fromEntries(membersInSelectedCell.map((item) => [item.person.id, false]));
    setMeetingDate(getTodayInputValue());
    setMeetingTopic("");
    setMeetingNotes("");
    setPresentByPersonId(initialPresence);
    setAttendanceOpen(true);
  }

  function submitMeeting(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedCell) return;
    if (membersInSelectedCell.length === 0) {
      toast.error("Vincule Pessoas à Célula antes de registrar a presença.");
      return;
    }
    recordMeeting.mutate({
      churchId,
      cellId: selectedCell.id,
      meetingDate,
      topic: meetingTopic.trim() || undefined,
      notes: meetingNotes.trim() || undefined,
      attendance: membersInSelectedCell.map((item) => ({
        personId: item.person.id,
        status: presentByPersonId[item.person.id] ? "presente" as const : "ausente" as const,
      })),
    });
  }

  function submitMemberReferral() {
    if (!selectedMember || memberReferralReason.trim().length < 3) {
      toast.error("Informe o motivo do encaminhamento para Consolidação.");
      return;
    }
    createReferral.mutate({
      churchId,
      personId: selectedMember.person.id,
      reason: memberReferralReason.trim(),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-navy">{pageTitle}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {pageSubtitle}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ReportButton
            label="Exportar"
            onFetch={() => utils.reports.cells.fetch({ churchId })}
          />
          {canCreateCell && <Button onClick={() => {
            if (!managementAccess.data?.canCreateAny && managementAccess.data?.actorPersonId) {
              setForm({ ...defaultForm, leaderId: String(managementAccess.data.actorPersonId) });
            }
            setOpen(true);
          }} className="bg-navy hover:bg-navy-light text-white gap-2">
            <Plus className="w-4 h-4" />
            Nova Célula
          </Button>}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="metric-card">
          <Globe className="w-5 h-5 text-indigo-600" />
          <p className="text-2xl font-bold font-display text-navy">{(cells ?? []).length}</p>
          <p className="text-sm text-muted-foreground">Células em funcionamento</p>
        </div>
        <div className="metric-card">
          <MapPin className="w-5 h-5 text-gold" />
          <p className="text-2xl font-bold font-display text-navy">
            {(cells ?? []).filter((c) => c.latitude).length}
          </p>
          <p className="text-sm text-muted-foreground">Com Localização</p>
        </div>
        <div className="metric-card">
          <Users className="w-5 h-5 text-green-600" />
          <p className="text-2xl font-bold font-display text-navy">{memberCounts.isLoading ? "—" : totalCellMembers}</p>
          <p className="text-sm text-muted-foreground">Pessoas nas Células</p>
        </div>
      </div>

      {/* Tabs: Lista / Mapa */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="lista">Lista</TabsTrigger>
          <TabsTrigger value="mapa">Mapa</TabsTrigger>
        </TabsList>

        <TabsContent value="lista" className="mt-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (cells ?? []).length === 0 ? (
            <div className="card-sacred flex flex-col items-center gap-3 p-10 text-center sm:p-12">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-indigo-50">
                <Globe className="h-7 w-7 text-indigo-600" />
              </div>
              <p className="font-semibold text-navy">{canPublishCells ? "Nenhuma Célula cadastrada" : "Nenhuma Célula no seu escopo"}</p>
              <p className="max-w-sm text-sm text-muted-foreground">{canPublishCells ? "Crie a primeira Célula para começar a direcionar Pessoas e organizar encontros." : "Quando o Pastor direcionar você para uma Célula, ela aparecerá aqui."}</p>
              {canPublishCells && <Button type="button" className="bg-navy text-white hover:bg-navy-light" onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Criar primeira Célula</Button>}
            </div>
          ) : (
            <div className="space-y-3 animate-stagger">
              {(cells ?? []).map((cell) => (
                <button
                  key={cell.id}
                  type="button"
                  onClick={() => openCell(cell)}
                  className="card-sacred flex w-full items-center gap-4 p-4 text-left transition-colors hover:border-gold/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/70"
                  aria-label={`Abrir membros da célula ${cell.name}`}
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                    <Globe className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-navy">{cell.name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      {cell.neighborhood && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {cell.neighborhood}, {cell.city}
                        </span>
                      )}
                      {cell.meetingDay && (
                        <span className="text-xs text-gold font-medium">
                          {DAYS.find((d) => d.value === cell.meetingDay)?.label} {cell.meetingTime}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                    {cell.publicVisible && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
                        <Eye className="h-3 w-3" /> Pública
                      </span>
                    )}
                    {cell.latitude && (
                      <span className="rounded-full border border-green-200 bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">
                        No mapa
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="mapa" className="mt-4">
          <div className="card-sacred p-4">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-gold" />
              <p className="text-sm font-semibold text-navy">Mapa de Células</p>
              <span className="text-xs text-muted-foreground ml-auto">
                {(cells ?? []).filter((c) => c.latitude).length} células mapeadas
              </span>
            </div>
            <OpenStreetMap
              className="h-[450px]"
              markers={mappedCells}
              selectedId={selectedCell?.id ?? null}
              initialZoom={5}
              onSelect={(id) => setSelectedCell((cells ?? []).find((cell) => cell.id === id) ?? null)}
              ariaLabel="Mapa administrativo das células"
            />
            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full bg-gold border-2 border-navy" />
                <span>Célula ativa</span>
              </div>
              <p className="ml-auto">Clique nos marcadores para ver detalhes</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(selectedCell)} onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setSelectedCell(null);
          setSelectedMember(null);
          setSelectedCandidateId("");
          setAttendanceOpen(false);
          setPublicSettingsOpen(false);
        }
      }}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-navy"><Globe className="h-5 w-5 text-indigo-600" />{selectedCell?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {canPublishCells && (
              <section className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
                <p className="text-sm font-semibold text-navy">Responsáveis da Célula</p>
                <p className="mt-1 text-xs text-muted-foreground">Somente o Pastor nomeia ou remove líder, co-líder e supervisor.</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <Select value={leadershipForm.leaderId} onValueChange={(value) => setLeadershipForm((current) => ({ ...current, leaderId: value }))}>
                    <SelectTrigger><SelectValue placeholder="Líder" /></SelectTrigger>
                    <SelectContent>{(people ?? []).map((person) => <SelectItem key={person.id} value={String(person.id)}>{person.fullName}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={leadershipForm.coLeaderId || "none"} onValueChange={(value) => setLeadershipForm((current) => ({ ...current, coLeaderId: value === "none" ? "" : value }))}>
                    <SelectTrigger><SelectValue placeholder="Co-líder" /></SelectTrigger>
                    <SelectContent><SelectItem value="none">Sem co-líder</SelectItem>{(people ?? []).map((person) => <SelectItem key={person.id} value={String(person.id)}>{person.fullName}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={leadershipForm.supervisorId || "none"} onValueChange={(value) => setLeadershipForm((current) => ({ ...current, supervisorId: value === "none" ? "" : value }))}>
                    <SelectTrigger><SelectValue placeholder="Supervisor" /></SelectTrigger>
                    <SelectContent><SelectItem value="none">Sem supervisor</SelectItem>{(people ?? []).map((person) => <SelectItem key={person.id} value={String(person.id)}>{person.fullName}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Button type="button" size="sm" className="mt-3 bg-navy text-white hover:bg-navy-light" onClick={saveLeadership} disabled={updateLeadership.isPending}>
                  {updateLeadership.isPending ? "Salvando…" : "Salvar liderança"}
                </Button>
              </section>
            )}
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 text-sm text-muted-foreground">
              <p>{selectedCell?.meetingDay ? `${DAYS.find((day) => day.value === selectedCell.meetingDay)?.label} às ${selectedCell.meetingTime ?? "—"}` : "Horário ainda não definido"}</p>
              {selectedCell?.neighborhood && <p className="mt-1">{selectedCell.neighborhood}{selectedCell.city ? ` · ${selectedCell.city}` : ""}</p>}
            </div>
            {canPublishCells && (
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-semibold text-navy"><Eye className="h-4 w-4 text-indigo-600" />Página pública</p>
                    <p className="mt-1 text-xs text-muted-foreground">{selectedCell?.publicVisible ? "Esta Célula está publicada em Visite-nos." : "Esta Célula permanece privada."}</p>
                  </div>
                  <Button type="button" size="sm" variant="outline" onClick={() => setPublicSettingsOpen(true)}>
                    <Settings2 className="mr-1.5 h-4 w-4" />Configurar
                  </Button>
                </div>
              </div>
            )}
            <div className="rounded-xl border border-gold/30 bg-gold/5 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold"><CalendarCheck2 className="h-4 w-4" /></div>
                  <div>
                    <p className="text-sm font-semibold text-navy">Rotina da Célula</p>
                    {meetingHistory.isLoading ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">Carregando histórico…</p>
                    ) : latestMeeting ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">Último encontro em {formatMeetingDate(latestMeeting.meeting.meetingDate)} · {Number(latestMeeting.present)} presentes e {Number(latestMeeting.absent)} ausentes</p>
                    ) : (
                      <p className="mt-0.5 text-xs text-muted-foreground">Nenhum encontro registrado ainda.</p>
                    )}
                  </div>
                </div>
                {meetingAccess.data?.canRecord && (
                  <Button type="button" size="sm" onClick={openAttendanceDialog} disabled={cellMembers.isLoading || membersInSelectedCell.length === 0} className="bg-navy text-white hover:bg-navy-light">
                    <CheckCircle2 className="mr-1.5 h-4 w-4" />
                    Registrar encontro
                  </Button>
                )}
              </div>
              {!meetingAccess.isLoading && !meetingAccess.data?.canRecord && (
                <p className="mt-3 text-xs text-muted-foreground">O registro é liberado para o líder, supervisor ou pastor responsável pela Célula.</p>
              )}
            </div>
            {selectedCell?.canManage && <div className="rounded-xl border border-indigo-200 bg-indigo-50/35 p-4">
              <p className="text-sm font-semibold text-navy">Adicionar pessoa à equipe</p>
              <p className="mt-1 text-xs text-muted-foreground">Escolha uma Pessoa ainda sem Célula. Transferências entre Células continuam sob responsabilidade pastoral.</p>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Select value={selectedCandidateId} onValueChange={setSelectedCandidateId}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder={assignmentCandidates.isLoading ? "Carregando…" : "Selecione uma Pessoa"} /></SelectTrigger>
                  <SelectContent>{(assignmentCandidates.data ?? []).map((person) => <SelectItem key={person.id} value={String(person.id)}>{person.fullName}</SelectItem>)}</SelectContent>
                </Select>
                <Button type="button" className="bg-navy text-white hover:bg-navy-light" disabled={!selectedCandidateId || assignPerson.isPending} onClick={() => assignPerson.mutate({ churchId, cellId: selectedCell.id, personId: Number(selectedCandidateId) })}>
                  {assignPerson.isPending ? "Integrando…" : "Adicionar"}
                </Button>
              </div>
              {!assignmentCandidates.isLoading && (assignmentCandidates.data ?? []).length === 0 && <p className="mt-2 text-xs text-muted-foreground">Não há Pessoas ativas sem Célula para adicionar.</p>}
            </div>}
            <div className="rounded-xl border border-border">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <span className="text-sm font-semibold text-navy">Pessoas na célula</span>
                <Badge variant="outline">{cellMembers.data?.length ?? 0}</Badge>
              </div>
              {cellMembers.isLoading ? (
                <div className="p-4 text-sm text-muted-foreground">Carregando Pessoas…</div>
              ) : (cellMembers.data ?? []).length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">Ainda não há Pessoas vinculadas a esta célula.</div>
              ) : (
                <div className="divide-y divide-border">
                  {(cellMembers.data ?? []).map((item) => (
                    <button key={item.membership.id} type="button" onClick={() => { setSelectedMember(item); setMemberReferralReason(""); }} className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-cream/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold/70">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cream-dark text-navy"><UserRound className="h-4 w-4" /></div>
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-navy">{item.person.fullName}</p><p className="text-xs text-muted-foreground">{item.person.phone || item.person.email || "Sem contato informado"}</p></div>
                      <span className="text-right text-[11px] text-muted-foreground">Cuidar<br />desde {new Date(item.membership.joinedAt).toLocaleDateString("pt-BR")}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {(meetingHistory.data ?? []).length > 1 && (
              <div className="rounded-xl border border-border">
                <div className="border-b border-border px-4 py-3 text-sm font-semibold text-navy">Histórico recente</div>
                <div className="divide-y divide-border">
                  {(meetingHistory.data ?? []).slice(1, 4).map((entry) => (
                    <div key={entry.meeting.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                      <span className="font-medium text-navy">{formatMeetingDate(entry.meeting.meetingDate)}</span>
                      <span className="text-xs text-muted-foreground">{Number(entry.present)} presentes · {Number(entry.absent)} ausentes</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CellPublicSettingsDialog
        churchId={churchId}
        cell={selectedCell}
        open={publicSettingsOpen}
        onOpenChange={setPublicSettingsOpen}
        onSaved={(saved) => setSelectedCell(saved)}
      />

      <Dialog open={Boolean(selectedMember)} onOpenChange={(nextOpen) => !nextOpen && setSelectedMember(null)}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-navy"><HeartHandshake className="h-5 w-5 text-rose-600" />Ficha de cuidado</DialogTitle>
          </DialogHeader>
          {selectedMember && (
            <div className="space-y-4">
              <section className="rounded-xl border border-border p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cream-dark text-navy"><UserRound className="h-5 w-5" /></div>
                  <div className="min-w-0">
                    <p className="font-semibold text-navy">{selectedMember.person.fullName}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Discípulo da Célula {selectedCell?.name}</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-2 text-sm">
                  <p className="flex items-center gap-2 text-muted-foreground"><Phone className="h-4 w-4 text-gold" />{selectedMember.person.phone || selectedMember.person.whatsapp || selectedMember.person.email || "Sem contato informado"}</p>
                  <p className="text-xs text-muted-foreground">Vinculado à Célula desde {new Date(selectedMember.membership.joinedAt).toLocaleDateString("pt-BR")}.</p>
                  {currentMemberCare.isLoading ? <p className="text-xs text-muted-foreground">Carregando responsável de cuidado…</p> : currentMemberCare.data ? <p className="text-xs text-muted-foreground">Responsável de cuidado definido: {currentMemberCare.data.role.replace(/_/g, " ")}.</p> : <p className="text-xs text-amber-800">Ainda não há responsável de cuidado definido.</p>}
                </div>
              </section>

              <section className="rounded-xl border border-rose-200 bg-rose-50/45 p-4">
                <h3 className="text-sm font-semibold text-navy">Enviar para Consolidação</h3>
                <p className="mt-1 text-xs text-muted-foreground">Encaminhe quando este discípulo precisa de resgate. O Consolidador verá seu nome, o motivo e assumirá o acompanhamento.</p>
                <div className="mt-3">
                  <Label htmlFor="member-referral-reason">Motivo *</Label>
                  <Textarea id="member-referral-reason" rows={3} className="mt-1 bg-background" value={memberReferralReason} onChange={(event) => setMemberReferralReason(event.target.value)} placeholder="Ex.: faltou às últimas reuniões e não atende às mensagens." />
                </div>
                {meetingAccess.data?.canRecord ? (
                  <Button type="button" className="mt-3 w-full bg-rose-600 text-white hover:bg-rose-700" disabled={createReferral.isPending || memberReferralReason.trim().length < 3} onClick={submitMemberReferral}>
                    <Send className="mr-2 h-4 w-4" />{createReferral.isPending ? "Enviando…" : "Enviar para Consolidação"}
                  </Button>
                ) : <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">Somente o Líder, Supervisor ou Pastor responsável por esta Célula pode encaminhar um discípulo.</p>}
              </section>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={attendanceOpen} onOpenChange={setAttendanceOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-navy"><CalendarCheck2 className="h-5 w-5 text-gold" />Registrar encontro</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitMeeting} className="space-y-4">
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 px-3 py-2 text-sm text-muted-foreground">
              <span className="font-medium text-navy">{selectedCell?.name}</span> · marque a presença de cada Pessoa vinculada.
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="cell-meeting-date">Data do encontro *</Label>
                <Input id="cell-meeting-date" type="date" value={meetingDate} onChange={(event) => setMeetingDate(event.target.value)} required />
              </div>
              <div>
                <Label htmlFor="cell-meeting-topic">Tema (opcional)</Label>
                <Input id="cell-meeting-topic" value={meetingTopic} onChange={(event) => setMeetingTopic(event.target.value)} placeholder="Ex.: Comunhão e oração" maxLength={255} />
              </div>
            </div>
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <Label>Presença</Label>
                <span className="text-xs font-medium text-gold">{presentCount} de {membersInSelectedCell.length} presentes</span>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setPresentByPersonId(Object.fromEntries(membersInSelectedCell.map((item) => [item.person.id, true])))} className="mb-2 w-full sm:w-auto">Marcar todos como presentes</Button>
              <div className="max-h-64 divide-y divide-border overflow-y-auto rounded-xl border border-border">
                {membersInSelectedCell.map((item) => {
                  const present = Boolean(presentByPersonId[item.person.id]);
                  return (
                    <label key={item.membership.id} className="flex cursor-pointer items-center gap-3 px-3 py-3 hover:bg-cream/50">
                      <Checkbox checked={present} onCheckedChange={(checked) => setPresentByPersonId((current) => ({ ...current, [item.person.id]: checked === true }))} />
                      <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-navy">{item.person.fullName}</span><span className="block text-xs text-muted-foreground">{present ? "Presente" : "Ausente"}</span></span>
                      <Badge variant={present ? "default" : "outline"} className={present ? "bg-green-600 hover:bg-green-600" : ""}>{present ? "Presente" : "Ausente"}</Badge>
                    </label>
                  );
                })}
              </div>
            </div>
            <div>
              <Label htmlFor="cell-meeting-notes">Observações (opcional)</Label>
              <Textarea id="cell-meeting-notes" value={meetingNotes} onChange={(event) => setMeetingNotes(event.target.value)} placeholder="Registre algo importante sobre o encontro, se necessário." maxLength={3000} className="min-h-20" />
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setAttendanceOpen(false)} disabled={recordMeeting.isPending}>Cancelar</Button>
              <Button type="submit" className="bg-navy text-white hover:bg-navy-light" disabled={recordMeeting.isPending || membersInSelectedCell.length === 0}>{recordMeeting.isPending ? "Registrando…" : "Salvar presença"}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-navy flex items-center gap-2">
              <Globe className="w-5 h-5 text-indigo-600" />
              Nova Célula
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nome da Célula *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="col-span-2">
                <Label htmlFor="cell-leader">Líder da Célula *</Label>
                <Select value={form.leaderId} onValueChange={(value) => setForm({ ...form, leaderId: value })}>
                  <SelectTrigger id="cell-leader"><SelectValue placeholder="Selecione uma Pessoa" /></SelectTrigger>
                  <SelectContent>{(people ?? []).map((person) => <SelectItem key={person.id} value={String(person.id)}>{person.fullName}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Co-líder</Label>
                <Select value={form.coLeaderId || "none"} onValueChange={(value) => setForm({ ...form, coLeaderId: value === "none" ? "" : value })}>
                  <SelectTrigger><SelectValue placeholder="Sem co-líder" /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Sem co-líder</SelectItem>{(people ?? []).map((person) => <SelectItem key={person.id} value={String(person.id)}>{person.fullName}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Supervisor</Label>
                <Select value={form.supervisorId || "none"} onValueChange={(value) => setForm({ ...form, supervisorId: value === "none" ? "" : value })}>
                  <SelectTrigger><SelectValue placeholder="Sem supervisor" /></SelectTrigger>
                  <SelectContent><SelectItem value="none">Sem supervisor</SelectItem>{(people ?? []).map((person) => <SelectItem key={person.id} value={String(person.id)}>{person.fullName}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="col-span-2 rounded-xl border border-gold/20 bg-gold/5 p-3">
                <p className="text-sm font-semibold text-navy">Endereço da reunião</p>
                <p className="mt-1 text-xs text-muted-foreground">Digite o CEP para preencher o endereço automaticamente. Se o local não tiver CEP, preencha os campos manualmente.</p>
              </div>
              <div className="col-span-2">
                <Label htmlFor="cell-zip-code">CEP</Label>
                <Input id="cell-zip-code" inputMode="numeric" autoComplete="postal-code" maxLength={9} value={form.zipCode} onChange={(e) => { const value = formatCep(e.target.value); setForm({ ...form, zipCode: value }); if (value.replace(/\D/g, "").length === 8) void lookupCep(value); }} onBlur={(e) => { void lookupCep(e.target.value); }} placeholder="00000-000" aria-busy={cepStatus === "loading"} />
                {cepStatus === "loading" && <p className="mt-1 text-xs text-muted-foreground" role="status">Consultando endereço...</p>}
                {cepStatus === "found" && <p className="mt-1 text-xs text-emerald-700" role="status">Endereço encontrado. Confira os dados e informe o número.</p>}
                {cepError && <p className="mt-1 text-xs text-amber-700" role="alert">{cepError}</p>}
              </div>
              <div className="col-span-2">
                <Label htmlFor="cell-address">Rua / logradouro</Label>
                <Input id="cell-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Rua, avenida ou estrada" />
              </div>
              <div>
                <Label htmlFor="cell-address-number">Número</Label>
                <Input id="cell-address-number" value={form.addressNumber} onChange={(e) => setForm({ ...form, addressNumber: e.target.value })} placeholder="Ex.: 123" maxLength={20} />
              </div>
              <div>
                <Label htmlFor="cell-address-complement">Complemento</Label>
                <Input id="cell-address-complement" value={form.addressComplement} onChange={(e) => setForm({ ...form, addressComplement: e.target.value })} placeholder="Casa, salão, fundos" maxLength={120} />
              </div>
              <div>
                <Label htmlFor="cell-neighborhood">Bairro</Label>
                <Input id="cell-neighborhood" value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="cell-city">Cidade</Label>
                <Input id="cell-city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="cell-state">Estado</Label>
                <Input id="cell-state" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase().slice(0, 2) })} placeholder="SP" maxLength={2} />
              </div>
              <div>
                <Label>Dia da Semana</Label>
                <Select value={form.meetingDay} onValueChange={(v) => setForm({ ...form, meetingDay: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DAYS.map((d) => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Horário</Label>
                <Input type="time" value={form.meetingTime} onChange={(e) => setForm({ ...form, meetingTime: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">Cancelar</Button>
              <Button type="submit" className="flex-1 bg-navy hover:bg-navy-light text-white" disabled={createCell.isPending}>
                {createCell.isPending ? "Salvando..." : "Criar Célula"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
