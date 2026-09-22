import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import {
  AdaptiveFormDialogBody,
  AdaptiveFormDialogContent,
  AdaptiveFormDialogFooter,
  adaptiveFormDialogHeaderClassName,
} from "@/components/AdaptiveFormDialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatCivilDate } from "@/lib/civilDate";
import {
  BookOpen,
  CheckCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Lock,
  Play,
  RotateCcw,
  Save,
  Users,
} from "lucide-react";

type Study = {
  id: number;
  courseId: number;
  title: string;
  weekStart?: string | null;
  summary?: string | null;
  content?: string | null;
  active: boolean;
};

type StudentLessonItem = {
  study: Study;
  progress: {
    status: "nao_iniciada" | "em_andamento" | "concluida";
    lastBlockPosition: number;
    reflection?: string | null;
    releasedAt?: Date | string | null;
  } | null;
  available: boolean;
};

type StudentPathResponse = {
  course?: { id: number; name: string } | null;
  enrollment: unknown | null;
  items: StudentLessonItem[];
};

type SessionQuestion = {
  id: number;
  blockId: number;
  prompt: string;
  options: { id: string; label: string }[];
  position: number;
  isCorrect: boolean;
};

type SessionBlock = {
  id: number;
  title: string;
  content: string;
  position: number;
  status: "concluida" | "atual" | "bloqueada";
  firstViewedAt: Date | string | null;
  lastViewedAt: Date | string | null;
  completedAt: Date | string | null;
  questions: SessionQuestion[];
};

type StudentSession = {
  study: { id: number; title: string; weekStart?: string | null; summary?: string | null; content?: string | null };
  progress: { status: "nao_iniciada" | "em_andamento" | "concluida"; reflection?: string | null; lastBlockPosition: number } | null;
  resume: { blockId: number | null; position: number; label: string };
  blocks: SessionBlock[];
};

type StudentClassResponse = {
  class: { classDate: string; status: "planejada" | "realizada" | "cancelada" };
  attendance: { status: "presente" | "ausente" | "justificado" } | null;
} | null;

type StudentHistoryItem = {
  study: Study;
  course?: { id: number; name: string };
  enrollmentId?: number;
  progress: { status: "nao_iniciada" | "em_andamento" | "concluida"; completedAt?: Date | string | null } | null;
  class: { classDate: string; status: "planejada" | "realizada" | "cancelada" } | null;
  attendance: { status: "presente" | "ausente" | "justificado" } | null;
};

type StudentHistoryResponse = {
  course: { id: number; name: string } | null;
  items: StudentHistoryItem[];
};

function StudentHistorySection({ items, isLoading }: { items: StudentHistoryItem[]; isLoading: boolean }) {
  return <details className="mb-5 overflow-hidden rounded-2xl border border-[#1e3a5f]/15 bg-white">
    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 sm:p-5">
      <div className="min-w-0"><p className="font-semibold text-[#1e3a5f]">Meu histórico</p><p className="mt-1 text-sm text-muted-foreground">Veja tudo o que você já estudou e o que aconteceu nas aulas presenciais.</p></div>
      <Badge variant="outline" className="shrink-0">{items.length} registro{items.length === 1 ? "" : "s"}</Badge>
    </summary>
    <div className="space-y-2 border-t bg-[#fdfaf1]/50 p-4 sm:p-5">
      {isLoading ? <div className="h-20 animate-pulse rounded-lg bg-muted/30" /> : items.length ? items.map((item) => <div key={`${item.enrollmentId ?? item.course?.id ?? "course"}-${item.study.id}`} className="rounded-xl border border-[#c9a84c]/20 bg-white p-3"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><p className="font-semibold text-[#1e3a5f]">{item.study.title}</p>{item.course?.name ? <p className="mt-1 text-xs font-medium text-[#1e3a5f]/70">{item.course.name}</p> : null}{item.study.weekStart ? <p className="mt-1 text-xs text-muted-foreground">Semana de {formatCivilDate(item.study.weekStart)}</p> : null}</div><div className="flex flex-wrap gap-2">{item.progress?.status === "concluida" ? <Badge>Preparação concluída</Badge> : item.progress?.status === "em_andamento" ? <Badge variant="secondary">Em andamento</Badge> : <Badge variant="outline">Não iniciado</Badge>}{item.attendance ? <Badge variant={item.attendance.status === "presente" ? "default" : "secondary"}>{item.attendance.status === "presente" ? "Presença registrada" : item.attendance.status === "justificado" ? "Ausência justificada" : "Ausência registrada"}</Badge> : null}</div></div>{item.class ? <p className="mt-2 text-xs text-muted-foreground">Aula de domingo: {formatCivilDate(item.class.classDate)} · {item.class.status === "realizada" ? "realizada" : item.class.status === "cancelada" ? "cancelada" : "planejada"}</p> : null}</div>) : <p className="text-sm text-muted-foreground">Seu histórico aparecerá aqui depois que você iniciar um estudo ou quando uma aula for registrada.</p>}
    </div>
  </details>;
}

function createClientAttemptId() {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  return `foundation-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function StudentLearningExperience({ churchId, courseId = null }: { churchId: number; courseId?: number | null }) {
  const utils = trpc.useUtils();
  const coursePathQuery = trpc.escolaFundamentos.learningPath.useQuery({ churchId, courseId: courseId ?? 0 }, { enabled: Boolean(courseId) });
  const studentPathQuery = trpc.escolaFundamentos.studentPath.useQuery({ churchId }, { enabled: !courseId });
  const path = (courseId ? coursePathQuery.data : studentPathQuery.data) as StudentPathResponse | undefined;
  const isLoading = courseId ? coursePathQuery.isLoading : studentPathQuery.isLoading;
  const resolvedCourseId = courseId ?? path?.course?.id ?? null;
  const invalidateStudentPath = () => courseId
    ? utils.escolaFundamentos.learningPath.invalidate({ churchId, courseId })
    : utils.escolaFundamentos.studentPath.invalidate({ churchId });

  const [selectedLesson, setSelectedLesson] = useState<StudentLessonItem | null>(null);
  const [selectedBlockIndex, setSelectedBlockIndex] = useState(0);
  const [reflection, setReflection] = useState("");
  const [reflectionDirty, setReflectionDirty] = useState(false);
  const [questionAnswers, setQuestionAnswers] = useState<Record<number, string>>({});
  const [questionResults, setQuestionResults] = useState<Record<number, { isCorrect: boolean; explanation: string; attemptNumber: number }>>({});
  const [completedBlockIds, setCompletedBlockIds] = useState<Set<number>>(new Set());
  const [studyReadyToComplete, setStudyReadyToComplete] = useState(false);

  const sessionQuery = trpc.escolaFundamentos.studySession.useQuery(
    { churchId, courseId: resolvedCourseId ?? 0, studyId: selectedLesson?.study.id ?? 0 },
    { enabled: Boolean(selectedLesson && resolvedCourseId) },
  );
  const session = sessionQuery.data as StudentSession | undefined;
  const blocks = session?.blocks ?? [];
  const activeBlock = blocks[selectedBlockIndex] ?? null;
  const activeBlockCompleted = Boolean(activeBlock && (activeBlock.status === "concluida" || completedBlockIds.has(activeBlock.id)));
  const currentBlockQuestionsComplete = Boolean(activeBlock && activeBlock.questions.every((question) => question.isCorrect || questionResults[question.id]?.isCorrect));
  const completedStudyCount = (path?.items ?? []).filter((item) => item.progress?.status === "concluida").length;
  const preparationCompleted = Boolean(path?.items.length && completedStudyCount === path.items.length);
  const activeStudyId = [...(path?.items ?? [])].reverse().find((item) => item.available && item.progress?.status !== "concluida")?.study.id ?? [...(path?.items ?? [])].reverse().find((item) => item.progress?.status === "concluida")?.study.id ?? 0;
  const studentClassQuery = trpc.escolaFundamentos.studyClass.useQuery({ churchId, courseId: resolvedCourseId ?? 0, studyId: activeStudyId }, { enabled: Boolean(resolvedCourseId && activeStudyId) });
  const studentClass = studentClassQuery.data as StudentClassResponse | undefined;
  const studentHistoryQuery = trpc.escolaFundamentos.studentHistory.useQuery({ churchId }, { enabled: Boolean(churchId) });
  const studentHistory = (studentHistoryQuery.data as StudentHistoryResponse | undefined)?.items ?? [];

  const startLesson = trpc.escolaFundamentos.startLesson.useMutation({
    onSuccess: invalidateStudentPath,
    onError: (error) => toast.error(error.message || "Não foi possível iniciar o estudo."),
  });
  const viewStudyBlock = trpc.escolaFundamentos.viewStudyBlock.useMutation({
    onError: (error) => toast.error(error.message || "Não foi possível salvar o ponto de leitura."),
  });
  const answerQuestion = trpc.escolaFundamentos.answerQuestion.useMutation({
    onSuccess: (result, variables) => {
      setQuestionResults((current) => ({ ...current, [variables.questionId]: result }));
    },
    onError: (error) => toast.error(error.message || "Não foi possível registrar a resposta."),
  });
  const completeStudyBlock = trpc.escolaFundamentos.completeStudyBlock.useMutation({
    onSuccess: async (result) => {
      setCompletedBlockIds((current) => new Set(current).add(result.completedBlockId));
      if (result.nextBlock) {
        const nextIndex = blocks.findIndex((block) => block.id === result.nextBlock?.id);
        setSelectedBlockIndex(nextIndex >= 0 ? nextIndex : selectedBlockIndex + 1);
        setQuestionAnswers({});
        setQuestionResults({});
      } else {
        setStudyReadyToComplete(true);
      }
      await sessionQuery.refetch();
    },
    onError: (error) => toast.error(error.message || "Não foi possível avançar neste bloco."),
  });
  const saveReflection = trpc.escolaFundamentos.saveReflection.useMutation({
    onError: (error) => toast.error(error.message || "Não foi possível salvar sua reflexão."),
  });
  const completeLesson = trpc.escolaFundamentos.completeLesson.useMutation({
    onSuccess: async () => {
      toast.success("Preparação concluída. Aguarde a aula presencial.");
      setSelectedLesson(null);
      await invalidateStudentPath();
    },
    onError: (error) => toast.error(error.message || "Não foi possível concluir a preparação."),
  });

  useEffect(() => {
    if (!session || !selectedLesson) return;
    const resumeIndex = session.blocks.findIndex((block) => block.position === session.resume.position);
    setSelectedBlockIndex(resumeIndex >= 0 ? resumeIndex : 0);
    setCompletedBlockIds(new Set(session.blocks.filter((block) => block.status === "concluida").map((block) => block.id)));
    setStudyReadyToComplete(session.progress?.status === "concluida");
  }, [session?.study.id, selectedLesson?.study.id]);

  useEffect(() => {
    if (!selectedLesson || !resolvedCourseId || !activeBlock) return;
    viewStudyBlock.mutate({ churchId, courseId: resolvedCourseId, studyId: selectedLesson.study.id, blockId: activeBlock.id });
  }, [activeBlock?.id, selectedLesson?.study.id, resolvedCourseId]);

  useEffect(() => {
    if (!selectedLesson || !resolvedCourseId || !reflectionDirty) return;
    const timeout = window.setTimeout(() => {
      saveReflection.mutate({ churchId, courseId: resolvedCourseId, studyId: selectedLesson.study.id, reflection: reflection.trim() || null });
    }, 700);
    return () => window.clearTimeout(timeout);
  }, [reflection, reflectionDirty, selectedLesson?.study.id, resolvedCourseId]);

  const currentItem = useMemo(() => {
    const pending = path?.items.filter((item) => item.available && item.progress?.status !== "concluida") ?? [];
    return pending[pending.length - 1] ?? null;
  }, [path?.items]);

  const openLesson = (item: StudentLessonItem) => {
    if (!item.available || !resolvedCourseId) return;
    setSelectedLesson(item);
    setReflection(item.progress?.reflection ?? "");
    setReflectionDirty(false);
    setQuestionAnswers({});
    setQuestionResults({});
    setCompletedBlockIds(new Set());
    setStudyReadyToComplete(item.progress?.status === "concluida");
    setSelectedBlockIndex(Math.max(0, item.progress?.lastBlockPosition ?? 0));
    if (item.progress?.status !== "concluida") {
      startLesson.mutate({ churchId, courseId: resolvedCourseId, studyId: item.study.id, lastBlockPosition: item.progress?.lastBlockPosition ?? 0 });
    }
  };

  const selectBlock = (index: number) => {
    const block = blocks[index];
    if (!block || block.status === "bloqueada") return;
    setSelectedBlockIndex(index);
    setQuestionAnswers({});
    setQuestionResults({});
  };

  const submitAnswer = (question: SessionQuestion, selectedOptionId: string) => {
    if (!resolvedCourseId || !selectedLesson) return;
    setQuestionAnswers((current) => ({ ...current, [question.id]: selectedOptionId }));
    answerQuestion.mutate({
      churchId,
      courseId: resolvedCourseId,
      studyId: selectedLesson.study.id,
      questionId: question.id,
      selectedOptionId,
      clientAttemptId: createClientAttemptId(),
    });
  };

  const advanceBlock = () => {
    if (!selectedLesson || !resolvedCourseId || !activeBlock) return;
    if (activeBlockCompleted) {
      const nextIndex = blocks.findIndex((block, index) => index > selectedBlockIndex && block.status !== "bloqueada");
      if (nextIndex >= 0) setSelectedBlockIndex(nextIndex);
      else setStudyReadyToComplete(true);
      return;
    }
    if (!currentBlockQuestionsComplete) return;
    completeStudyBlock.mutate({ churchId, courseId: resolvedCourseId, studyId: selectedLesson.study.id, blockId: activeBlock.id });
  };

  const closeLesson = () => {
    if (reflectionDirty && selectedLesson && resolvedCourseId) {
      saveReflection.mutate({ churchId, courseId: resolvedCourseId, studyId: selectedLesson.study.id, reflection: reflection.trim() || null });
    }
    setSelectedLesson(null);
    setReflectionDirty(false);
  };

  if (isLoading) return <div className="mb-5 h-56 animate-pulse rounded-2xl bg-muted/30" />;
  if (!path?.enrollment) return <section className="mb-5 rounded-2xl border border-dashed border-[#c9a84c]/30 bg-[#c9a84c]/5 p-5"><p className="text-sm font-semibold text-[#1e3a5f]">Sua preparação ainda não foi liberada.</p><p className="mt-1 text-sm text-muted-foreground">Quando a liderança vincular você à Escola, o estudo disponível aparecerá aqui automaticamente.</p></section>;
  if (!path.items.length) return <section className="mb-5 rounded-2xl border border-dashed border-[#c9a84c]/30 bg-[#c9a84c]/5 p-5"><p className="text-sm font-semibold text-[#1e3a5f]">Preparação em organização</p><p className="mt-1 text-sm text-muted-foreground">A liderança ainda está organizando os estudos desta etapa.</p></section>;

  return <>
    <section className="mb-5 overflow-hidden rounded-2xl border border-[#c9a84c]/25 bg-[linear-gradient(135deg,#fdfaf1_0%,#ffffff_45%,#f7f1e2_100%)] p-4 sm:p-5">
      <div className="mb-5 flex items-start gap-3"><div className="rounded-xl bg-[#1e3a5f] p-2 text-white"><BookOpen className="h-5 w-5" /></div><div className="min-w-0"><h3 className="font-display text-lg text-[#1e3a5f]">Minha preparação</h3><p className="text-sm text-muted-foreground">{completedStudyCount} de {path.items.length} estudos concluídos</p></div></div>
      <div className="mb-5 h-2 overflow-hidden rounded-full bg-[#1e3a5f]/10"><div className="h-full rounded-full bg-[#c9a84c]" style={{ width: `${Math.round((completedStudyCount / path.items.length) * 100)}%` }} /></div>
      {preparationCompleted ? <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900"><CheckCircle className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-semibold">Preparação concluída</p><p className="mt-1 text-sm text-emerald-800">Você concluiu os estudos disponíveis. Leve suas reflexões para a aula presencial.</p></div></div> : currentItem ? <div className="mb-5 rounded-xl border border-[#1e3a5f]/15 bg-[#1e3a5f] p-4 text-white"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#f1d98a]">Estudo da semana</p><p className="mt-1 text-lg font-semibold">{currentItem.study.title}</p>{currentItem.study.weekStart ? <p className="mt-1 text-xs text-white/75">Semana de {formatCivilDate(currentItem.study.weekStart)}</p> : null}{currentItem.study.summary ? <p className="mt-1 text-sm text-white/80">{currentItem.study.summary}</p> : null}<Button type="button" size="sm" className="mt-4 bg-white text-[#1e3a5f] hover:bg-white/90" onClick={() => openLesson(currentItem)}><Play className="mr-1 h-3.5 w-3.5" />{currentItem.progress?.status === "em_andamento" ? "Continuar estudo" : "Começar estudo"}</Button></div> : <div className="mb-5 rounded-xl border border-[#c9a84c]/25 bg-[#fdfaf1] p-4"><p className="font-semibold text-[#1e3a5f]">Próximo estudo ainda não disponível</p><p className="mt-1 text-sm text-muted-foreground">Ele aparecerá automaticamente quando chegar a data de início da semana definida pela liderança.</p></div>}
      <div className="mb-5 rounded-xl border border-[#1e3a5f]/15 bg-white p-4"><div className="flex items-start gap-3"><div className="rounded-lg bg-[#1e3a5f]/10 p-2 text-[#1e3a5f]"><Users className="h-4 w-4" /></div><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#c9a84c]">Aula presencial</p>{studentClass?.class ? <><p className="mt-1 font-semibold text-[#1e3a5f]">Domingo, {formatCivilDate(studentClass.class.classDate)}</p><p className="mt-1 text-sm text-muted-foreground">{studentClass.class.status === "realizada" ? "A aula foi registrada pela liderança." : studentClass.class.status === "cancelada" ? "Esta aula foi cancelada pela liderança." : "A aula está planejada para este tema."}</p>{studentClass.attendance ? <Badge className="mt-2" variant={studentClass.attendance.status === "presente" ? "default" : "secondary"}>{studentClass.attendance.status === "presente" ? "Presença registrada" : studentClass.attendance.status === "justificado" ? "Ausência justificada" : "Ausência registrada"}</Badge> : null}</> : <p className="mt-1 text-sm text-muted-foreground">A liderança ainda não registrou a aula de domingo deste estudo.</p>}</div></div></div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Sequência da preparação</p>
      <div className="space-y-3">{path.items.map((item, index) => { const progress = item.progress; const status = progress?.status === "concluida" ? "Estudo concluído" : progress?.status === "em_andamento" ? "Em andamento" : item.available ? "Disponível" : "Aguardando orientação"; const isCurrent = currentItem?.study.id === item.study.id; return <div key={item.study.id} className={`rounded-xl border p-3 ${item.available ? "border-[#1e3a5f]/15 bg-white" : "border-border bg-muted/30"}`}><div className="flex items-start gap-3"><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${progress?.status === "concluida" ? "bg-emerald-100 text-emerald-800" : item.available ? "bg-[#c9a84c]/25 text-[#1e3a5f]" : "bg-muted text-muted-foreground"}`}>{progress?.status === "concluida" ? <CheckCircle2 className="h-4 w-4" /> : item.available ? index + 1 : <Lock className="h-4 w-4" />}</span><div className="min-w-0 flex-1"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Estudo {index + 1}</p><p className="mt-0.5 font-semibold text-[#1e3a5f]">{item.study.title}</p>{item.study.summary ? <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.study.summary}</p> : null}<Badge className="mt-2" variant={progress?.status === "concluida" ? "default" : "secondary"}>{status}</Badge></div>{isCurrent ? <Badge className="shrink-0 bg-[#c9a84c] text-[#1e3a5f]">Atual</Badge> : <Button type="button" size="sm" variant={item.available ? "outline" : "ghost"} disabled={!item.available} onClick={() => openLesson(item)} className="shrink-0 gap-1">{item.available ? <Play className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}{item.available ? progress?.status === "em_andamento" ? "Continuar estudo" : progress?.status === "concluida" ? "Revisar estudo" : "Começar estudo" : "Aguardando"}</Button>}</div></div>; })}</div>
    </section>

    <StudentHistorySection items={studentHistory} isLoading={studentHistoryQuery.isLoading} />

    <Dialog open={Boolean(selectedLesson)} onOpenChange={(open) => !open && closeLesson()}>
      <AdaptiveFormDialogContent className="sm:max-w-5xl">
        <div className={adaptiveFormDialogHeaderClassName}><div className="flex items-start justify-between gap-4"><div><DialogTitle className="font-display text-[#1e3a5f]">{selectedLesson?.study.title}</DialogTitle><p className="mt-1 text-sm text-muted-foreground">Leia com calma. Esta preparação não é uma prova.</p></div>{session?.study.weekStart ? <Badge variant="outline">Semana de {formatCivilDate(session.study.weekStart)}</Badge> : null}</div>{blocks.length ? <div className="mt-4"><div className="flex items-center justify-between text-xs font-medium text-muted-foreground"><span>Bloco {selectedBlockIndex + 1} de {blocks.length}</span><span>{Math.round(((selectedBlockIndex + 1) / blocks.length) * 100)}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#1e3a5f]/10"><div className="h-full rounded-full bg-[#c9a84c]" style={{ width: `${Math.round(((selectedBlockIndex + 1) / blocks.length) * 100)}%` }} /></div></div> : null}</div>
        <AdaptiveFormDialogBody className="space-y-4">
          {sessionQuery.isLoading ? <div className="h-72 animate-pulse rounded-xl bg-muted/30" /> : <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_220px]">
            <main className="min-w-0 space-y-4">
              {activeBlock ? <Card className="border-[#c9a84c]/25"><CardContent className="space-y-4 p-4 sm:p-6"><div className="flex items-center gap-2"><Badge className="bg-[#c9a84c] text-[#1e3a5f]">LEITURA DO BLOCO</Badge>{activeBlockCompleted ? <Badge variant="default">Concluído</Badge> : null}</div><div><h3 className="font-display text-2xl text-[#1e3a5f] sm:text-3xl">{activeBlock.title}</h3><p className="mt-3 whitespace-pre-line text-base leading-8 text-slate-700">{activeBlock.content}</p></div><div className="flex items-center gap-2 border-t border-border pt-4 text-sm text-muted-foreground"><Clock3 className="h-4 w-4 text-[#c9a84c]" />Leitura curta para este bloco</div></CardContent></Card> : <Card className="border-[#c9a84c]/25"><CardContent className="p-4 sm:p-6"><Badge className="bg-[#c9a84c] text-[#1e3a5f]">LEITURA DO ESTUDO</Badge><p className="mt-4 whitespace-pre-line text-base leading-8 text-slate-700">{session?.study.content || "O conteúdo deste estudo ainda está sendo preparado."}</p></CardContent></Card>}
              {activeBlock?.questions.length ? <Card className="border-[#1e3a5f]/15"><CardContent className="space-y-4 p-4 sm:p-6"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#c9a84c]">Pergunta do bloco</p><p className="mt-1 text-sm text-muted-foreground">Responda com calma. Se errar, você verá uma explicação e poderá tentar novamente.</p></div>{activeBlock.questions.map((question) => { const answer = questionAnswers[question.id]; const result = questionResults[question.id]; const correct = question.isCorrect || result?.isCorrect; return <div key={question.id} className="space-y-3 border-t border-border pt-4 first:border-t-0 first:pt-0"><p className="font-semibold text-[#1e3a5f]">{question.prompt}</p><div className="grid gap-2">{question.options.map((option) => <button key={option.id} type="button" aria-pressed={answer === option.id} disabled={Boolean(correct) || answerQuestion.isPending} onClick={() => setQuestionAnswers((current) => ({ ...current, [question.id]: option.id }))} className={`min-h-11 rounded-lg border px-3 py-3 text-left text-sm ${answer === option.id ? "border-[#1e3a5f] bg-[#1e3a5f]/5 text-[#1e3a5f]" : "border-border bg-background hover:border-[#c9a84c]"}`}>{option.label}</button>)}</div>{result ? <div className={`rounded-lg p-3 text-sm ${result.isCorrect ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}><p className="font-semibold">{result.isCorrect ? "Resposta correta" : "Vamos revisar"}</p><p className="mt-1">{result.explanation}</p>{!result.isCorrect ? <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => setQuestionResults((current) => { const next = { ...current }; delete next[question.id]; return next; })}><RotateCcw className="mr-1 h-3.5 w-3.5" />Tentar novamente</Button> : null}</div> : question.isCorrect ? <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900"><p className="font-semibold">Pergunta já concluída</p><p className="mt-1">Você já acertou esta pergunta em uma tentativa anterior.</p></div> : <Button type="button" size="sm" variant="outline" className="w-full" disabled={!answer || answerQuestion.isPending} onClick={() => answer && submitAnswer(question, answer)}>{answerQuestion.isPending ? "Registrando…" : "Responder"}</Button>}</div>; })}</CardContent></Card> : null}
              <div className="space-y-2 rounded-xl border border-[#c9a84c]/25 bg-[#fdfaf1] p-4"><Label htmlFor="foundation-mobile-reflection">Reflexão da preparação</Label><p className="text-xs text-muted-foreground">Como você pode aplicar este ensinamento à sua caminhada?</p><Textarea id="foundation-mobile-reflection" value={reflection} onChange={(event) => { setReflection(event.target.value); setReflectionDirty(true); }} rows={4} maxLength={4000} placeholder="Escreva sua reflexão..." /><p className="text-right text-[11px] text-muted-foreground">Salva automaticamente enquanto você escreve.</p></div>
            </main>
            {blocks.length ? <aside className="hidden lg:block"><div className="sticky top-0 space-y-3 rounded-xl border border-[#1e3a5f]/15 bg-white p-4"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#c9a84c]">Seu progresso</p>{blocks.map((block, index) => <button key={block.id} type="button" disabled={block.status === "bloqueada"} onClick={() => selectBlock(index)} className={`flex w-full items-center gap-2 rounded-lg p-2 text-left text-sm ${index === selectedBlockIndex ? "bg-[#fdfaf1] text-[#1e3a5f]" : "text-muted-foreground"}`}><span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${block.status === "concluida" || completedBlockIds.has(block.id) ? "bg-emerald-100 text-emerald-800" : index === selectedBlockIndex ? "bg-[#c9a84c]/30 text-[#1e3a5f]" : "bg-muted"}`}>{block.status === "bloqueada" ? <Lock className="h-3 w-3" /> : block.status === "concluida" || completedBlockIds.has(block.id) ? <CheckCircle2 className="h-3.5 w-3.5" /> : index + 1}</span><span className="min-w-0 truncate">{block.title}</span></button>)}</div></aside> : null}
          </div>}
        </AdaptiveFormDialogBody>
        <AdaptiveFormDialogFooter><Button type="button" variant="outline" onClick={closeLesson}>Sair do estudo</Button>{sessionQuery.isLoading ? null : activeBlock && blocks.length && !(activeBlockCompleted && selectedBlockIndex === blocks.length - 1) ? <Button type="button" className="bg-[#1e3a5f] text-white" disabled={completeStudyBlock.isPending || (!activeBlockCompleted && !currentBlockQuestionsComplete)} onClick={advanceBlock}>{completeStudyBlock.isPending ? "Salvando…" : activeBlockCompleted ? selectedBlockIndex < blocks.length - 1 ? "Continuar para o próximo bloco" : "Preparar conclusão" : currentBlockQuestionsComplete ? "Concluir bloco" : "Responda à pergunta"}<ChevronRight className="ml-2 h-4 w-4" /></Button> : activeBlock && blocks.length ? null : session ? <Button type="button" className="bg-[#1e3a5f] text-white" disabled={completeLesson.isPending || !resolvedCourseId} onClick={() => selectedLesson && resolvedCourseId && completeLesson.mutate({ churchId, courseId: resolvedCourseId, studyId: selectedLesson.study.id, lastBlockPosition: selectedLesson.progress?.lastBlockPosition ?? 0, reflection: reflection.trim() || null })}><Save className="mr-2 h-4 w-4" />{completeLesson.isPending ? "Salvando…" : "Concluir estudo"}</Button> : null}{(blocks.length > 0 && (studyReadyToComplete || (activeBlock && selectedBlockIndex === blocks.length - 1 && activeBlockCompleted))) ? <Button type="button" className="bg-[#1e3a5f] text-white" disabled={completeLesson.isPending} onClick={() => selectedLesson && resolvedCourseId && completeLesson.mutate({ churchId, courseId: resolvedCourseId, studyId: selectedLesson.study.id, lastBlockPosition: activeBlock?.position ?? selectedLesson.progress?.lastBlockPosition ?? 0, reflection: reflection.trim() || null })}><Save className="mr-2 h-4 w-4" />Concluir preparação</Button> : null}</AdaptiveFormDialogFooter>
      </AdaptiveFormDialogContent>
    </Dialog>
  </>;
}
