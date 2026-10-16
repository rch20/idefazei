import { useEffect, useMemo, useRef, useState } from "react";
import { createStageNoteQueue, type StageNotePayload } from "./stageNoteQueue";
import type { CSSProperties } from "react";
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
  ArrowLeft,
  ArrowRight,
  AudioLines,
  BookOpen,
  Check,
  CheckCircle,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileText,
  Lock,
  MessageSquareText,
  Play,
  RotateCcw,
  Save,
  StickyNote,
  Users,
  Video,
} from "lucide-react";
import type { FoundationTheme } from "./FoundationTheme";

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
  reflectionPrompt?: string | null;
  position: number;
  status: "concluida" | "atual" | "bloqueada";
  firstViewedAt: Date | string | null;
  lastViewedAt: Date | string | null;
  completedAt: Date | string | null;
  reflection?: string | null;
  questions: SessionQuestion[];
};

type StudentSession = {
  study: {
    id: number;
    title: string;
    weekStart?: string | null;
    summary?: string | null;
    content?: string | null;
  };
  progress: {
    status: "nao_iniciada" | "em_andamento" | "concluida";
    reflection?: string | null;
    lastBlockPosition: number;
  } | null;
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
  progress: {
    status: "nao_iniciada" | "em_andamento" | "concluida";
    completedAt?: Date | string | null;
    reflection?: string | null;
  } | null;
  stageReflections?: Array<{
    blockId: number;
    title: string;
    reflectionPrompt?: string | null;
    reflection: string;
  }>;
  class: {
    classDate: string;
    status: "planejada" | "realizada" | "cancelada";
  } | null;
  attendance: { status: "presente" | "ausente" | "justificado" } | null;
};

type StudentHistoryResponse = {
  course: { id: number; name: string } | null;
  items: StudentHistoryItem[];
};

function makeFoundationSoftColor(
  color: string,
  amount: number,
  fallback = "white"
) {
  return `color-mix(in srgb, ${color} ${amount}%, ${fallback})`;
}

type StudyMaterial = {
  id: number;
  title: string;
  type: string;
  fileUrl?: string | null;
  thumbnailUrl?: string | null;
  description?: string | null;
  notes?: string | null;
  mimeType?: string | null;
};

function StudentHistorySection({
  items,
  isLoading,
  theme,
}: {
  items: StudentHistoryItem[];
  isLoading: boolean;
  theme: FoundationTheme;
}) {
  return (
    <details className="mb-5 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0">
          <p className="font-semibold" style={{ color: theme.primary }}>
            Meu histórico
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Veja o que você já estudou e retome uma preparação quando quiser.
          </p>
        </div>
        <Badge variant="outline" className="shrink-0">
          {items.length} registro{items.length === 1 ? "" : "s"}
        </Badge>
      </summary>
      <div
        className="space-y-2 border-t p-4 sm:p-5"
        style={{ backgroundColor: theme.accentSoft }}
      >
        {isLoading ? (
          <div className="h-20 animate-pulse rounded-lg bg-muted/30" />
        ) : items.length ? (
          items.map(item => (
            <div
              key={`${item.enrollmentId ?? item.course?.id ?? "course"}-${item.study.id}`}
              className="rounded-xl border border-black/5 bg-white p-3"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="font-semibold" style={{ color: theme.primary }}>
                    {item.study.title}
                  </p>
                  {item.course?.name ? (
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      {item.course.name}
                    </p>
                  ) : null}
                  {item.study.weekStart ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Semana de {formatCivilDate(item.study.weekStart)}
                    </p>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.progress?.status === "concluida" ? (
                    <Badge>Preparação concluída</Badge>
                  ) : item.progress?.status === "em_andamento" ? (
                    <Badge variant="secondary">Em andamento</Badge>
                  ) : (
                    <Badge variant="outline">Não iniciado</Badge>
                  )}
                  {item.attendance ? (
                    <Badge
                      variant={
                        item.attendance.status === "presente"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {item.attendance.status === "presente"
                        ? "Presença registrada"
                        : item.attendance.status === "justificado"
                          ? "Ausência justificada"
                          : "Ausência registrada"}
                    </Badge>
                  ) : null}
                </div>
              </div>
              {item.class ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Aula de domingo: {formatCivilDate(item.class.classDate)} ·{" "}
                  {item.class.status === "realizada"
                    ? "realizada"
                    : item.class.status === "cancelada"
                      ? "cancelada"
                      : "planejada"}
                </p>
              ) : null}
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            Seu histórico aparecerá aqui depois que você iniciar um estudo ou
            quando uma aula for registrada.
          </p>
        )}
      </div>
    </details>
  );
}

function StepMarker({
  index,
  status,
  active,
  theme,
}: {
  index: number;
  status: SessionBlock["status"];
  active: boolean;
  theme: FoundationTheme;
}) {
  const complete = status === "concluida";
  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold"
      style={
        complete || active
          ? {
              backgroundColor: theme.primary,
              borderColor: theme.primary,
              color: theme.primaryForeground,
            }
          : {
              backgroundColor: "white",
              borderColor: "#d8ddd8",
              color: "#68736c",
            }
      }
    >
      {complete ? (
        <Check className="h-4 w-4" />
      ) : status === "bloqueada" ? (
        <Lock className="h-3.5 w-3.5" />
      ) : (
        index + 1
      )}
    </span>
  );
}

function StepRail({
  blocks,
  selectedBlockIndex,
  completedBlockIds,
  onSelect,
  theme,
}: {
  blocks: SessionBlock[];
  selectedBlockIndex: number;
  completedBlockIds: Set<number>;
  onSelect: (index: number) => void;
  theme: FoundationTheme;
}) {
  const getStatus = (block: SessionBlock): SessionBlock["status"] =>
    completedBlockIds.has(block.id) ? "concluida" : block.status;
  const getStatusLabel = (status: SessionBlock["status"]) =>
    status === "concluida"
      ? "Concluída"
      : status === "bloqueada"
        ? "Aguardando a etapa anterior"
        : "Parte atual";
  return (
    <>
      <div
        className="mb-3 grid grid-cols-2 gap-2 lg:hidden"
        aria-label="Etapas do estudo"
      >
        {blocks.map((block, index) => {
          const status = getStatus(block);
          return (
            <button
              key={block.id}
              type="button"
              disabled={status === "bloqueada"}
              aria-current={index === selectedBlockIndex ? "step" : undefined}
              aria-label={`${index + 1}. ${block.title}. ${getStatusLabel(status)}`}
              title={block.title}
              onClick={() => onSelect(index)}
              className="flex min-w-0 items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-45"
              style={
                index === selectedBlockIndex
                  ? {
                      backgroundColor: theme.primarySoft,
                      borderColor: makeFoundationSoftColor(
                        theme.primary,
                        45,
                        "white"
                      ),
                      color: theme.primary,
                    }
                  : {
                      backgroundColor: "white",
                      borderColor: "#e1e5e1",
                      color: "#68736c",
                    }
              }
            >
              <StepMarker
                index={index}
                status={status}
                active={index === selectedBlockIndex}
                theme={theme}
              />
              <span className="min-w-0 truncate">{block.title}</span>
            </button>
          );
        })}
      </div>
      <aside className="hidden min-w-0 rounded-2xl border border-black/5 bg-white p-4 shadow-sm lg:block">
        <p
          className="mb-4 font-display text-lg font-bold"
          style={{ color: theme.primary }}
        >
          Etapas do estudo
        </p>
        <div className="relative space-y-1 before:absolute before:bottom-6 before:left-4 before:top-6 before:w-px before:bg-slate-200">
          {blocks.map((block, index) => {
            const status = getStatus(block);
            return (
              <button
                key={block.id}
                type="button"
                disabled={status === "bloqueada"}
                aria-current={index === selectedBlockIndex ? "step" : undefined}
                aria-label={`${index + 1}. ${block.title}. ${getStatusLabel(status)}`}
                onClick={() => onSelect(index)}
                className="relative flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-45"
                style={
                  index === selectedBlockIndex
                    ? {
                        backgroundColor: theme.primarySoft,
                        color: theme.primary,
                      }
                    : { color: "#68736c" }
                }
              >
                <StepMarker
                  index={index}
                  status={status}
                  active={index === selectedBlockIndex}
                  theme={theme}
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">
                    {index + 1}. {block.title}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-slate-500">
                    {getStatusLabel(status)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-5 border-t border-black/5 pt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Retomada
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Você pode voltar às etapas concluídas sem perder suas respostas.
          </p>
        </div>
      </aside>
    </>
  );
}

function StudentStudyProgressSummary({
  blocks,
  selectedBlockIndex,
  completedBlockIds,
  theme,
}: {
  blocks: SessionBlock[];
  selectedBlockIndex: number;
  completedBlockIds: Set<number>;
  theme: FoundationTheme;
}) {
  const completedCount = blocks.filter(
    block => block.status === "concluida" || completedBlockIds.has(block.id)
  ).length;
  const total = blocks.length;
  const percentage = total ? Math.round((completedCount / total) * 100) : 0;
  const activeBlock = blocks[selectedBlockIndex] ?? null;
  return (
    <section
      className="mt-4 rounded-xl border border-black/5 bg-[#f8f8f5] p-3 sm:p-4"
      aria-label="Progresso do estudo"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Progresso do estudo
          </p>
          <p className="mt-1 font-semibold" style={{ color: theme.primary }}>
            {completedCount} de {total} partes concluídas
          </p>
        </div>
        <span className="text-sm font-bold" style={{ color: theme.primary }}>
          {percentage}%
        </span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full transition-[width] duration-200 motion-reduce:transition-none"
          style={{ width: `${percentage}%`, backgroundColor: theme.primary }}
        />
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-medium text-slate-600">
          Parte atual:{" "}
          {activeBlock
            ? `${selectedBlockIndex + 1}. ${activeBlock.title}`
            : "preparação inicial"}
        </span>
        <span className="font-semibold" style={{ color: theme.primary }}>
          {activeBlock &&
          (activeBlock.status === "concluida" ||
            completedBlockIds.has(activeBlock.id))
            ? "Parte concluída"
            : "Continue daqui"}
        </span>
      </div>
    </section>
  );
}

function StudyMaterials({
  materials,
  theme,
}: {
  materials: StudyMaterial[];
  theme: FoundationTheme;
}) {
  const media = materials.filter(
    material =>
      ["video", "audio"].includes(material.type) ||
      /^(video|audio)\//i.test(material.mimeType ?? "")
  );
  const other = materials.filter(material => !media.includes(material));
  if (!materials.length) return null;
  return (
    <section className="space-y-3 rounded-2xl border border-black/5 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-3">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: theme.primarySoft, color: theme.primary }}
        >
          <Play className="h-4 w-4" />
        </span>
        <div>
          <p className="font-semibold" style={{ color: theme.primary }}>
            Materiais deste estudo
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Áudio e vídeo aparecem somente quando estão disponíveis no acervo.
          </p>
        </div>
      </div>
      {media.map(material => (
        <div
          key={material.id}
          className="overflow-hidden rounded-xl border border-black/5 bg-[#fcfbf8]"
        >
          {material.type === "video" && material.fileUrl ? (
            <video
              controls
              preload="metadata"
              poster={material.thumbnailUrl ?? undefined}
              className="aspect-video w-full bg-black"
              aria-label={material.title}
            >
              <source src={material.fileUrl} />
            </video>
          ) : material.type === "audio" && material.fileUrl ? (
            <div className="flex items-center gap-3 p-4">
              <AudioLines
                className="h-5 w-5 shrink-0"
                style={{ color: theme.primary }}
              />
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-sm font-medium"
                  style={{ color: theme.primary }}
                >
                  {material.title}
                </p>
                <audio
                  controls
                  preload="metadata"
                  className="mt-2 w-full"
                  src={material.fileUrl}
                >
                  Seu navegador não suporta áudio.
                </audio>
              </div>
            </div>
          ) : null}
          <div className="flex items-center gap-2 p-3">
            <span
              className="rounded-full px-2 py-1 text-[11px] font-semibold"
              style={{
                backgroundColor: theme.accentSoft,
                color: theme.primary,
              }}
            >
              {material.type === "video" ? "Vídeo" : "Áudio"}
            </span>
            <span className="truncate text-sm text-slate-600">
              {material.title}
            </span>
            {material.fileUrl ? (
              <a
                className="ml-auto shrink-0 text-xs font-semibold hover:underline"
                style={{ color: theme.primary }}
                href={material.fileUrl}
                target="_blank"
                rel="noreferrer"
              >
                Abrir
              </a>
            ) : null}
          </div>
        </div>
      ))}
      {other.length ? (
        <div className="grid gap-2 sm:grid-cols-2">
          {other.map(material => (
            <a
              key={material.id}
              href={material.fileUrl ?? undefined}
              target={material.fileUrl ? "_blank" : undefined}
              rel={material.fileUrl ? "noreferrer" : undefined}
              className="flex min-w-0 items-center gap-3 rounded-xl border border-black/5 bg-[#fcfbf8] p-3 hover:border-slate-300"
            >
              <FileText
                className="h-4 w-4 shrink-0"
                style={{ color: theme.accent }}
              />
              <span className="min-w-0">
                <span
                  className="block truncate text-sm font-medium"
                  style={{ color: theme.primary }}
                >
                  {material.title}
                </span>
                <span className="block text-xs text-slate-500">
                  {material.type === "pdf"
                    ? "Documento"
                    : material.type === "apostila"
                      ? "Apostila"
                      : "Material de apoio"}
                </span>
              </span>
            </a>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function StageReflectionCard({
  prompt,
  stageTitle,
  reflection,
  setReflection,
  theme,
  isSaving,
  hasError = false,
  isUnsaved = false,
  disabled = false,
}: {
  prompt?: string | null;
  stageTitle?: string;
  reflection: string;
  setReflection: (value: string) => void;
  theme: FoundationTheme;
  isSaving: boolean;
  hasError?: boolean;
  isUnsaved?: boolean;
  disabled?: boolean;
}) {
  return (
    <StudentStageNotes
      prompt={prompt}
      stageTitle={stageTitle}
      value={reflection}
      onChange={setReflection}
      primaryColor={theme.primary}
      isSaving={isSaving}
      hasError={hasError}
      isUnsaved={isUnsaved}
      disabled={disabled}
    />
  );
}
function StudyOverviewCard({
  content,
  theme,
}: {
  content: string;
  theme: FoundationTheme;
}) {
  return (
    <section
      className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm sm:p-5"
      aria-label="Introdução do estudo"
    >
      <p
        className="text-xs font-semibold uppercase tracking-[0.16em]"
        style={{ color: theme.accent }}
      >
        Introdução do estudo
      </p>
      <p className="mt-2 whitespace-pre-line text-base leading-8 text-slate-700">
        {content}
      </p>
    </section>
  );
}

export function StudentLearningExperience({
  churchId,
  courseId = null,
  theme,
}: {
  churchId: number;
  courseId?: number | null;
  theme: FoundationTheme;
}) {
  const utils = trpc.useUtils();
  const coursePathQuery = trpc.escolaFundamentos.learningPath.useQuery(
    { churchId, courseId: courseId ?? 0 },
    { enabled: Boolean(courseId), staleTime: 30_000 }
  );
  const studentPathQuery = trpc.escolaFundamentos.studentPath.useQuery(
    { churchId },
    { enabled: !courseId, staleTime: 30_000 }
  );
  const path = (courseId ? coursePathQuery.data : studentPathQuery.data) as
    | StudentPathResponse
    | undefined;
  const isLoading = courseId
    ? coursePathQuery.isLoading
    : studentPathQuery.isLoading;
  const resolvedCourseId = courseId ?? path?.course?.id ?? null;
  const invalidateStudentPath = () =>
    courseId
      ? utils.escolaFundamentos.learningPath.invalidate({ churchId, courseId })
      : utils.escolaFundamentos.studentPath.invalidate({ churchId });

  const [selectedLesson, setSelectedLesson] =
    useState<StudentLessonItem | null>(null);
  const [selectedBlockIndex, setSelectedBlockIndex] = useState(0);
  const [reflection, setReflection] = useState("");
  const [reflectionDirty, setReflectionDirty] = useState(false);
  const [noteNavigating, setNoteNavigating] = useState(false);
  const noteQueue = useRef(createStageNoteQueue());
  const noteDrafts = useRef(new Map<string, string>());
  const [questionAnswers, setQuestionAnswers] = useState<
    Record<number, string>
  >({});
  const [questionResults, setQuestionResults] = useState<
    Record<
      number,
      { isCorrect: boolean; explanation: string; attemptNumber: number }
    >
  >({});
  const [completedBlockIds, setCompletedBlockIds] = useState<Set<number>>(
    new Set()
  );
  const [studyReadyToComplete, setStudyReadyToComplete] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);

  const sessionQuery = trpc.escolaFundamentos.studySession.useQuery(
    {
      churchId,
      courseId: resolvedCourseId ?? 0,
      studyId: selectedLesson?.study.id ?? 0,
    },
    { enabled: Boolean(selectedLesson && resolvedCourseId) }
  );
  const session = sessionQuery.data as StudentSession | undefined;
  const blocks = session?.blocks ?? [];
  const activeBlock = blocks[selectedBlockIndex] ?? null;
  const activeBlockCompleted = Boolean(
    activeBlock &&
      (activeBlock.status === "concluida" ||
        completedBlockIds.has(activeBlock.id))
  );
  const currentBlockQuestionsComplete = Boolean(
    activeBlock &&
      activeBlock.questions.every(
        question =>
          question.isCorrect || questionResults[question.id]?.isCorrect
      )
  );
  const completedStudyCount = (path?.items ?? []).filter(
    item => item.progress?.status === "concluida"
  ).length;
  const preparationCompleted = Boolean(
    path?.items.length && completedStudyCount === path.items.length
  );
  const activeStudyId =
    [...(path?.items ?? [])]
      .reverse()
      .find(item => item.available && item.progress?.status !== "concluida")
      ?.study.id ??
    [...(path?.items ?? [])]
      .reverse()
      .find(item => item.progress?.status === "concluida")?.study.id ??
    0;
  const studentClassQuery = trpc.escolaFundamentos.studyClass.useQuery(
    { churchId, courseId: resolvedCourseId ?? 0, studyId: activeStudyId },
    { enabled: Boolean(resolvedCourseId && activeStudyId), staleTime: 30_000 }
  );
  const studentClass = studentClassQuery.data as
    | StudentClassResponse
    | undefined;
  const studentHistoryQuery = trpc.escolaFundamentos.studentHistory.useQuery(
    { churchId },
    { enabled: Boolean(churchId), staleTime: 30_000 }
  );
  const studentHistory =
    (studentHistoryQuery.data as StudentHistoryResponse | undefined)?.items ??
    [];
  const completedHistoryItems = useMemo(
    () => studentHistory.filter(item => item.progress?.status === "concluida"),
    [studentHistory]
  );
  const noteHistoryItems = useMemo(
    () =>
      studentHistory.filter(
        item =>
          item.progress?.status === "concluida" ||
          item.progress?.reflection?.trim() ||
          item.stageReflections?.length
      ),
    [studentHistory]
  );
  const studyMaterialsQuery =
    trpc.escolaFundamentos.listStudyMaterials.useQuery(
      { churchId, studyId: selectedLesson?.study.id ?? 0 },
      { enabled: Boolean(selectedLesson?.study.id), staleTime: 5 * 60_000 }
    );
  const studyMaterials = (studyMaterialsQuery.data ?? []) as StudyMaterial[];

  const startLesson = trpc.escolaFundamentos.startLesson.useMutation({
    onSuccess: invalidateStudentPath,
    onError: error =>
      toast.error(error.message || "Não foi possível iniciar o estudo."),
  });
  const viewStudyBlock = trpc.escolaFundamentos.viewStudyBlock.useMutation({
    onError: error =>
      toast.error(
        error.message || "Não foi possível salvar o ponto de leitura."
      ),
  });
  const answerQuestion = trpc.escolaFundamentos.answerQuestion.useMutation({
    onSuccess: (result, variables) =>
      setQuestionResults(current => ({
        ...current,
        [variables.questionId]: result,
      })),
    onError: error =>
      toast.error(error.message || "Não foi possível registrar a resposta."),
  });
  const completeStudyBlock =
    trpc.escolaFundamentos.completeStudyBlock.useMutation({
      onSuccess: result => {
        setCompletedBlockIds(current =>
          new Set(current).add(result.completedBlockId)
        );
        if (result.nextBlock) {
          const nextIndex = blocks.findIndex(
            block => block.id === result.nextBlock?.id
          );
          setSelectedBlockIndex(
            nextIndex >= 0 ? nextIndex : selectedBlockIndex + 1
          );
          setReflection(
            nextIndex >= 0 ? savedNoteValue(blocks[nextIndex]) : ""
          );
          setReflectionDirty(false);
          setQuestionAnswers({});
          setQuestionResults({});
        } else setStudyReadyToComplete(true);
        void sessionQuery.refetch();
      },
      onError: error =>
        toast.error(error.message || "Não foi possível avançar nesta etapa."),
    });
  const saveBlockReflection =
    trpc.escolaFundamentos.saveBlockReflection.useMutation({
      onSuccess: (_result, variables) => {
        utils.escolaFundamentos.studySession.setData(
          {
            churchId: variables.churchId,
            courseId: variables.courseId,
            studyId: variables.studyId,
          },
          current =>
            current
              ? {
                  ...current,
                  blocks: current.blocks.map(block =>
                    block.id === variables.blockId
                      ? { ...block, reflection: variables.reflection }
                      : block
                  ),
                }
              : current
        );
        void invalidateStudentPath();
        void utils.escolaFundamentos.studentHistory.invalidate({ churchId });
      },
      onError: error =>
        toast.error(error.message || "Não foi possível salvar sua anotação."),
    });
  const saveLegacyReflection =
    trpc.escolaFundamentos.saveReflection.useMutation({
      onSuccess: () => {
        void utils.escolaFundamentos.studentHistory.invalidate({ churchId });
      },
      onError: error =>
        toast.error(error.message || "Não foi possível salvar sua anotação."),
    });
  const noteKey = (studyId: number, blockId: number | null) =>
    `${churchId}:${studyId}:${blockId ?? "legacy"}`;
  const savedNoteValue = (block: SessionBlock | undefined) =>
    block
      ? (noteDrafts.current.get(noteKey(selectedLesson!.study.id, block.id)) ??
        block.reflection ??
        "")
      : "";
  const persistNote = (payload: StageNotePayload) =>
    noteQueue.current.save(payload, note => {
      if (note.blockId !== null)
        return saveBlockReflection.mutateAsync({
          ...note,
          blockId: note.blockId,
        });
      const { blockId: _blockId, ...legacy } = note;
      return saveLegacyReflection.mutateAsync(legacy);
    });
  const flushNote = async () => {
    if (!selectedLesson || !resolvedCourseId || !reflectionDirty) return true;
    setNoteNavigating(true);
    try {
      await persistNote({
        churchId,
        courseId: resolvedCourseId,
        studyId: selectedLesson.study.id,
        blockId: activeBlock?.id ?? null,
        reflection: reflection.trim() || null,
      });
      setReflectionDirty(false);
      return true;
    } catch {
      return false;
    } finally {
      setNoteNavigating(false);
    }
  };
  const completeLesson = trpc.escolaFundamentos.completeLesson.useMutation({
    onSuccess: async () => {
      toast.success("Preparação concluída. Aguarde a aula presencial.");
      setSelectedLesson(null);
      await invalidateStudentPath();
    },
    onError: error =>
      toast.error(error.message || "Não foi possível concluir a preparação."),
  });

  useEffect(() => {
    if (!session || !selectedLesson) return;
    const resumeIndex = session.blocks.findIndex(
      block => block.position === session.resume.position
    );
    setSelectedBlockIndex(resumeIndex >= 0 ? resumeIndex : 0);
    const initialBlock = session.blocks[resumeIndex >= 0 ? resumeIndex : 0];
    setReflection(
      initialBlock
        ? (initialBlock.reflection ?? "")
        : (selectedLesson.progress?.reflection ?? "")
    );
    setReflectionDirty(false);
    setCompletedBlockIds(
      new Set(
        session.blocks
          .filter(block => block.status === "concluida")
          .map(block => block.id)
      )
    );
    setStudyReadyToComplete(session.progress?.status === "concluida");
  }, [session?.study.id, selectedLesson?.study.id]);

  useEffect(() => {
    if (!selectedLesson || !resolvedCourseId || !activeBlock) return;
    viewStudyBlock.mutate({
      churchId,
      courseId: resolvedCourseId,
      studyId: selectedLesson.study.id,
      blockId: activeBlock.id,
    });
  }, [activeBlock?.id, selectedLesson?.study.id, resolvedCourseId]);

  useEffect(() => {
    if (
      !selectedLesson ||
      !resolvedCourseId ||
      !reflectionDirty ||
      noteNavigating
    )
      return;
    const payload: StageNotePayload = {
      churchId,
      courseId: resolvedCourseId,
      studyId: selectedLesson.study.id,
      blockId: activeBlock?.id ?? null,
      reflection: reflection.trim() || null,
    };
    const timeout = window.setTimeout(() => {
      void persistNote(payload).catch(() => undefined);
    }, 700);
    return () => window.clearTimeout(timeout);
  }, [
    reflection,
    reflectionDirty,
    activeBlock?.id,
    selectedLesson?.study.id,
    resolvedCourseId,
    noteNavigating,
  ]);

  const currentItem = useMemo(() => {
    const pending =
      path?.items.filter(
        item => item.available && item.progress?.status !== "concluida"
      ) ?? [];
    return pending[pending.length - 1] ?? null;
  }, [path?.items]);

  const openLesson = (item: StudentLessonItem) => {
    if (!item.available || !resolvedCourseId) return;
    noteDrafts.current.clear();
    setSelectedLesson(item);
    setReflection(item.progress?.reflection ?? "");
    setReflectionDirty(false);
    setQuestionAnswers({});
    setQuestionResults({});
    setCompletedBlockIds(new Set());
    setStudyReadyToComplete(item.progress?.status === "concluida");
    setSelectedBlockIndex(Math.max(0, item.progress?.lastBlockPosition ?? 0));
    if (item.progress?.status !== "concluida")
      startLesson.mutate({
        churchId,
        courseId: resolvedCourseId,
        studyId: item.study.id,
        lastBlockPosition: item.progress?.lastBlockPosition ?? 0,
      });
  };

  const selectBlock = async (index: number) => {
    const block = blocks[index];
    if (!block || block.status === "bloqueada" || noteNavigating) return;
    if (!(await flushNote())) return;
    setSelectedBlockIndex(index);
    setReflection(savedNoteValue(block));
    setReflectionDirty(false);
    setQuestionAnswers({});
    setQuestionResults({});
  };

  const submitAnswer = (
    question: SessionQuestion,
    selectedOptionId: string
  ) => {
    if (!resolvedCourseId || !selectedLesson) return;
    setQuestionAnswers(current => ({
      ...current,
      [question.id]: selectedOptionId,
    }));
    answerQuestion.mutate({
      churchId,
      courseId: resolvedCourseId,
      studyId: selectedLesson.study.id,
      questionId: question.id,
      selectedOptionId,
      clientAttemptId: createClientAttemptId(),
    });
  };

  const advanceBlock = async () => {
    if (!selectedLesson || !resolvedCourseId || !activeBlock || noteNavigating)
      return;
    if (!(await flushNote())) return;
    if (activeBlockCompleted) {
      const nextIndex = blocks.findIndex(
        (block, index) =>
          index > selectedBlockIndex && block.status !== "bloqueada"
      );
      if (nextIndex >= 0) {
        setSelectedBlockIndex(nextIndex);
        setReflection(savedNoteValue(blocks[nextIndex]));
        setReflectionDirty(false);
      } else setStudyReadyToComplete(true);
      return;
    }
    if (currentBlockQuestionsComplete)
      completeStudyBlock.mutate({
        churchId,
        courseId: resolvedCourseId,
        studyId: selectedLesson.study.id,
        blockId: activeBlock.id,
      });
  };

  const closeLesson = async () => {
    if (noteNavigating || !(await flushNote())) return;
    setSelectedLesson(null);
    setReflectionDirty(false);
  };
  const finishLesson = async () => {
    if (
      !selectedLesson ||
      !resolvedCourseId ||
      noteNavigating ||
      !(await flushNote())
    )
      return;
    completeLesson.mutate({
      churchId,
      courseId: resolvedCourseId,
      studyId: selectedLesson.study.id,
      lastBlockPosition:
        activeBlock?.position ??
        selectedLesson.progress?.lastBlockPosition ??
        0,
      // Nunca copie a nota da etapa para o registro histórico geral.
      reflection: blocks.length
        ? (selectedLesson.progress?.reflection ?? null)
        : reflection.trim() || null,
    });
  };

  if (isLoading)
    return <div className="mb-5 h-56 animate-pulse rounded-2xl bg-muted/30" />;
  if (!path?.enrollment)
    return (
      <section
        className="mb-5 rounded-2xl border border-dashed p-5"
        style={{
          borderColor: makeFoundationSoftColor(theme.accent, 35, "white"),
          backgroundColor: theme.accentSoft,
        }}
      >
        <p className="text-sm font-semibold" style={{ color: theme.primary }}>
          Sua preparação ainda não foi liberada.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Quando a liderança vincular você à Escola, o estudo disponível
          aparecerá aqui automaticamente.
        </p>
      </section>
    );
  if (!path.items.length)
    return (
      <section
        className="mb-5 rounded-2xl border border-dashed p-5"
        style={{
          borderColor: makeFoundationSoftColor(theme.accent, 35, "white"),
          backgroundColor: theme.accentSoft,
        }}
      >
        <p className="text-sm font-semibold" style={{ color: theme.primary }}>
          Preparação em organização
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          A liderança ainda está organizando os estudos desta etapa.
        </p>
      </section>
    );

  const themeStyle = {
    "--foundation-primary": theme.primary,
    "--foundation-accent": theme.accent,
  } as CSSProperties;
  return (
    <div style={themeStyle}>
      <section className="mb-5 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
        <div className="p-4 sm:p-5">
          <div className="mb-4 flex items-start gap-3">
            <div
              className="rounded-xl p-2"
              style={{
                backgroundColor: theme.primary,
                color: theme.primaryForeground,
              }}
            >
              <BookOpen className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3
                className="font-display text-lg"
                style={{ color: theme.primary }}
              >
                Minha preparação
              </h3>
              <p className="text-sm text-muted-foreground">
                {completedStudyCount} de {path.items.length} estudos concluídos
              </p>
            </div>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full transition-[width] duration-200"
              style={{
                width: `${Math.round((completedStudyCount / path.items.length) * 100)}%`,
                backgroundColor: theme.primary,
              }}
            />
          </div>
          {preparationCompleted ? (
            <div
              className="mt-5 rounded-xl p-4"
              style={{
                backgroundColor: makeFoundationSoftColor(
                  theme.primary,
                  9,
                  "white"
                ),
                color: theme.primary,
              }}
            >
              <div className="flex items-start gap-3">
                <CheckCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <p className="font-semibold">Preparação concluída</p>
                  <p className="mt-1 text-sm">
                    Leve suas anotações para a aula presencial.
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="mt-4 w-full justify-center gap-2 bg-white/80 hover:opacity-90"
                style={{
                  borderColor: makeFoundationSoftColor(
                    theme.primary,
                    35,
                    "white"
                  ),
                  color: theme.primary,
                }}
                onClick={() => setNotesDialogOpen(true)}
              >
                <StickyNote className="h-4 w-4" />
                Ver minhas anotações
              </Button>
            </div>
          ) : currentItem ? (
            <div
              className="mt-5 rounded-xl p-4"
              style={{
                backgroundColor: theme.primary,
                color: theme.primaryForeground,
              }}
            >
              <p
                className="text-xs font-semibold uppercase tracking-[0.16em]"
                style={{ color: theme.accent }}
              >
                Estudo da semana
              </p>
              <p className="mt-1 text-lg font-semibold">
                {currentItem.study.title}
              </p>
              {currentItem.study.weekStart ? (
                <p className="mt-1 text-xs opacity-75">
                  Semana de {formatCivilDate(currentItem.study.weekStart)}
                </p>
              ) : null}
              {currentItem.study.summary ? (
                <p className="mt-1 text-sm opacity-80">
                  {currentItem.study.summary}
                </p>
              ) : null}
              <Button
                type="button"
                size="sm"
                className="mt-4 bg-white hover:bg-white/90"
                style={{ color: theme.primary }}
                onClick={() => openLesson(currentItem)}
              >
                <Play className="mr-1 h-3.5 w-3.5" />
                {currentItem.progress?.status === "em_andamento"
                  ? "Continuar estudo"
                  : "Começar estudo"}
              </Button>
            </div>
          ) : (
            <div
              className="mt-5 rounded-xl p-4"
              style={{ backgroundColor: theme.accentSoft }}
            >
              <p className="font-semibold" style={{ color: theme.primary }}>
                Próximo estudo ainda não disponível
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Ele aparecerá quando chegar a data definida pela liderança.
              </p>
            </div>
          )}
        </div>
        <div className="border-t border-black/5 px-4 py-3 sm:px-5">
          <p className="flex items-center gap-2 text-xs text-slate-500">
            <MessageSquareText
              className="h-4 w-4"
              style={{ color: theme.accent }}
            />
            Suas respostas e anotações ficam salvas nesta igreja.
          </p>
        </div>
      </section>

      <section className="mb-5 rounded-2xl border border-black/5 bg-white p-4 shadow-sm sm:p-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Sequência da preparação
        </p>
        <div className="space-y-3">
          {path.items.map((item, index) => {
            const progress = item.progress;
            const status =
              progress?.status === "concluida"
                ? "Estudo concluído"
                : progress?.status === "em_andamento"
                  ? "Em andamento"
                  : item.available
                    ? "Disponível"
                    : "Aguardando orientação";
            const isCurrent = currentItem?.study.id === item.study.id;
            return (
              <div
                key={item.study.id}
                className="rounded-xl border p-3"
                style={{
                  borderColor: item.available
                    ? makeFoundationSoftColor(theme.primary, 18, "white")
                    : "#e5e7eb",
                  backgroundColor: item.available ? "white" : "#f7f8f6",
                }}
              >
                <div className="flex items-start gap-3">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold"
                    style={
                      progress?.status === "concluida"
                        ? {
                            backgroundColor: makeFoundationSoftColor(
                              theme.primary,
                              16,
                              "white"
                            ),
                            color: theme.primary,
                          }
                        : item.available
                          ? {
                              backgroundColor: theme.accentSoft,
                              color: theme.primary,
                            }
                          : { backgroundColor: "#e7ebe7", color: "#68736c" }
                    }
                  >
                    {progress?.status === "concluida" ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : item.available ? (
                      index + 1
                    ) : (
                      <Lock className="h-4 w-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Estudo {index + 1}
                    </p>
                    <p
                      className="mt-0.5 font-semibold"
                      style={{ color: theme.primary }}
                    >
                      {item.study.title}
                    </p>
                    {item.study.summary ? (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {item.study.summary}
                      </p>
                    ) : null}
                    <Badge
                      className="mt-2"
                      variant={
                        progress?.status === "concluida"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {status}
                    </Badge>
                  </div>
                  {isCurrent ? (
                    <Badge
                      className="shrink-0"
                      style={{
                        backgroundColor: theme.accent,
                        color: theme.accentForeground,
                      }}
                    >
                      Atual
                    </Badge>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      variant={item.available ? "outline" : "ghost"}
                      disabled={!item.available}
                      onClick={() => openLesson(item)}
                      className="shrink-0 gap-1"
                    >
                      {item.available ? (
                        <Play className="h-3.5 w-3.5" />
                      ) : (
                        <Lock className="h-3.5 w-3.5" />
                      )}
                      {item.available
                        ? progress?.status === "em_andamento"
                          ? "Continuar estudo"
                          : progress?.status === "concluida"
                            ? "Revisar estudo"
                            : "Começar estudo"
                        : "Aguardando"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <StudentHistorySection
        items={studentHistory}
        isLoading={studentHistoryQuery.isLoading}
        theme={theme}
      />

      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <AdaptiveFormDialogContent className="sm:max-w-2xl">
          <div className={adaptiveFormDialogHeaderClassName}>
            <DialogTitle
              className="font-display"
              style={{ color: theme.primary }}
            >
              Minhas anotações
            </DialogTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Veja suas anotações por etapa e as anotações antigas, mesmo nos
              estudos em andamento, sem precisar revisar a preparação.
            </p>
          </div>
          <AdaptiveFormDialogBody
            className="space-y-3"
            style={{ backgroundColor: "#f8f8f5" }}
          >
            {noteHistoryItems.map(item => (
              <section
                key={item.study.id}
                className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm sm:p-5"
              >
                <div className="flex items-start gap-3">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                    style={{
                      backgroundColor: theme.primarySoft,
                      color: theme.primary,
                    }}
                  >
                    <StickyNote className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p
                      className="font-semibold"
                      style={{ color: theme.primary }}
                    >
                      {item.study.title}
                    </p>
                    {item.study.weekStart ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Semana de {formatCivilDate(item.study.weekStart)}
                      </p>
                    ) : null}
                  </div>
                </div>
                {item.progress?.reflection?.trim() ? (
                  <p
                    className="mt-4 whitespace-pre-line rounded-xl p-3 text-sm leading-6 text-slate-700"
                    style={{ backgroundColor: theme.accentSoft }}
                  >
                    <span className="mb-2 block font-semibold">
                      Anotação geral do estudo
                    </span>
                    {item.progress.reflection}
                  </p>
                ) : !item.stageReflections?.length ? (
                  <p className="mt-4 rounded-xl border border-dashed border-slate-200 p-3 text-sm text-muted-foreground">
                    Nenhuma anotação registrada neste estudo.
                  </p>
                ) : null}
                {item.stageReflections?.length ? (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      Anotações por etapa
                    </p>
                    {item.stageReflections.map(stage => (
                      <div
                        key={stage.blockId}
                        className="rounded-xl border border-slate-200 bg-[#fcfbf8] p-3"
                      >
                        <p
                          className="font-semibold"
                          style={{ color: theme.primary }}
                        >
                          {stage.title}
                        </p>
                        {stage.reflectionPrompt?.trim() ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {stage.reflectionPrompt}
                          </p>
                        ) : null}
                        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-700">
                          {stage.reflection}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </section>
            ))}
          </AdaptiveFormDialogBody>
          <AdaptiveFormDialogFooter>
            <Button
              type="button"
              onClick={() => setNotesDialogOpen(false)}
              style={{
                backgroundColor: theme.primary,
                color: theme.primaryForeground,
              }}
            >
              Fechar
            </Button>
          </AdaptiveFormDialogFooter>
        </AdaptiveFormDialogContent>
      </Dialog>

      <Dialog
        open={Boolean(selectedLesson)}
        onOpenChange={open => !open && closeLesson()}
      >
        <AdaptiveFormDialogContent className="sm:max-w-6xl lg:max-h-[calc(100dvh-3rem)]">
          <div className={adaptiveFormDialogHeaderClassName}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <DialogTitle
                  className="truncate font-display"
                  style={{ color: theme.primary }}
                >
                  {selectedLesson?.study.title}
                </DialogTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Leia com calma. Esta preparação não é uma prova. Volte quando
                  precisar; nada do que você preencheu será perdido.
                </p>
              </div>
              {session?.study.weekStart ? (
                <Badge variant="outline" className="shrink-0">
                  Semana de {formatCivilDate(session.study.weekStart)}
                </Badge>
              ) : null}
            </div>
            {blocks.length ? (
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                  <span>
                    Etapa {selectedBlockIndex + 1} de {blocks.length}
                  </span>
                  <span>
                    {Math.round(
                      ((selectedBlockIndex + 1) / blocks.length) * 100
                    )}
                    %
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.round(((selectedBlockIndex + 1) / blocks.length) * 100)}%`,
                      backgroundColor: theme.primary,
                    }}
                  />
                </div>
              </div>
            ) : null}
          </div>
          <AdaptiveFormDialogBody
            className="space-y-4 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:pb-20"
            style={{ backgroundColor: "#f8f8f5" }}
          >
            {sessionQuery.isLoading ? (
              <div className="h-72 animate-pulse rounded-xl bg-muted/30" />
            ) : (
              <div className="space-y-4">
                {session?.study.content?.trim() && session.blocks.length > 0 ? (
                  <StudyOverviewCard
                    content={session.study.content}
                    theme={theme}
                  />
                ) : null}
                <StepRail
                  blocks={blocks}
                  selectedBlockIndex={selectedBlockIndex}
                  completedBlockIds={completedBlockIds}
                  onSelect={selectBlock}
                  theme={theme}
                />
                <StudentStudyProgressSummary
                  blocks={blocks}
                  selectedBlockIndex={selectedBlockIndex}
                  completedBlockIds={completedBlockIds}
                  theme={theme}
                />
                <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
                  <main className="min-w-0 space-y-4">
                    <Card className="border-black/5 shadow-sm">
                      <CardContent className="space-y-4 p-4 sm:p-6">
                        {activeBlock ? (
                          <>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge
                                style={{
                                  backgroundColor: theme.accent,
                                  color: theme.accentForeground,
                                }}
                              >
                                ETAPA {selectedBlockIndex + 1} DE{" "}
                                {blocks.length}
                              </Badge>
                              {activeBlockCompleted ? (
                                <Badge variant="default">Concluída</Badge>
                              ) : null}
                            </div>
                            <div>
                              <h3
                                className="font-display text-2xl sm:text-3xl"
                                style={{ color: theme.primary }}
                              >
                                {activeBlock.title}
                              </h3>
                              <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                Parte atual da preparação
                              </p>
                              <p className="mt-3 whitespace-pre-line text-base leading-8 text-slate-700">
                                {activeBlock.content}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 border-t border-black/5 pt-4 text-sm text-muted-foreground">
                              <Clock3
                                className="h-4 w-4"
                                style={{ color: theme.accent }}
                              />
                              Leitura curta para esta etapa
                            </div>
                          </>
                        ) : (
                          <>
                            <Badge
                              style={{
                                backgroundColor: theme.accent,
                                color: theme.accentForeground,
                              }}
                            >
                              LEITURA DO ESTUDO
                            </Badge>
                            <p className="mt-4 whitespace-pre-line text-base leading-8 text-slate-700">
                              {session?.study.content ||
                                "O conteúdo deste estudo ainda está sendo preparado."}
                            </p>
                          </>
                        )}
                      </CardContent>
                    </Card>
                    {activeBlock?.questions.length ? (
                      <Card className="border-black/5 shadow-sm">
                        <CardContent className="space-y-4 p-4 sm:p-6">
                          <div>
                            <p
                              className="text-xs font-semibold uppercase tracking-[0.16em]"
                              style={{ color: theme.accent }}
                            >
                              Responda
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Responda com calma. Se errar, você verá uma
                              explicação e poderá tentar novamente.
                            </p>
                          </div>
                          {activeBlock.questions.map(question => {
                            const answer = questionAnswers[question.id];
                            const result = questionResults[question.id];
                            const correct =
                              question.isCorrect || result?.isCorrect;
                            return (
                              <div
                                key={question.id}
                                className="space-y-3 border-t border-black/5 pt-4 first:border-t-0 first:pt-0"
                              >
                                <p
                                  className="font-semibold"
                                  style={{ color: theme.primary }}
                                >
                                  {question.prompt}
                                </p>
                                <div className="grid gap-2">
                                  {question.options.map(option => (
                                    <button
                                      key={option.id}
                                      type="button"
                                      aria-pressed={answer === option.id}
                                      disabled={
                                        Boolean(correct) ||
                                        answerQuestion.isPending
                                      }
                                      onClick={() =>
                                        setQuestionAnswers(current => ({
                                          ...current,
                                          [question.id]: option.id,
                                        }))
                                      }
                                      className="min-h-12 rounded-xl border px-3 py-3 text-left text-sm"
                                      style={
                                        answer === option.id
                                          ? {
                                              borderColor: theme.primary,
                                              backgroundColor:
                                                theme.primarySoft,
                                              color: theme.primary,
                                            }
                                          : {
                                              borderColor: "#dfe3de",
                                              backgroundColor: "white",
                                              color: "#33423a",
                                            }
                                      }
                                    >
                                      {option.label}
                                    </button>
                                  ))}
                                </div>
                                {result ? (
                                  <div
                                    className={`rounded-xl p-3 text-sm ${result.isCorrect ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}
                                  >
                                    <p className="font-semibold">
                                      {result.isCorrect
                                        ? "Resposta correta"
                                        : "Vamos revisar"}
                                    </p>
                                    <p className="mt-1">{result.explanation}</p>
                                    {!result.isCorrect ? (
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="mt-2"
                                        onClick={() =>
                                          setQuestionResults(current => {
                                            const next = { ...current };
                                            delete next[question.id];
                                            return next;
                                          })
                                        }
                                      >
                                        <RotateCcw className="mr-1 h-3.5 w-3.5" />
                                        Tentar novamente
                                      </Button>
                                    ) : null}
                                  </div>
                                ) : question.isCorrect ? (
                                  <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">
                                    <p className="font-semibold">
                                      Pergunta já concluída
                                    </p>
                                    <p className="mt-1">
                                      Você já acertou esta pergunta em uma
                                      tentativa anterior.
                                    </p>
                                  </div>
                                ) : (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="w-full"
                                    disabled={
                                      !answer || answerQuestion.isPending
                                    }
                                    onClick={() =>
                                      answer && submitAnswer(question, answer)
                                    }
                                  >
                                    {answerQuestion.isPending
                                      ? "Registrando…"
                                      : "Registrar resposta"}
                                  </Button>
                                )}
                              </div>
                            );
                          })}
                        </CardContent>
                      </Card>
                    ) : null}
                    <StageReflectionCard
                      prompt={activeBlock?.reflectionPrompt}
                      stageTitle={activeBlock?.title}
                      reflection={reflection}
                      setReflection={value => {
                        setReflection(value);
                        if (selectedLesson)
                          noteDrafts.current.set(
                            noteKey(
                              selectedLesson.study.id,
                              activeBlock?.id ?? null
                            ),
                            value
                          );
                        setReflectionDirty(true);
                      }}
                      theme={theme}
                      isSaving={
                        saveBlockReflection.isPending ||
                        saveLegacyReflection.isPending
                      }
                      hasError={Boolean(
                        activeBlock
                          ? saveBlockReflection.error &&
                              saveBlockReflection.variables?.blockId ===
                                activeBlock.id &&
                              saveBlockReflection.variables?.studyId ===
                                selectedLesson?.study.id
                          : saveLegacyReflection.error &&
                              saveLegacyReflection.variables?.studyId ===
                                selectedLesson?.study.id
                      )}
                      isUnsaved={
                        reflectionDirty &&
                        (reflection.trim() || null) !==
                          (activeBlock
                            ? (activeBlock.reflection ?? null)
                            : (selectedLesson?.progress?.reflection ?? null))
                      }
                      disabled={noteNavigating}
                    />
                  </main>
                  <aside className="space-y-4">
                    <StudyMaterials materials={studyMaterials} theme={theme} />
                  </aside>
                </div>
              </div>
            )}
          </AdaptiveFormDialogBody>
          <AdaptiveFormDialogFooter>
            <Button type="button" variant="outline" onClick={closeLesson}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Sair do estudo
            </Button>
            {sessionQuery.isLoading ? null : activeBlock &&
              blocks.length &&
              !(
                activeBlockCompleted && selectedBlockIndex === blocks.length - 1
              ) ? (
              <Button
                type="button"
                style={{
                  backgroundColor: theme.primary,
                  color: theme.primaryForeground,
                }}
                disabled={
                  completeStudyBlock.isPending ||
                  noteNavigating ||
                  (!activeBlockCompleted && !currentBlockQuestionsComplete)
                }
                onClick={advanceBlock}
              >
                {completeStudyBlock.isPending
                  ? "Salvando…"
                  : activeBlockCompleted
                    ? "Próxima etapa"
                    : currentBlockQuestionsComplete
                      ? "Concluir etapa"
                      : "Responda à pergunta"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : activeBlock && blocks.length ? null : session ? (
              <Button
                type="button"
                style={{
                  backgroundColor: theme.primary,
                  color: theme.primaryForeground,
                }}
                disabled={completeLesson.isPending || !resolvedCourseId}
                onClick={finishLesson}
              >
                <Save className="mr-2 h-4 w-4" />
                {completeLesson.isPending ? "Salvando…" : "Concluir estudo"}
              </Button>
            ) : null}
            {blocks.length > 0 &&
            (studyReadyToComplete ||
              (activeBlock &&
                selectedBlockIndex === blocks.length - 1 &&
                activeBlockCompleted)) ? (
              <Button
                type="button"
                style={{
                  backgroundColor: theme.primary,
                  color: theme.primaryForeground,
                }}
                disabled={completeLesson.isPending || noteNavigating}
                onClick={finishLesson}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Concluir preparação
              </Button>
            ) : null}
          </AdaptiveFormDialogFooter>
        </AdaptiveFormDialogContent>
      </Dialog>
    </div>
  );
}

function createClientAttemptId() {
  if (typeof globalThis.crypto?.randomUUID === "function")
    return globalThis.crypto.randomUUID();
  return `foundation-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export function StudentStageNotes({
  prompt,
  stageTitle,
  value,
  onChange,
  primaryColor,
  preview = false,
  isSaving = false,
  hasError = false,
  isUnsaved = false,
  disabled = false,
}: {
  prompt?: string | null;
  stageTitle?: string;
  value: string;
  onChange: (value: string) => void;
  primaryColor: string;
  preview?: boolean;
  isSaving?: boolean;
  hasError?: boolean;
  isUnsaved?: boolean;
  disabled?: boolean;
}) {
  const id = "foundation-student-stage-note";
  return (
    <section className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm sm:p-5">
      {prompt?.trim() ? (
        <div className="mb-4 rounded-xl bg-muted/30 p-3">
          <p className="font-semibold" style={{ color: primaryColor }}>
            Para refletir
          </p>
          <p className="mt-1 whitespace-pre-line text-sm leading-6 text-slate-700">
            {prompt}
          </p>
        </div>
      ) : null}
      <label
        htmlFor={id}
        className="font-semibold"
        style={{ color: primaryColor }}
      >
        {stageTitle
          ? `Minha anotação em ${stageTitle}`
          : "Anotação geral do estudo"}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={event => onChange(event.target.value)}
        disabled={disabled}
        rows={6}
        maxLength={4000}
        placeholder="Escreva sua anotação pessoal."
        className="mt-3 block min-h-36 w-full min-w-0 resize-y rounded-md border border-input bg-[#fcfbf8] px-3 py-2 text-base leading-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      />
      <p className="mt-2 text-xs text-muted-foreground" role="status">
        {preview
          ? "Somente prévia: esta anotação não será salva."
          : isSaving
            ? "Salvando…"
            : hasError
              ? "Não foi possível salvar. Sua anotação continua nesta tela; tente sair novamente quando a conexão voltar."
              : isUnsaved
                ? "Alteração pendente de salvamento…"
                : "Salvo automaticamente"}
      </p>
    </section>
  );
}
