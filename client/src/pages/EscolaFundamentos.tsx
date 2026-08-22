import { trpc } from "@/lib/trpc";
import { useChurch } from "@/components/ChurchLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { Award, BookOpen, CheckCircle, Clock, Eye, EyeOff, FileText, GraduationCap, Loader2, Pencil, Plus, ShieldCheck, UserPlus, UserRoundCog, Users } from "lucide-react";

const COURSE_TYPES = [
  { value: "salvacao", label: "Salvação", icon: "✝️" },
  { value: "oracao", label: "Oração", icon: "🙏" },
  { value: "biblia", label: "Bíblia", icon: "📖" },
  { value: "igreja", label: "Igreja", icon: "⛪" },
  { value: "espirito_santo", label: "Espírito Santo", icon: "🕊️" },
  { value: "batismo", label: "Batismo nas Águas", icon: "💧" },
  { value: "outro", label: "Outro", icon: "📚" },
] as const;

const STATUS_COLORS: Record<string, string> = {
  matriculado: "bg-blue-100 text-blue-800",
  em_andamento: "bg-yellow-100 text-yellow-800",
  concluido: "bg-green-100 text-green-800",
};

const STATUS_LABELS: Record<string, string> = {
  matriculado: "Matriculado",
  em_andamento: "Em Andamento",
  concluido: "Concluído",
};

type Course = { id: number; name: string; type: string; description?: string | null; active: boolean };
type Person = { id: number; fullName: string };

function StudyReader({ churchId, courseId, canManage }: { churchId: number; courseId: number; canManage: boolean }) {
  const { data: studies } = trpc.escolaFundamentos.listStudies.useQuery({ churchId, courseId });

  if (!studies?.length) return null;

  return (
    <div className="mb-4 rounded-xl border border-[#c9a84c]/20 bg-[#fdfaf1] p-3">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#1e3a5f]">
        <FileText className="h-4 w-4 text-[#c9a84c]" /> Estudos desta turma
      </div>
      <div className="space-y-2">
        {studies.map((study) => (
          <details key={study.id} className="group rounded-lg bg-white/80 px-3 py-2">
            <summary className="cursor-pointer list-none text-sm font-medium text-[#1e3a5f]">
              <span className="mr-2 text-[#c9a84c]">{study.position + 1}.</span>{study.title}
              {canManage && !study.active ? <Badge className="ml-2" variant="secondary">Rascunho</Badge> : null}
            </summary>
            {study.summary ? <p className="mt-2 text-sm text-muted-foreground">{study.summary}</p> : null}
            {study.content ? <p className="mt-3 whitespace-pre-line border-t pt-3 text-sm leading-6 text-slate-700">{study.content}</p> : null}
          </details>
        ))}
      </div>
    </div>
  );
}

function CourseCard({ course, churchId, people, canManage }: { course: Course; churchId: number; people: Person[]; canManage: boolean }) {
  const [selectedPersonId, setSelectedPersonId] = useState("");
  const [enrollOpen, setEnrollOpen] = useState(false);
  const utils = trpc.useUtils();
  const { data: enrollments } = trpc.escolaFundamentos.getEnrollments.useQuery(
    { courseId: course.id, churchId },
    { enabled: canManage }
  );
  const enrollMutation = trpc.escolaFundamentos.enroll.useMutation({
    onSuccess: () => {
      toast.success("Matrícula realizada com sucesso!");
      setEnrollOpen(false);
      setSelectedPersonId("");
      utils.escolaFundamentos.getEnrollments.invalidate();
    },
    onError: (error) => toast.error(error.message || "Erro ao realizar matrícula"),
  });
  const updateMutation = trpc.escolaFundamentos.updateEnrollment.useMutation({
    onSuccess: () => { toast.success("Status atualizado!"); utils.escolaFundamentos.getEnrollments.invalidate(); },
    onError: (error) => toast.error(error.message || "Erro ao atualizar"),
  });
  const [generatingCertFor, setGeneratingCertFor] = useState<number | null>(null);
  const certMutation = trpc.certificates.generate.useMutation({
    onSuccess: (data) => { window.open(data.url, "_blank"); toast.success("Certificado gerado com sucesso!"); setGeneratingCertFor(null); },
    onError: () => { toast.error("Erro ao gerar certificado"); setGeneratingCertFor(null); },
  });
  const courseInfo = COURSE_TYPES.find((item) => item.value === course.type);
  const total = enrollments?.length ?? 0;
  const emAndamento = enrollments?.filter((item) => item.enrollment.status === "em_andamento").length ?? 0;
  const concluidos = enrollments?.filter((item) => item.enrollment.status === "concluido").length ?? 0;

  return (
    <Card className="border border-[#c9a84c]/20 transition-colors hover:border-[#c9a84c]/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="text-2xl">{courseInfo?.icon ?? "📚"}</span>
            <div className="min-w-0"><CardTitle className="truncate text-lg text-[#1e3a5f]">{course.name}</CardTitle><p className="text-sm text-muted-foreground">{courseInfo?.label}</p></div>
          </div>
          <Badge variant={course.active ? "default" : "secondary"}>{course.active ? "Ativo" : "Inativo"}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {course.description ? <p className="mb-4 text-sm text-muted-foreground">{course.description}</p> : null}
        {canManage ? (
          <div className="mb-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            <span className="flex items-center gap-1 text-muted-foreground"><Users className="h-4 w-4" /> {total} matriculados</span>
            <span className="flex items-center gap-1 text-amber-700"><Clock className="h-4 w-4" /> {emAndamento} em andamento</span>
            <span className="flex items-center gap-1 text-green-600"><CheckCircle className="h-4 w-4" /> {concluidos} concluídos</span>
          </div>
        ) : null}
        <StudyReader churchId={churchId} courseId={course.id} canManage={canManage} />
        {canManage && enrollments?.length ? (
          <div className="mb-4 max-h-52 space-y-2 overflow-y-auto pr-1">
            {enrollments.map(({ enrollment, person }) => (
              <div key={enrollment.id} className="flex flex-col gap-2 rounded bg-muted/30 p-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="min-w-0 truncate text-sm font-medium">{person.fullName}</span>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_COLORS[enrollment.status ?? "matriculado"]}`}>{STATUS_LABELS[enrollment.status ?? "matriculado"]}</span>
                  {enrollment.status !== "concluido" ? <Select value={enrollment.status ?? "matriculado"} onValueChange={(value) => updateMutation.mutate({ id: enrollment.id, churchId, status: value as "matriculado" | "em_andamento" | "concluido", completedAt: value === "concluido" ? new Date() : null })}><SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="matriculado">Matriculado</SelectItem><SelectItem value="em_andamento">Em andamento</SelectItem><SelectItem value="concluido">Concluído</SelectItem></SelectContent></Select> : <Button size="sm" variant="outline" className="h-7 border-[#c9a84c] text-xs text-[#c9a84c]" disabled={generatingCertFor === enrollment.id} onClick={() => { setGeneratingCertFor(enrollment.id); certMutation.mutate({ type: "fundamentos", memberName: person.fullName, churchId, personId: person.id, enrollmentId: enrollment.id, courseName: course.name }); }}>{generatingCertFor === enrollment.id ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Award className="mr-1 h-3 w-3" />}Certificado</Button>}
                </div>
              </div>
            ))}
          </div>
        ) : null}
        {canManage ? <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}><DialogTrigger asChild><Button size="sm" className="w-full bg-[#1e3a5f] text-white hover:bg-[#1e3a5f]/90"><Plus className="mr-1 h-4 w-4" /> Matricular Pessoa</Button></DialogTrigger><DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md"><DialogHeader><DialogTitle>Matricular em {course.name}</DialogTitle></DialogHeader><div className="space-y-4 pt-2"><Select value={selectedPersonId} onValueChange={setSelectedPersonId}><SelectTrigger><SelectValue placeholder="Selecione a pessoa..." /></SelectTrigger><SelectContent>{people.map((person) => <SelectItem key={person.id} value={String(person.id)}>{person.fullName}</SelectItem>)}</SelectContent></Select><Button className="w-full bg-[#1e3a5f] text-white" disabled={!selectedPersonId || enrollMutation.isPending} onClick={() => enrollMutation.mutate({ courseId: course.id, personId: Number(selectedPersonId), churchId })}>{enrollMutation.isPending ? "Matriculando..." : "Confirmar matrícula"}</Button></div></DialogContent></Dialog> : null}
      </CardContent>
    </Card>
  );
}

function StudyManagement({ churchId, courses, canManageAdministrators }: { churchId: number; courses: Course[]; canManageAdministrators: boolean }) {
  const [courseId, setCourseId] = useState<string>("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [administratorId, setAdministratorId] = useState("");
  const utils = trpc.useUtils();
  useEffect(() => { if (!courseId && courses[0]) setCourseId(String(courses[0].id)); }, [courseId, courses]);
  const selectedCourseId = Number(courseId);
  const { data: studies } = trpc.escolaFundamentos.listStudies.useQuery({ churchId, courseId: selectedCourseId }, { enabled: Boolean(selectedCourseId) });
  const { data: accounts } = trpc.churchAuth.listUsers.useQuery({ churchId }, { enabled: canManageAdministrators });
  const { data: administrators } = trpc.escolaFundamentos.listStudyAdministrators.useQuery({ churchId }, { enabled: canManageAdministrators });
  const clearStudyForm = () => { setEditingId(null); setTitle(""); setSummary(""); setContent(""); };
  const saveStudy = trpc.escolaFundamentos.createStudy.useMutation({
    onSuccess: () => { toast.success("Estudo salvo com sucesso."); clearStudyForm(); utils.escolaFundamentos.listStudies.invalidate(); },
    onError: (error) => toast.error(error.message || "Não foi possível salvar o estudo."),
  });
  const editStudy = trpc.escolaFundamentos.updateStudy.useMutation({
    onSuccess: () => { toast.success("Estudo atualizado."); clearStudyForm(); utils.escolaFundamentos.listStudies.invalidate(); },
    onError: (error) => toast.error(error.message || "Não foi possível atualizar o estudo."),
  });
  const assignAdministrator = trpc.escolaFundamentos.assignStudyAdministrator.useMutation({
    onSuccess: () => { toast.success("Administrador de estudos definido."); setAdministratorId(""); utils.escolaFundamentos.listStudyAdministrators.invalidate(); },
    onError: (error) => toast.error(error.message || "Não foi possível definir o administrador."),
  });
  const removeAdministrator = trpc.escolaFundamentos.removeStudyAdministrator.useMutation({
    onSuccess: () => { toast.success("Administrador removido."); utils.escolaFundamentos.listStudyAdministrators.invalidate(); },
    onError: (error) => toast.error(error.message || "Não foi possível remover o administrador."),
  });
  const handleSave = () => {
    if (!selectedCourseId) return toast.error("Selecione a turma do estudo.");
    if (title.trim().length < 3) return toast.error("Informe um título com ao menos 3 caracteres.");
    if (editingId) editStudy.mutate({ id: editingId, churchId, title, summary: summary || null, content: content || null });
    else saveStudy.mutate({ churchId, courseId: selectedCourseId, title, summary: summary || undefined, content: content || undefined });
  };
  const currentAdministrators = new Set((administrators ?? []).map((administrator) => administrator.churchUserId));

  return (
    <div className="space-y-5">
      <Card className="border-[#c9a84c]/30"><CardHeader><CardTitle className="flex items-center gap-2 text-[#1e3a5f]"><FileText className="h-5 w-5 text-[#c9a84c]" /> Gerenciar estudos</CardTitle><p className="text-sm font-normal text-muted-foreground">Crie o conteúdo por turma. Somente gestores autorizados visualizam estes controles.</p></CardHeader><CardContent className="space-y-4"><div className="space-y-2"><Label>Turma</Label><Select value={courseId} onValueChange={setCourseId}><SelectTrigger><SelectValue placeholder="Selecione uma turma" /></SelectTrigger><SelectContent>{courses.map((course) => <SelectItem key={course.id} value={String(course.id)}>{course.name}</SelectItem>)}</SelectContent></Select></div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="study-title">Título do estudo</Label><Input id="study-title" maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Ex.: A graça e a salvação" /></div><div className="space-y-2"><Label htmlFor="study-summary">Resumo</Label><Input id="study-summary" maxLength={500} value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Objetivo deste encontro" /></div></div><div className="space-y-2"><Label htmlFor="study-content">Conteúdo do estudo</Label><Textarea id="study-content" maxLength={12000} className="min-h-36" value={content} onChange={(event) => setContent(event.target.value)} placeholder="Escreva os pontos, versículos e orientações do estudo." /></div><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{editingId ? <Button variant="outline" onClick={clearStudyForm}>Cancelar edição</Button> : null}<Button className="bg-[#1e3a5f] text-white" disabled={saveStudy.isPending || editStudy.isPending} onClick={handleSave}>{saveStudy.isPending || editStudy.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Pencil className="mr-2 h-4 w-4" />}{editingId ? "Salvar alterações" : "Criar estudo"}</Button></div></CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base text-[#1e3a5f]">Estudos cadastrados</CardTitle></CardHeader><CardContent>{!selectedCourseId ? <p className="text-sm text-muted-foreground">Crie uma turma para começar a organizar seus estudos.</p> : studies?.length ? <div className="space-y-2">{studies.map((study) => <div key={study.id} className="flex flex-col gap-3 rounded-lg border border-border/70 p-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate font-medium text-[#1e3a5f]">{study.position + 1}. {study.title}</p><p className="line-clamp-2 text-sm text-muted-foreground">{study.summary || "Sem resumo"}</p></div><div className="flex flex-wrap gap-2"><Badge variant={study.active ? "default" : "secondary"}>{study.active ? "Publicado" : "Rascunho"}</Badge><Button variant="outline" size="sm" onClick={() => { setEditingId(study.id); setTitle(study.title); setSummary(study.summary ?? ""); setContent(study.content ?? ""); }}><Pencil className="mr-1 h-3 w-3" />Editar estudo</Button><Button variant="outline" size="sm" onClick={() => editStudy.mutate({ id: study.id, churchId, active: !study.active })}>{study.active ? <EyeOff className="mr-1 h-3 w-3" /> : <Eye className="mr-1 h-3 w-3" />}{study.active ? "Ocultar" : "Publicar"}</Button></div></div>)}</div> : <p className="text-sm text-muted-foreground">Ainda não há estudos nesta turma.</p>}</CardContent></Card>
      {canManageAdministrators ? <Card className="border-[#1e3a5f]/20"><CardHeader><CardTitle className="flex items-center gap-2 text-[#1e3a5f]"><UserRoundCog className="h-5 w-5 text-[#c9a84c]" /> Administradores de estudos</CardTitle><p className="text-sm font-normal text-muted-foreground">O Pastor escolhe contas ativas que poderão criar, editar, publicar estudos e conduzir as turmas.</p></CardHeader><CardContent className="space-y-4"><div className="flex flex-col gap-2 sm:flex-row"><Select value={administratorId} onValueChange={setAdministratorId}><SelectTrigger className="flex-1"><SelectValue placeholder="Selecione uma conta ativa" /></SelectTrigger><SelectContent>{(accounts ?? []).filter((account) => account.active && !currentAdministrators.has(account.id)).map((account) => <SelectItem key={account.id} value={String(account.id)}>{account.name} · {account.email}</SelectItem>)}</SelectContent></Select><Button disabled={!administratorId || assignAdministrator.isPending} onClick={() => assignAdministrator.mutate({ churchId, churchUserId: Number(administratorId) })}><ShieldCheck className="mr-2 h-4 w-4" />Autorizar</Button></div>{administrators?.length ? <div className="space-y-2">{administrators.map((administrator) => <div key={administrator.churchUserId} className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 p-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-[#1e3a5f]">{administrator.name}</p><p className="truncate text-xs text-muted-foreground">{administrator.email}</p></div><Button variant="outline" size="sm" onClick={() => removeAdministrator.mutate({ churchId, churchUserId: administrator.churchUserId })}>Remover</Button></div>)}</div> : <p className="text-sm text-muted-foreground">Nenhum administrador adicional foi definido.</p>}</CardContent></Card> : null}
    </div>
  );
}

export default function EscolaFundamentos() {
  const { churchId } = useChurch();
  const [createOpen, setCreateOpen] = useState(false);
  const [courseName, setCourseName] = useState("");
  const [courseType, setCourseType] = useState<(typeof COURSE_TYPES)[number]["value"]>("salvacao");
  const [courseDescription, setCourseDescription] = useState("");
  const utils = trpc.useUtils();
  const { data: access } = trpc.escolaFundamentos.access.useQuery({ churchId: churchId! }, { enabled: Boolean(churchId) });
  const canManageStudies = Boolean(access?.canManageStudies);
  const { data: courses, isLoading } = trpc.escolaFundamentos.listCourses.useQuery({ churchId: churchId! }, { enabled: Boolean(churchId) });
  const { data: people } = trpc.people.list.useQuery({ churchId: churchId! }, { enabled: Boolean(churchId && canManageStudies) });
  const createCourseMutation = trpc.escolaFundamentos.createCourse.useMutation({
    onSuccess: () => { toast.success("Turma criada. O próximo passo é matricular os participantes."); setCreateOpen(false); setCourseName(""); setCourseType("salvacao"); setCourseDescription(""); utils.escolaFundamentos.listCourses.invalidate(); },
    onError: (error) => toast.error(error.message || "Não foi possível criar a turma."),
  });
  if (!churchId) return null;
  const simplePeople = (people ?? []).map((person) => ({ id: person.id, fullName: person.fullName }));
  const typedCourses = (courses ?? []) as Course[];
  const submitNewCourse = () => {
    if (courseName.trim().length < 3) return toast.error("Informe um nome com ao menos 3 caracteres.");
    createCourseMutation.mutate({ churchId, name: courseName, type: courseType, description: courseDescription || undefined });
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="flex items-center gap-2 text-2xl font-bold text-[#1e3a5f]"><BookOpen className="h-6 w-6 text-[#c9a84c]" />Escola de Fundamentos</h1><p className="mt-1 text-muted-foreground">Estudos de base para o crescimento espiritual dos membros</p></div>{canManageStudies ? <Dialog open={createOpen} onOpenChange={setCreateOpen}><DialogTrigger asChild><Button className="w-full bg-[#1e3a5f] text-white hover:bg-[#1e3a5f]/90 sm:w-auto"><Plus className="mr-2 h-4 w-4" />Criar turma</Button></DialogTrigger><DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md"><DialogHeader><DialogTitle className="font-display text-[#1e3a5f]">Criar turma de Fundamentos</DialogTitle></DialogHeader><div className="space-y-4 pt-2"><p className="text-sm text-muted-foreground">Depois de criar a turma, organize os estudos, matricule as Pessoas e acompanhe o progresso.</p><div className="space-y-2"><Label htmlFor="foundation-course-name">Nome da turma</Label><Input id="foundation-course-name" value={courseName} onChange={(event) => setCourseName(event.target.value)} placeholder="Ex.: Fundamentos da Fé — 1º semestre" maxLength={120} /></div><div className="space-y-2"><Label>Área de fundamento</Label><Select value={courseType} onValueChange={(value) => setCourseType(value as typeof courseType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{COURSE_TYPES.map((course) => <SelectItem key={course.value} value={course.value}>{course.icon} {course.label}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label htmlFor="foundation-course-description">Descrição opcional</Label><Textarea id="foundation-course-description" value={courseDescription} onChange={(event) => setCourseDescription(event.target.value)} placeholder="Explique brevemente o propósito desta turma." maxLength={500} /></div><Button className="w-full bg-[#1e3a5f] text-white" disabled={createCourseMutation.isPending} onClick={submitNewCourse}>{createCourseMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GraduationCap className="mr-2 h-4 w-4" />}Criar turma</Button></div></DialogContent></Dialog> : null}</div>
      <Tabs defaultValue="turmas" className="space-y-5"><TabsList className="h-auto w-full flex-wrap justify-start gap-1 bg-[#f6f1e6] p-1"><TabsTrigger value="turmas">Turmas e estudos</TabsTrigger>{canManageStudies ? <TabsTrigger value="gestao"><ShieldCheck className="mr-1 h-4 w-4" />Gerenciar estudos</TabsTrigger> : null}</TabsList><TabsContent value="turmas" className="space-y-5"><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{COURSE_TYPES.slice(0, 4).map((type) => { const course = typedCourses.find((item) => item.type === type.value); return <Card key={type.value} className="border-[#c9a84c]/20"><CardContent className="p-4 text-center"><div className="mb-1 text-2xl">{type.icon}</div><div className="text-sm font-medium text-[#1e3a5f]">{type.label}</div><div className="text-xs text-muted-foreground">{course ? "Disponível" : "Em preparação"}</div></CardContent></Card>; })}</div>{isLoading ? <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map((item) => <Card key={item} className="h-48 animate-pulse bg-muted/30" />)}</div> : typedCourses.length ? <><div className="grid grid-cols-1 gap-3 rounded-xl border border-[#c9a84c]/20 bg-[#c9a84c]/5 p-4 sm:grid-cols-3"><div className="flex items-center gap-2 text-sm text-[#1e3a5f]"><GraduationCap className="h-4 w-4 text-[#c9a84c]" /><span><strong>1.</strong> Conheça os estudos</span></div><div className="flex items-center gap-2 text-sm text-[#1e3a5f]"><UserPlus className="h-4 w-4 text-[#c9a84c]" /><span><strong>2.</strong> Participe da turma</span></div><div className="flex items-center gap-2 text-sm text-[#1e3a5f]"><Award className="h-4 w-4 text-[#c9a84c]" /><span><strong>3.</strong> Conclua o percurso</span></div></div><div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">{typedCourses.map((course) => <CourseCard key={course.id} course={course} churchId={churchId} people={simplePeople} canManage={canManageStudies} />)}</div></> : <Card className="border-dashed border-[#c9a84c]/30"><CardContent className="p-12 text-center"><BookOpen className="mx-auto mb-4 h-12 w-12 text-[#c9a84c]/40" /><h3 className="mb-2 text-lg font-semibold text-[#1e3a5f]">Nenhuma turma criada ainda</h3><p className="text-sm text-muted-foreground">{canManageStudies ? "Comece criando a primeira turma e depois organize os estudos de cada encontro." : "A liderança ainda está preparando as turmas e os estudos."}</p>{canManageStudies ? <Button className="mt-5 bg-[#1e3a5f] text-white" onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />Criar primeira turma</Button> : null}</CardContent></Card>}</TabsContent>{canManageStudies ? <TabsContent value="gestao"><StudyManagement churchId={churchId} courses={typedCourses} canManageAdministrators={Boolean(access?.canManageAdministrators)} /></TabsContent> : null}</Tabs>
    </div>
  );
}
