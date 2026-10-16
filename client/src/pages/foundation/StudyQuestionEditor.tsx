import { useEffect, useRef, useState } from "react";
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
import {
  beginFoundationCreation,
  confirmAndClearFoundationCreation,
  fetchFoundationCreationStatus,
  findFoundationCreation,
  foundationCreationDiscriminator,
  foundationCreationErrorMessage,
  foundationCreationRequest,
  FOUNDATION_CREATION_AUTH_ERROR_MESSAGE,
  FOUNDATION_CREATION_CONFLICT_MESSAGE,
  isFoundationCreationConflict,
  updateFoundationCreation,
  useFoundationCreationScope,
  type FoundationCreationRecord,
  type FoundationQuestionCreationSnapshot,
} from "./foundationCreationOutbox";

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
  creationAccountId,
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
  /** Harnesses may provide a known account identity; never defaults globally. */
  creationAccountId?: number;
}) {
  const utils = trpc.useUtils();
  const creationScope = useFoundationCreationScope(churchId, creationAccountId);
  const [draft, setDraft] = useState<StudyQuestionDraft>(initialDraft);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const pending = useRef(false);
  const submitted = useRef<{
    blockId: number;
    draft: StudyQuestionDraft;
  } | null>(null);
  const creationRecord = useRef<FoundationCreationRecord | null>(null);
  const finish = () => {
    pending.current = false;
    setSaving(false);
    onBusyChange?.(false);
  };
  const reset = () => {
    setDraft(initialDraft());
    setError(null);
    submitted.current = null;
    creationRecord.current = null;
  };

  useEffect(() => {
    if (!open || !part || !studyId || !creationScope) return;
    let active = true;
    void findFoundationCreation(
      creationScope,
      "question",
      foundationCreationDiscriminator("question", {
        studyId,
        blockId: part.id,
      })
    )
      .then(record => {
        if (!active || !record) return;
        creationRecord.current = record;
        const snapshot = record.snapshot as FoundationQuestionCreationSnapshot;
        setDraft({
          prompt: snapshot.prompt,
          options: snapshot.options.map(option => ({ ...option })),
          correctOptionId: snapshot.correctOptionId,
          explanation: snapshot.explanation,
        });
        setError(
          record.state === "conflict"
            ? FOUNDATION_CREATION_CONFLICT_MESSAGE
            : "Há uma tentativa de pergunta pendente. Verifique o salvamento ou repita a mesma tentativa."
        );
      })
      .catch(error => {
        if (active) setError(foundationCreationErrorMessage(error));
      });
    return () => {
      active = false;
    };
  }, [
    creationScope?.accountId,
    creationScope?.churchId,
    open,
    part?.id,
    studyId,
  ]);

  const revalidateConfirmedQuestion = async (id: number) => {
    const query = (
      utils.escolaFundamentos as unknown as {
        manageStudyQuestions?: {
          fetch?: (input: {
            churchId: number;
            studyId: number;
          }) => Promise<unknown>;
          invalidate?: (input: {
            churchId: number;
            studyId: number;
          }) => Promise<unknown>;
        };
      }
    ).manageStudyQuestions;
    let rows: unknown;
    if (query?.fetch) {
      await query.invalidate?.({ churchId, studyId });
      rows = await query.fetch({ churchId, studyId });
    } else if (query?.invalidate) {
      await query.invalidate({ churchId, studyId });
    }
    if (!Array.isArray(rows)) return;
    const row = rows.find(candidate => {
      const item = candidate as { question?: { id?: unknown } };
      return item.question?.id === id;
    }) as ConfirmedStudyQuestion | undefined;
    if (row) onCreated?.(row);
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
        const confirmedId = data.id;
        const record = creationRecord.current;
        void (
          record
            ? confirmAndClearFoundationCreation(record, confirmedId).catch(
                () => undefined
              )
            : Promise.resolve()
        ).then(async () => {
          if (data.replayed) {
            await revalidateConfirmedQuestion(confirmedId).catch(
              () => undefined
            );
          } else {
            onCreated?.({
              block: { id: attempt.blockId },
              question: { ...attempt.draft, id: confirmedId },
            });
            void utils.escolaFundamentos.manageStudyQuestions
              .invalidate({ churchId, studyId })
              .catch(() => undefined);
          }
          finish();
          reset();
          onOpenChange(false);
          toast.success("Pergunta criada nesta etapa.");
        });
      },
      onError: error => {
        const record = creationRecord.current;
        if (record) {
          void updateFoundationCreation(
            record,
            isFoundationCreationConflict(error) ? "conflict" : "unknown"
          )
            .then(next => {
              creationRecord.current = next;
            })
            .catch(() => undefined);
        }
        finish();
        setError(foundationCreationErrorMessage(error));
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
    const payload: FoundationQuestionCreationSnapshot = {
      churchId,
      studyId,
      blockId: part.id,
      prompt: draft.prompt.trim(),
      options: draft.options.map(option => ({
        ...option,
        label: option.label.trim(),
      })),
      correctOptionId: draft.correctOptionId,
      explanation: draft.explanation.trim(),
    };
    pending.current = true;
    setSaving(true);
    setError(null);
    onBusyChange?.(true);
    if (!creationScope) {
      finish();
      setError(FOUNDATION_CREATION_AUTH_ERROR_MESSAGE);
      return;
    }
    void beginFoundationCreation(
      creationScope,
      "question",
      foundationCreationDiscriminator("question", {
        studyId,
        blockId: part.id,
      }),
      payload
    )
      .then(record => {
        creationRecord.current = record;
        const snapshot = record.snapshot as FoundationQuestionCreationSnapshot;
        submitted.current = {
          blockId: snapshot.blockId,
          draft: {
            prompt: snapshot.prompt,
            options: snapshot.options.map(option => ({ ...option })),
            correctOptionId: snapshot.correctOptionId,
            explanation: snapshot.explanation,
          },
        };
        createQuestion.mutate(foundationCreationRequest(record) as never);
      })
      .catch(error => {
        finish();
        setError(foundationCreationErrorMessage(error));
      });
  };

  const verifyQuestionCreation = () => {
    if (!creationScope || !part || !studyId) {
      setError(FOUNDATION_CREATION_AUTH_ERROR_MESSAGE);
      return;
    }
    void (async () => {
      const record =
        creationRecord.current ??
        (await findFoundationCreation(
          creationScope,
          "question",
          foundationCreationDiscriminator("question", {
            studyId,
            blockId: part.id,
          })
        ));
      if (!record) {
        setError(
          "Nenhuma tentativa pendente foi encontrada; não foi criada uma nova chave."
        );
        return;
      }
      creationRecord.current = record;
      try {
        const status = await fetchFoundationCreationStatus(utils, {
          churchId,
          operation: "question",
          clientRequestId: record.clientRequestId,
        });
        if (status.status !== "confirmed" || status.id <= 0) {
          await updateFoundationCreation(record, "unknown");
          setError(
            "O salvamento ainda não foi localizado. Não gere outra chave; tente verificar novamente."
          );
          return;
        }
        await confirmAndClearFoundationCreation(record, status.id);
        await revalidateConfirmedQuestion(status.id).catch(() => undefined);
        finish();
        reset();
        onOpenChange(false);
        toast.success("Pergunta criada nesta etapa.");
      } catch (error) {
        setError(foundationCreationErrorMessage(error));
      }
    })();
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
      <fieldset
        disabled={busy || Boolean(creationRecord.current && error)}
        className="min-w-0 space-y-4"
      >
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
      {creationRecord.current && error && !busy ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={verifyQuestionCreation}
          >
            Verificar salvamento
          </Button>
          <Button type="button" variant="outline" onClick={submit}>
            Repetir mesma tentativa
          </Button>
        </div>
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
