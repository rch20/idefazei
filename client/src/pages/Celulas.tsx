import { useChurch } from "@/components/ChurchLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { MapView } from "@/components/Map";
import { trpc } from "@/lib/trpc";
import { CalendarCheck2, CheckCircle2, Globe, MapPin, Plus, Users, UserRound } from "lucide-react";
import { ReportButton } from "@/components/ReportButton";
import { useState } from "react";
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
  address: "",
  city: "",
  neighborhood: "",
  meetingDay: "quarta" as const,
  meetingTime: "19:30",
};

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
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("lista");
  const [form, setForm] = useState(defaultForm);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [meetingDate, setMeetingDate] = useState(getTodayInputValue);
  const [meetingTopic, setMeetingTopic] = useState("");
  const [meetingNotes, setMeetingNotes] = useState("");
  const [presentByPersonId, setPresentByPersonId] = useState<Record<number, boolean>>({});
  const [mapReady, setMapReady] = useState(false);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);

  const { data: cells, isLoading, refetch } = trpc.cells.list.useQuery({ churchId });
  const { data: people } = trpc.people.list.useQuery({ churchId });
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
  const createCell = trpc.cells.create.useMutation({
    onSuccess: () => {
      toast.success("Célula criada com sucesso!");
      setOpen(false);
      setForm(defaultForm);
      refetch();
    },
    onError: () => toast.error("Erro ao criar célula"),
  });
  const recordMeeting = trpc.cells.recordMeeting.useMutation({
    onSuccess: async () => {
      toast.success("Encontro e presença registrados com sucesso.");
      setAttendanceOpen(false);
      await meetingHistory.refetch();
    },
    onError: (error) => toast.error(error.message || "Não foi possível registrar o encontro."),
  });

  const totalCellMembers = (memberCounts.data ?? []).reduce((total, item) => total + Number(item.count), 0);
  const membersInSelectedCell = cellMembers.data ?? [];
  const presentCount = membersInSelectedCell.filter((item) => presentByPersonId[item.person.id]).length;
  const latestMeeting = meetingHistory.data?.[0];

  function handleMapReady(map: google.maps.Map) {
    setMapReady(true);
    // Plot existing cells on map
    (cells ?? []).forEach((cell) => {
      if (cell.latitude && cell.longitude) {
        const marker = new google.maps.Marker({
          position: {
            lat: parseFloat(String(cell.latitude)),
            lng: parseFloat(String(cell.longitude)),
          },
          map,
          title: cell.name,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: "#c9a84c",
            fillOpacity: 0.9,
            strokeColor: "#1e3a5f",
            strokeWeight: 2,
          },
        });

        const infoWindow = new google.maps.InfoWindow({
          content: `
            <div style="font-family: Inter, sans-serif; padding: 4px;">
              <strong style="color: #1e3a5f;">${cell.name}</strong><br/>
              <span style="font-size: 12px; color: #666;">${cell.neighborhood ?? ""} · ${cell.city ?? ""}</span><br/>
              <span style="font-size: 12px; color: #c9a84c;">${DAYS.find(d => d.value === cell.meetingDay)?.label ?? ""} ${cell.meetingTime ?? ""}</span>
            </div>
          `,
        });

        marker.addListener("click", () => infoWindow.open(map, marker));
        setMarkers((prev) => [...prev, marker]);
      }
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.leaderId) {
      toast.error("Selecione uma Pessoa como líder da célula.");
      return;
    }
    createCell.mutate({ churchId, ...form, leaderId: Number(form.leaderId) });
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-navy">Células</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie os grupos de célula da sua igreja
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ReportButton
            label="Exportar"
            onFetch={() => utils.reports.cells.fetch({ churchId })}
          />
          <Button onClick={() => setOpen(true)} className="bg-navy hover:bg-navy-light text-white gap-2">
            <Plus className="w-4 h-4" />
            Nova Célula
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="metric-card">
          <Globe className="w-5 h-5 text-indigo-600" />
          <p className="text-2xl font-bold font-display text-navy">{(cells ?? []).length}</p>
          <p className="text-sm text-muted-foreground">Células Ativas</p>
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
          <p className="text-sm text-muted-foreground">Membros em Células</p>
        </div>
      </div>

      {/* Tabs: Lista / Mapa */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="lista">Lista</TabsTrigger>
          <TabsTrigger value="mapa">Mapa Geográfico</TabsTrigger>
        </TabsList>

        <TabsContent value="lista" className="mt-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (cells ?? []).length === 0 ? (
            <div className="card-sacred p-12 flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-full bg-indigo-50 flex items-center justify-center">
                <Globe className="w-7 h-7 text-indigo-600" />
              </div>
              <p className="font-semibold text-navy">Nenhuma célula cadastrada</p>
              <p className="text-sm text-muted-foreground">Crie a primeira célula da sua igreja</p>
            </div>
          ) : (
            <div className="space-y-3 animate-stagger">
              {(cells ?? []).map((cell) => (
                <button
                  key={cell.id}
                  type="button"
                  onClick={() => setSelectedCell(cell)}
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
                  {cell.latitude && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200 font-medium">
                      No mapa
                    </span>
                  )}
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
            <div className="rounded-xl overflow-hidden" style={{ height: "450px" }}>
              <MapView
                onMapReady={handleMapReady}
                initialCenter={{ lat: -15.7801, lng: -47.9292 }}
                initialZoom={5}
              />
            </div>
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
          setAttendanceOpen(false);
        }
      }}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-navy"><Globe className="h-5 w-5 text-indigo-600" />{selectedCell?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 text-sm text-muted-foreground">
              <p>{selectedCell?.meetingDay ? `${DAYS.find((day) => day.value === selectedCell.meetingDay)?.label} às ${selectedCell.meetingTime ?? "—"}` : "Horário ainda não definido"}</p>
              {selectedCell?.neighborhood && <p className="mt-1">{selectedCell.neighborhood}{selectedCell.city ? ` · ${selectedCell.city}` : ""}</p>}
            </div>
            <div className="rounded-xl border border-gold/30 bg-gold/5 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold/15 text-gold"><CalendarCheck2 className="h-4 w-4" /></div>
                  <div>
                    <p className="text-sm font-semibold text-navy">Encontros e presença</p>
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
                    <div key={item.membership.id} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cream-dark text-navy"><UserRound className="h-4 w-4" /></div>
                      <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-navy">{item.person.fullName}</p><p className="text-xs text-muted-foreground">{item.person.phone || item.person.email || "Sem contato informado"}</p></div>
                      <span className="text-[11px] text-muted-foreground">desde {new Date(item.membership.joinedAt).toLocaleDateString("pt-BR")}</span>
                    </div>
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
              <div className="col-span-2">
                <Label>Endereço</Label>
                <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Rua, número" />
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
