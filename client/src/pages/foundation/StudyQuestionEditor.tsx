import { useRef, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AdaptiveFormDialogBody,
  AdaptiveFormDialogContent,
  AdaptiveFormDialogFooter,
  adaptiveFormDialogHeaderClassName,
} from "@/components/AdaptiveFormDialog";
import type { FoundationStudyPart } from "./StudyPartEditor";
import {
  MAX_QUESTION_OPTIONS,
  MIN_QUESTION_OPTIONS,
  nextQuestionOptionId,
  validateStudyQuestionDraft,
  type StudyQuestionDraft,
} from "./studyQuestionDraft";

export type ConfirmedStudyQuestion = {
  block: { id: number };
  question: StudyQuestionDraft & { id: number };
};
const initialDraft = (): StudyQuestionDraft => ({
  prompt: "",
  options: [
    { id: "a", label: "" },
    { id: "b", label: "" },
  ],
  correctOptionId: "a",
  explanation: "",
});

export function StudyQuestionEditor({
  churchId,
  studyId,
  part,
  open,
  onOpenChange,
  onCreated,
  onBusyChange,
  inline = false,
  primaryColor = "#1e3a5f",
}: {
  churchId: number;
  studyId: number;
  part: FoundationStudyPart | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (row: ConfirmedStudyQuestion) => void;
  onBusyChange?: (busy: boolean) => void;
  inline?: boolean;
  primaryColor?: string;
}) {
  const utils = trpc.useUtils();
  const [draft, setDraft] = useState<StudyQuestionDraft>(initialDraft);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);
  const submitted = useRef<{
    blockId: number;
    draft: StudyQuestionDraft;
  } | null>(null);
  const finish = () => {
    pending.current = false;
    setSaving(false);
    onBusyChange?.(false);
  };
  const reset = () => {
    setDraft(initialDraft());
    setError(null);
    submitted.current = null;
  };
  const createQuestion = trpc.escolaFundamentos.createStudyQuestion.useMutation(
    {
      onSuccess: data => {
        const attempt = submitted.current;
        if (!attempt) return;
        if (data.id == null || !Number.isInteger(data.id) || data.id <= 0) {
          finish();
          setError(
            "O servidor não confirmou o identificador da pergunta. Verifique a lista antes de tentar novamente."
          );
          return;
        }
        onCreated?.({
          block: { id: attempt.blockId },
          question: { ...attempt.draft, id: data.id },
        });
        finish();
        reset();
        onOpenChange(false);
        toast.success("Pergunta criada nesta etapa.");
        // A confirmação vem da gravação; uma falha de cache não permite repetir o cadastro.
        void Promise.resolve()
          .then(() =>
            utils.escolaFundamentos.manageStudyQuestions.invalidate({
              churchId,
              studyId,
            })
          )
          .catch(() => undefined);
      },
      onError: () => {
        finish();
        setError(
          "Não foi possível salvar a pergunta. Os campos continuam preenchidos. Tente novamente."
        );
      },
    }
  );
  const busy = saving || createQuestion.isPending;
  const close = () => {
    if (pending.current || busy) return;
    reset();
    onOpenChange(false);
  };
  const submit = () => {
    if (pending.current) return;
    const problem = validateStudyQuestionDraft(draft);
    if (problem) return setError(problem);
    if (!part || !studyId)
      return setError("Salve o estudo antes de adicionar uma pergunta.");
    const payload: StudyQuestionDraft = {
      prompt: draft.prompt.trim(),
      options: draft.options.map(option => ({
        ...option,
        label: option.label.trim(),
      })),
      correctOptionId: draft.correctOptionId,
      explanation: draft.explanation.trim(),
    };
    submitted.current = { blockId: part.id, draft: payload };
    pending.current = true;
    setSaving(true);
    setError(null);
    onBusyChange?.(true);
    createQuestion.mutate({ churchId, studyId, blockId: part.id, ...payload });
  };
  const formId = "foundation-study-question-editor";
  const fields = (
    <form
      id={formId}
      className="min-w-0 space-y-4"
      onSubmit={event => {
        event.preventDefault();
        submit();
      }}
    >
      <fieldset disabled={busy} className="min-w-0 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="foundation-question-prompt">Pergunta</Label>
          <p
            id="foundation-question-prompt-help"
            className="text-xs text-muted-foreground"
          >
            Pergunte sobre uma ideia do estudo, com linguagem direta.
          </p>
          <Textarea
            id="foundation-question-prompt"
            aria-describedby="foundation-question-prompt-help"
            value={draft.prompt}
            onChange={event =>
              setDraft(current => ({ ...current, prompt: event.target.value }))
            }
            placeholder="Ex.: Qual atitude ajuda a encorajar uma pessoa?"
            maxLength={4000}
            rows={3}
          />
        </div>
        <fieldset className="min-w-0 space-y-3">
          <legend className="mb-2 text-sm font-medium">
            Alternativas — marque a resposta correta
          </legend>
          {draft.options.map((option, index) => {
            const letter = String.fromCharCode(65 + index);
            return (
              <div
                key={option.id}
                className="min-w-0 space-y-2 rounded-lg border bg-white p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Label htmlFor={`foundation-question-option-${option.id}`}>
                    Alternativa {letter}
                  </Label>
                  <label className="flex min-h-11 cursor-pointer items-center gap-2 text-xs">
                    <input
                      type="radio"
                      name="foundation-question-correct-option"
                      aria-label={`Resposta correta: alternativa ${letter}`}
                      checked={draft.correctOptionId === option.id}
                      onChange={() =>
                        setDraft(current => ({
                          ...current,
                          correctOptionId: option.id,
                        }))
                      }
                      style={{ accentColor: primaryColor }}
                    />
                    Correta
                  </label>
                </div>
                <Input
                  id={`foundation-question-option-${option.id}`}
                  value={option.label}
                  onChange={event =>
                    setDraft(current => ({
                      ...current,
                      options: current.options.map(item =>
                        item.id === option.id
                          ? { ...item, label: event.target.value }
                          : item
                      ),
                    }))
                  }
                  maxLength={500}
                  placeholder="Resposta possível"
                />
                {draft.options.length > MIN_QUESTION_OPTIONS ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    aria-label={`Remover alternativa ${letter}`}
                    onClick={() =>
                      setDraft(current => ({
                        ...current,
                        options: current.options.filter(
                          item => item.id !== option.id
                        ),
                        correctOptionId:
                          current.correctOptionId === option.id
                            ? ""
                            : current.correctOptionId,
                      }))
                    }
                  >
                    Remover alternativa
                  </Button>
                ) : null}
              </div>
            );
          })}
          <Button
            type="button"
            variant="outline"
            className="min-h-11 w-full sm:w-auto"
            disabled={draft.options.length >= MAX_QUESTION_OPTIONS}
            onClick={() => {
              const id = nextQuestionOptionId(draft.options);
              if (id)
                setDraft(current => ({
                  ...current,
                  options: [...current.options, { id, label: "" }],
                }));
            }}
          >
            Adicionar alternativa
          </Button>
          <p className="text-xs text-muted-foreground">
            De duas a seis alternativas. A resposta correta fica protegida para
            o aluno até a tentativa.
          </p>
        </fieldset>
        <div className="space-y-2">
          <Label htmlFor="foundation-question-explanation">
            Explicação depois da resposta
          </Label>
          <p
            id="foundation-question-explanation-help"
            className="text-xs text-muted-foreground"
          >
            Explique o motivo da resposta e indique o que revisar. Evite apenas
            “certo” ou “errado”.
          </p>
          <Textarea
            id="foundation-question-explanation"
            aria-describedby="foundation-question-explanation-help"
            value={draft.explanation}
            onChange={event =>
              setDraft(current => ({
                ...current,
                explanation: event.target.value,
              }))
            }
            placeholder="Ex.: Encorajar fortalece a pessoa. Retome a leitura e pense em uma palavra de apoio que você pode oferecer."
            maxLength={4000}
            rows={4}
          />
        </div>
      </fieldset>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      {busy ? (
        <p role="status" className="text-sm text-muted-foreground">
          Salvando pergunta no servidor…
        </p>
      ) : null}
    </form>
  );
  const actions = (
    <>
      <Button type="button" variant="outline" disabled={busy} onClick={close}>
        Cancelar
      </Button>
      <Button
        type="submit"
        form={formId}
        disabled={busy}
        style={{ backgroundColor: primaryColor, color: "white" }}
      >
        {busy ? "Salvando…" : "Salvar pergunta"}
      </Button>
    </>
  );
  if (inline)
    return open ? (
      <section
        aria-label={`Adicionar pergunta em ${part?.title ?? "Responda"}`}
        aria-busy={busy}
        className="min-w-0 space-y-4 rounded-xl border bg-background p-3 text-foreground"
      >
        <h3 className="font-semibold" style={{ color: primaryColor }}>
          Adicionar pergunta
        </h3>
        {fields}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          {actions}
        </div>
      </section>
    ) : null;
  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        if (!next) close();
      }}
    >
      <AdaptiveFormDialogContent className="sm:max-w-2xl">
        <DialogHeader className={adaptiveFormDialogHeaderClassName}>
          <DialogTitle>Adicionar pergunta</DialogTitle>
          <DialogDescription>
            A pergunta ficará dentro da etapa “{part?.title ?? "selecionada"}” e
            aparecerá ao aluno depois do conteúdo.
          </DialogDescription>
        </DialogHeader>
        <AdaptiveFormDialogBody>{fields}</AdaptiveFormDialogBody>
        <AdaptiveFormDialogFooter>{actions}</AdaptiveFormDialogFooter>
      </AdaptiveFormDialogContent>
    </Dialog>
  );
}
