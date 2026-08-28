import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useChurch } from "@/components/ChurchLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ArrowRight, Calendar, Heart, MapPin, Plus, ShieldCheck, Users } from "lucide-react";

const STATUS_LABELS: Record<string, string> = {
  rascunho: "Rascunho",
  planejamento: "Planejamento",
  confirmado: "Confirmado",
  em_andamento: "Em andamento",
  encerrado: "Encerrado",
  cancelado: "Cancelado",
};

const STATUS_CLASSES: Record<string, string> = {
  rascunho: "bg-slate-100 text-slate-700 border-slate-200",
  planejamento: "bg-amber-50 text-amber-800 border-amber-200",
  confirmado: "bg-blue-50 text-blue-800 border-blue-200",
  em_andamento: "bg-emerald-50 text-emerald-800 border-emerald-200",
  encerrado: "bg-zinc-100 text-zinc-700 border-zinc-200",
  cancelado: "bg-rose-50 text-rose-800 border-rose-200",
};

const defaultForm = {
  name: "",
  date: "",
  endDate: "",
  location: "",
  maxParticipants: "",
  description: "",
  responsiblePersonId: "",
};

function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const raw = typeof value === "string" ? value.slice(0, 10) : value.toISOString().slice(0, 10);
  const [year, month, day] = raw.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("pt-BR");
}

export default function EncontroComDeus() {
  const { churchId } = useChurch();
  const [, navigate] = useLocation();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const utils = trpc.useUtils();

  const access = trpc.encontro.accessSummary.useQuery(
    { churchId },
    { enabled: Boolean(churchId) }
  );
  const events = trpc.encontro.listEvents.useQuery(
    { churchId },
    { enabled: Boolean(churchId && access.data?.hasAccess) }
  );
  const people = trpc.people.list.useQuery(
    { churchId },
    { enabled: Boolean(churchId && access.data?.canManageAll) }
  );

  const activeEvents = useMemo(
    () => (events.data ?? []).filter((event) => event.active && event.status !== "encerrado" && event.status !== "cancelado"),
    [events.data]
  );
  const pastEvents = useMemo(
    () => (events.data ?? []).filter((event) => !event.active || event.status === "encerrado" || event.status === "cancelado"),
    [events.data]
  );

  const createMutation = trpc.encontro.createEvent.useMutation({
    onSuccess: async ({ eventId }) => {
      toast.success("Encontro criado com a estrutura inicial de equipes.");
      setCreateOpen(false);
      setForm(defaultForm);
      await utils.encontro.listEvents.invalidate();
      navigate(`/app/encontro-com-deus/${eventId}`);
    },
    onError: (error) => toast.error(error.message || "Não foi possível criar o encontro."),
  });

  if (access.isLoading) {
    return <div className="grid gap-4 p-4 sm:p-6"><div className="h-28 animate-pulse rounded-2xl bg-muted" /><div className="h-48 animate-pulse rounded-2xl bg-muted" /></div>;
  }

  if (!access.data?.hasAccess) {
    return (
      <div className="p-4 sm:p-6">
        <Card className="mx-auto max-w-xl border-[#1e3a5f]/10 shadow-sm">
          <CardContent className="p-8 text-center">
            <ShieldCheck className="mx-auto mb-4 h-12 w-12 text-[#c9a84c]" />
            <h1 className="font-display text-2xl font-bold text-[#1e3a5f]">Área de coordenação</h1>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">A gestão do Encontro com Deus é restrita à liderança e aos responsáveis designados. Participar como discípulo não libera acesso a esta área.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-7 p-4 sm:p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-[#c94a68]"><Heart className="h-5 w-5" /><span className="text-xs font-semibold uppercase tracking-[0.2em]">Coordenação espiritual e operacional</span></div>
          <h1 className="mt-2 font-display text-3xl font-bold text-[#1e3a5f]">Encontro com Deus</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Organize discípulos, servos, equipes, ficha online e pendências de cada edição em um único lugar.</p>
        </div>

        {access.data.canManageAll && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-[#1e3a5f] text-white hover:bg-[#1e3a5f]/90"><Plus className="h-4 w-4" /> Novo encontro</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
              <DialogHeader><DialogTitle className="font-display text-[#1e3a5f]">Novo Encontro com Deus</DialogTitle></DialogHeader>
              <div className="grid gap-4 pt-2 sm:grid-cols-2">
                <div className="sm:col-span-2"><Label>Nome do encontro *</Label><Input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ex.: Encontro com Deus — Setembro 2026" /></div>
                <div><Label>Data de início *</Label><Input type="date" value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value })} /></div>
                <div><Label>Data de término</Label><Input type="date" min={form.date || undefined} value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} /></div>
                <div className="sm:col-span-2"><Label>Local</Label><Input value={form.location} onChange={(event) => setForm({ ...form, location: event.target.value })} placeholder="Sítio, hotel ou endereço" /></div>
                <div><Label>Limite de discípulos</Label><Input type="number" min="1" value={form.maxParticipants} onChange={(event) => setForm({ ...form, maxParticipants: event.target.value })} placeholder="Sem limite" /></div>
                <div><Label>Responsável geral</Label><Select value={form.responsiblePersonId} onValueChange={(value) => setForm({ ...form, responsiblePersonId: value })}><SelectTrigger><SelectValue placeholder="Definir depois" /></SelectTrigger><SelectContent>{(people.data ?? []).map((person) => <SelectItem key={person.id} value={String(person.id)}>{person.fullName}</SelectItem>)}</SelectContent></Select></div>
                <div className="sm:col-span-2"><Label>Descrição</Label><Textarea rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Objetivo e orientações gerais" /></div>
                <div className="sm:col-span-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button><Button disabled={!form.name.trim() || !form.date || createMutation.isPending} onClick={() => createMutation.mutate({ churchId, name: form.name, date: form.date, endDate: form.endDate || undefined, location: form.location || undefined, maxParticipants: form.maxParticipants ? Number(form.maxParticipants) : undefined, description: form.description || undefined, responsiblePersonId: form.responsiblePersonId ? Number(form.responsiblePersonId) : undefined })}>{createMutation.isPending ? "Criando..." : "Criar encontro"}</Button></div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <Metric label="Em preparação" value={activeEvents.length} icon={Calendar} />
        <Metric label="Encerrados" value={pastEvents.filter((event) => event.status === "encerrado").length} icon={ShieldCheck} />
        <Metric label="Total registrado" value={events.data?.length ?? 0} icon={Users} />
      </section>

      {events.isLoading ? (
        <div className="grid gap-4 lg:grid-cols-2">{[1, 2].map((item) => <div key={item} className="h-52 animate-pulse rounded-2xl bg-muted" />)}</div>
      ) : events.error ? (
        <Card className="border-rose-200 bg-rose-50"><CardContent className="p-5 text-sm text-rose-800">{events.error.message}</CardContent></Card>
      ) : (events.data ?? []).length === 0 ? (
        <Card className="border-dashed border-[#c9a84c]/50"><CardContent className="flex flex-col items-center p-10 text-center"><Heart className="mb-4 h-11 w-11 text-[#c9a84c]" /><h2 className="font-display text-xl font-bold text-[#1e3a5f]">Nenhum encontro cadastrado</h2><p className="mt-2 max-w-md text-sm text-muted-foreground">Crie a primeira edição. O sistema preparará a hierarquia e as equipes iniciais automaticamente.</p>{access.data.canManageAll && <Button className="mt-5" onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" /> Criar primeiro encontro</Button>}</CardContent></Card>
      ) : (
        <div className="space-y-7">
          {activeEvents.length > 0 && <EventSection title="Em preparação ou andamento" events={activeEvents} onOpen={(id) => navigate(`/app/encontro-com-deus/${id}`)} />}
          {pastEvents.length > 0 && <EventSection title="Histórico" events={pastEvents} onOpen={(id) => navigate(`/app/encontro-com-deus/${id}`)} muted />}
        </div>
      )}
    </div>
  );
}

function Metric({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Calendar }) {
  return <div className="rounded-2xl border border-[#1e3a5f]/10 bg-white p-4 shadow-sm"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1e3a5f]/5 text-[#1e3a5f]"><Icon className="h-5 w-5" /></span><div><p className="text-2xl font-bold text-[#1e3a5f]">{value}</p><p className="text-xs text-muted-foreground">{label}</p></div></div></div>;
}

function EventSection({ title, events, onOpen, muted = false }: { title: string; events: Array<{ id: number; name: string; date: Date | string; endDate?: Date | string | null; location?: string | null; maxParticipants?: number | null; description?: string | null; status: string }>; onOpen: (id: number) => void; muted?: boolean }) {
  return <section><h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</h2><div className={`grid gap-4 lg:grid-cols-2 ${muted ? "opacity-80" : ""}`}>{events.map((event) => <Card key={event.id} className="overflow-hidden border-[#1e3a5f]/10 shadow-sm transition-shadow hover:shadow-md"><CardContent className="p-0"><div className="p-5"><div className="flex items-start justify-between gap-4"><div className="min-w-0"><h3 className="truncate font-display text-xl font-bold text-[#1e3a5f]">{event.name}</h3><div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground"><span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" />{formatDate(event.date)}{event.endDate ? ` a ${formatDate(event.endDate)}` : ""}</span>{event.location && <span className="flex min-w-0 items-center gap-1.5"><MapPin className="h-4 w-4 shrink-0" /><span className="truncate">{event.location}</span></span>}</div></div><Badge variant="outline" className={STATUS_CLASSES[event.status] ?? STATUS_CLASSES.planejamento}>{STATUS_LABELS[event.status] ?? event.status}</Badge></div>{event.description && <p className="mt-4 line-clamp-2 text-sm leading-6 text-muted-foreground">{event.description}</p>}<div className="mt-4 flex items-center justify-between border-t border-[#1e3a5f]/10 pt-4"><span className="text-xs font-medium text-muted-foreground">{event.maxParticipants ? `Até ${event.maxParticipants} discípulos` : "Sem limite definido"}</span><Button variant="ghost" className="gap-2 text-[#1e3a5f]" onClick={() => onOpen(event.id)}>Abrir painel <ArrowRight className="h-4 w-4" /></Button></div></div></CardContent></Card>)}</div></section>;
}
