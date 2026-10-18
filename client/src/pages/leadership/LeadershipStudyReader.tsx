import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  Loader2,
  Save,
  Send,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { StudentStudy } from "./types";

const STAGES = [
  { key: "leia", label: "Leia", hint: "Leitura" },
  { key: "entenda", label: "Entenda", hint: "Compreensão" },
  { key: "responda", label: "Responda", hint: "Perguntas" },
  { key: "aplique", label: "Aplique", hint: "Prática" },
] as const;
type StageKey = (typeof STAGES)[number]["key"];
export type { StudentStudy } from "./types";
type StudentQuestion = {
  id: number;
  prompt: string;
  options: Array<{ id: string; label: string }>;
  position: number;
};
type StudentBlock = {
  id: number;
  stageKey: StageKey;
  title: string;
  content: string;
  reflectionPrompt: string | null;
  position: number;
  questions: StudentQuestion[];
};
type Session = {
  study: StudentStudy["study"];
  class: StudentStudy["class"];
  enrollment: StudentStudy["enrollment"];
  progress: StudentStudy["progress"];
  blockProgress: Array<{
    progress: {
      blockId: number;
      status: string;
      reflection: string | null;
      reflectionVersion: number;
    };
    block: { id: number };
  }>;
  blocks: StudentBlock[];
};

type AnswerResult = {
  isCorrect: boolean;
  explanation: string;
  selectedOptionId: string;
};

export function LeadershipStudyReader({
  churchId,
  item,
  onClose,
  onChanged,
}: {
  churchId: number;
  item: StudentStudy;
  onClose: () => void;
  onChanged?: () => void;
}) {
  const [stageIndex, setStageIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [answerResults, setAnswerResults] = useState<
    Record<number, AnswerResult>
  >({});
  const [reflections, setReflections] = useState<Record<number, string>>({});
  const [reflectionVersions, setReflectionVersions] = useState<
    Record<number, number>
  >({});
  const [started, setStarted] = useState(false);
  const stage = STAGES[stageIndex];
  const [blockIndex, setBlockIndex] = useState(0);
  const utils = trpc.useUtils();
  const sessionQuery = trpc.escolaLideres.study.student.session.useQuery(
    { churchId, enrollmentId: item.enrollment.id, studyId: item.study.id },
    { enabled: false, retry: false }
  );
  const studentSession = sessionQuery.data as Session | undefined;
  const blocks = studentSession?.blocks ?? [];
  const stageBlocks = blocks.filter(block => block.stageKey === stage.key);
  const currentBlock = stageBlocks[blockIndex] ?? stageBlocks[0];
  const questions = currentBlock?.questions ?? [];

  const startStudy = trpc.escolaLideres.study.student.start.useMutation({
    onSuccess: data => {
      setStarted(true);
    },
    onError: error => toast.error(error.message),
  });
  const viewBlock = trpc.escolaLideres.study.student.viewBlock.useMutation();
  const completeBlock =
    trpc.escolaLideres.study.student.completeBlock.useMutation();
  const answerQuestion =
    trpc.escolaLideres.study.student.answerQuestion.useMutation({
      onSuccess: (result, variables) => {
        if (result)
          setAnswerResults(current => ({
            ...current,
            [variables.questionId]: result as AnswerResult,
          }));
      },
      onError: error => toast.error(error.message),
    });
  const saveReflection =
    trpc.escolaLideres.study.student.saveReflection.useMutation({
      onSuccess: (result, variables) => {
        setReflectionVersions(current => ({
          ...current,
          [variables.blockId]: result.reflectionVersion,
        }));
        toast.success("Reflexão salva.");
      },
      onError: error => toast.error(error.message),
    });
  const completeStudy = trpc.escolaLideres.study.student.complete.useMutation({
    onSuccess: async () => {
      toast.success("Estudo concluído.");
      await utils.escolaLideres.study.student.history.invalidate();
      onChanged?.();
      onClose();
    },
    onError: error => toast.error(error.message),
  });

  useEffect(() => {
    if (started) return;
    let active = true;
    void sessionQuery.refetch().then(result => {
      if (!active) return;
      const session = result.data as Session | undefined;
      const lastPosition = session?.progress?.lastBlockPosition ?? 0;
      const resumeBlock = session?.blocks.find(
        block => block.position === lastPosition
      );
      if (resumeBlock) {
        const resumeStage = STAGES.findIndex(
          stageItem => stageItem.key === resumeBlock.stageKey
        );
        if (resumeStage >= 0) {
          setStageIndex(resumeStage);
          setBlockIndex(
            session?.blocks
              .filter(block => block.stageKey === resumeBlock.stageKey)
              .findIndex(block => block.id === resumeBlock.id) ?? 0
          );
        }
      }
      startStudy.mutate({
        churchId,
        enrollmentId: item.enrollment.id,
        studyId: item.study.id,
        lastBlockPosition: lastPosition,
      });
    });
    return () => {
      active = false;
    };
  }, [churchId, item.enrollment.id, item.study.id, started]);
  useEffect(() => {
    if (!studentSession) return;
    const nextReflections: Record<number, string> = {};
    const nextVersions: Record<number, number> = {};
    for (const row of studentSession.blockProgress) {
      nextReflections[row.block.id] = row.progress.reflection ?? "";
      nextVersions[row.block.id] = row.progress.reflectionVersion;
    }
    setReflections(nextReflections);
    setReflectionVersions(nextVersions);
  }, [studentSession]);

  const handleStageChange = async (nextIndex: number) => {
    const nextBlocks = blocks.filter(
      block => block.stageKey === STAGES[nextIndex].key
    );
    const nextBlock = nextBlocks[0];
    if (!nextBlock) return;
    setStageIndex(nextIndex);
    setBlockIndex(0);
    await viewBlock.mutateAsync({
      churchId,
      enrollmentId: item.enrollment.id,
      studyId: item.study.id,
      blockId: nextBlock.id,
    });
  };
  const saveCurrentReflection = () => {
    if (!currentBlock) return;
    saveReflection.mutate({
      churchId,
      enrollmentId: item.enrollment.id,
      studyId: item.study.id,
      blockId: currentBlock.id,
      reflection: reflections[currentBlock.id] || null,
      expectedVersion: reflectionVersions[currentBlock.id] ?? 0,
    });
  };
  const finishCurrentStage = async () => {
    if (!currentBlock) return;
    try {
      await completeBlock.mutateAsync({
        churchId,
        enrollmentId: item.enrollment.id,
        studyId: item.study.id,
        blockId: currentBlock.id,
      });
      if (blockIndex < stageBlocks.length - 1) {
        const nextBlock = stageBlocks[blockIndex + 1];
        setBlockIndex(current => current + 1);
        await viewBlock.mutateAsync({
          churchId,
          enrollmentId: item.enrollment.id,
          studyId: item.study.id,
          blockId: nextBlock.id,
        });
      } else if (stageIndex < STAGES.length - 1) {
        await handleStageChange(stageIndex + 1);
      } else {
        completeStudy.mutate({
          churchId,
          enrollmentId: item.enrollment.id,
          studyId: item.study.id,
        });
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível concluir esta etapa."
      );
    }
  };

  if (sessionQuery.isLoading || !studentSession) {
    return (
      <Card className="border-[#c9a84c]/30">
        <CardContent className="flex min-h-48 items-center justify-center p-6">
          <Loader2 className="h-6 w-6 animate-spin text-[#c9a84c]" />
          <span className="ml-2 text-sm text-muted-foreground">
            Abrindo estudo…
          </span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-[#c9a84c]/30 bg-[#fffdf7]">
      <CardHeader className="border-b border-[#c9a84c]/20 bg-[linear-gradient(135deg,#fdfaf1_0%,#ffffff_60%,#f7f1e2_100%)] pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#c9a84c]">
              Estudo digital · {studentSession.class.name}
            </p>
            <CardTitle className="mt-1 text-xl text-[#1e3a5f]">
              {studentSession.study.title}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              {studentSession.study.summary ||
                "Percorra as quatro etapas no seu ritmo."}
            </p>
          </div>
          <Button type="button" variant="outline" onClick={onClose}>
            Fechar estudo
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 p-4 sm:p-6">
        {studentSession.study.content ? (
          <div className="rounded-xl border border-border bg-white p-4">
            <p className="whitespace-pre-line text-sm leading-7 text-slate-700">
              {studentSession.study.content}
            </p>
          </div>
        ) : null}
        <nav
          aria-label="Etapas do estudo"
          className="grid grid-cols-2 gap-2 md:grid-cols-4"
        >
          {STAGES.map((itemStage, index) => {
            const itemBlocks = blocks.filter(
              block => block.stageKey === itemStage.key
            );
            const complete =
              itemBlocks.length > 0 &&
              itemBlocks.every(block =>
                studentSession.blockProgress.some(
                  row =>
                    row.block.id === block.id &&
                    row.progress.status === "concluida"
                )
              );
            return (
              <button
                key={itemStage.key}
                type="button"
                onClick={() => handleStageChange(index)}
                className={`rounded-xl border px-3 py-3 text-left transition ${index === stageIndex ? "border-[#1e3a5f] bg-[#1e3a5f] text-white" : "border-border bg-white hover:border-[#c9a84c]"}`}
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  {complete ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : index < stageIndex ? (
                    <Circle className="h-4 w-4" />
                  ) : (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full border text-[10px]">
                      {index + 1}
                    </span>
                  )}
                  {itemStage.label}
                </span>
                <span
                  className={`mt-1 block text-[11px] ${index === stageIndex ? "text-white/80" : "text-muted-foreground"}`}
                >
                  {itemStage.hint}
                </span>
              </button>
            );
          })}
        </nav>
        {currentBlock ? (
          <article className="space-y-5 rounded-2xl border border-[#1e3a5f]/15 bg-white p-4 sm:p-6">
            <div>
              <Badge variant="secondary">{stage.label}</Badge>
              <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Bloco {blockIndex + 1} de {stageBlocks.length}
              </p>
              <h2 className="mt-2 text-xl font-semibold text-[#1e3a5f]">
                {currentBlock.title}
              </h2>
            </div>
            <div className="whitespace-pre-line text-sm leading-7 text-slate-700">
              {currentBlock.content}
            </div>
            {currentBlock.reflectionPrompt ? (
              <div className="rounded-xl border border-[#c9a84c]/30 bg-[#fdfaf1] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#c9a84c]">
                  Para refletir
                </p>
                <p className="mt-2 text-sm leading-6 text-[#1e3a5f]">
                  {currentBlock.reflectionPrompt}
                </p>
              </div>
            ) : null}
            {questions.length ? (
              <div className="space-y-4 border-t border-border pt-5">
                <div>
                  <p className="text-sm font-semibold text-[#1e3a5f]">
                    Responda
                  </p>
                  <p className="text-xs text-muted-foreground">
                    A explicação aparece depois que você responder.
                  </p>
                </div>
                {questions.map(question => {
                  const result = answerResults[question.id];
                  return (
                    <div
                      key={question.id}
                      className="space-y-3 rounded-xl border border-border p-4"
                    >
                      <p className="text-sm font-semibold text-slate-800">
                        {question.prompt}
                      </p>
                      <div className="grid gap-2">
                        {question.options.map(option => (
                          <button
                            key={option.id}
                            type="button"
                            disabled={
                              result?.isCorrect || answerQuestion.isPending
                            }
                            onClick={() => {
                              setAnswers(current => ({
                                ...current,
                                [question.id]: option.id,
                              }));
                              answerQuestion.mutate({
                                churchId,
                                enrollmentId: item.enrollment.id,
                                studyId: item.study.id,
                                blockId: currentBlock.id,
                                questionId: question.id,
                                selectedOptionId: option.id,
                                clientAttemptId: crypto.randomUUID(),
                              });
                            }}
                            className={`rounded-lg border px-3 py-2 text-left text-sm ${result?.selectedOptionId === option.id ? (result.isCorrect ? "border-emerald-400 bg-emerald-50" : "border-rose-400 bg-rose-50") : answers[question.id] === option.id ? "border-[#1e3a5f] bg-[#1e3a5f]/5" : "border-border hover:border-[#c9a84c]"}`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                      {result ? (
                        <div
                          className={`rounded-lg p-3 text-sm ${result.isCorrect ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}
                        >
                          <strong>
                            {result.isCorrect
                              ? "Resposta correta."
                              : "Vamos revisar."}
                          </strong>
                          <p className="mt-1">{result.explanation}</p>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
            <div className="space-y-2 border-t border-border pt-5">
              <Label htmlFor={`leadership-reflection-${currentBlock.id}`}>
                Minha reflexão
              </Label>
              <p className="text-xs text-muted-foreground">
                {currentBlock.reflectionPrompt
                  ? "Registre sua resposta pessoal abaixo."
                  : "O que você aprendeu e como pretende aplicar?"}
              </p>
              <Textarea
                id={`leadership-reflection-${currentBlock.id}`}
                value={reflections[currentBlock.id] ?? ""}
                onChange={event =>
                  setReflections(current => ({
                    ...current,
                    [currentBlock.id]: event.target.value,
                  }))
                }
                rows={5}
                maxLength={4000}
                placeholder="Escreva sua reflexão…"
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={saveReflection.isPending}
                onClick={saveCurrentReflection}
              >
                <Save className="mr-2 h-4 w-4" />
                Salvar reflexão
              </Button>
            </div>
            <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (blockIndex > 0) {
                    setBlockIndex(current => current - 1);
                  } else if (stageIndex > 0) {
                    void handleStageChange(stageIndex - 1);
                  }
                }}
                disabled={
                  (stageIndex === 0 && blockIndex === 0) || viewBlock.isPending
                }
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Anterior
              </Button>
              <Button
                type="button"
                onClick={finishCurrentStage}
                disabled={
                  completeBlock.isPending ||
                  completeStudy.isPending ||
                  (stage.key === "responda" &&
                    questions.some(
                      question => !answerResults[question.id]?.isCorrect
                    ))
                }
              >
                {stageIndex === STAGES.length - 1 ? (
                  blockIndex === stageBlocks.length - 1 ? (
                    <Send className="mr-2 h-4 w-4" />
                  ) : (
                    <ChevronRight className="mr-1 h-4 w-4" />
                  )
                ) : (
                  <ChevronRight className="mr-1 h-4 w-4" />
                )}
                {blockIndex < stageBlocks.length - 1
                  ? "Próximo bloco"
                  : stageIndex === STAGES.length - 1
                    ? "Concluir estudo"
                    : "Concluir etapa"}
              </Button>
            </div>
          </article>
        ) : (
          <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
            Esta etapa ainda está sendo preparada pela liderança.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
