import { useState } from "react";
import { useChurch } from "@/components/ChurchLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, Calendar, Users, Clock, ChevronLeft, ChevronRight, Pencil, XCircle } from "lucide-react";

const DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

type ScheduleForm = { ministryId: string; departmentId: string; personId: string; scheduledDate: string; startTime: string; endTime: string; role: string };
type ScheduleItem = { id: number; ministryId: number; departmentId?: number | null; personId: number; scheduledDate: Date | string; startTime: string | null; endTime: string | null; role: string | null; status: "agendada" | "cancelada"; cancelReason?: string | null; hasTimeConflict?: boolean };
const EMPTY_FORM: ScheduleForm = { ministryId: "", departmentId: "", personId: "", scheduledDate: "", startTime: "", endTime: "", role: "" };

export default function Escalas() {
  const { churchId } = useChurch();
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleItem | null>(null);
  const [cancelTarget, setCancelTarget] = useState<ScheduleItem | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [form, setForm] = useState<ScheduleForm>(EMPTY_FORM);

  const { data: scales = [], isLoading, refetch } = trpc.schedules.list.useQuery(
    { churchId: churchId!, month: currentMonth, year: currentYear },
    { enabled: !!churchId }
  );
  const { data: ministries = [] } = trpc.ministries.list.useQuery(
    { churchId: churchId! },
    { enabled: !!churchId }
  );
  const { data: people = [] } = trpc.people.list.useQuery(
    { churchId: churchId! },
    { enabled: !!churchId }
  );
  const { data: departments = [] } = trpc.departments.listByChurch.useQuery(
    { churchId: churchId! },
    { enabled: !!churchId }
  );
  const ministryMembers = trpc.ministries.members.useQuery(
    { churchId: churchId!, ministryId: Number(form.ministryId) || 0 },
    { enabled: Boolean(churchId && form.ministryId && !form.departmentId) }
  );
  const departmentMembers = trpc.departments.members.useQuery(
    { churchId: churchId!, departmentId: Number(form.departmentId) || 0 },
    { enabled: Boolean(churchId && form.departmentId) }
  );
  const createMutation = trpc.schedules.create.useMutation({
    onSuccess: () => {
      toast.success("Escala criada com sucesso!");
      setScheduleOpen(false);
      setForm(EMPTY_FORM);
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });
  const updateMutation = trpc.schedules.update.useMutation({
    onSuccess: () => {
      toast.success("Escala atualizada com sucesso!");
      setScheduleOpen(false);
      setEditingSchedule(null);
      setForm(EMPTY_FORM);
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });
  const cancelMutation = trpc.schedules.cancel.useMutation({
    onSuccess: () => {
      toast.success("Escala cancelada. O histórico foi preservado.");
      setCancelTarget(null);
      setCancelReason("");
      refetch();
    },
    onError: (error) => toast.error(error.message),
  });

  const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();

  const prevMonth = () => {
    if (currentMonth === 1) { setCurrentMonth(12); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 12) { setCurrentMonth(1); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  const formatDate = (day: number) =>
    `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  const getScalesForDay = (day: number) => {
    const dateStr = formatDate(day);
    return scales.filter((s) => {
      const d = new Date(s.scheduledDate);
      const sd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return sd === dateStr;
    });
  };

  const hasScale = (day: number) => getScalesForDay(day).some((scale) => scale.status !== "cancelada");
  const hasConflict = (day: number) => getScalesForDay(day).some((scale) => scale.hasTimeConflict);

  const selectedScales = selectedDate
    ? scales.filter((s) => {
        const d = new Date(s.scheduledDate);
        const sd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        return sd === selectedDate;
      })
    : [];

  const activeScales = scales.filter((scale) => scale.status !== "cancelada");
  const uniqueDates = new Set(
    activeScales.map((s) => {
      const d = new Date(s.scheduledDate);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    })
  );
  const conflictsThisMonth = activeScales.filter((scale) => scale.hasTimeConflict).length;
  const peopleById = new Map(people.map((person) => [person.id, person.fullName]));
  const ministriesById = new Map(ministries.map((ministry) => [ministry.id, ministry.name]));
  const departmentsById = new Map(departments.filter((department) => department !== null).map((department) => [department.id, department.name]));
  const schedulableDepartments = departments.filter((department): department is NonNullable<typeof department> => Boolean(department && department.active && department.canManage));
  const schedulableMinistries = ministries.filter((ministry) => ministry.canManage || schedulableDepartments.some((department) => department.ministryId === ministry.id));
  const selectedMinistryCanManage = ministries.find((ministry) => String(ministry.id) === form.ministryId)?.canManage ?? false;
  const departmentsForMinistry = schedulableDepartments.filter((department) => String(department.ministryId) === form.ministryId);
  const eligiblePeople = form.departmentId
    ? (departmentMembers.data ?? []).map((item) => item.person)
    : (ministryMembers.data ?? []).map((item) => item.person);
  const formConflict = Boolean(form.personId && form.scheduledDate && form.startTime && form.endTime && activeScales.some((scale) => {
    const date = new Date(scale.scheduledDate);
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return scale.id !== editingSchedule?.id && String(scale.personId) === form.personId && dateKey === form.scheduledDate && scale.startTime && scale.endTime && form.startTime < scale.endTime && form.endTime > scale.startTime;
  }));

  const toDateInput = (value: Date | string) => {
    const date = new Date(value);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };

  function openCreateDialog() {
    setEditingSchedule(null);
    setForm(EMPTY_FORM);
    setScheduleOpen(true);
  }

  function handleMinistryChange(ministryId: string) {
    const ministryCanManage = ministries.find((ministry) => String(ministry.id) === ministryId)?.canManage ?? false;
    const firstManagedDepartment = schedulableDepartments.find((department) => String(department.ministryId) === ministryId);
    setForm({ ...form, ministryId, departmentId: ministryCanManage ? "" : firstManagedDepartment ? String(firstManagedDepartment.id) : "", personId: "" });
  }

  function openEditDialog(scale: ScheduleItem) {
    setEditingSchedule(scale);
    setForm({
      ministryId: String(scale.ministryId),
      departmentId: scale.departmentId ? String(scale.departmentId) : "",
      personId: String(scale.personId),
      scheduledDate: toDateInput(scale.scheduledDate),
      startTime: scale.startTime ?? "",
      endTime: scale.endTime ?? "",
      role: scale.role ?? "",
    });
    setScheduleOpen(true);
  }

  function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!churchId || !form.ministryId || !form.personId || !form.scheduledDate || !form.startTime || !form.endTime) {
      toast.error("Selecione ministério, pessoa, data e horário para salvar a Escala.");
      return;
    }
    const payload = {
      churchId,
      ministryId: Number(form.ministryId),
      departmentId: form.departmentId ? Number(form.departmentId) : null,
      personId: Number(form.personId),
      scheduledDate: form.scheduledDate,
      startTime: form.startTime,
      endTime: form.endTime,
      role: form.role.trim() || undefined,
    };
    if (editingSchedule) {
      updateMutation.mutate({ ...payload, id: editingSchedule.id });
    } else {
      createMutation.mutate(payload);
    }
  }

  return (
      <div className="p-6 max-w-5xl mx-auto animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-display font-bold text-navy">Escalas</h1>
            <p className="text-sm text-muted-foreground mt-1">Escalonamento de voluntários e ministérios</p>
          </div>
          {schedulableMinistries.length > 0 && <Dialog open={scheduleOpen} onOpenChange={(open) => {
            setScheduleOpen(open);
            if (!open) {
              setEditingSchedule(null);
              setForm(EMPTY_FORM);
            }
          }}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog} className="bg-navy text-white hover:bg-navy-light gap-2">+ Nova Escala</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-display text-navy">{editingSchedule ? "Editar Escala" : "Criar Escala"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSave} className="space-y-4 pt-2">
                <div>
                  <Label htmlFor="schedule-ministry">Ministério *</Label>
                  <select id="schedule-ministry" value={form.ministryId} onChange={(event) => handleMinistryChange(event.target.value)} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                    <option value="">Selecione o ministério</option>
                    {schedulableMinistries.map((ministry) => <option key={ministry.id} value={ministry.id}>{ministry.name}</option>)}
                  </select>
                </div>
                <div>
                  <Label htmlFor="schedule-department">Departamento</Label>
                  <select id="schedule-department" value={form.departmentId} disabled={!form.ministryId} onChange={(event) => setForm({ ...form, departmentId: event.target.value, personId: "" })} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60">
                    <option value="" disabled={!selectedMinistryCanManage}>Escala geral do Ministério</option>
                    {departmentsForMinistry.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
                  </select>
                  <p className="mt-1 text-xs text-muted-foreground">Opcional. Ao selecionar, somente participantes ativos do Departamento poderão ser escalados.</p>
                </div>
                <div>
                  <Label htmlFor="schedule-person">Pessoa escalada *</Label>
                  <select id="schedule-person" value={form.personId} disabled={!form.ministryId || ministryMembers.isLoading || departmentMembers.isLoading} onChange={(event) => setForm({ ...form, personId: event.target.value })} className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm disabled:opacity-60">
                    <option value="">Selecione a pessoa</option>
                    {eligiblePeople.map((person) => <option key={person.id} value={person.id}>{person.fullName}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="schedule-date">Data *</Label>
                    <Input id="schedule-date" type="date" value={form.scheduledDate} onChange={(event) => setForm({ ...form, scheduledDate: event.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="schedule-start-time">Início *</Label>
                    <Input id="schedule-start-time" type="time" value={form.startTime} onChange={(event) => setForm({ ...form, startTime: event.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="schedule-end-time">Término *</Label>
                    <Input id="schedule-end-time" type="time" value={form.endTime} onChange={(event) => setForm({ ...form, endTime: event.target.value })} className="mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="schedule-role">Função</Label>
                    <Input id="schedule-role" placeholder="Ex.: Vocal" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })} className="mt-1" />
                  </div>
                </div>
                {formConflict && <div className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />Esta pessoa já aparece em uma escala com horário sobreposto nesta data. O sistema também bloqueará o salvamento.</div>}
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setScheduleOpen(false)}>Cancelar</Button>
                  <Button type="submit" className="bg-navy text-white" disabled={createMutation.isPending || updateMutation.isPending}>{createMutation.isPending || updateMutation.isPending ? "Salvando..." : editingSchedule ? "Salvar Alterações" : "Criar Escala"}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2 card-sacred p-5">
            <div className="flex items-center justify-between mb-4">
              <button type="button" aria-label="Mês anterior" onClick={prevMonth} className="p-1 rounded hover:bg-muted focus:outline-none focus:ring-2 focus:ring-gold/40 transition-colors">
                <ChevronLeft className="w-5 h-5 text-navy" />
              </button>
              <h2 className="font-display font-semibold text-navy">
                {MONTHS[currentMonth - 1]} {currentYear}
              </h2>
              <button type="button" aria-label="Próximo mês" onClick={nextMonth} className="p-1 rounded hover:bg-muted focus:outline-none focus:ring-2 focus:ring-gold/40 transition-colors">
                <ChevronRight className="w-5 h-5 text-navy" />
              </button>
            </div>
            <div className="grid grid-cols-7 mb-2">
              {DAYS.map((d) => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = formatDate(day);
                const todayStr = today.toISOString().split("T")[0];
                const isToday = dateStr === todayStr;
                const isSelected = selectedDate === dateStr;
                const hasEvent = hasScale(day);
                const dayHasConflict = hasConflict(day);
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                    className={`
                      aspect-square flex flex-col items-center justify-center rounded-lg text-sm transition-all
                      ${isSelected ? "bg-navy text-white" : dayHasConflict ? "bg-rose-50 text-rose-800 ring-1 ring-rose-300" : isToday ? "bg-gold/20 text-navy font-bold" : "hover:bg-muted text-foreground"}
                    `}
                  >
                    {day}
                    {hasEvent && (
                      <div className={`w-1.5 h-1.5 rounded-full mt-0.5 ${isSelected ? "bg-white" : dayHasConflict ? "bg-rose-600" : "bg-gold"}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Side panel */}
          <div className="space-y-4">
            <div className="card-sacred p-4">
              <h3 className="font-semibold text-navy text-sm mb-3">Resumo do Mês</h3>
              {isLoading ? (
                <div className="animate-pulse space-y-2">
                  {[1, 2, 3].map((i) => <div key={i} className="h-4 bg-muted rounded" />)}
                </div>
              ) : (
                <div className="space-y-2">
                  {[
                    { label: "Cultos Escalados", value: uniqueDates.size, icon: Calendar },
                    { label: "Escalas no Mês", value: activeScales.length, icon: Users },
                    { label: "Canceladas", value: scales.length - activeScales.length, icon: XCircle },
                    { label: "Conflitos", value: conflictsThisMonth, icon: AlertTriangle },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <item.icon className="w-3.5 h-3.5" />
                        {item.label}
                      </div>
                      <span className="font-bold text-navy text-sm">{item.value}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="card-sacred p-4">
              <h3 className="font-semibold text-navy text-sm mb-3">
                {selectedDate
                  ? `Escala — ${new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}`
                  : "Selecione uma data"}
              </h3>
              {!selectedDate ? (
                <p className="text-xs text-muted-foreground">Clique em um dia no calendário para ver as escalas.</p>
              ) : selectedScales.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhuma escala para este dia.</p>
              ) : (
                <div className="space-y-2">
                  {selectedScales.map((scale) => (
                    <div key={scale.id} className={`p-2 rounded-lg border ${scale.status === "cancelada" ? "border-slate-200 bg-slate-50 opacity-75" : scale.hasTimeConflict ? "border-rose-200 bg-rose-50" : "border-border/50 bg-muted/50"}`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex flex-wrap gap-1"><Badge variant="outline" className="text-xs">{ministriesById.get(scale.ministryId) ?? `Min. ${scale.ministryId}`}</Badge>{scale.departmentId && <Badge variant="secondary" className="text-xs">{departmentsById.get(scale.departmentId) ?? `Departamento ${scale.departmentId}`}</Badge>}</div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(scale.scheduledDate).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-navy">{peopleById.get(scale.personId) ?? `Pessoa #${scale.personId}`}</p>
                      <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" />{scale.startTime && scale.endTime ? `${scale.startTime}–${scale.endTime}` : "Horário não definido"}</p>
                      {scale.role && <p className="text-xs text-muted-foreground">{scale.role}</p>}
                      {scale.status === "cancelada" && <p className="mt-1 text-xs font-medium text-slate-600">Cancelada{scale.cancelReason ? `: ${scale.cancelReason}` : ""}</p>}
                      {scale.hasTimeConflict && <p className="mt-1 flex items-center gap-1 text-xs font-medium text-rose-700"><AlertTriangle className="h-3 w-3" />Conflito de horário</p>}
                      {scale.status !== "cancelada" && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => openEditDialog(scale as ScheduleItem)}><Pencil className="mr-1 h-3 w-3" />Editar</Button>
                          <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs text-rose-700 hover:bg-rose-50 hover:text-rose-800" onClick={() => { setCancelTarget(scale as ScheduleItem); setCancelReason(""); }}><XCircle className="mr-1 h-3 w-3" />Cancelar</Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <AlertDialog open={Boolean(cancelTarget)} onOpenChange={(open) => { if (!open) { setCancelTarget(null); setCancelReason(""); } }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancelar esta Escala?</AlertDialogTitle>
              <AlertDialogDescription>O cancelamento preserva o registro no histórico e remove a Escala ativa do calendário.</AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2">
              <Label htmlFor="schedule-cancel-reason">Motivo do cancelamento *</Label>
              <Input id="schedule-cancel-reason" value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} placeholder="Ex.: voluntário indisponível" maxLength={500} />
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={cancelMutation.isPending}>Voltar</AlertDialogCancel>
              <AlertDialogAction className="bg-rose-700 hover:bg-rose-800" disabled={cancelReason.trim().length < 3 || cancelMutation.isPending} onClick={(event) => {
                event.preventDefault();
                if (cancelTarget && churchId) cancelMutation.mutate({ id: cancelTarget.id, churchId, reason: cancelReason.trim() });
              }}>{cancelMutation.isPending ? "Cancelando..." : "Confirmar cancelamento"}</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
  );
}
