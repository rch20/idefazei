import { FoundationStageNotes } from "./FoundationStageNotes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  AdaptiveFormDialogBody,
  AdaptiveFormDialogContent,
  AdaptiveFormDialogFooter,
  adaptiveFormDialogHeaderClassName,
} from "@/components/AdaptiveFormDialog";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Eye,
  Lightbulb,
  Save,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { StudyPartQuestions } from "./StudyPartQuestions";
import { StudyQuestionEditor } from "./StudyQuestionEditor";
import type { FoundationStudyPart } from "./StudyPartEditor";
import { getFoundationStageLabel } from "./studyStage";

type FoundationCourse = {
  id: number;
  name: string;
};

type FoundationModule = {
  id: number;
  title: string;
};

type FoundationStudy = {
  id: number;
  courseId: number;
  moduleId: number | null;
  title: string;
  weekStart?: string | null;
  summary?: string | null;
  content?: string | null;
  active: boolean;
};

type StudyQuestionRow = {
  block: { id: number };
  question: {
    id: number;
    prompt: string;
    options: Array<{ id: string; label: string }>;
    correctOptionId: string;
    explanation: string;
  };
};

const EMPTY_PARTS: FoundationStudyPart[] = [];
const EMPTY_QUESTIONS: StudyQuestionRow[] = [];

type EditorStageKey =
  | "info"
  | "leia"
  | "entenda"
  | "responda"
  | "aplique"
  | "review";

type EditorStage = {
  key: EditorStageKey;
  label: string;
  description: string;
};

const EDITOR_STAGES: EditorStage[] = [
  { key: "info", label: "Informações", description: "Título, turma e semana" },
  { key: "leia", label: "Leia", description: "Leitura para o aluno" },
  { key: "entenda", label: "Entenda", description: "Explicação principal" },
  { key: "responda", label: "Responda", description: "Perguntas e gabarito" },
  { key: "aplique", label: "Aplique", description: "Prática da semana" },
  {
    key: "review",
    label: "Revisar e publicar",
    description: "Conferência final",
  },
];

function stageIndexForKey(key: EditorStageKey) {
  return EDITOR_STAGES.findIndex(stage => stage.key === key);
}

function stageKeyForPart(
  part: FoundationStudyPart,
  index: number
): Exclude<EditorStageKey, "info" | "review"> {
  const label = getFoundationStageLabel(part.title, index).toLocaleLowerCase(
    "pt-BR"
  );
  if (label === "entenda") return "entenda";
  if (label === "responda") return "responda";
  if (label === "aplique") return "aplique";
  return "leia";
}

function currentBlockForStage(
  parts: FoundationStudyPart[],
  stageKey: EditorStageKey
) {
  const targetIndex = ["leia", "entenda", "responda", "aplique"].indexOf(
    stageKey
  );
  if (targetIndex < 0) return null;
  return (
    parts.find((part, index) => stageKeyForPart(part, index) === stageKey) ??
    parts[targetIndex] ??
    null
  );
}

export function PreviewPane({
  title,
  summary,
  content,
  block,
  questions,
  primaryColor,
  secondaryColor,
  onClose,
  modal = false,
}: {
  title: string;
  summary: string;
  content: string;
  block: FoundationStudyPart | null;
  questions: StudyQuestionRow[];
  primaryColor: string;
  secondaryColor: string;
  onClose?: () => void;
  modal?: boolean;
}) {
  const [previewNotes, setPreviewNotes] = useState<Record<string, string>>({});
  const [previewAnswers, setPreviewAnswers] = useState<Record<number, string>>(
    {}
  );
  const [previewChecked, setPreviewChecked] = useState<Record<number, boolean>>(
    {}
  );
  const questionRows = block
    ? questions.filter(row => row.block.id === block.id)
    : [];
  const body = (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p
            className="text-xs font-semibold uppercase tracking-[0.16em]"
            style={{ color: secondaryColor }}
          >
            Prévia do aluno
          </p>
          <h3
            className="mt-1 text-xl font-bold"
            style={{ color: primaryColor }}
          >
            {title || "Título do estudo"}
          </h3>
          {summary ? (
            <p className="mt-1 text-sm text-muted-foreground">{summary}</p>
          ) : null}
        </div>
        {modal && onClose ? (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Voltar à edição"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        <strong>Modo prévia:</strong> nada nesta tela salva resposta, progresso
        ou anotação.
      </div>
      {content.trim() ? (
        <section className="rounded-xl border bg-white p-4">
          <p
            className="text-xs font-semibold uppercase tracking-[0.14em]"
            style={{ color: secondaryColor }}
          >
            Introdução
          </p>
          <p className="mt-2 whitespace-pre-line text-sm leading-7 text-slate-700">
            {content}
          </p>
        </section>
      ) : null}
      <section className="rounded-xl border bg-white p-4">
        <div className="flex items-center gap-2">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white"
            style={{ backgroundColor: primaryColor }}
          >
            {block ? block.position + 1 : "—"}
          </span>
          <div className="min-w-0">
            <p
              className="text-xs font-semibold uppercase tracking-[0.14em]"
              style={{ color: secondaryColor }}
            >
              Etapa do aluno
            </p>
            <h4
              className="truncate font-semibold"
              style={{ color: primaryColor }}
            >
              {block?.title || "Selecione uma etapa"}
            </h4>
          </div>
        </div>
        <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700">
          {block?.content || "O conteúdo desta etapa aparecerá aqui."}
        </p>
      </section>
      {questionRows.length ? (
        <section className="rounded-xl border bg-white p-4">
          <p
            className="text-xs font-semibold uppercase tracking-[0.14em]"
            style={{ color: secondaryColor }}
          >
            Responda
          </p>
          <div className="mt-3 space-y-3">
            {questionRows.map(row => (
              <div
                key={row.question.id}
                className="rounded-lg border bg-slate-50/70 p-3"
              >
                <p className="font-medium" style={{ color: primaryColor }}>
                  {row.question.prompt}
                </p>
                <div className="mt-2 grid gap-2">
                  {row.question.options.map(option => (
                    <button
                      type="button"
                      key={option.id}
                      aria-pressed={
                        previewAnswers[row.question.id] === option.id
                      }
                      className="min-h-12 rounded-lg border bg-white px-3 py-2 text-left text-sm text-slate-700"
                      style={{
                        borderColor:
                          previewAnswers[row.question.id] === option.id
                            ? primaryColor
                            : undefined,
                      }}
                      onClick={() => {
                        setPreviewAnswers(current => ({
                          ...current,
                          [row.question.id]: option.id,
                        }));
                        setPreviewChecked(current => ({
                          ...current,
                          [row.question.id]: false,
                        }));
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {previewChecked[row.question.id] ? (
                  <div className="mt-3 rounded-lg bg-muted/30 p-3 text-sm">
                    <p className="font-semibold">
                      {previewAnswers[row.question.id] ===
                      row.question.correctOptionId
                        ? "Resposta correta"
                        : "Vamos revisar"}
                    </p>
                    <p className="mt-1">{row.question.explanation}</p>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-3"
                    disabled={!previewAnswers[row.question.id]}
                    onClick={() =>
                      setPreviewChecked(current => ({
                        ...current,
                        [row.question.id]: true,
                      }))
                    }
                  >
                    Conferir resposta
                  </Button>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  A resposta correta aparecerá ao aluno somente depois da
                  tentativa.
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}
      <FoundationStageNotes
        prompt={block?.reflectionPrompt}
        stageTitle={block?.title}
        value={previewNotes[String(block?.id ?? "legacy")] ?? ""}
        onChange={value =>
          setPreviewNotes(current => ({
            ...current,
            [String(block?.id ?? "legacy")]: value,
          }))
        }
        primaryColor={primaryColor}
        preview
      />
    </div>
  );
  if (!modal) return body;
  return (
    <Dialog open onOpenChange={open => !open && onClose?.()}>
      <AdaptiveFormDialogContent className="max-w-2xl sm:max-w-2xl">
        <DialogHeader className={adaptiveFormDialogHeaderClassName}>
          <DialogTitle style={{ color: primaryColor }}>
            Visualizar como aluno
          </DialogTitle>
          <DialogDescription>
            Prévia em tela cheia. Voltar à edição não perde o que está
            preenchido.
          </DialogDescription>
        </DialogHeader>
        <AdaptiveFormDialogBody className="bg-[#f8f8f5]">
          {body}
        </AdaptiveFormDialogBody>
        <AdaptiveFormDialogFooter>
          <Button
            type="button"
            onClick={onClose}
            style={{ backgroundColor: primaryColor, color: "white" }}
          >
            Voltar à edição
          </Button>
        </AdaptiveFormDialogFooter>
      </AdaptiveFormDialogContent>
    </Dialog>
  );
}

export function FoundationStudyEditor({
  open,
  study,
  churchId,
  courses,
  modules,
  primaryColor,
  secondaryColor,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  study: FoundationStudy | null;
  churchId: number;
  courses: FoundationCourse[];
  modules: FoundationModule[];
  primaryColor: string;
  secondaryColor: string;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const utils = trpc.useUtils();
  const [stageKey, setStageKey] = useState<EditorStageKey>("info");
  const [mobileStepsOpen, setMobileStepsOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [studyId, setStudyId] = useState<number | null>(null);
  const [courseId, setCourseId] = useState("");
  const [moduleId, setModuleId] = useState("none");
  const [title, setTitle] = useState("");
  const [weekStart, setWeekStart] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [parts, setParts] = useState<FoundationStudyPart[]>([]);
  const [selectedPartId, setSelectedPartId] = useState<number | null>(null);
  const saveIntent = useRef<{
    stage: EditorStageKey;
    advance: boolean;
    publish: boolean;
  } | null>(null);
  const dirtyPartIds = useRef(new Set<number>());
  const [saveFeedback, setSaveFeedback] = useState<{
    status: "idle" | "pending" | "success" | "error";
    message: string;
  }>({ status: "idle", message: "" });
  const [published, setPublished] = useState(false);
  const [questionEditorOpen, setQuestionEditorOpen] = useState(false);
  const [questionSaving, setQuestionSaving] = useState(false);
  const [confirmedQuestions, setConfirmedQuestions] = useState<
    StudyQuestionRow[]
  >([]);
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [completedStages, setCompletedStages] = useState<Set<EditorStageKey>>(
    new Set()
  );

  const { data: loadedParts = EMPTY_PARTS, isLoading: partsLoading } =
    trpc.escolaFundamentos.listQuestionBlocks.useQuery(
      { churchId, studyId: studyId ?? 0 },
      { enabled: open && Boolean(studyId) }
    );
  const {
    data: loadedQuestions = EMPTY_QUESTIONS,
    isLoading: questionsLoading,
  } = trpc.escolaFundamentos.manageStudyQuestions.useQuery(
    { churchId, studyId: studyId ?? 0 },
    { enabled: open && Boolean(studyId) }
  );
  const serverQuestions = loadedQuestions as StudyQuestionRow[];
  const questions = [
    ...serverQuestions,
    ...confirmedQuestions.filter(
      row =>
        !serverQuestions.some(saved => saved.question.id === row.question.id)
    ),
  ];
  const selectedPart =
    parts.find(part => part.id === selectedPartId) ??
    currentBlockForStage(parts, stageKey);
  const selectedPartQuestions = selectedPart
    ? questions.filter(row => row.block.id === selectedPart.id)
    : [];
  const currentStageIndex = stageIndexForKey(stageKey);
  const isLastStage = stageKey === "review";

  const resetFromStudy = (nextStudy: FoundationStudy | null) => {
    setStudyId(nextStudy?.id ?? null);
    setCourseId(
      nextStudy
        ? String(nextStudy.courseId)
        : courses[0]
          ? String(courses[0].id)
          : ""
    );
    setModuleId(nextStudy?.moduleId ? String(nextStudy.moduleId) : "none");
    setTitle(nextStudy?.title ?? "");
    setWeekStart(nextStudy?.weekStart ?? "");
    setSummary(nextStudy?.summary ?? "");
    setContent(nextStudy?.content ?? "");
    setStageKey("info");
    setMobileStepsOpen(false);
    setPreviewOpen(false);
    setQuestionEditorOpen(false);
    setQuestionSaving(false);
    setConfirmedQuestions([]);
    setPublishConfirmOpen(false);
    setSelectedPartId(null);
    saveIntent.current = null;
    dirtyPartIds.current.clear();
    setSaveFeedback({ status: "idle", message: "" });
    setPublished(nextStudy?.active ?? false);
    setCompletedStages(new Set());
  };

  useEffect(() => {
    if (!open) return;
    resetFromStudy(study);
  }, [open, study?.id]);

  useEffect(() => {
    if (!open) return;
    const typed = loadedParts as FoundationStudyPart[];
    // Uma reconsulta não pode apagar alterações locais de outra etapa.
    setParts(current =>
      typed.map(part =>
        dirtyPartIds.current.has(part.id)
          ? (current.find(local => local.id === part.id) ?? part)
          : part
      )
    );
    setSelectedPartId(current => current ?? typed[0]?.id ?? null);
  }, [open, loadedParts]);

  useEffect(() => {
    const block = currentBlockForStage(parts, stageKey);
    if (block) setSelectedPartId(block.id);
  }, [parts, stageKey]);

  const beginSave = (advance: boolean, publish = false) => {
    if (saveIntent.current) return false;
    saveIntent.current = { stage: stageKey, advance, publish };
    setSaveFeedback({ status: "pending", message: "Salvando no servidor…" });
    return true;
  };

  const confirmSave = (message: string) => {
    const intent = saveIntent.current;
    if (!intent) return;
    setCompletedStages(current => new Set(current).add(intent.stage));
    if (intent.advance) {
      const index = stageIndexForKey(intent.stage);
      setStageKey(
        EDITOR_STAGES[Math.min(index + 1, EDITOR_STAGES.length - 1)].key
      );
    }
    saveIntent.current = null;
    setSaveFeedback({ status: "success", message });
    toast.success(message);
  };

  const failSave = () => {
    saveIntent.current = null;
    const message =
      "Não foi possível confirmar o salvamento. Seu texto continua nesta tela. Tente novamente.";
    setSaveFeedback({ status: "error", message });
    toast.error(message);
  };

  const refreshLists = () => {
    // Revalidar o cache não faz parte da confirmação da gravação.
    void Promise.allSettled([
      utils.escolaFundamentos.listStudies.invalidate(),
      utils.escolaFundamentos.listModules.invalidate(),
      Promise.resolve().then(onSaved),
    ]);
  };

  const createStudy = trpc.escolaFundamentos.createStudy.useMutation({
    onSuccess: data => {
      const createdId = Number(data.studyId);
      setStudyId(createdId);
      confirmSave("Rascunho salvo.");
      refreshLists();
    },
    onError: failSave,
  });
  const updateStudy = trpc.escolaFundamentos.updateStudy.useMutation({
    onSuccess: () => {
      const publishing = saveIntent.current?.publish;
      if (publishing) setPublished(true);
      confirmSave(
        publishing ? "Estudo publicado para os alunos." : "Informações salvas."
      );
      refreshLists();
    },
    onError: failSave,
  });
  const updatePart = trpc.escolaFundamentos.updateQuestionBlock.useMutation({
    onSuccess: updated => {
      const next = updated as FoundationStudyPart;
      dirtyPartIds.current.delete(next.id);
      setParts(current =>
        current.map(part => (part.id === next.id ? next : part))
      );
      confirmSave("Etapa salva.");
      void utils.escolaFundamentos.listQuestionBlocks
        .invalidate({
          churchId,
          studyId: studyId ?? 0,
        })
        .catch(() => undefined);
      refreshLists();
    },
    onError: failSave,
  });
  const isPending =
    saveFeedback.status === "pending" ||
    createStudy.isPending ||
    updateStudy.isPending ||
    updatePart.isPending ||
    partsLoading ||
    questionsLoading ||
    questionSaving;
  const navigationBlocked = isPending || questionEditorOpen;

  const saveInfo = (advance: boolean) => {
    if (saveIntent.current) return;
    if (!courseId) return toast.error("Selecione a turma do estudo.");
    if (title.trim().length < 3)
      return toast.error("Informe um título com ao menos 3 caracteres.");
    if (!weekStart) return toast.error("Informe o início da semana.");
    if (!beginSave(advance)) return;
    const payload = {
      churchId,
      moduleId: moduleId === "none" ? null : Number(moduleId),
      weekStart,
      title,
      summary: summary || null,
      content: content || null,
    };
    if (!studyId) {
      createStudy.mutate({
        ...payload,
        courseId: Number(courseId),
        summary: summary || undefined,
        content: content || undefined,
        template: "biblico",
      });
    } else {
      updateStudy.mutate({ id: studyId, ...payload });
    }
  };

  const saveCurrentPart = (advance: boolean) => {
    if (saveIntent.current) return;
    if (!studyId || !selectedPart)
      return toast.error("Salve as informações antes de editar as etapas.");
    if (!beginSave(advance)) return;
    updatePart.mutate({
      churchId,
      studyId,
      blockId: selectedPart.id,
      title: selectedPart.title,
      content: selectedPart.content,
      reflectionPrompt: selectedPart.reflectionPrompt ?? null,
      active: selectedPart.active,
    });
  };

  const updateSelectedPart = (changes: Partial<FoundationStudyPart>) => {
    if (!selectedPart || saveIntent.current) return;
    dirtyPartIds.current.add(selectedPart.id);
    setParts(current =>
      current.map(part =>
        part.id === selectedPart.id ? { ...part, ...changes } : part
      )
    );
  };

  const saveDraft = () => {
    if (stageKey === "info") return saveInfo(false);
    if (stageKey === "review") return saveInfo(false);
    saveCurrentPart(false);
  };

  const saveAndContinue = () => {
    if (stageKey === "info") return saveInfo(true);
    if (stageKey === "review") return;
    saveCurrentPart(true);
  };

  const publish = () => {
    if (saveIntent.current) return;
    if (!studyId) return toast.error("Salve o estudo antes de publicar.");
    if (dirtyPartIds.current.size)
      return toast.error("Salve as etapas alteradas antes de publicar.");
    if (
      !title.trim() ||
      !weekStart ||
      parts.some(part => !part.content.trim())
    ) {
      return toast.error(
        "Complete as informações e o conteúdo de todas as etapas antes de publicar."
      );
    }
    setPublishConfirmOpen(true);
  };

  const confirmPublish = () => {
    if (!studyId || !beginSave(false, true)) return;
    setPublishConfirmOpen(false);
    updateStudy.mutate({
      id: studyId,
      churchId,
      active: true,
      moduleId: moduleId === "none" ? null : Number(moduleId),
      weekStart,
      title,
      summary: summary || null,
      content: content || null,
    });
  };

  const close = () => {
    if (isPending || saveIntent.current || questionEditorOpen) return;
    onOpenChange(false);
  };

  const stageIsAvailable = (index: number) =>
    Boolean(studyId) ||
    index <= currentStageIndex ||
    completedStages.has(EDITOR_STAGES[index].key);
  const statusLabel = published
    ? "Publicado"
    : studyId
      ? "Rascunho"
      : "Novo rascunho";
  const selectedCourse = courses.find(course => String(course.id) === courseId);
  const partNameEditor = selectedPart ? (
    <details open={false} className="rounded-xl border p-3">
      <summary
        className="cursor-pointer text-sm font-medium"
        style={{ color: primaryColor }}
      >
        Personalizar nome da etapa
      </summary>
      <div className="mt-3 space-y-2">
        <Label htmlFor="foundation-editor-part-title">Nome da etapa</Label>
        <Input
          id="foundation-editor-part-title"
          value={selectedPart!.title}
          onChange={event =>
            updateSelectedPart({
              title: event.target.value,
            })
          }
          maxLength={160}
        />
      </div>
    </details>
  ) : null;
  const preview = (
    <PreviewPane
      title={title}
      summary={summary}
      content={content}
      block={selectedPart}
      questions={questions}
      primaryColor={primaryColor}
      secondaryColor={secondaryColor}
    />
  );

  return (
    <Dialog open={open} onOpenChange={nextOpen => !nextOpen && close()}>
      <AdaptiveFormDialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-[1440px] flex-col gap-0 overflow-hidden p-0 sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100%-2rem)] sm:max-w-[1440px] sm:gap-0 sm:p-0">
        <div className="shrink-0 border-b bg-white px-4 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle
                className="truncate text-xl"
                style={{ color: primaryColor }}
              >
                {title || "Novo estudo"}
              </DialogTitle>
              <DialogDescription className="mt-1 flex flex-wrap items-center gap-2">
                Prepare o estudo na mesma ordem em que o aluno vai percorrê-lo.
                <Badge variant={published ? "default" : "secondary"}>
                  {statusLabel}
                </Badge>
              </DialogDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Fechar editor"
              onClick={close}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <AdaptiveFormDialogBody className="min-h-0 flex-1 overflow-y-auto bg-[#f8f8f5] p-3 sm:p-5">
          <div className="mb-3 lg:hidden">
            <Button
              type="button"
              variant="outline"
              className="w-full justify-between"
              onClick={() => setMobileStepsOpen(current => !current)}
            >
              <span>
                Etapa {currentStageIndex + 1} de {EDITOR_STAGES.length}:{" "}
                {EDITOR_STAGES[currentStageIndex].label}
              </span>
              <span className="text-xs text-muted-foreground">
                {mobileStepsOpen ? "Ocultar" : "Ver etapas"}
              </span>
            </Button>
            {mobileStepsOpen ? (
              <div className="mt-2 rounded-xl border bg-white p-2">
                <p className="px-2 pb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Roteiro do estudo
                </p>
                <div className="space-y-1">
                  {EDITOR_STAGES.map((stage, index) => (
                    <button
                      key={stage.key}
                      type="button"
                      disabled={navigationBlocked || !stageIsAvailable(index)}
                      onClick={() => {
                        setStageKey(stage.key);
                        setMobileStepsOpen(false);
                      }}
                      className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-40"
                      style={
                        stage.key === stageKey
                          ? {
                              backgroundColor: `${primaryColor}12`,
                              color: primaryColor,
                            }
                          : undefined
                      }
                    >
                      <span className="flex h-6 w-6 items-center justify-center rounded-full border text-xs font-semibold">
                        {completedStages.has(stage.key) ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          index + 1
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className="block font-semibold">
                          {stage.label}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {stage.description}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <div className="grid items-start gap-4 lg:grid-cols-[210px_minmax(0,1fr)_280px]">
            <aside className="hidden rounded-2xl border bg-white p-3 shadow-sm lg:block">
              <p className="mb-3 font-semibold" style={{ color: primaryColor }}>
                Etapas do estudo
              </p>
              <div className="relative space-y-1">
                {EDITOR_STAGES.map((stage, index) => (
                  <button
                    key={stage.key}
                    type="button"
                    disabled={navigationBlocked || !stageIsAvailable(index)}
                    onClick={() => setStageKey(stage.key)}
                    className="flex min-h-12 w-full items-center gap-2 rounded-xl p-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-40"
                    style={
                      stage.key === stageKey
                        ? {
                            backgroundColor: `${primaryColor}12`,
                            color: primaryColor,
                          }
                        : undefined
                    }
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold">
                      {completedStages.has(stage.key) ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        index + 1
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold">{stage.label}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">
                        {stage.description}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </aside>
            <main className="min-w-0 rounded-2xl border bg-white shadow-sm">
              <div className="border-b px-4 py-4 sm:px-6">
                <p
                  className="text-xs font-semibold uppercase tracking-[0.16em]"
                  style={{ color: secondaryColor }}
                >
                  Etapa {currentStageIndex + 1} de {EDITOR_STAGES.length}
                </p>
                <h2
                  className="mt-1 text-2xl font-bold"
                  style={{ color: primaryColor }}
                >
                  {EDITOR_STAGES[currentStageIndex].label}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {EDITOR_STAGES[currentStageIndex].description}
                </p>
              </div>
              <fieldset
                disabled={isPending}
                className="min-w-0 space-y-5 p-4 sm:p-6"
              >
                {stageKey === "info" ? (
                  <div className="space-y-5">
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                      Comece pelas informações básicas. O estudo será salvo como
                      rascunho e as quatro etapas serão preparadas
                      automaticamente.
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Turma</Label>
                        <Select value={courseId} onValueChange={setCourseId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a turma" />
                          </SelectTrigger>
                          <SelectContent>
                            {courses.map(course => (
                              <SelectItem
                                key={course.id}
                                value={String(course.id)}
                              >
                                {course.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Módulo</Label>
                        <Select value={moduleId} onValueChange={setModuleId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o módulo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">
                              Sem módulo por enquanto
                            </SelectItem>
                            {modules.map(module => (
                              <SelectItem
                                key={module.id}
                                value={String(module.id)}
                              >
                                {module.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="foundation-editor-title">
                          Título do estudo
                        </Label>
                        <Input
                          id="foundation-editor-title"
                          value={title}
                          onChange={event => setTitle(event.target.value)}
                          maxLength={160}
                          placeholder="Ex.: A graça e a salvação"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="foundation-editor-week">
                          Início da semana
                        </Label>
                        <Input
                          id="foundation-editor-week"
                          type="date"
                          value={weekStart}
                          onChange={event => setWeekStart(event.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="foundation-editor-summary">
                        Objetivo ou resumo
                      </Label>
                      <Input
                        id="foundation-editor-summary"
                        value={summary}
                        onChange={event => setSummary(event.target.value)}
                        maxLength={500}
                        placeholder="O que a turma aprenderá"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="foundation-editor-content">
                        Introdução do estudo
                      </Label>
                      <Textarea
                        id="foundation-editor-content"
                        value={content}
                        onChange={event => setContent(event.target.value)}
                        maxLength={12000}
                        rows={7}
                        placeholder="Explique o tema, o objetivo e como o aluno deve percorrer as etapas."
                      />
                    </div>
                    {selectedCourse ? (
                      <p className="text-xs text-muted-foreground">
                        Turma selecionada: {selectedCourse.name}
                      </p>
                    ) : null}
                  </div>
                ) : stageKey === "review" ? (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                      Revise o conteúdo antes de publicar. A publicação não cria
                      matrícula e não altera progresso existente.
                    </div>
                    {EDITOR_STAGES.slice(1, 5).map((stage, index) => {
                      const block = currentBlockForStage(parts, stage.key);
                      const questionCount = block
                        ? questions.filter(row => row.block.id === block.id)
                            .length
                        : 0;
                      return (
                        <div
                          key={stage.key}
                          className="flex items-start gap-3 rounded-xl border p-3"
                        >
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold">
                            {index + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p
                              className="font-semibold"
                              style={{ color: primaryColor }}
                            >
                              {stage.label}
                            </p>
                            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                              {block?.content || "Ainda sem conteúdo"}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Badge
                                variant={
                                  block?.content?.trim() &&
                                  !dirtyPartIds.current.has(block.id)
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {block && dirtyPartIds.current.has(block.id)
                                  ? "Alterações não salvas"
                                  : block?.content?.trim()
                                    ? "Com conteúdo"
                                    : "Pendente"}
                              </Badge>
                              {stage.key === "responda" ? (
                                <Badge variant="outline">
                                  {questionCount} pergunta
                                  {questionCount === 1 ? "" : "s"}
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setStageKey(stage.key)}
                          >
                            Editar
                          </Button>
                        </div>
                      );
                    })}
                    <div className="rounded-xl border border-dashed bg-slate-50 p-3 text-sm text-muted-foreground">
                      Para refletir é opcional. Cada etapa possui sua anotação
                      individual do aluno, e as anotações antigas continuam
                      preservadas.
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {selectedPart ? (
                      <>
                        {stageKey === "leia" ? partNameEditor : null}
                        <div className="space-y-2">
                          <Label htmlFor="foundation-editor-part-content">
                            {stageKey === "leia"
                              ? "Leitura do aluno"
                              : stageKey === "entenda"
                                ? "Explicação para o aluno"
                                : stageKey === "responda"
                                  ? "Orientação antes das perguntas"
                                  : "Aplicação prática"}
                          </Label>
                          {stageKey === "leia" ? (
                            <p
                              id="foundation-editor-reading-help"
                              className="text-sm text-muted-foreground"
                            >
                              Prepare um trecho por vez, em parágrafos curtos.
                              Inclua a referência bíblica no próprio texto.
                            </p>
                          ) : stageKey === "entenda" ? (
                            <p
                              id="foundation-editor-explanation-help"
                              className="text-sm text-muted-foreground"
                            >
                              Explique uma ideia central e dê um exemplo
                              concreto.
                            </p>
                          ) : stageKey === "responda" ? (
                            <p
                              id="foundation-editor-question-help"
                              className="text-sm text-muted-foreground"
                            >
                              Diga ao aluno como responder, sem antecipar o
                              gabarito.
                            </p>
                          ) : (
                            <p
                              id="foundation-editor-application-help"
                              className="text-sm text-muted-foreground"
                            >
                              Proponha uma ação simples para praticar nesta
                              semana.
                            </p>
                          )}
                          <Textarea
                            id="foundation-editor-part-content"
                            aria-describedby={
                              stageKey === "leia"
                                ? "foundation-editor-reading-help"
                                : stageKey === "entenda"
                                  ? "foundation-editor-explanation-help"
                                  : stageKey === "responda"
                                    ? "foundation-editor-question-help"
                                    : "foundation-editor-application-help"
                            }
                            placeholder={
                              stageKey === "leia"
                                ? "Ex.: Leia Efésios 4:29. Observe como nossas palavras podem encorajar outras pessoas."
                                : stageKey === "entenda"
                                  ? "Retome a ideia de Leia sem repetir todo o texto. Explique com suas palavras e inclua um exemplo do dia a dia."
                                  : stageKey === "responda"
                                    ? "Ex.: Leia cada pergunta, escolha uma alternativa e confira a explicação após responder."
                                    : "Ex.: Nesta semana, procure uma pessoa e ofereça uma palavra concreta de encorajamento."
                            }
                            value={selectedPart.content}
                            onChange={event =>
                              updateSelectedPart({
                                content: event.target.value,
                              })
                            }
                            maxLength={12000}
                            rows={10}
                          />
                          <p className="text-right text-xs text-muted-foreground">
                            {selectedPart.content.length}/12000
                          </p>
                        </div>
                        {stageKey === "responda" ? (
                          <section className="space-y-3 rounded-xl border bg-slate-50/60 p-3">
                            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                              <div>
                                <p
                                  className="font-semibold"
                                  style={{ color: primaryColor }}
                                >
                                  Perguntas desta etapa
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Adicione alternativas, escolha o gabarito e
                                  escreva a explicação.
                                </p>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                disabled={questionEditorOpen}
                                onClick={() => setQuestionEditorOpen(true)}
                                style={{
                                  backgroundColor: primaryColor,
                                  color: "white",
                                }}
                              >
                                Adicionar pergunta
                              </Button>
                            </div>
                            {selectedPartQuestions.length ? (
                              <StudyPartQuestions
                                part={selectedPart}
                                primaryColor={primaryColor}
                                questions={selectedPartQuestions.map(
                                  row => row.question
                                )}
                              />
                            ) : (
                              <p className="rounded-lg border border-dashed bg-white p-3 text-sm text-muted-foreground">
                                Nenhuma pergunta cadastrada nesta etapa.
                              </p>
                            )}
                            <StudyQuestionEditor
                              inline
                              churchId={churchId}
                              studyId={studyId ?? 0}
                              part={selectedPart}
                              open={questionEditorOpen && Boolean(studyId)}
                              onOpenChange={setQuestionEditorOpen}
                              onBusyChange={setQuestionSaving}
                              onCreated={row =>
                                setConfirmedQuestions(current => [
                                  ...current,
                                  row,
                                ])
                              }
                              primaryColor={primaryColor}
                            />
                            {questionEditorOpen ? (
                              <p className="text-xs text-muted-foreground">
                                Salve ou cancele a pergunta antes de continuar.
                                A prévia mostra as perguntas já salvas.
                              </p>
                            ) : null}
                          </section>
                        ) : null}
                        <div className="space-y-2">
                          <Label htmlFor="foundation-editor-part-reflection-prompt">
                            Para refletir{" "}
                            <span className="font-normal text-muted-foreground">
                              (opcional)
                            </span>
                          </Label>
                          <Textarea
                            id="foundation-editor-part-reflection-prompt"
                            value={selectedPart.reflectionPrompt ?? ""}
                            onChange={event =>
                              updateSelectedPart({
                                reflectionPrompt: event.target.value,
                              })
                            }
                            maxLength={1000}
                            rows={3}
                            placeholder={
                              stageKey === "leia"
                                ? "Ex.: Qual expressão desta leitura chamou sua atenção?"
                                : stageKey === "entenda"
                                  ? "Ex.: Como você explicaria esta ideia com suas palavras?"
                                  : stageKey === "responda"
                                    ? "Ex.: O que a explicação da resposta ajudou você a compreender?"
                                    : "Ex.: Qual ação você pode realizar e o que espera aprender com ela?"
                            }
                            aria-describedby="foundation-editor-reflection-help"
                          />
                          <p
                            id="foundation-editor-reflection-help"
                            className="text-xs text-muted-foreground"
                          >
                            {stageKey === "leia"
                              ? "Uma pergunta curta para orientar a leitura. A anotação é escrita pelo aluno."
                              : stageKey === "entenda"
                                ? "Uma pergunta breve para explicar o que entendeu. A anotação é escrita pelo aluno."
                                : stageKey === "responda"
                                  ? "Uma pergunta breve após as questões e explicações. A anotação é escrita pelo aluno."
                                  : "Uma pergunta breve para orientar a prática. A anotação é escrita pelo aluno."}
                          </p>
                        </div>
                        {stageKey !== "leia" ? partNameEditor : null}
                      </>
                    ) : partsLoading ? (
                      <div className="h-48 animate-pulse rounded-xl bg-muted/30" />
                    ) : (
                      <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
                        Salve as informações do estudo para carregar as etapas.
                      </p>
                    )}
                  </div>
                )}
              </fieldset>
            </main>
            <aside className="hidden rounded-2xl border bg-[#fdfcf8] p-4 shadow-sm lg:block">
              {preview}
            </aside>
          </div>
        </AdaptiveFormDialogBody>
        <div className="shrink-0 border-t bg-white px-3 py-3 sm:px-5">
          {saveFeedback.status !== "idle" ? (
            <p
              role={saveFeedback.status === "error" ? "alert" : "status"}
              className={`mb-2 text-sm ${saveFeedback.status === "error" ? "text-destructive" : "text-muted-foreground"}`}
            >
              {saveFeedback.message}
            </p>
          ) : null}
          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={currentStageIndex === 0 || navigationBlocked}
                onClick={() =>
                  setStageKey(
                    EDITOR_STAGES[Math.max(0, currentStageIndex - 1)].key
                  )
                }
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                Voltar
              </Button>
              <Button
                type="button"
                variant="outline"
                className="lg:hidden"
                disabled={isPending}
                onClick={() => setPreviewOpen(true)}
              >
                <Eye className="mr-1 h-4 w-4" />
                Visualizar como aluno
              </Button>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                disabled={navigationBlocked}
                onClick={saveDraft}
              >
                <Save className="mr-1 h-4 w-4" />
                {isPending ? "Salvando…" : "Salvar rascunho"}
              </Button>
              {isLastStage ? (
                <Button
                  type="button"
                  disabled={navigationBlocked || !studyId}
                  onClick={publish}
                  style={{ backgroundColor: primaryColor, color: "white" }}
                >
                  Publicar estudo
                </Button>
              ) : (
                <Button
                  type="button"
                  disabled={navigationBlocked}
                  onClick={saveAndContinue}
                  style={{ backgroundColor: primaryColor, color: "white" }}
                >
                  {saveFeedback.status === "pending"
                    ? "Salvando…"
                    : "Salvar e continuar"}
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
        {previewOpen ? (
          <PreviewPane
            title={title}
            summary={summary}
            content={content}
            block={selectedPart}
            questions={questions}
            primaryColor={primaryColor}
            secondaryColor={secondaryColor}
            modal
            onClose={() => setPreviewOpen(false)}
          />
        ) : null}
        <Dialog open={publishConfirmOpen} onOpenChange={setPublishConfirmOpen}>
          <AdaptiveFormDialogContent className="sm:max-w-lg">
            <DialogHeader className={adaptiveFormDialogHeaderClassName}>
              <DialogTitle style={{ color: primaryColor }}>
                Publicar estudo?
              </DialogTitle>
              <DialogDescription>
                Depois da publicação, o estudo ficará disponível conforme as
                regras atuais da turma. Você ainda poderá retirá-lo da
                publicação.
              </DialogDescription>
            </DialogHeader>
            <AdaptiveFormDialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPublishConfirmOpen(false)}
              >
                Revisar mais
              </Button>
              <Button
                type="button"
                onClick={confirmPublish}
                style={{ backgroundColor: primaryColor, color: "white" }}
              >
                Confirmar publicação
              </Button>
            </AdaptiveFormDialogFooter>
          </AdaptiveFormDialogContent>
        </Dialog>
      </AdaptiveFormDialogContent>
    </Dialog>
  );
}
