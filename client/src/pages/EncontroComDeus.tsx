import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useChurch } from "@/components/ChurchLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Heart, Users, Plus, Calendar, MapPin, CheckCircle } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  inscrito: "bg-blue-100 text-blue-800",
  confirmado: "bg-purple-100 text-purple-800",
  participou: "bg-yellow-100 text-yellow-800",
  concluiu: "bg-green-100 text-green-800",
  cancelado: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<string, string> = {
  inscrito: "Inscrito",
  confirmado: "Confirmado",
  participou: "Participou",
  concluiu: "Concluiu",
  cancelado: "Cancelado",
};

function EncounterCard({ event, churchId, people }: {
  event: { id: number; name: string; date: string | Date; endDate?: string | Date | null; location?: string | null; maxParticipants?: number | null; description?: string | null; active: boolean };
  churchId: number;
  people: { id: number; fullName: string }[];
}) {
  const [selectedPersonId, setSelectedPersonId] = useState<string>("");
  const [enrollOpen, setEnrollOpen] = useState(false);
  const utils = trpc.useUtils();

  const { data: enrollments } = trpc.encontro.getEnrollments.useQuery({ eventId: event.id, churchId });

  const enrollMutation = trpc.encontro.enroll.useMutation({
    onSuccess: () => {
      toast.success("Inscrição realizada!");
      setEnrollOpen(false);
      setSelectedPersonId("");
      utils.encontro.getEnrollments.invalidate();
    },
    onError: () => toast.error("Erro ao inscrever"),
  });

  const updateMutation = trpc.encontro.updateEnrollment.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado!");
      utils.encontro.getEnrollments.invalidate();
    },
  });

  const total = enrollments?.length ?? 0;
  const concluidos = enrollments?.filter((e) => e.enrollment.status === "concluiu").length ?? 0;
  const vagas = event.maxParticipants ? event.maxParticipants - total : null;

  return (
    <Card className="border border-[#f43f5e]/20 hover:border-[#f43f5e]/50 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🕊️</span>
            <div>
              <CardTitle className="text-[#1e3a5f] text-lg">{event.name}</CardTitle>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(event.date).toLocaleDateString("pt-BR")}
                  {event.endDate && ` – ${new Date(event.endDate).toLocaleDateString("pt-BR")}`}
                </span>
                {event.location && (
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {event.location}</span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant={event.active ? "default" : "secondary"}>{event.active ? "Ativo" : "Encerrado"}</Badge>
            {vagas !== null && (
              <span className="text-xs text-muted-foreground">{vagas} vagas restantes</span>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {event.description && <p className="text-sm text-muted-foreground mb-4">{event.description}</p>}
        <div className="flex gap-4 text-sm mb-4">
          <span className="flex items-center gap-1 text-muted-foreground"><Users className="h-4 w-4" /> {total} inscritos</span>
          <span className="flex items-center gap-1 text-green-600"><CheckCircle className="h-4 w-4" /> {concluidos} concluídos</span>
        </div>

        {enrollments && enrollments.length > 0 && (
          <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
            {enrollments.map(({ enrollment, person }) => (
              <div key={enrollment.id} className="flex items-center justify-between p-2 rounded bg-muted/30">
                <span className="text-sm font-medium">{person.fullName}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[enrollment.status ?? "inscrito"]}`}>
                    {STATUS_LABELS[enrollment.status ?? "inscrito"]}
                  </span>
                  {enrollment.status !== "concluiu" && enrollment.status !== "cancelado" && (
                    <Select
                      value={enrollment.status ?? "inscrito"}
                      onValueChange={(val) =>
                        updateMutation.mutate({
                          id: enrollment.id,
                          churchId,
                          status: val as "inscrito" | "confirmado" | "participou" | "concluiu" | "cancelado",
                          completedAt: val === "concluiu" ? new Date() : null,
                        })
                      }
                    >
                      <SelectTrigger className="h-6 text-xs w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inscrito">Inscrito</SelectItem>
                        <SelectItem value="confirmado">Confirmado</SelectItem>
                        <SelectItem value="participou">Participou</SelectItem>
                        <SelectItem value="concluiu">Concluiu</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="w-full bg-[#1e3a5f] hover:bg-[#1e3a5f]/90 text-white">
              <Plus className="h-4 w-4 mr-1" /> Inscrever Pessoa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Inscrever em {event.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <Select value={selectedPersonId} onValueChange={setSelectedPersonId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a pessoa..." />
                </SelectTrigger>
                <SelectContent>
                  {people.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                className="w-full bg-[#1e3a5f] text-white"
                disabled={!selectedPersonId || enrollMutation.isPending}
                onClick={() => enrollMutation.mutate({ encounterEventId: event.id, personId: Number(selectedPersonId), churchId })}
              >
                {enrollMutation.isPending ? "Inscrevendo..." : "Confirmar Inscrição"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

export default function EncontroComDeus() {
  const { churchId } = useChurch();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", date: "", endDate: "", location: "", maxParticipants: "", description: "" });
  const utils = trpc.useUtils();

  const { data: events, isLoading } = trpc.encontro.listEvents.useQuery(
    { churchId: churchId! },
    { enabled: !!churchId }
  );
  const { data: people } = trpc.people.list.useQuery(
    { churchId: churchId! },
    { enabled: !!churchId }
  );

  const createMutation = trpc.encontro.createEvent.useMutation({
    onSuccess: () => {
      toast.success("Encontro criado com sucesso!");
      setCreateOpen(false);
      setForm({ name: "", date: "", endDate: "", location: "", maxParticipants: "", description: "" });
      utils.encontro.listEvents.invalidate();
    },
    onError: () => toast.error("Erro ao criar encontro"),
  });

  if (!churchId) return null;
  const simplePeople = (people ?? []).map((p) => ({ id: p.id, fullName: p.fullName }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f] flex items-center gap-2">
            <Heart className="h-6 w-6 text-[#f43f5e]" />
            Encontro com Deus
          </h1>
          <p className="text-muted-foreground mt-1">Retiros e encontros espirituais transformadores</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#1e3a5f] text-white hover:bg-[#1e3a5f]/90">
              <Plus className="h-4 w-4 mr-2" /> Novo Encontro
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Encontro com Deus</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Nome do Encontro *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Encontro com Deus — Julho 2025" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Data de Início *</Label>
                  <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                <div>
                  <Label>Data de Término</Label>
                  <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Local</Label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Ex: Sítio, Hotel de Retiro..." />
              </div>
              <div>
                <Label>Vagas Máximas</Label>
                <Input type="number" value={form.maxParticipants} onChange={(e) => setForm({ ...form, maxParticipants: e.target.value })} placeholder="Deixe em branco para ilimitado" />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
              </div>
              <Button
                className="w-full bg-[#1e3a5f] text-white"
                disabled={!form.name || !form.date || createMutation.isPending}
                onClick={() => createMutation.mutate({
                  churchId: churchId!,
                  name: form.name,
                  date: form.date,
                  endDate: form.endDate || undefined,
                  location: form.location || undefined,
                  maxParticipants: form.maxParticipants ? Number(form.maxParticipants) : undefined,
                  description: form.description || undefined,
                })}
              >
                {createMutation.isPending ? "Criando..." : "Criar Encontro"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => <Card key={i} className="animate-pulse h-48 bg-muted/30" />)}
        </div>
      ) : events && events.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {events.map((event) => (
            <EncounterCard key={event.id} event={event} churchId={churchId!} people={simplePeople} />
          ))}
        </div>
      ) : (
        <Card className="border-dashed border-[#f43f5e]/30">
          <CardContent className="p-12 text-center">
            <Heart className="h-12 w-12 text-[#f43f5e]/40 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#1e3a5f] mb-2">Nenhum encontro cadastrado</h3>
            <p className="text-muted-foreground text-sm mb-4">Crie o primeiro Encontro com Deus para registrar os participantes.</p>
            <Button onClick={() => setCreateOpen(true)} className="bg-[#1e3a5f] text-white">
              <Plus className="h-4 w-4 mr-2" /> Criar Primeiro Encontro
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
