import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useChurch } from "@/components/ChurchLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { BookOpen, Users, Award, CheckCircle, Clock, Plus } from "lucide-react";

const COURSE_TYPES = [
  { value: "salvacao", label: "Salvação", icon: "✝️" },
  { value: "oracao", label: "Oração", icon: "🙏" },
  { value: "biblia", label: "Bíblia", icon: "📖" },
  { value: "igreja", label: "Igreja", icon: "⛪" },
  { value: "espirito_santo", label: "Espírito Santo", icon: "🕊️" },
  { value: "batismo", label: "Batismo nas Águas", icon: "💧" },
  { value: "outro", label: "Outro", icon: "📚" },
];

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

function generateCertificate(personName: string, courseName: string, churchName: string) {
  const date = new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Cormorant+Garamond:ital,wght@0,400;1,400&display=swap');
  body { margin: 0; background: #f5f0e8; display: flex; justify-content: center; align-items: center; min-height: 100vh; font-family: 'Cormorant Garamond', serif; }
  .cert { width: 800px; background: #fffdf7; border: 3px solid #c9a84c; padding: 60px; text-align: center; position: relative; box-shadow: 0 8px 32px rgba(0,0,0,0.15); }
  .cert::before { content: ''; position: absolute; inset: 12px; border: 1px solid #c9a84c; pointer-events: none; }
  .ornament { color: #c9a84c; font-size: 2rem; margin: 0 12px; }
  .title { font-family: 'Playfair Display', serif; color: #1e3a5f; font-size: 2.8rem; margin: 20px 0 8px; }
  .subtitle { color: #c9a84c; font-size: 1.1rem; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 40px; }
  .body-text { color: #4a4a4a; font-size: 1.2rem; line-height: 1.8; margin: 20px 0; }
  .name { font-family: 'Playfair Display', serif; color: #1e3a5f; font-size: 2rem; margin: 16px 0; border-bottom: 2px solid #c9a84c; display: inline-block; padding-bottom: 4px; }
  .course { color: #c9a84c; font-size: 1.4rem; font-style: italic; margin: 8px 0; }
  .date { color: #888; font-size: 1rem; margin-top: 40px; }
  .seal { width: 80px; height: 80px; border-radius: 50%; background: #1e3a5f; color: #c9a84c; display: flex; align-items: center; justify-content: center; font-size: 2rem; margin: 20px auto; }
</style>
</head>
<body>
<div class="cert">
  <div><span class="ornament">✦</span><span class="ornament">✦</span><span class="ornament">✦</span></div>
  <div class="title">Certificado de Conclusão</div>
  <div class="subtitle">Escola de Fundamentos</div>
  <div class="seal">✝</div>
  <div class="body-text">Certificamos que</div>
  <div class="name">${personName}</div>
  <div class="body-text">concluiu com êxito o curso de</div>
  <div class="course">${courseName}</div>
  <div class="body-text">promovido pela</div>
  <div class="body-text"><strong>${churchName}</strong></div>
  <div class="date">${date}</div>
  <div style="margin-top:40px;"><span class="ornament">✦</span><span class="ornament">✦</span><span class="ornament">✦</span></div>
</div>
</body>
</html>`;
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `certificado-${courseName.toLowerCase().replace(/\s+/g, "-")}-${personName.toLowerCase().replace(/\s+/g, "-")}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

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

  const courseInfo = COURSE_TYPES.find((c) => c.value === course.type);
  const total = enrollments?.length ?? 0;
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
        <div className="flex gap-4 text-sm mb-4">
          <span className="flex items-center gap-1 text-muted-foreground">
            <Users className="h-4 w-4" /> {total} matriculados
          </span>
          <span className="flex items-center gap-1 text-green-600">
            <CheckCircle className="h-4 w-4" /> {concluidos} concluídos
          </span>
        </div>

        {enrollments && enrollments.length > 0 && (
          <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
            {enrollments.map(({ enrollment, person }) => (
              <div key={enrollment.id} className="flex items-center justify-between p-2 rounded bg-muted/30">
                <span className="text-sm font-medium">{person.fullName}</span>
                <div className="flex items-center gap-2">
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
                      onClick={() => generateCertificate(person.fullName, course.name, "Igreja")}
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1e3a5f] flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-[#c9a84c]" />
            Escola de Fundamentos
          </h1>
          <p className="text-muted-foreground mt-1">
            Cursos de base para o crescimento espiritual dos membros
          </p>
        </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              churchId={churchId}
              people={simplePeople}
            />
          ))}
        </div>
      ) : (
        <Card className="border-dashed border-[#c9a84c]/30">
          <CardContent className="p-12 text-center">
            <BookOpen className="h-12 w-12 text-[#c9a84c]/40 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[#1e3a5f] mb-2">Nenhum curso cadastrado</h3>
            <p className="text-muted-foreground text-sm">
              Os cursos da Escola de Fundamentos são criados pelo administrador do sistema.
              Entre em contato com o suporte para ativar os cursos padrão.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
