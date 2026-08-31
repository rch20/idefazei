import { useChurch } from "@/components/ChurchLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { BarChart3, CalendarDays, CheckCircle2, ClipboardCheck, Copy, ExternalLink, Link2, Loader2, MapPin, Plus, Printer, QrCode, Send, UserCheck, UserRound, UserX, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

type RegistrationMode = "none" | "individual" | "casal";
type PresenceStatus = "pendente" | "presente" | "ausente" | "cancelado";

type EventRecord = {
  id: number;
  churchId: number;
  name: string;
  type: string;
  description: string | null;
  startDate: Date | string;
  endDate: Date | string | null;
  location: string | null;
  maxCapacity: number | null;
  registrationMode: RegistrationMode;
  registrationToken: string | null;
  qrCode: string | null;
};

const EVENT_TYPES = [
  { value: "congresso", label: "Congresso" },
  { value: "conferencia", label: "Conferência" },
  { value: "vigilia", label: "Vigília" },
  { value: "retiro", label: "Retiro" },
  { value: "seminario", label: "Seminário" },
  { value: "culto", label: "Culto" },
  { value: "outro", label: "Outro" },
];

const REGISTRATION_MODES: Array<{ value: RegistrationMode; label: string; description: string }> = [
  { value: "none", label: "Sem inscrição online", description: "Use apenas a agenda e o controle interno." },
  { value: "individual", label: "Inscrição individual", description: "Cada ficha representa uma pessoa." },
  { value: "casal", label: "Inscrição de casal", description: "Cada ficha representa duas pessoas." },
];

const TYPE_COLORS: Record<string, string> = {
  congresso: "bg-purple-50 text-purple-700 border-purple-200",
  conferencia: "bg-blue-50 text-blue-700 border-blue-200",
  vigilia: "bg-indigo-50 text-indigo-700 border-indigo-200",
  retiro: "bg-green-50 text-green-700 border-green-200",
  seminario: "bg-amber-50 text-amber-700 border-amber-200",
  culto: "bg-rose-50 text-rose-700 border-rose-200",
  outro: "bg-gray-50 text-gray-700 border-gray-200",
};

const defaultForm = {
  name: "",
  type: "culto" as const,
  description: "",
  startDate: new Date().toISOString().split("T")[0],
  endDate: "",
  location: "",
  maxCapacity: "",
  registrationMode: "none" as RegistrationMode,
};

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);

function registrationModeLabel(mode: RegistrationMode | null | undefined) {
  return REGISTRATION_MODES.find((item) => item.value === (mode ?? "none"))?.label ?? "Sem inscrição online";
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "";
  return new Date(value).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }).replace(" de ", " ");
}

function publicEventUrl(slug: string | null | undefined, token: string) {
  if (typeof window === "undefined") return `/evento/inscricao/${token}`;
  const hostname = window.location.hostname;
  const port = window.location.port ? `:${window.location.port}` : "";
  const tenantAlreadyInHost = Boolean(slug && (hostname === `${slug}.idefazei.com.br` || hostname === `${slug}.localhost`));
  const origin = slug && !tenantAlreadyInHost
    ? hostname.endsWith(".localhost") || hostname === "localhost"
      ? `${window.location.protocol}//${slug}.localhost${port}`
      : `https://${slug}.idefazei.com.br`
    : window.location.origin;
  return `${origin}/evento/inscricao/${token}`;
}

export default function Eventos() {
  const { churchId, churchSlug } = useChurch();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);

  const { data: events, isLoading, refetch } = trpc.events.list.useQuery({ churchId });
  const createEvent = trpc.events.create.useMutation({
    onSuccess: () => {
      toast.success("Evento criado com sucesso!");
      setOpen(false);
      setForm(defaultForm);
      refetch();
    },
    onError: (error) => toast.error(error.message || "Erro ao criar evento"),
  });

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    createEvent.mutate({
      churchId,
      name: form.name.trim(),
      type: form.type,
      description: form.description.trim() || undefined,
      startDate: form.startDate,
      endDate: form.endDate || undefined,
      location: form.location.trim() || undefined,
      maxCapacity: form.maxCapacity ? Number(form.maxCapacity) : undefined,
      registrationMode: form.registrationMode,
    });
  }

  const upcoming = (events ?? []).filter((event) => new Date(event.startDate) >= new Date());
  const past = (events ?? []).filter((event) => new Date(event.startDate) < new Date());

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-navy">Eventos</h1>
          <p className="text-sm text-muted-foreground mt-1">Gerencie eventos, inscrições e presença em um só lugar.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="w-full bg-navy hover:bg-navy-light text-white gap-2 sm:w-auto">
          <Plus className="w-4 h-4" /> Novo Evento
        </Button>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-sm text-blue-950">
        <p className="font-semibold">Como funciona</p>
        <p className="mt-1 text-blue-900/75">Crie o evento, escolha se a inscrição será individual ou de casal e compartilhe o link. O Mural pode divulgar esse mesmo link; inscrições e presença ficam nesta aba.</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Próximos Eventos</h2>
              <div className="space-y-3 animate-stagger">{upcoming.map((event) => <EventCard key={event.id} event={event as EventRecord} churchSlug={churchSlug} onChanged={refetch} />)}</div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Eventos Passados</h2>
              <div className="space-y-3 opacity-80">{past.slice(0, 5).map((event) => <EventCard key={event.id} event={event as EventRecord} churchSlug={churchSlug} onChanged={refetch} />)}</div>
            </div>
          )}
          {(events ?? []).length === 0 && (
            <div className="card-sacred p-12 flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center"><CalendarDays className="w-7 h-7 text-amber-500" /></div>
              <p className="font-semibold text-navy">Nenhum evento cadastrado</p>
              <p className="text-sm text-muted-foreground">Crie o primeiro evento da sua igreja</p>
            </div>
          )}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[92dvh] max-w-lg overflow-hidden p-0">
          <DialogHeader className="border-b border-border px-6 py-5"><DialogTitle className="font-display text-navy flex items-center gap-2"><CalendarDays className="w-5 h-5 text-amber-500" />Novo Evento</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="max-h-[calc(92dvh-5rem)] space-y-4 overflow-y-auto px-6 py-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2"><Label>Nome do Evento *</Label><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required maxLength={255} /></div>
              <div className="sm:col-span-2"><Label>Tipo *</Label><Select value={form.type} onValueChange={(value) => setForm({ ...form, type: value as typeof form.type })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{EVENT_TYPES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Data de início *</Label><Input type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} required /></div>
              <div><Label>Data de fim</Label><Input type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} /></div>
              <div className="sm:col-span-2"><Label>Local</Label><Input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="Endereço ou nome do local" maxLength={500} /></div>
              <div><Label>Capacidade máxima</Label><Input type="number" min={1} value={form.maxCapacity} onChange={(event) => setForm({ ...form, maxCapacity: event.target.value })} placeholder="Ex.: 100" /></div>
              <div className="sm:col-span-2"><Label>Inscrições</Label><Select value={form.registrationMode} onValueChange={(value) => setForm({ ...form, registrationMode: value as RegistrationMode })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{REGISTRATION_MODES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select><p className="mt-1 text-xs text-muted-foreground">{REGISTRATION_MODES.find((item) => item.value === form.registrationMode)?.description}</p></div>
              <div className="sm:col-span-2"><Label>Descrição</Label><Textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} maxLength={4000} /></div>
            </div>
            <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row"><Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">Cancelar</Button><Button type="submit" className="flex-1 bg-navy hover:bg-navy-light text-white" disabled={createEvent.isPending}>{createEvent.isPending ? "Salvando..." : "Criar Evento"}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EventCard({ event, churchSlug, onChanged }: { event: EventRecord; churchSlug?: string | null; onChanged: () => void }) {
  const { churchId } = useChurch();
  const typeLabel = EVENT_TYPES.find((item) => item.value === event.type)?.label ?? event.type;
  const colorClass = TYPE_COLORS[event.type] ?? TYPE_COLORS.outro;
  const [qrOpen, setQrOpen] = useState(false);
  const [managementOpen, setManagementOpen] = useState(false);
  const [qrValue, setQrValue] = useState<string | null>(event.qrCode ?? null);
  const [modeDraft, setModeDraft] = useState<RegistrationMode>(event.registrationMode ?? "none");
  const registrationUrl = event.registrationToken ? publicEventUrl(churchSlug, event.registrationToken) : null;
  const attendanceReport = trpc.events.attendanceReport.useQuery({ churchId, eventId: event.id }, { enabled: managementOpen });

  const generateQr = trpc.events.generateQrCode.useMutation({
    onSuccess: (data) => { setQrValue(data.qrCode); setQrOpen(true); toast.success("QR Code de check-in gerado!"); },
    onError: (error) => toast.error(error.message || "Erro ao gerar QR Code"),
  });
  const setRegistrationMode = trpc.events.setRegistrationMode.useMutation({
    onSuccess: (updatedEvent) => { toast.success(updatedEvent.registrationMode === "none" ? "Inscrições online pausadas." : "Link de inscrição atualizado."); onChanged(); },
    onError: (error) => toast.error(error.message || "Não foi possível atualizar a inscrição"),
  });
  const setPresence = trpc.events.setPresence.useMutation({
    onSuccess: async () => { await attendanceReport.refetch(); toast.success("Presença atualizada."); },
    onError: (error) => toast.error(error.message || "Não foi possível atualizar a presença"),
  });

  const checkinUrl = qrValue ? `${window.location.origin}/checkin?event=${event.id}&token=${qrValue.split(":")[2]}` : null;
  const typeHasRegistration = event.registrationMode !== "none";

  async function copyRegistrationLink() {
    if (!registrationUrl) return;
    try { await navigator.clipboard.writeText(registrationUrl); toast.success("Link de inscrição copiado."); }
    catch { window.prompt("Copie o link de inscrição:", registrationUrl); }
  }

  function shareWhatsApp() {
    if (!registrationUrl) return;
    const message = `Olá! Faça sua inscrição para o evento ${event.name}:\n\n${registrationUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  function saveRegistrationMode(mode: RegistrationMode = modeDraft) {
    setRegistrationMode.mutate({ churchId, eventId: event.id, registrationMode: mode });
  }

  function printAttendanceReport() {
    const report = attendanceReport.data;
    if (!report) return;
    const rows = report.registrations.map((registration: any) => `<tr><td>${escapeHtml(registration.displayName)}</td><td>${escapeHtml(registration.companionName ?? "—")}</td><td>${registration.attendance === "presente" ? "Presente" : registration.attendance === "ausente" ? "Não compareceu" : "Pendente"}</td><td>${registration.participantPhone ? escapeHtml(registration.participantPhone) : "—"}</td></tr>`).join("");
    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!printWindow) { toast.error("Permita pop-ups para imprimir o relatório."); return; }
    printWindow.document.write(`<!doctype html><html><head><title>Presença — ${escapeHtml(report.event.name)}</title><style>body{font-family:Arial,sans-serif;color:#1e3a5f;padding:32px}h1{margin:0 0 4px}p{color:#556274}.metrics{display:flex;gap:12px;margin:24px 0}.metric{border:1px solid #ded4bd;border-radius:8px;padding:12px;min-width:120px}.metric strong{font-size:24px;display:block}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{padding:10px;border-bottom:1px solid #e4e4e7;text-align:left}th{color:#7b6323;font-size:12px;text-transform:uppercase}</style></head><body><h1>${escapeHtml(report.event.name)}</h1><p>${formatDate(report.event.startDate)}${report.event.location ? ` · ${escapeHtml(report.event.location)}` : ""}</p><div class="metrics"><div class="metric"><span>Inscritos</span><strong>${report.summary.registeredCount}</strong></div><div class="metric"><span>Pessoas</span><strong>${report.summary.attendeeCount}</strong></div><div class="metric"><span>Presentes</span><strong>${report.summary.checkedInAttendeeCount}</strong></div><div class="metric"><span>Faltas</span><strong>${report.summary.absentAttendeeCount}</strong></div></div><table><thead><tr><th>Inscrição</th><th>Acompanhante</th><th>Situação</th><th>Telefone</th></tr></thead><tbody>${rows || "<tr><td colspan='4'>Sem inscrições registradas.</td></tr>"}</tbody></table></body></html>`);
    printWindow.document.close(); printWindow.focus(); printWindow.print();
  }

  return <>
    <div className="card-sacred p-4 flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="w-14 h-14 rounded-xl bg-cream-dark flex flex-col items-center justify-center flex-shrink-0 text-center"><span className="text-lg font-bold font-display text-navy leading-none">{new Date(event.startDate).getDate()}</span><span className="text-[10px] text-muted-foreground uppercase tracking-wide">{new Date(event.startDate).toLocaleString("pt-BR", { month: "short" })}</span></div>
      <div className="flex-1 min-w-0"><p className="font-semibold text-navy truncate">{event.name}</p><div className="flex flex-wrap items-center gap-2 mt-1">{event.location && <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{event.location}</span>}{event.maxCapacity && <span className="text-xs text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3" />{event.maxCapacity} vagas</span>}</div><div className="mt-2 flex flex-wrap items-center gap-2"><span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${colorClass}`}>{typeLabel}</span>{typeHasRegistration && <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"><Link2 className="h-3 w-3" />{registrationModeLabel(event.registrationMode)}</span>}</div></div>
      <div className="flex flex-wrap items-center gap-2 shrink-0 sm:justify-end">
        <Button size="sm" variant="outline" className="h-8 px-2 border-[#1e3a5f]/20 text-[#1e3a5f] hover:bg-[#1e3a5f]/5" onClick={() => setManagementOpen(true)} title="Gerenciar inscrições e presença"><ClipboardCheck className="w-4 h-4" /><span className="ml-1 hidden sm:inline">Gerenciar</span></Button>
        <Button size="sm" variant="outline" className="h-8 px-2 border-[#1e3a5f]/20 text-[#1e3a5f] hover:bg-[#1e3a5f]/5" onClick={() => { if (qrValue) setQrOpen(true); else generateQr.mutate({ eventId: event.id, churchId }); }} disabled={generateQr.isPending} title="QR Code de check-in"><QrCode className="w-4 h-4" /></Button>
      </div>
    </div>

    <Dialog open={managementOpen} onOpenChange={setManagementOpen}>
      <DialogContent className="max-h-[92dvh] max-w-3xl overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-6 py-5"><DialogTitle className="font-display text-[#1e3a5f] flex items-center gap-2"><ClipboardCheck className="w-5 h-5 text-[#c9a84c]" />Gestão — {event.name}</DialogTitle><DialogDescription>Inscrições, presença e relatório deste evento. O Mural apenas divulga o link.</DialogDescription></DialogHeader>
        <div className="max-h-[calc(92dvh-7rem)] space-y-5 overflow-y-auto px-6 py-5">
          <section className="rounded-2xl border border-[#1e3a5f]/10 bg-[#f5f0e8]/45 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-semibold text-[#1e3a5f]">Inscrição pública</p><p className="mt-1 text-xs text-muted-foreground">{typeHasRegistration ? `${registrationModeLabel(event.registrationMode)} ativa para este evento.` : "Ative um formulário simples para receber inscrições sem login."}</p></div>{registrationUrl && <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">Recebendo inscrições</span>}</div>
            {registrationUrl ? <><div className="mt-3 flex items-start gap-2 rounded-xl border bg-white p-3"><Link2 className="mt-0.5 h-4 w-4 shrink-0 text-[#c9a84c]" /><p className="break-all font-mono text-xs text-[#1e3a5f]">{registrationUrl}</p></div><div className="mt-3 flex flex-col gap-2 sm:flex-row"><Button variant="outline" className="flex-1 gap-2" onClick={() => void copyRegistrationLink()}><Copy className="h-4 w-4" /> Copiar link</Button><Button variant="outline" className="flex-1 gap-2" onClick={shareWhatsApp}><Send className="h-4 w-4" /> WhatsApp</Button><a href={registrationUrl} target="_blank" rel="noreferrer" className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"><ExternalLink className="h-4 w-4" /> Abrir página</a></div></> : <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end"><div className="flex-1"><Label>Modelo de inscrição</Label><Select value={modeDraft} onValueChange={(value) => setModeDraft(value as RegistrationMode)}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{REGISTRATION_MODES.filter((item) => item.value !== "none").map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select></div><Button className="gap-2 bg-[#1e3a5f] text-white hover:bg-[#1e3a5f]/90" onClick={() => saveRegistrationMode()} disabled={setRegistrationMode.isPending}><Link2 className="h-4 w-4" />{setRegistrationMode.isPending ? "Criando..." : "Criar link"}</Button></div>}
            {registrationUrl && <div className="mt-3 flex flex-col gap-2 border-t border-[#1e3a5f]/10 pt-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-muted-foreground">Trocar o modelo renova o link atual e o endereço antigo deixa de funcionar.</p><Button variant="ghost" size="sm" className="justify-start text-amber-700 hover:bg-amber-50 hover:text-amber-800 sm:justify-center" onClick={() => { setModeDraft("none"); saveRegistrationMode("none"); }} disabled={setRegistrationMode.isPending}>Pausar inscrições</Button></div>}
          </section>

          {attendanceReport.isLoading ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-20 animate-pulse rounded-xl bg-muted" />)}</div> : attendanceReport.error ? <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800">Você não tem permissão para consultar este relatório ou o evento não foi encontrado.</div> : attendanceReport.data ? <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5"><AttendanceMetric icon={Users} label="Inscritos" value={attendanceReport.data.summary.registeredCount} tone="navy" /><AttendanceMetric icon={UserRound} label="Pessoas" value={attendanceReport.data.summary.attendeeCount} tone="navy" /><AttendanceMetric icon={UserCheck} label="Presentes" value={attendanceReport.data.summary.checkedInAttendeeCount} tone="green" /><AttendanceMetric icon={UserX} label="Não vieram" value={attendanceReport.data.summary.absentAttendeeCount} tone="amber" /><AttendanceMetric icon={Loader2} label="Pendentes" value={attendanceReport.data.summary.pendingAttendeeCount} tone="slate" /></div>
            <div className="overflow-hidden rounded-xl border border-[#1e3a5f]/10"><div className="hidden grid-cols-[1fr_1fr_10rem_9rem] gap-3 bg-[#f5f0e8] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#1e3a5f]/70 sm:grid"><span>Inscrição</span><span>Acompanhante</span><span>Telefone</span><span>Situação</span></div><div className="max-h-80 overflow-y-auto divide-y divide-[#1e3a5f]/10">{attendanceReport.data.registrations.length === 0 ? <p className="px-4 py-8 text-center text-sm text-muted-foreground">Ainda não há inscrições para este evento.</p> : attendanceReport.data.registrations.map((registration: any) => <div key={registration.id} className="grid gap-2 px-4 py-3 text-sm sm:grid-cols-[1fr_1fr_10rem_9rem] sm:items-center"><div className="min-w-0"><p className="truncate font-medium text-[#1e3a5f]">{registration.displayName}</p><p className="mt-0.5 text-xs text-muted-foreground sm:hidden">{registration.participantPhone || "Sem telefone"}{registration.companionName ? ` · ${registration.companionName}` : ""}</p></div><p className="hidden truncate text-xs text-muted-foreground sm:block">{registration.companionName || "—"}</p><p className="hidden truncate text-xs text-muted-foreground sm:block">{registration.participantPhone || "—"}</p><Select value={(registration.presenceStatus ?? "pendente") as PresenceStatus} onValueChange={(value) => setPresence.mutate({ churchId, eventId: event.id, registrationId: registration.id, presenceStatus: value as PresenceStatus })} disabled={setPresence.isPending}><SelectTrigger className="h-8 w-full text-xs sm:w-36"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="pendente">Pendente</SelectItem><SelectItem value="presente">Presente</SelectItem><SelectItem value="ausente">Não compareceu</SelectItem><SelectItem value="cancelado">Cancelado</SelectItem></SelectContent></Select></div>)}</div></div>
            <div className="flex flex-col gap-2 sm:flex-row"><Button variant="outline" className="flex-1 gap-2 border-[#1e3a5f]/20 text-[#1e3a5f]" onClick={printAttendanceReport}><Printer className="w-4 h-4" /> Imprimir relatório</Button><Button variant="ghost" className="flex-1" onClick={() => void attendanceReport.refetch()}>Atualizar lista</Button></div>
          </> : null}
        </div>
      </DialogContent>
    </Dialog>

    <Dialog open={qrOpen} onOpenChange={setQrOpen}><DialogContent className="max-w-sm"><DialogHeader><DialogTitle className="font-display text-[#1e3a5f] flex items-center gap-2"><QrCode className="w-5 h-5 text-[#c9a84c]" />Check-in — {event.name}</DialogTitle></DialogHeader><div className="flex flex-col items-center gap-4 py-4">{checkinUrl && <><div className="p-4 bg-white rounded-2xl border border-[#1e3a5f]/10 shadow-sm"><QRCodeSVG value={checkinUrl} size={200} fgColor="#1e3a5f" bgColor="#ffffff" level="M" /></div><p className="text-xs text-center text-[#1e3a5f]/50 leading-relaxed">Mostre este QR Code na entrada do evento.<br />Os participantes escaneiam para confirmar presença.</p><div className="w-full p-3 bg-[#f5f0e8] rounded-xl"><p className="text-[10px] text-[#1e3a5f]/40 uppercase tracking-wider mb-1">Link de check-in</p><p className="text-xs text-[#1e3a5f] font-mono break-all">{checkinUrl}</p></div></>}</div></DialogContent></Dialog>
  </>;
}

function AttendanceMetric({ icon: Icon, label, value, tone }: { icon: typeof Users; label: string; value: number; tone: "navy" | "green" | "amber" | "slate" }) {
  const toneClass = tone === "green" ? "bg-emerald-50 text-emerald-700" : tone === "amber" ? "bg-amber-50 text-amber-700" : tone === "slate" ? "bg-slate-100 text-slate-600" : "bg-[#1e3a5f]/5 text-[#1e3a5f]";
  return <div className="rounded-xl border border-[#1e3a5f]/10 bg-white p-3"><div className={`mb-2 flex h-7 w-7 items-center justify-center rounded-lg ${toneClass}`}><Icon className={`h-4 w-4 ${tone === "slate" ? "animate-pulse" : ""}`} /></div><p className="text-xl font-bold text-[#1e3a5f]">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>;
}
