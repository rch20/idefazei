import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AdaptiveFormDialogFooter } from "@/components/AdaptiveFormDialog";
import { formatCivilDate } from "@/lib/civilDate";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  FileText,
  Library,
  NotebookPen,
  X,
} from "lucide-react";

type PreviewStudy = {
  id: number;
  title: string;
  weekStart?: string | null;
  summary?: string | null;
  content?: string | null;
};

type PreviewBlock = {
  id: number;
  title: string;
  content: string;
  reflectionPrompt?: string | null;
  position: number;
};

type PreviewQuestion = {
  id: number;
  blockId: number;
  prompt: string;
  options: Array<{ id: string; label: string }>;
  correctOptionId: string;
  explanation: string;
};

type PreviewQuestionRow = {
  block: { id: number };
  question: PreviewQuestion;
};

type PreviewMaterial = {
  id: number;
  title: string;
  type: string;
  fileUrl?: string | null;
  description?: string | null;
};

function makeSoftColor(color: string, amount: number, fallback: string) {
  return `color-mix(in srgb, ${color} ${amount}%, ${fallback})`;
}

function StepMarker({
  index,
  active,
  completed,
  primary,
}: {
  index: number;
  active: boolean;
  completed: boolean;
  primary: string;
}) {
  return (
    <span
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold"
      style={
        active || completed
          ? { backgroundColor: primary, borderColor: primary, color: "white" }
          : {
              backgroundColor: "white",
              borderColor: "#d8ddd8",
              color: "#68736c",
            }
      }
    >
      {completed ? <Check className="h-4 w-4" /> : index + 1}
    </span>
  );
}

export function FoundationStudyPreviewDialog({
  churchId,
  study,
  primaryColor,
  secondaryColor,
  open,
  onOpenChange,
}: {
  churchId: number;
  study: PreviewStudy | null;
  primaryColor?: string;
  secondaryColor?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const primary = primaryColor || "#1e3a5f";
  const accent = secondaryColor || "#c9a84c";
  const [selectedBlockIndex, setSelectedBlockIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [checkedAnswers, setCheckedAnswers] = useState<Record<number, boolean>>(
    {}
  );
  const [notes, setNotes] = useState<Record<string, string>>({});

  const { data: blockData = [], isLoading: blocksLoading } =
    trpc.escolaFundamentos.listQuestionBlocks.useQuery(
      { churchId, studyId: study?.id ?? 0 },
      { enabled: open && Boolean(study?.id) }
    );
  const { data: questionData = [], isLoading: questionsLoading } =
    trpc.escolaFundamentos.manageStudyQuestions.useQuery(
      { churchId, studyId: study?.id ?? 0 },
      { enabled: open && Boolean(study?.id) }
    );
  const { data: materialData = [], isLoading: materialsLoading } =
    trpc.escolaFundamentos.listStudyMaterials.useQuery(
      { churchId, studyId: study?.id ?? 0 },
      { enabled: open && Boolean(study?.id) }
    );

  const blocks = blockData as PreviewBlock[];
  const questions = questionData as PreviewQuestionRow[];
  const materials = materialData as PreviewMaterial[];
  const activeBlock = blocks[selectedBlockIndex] ?? null;
  const activeQuestions = useMemo(
    () =>
      questions
        .filter(row => row.block.id === activeBlock?.id)
        .map(row => row.question),
    [activeBlock?.id, questions]
  );
  const isLoading = blocksLoading || questionsLoading || materialsLoading;
  const hasNext = selectedBlockIndex < blocks.length - 1;

  useEffect(() => {
    if (!open) return;
    setSelectedBlockIndex(0);
    setAnswers({});
    setCheckedAnswers({});
    setNotes({});
  }, [open, study?.id]);

  const checkAnswer = (question: PreviewQuestion) => {
    if (!answers[question.id]) return;
    setCheckedAnswers(current => ({ ...current, [question.id]: true }));
  };

  const close = () => onOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-7xl flex-col gap-0 overflow-hidden p-0 sm:max-h-[calc(100dvh-2rem)] sm:w-[calc(100%-2rem)]">
        <DialogHeader className="shrink-0 border-b bg-white px-4 py-4 text-left sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <DialogTitle className="flex items-center gap-2 truncate text-[#1e3a5f]">
                <BookOpen className="h-5 w-5 shrink-0 text-[#c9a84c]" />
                {study?.title || "Prévia do estudo"}
              </DialogTitle>
              <DialogDescription className="mt-1">
                Visualização como aluno. Nada nesta tela cria progresso,
                tentativa ou anotação.
              </DialogDescription>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Fechar prévia"
              onClick={close}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          {study?.weekStart ? (
            <Badge className="mt-3 w-fit" variant="outline">
              Semana de {formatCivilDate(study.weekStart)}
            </Badge>
          ) : null}
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto bg-[#f8f8f5] p-3 sm:p-5">
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 sm:px-4">
            <strong>Modo prévia:</strong> respostas e anotações abaixo ficam
            somente neste navegador e são descartadas ao fechar.
          </div>
          {isLoading ? (
            <div className="h-80 animate-pulse rounded-2xl bg-muted/30" />
          ) : !study ? (
            <div className="rounded-2xl border border-dashed bg-white p-8 text-center text-sm text-muted-foreground">
              Selecione um estudo para abrir a prévia.
            </div>
          ) : (
            <div className="space-y-4">
              <section className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex items-start gap-3">
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white"
                    style={{ backgroundColor: primary }}
                  >
                    <BookOpen className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p
                      className="text-xs font-semibold uppercase tracking-[0.16em]"
                      style={{ color: accent }}
                    >
                      Estudo da semana
                    </p>
                    <h2
                      className="mt-1 text-xl font-bold"
                      style={{ color: primary }}
                    >
                      {study.title}
                    </h2>
                    {study.summary ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {study.summary}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full transition-[width]"
                    style={{
                      width: blocks.length
                        ? `${Math.round(((selectedBlockIndex + 1) / blocks.length) * 100)}%`
                        : "100%",
                      backgroundColor: primary,
                    }}
                  />
                </div>
              </section>

              {study.content?.trim() ? (
                <section className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm sm:p-5">
                  <p
                    className="text-xs font-semibold uppercase tracking-[0.16em]"
                    style={{ color: accent }}
                  >
                    Introdução do estudo
                  </p>
                  <p className="mt-2 whitespace-pre-line text-base leading-8 text-slate-700">
                    {study.content}
                  </p>
                </section>
              ) : null}
              <div className="grid items-start gap-4 lg:grid-cols-[210px_minmax(0,1fr)_250px]">
                <aside className="rounded-2xl border border-black/5 bg-white p-3 shadow-sm">
                  <p className="mb-3 font-semibold" style={{ color: primary }}>
                    Etapas do estudo
                  </p>
                  {blocks.length ? (
                    <div className="grid grid-cols-2 gap-2 lg:grid-cols-1">
                      {blocks.map((block, index) => (
                        <button
                          key={block.id}
                          type="button"
                          className="flex min-w-0 items-center gap-2 rounded-xl p-2 text-left"
                          onClick={() => setSelectedBlockIndex(index)}
                          style={
                            index === selectedBlockIndex
                              ? {
                                  backgroundColor: makeSoftColor(
                                    primary,
                                    8,
                                    "white"
                                  ),
                                  color: primary,
                                }
                              : { color: "#68736c" }
                          }
                        >
                          <StepMarker
                            index={index}
                            active={index === selectedBlockIndex}
                            completed={index < selectedBlockIndex}
                            primary={primary}
                          />
                          <span className="min-w-0 truncate text-sm font-semibold">
                            {block.title}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Este estudo ainda não possui blocos.
                    </p>
                  )}
                </aside>

                <main className="min-w-0 space-y-4">
                  <Card className="border-black/5 shadow-sm">
                    <CardContent className="space-y-4 p-4 sm:p-6">
                      {activeBlock ? (
                        <>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge
                              style={{
                                backgroundColor: accent,
                                color: primary,
                              }}
                            >
                              ETAPA {selectedBlockIndex + 1}
                            </Badge>
                            <Badge variant="outline">Prévia</Badge>
                          </div>
                          <div>
                            <h3
                              className="text-2xl font-bold"
                              style={{ color: primary }}
                            >
                              {activeBlock.title}
                            </h3>
                            <p className="mt-3 whitespace-pre-line text-base leading-8 text-slate-700">
                              {activeBlock.content}
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <Badge
                            style={{ backgroundColor: accent, color: primary }}
                          >
                            APRESENTAÇÃO
                          </Badge>
                          <p className="mt-3 whitespace-pre-line text-base leading-8 text-slate-700">
                            {
                              "As etapas deste estudo aparecerão aqui quando forem cadastradas."
                            }
                          </p>
                        </>
                      )}
                    </CardContent>
                  </Card>
                  {activeQuestions.map(question => {
                    const checked = checkedAnswers[question.id];
                    const correct =
                      answers[question.id] === question.correctOptionId;
                    return (
                      <Card
                        key={question.id}
                        className="border-black/5 shadow-sm"
                      >
                        <CardContent className="space-y-4 p-4 sm:p-6">
                          <div>
                            <p
                              className="text-xs font-semibold uppercase tracking-[0.16em]"
                              style={{ color: accent }}
                            >
                              Responda
                            </p>
                            <p
                              className="mt-1 font-semibold"
                              style={{ color: primary }}
                            >
                              {question.prompt}
                            </p>
                          </div>
                          <div className="grid gap-2">
                            {question.options.map(option => (
                              <button
                                key={option.id}
                                type="button"
                                className="min-h-12 rounded-xl border px-3 py-3 text-left text-sm"
                                onClick={() => {
                                  setAnswers(current => ({
                                    ...current,
                                    [question.id]: option.id,
                                  }));
                                  setCheckedAnswers(current => ({
                                    ...current,
                                    [question.id]: false,
                                  }));
                                }}
                                style={
                                  answers[question.id] === option.id
                                    ? {
                                        borderColor: primary,
                                        backgroundColor: makeSoftColor(
                                          primary,
                                          8,
                                          "white"
                                        ),
                                        color: primary,
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
                          {checked ? (
                            <div
                              className={`rounded-xl p-3 text-sm ${correct ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}
                            >
                              <p className="font-semibold">
                                {correct ? "Resposta correta" : "Vamos revisar"}
                              </p>
                              <p className="mt-1">{question.explanation}</p>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              disabled={!answers[question.id]}
                              onClick={() => checkAnswer(question)}
                            >
                              Conferir resposta
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                  <CompatibilityPreviewStageNotes
                    prompt={activeBlock?.reflectionPrompt}
                    stageTitle={activeBlock?.title}
                    value={notes[String(activeBlock?.id ?? "legacy")] ?? ""}
                    onChange={value =>
                      setNotes(current => ({
                        ...current,
                        [String(activeBlock?.id ?? "legacy")]: value,
                      }))
                    }
                    primaryColor={primary}
                    preview
                  />
                </main>

                <aside className="space-y-4">
                  <section className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
                    <div className="flex items-start gap-3">
                      <Library
                        className="mt-0.5 h-5 w-5 shrink-0"
                        style={{ color: accent }}
                      />
                      <div>
                        <p className="font-semibold" style={{ color: primary }}>
                          Materiais
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Materiais vinculados ao estudo.
                        </p>
                      </div>
                    </div>
                    {materials.length ? (
                      <div className="mt-3 space-y-2">
                        {materials.map(material => (
                          <a
                            key={material.id}
                            href={material.fileUrl ?? undefined}
                            target={material.fileUrl ? "_blank" : undefined}
                            rel={material.fileUrl ? "noreferrer" : undefined}
                            className="flex items-start gap-2 rounded-lg bg-[#fcfbf8] p-2 text-sm"
                            style={{ color: primary }}
                          >
                            <FileText className="mt-0.5 h-4 w-4 shrink-0" />
                            <span className="min-w-0">
                              <span className="block truncate font-medium">
                                {material.title}
                              </span>
                              <span className="block text-xs text-muted-foreground">
                                {material.type}
                              </span>
                            </span>
                          </a>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-muted-foreground">
                        Nenhum material vinculado.
                      </p>
                    )}
                  </section>
                </aside>
              </div>
            </div>
          )}
        </div>

        <AdaptiveFormDialogFooter className="shrink-0 border-t bg-white px-4 py-3 sm:px-6">
          <Button type="button" variant="outline" onClick={close}>
            Fechar prévia
          </Button>
          {blocks.length ? (
            <>
              <Button
                type="button"
                variant="outline"
                disabled={selectedBlockIndex === 0}
                onClick={() =>
                  setSelectedBlockIndex(index => Math.max(0, index - 1))
                }
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Anterior
              </Button>
              <Button
                type="button"
                style={{ backgroundColor: primary, color: "white" }}
                disabled={!hasNext}
                onClick={() =>
                  setSelectedBlockIndex(index =>
                    Math.min(blocks.length - 1, index + 1)
                  )
                }
              >
                {hasNext ? "Próxima etapa" : "Última etapa"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </>
          ) : null}
        </AdaptiveFormDialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CompatibilityPreviewStageNotes({
  prompt,
  stageTitle,
  value,
  onChange,
  primaryColor,
  preview = false,
  isSaving = false,
  disabled = false,
}: {
  prompt?: string | null;
  stageTitle?: string;
  value: string;
  onChange: (value: string) => void;
  primaryColor: string;
  preview?: boolean;
  isSaving?: boolean;
  disabled?: boolean;
}) {
  const id = "foundation-compatibility-preview-note";
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
        className="mt-3 min-h-36 resize-y bg-[#fcfbf8] leading-6"
      />
      <p className="mt-2 text-xs text-muted-foreground" role="status">
        {preview
          ? "Somente prévia: esta anotação não será salva."
          : isSaving
            ? "Salvando…"
            : "Salvo automaticamente"}
      </p>
    </section>
  );
}
