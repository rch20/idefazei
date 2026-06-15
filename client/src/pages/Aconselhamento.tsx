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
import { Shield, Plus, Calendar, Lock, MessageSquare, CheckCircle, XCircle, Clock } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  agendado: "bg-blue-100 text-blue-800",
  realizado: "bg-green-100 text-green-800",
  cancelado: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<string, string> = {
  agendado: "Agendado",
  realizado: "Realizado",
  cancelado: "Cancelado",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  agendado: <Clock className="h-4 w-4 text-blue-500" />,
  realizado: <CheckCircle className="h-4 w-4 text-green-500" />,
  cancelado: <XCircle className="h-4 w-4 text-red-500" />,
};

function SessionCard({ session, churchId }: {
  session: { session: { id: number; scheduledAt: Date | string; status: string | null; notes: string | null; counselorId: number; personId: number }; person: { id: number; fullName: string } };
  churchId: number;
}) {
  const [notesOpen, setNotesOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const utils = trpc.useUtils();

  const { data: notes } = trpc.aconselhamento.getNotes.useQuery(
    { sessionId: session.session.id, churchId },
    { enabled: notesOpen }
  );

  const updateMutation = trpc.aconselhamento.update.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado!");
      utils.aconselhamento.list.invalidate();
    },
  });

  const addNoteMutation = trpc.aconselhamento.addNote.useMutation({
    onSuccess: () => {
      toast.success("Anotação salva!");
      setNoteText("");
      utils.aconselhamento.getNotes.invalidate();
    },
    onError: () => toast.error("Erro ao salvar anotação"),
  });

  const status = session.session.status ?? "agendado";

  return (
    <Card className="border border-[#1e3a5f]/20 hover:border-[#1e3a5f]/40 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            {STATUS_ICONS[status]}
            <div>
              <p className="font-medium text-[#1e3a5f]">{session.person.fullName}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <Calendar className="h-3 w-3" />
                <span>{new Date(session.session.scheduledAt).toLocaleString("pt-BR", {
                  day: "2-digit", month: "2-digit", year: "numeric",
                  hour: "2-digit", minute: "2-digit"
                })}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[status]}`}>
              {STATUS_LABELS[status]}
            </span>
            {status === "agendado" && (
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-xs border-green-500 text-green-600"
                  onClick={() => updateMutation.mutate({ id: session.session.id, churchId, status: "realizado" })}
                >
                  Realizado
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-xs border-red-400 text-red-500"
                  onClick={() => updateMutation.mutate({ id: session.session.id, churchId, status: "cancelado" })}
                >
                  Cancelar
                </Button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 flex gap-2">
          <Dialog open={notesOpen} onOpenChange={setNotesOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="text-xs border-[#1e3a5f]/30 text-[#1e3a5f]">
                <Lock className="h-3 w-3 mr-1" /> Anotações Confidenciais
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-[#c9a84c]" />
                  Anotações — {session.person.fullName}
                  <Badge variant="outline" className="text-xs ml-1">Confidencial</Badge>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {notes && notes.length > 0 ? (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {notes.map((note) => (
                      <div key={note.id} className="p-3 rounded bg-muted/30 border border-muted">
                        <p className="text-sm">{note.content}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(note.createdAt).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhuma anotação ainda.</p>
                )}
                <div className="border-t pt-4">
                  <Label>Nova Anotação</Label>
                  <Textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Escreva suas anotações confidenciais aqui..."
                    rows={4}
                    className="mt-2"
                  />
                  <Button
                    className="w-full mt-3 bg-[#1e3a5f] text-white"
                    disabled={!noteText.trim() || addNoteMutation.isPending}
                    onClick={() => addNoteMutation.mutate({
                      sessionId: session.session.id,
                      churchId,
                      content: noteText,
                      confidential: true,
                    })}
                  >
                    {addNoteMutation.isPending ? "Salvando..." : "Salvar Anotação"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Aconselhamento() {
  const { churchId } = useChurch();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ personId: "", counselorId: "", scheduledAt: "", notes: "" });
  const utils = trpc.useUtils();

  const { data: sessions, isLoading } = trpc.aconselhamento.list.useQuery(
    { churchId: churchId! },
    { enabled: !!churchId }
  );
  const { data: people } = trpc.people.list.useQuery(
    { churchId: churchId! },
    { enabled: !!churchId }
  );

  const createMutation = trpc.aconselhamento.create.useMutation({
    onSuccess: () => {
      toast.success("Sessão agendada com sucesso!");
      setCreateOpen(false);
      setForm({ personId: "", counselorId: "", scheduledAt: "", notes: "" });
      utils.aconselhamento.list.invalidate();
    },
    onError: () => toast.error("Erro ao agendar sessão"),
  });

  if (!churchId) return null;

  const agendadas = (sessions ?? []).filter((s) => s.session.status === "agendado").length;
  const realizadas = (sessions ?? []).filter((s) => s.session.status === "realizado").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f] flex items-center gap-2">
            <Shield className="h-6 w-6 text-[#c9a84c]" />
            Aconselhamento Pastoral
          </h1>
          <p className="text-muted-foreground mt-1">Agenda e histórico de sessões — acesso restrito</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#1e3a5f] text-white hover:bg-[#1e3a5f]/90">
              <Plus className="h-4 w-4 mr-2" /> Agendar Sessão
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Agendar Sessão de Aconselhamento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Pessoa a ser aconselhada *</Label>
                <Select value={form.personId} onValueChange={(v) => setForm({ ...form, personId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a pessoa..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(people ?? []).map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.fullName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Aconselhador (Pastor/Líder) *</Label>
                <Select value={form.counselorId} onValueChange={(v) => setForm({ ...form, counselorId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o aconselhador..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(people ?? []).map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.fullName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data e Hora *</Label>
                <Input
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                />
              </div>
              <div>
                <Label>Observações iniciais</Label>
                <Textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Motivo, contexto (confidencial)..."
                  rows={3}
                />
              </div>
              <Button
                className="w-full bg-[#1e3a5f] text-white"
                disabled={!form.personId || !form.counselorId || !form.scheduledAt || createMutation.isPending}
                onClick={() => createMutation.mutate({
                  churchId: churchId!,
                  personId: Number(form.personId),
                  counselorId: Number(form.counselorId),
                  scheduledAt: new Date(form.scheduledAt),
                  notes: form.notes || undefined,
                })}
              >
                {createMutation.isPending ? "Agendando..." : "Agendar Sessão"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-[#c9a84c]/20">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-[#1e3a5f]">{sessions?.length ?? 0}</div>
            <div className="text-sm text-muted-foreground">Total de Sessões</div>
          </CardContent>
        </Card>
        <Card className="border-blue-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{agendadas}</div>
            <div className="text-sm text-muted-foreground">Agendadas</div>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{realizadas}</div>
            <div className="text-sm text-muted-foreground">Realizadas</div>
          </CardContent>
        </Card>
      </div>

      {/* Sessions list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Card key={i} className="animate-pulse h-24 bg-muted/30" />)}
        </div>
      ) : sessions && sessions.length > 0 ? (
        <div className="space-y-3">
          {sessions.map((session) => (
            <SessionCard key={session.session.id} session={session} churchId={churchId!} />
          ))}
        </div>
      ) : (
        <Card className="border-dashed border-[#1e3a5f]/20">
          <CardContent className="p-12 text-center">
            <Shield className="h-12 w-12 text-[#1e3a5f]/20 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#1e3a5f] mb-2">Nenhuma sessão agendada</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Agende a primeira sessão de aconselhamento pastoral.
            </p>
            <Button onClick={() => setCreateOpen(true)} className="bg-[#1e3a5f] text-white">
              <Plus className="h-4 w-4 mr-2" /> Agendar Primeira Sessão
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
