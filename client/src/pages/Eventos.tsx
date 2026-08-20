import { useChurch } from "@/components/ChurchLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { BarChart3, CalendarDays, CheckCircle2, MapPin, Plus, Printer, QrCode, UserCheck, UserX, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";

const EVENT_TYPES = [
  { value: "congresso", label: "Congresso" },
  { value: "conferencia", label: "Conferência" },
  { value: "vigilia", label: "Vigília" },
  { value: "retiro", label: "Retiro" },
  { value: "seminario", label: "Seminário" },
  { value: "culto", label: "Culto" },
  { value: "outro", label: "Outro" },
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
  maxCapacity: "" as any,
};

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);

export default function Eventos() {
  const { churchId } = useChurch();
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
    onError: () => toast.error("Erro ao criar evento"),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    createEvent.mutate({
      churchId,
      ...form,
      maxCapacity: form.maxCapacity ? Number(form.maxCapacity) : undefined,
      endDate: form.endDate || undefined,
      description: form.description || undefined,
      location: form.location || undefined,
    });
  }

  const upcoming = (events ?? []).filter(
    (e) => new Date(e.startDate) >= new Date()
  );
  const past = (events ?? []).filter(
    (e) => new Date(e.startDate) < new Date()
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-navy">Eventos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie congressos, conferências, cultos e retiros
          </p>
        </div>
        <Button onClick={() => setOpen(true)} className="bg-navy hover:bg-navy-light text-white gap-2">
          <Plus className="w-4 h-4" />
          Novo Evento
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Próximos Eventos
              </h2>
              <div className="space-y-3 animate-stagger">
                {upcoming.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Eventos Passados
              </h2>
              <div className="space-y-3 opacity-60">
                {past.slice(0, 5).map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </div>
          )}

          {(events ?? []).length === 0 && (
            <div className="card-sacred p-12 flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center">
                <CalendarDays className="w-7 h-7 text-amber-500" />
              </div>
              <p className="font-semibold text-navy">Nenhum evento cadastrado</p>
              <p className="text-sm text-muted-foreground">Crie o primeiro evento da sua igreja</p>
            </div>
          )}
        </div>
      )}

      {/* Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-navy flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-amber-500" />
              Novo Evento
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Nome do Evento *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="col-span-2">
                <Label>Tipo *</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as any })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data de Início *</Label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required />
              </div>
              <div>
                <Label>Data de Fim</Label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
              <div className="col-span-2">
                <Label>Local</Label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Endereço ou nome do local" />
              </div>
              <div>
                <Label>Capacidade Máxima</Label>
                <Input type="number" value={form.maxCapacity} onChange={(e) => setForm({ ...form, maxCapacity: e.target.value })} placeholder="Ex: 500" />
              </div>
              <div className="col-span-2">
                <Label>Descrição</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
              </div>
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">Cancelar</Button>
              <Button type="submit" className="flex-1 bg-navy hover:bg-navy-light text-white" disabled={createEvent.isPending}>
                {createEvent.isPending ? "Salvando..." : "Criar Evento"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EventCard({ event }: { event: any }) {
  const { churchId } = useChurch();
  const typeLabel = EVENT_TYPES.find((t) => t.value === event.type)?.label ?? event.type;
  const colorClass = TYPE_COLORS[event.type] ?? TYPE_COLORS.outro;
  const [qrOpen, setQrOpen] = useState(false);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [qrValue, setQrValue] = useState<string | null>(event.qrCode ?? null);

  const attendanceReport = trpc.events.attendanceReport.useQuery(
    { churchId, eventId: event.id },
    { enabled: attendanceOpen }
  );

  const generateQr = trpc.events.generateQrCode.useMutation({
    onSuccess: (data) => {
      setQrValue(data.qrCode);
      setQrOpen(true);
      toast.success("QR Code gerado!");
    },
    onError: () => toast.error("Erro ao gerar QR Code"),
  });

  const checkinUrl = qrValue
    ? `${window.location.origin}/checkin?event=${event.id}&token=${qrValue.split(":")[2]}`
    : null;

  const printAttendanceReport = () => {
    const report = attendanceReport.data;
    if (!report) return;
    const rows = report.registrations.map((registration) => `<tr><td>${escapeHtml(registration.personName)}</td><td>${registration.attendance === "presente" ? "Presente" : "Ausente"}</td><td>${registration.checkedInAt ? new Date(registration.checkedInAt).toLocaleString("pt-BR") : "—"}</td></tr>`).join("");
    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!printWindow) return;
    printWindow.document.write(`<!doctype html><html><head><title>Presença — ${escapeHtml(report.event.name)}</title><style>body{font-family:Arial,sans-serif;color:#1e3a5f;padding:32px}h1{margin:0 0 4px}p{color:#556274}.metrics{display:flex;gap:12px;margin:24px 0}.metric{border:1px solid #ded4bd;border-radius:8px;padding:12px;min-width:120px}.metric strong{font-size:24px;display:block}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{padding:10px;border-bottom:1px solid #e4e4e7;text-align:left}th{color:#7b6323;font-size:12px;text-transform:uppercase}</style></head><body><h1>${escapeHtml(report.event.name)}</h1><p>${new Date(report.event.startDate).toLocaleDateString("pt-BR")}${report.event.location ? ` · ${escapeHtml(report.event.location)}` : ""}</p><div class="metrics"><div class="metric"><span>Inscritos</span><strong>${report.summary.registeredCount}</strong></div><div class="metric"><span>Check-ins</span><strong>${report.summary.checkedInCount}</strong></div><div class="metric"><span>Ausentes</span><strong>${report.summary.absentCount}</strong></div></div><table><thead><tr><th>Participante</th><th>Situação</th><th>Check-in</th></tr></thead><tbody>${rows || "<tr><td colspan='3'>Sem inscrições registradas.</td></tr>"}</tbody></table></body></html>`);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <>
      <div className="card-sacred p-4 flex items-center gap-4">
        <div className="w-14 h-14 rounded-xl bg-cream-dark flex flex-col items-center justify-center flex-shrink-0 text-center">
          <span className="text-lg font-bold font-display text-navy leading-none">
            {new Date(event.startDate).getDate()}
          </span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
            {new Date(event.startDate).toLocaleString("pt-BR", { month: "short" })}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-navy">{event.name}</p>
          <div className="flex items-center gap-3 mt-0.5">
            {event.location && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {event.location}
              </span>
            )}
            {event.maxCapacity && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Users className="w-3 h-3" />
                {event.maxCapacity} vagas
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${colorClass}`}>
            {typeLabel}
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2 border-[#1e3a5f]/20 text-[#1e3a5f] hover:bg-[#1e3a5f]/5"
            onClick={() => {
              if (qrValue) {
                setQrOpen(true);
              } else {
                generateQr.mutate({ eventId: event.id, churchId });
              }
            }}
            disabled={generateQr.isPending}
          >
            <QrCode className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2 border-[#1e3a5f]/20 text-[#1e3a5f] hover:bg-[#1e3a5f]/5"
            onClick={() => setAttendanceOpen(true)}
            title="Relatório de presença"
          >
            <BarChart3 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Dialog QR Code */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-[#1e3a5f] flex items-center gap-2">
              <QrCode className="w-5 h-5 text-[#c9a84c]" />
              Check-in — {event.name}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {checkinUrl && (
              <>
                <div className="p-4 bg-white rounded-2xl border border-[#1e3a5f]/10 shadow-sm">
                  <QRCodeSVG
                    value={checkinUrl}
                    size={200}
                    fgColor="#1e3a5f"
                    bgColor="#ffffff"
                    level="M"
                  />
                </div>
                <p className="text-xs text-center text-[#1e3a5f]/50 leading-relaxed">
                  Mostre este QR Code na entrada do evento.<br />
                  Os participantes escaneiam para confirmar presença.
                </p>
                <div className="w-full p-3 bg-[#f5f0e8] rounded-xl">
                  <p className="text-[10px] text-[#1e3a5f]/40 uppercase tracking-wider mb-1">Link de check-in</p>
                  <p className="text-xs text-[#1e3a5f] font-mono break-all">{checkinUrl}</p>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={attendanceOpen} onOpenChange={setAttendanceOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-[#1e3a5f] flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-[#c9a84c]" />
              Presença — {event.name}
            </DialogTitle>
          </DialogHeader>
          {attendanceReport.isLoading ? (
            <div className="grid grid-cols-3 gap-3 py-4">{[1, 2, 3].map((item) => <div key={item} className="h-20 animate-pulse rounded-xl bg-muted" />)}</div>
          ) : attendanceReport.error ? (
            <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-800">Você não tem permissão para consultar este relatório ou o evento não foi encontrado.</div>
          ) : attendanceReport.data ? (
            <div className="space-y-5">
              <p className="text-sm text-muted-foreground">Acompanhe inscrições confirmadas pelo QR Code e participantes sem check-in. A lista não inclui inscrições canceladas.</p>
              <div className="grid grid-cols-3 gap-3">
                <AttendanceMetric icon={Users} label="Inscritos" value={attendanceReport.data.summary.registeredCount} tone="navy" />
                <AttendanceMetric icon={UserCheck} label="Check-ins" value={attendanceReport.data.summary.checkedInCount} tone="green" />
                <AttendanceMetric icon={UserX} label="Ausentes" value={attendanceReport.data.summary.absentCount} tone="amber" />
              </div>
              <div className="overflow-hidden rounded-xl border border-[#1e3a5f]/10">
                <div className="grid grid-cols-[1fr_auto] gap-3 bg-[#f5f0e8] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#1e3a5f]/70"><span>Participante</span><span>Situação</span></div>
                <div className="max-h-64 overflow-y-auto divide-y divide-[#1e3a5f]/10">
                  {attendanceReport.data.registrations.length === 0 ? <p className="px-4 py-8 text-center text-sm text-muted-foreground">Ainda não há inscrições para este evento.</p> : attendanceReport.data.registrations.map((registration) => <div key={registration.id} className="grid grid-cols-[1fr_auto] gap-3 px-4 py-3 text-sm"><div className="min-w-0"><p className="truncate font-medium text-[#1e3a5f]">{registration.personName}</p>{registration.checkedInAt && <p className="mt-0.5 text-xs text-muted-foreground">Check-in em {new Date(registration.checkedInAt).toLocaleString("pt-BR")}</p>}</div><span className={`self-center rounded-full px-2 py-1 text-xs font-medium ${registration.attendance === "presente" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"}`}>{registration.attendance === "presente" ? "Presente" : "Ausente"}</span></div>)}
                </div>
              </div>
              <Button variant="outline" className="w-full gap-2 border-[#1e3a5f]/20 text-[#1e3a5f]" onClick={printAttendanceReport}><Printer className="w-4 h-4" /> Imprimir relatório</Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function AttendanceMetric({ icon: Icon, label, value, tone }: { icon: typeof Users; label: string; value: number; tone: "navy" | "green" | "amber" }) {
  const toneClass = tone === "green" ? "bg-emerald-50 text-emerald-700" : tone === "amber" ? "bg-amber-50 text-amber-700" : "bg-[#1e3a5f]/5 text-[#1e3a5f]";
  return <div className="rounded-xl border border-[#1e3a5f]/10 bg-white p-3"><div className={`mb-2 flex h-7 w-7 items-center justify-center rounded-lg ${toneClass}`}><Icon className="h-4 w-4" /></div><p className="text-xl font-bold text-[#1e3a5f]">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div>;
}
