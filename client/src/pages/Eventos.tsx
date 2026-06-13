import { useChurch } from "@/components/ChurchLayout";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { CalendarDays, MapPin, Plus, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
  const typeLabel = EVENT_TYPES.find((t) => t.value === event.type)?.label ?? event.type;
  const colorClass = TYPE_COLORS[event.type] ?? TYPE_COLORS.outro;

  return (
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
      <span className={`text-xs px-2 py-0.5 rounded-full border font-medium flex-shrink-0 ${colorClass}`}>
        {typeLabel}
      </span>
    </div>
  );
}
