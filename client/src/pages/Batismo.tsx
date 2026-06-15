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
import { useState } from "react";
import { Droplets, Users, Award, Plus, Calendar, MapPin, User, Loader2 } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  inscrito: "bg-blue-100 text-blue-800",
  participou: "bg-yellow-100 text-yellow-800",
  concluiu: "bg-green-100 text-green-800",
  cancelado: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<string, string> = {
  inscrito: "Inscrito",
  participou: "Participou",
  concluiu: "Concluiu",
  cancelado: "Cancelado",
};

// Certificado PDF gerado via tRPC — ver BaptismClassCard para uso

function BaptismClassCard({ cls, churchId, people }: {
  cls: { id: number; name: string; date: string | Date; location?: string | null; pastor?: string | null; notes?: string | null; active: boolean };
  churchId: number;
  people: { id: number; fullName: string }[];
}) {
  const [selectedPersonId, setSelectedPersonId] = useState<string>("");
  const [enrollOpen, setEnrollOpen] = useState(false);
  const utils = trpc.useUtils();

  const { data: enrollments } = trpc.batismo.getEnrollments.useQuery({ classId: cls.id, churchId });

  const enrollMutation = trpc.batismo.enroll.useMutation({
    onSuccess: () => {
      toast.success("Inscrição realizada!");
      setEnrollOpen(false);
      setSelectedPersonId("");
      utils.batismo.getEnrollments.invalidate();
    },
    onError: () => toast.error("Erro ao inscrever"),
  });

  const updateMutation = trpc.batismo.updateEnrollment.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado!");
      utils.batismo.getEnrollments.invalidate();
    },
  });

  const [generatingCertFor, setGeneratingCertFor] = useState<number | null>(null);
  const certMutation = trpc.certificates.generate.useMutation({
    onSuccess: (data) => {
      window.open(data.url, "_blank");
      toast.success("Certificado de batismo gerado!");
      setGeneratingCertFor(null);
    },
    onError: () => {
      toast.error("Erro ao gerar certificado");
      setGeneratingCertFor(null);
    },
  });

  const total = enrollments?.length ?? 0;
  const concluidos = enrollments?.filter((e) => e.enrollment.status === "concluiu").length ?? 0;

  return (
    <Card className="border border-[#06b6d4]/20 hover:border-[#06b6d4]/50 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💧</span>
            <div>
              <CardTitle className="text-[#1e3a5f] text-lg">{cls.name}</CardTitle>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(cls.date).toLocaleDateString("pt-BR")}</span>
                {cls.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {cls.location}</span>}
                {cls.pastor && <span className="flex items-center gap-1"><User className="h-3 w-3" /> {cls.pastor}</span>}
              </div>
            </div>
          </div>
          <Badge variant={cls.active ? "default" : "secondary"}>{cls.active ? "Ativo" : "Encerrado"}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {cls.notes && <p className="text-sm text-muted-foreground mb-4">{cls.notes}</p>}
        <div className="flex gap-4 text-sm mb-4">
          <span className="flex items-center gap-1 text-muted-foreground"><Users className="h-4 w-4" /> {total} inscritos</span>
          <span className="flex items-center gap-1 text-green-600"><Award className="h-4 w-4" /> {concluidos} batizados</span>
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
                          status: val as "inscrito" | "participou" | "concluiu" | "cancelado",
                          completedAt: val === "concluiu" ? new Date() : null,
                        })
                      }
                    >
                      <SelectTrigger className="h-6 text-xs w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inscrito">Inscrito</SelectItem>
                        <SelectItem value="participou">Participou</SelectItem>
                        <SelectItem value="concluiu">Concluiu</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {enrollment.status === "concluiu" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-xs border-[#06b6d4] text-[#06b6d4]"
                      disabled={generatingCertFor === enrollment.id}
                      onClick={() => {
                        setGeneratingCertFor(enrollment.id);
                        certMutation.mutate({
                          type: "batismo",
                          memberName: person.fullName,
                          churchId,
                          personId: person.id,
                          enrollmentId: enrollment.id,
                          pastorName: cls.pastor ?? undefined,
                          date: String(cls.date),
                        });
                      }}
                    >
                      {generatingCertFor === enrollment.id
                        ? <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        : <Award className="h-3 w-3 mr-1" />}
                      Certificado
                    </Button>
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
              <DialogTitle>Inscrever em {cls.name}</DialogTitle>
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
                onClick={() => enrollMutation.mutate({ baptismClassId: cls.id, personId: Number(selectedPersonId), churchId })}
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

export default function Batismo() {
  const { churchId } = useChurch();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", date: "", location: "", pastor: "", notes: "" });
  const utils = trpc.useUtils();

  const { data: classes, isLoading } = trpc.batismo.listClasses.useQuery(
    { churchId: churchId! },
    { enabled: !!churchId }
  );
  const { data: people } = trpc.people.list.useQuery(
    { churchId: churchId! },
    { enabled: !!churchId }
  );

  const createMutation = trpc.batismo.createClass.useMutation({
    onSuccess: () => {
      toast.success("Turma de batismo criada!");
      setCreateOpen(false);
      setForm({ name: "", date: "", location: "", pastor: "", notes: "" });
      utils.batismo.listClasses.invalidate();
    },
    onError: () => toast.error("Erro ao criar turma"),
  });

  if (!churchId) return null;
  const simplePeople = (people ?? []).map((p) => ({ id: p.id, fullName: p.fullName }));

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f] flex items-center gap-2">
            <Droplets className="h-6 w-6 text-[#06b6d4]" />
            Batismo nas Águas
          </h1>
          <p className="text-muted-foreground mt-1">Gestão de turmas de batismo e certificados</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#1e3a5f] text-white hover:bg-[#1e3a5f]/90">
              <Plus className="h-4 w-4 mr-2" /> Nova Turma
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Turma de Batismo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Nome da Turma *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Batismo Julho 2025" />
              </div>
              <div>
                <Label>Data *</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div>
                <Label>Local</Label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Ex: Rio, Lago, Piscina..." />
              </div>
              <div>
                <Label>Pastor(a) Responsável</Label>
                <Input value={form.pastor} onChange={(e) => setForm({ ...form, pastor: e.target.value })} />
              </div>
              <div>
                <Label>Observações</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
              </div>
              <Button
                className="w-full bg-[#1e3a5f] text-white"
                disabled={!form.name || !form.date || createMutation.isPending}
                onClick={() => createMutation.mutate({ churchId: churchId!, ...form })}
              >
                {createMutation.isPending ? "Criando..." : "Criar Turma"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map((i) => <Card key={i} className="animate-pulse h-48 bg-muted/30" />)}
        </div>
      ) : classes && classes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {classes.map((cls) => (
            <BaptismClassCard key={cls.id} cls={cls} churchId={churchId!} people={simplePeople} />
          ))}
        </div>
      ) : (
        <Card className="border-dashed border-[#06b6d4]/30">
          <CardContent className="p-12 text-center">
            <Droplets className="h-12 w-12 text-[#06b6d4]/40 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#1e3a5f] mb-2">Nenhuma turma de batismo</h3>
            <p className="text-muted-foreground text-sm mb-4">Crie a primeira turma de batismo para começar a registrar os candidatos.</p>
            <Button onClick={() => setCreateOpen(true)} className="bg-[#1e3a5f] text-white">
              <Plus className="h-4 w-4 mr-2" /> Criar Primeira Turma
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
