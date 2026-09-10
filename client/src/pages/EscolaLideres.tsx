import { trpc } from "@/lib/trpc";
import { useChurch } from "@/components/ChurchLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AdaptiveFormDialogBody, AdaptiveFormDialogContent, AdaptiveFormDialogFooter, adaptiveFormDialogHeaderClassName } from "@/components/AdaptiveFormDialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Link } from "wouter";
import { useState } from "react";
import { GraduationCap, Users, Award, Plus, Calendar, User, Star, Loader2 } from "lucide-react";

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

// Certificado PDF gerado via tRPC — ver LeadershipClassCard para uso

function LeadershipClassCard({ cls, churchId, people }: {
  cls: { id: number; name: string; period?: string | null; startDate?: string | Date | null; endDate?: string | Date | null; pastor?: string | null; description?: string | null; active: boolean };
  churchId: number;
  people: { id: number; fullName: string }[];
}) {
  const [selectedPersonId, setSelectedPersonId] = useState<string>("");
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const { data: enrollments } = trpc.escolaLideres.getEnrollments.useQuery({ classId: cls.id, churchId });
  const { data: teachers } = trpc.escolaLideres.teachers.useQuery({ classId: cls.id, churchId });
  const { data: teacherCandidates } = trpc.escolaLideres.teacherCandidates.useQuery({ churchId });
  const [selectedTeacherId, setSelectedTeacherId] = useState("");

  const enrollMutation = trpc.escolaLideres.enroll.useMutation({
    onSuccess: () => {
      toast.success("Matrícula realizada!");
      setEnrollOpen(false);
      setSelectedPersonId("");
      utils.escolaLideres.getEnrollments.invalidate();
    },
    onError: (error) => {
      setEnrollError(error.message || "Erro ao matricular");
      toast.error(error.message || "Erro ao matricular");
    },
  });

  const assignTeacherMutation = trpc.escolaLideres.assignTeacher.useMutation({
    onSuccess: () => { toast.success("Professor atribuído à turma."); setSelectedTeacherId(""); utils.escolaLideres.teachers.invalidate(); },
    onError: (error) => toast.error(error.message || "Não foi possível atribuir o professor"),
  });

  const updateMutation = trpc.escolaLideres.updateEnrollment.useMutation({
    onSuccess: () => {
      setUpdateError(null);
      toast.success("Status atualizado!");
      utils.escolaLideres.getEnrollments.invalidate();
    },
    onError: (error) => {
      setUpdateError(error.message || "Erro ao atualizar status");
      toast.error(error.message || "Erro ao atualizar status");
    },
  });

  const [generatingCertFor, setGeneratingCertFor] = useState<number | null>(null);
  const certMutation = trpc.certificates.generate.useMutation({
    onSuccess: (data) => {
      window.open(data.url, "_blank");
      toast.success("Certificado de liderança gerado!");
      setGeneratingCertFor(null);
    },
    onError: () => {
      toast.error("Erro ao gerar certificado");
      setGeneratingCertFor(null);
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
        <div className="flex flex-wrap gap-4 text-sm mb-4">
          <span className="flex items-center gap-1 text-muted-foreground"><Users className="h-4 w-4" /> {total} alunos</span>
          <span className="flex items-center gap-1 text-purple-600"><Star className="h-4 w-4" /> {emFormacao} em formação</span>
          <span className="flex items-center gap-1 text-green-600"><Award className="h-4 w-4" /> {concluidos} formados</span>
        </div>

        <div className="mb-4 rounded-xl border border-[#c9a84c]/20 bg-[#fdfaf1] p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-xs font-semibold uppercase tracking-wide text-[#c9a84c]">Professores atribuídos</p><p className="text-sm text-muted-foreground">Somente professores atribuídos veem o diário desta turma.</p></div>
            <Link href="/app/escola-lideres/professor"><Button size="sm" variant="outline">Abrir painel do professor</Button></Link>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">{(teachers ?? []).map((item) => <Badge key={item.assignment.id} variant="secondary">{item.user.name}</Badge>)}{!(teachers ?? []).length ? <span className="text-xs text-muted-foreground">Nenhum professor atribuído.</span> : null}</div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row"><Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}><SelectTrigger className="sm:max-w-xs"><SelectValue placeholder="Selecionar usuário para ensinar" /></SelectTrigger><SelectContent>{(teacherCandidates ?? []).filter((candidate) => !(teachers ?? []).some((item) => item.user.id === candidate.id)).map((candidate) => <SelectItem key={candidate.id} value={String(candidate.id)}>{candidate.name}</SelectItem>)}</SelectContent></Select><Button type="button" size="sm" disabled={!selectedTeacherId || assignTeacherMutation.isPending} onClick={() => assignTeacherMutation.mutate({ churchId, classId: cls.id, churchUserId: Number(selectedTeacherId) })}>{assignTeacherMutation.isPending ? "Atribuindo..." : "Atribuir professor"}</Button></div>
        </div>

        {updateError && <div role="alert" className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{updateError}</div>}
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
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[enrollment.status ?? "matriculado"]}`}>
                    {STATUS_LABELS[enrollment.status ?? "matriculado"]}
                  </span>
                  {enrollment.status !== "concluido" && enrollment.status !== "cancelado" && (
                    <Select
                      value={enrollment.status ?? "matriculado"}
                      onValueChange={(val) => {
                        setUpdateError(null);
                        updateMutation.mutate({
                          id: enrollment.id,
                          churchId,
                          status: val as "matriculado" | "lider_em_formacao" | "concluido" | "cancelado",
                          completedAt: val === "concluido" ? new Date() : null,
                        });
                      }}
                    >
                      <SelectTrigger className="h-9 min-w-36 text-xs">
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
                      className="h-9 text-xs border-[#6366f1] text-[#6366f1]"
                      disabled={generatingCertFor === enrollment.id}
                      onClick={() => {
                        setGeneratingCertFor(enrollment.id);
                        certMutation.mutate({
                          type: "lideres",
                          memberName: person.fullName,
                          churchId,
                          personId: person.id,
                          enrollmentId: enrollment.id,
                          className: cls.name,
                          pastorName: cls.pastor ?? undefined,
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

        <Dialog open={enrollOpen} onOpenChange={(nextOpen) => { setEnrollOpen(nextOpen); if (nextOpen) setEnrollError(null); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="w-full bg-[#1e3a5f] hover:bg-[#1e3a5f]/90 text-white">
              <Plus className="h-4 w-4 mr-1" /> Matricular Aluno
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Matricular em {cls.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              {enrollError && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{enrollError}</div>}
              <Select value={selectedPersonId} onValueChange={(value) => { setEnrollError(null); setSelectedPersonId(value); }}>
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
  const [createError, setCreateError] = useState<string | null>(null);
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
    onError: (error) => {
      setCreateError(error.message || "Erro ao criar turma");
      toast.error(error.message || "Erro ao criar turma");
    },
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
        <div className="flex flex-wrap gap-2"><Link href="/app/escola-lideres/professor"><Button variant="outline">Painel do Professor</Button></Link><Dialog open={createOpen} onOpenChange={(nextOpen) => { setCreateOpen(nextOpen); if (nextOpen) setCreateError(null); }}>
          <DialogTrigger asChild>
            <Button className="bg-[#1e3a5f] text-white hover:bg-[#1e3a5f]/90">
              <Plus className="h-4 w-4 mr-2" /> Nova Turma
            </Button>
          </DialogTrigger>
          <AdaptiveFormDialogContent>
            <div className={adaptiveFormDialogHeaderClassName}>
              <DialogTitle>Nova Turma — Escola de Líderes</DialogTitle>
              <p className="mt-1 text-sm text-muted-foreground">Organize o período, responsável e objetivo da formação.</p>
            </div>
            <form className="contents" onSubmit={(event) => { event.preventDefault(); createMutation.mutate({ churchId: churchId!, name: form.name, period: form.period || undefined, startDate: form.startDate || undefined, endDate: form.endDate || undefined, pastor: form.pastor || undefined, description: form.description || undefined }); }}>
              <AdaptiveFormDialogBody className="space-y-4">
                {createError && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">{createError}</div>}
                <div>
                  <Label>Nome da Turma *</Label>
                  <Input value={form.name} onChange={(e) => { setCreateError(null); setForm({ ...form, name: e.target.value }); }} placeholder="Ex: Turma de Líderes 2025.1" />
                </div>
                <div>
                  <Label>Período</Label>
                  <Input value={form.period} onChange={(e) => { setCreateError(null); setForm({ ...form, period: e.target.value }); }} placeholder="Ex: 1º Semestre 2025" />
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <Label>Início</Label>
                    <Input type="date" value={form.startDate} onChange={(e) => { setCreateError(null); setForm({ ...form, startDate: e.target.value }); }} />
                  </div>
                  <div>
                    <Label>Término</Label>
                    <Input type="date" value={form.endDate} onChange={(e) => { setCreateError(null); setForm({ ...form, endDate: e.target.value }); }} />
                  </div>
                </div>
                <div>
                  <Label>Pastor(a) Responsável</Label>
                  <Input value={form.pastor} onChange={(e) => { setCreateError(null); setForm({ ...form, pastor: e.target.value }); }} />
                </div>
                <div>
                  <Label>Descrição</Label>
                  <Textarea value={form.description} onChange={(e) => { setCreateError(null); setForm({ ...form, description: e.target.value }); }} rows={3} />
                </div>
              </AdaptiveFormDialogBody>
              <AdaptiveFormDialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={createMutation.isPending}>Cancelar</Button>
                <Button type="submit" className="bg-[#1e3a5f] text-white" disabled={!form.name || createMutation.isPending}>{createMutation.isPending ? "Criando..." : "Criar Turma"}</Button>
              </AdaptiveFormDialogFooter>
            </form>
          </AdaptiveFormDialogContent>
        </Dialog></div>
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
