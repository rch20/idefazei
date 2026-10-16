import {
  AdaptiveFormDialogBody,
  AdaptiveFormDialogContent,
  AdaptiveFormDialogFooter,
  adaptiveFormDialogHeaderClassName,
} from "@/components/AdaptiveFormDialog";
import { Button } from "@/components/ui/button";
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
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { StudyPartEditor, type FoundationStudyPart } from "./StudyPartEditor";
import { StudyPartQuestions } from "./StudyPartQuestions";
import { StudyPartRow } from "./StudyPartRow";

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

export function StudyQuestionEditor({
  churchId,
  studyId,
  part,
  open,
  onOpenChange,
}: {
  churchId: number;
  studyId: number;
  part: FoundationStudyPart | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const utils = trpc.useUtils();
  const [prompt, setPrompt] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [correctOptionId, setCorrectOptionId] = useState("a");
  const [explanation, setExplanation] = useState("");
  const createQuestion = trpc.escolaFundamentos.createStudyQuestion.useMutation(
    {
      onSuccess: async () => {
        toast.success("Pergunta criada nesta etapa.");
        await utils.escolaFundamentos.manageStudyQuestions.invalidate({
          churchId,
          studyId,
        });
        setPrompt("");
        setOptionA("");
        setOptionB("");
        setCorrectOptionId("a");
        setExplanation("");
        onOpenChange(false);
      },
      onError: error => toast.error(error.message),
    }
  );

  const reset = () => {
    setPrompt("");
    setOptionA("");
    setOptionB("");
    setCorrectOptionId("a");
    setExplanation("");
  };
  const canSubmit = Boolean(
    part &&
      prompt.trim().length >= 3 &&
      optionA.trim() &&
      optionB.trim() &&
      explanation.trim() &&
      !createQuestion.isPending
  );

  return (
    <Dialog
      open={open}
      onOpenChange={nextOpen => {
        if (!nextOpen) reset();
        onOpenChange(nextOpen);
      }}
    >
      <AdaptiveFormDialogContent className="sm:max-w-2xl">
        <DialogHeader className={adaptiveFormDialogHeaderClassName}>
          <DialogTitle>Adicionar pergunta</DialogTitle>
          <DialogDescription className="mt-1">
            A pergunta ficará dentro da etapa “{part?.title ?? "selecionada"}” e
            aparecerá ao aluno depois do conteúdo.
          </DialogDescription>
        </DialogHeader>
        <AdaptiveFormDialogBody>
          <form
            id="foundation-study-question-editor"
            className="space-y-4"
            onSubmit={event => {
              event.preventDefault();
              if (!canSubmit || !part) return;
              createQuestion.mutate({
                churchId,
                studyId,
                blockId: part.id,
                prompt,
                options: [
                  { id: "a", label: optionA },
                  { id: "b", label: optionB },
                ],
                correctOptionId,
                explanation,
              });
            }}
          >
            <div className="rounded-xl border border-[#c9a84c]/30 bg-[#fdfaf1] p-3 text-sm text-[#1e3a5f]">
              <strong>Responda</strong> é a etapa própria para perguntas. Nesta
              primeira versão, você pode adicionar uma pergunta a qualquer etapa
              sem perder a organização atual.
            </div>
            <div className="space-y-2">
              <Label htmlFor="foundation-question-prompt">Pergunta</Label>
              <Textarea
                id="foundation-question-prompt"
                value={prompt}
                onChange={event => setPrompt(event.target.value)}
                placeholder="O que o aluno deve compreender?"
                maxLength={4000}
                rows={4}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="foundation-question-option-a">
                  Alternativa A
                </Label>
                <Input
                  id="foundation-question-option-a"
                  value={optionA}
                  onChange={event => setOptionA(event.target.value)}
                  placeholder="Resposta possível"
                  maxLength={500}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="foundation-question-option-b">
                  Alternativa B
                </Label>
                <Input
                  id="foundation-question-option-b"
                  value={optionB}
                  onChange={event => setOptionB(event.target.value)}
                  placeholder="Outra resposta possível"
                  maxLength={500}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Resposta correta</Label>
              <Select
                value={correctOptionId}
                onValueChange={setCorrectOptionId}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="a">Alternativa A</SelectItem>
                  <SelectItem value="b">Alternativa B</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="foundation-question-explanation">
                Explicação depois da resposta
              </Label>
              <Textarea
                id="foundation-question-explanation"
                value={explanation}
                onChange={event => setExplanation(event.target.value)}
                placeholder="Explique o aprendizado, mesmo quando o aluno errar."
                maxLength={4000}
                rows={4}
              />
            </div>
          </form>
        </AdaptiveFormDialogBody>
        <AdaptiveFormDialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={createQuestion.isPending}
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="foundation-study-question-editor"
            className="bg-[#1e3a5f] text-white hover:bg-[#1e3a5f]/90"
            disabled={!canSubmit}
          >
            {createQuestion.isPending ? "Salvando…" : "Salvar pergunta"}
          </Button>
        </AdaptiveFormDialogFooter>
      </AdaptiveFormDialogContent>
    </Dialog>
  );
}

export function StudyPartList({
  churchId,
  studyId,
  parts,
  questions,
  isLoading,
  questionsLoading,
  canManage,
}: {
  churchId: number;
  studyId: number;
  parts: FoundationStudyPart[];
  questions: StudyQuestionRow[];
  isLoading: boolean;
  questionsLoading: boolean;
  canManage: boolean;
}) {
  const utils = trpc.useUtils();
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<FoundationStudyPart | null>(
    null
  );
  const [questionPart, setQuestionPart] = useState<FoundationStudyPart | null>(
    null
  );
  const [selectedPartId, setSelectedPartId] = useState<number | null>(null);
  const questionsByBlock = useMemo(() => {
    const index = new Map<number, StudyQuestionRow["question"][]>();
    for (const row of questions) {
      const current = index.get(row.block.id) ?? [];
      current.push(row.question);
      index.set(row.block.id, current);
    }
    return index;
  }, [questions]);
  const createPart = trpc.escolaFundamentos.createQuestionBlock.useMutation({
    onSuccess: async () => {
      toast.success("Etapa criada.");
      setEditorOpen(false);
      await utils.escolaFundamentos.listQuestionBlocks.invalidate({
        churchId,
        studyId,
      });
    },
    onError: error => toast.error(error.message),
  });
  const updatePart = trpc.escolaFundamentos.updateQuestionBlock.useMutation({
    onSuccess: async () => {
      toast.success("Etapa atualizada.");
      setEditorOpen(false);
      setEditingPart(null);
      await Promise.all([
        utils.escolaFundamentos.listQuestionBlocks.invalidate({
          churchId,
          studyId,
        }),
        utils.escolaFundamentos.manageStudyQuestions.invalidate({
          churchId,
          studyId,
        }),
      ]);
    },
    onError: error => toast.error(error.message),
  });
  const movePart = trpc.escolaFundamentos.moveQuestionBlock.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.escolaFundamentos.listQuestionBlocks.invalidate({
          churchId,
          studyId,
        }),
        utils.escolaFundamentos.manageStudyQuestions.invalidate({
          churchId,
          studyId,
        }),
      ]);
    },
    onError: error => toast.error(error.message),
  });

  const openCreate = () => {
    setEditingPart(null);
    setEditorOpen(true);
  };
  const openEdit = (part: FoundationStudyPart) => {
    setEditingPart(part);
    setEditorOpen(true);
  };
  const closeEditor = (open: boolean) => {
    setEditorOpen(open);
    if (!open) setEditingPart(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-2" aria-label="Carregando etapas do estudo">
        <div className="h-14 animate-pulse rounded-lg bg-muted/40" />
        <div className="h-14 animate-pulse rounded-lg bg-muted/40" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {canManage ? (
        <div className="flex flex-col gap-3 rounded-lg border border-dashed border-[#c9a84c]/50 bg-[#fdfaf1] p-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#1e3a5f]">
              Conteúdo na ordem do aluno
            </p>
            <p className="text-sm text-muted-foreground">
              Comece por Leia, siga para Entenda, Responda e termine com
              Aplique.
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            className="gap-1.5 bg-[#1e3a5f] text-white hover:bg-[#1e3a5f]/90"
            onClick={openCreate}
          >
            <Plus className="h-4 w-4" />
            Nova etapa
          </Button>
        </div>
      ) : null}
      {!parts.length ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3 text-sm text-muted-foreground">
          Este estudo ainda não possui etapas cadastradas.
        </p>
      ) : (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Partes do estudo
          </p>
          <ol className="space-y-2" aria-label="Etapas do estudo">
            {parts.map((part, index) => (
              <StudyPartRow
                key={part.id}
                part={part}
                index={index}
                total={parts.length}
                questionCount={questionsByBlock.get(part.id)?.length ?? 0}
                questionsLoading={questionsLoading}
                questionsOpen={selectedPartId === part.id}
                canManage={canManage}
                isMoving={movePart.isPending}
                onEdit={openEdit}
                onAddQuestion={setQuestionPart}
                onToggleQuestions={() =>
                  setSelectedPartId(current =>
                    current === part.id ? null : part.id
                  )
                }
                onMove={direction =>
                  movePart.mutate({
                    churchId,
                    studyId,
                    blockId: part.id,
                    direction,
                  })
                }
              >
                {selectedPartId === part.id &&
                !questionsLoading &&
                questionsByBlock.get(part.id)?.length ? (
                  <StudyPartQuestions
                    part={part}
                    questions={questionsByBlock.get(part.id) ?? []}
                  />
                ) : null}
              </StudyPartRow>
            ))}
          </ol>
        </div>
      )}
      <StudyPartEditor
        open={editorOpen}
        mode={editingPart ? "edit" : "create"}
        part={editingPart}
        isPending={createPart.isPending || updatePart.isPending}
        onOpenChange={closeEditor}
        onSubmit={values => {
          if (editingPart) {
            updatePart.mutate({
              churchId,
              studyId,
              blockId: editingPart.id,
              ...values,
            });
            return;
          }
          createPart.mutate({
            churchId,
            studyId,
            title: values.title,
            content: values.content,
            reflectionPrompt: values.reflectionPrompt ?? null,
          });
        }}
      />
      <StudyQuestionEditor
        churchId={churchId}
        studyId={studyId}
        part={questionPart}
        open={Boolean(questionPart)}
        onOpenChange={open => {
          if (!open) setQuestionPart(null);
        }}
      />
    </div>
  );
}
