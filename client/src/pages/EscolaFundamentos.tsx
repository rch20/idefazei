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
import { useState } from "react";
import { BookOpen, Users, Award, CheckCircle, Clock, Plus, Loader2, GraduationCap, UserPlus } from "lucide-react";


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

// Certificado PDF gerado via tRPC — ver CourseCard para uso

function CourseCard({ course, churchId, people }: {
  course: { id: number; name: string; type: string; description?: string | null; active: boolean };
  churchId: number;
  people: { id: number; fullName: string }[];
}) {
  const [selectedPersonId, setSelectedPersonId] = useState<string>("");
  const [enrollOpen, setEnrollOpen] = useState(false);
  const utils = trpc.useUtils();

  const { data: enrollments } = trpc.escolaFundamentos.getEnrollments.useQuery(
    { courseId: course.id, churchId },
    { enabled: true }
  );

  const enrollMutation = trpc.escolaFundamentos.enroll.useMutation({
    onSuccess: () => {
      toast.success("Matrícula realizada com sucesso!");
      setEnrollOpen(false);
      setSelectedPersonId("");
      utils.escolaFundamentos.getEnrollments.invalidate();
    },
    onError: () => toast.error("Erro ao realizar matrícula"),
  });

  const updateMutation = trpc.escolaFundamentos.updateEnrollment.useMutation({
    onSuccess: () => {
      toast.success("Status atualizado!");
      utils.escolaFundamentos.getEnrollments.invalidate();
    },
    onError: () => toast.error("Erro ao atualizar"),
  });

  const [generatingCertFor, setGeneratingCertFor] = useState<number | null>(null);
  const certMutation = trpc.certificates.generate.useMutation({
    onSuccess: (data) => {
      // Abre o PDF em nova aba para download
      window.open(data.url, "_blank");
      toast.success("Certificado gerado com sucesso!");
      setGeneratingCertFor(null);
    },
    onError: () => {
      toast.error("Erro ao gerar certificado");
      setGeneratingCertFor(null);
    },
  });

  const courseInfo = COURSE_TYPES.find((c) => c.value === course.type);
  const total = enrollments?.length ?? 0;
  const emAndamento = enrollments?.filter((e) => e.enrollment.status === "em_andamento").length ?? 0;
  const concluidos = enrollments?.filter((e) => e.enrollment.status === "concluido").length ?? 0;

  return (
    <Card className="border border-[#c9a84c]/20 hover:border-[#c9a84c]/50 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{courseInfo?.icon ?? "📚"}</span>
            <div>
              <CardTitle className="text-[#1e3a5f] text-lg">{course.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{courseInfo?.label}</p>
            </div>
          </div>
          <Badge variant={course.active ? "default" : "secondary"}>
            {course.active ? "Ativo" : "Inativo"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {course.description && (
          <p className="text-sm text-muted-foreground mb-4">{course.description}</p>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm mb-4">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Users className="h-4 w-4" /> {total} matriculados
          </span>
          <span className="flex items-center gap-1 text-amber-700">
            <Clock className="h-4 w-4" /> {emAndamento} em andamento
          </span>
          <span className="flex items-center gap-1 text-green-600">
            <CheckCircle className="h-4 w-4" /> {concluidos} concluídos
          </span>
        </div>

        {enrollments && enrollments.length > 0 && (
          <div className="space-y-2 mb-4 max-h-52 overflow-y-auto pr-1">
            {enrollments.map(({ enrollment, person }) => (
              <div key={enrollment.id} className="flex flex-col gap-2 rounded bg-muted/30 p-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="min-w-0 truncate text-sm font-medium">{person.fullName}</span>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[enrollment.status ?? "matriculado"]}`}>
                    {STATUS_LABELS[enrollment.status ?? "matriculado"]}
                  </span>
                  {enrollment.status !== "concluido" && (
                    <Select
                      value={enrollment.status ?? "matriculado"}
                      onValueChange={(val) =>
                        updateMutation.mutate({
                          id: enrollment.id,
                          churchId,
                          status: val as "matriculado" | "em_andamento" | "concluido",
                          completedAt: val === "concluido" ? new Date() : null,
                        })
                      }
                    >
                      <SelectTrigger className="h-6 text-xs w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="matriculado">Matriculado</SelectItem>
                        <SelectItem value="em_andamento">Em Andamento</SelectItem>
                        <SelectItem value="concluido">Concluído</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {enrollment.status === "concluido" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-xs border-[#c9a84c] text-[#c9a84c]"
                      disabled={generatingCertFor === enrollment.id}
                      onClick={() => {
                        setGeneratingCertFor(enrollment.id);
                        certMutation.mutate({
                          type: "fundamentos",
                          memberName: person.fullName,
                          churchId,
                          personId: person.id,
                          enrollmentId: enrollment.id,
                          courseName: course.name,
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
              <Plus className="h-4 w-4 mr-1" /> Matricular Pessoa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Matricular em {course.name}</DialogTitle>
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
                onClick={() =>
                  enrollMutation.mutate({
                    courseId: course.id,
                    personId: Number(selectedPersonId),
                    churchId,
                  })
                }
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

export default function EscolaFundamentos() {
  const { churchId } = useChurch();
  const [createOpen, setCreateOpen] = useState(false);
  const [courseName, setCourseName] = useState("");
  const [courseType, setCourseType] = useState<(typeof COURSE_TYPES)[number]["value"]>("salvacao");
  const [courseDescription, setCourseDescription] = useState("");
  const utils = trpc.useUtils();
  const { data: courses, isLoading } = trpc.escolaFundamentos.listCourses.useQuery(
    { churchId: churchId! },
    { enabled: !!churchId }
  );
  const { data: people } = trpc.people.list.useQuery(
    { churchId: churchId! },
    { enabled: !!churchId }
  );

  if (!churchId) return null;

  const simplePeople = (people ?? []).map((p) => ({ id: p.id, fullName: p.fullName }));
  const createCourseMutation = trpc.escolaFundamentos.createCourse.useMutation({
    onSuccess: () => {
      toast.success("Turma criada. O próximo passo é matricular os participantes.");
      setCreateOpen(false);
      setCourseName("");
      setCourseType("salvacao");
      setCourseDescription("");
      utils.escolaFundamentos.listCourses.invalidate();
    },
    onError: (error) => toast.error(error.message || "Não foi possível criar a turma."),
  });

  const submitNewCourse = () => {
    if (courseName.trim().length < 3) {
      toast.error("Informe um nome com ao menos 3 caracteres.");
      return;
    }
    createCourseMutation.mutate({ churchId, name: courseName, type: courseType, description: courseDescription || undefined });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f] flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-[#c9a84c]" />
            Escola de Fundamentos
          </h1>
          <p className="text-muted-foreground mt-1">
            Cursos de base para o crescimento espiritual dos membros
          </p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="w-full bg-[#1e3a5f] text-white hover:bg-[#1e3a5f]/90 sm:w-auto"><Plus className="mr-2 h-4 w-4" /> Criar turma</Button>
          </DialogTrigger>
          <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-md">
            <DialogHeader><DialogTitle className="font-display text-[#1e3a5f]">Criar turma de fundamentos</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">Depois de criar a turma, você poderá matricular as Pessoas e acompanhar o progresso de cada uma.</p>
              <div className="space-y-2"><Label htmlFor="foundation-course-name">Nome da turma</Label><Input id="foundation-course-name" value={courseName} onChange={(event) => setCourseName(event.target.value)} placeholder="Ex.: Fundamentos da Fé — 1º semestre" maxLength={120} /></div>
              <div className="space-y-2"><Label>Área de fundamento</Label><Select value={courseType} onValueChange={(value) => setCourseType(value as typeof courseType)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{COURSE_TYPES.map((course) => <SelectItem key={course.value} value={course.value}>{course.icon} {course.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label htmlFor="foundation-course-description">Descrição opcional</Label><Textarea id="foundation-course-description" value={courseDescription} onChange={(event) => setCourseDescription(event.target.value)} placeholder="Explique brevemente o propósito desta turma." maxLength={500} /></div>
              <Button className="w-full bg-[#1e3a5f] text-white" disabled={createCourseMutation.isPending} onClick={submitNewCourse}>{createCourseMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GraduationCap className="mr-2 h-4 w-4" />}Criar e matricular participantes</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {COURSE_TYPES.slice(0, 4).map((ct) => {
          const c = courses?.find((c) => c.type === ct.value);
          return (
            <Card key={ct.value} className="border-[#c9a84c]/20">
              <CardContent className="p-4 text-center">
                <div className="text-2xl mb-1">{ct.icon}</div>
                <div className="text-sm font-medium text-[#1e3a5f]">{ct.label}</div>
                <div className="text-xs text-muted-foreground">{c ? "Ativo" : "Não criado"}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Courses */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse h-48 bg-muted/30" />
          ))}
        </div>
      ) : courses && courses.length > 0 ? (
        <>
          <div className="grid grid-cols-1 gap-3 rounded-xl border border-[#c9a84c]/20 bg-[#c9a84c]/5 p-4 sm:grid-cols-3">
            <div className="flex items-center gap-2 text-sm text-[#1e3a5f]"><GraduationCap className="h-4 w-4 text-[#c9a84c]" /><span><strong>1.</strong> Crie a turma</span></div>
            <div className="flex items-center gap-2 text-sm text-[#1e3a5f]"><UserPlus className="h-4 w-4 text-[#c9a84c]" /><span><strong>2.</strong> Matricule as Pessoas</span></div>
            <div className="flex items-center gap-2 text-sm text-[#1e3a5f]"><Award className="h-4 w-4 text-[#c9a84c]" /><span><strong>3.</strong> Conclua e gere certificado</span></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((course) => <CourseCard key={course.id} course={course} churchId={churchId} people={simplePeople} />)}
          </div>
        </>
      ) : (
        <Card className="border-dashed border-[#c9a84c]/30">
          <CardContent className="p-12 text-center">
            <BookOpen className="h-12 w-12 text-[#c9a84c]/40 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#1e3a5f] mb-2">Nenhuma turma criada ainda</h3>
            <p className="text-muted-foreground text-sm">
              Comece criando a primeira turma. Em seguida, matricule as Pessoas e acompanhe o crescimento espiritual de cada participante.
            </p>
            <Button className="mt-5 bg-[#1e3a5f] text-white" onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" /> Criar primeira turma</Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
