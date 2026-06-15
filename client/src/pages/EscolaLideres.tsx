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
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { GraduationCap, Users, Award, Plus, Calendar, User, Star } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  matriculado: "bg-blue-100 text-blue-800",
  lider_em_formacao: "bg-purple-100 text-purple-800",
  concluido: "bg-green-100 text-green-800",
  cancelado: "bg-red-100 text-red-800",
};

const STATUS_LABELS: Record<string, string> = {
  matriculado: "Matriculado",
  lider_em_formacao: "Líder em Formação",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

function generateLeadershipCertificate(personName: string, className: string, period: string, churchName: string) {
  const date = new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Cormorant+Garamond:ital,wght@0,400;1,400&display=swap');
  body { margin: 0; background: #f0f0ff; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: 'Cormorant Garamond', serif; }
  .cert { width: 800px; background: linear-gradient(135deg, #fffdf7 0%, #f0f0ff 100%); border: 3px solid #6366f1; padding: 60px; text-align: center; position: relative; box-shadow: 0 8px 32px rgba(0,0,0,0.15); }
  .cert::before { content: ''; position: absolute; inset: 12px; border: 1px solid #6366f1; pointer-events: none; }
  .ornament { color: #6366f1; font-size: 2rem; margin: 0 12px; }
  .title { font-family: 'Playfair Display', serif; color: #1e3a5f; font-size: 2.8rem; margin: 20px 0 8px; }
  .subtitle { color: #6366f1; font-size: 1.1rem; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 40px; }
  .body-text { color: #4a4a4a; font-size: 1.2rem; line-height: 1.8; margin: 12px 0; }
  .name { font-family: 'Playfair Display', serif; color: #1e3a5f; font-size: 2rem; margin: 16px 0; border-bottom: 2px solid #6366f1; display: inline-block; padding-bottom: 4px; }
  .course { color: #6366f1; font-size: 1.4rem; font-style: italic; margin: 8px 0; }
  .seal { width: 80px; height: 80px; border-radius: 50%; background: #1e3a5f; color: #6366f1; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 20px auto; }
  .verse { color: #888; font-size: 0.95rem; font-style: italic; margin-top: 30px; border-top: 1px solid #6366f1; padding-top: 20px; }
</style>
</head>
<body>
<div class="cert">
  <div><span class="ornament">⭐</span><span class="ornament">✦</span><span class="ornament">⭐</span></div>
  <div class="title">Certificado de Liderança</div>
  <div class="subtitle">Escola de Líderes</div>
  <div class="seal">👑</div>
  <div class="body-text">Certificamos que</div>
  <div class="name">${personName}</div>
  <div class="body-text">concluiu com excelência a</div>
  <div class="course">${className}</div>
  ${period ? `<div class="body-text" style="color:#888;font-size:1rem;">${period}</div>` : ""}
  <div class="body-text">na <strong>${churchName}</strong></div>
  <div class="body-text" style="color:#6366f1;">Certificado em ${date}</div>
  <div class="verse">"E o que ouviste de mim por muitas testemunhas, isso confia a homens fiéis, que sejam idôneos para também ensinarem os outros." — 2 Timóteo 2:2</div>
</div>
</body>
</html>`;
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `certificado-lideranca-${personName.toLowerCase().replace(/\s+/g, "-")}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

function LeadershipClassCard({ cls, churchId, people }: {
  cls: { id: number; name: string; period?: string | null; startDate?: string | Date | null; endDate?: string | Date | null; pastor?: string | null; description?: string | null; active: boolean };
  churchId: number;
  people: { id: number; fullName: string }[];
}) {
  const [selectedPersonId, setSelectedPersonId] = useState<string>("");
  const [enrollOpen, setEnrollOpen] = useState(false);
  const utils = trpc.useUtils();

  const { data: enrollments } = trpc.escolaLideres.getEnrollments.useQuery({ classId: cls.id, churchId });

  const enrollMutation = trpc.escolaLideres.enroll.useMutation({
    onSuccess: () => {
      toast.success("Matrícula realizada!");
      setEnrollOpen(false);
      setSelectedPersonId("");
      utils.escolaLideres.getEnrollments.invalidate();
    },
    onError: () => toast.error("Erro ao matricular"),
  });

  const updateMutation = trpc.escolaLideres.updateEnrollment.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado!");
      utils.escolaLideres.getEnrollments.invalidate();
    },
  });

  const total = enrollments?.length ?? 0;
  const concluidos = enrollments?.filter((e) => e.enrollment.status === "concluido").length ?? 0;
  const emFormacao = enrollments?.filter((e) => e.enrollment.status === "lider_em_formacao").length ?? 0;

  return (
    <Card className="border border-[#6366f1]/20 hover:border-[#6366f1]/50 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">👑</span>
            <div>
              <CardTitle className="text-[#1e3a5f] text-lg">{cls.name}</CardTitle>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                {cls.period && <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {cls.period}</span>}
                {cls.pastor && <span className="flex items-center gap-1"><User className="h-3 w-3" /> {cls.pastor}</span>}
              </div>
            </div>
          </div>
          <Badge variant={cls.active ? "default" : "secondary"}>{cls.active ? "Ativo" : "Encerrado"}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {cls.description && <p className="text-sm text-muted-foreground mb-4">{cls.description}</p>}
        <div className="flex gap-4 text-sm mb-4">
          <span className="flex items-center gap-1 text-muted-foreground"><Users className="h-4 w-4" /> {total} alunos</span>
          <span className="flex items-center gap-1 text-purple-600"><Star className="h-4 w-4" /> {emFormacao} em formação</span>
          <span className="flex items-center gap-1 text-green-600"><Award className="h-4 w-4" /> {concluidos} formados</span>
        </div>

        {enrollments && enrollments.length > 0 && (
          <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
            {enrollments.map(({ enrollment, person }) => (
              <div key={enrollment.id} className="flex items-center justify-between p-2 rounded bg-muted/30">
                <div>
                  <span className="text-sm font-medium">{person.fullName}</span>
                  {enrollment.attendance != null && (
                    <div className="flex items-center gap-2 mt-1">
                      <Progress value={enrollment.attendance} className="h-1 w-16" />
                      <span className="text-xs text-muted-foreground">{enrollment.attendance}% presença</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[enrollment.status ?? "matriculado"]}`}>
                    {STATUS_LABELS[enrollment.status ?? "matriculado"]}
                  </span>
                  {enrollment.status !== "concluido" && enrollment.status !== "cancelado" && (
                    <Select
                      value={enrollment.status ?? "matriculado"}
                      onValueChange={(val) =>
                        updateMutation.mutate({
                          id: enrollment.id,
                          churchId,
                          status: val as "matriculado" | "lider_em_formacao" | "concluido" | "cancelado",
                          completedAt: val === "concluido" ? new Date() : null,
                        })
                      }
                    >
                      <SelectTrigger className="h-6 text-xs w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="matriculado">Matriculado</SelectItem>
                        <SelectItem value="lider_em_formacao">Líder em Formação</SelectItem>
                        <SelectItem value="concluido">Concluído</SelectItem>
                        <SelectItem value="cancelado">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {enrollment.status === "concluido" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-xs border-[#6366f1] text-[#6366f1]"
                      onClick={() => generateLeadershipCertificate(
                        person.fullName,
                        cls.name,
                        cls.period ?? "",
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
              <Plus className="h-4 w-4 mr-1" /> Matricular Aluno
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Matricular em {cls.name}</DialogTitle>
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
                onClick={() => enrollMutation.mutate({ classId: cls.id, personId: Number(selectedPersonId), churchId })}
              >
                {enrollMutation.isPending ? "Matriculando..." : "Confirmar Matrícula"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

export default function EscolaLideres() {
  const { churchId } = useChurch();
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: "", period: "", startDate: "", endDate: "", pastor: "", description: "" });
  const utils = trpc.useUtils();

  const { data: classes, isLoading } = trpc.escolaLideres.listClasses.useQuery(
    { churchId: churchId! },
    { enabled: !!churchId }
  );
  const { data: people } = trpc.people.list.useQuery(
    { churchId: churchId! },
    { enabled: !!churchId }
  );

  const createMutation = trpc.escolaLideres.createClass.useMutation({
    onSuccess: () => {
      toast.success("Turma criada com sucesso!");
      setCreateOpen(false);
      setForm({ name: "", period: "", startDate: "", endDate: "", pastor: "", description: "" });
      utils.escolaLideres.listClasses.invalidate();
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
            <GraduationCap className="h-6 w-6 text-[#6366f1]" />
            Escola de Líderes
          </h1>
          <p className="text-muted-foreground mt-1">Formação e capacitação de líderes para multiplicação</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#1e3a5f] text-white hover:bg-[#1e3a5f]/90">
              <Plus className="h-4 w-4 mr-2" /> Nova Turma
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Turma — Escola de Líderes</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Nome da Turma *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Turma de Líderes 2025.1" />
              </div>
              <div>
                <Label>Período</Label>
                <Input value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value })} placeholder="Ex: 1º Semestre 2025" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Início</Label>
                  <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                </div>
                <div>
                  <Label>Término</Label>
                  <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                </div>
              </div>
              <div>
                <Label>Pastor(a) Responsável</Label>
                <Input value={form.pastor} onChange={(e) => setForm({ ...form, pastor: e.target.value })} />
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
              </div>
              <Button
                className="w-full bg-[#1e3a5f] text-white"
                disabled={!form.name || createMutation.isPending}
                onClick={() => createMutation.mutate({
                  churchId: churchId!,
                  name: form.name,
                  period: form.period || undefined,
                  startDate: form.startDate || undefined,
                  endDate: form.endDate || undefined,
                  pastor: form.pastor || undefined,
                  description: form.description || undefined,
                })}
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
            <LeadershipClassCard key={cls.id} cls={cls} churchId={churchId!} people={simplePeople} />
          ))}
        </div>
      ) : (
        <Card className="border-dashed border-[#6366f1]/30">
          <CardContent className="p-12 text-center">
            <GraduationCap className="h-12 w-12 text-[#6366f1]/40 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#1e3a5f] mb-2">Nenhuma turma cadastrada</h3>
            <p className="text-muted-foreground text-sm mb-4">Crie a primeira turma da Escola de Líderes para começar a formar novos líderes.</p>
            <Button onClick={() => setCreateOpen(true)} className="bg-[#1e3a5f] text-white">
              <Plus className="h-4 w-4 mr-2" /> Criar Primeira Turma
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
