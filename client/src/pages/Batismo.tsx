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
import { Droplets, Users, Award, Plus, Calendar, MapPin, User } from "lucide-react";

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

function generateBaptismCertificate(personName: string, date: string, location: string, pastor: string, churchName: string) {
  const formattedDate = new Date(date).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Cormorant+Garamond:ital,wght@0,400;1,400&display=swap');
  body { margin: 0; background: #e8f4f8; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: 'Cormorant Garamond', serif; }
  .cert { width: 800px; background: linear-gradient(135deg, #fffdf7 0%, #e8f4f8 100%); border: 3px solid #06b6d4; padding: 60px; text-align: center; position: relative; box-shadow: 0 8px 32px rgba(0,0,0,0.15); }
  .cert::before { content: ''; position: absolute; inset: 12px; border: 1px solid #06b6d4; pointer-events: none; }
  .ornament { color: #06b6d4; font-size: 2rem; margin: 0 12px; }
  .title { font-family: 'Playfair Display', serif; color: #1e3a5f; font-size: 2.8rem; margin: 20px 0 8px; }
  .subtitle { color: #06b6d4; font-size: 1.1rem; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 40px; }
  .body-text { color: #4a4a4a; font-size: 1.2rem; line-height: 1.8; margin: 12px 0; }
  .name { font-family: 'Playfair Display', serif; color: #1e3a5f; font-size: 2rem; margin: 16px 0; border-bottom: 2px solid #06b6d4; display: inline-block; padding-bottom: 4px; }
  .detail { color: #06b6d4; font-size: 1rem; font-style: italic; margin: 4px 0; }
  .seal { width: 80px; height: 80px; border-radius: 50%; background: #1e3a5f; color: #06b6d4; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; margin: 20px auto; }
  .verse { color: #888; font-size: 0.95rem; font-style: italic; margin-top: 30px; border-top: 1px solid #06b6d4; padding-top: 20px; }
</style>
</head>
<body>
<div class="cert">
  <div><span class="ornament">💧</span><span class="ornament">✝</span><span class="ornament">💧</span></div>
  <div class="title">Certificado de Batismo</div>
  <div class="subtitle">Nas Águas</div>
  <div class="seal">💧</div>
  <div class="body-text">Certificamos que</div>
  <div class="name">${personName}</div>
  <div class="body-text">foi batizado(a) nas águas em</div>
  <div class="detail">📅 ${formattedDate}</div>
  ${location ? `<div class="detail">📍 ${location}</div>` : ""}
  ${pastor ? `<div class="detail">👤 Pastor(a): ${pastor}</div>` : ""}
  <div class="body-text" style="margin-top:20px;">na <strong>${churchName}</strong></div>
  <div class="verse">"Portanto ide, fazei discípulos de todas as nações, batizando-os em nome do Pai, e do Filho, e do Espírito Santo." — Mateus 28:19</div>
</div>
</body>
</html>`;
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `certificado-batismo-${personName.toLowerCase().replace(/\s+/g, "-")}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

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
                      onClick={() => generateBaptismCertificate(
                        person.fullName,
                        String(cls.date),
                        cls.location ?? "",
                        cls.pastor ?? "",
                        "Igreja"
                      )}
                    >
                      <Award className="h-3 w-3 mr-1" /> Certificado
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
