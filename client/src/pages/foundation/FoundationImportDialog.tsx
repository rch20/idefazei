import { useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  getFoundationImportTemplateVersion,
  uploadFoundationImportPreview,
  type FoundationImportPreview,
  type FoundationImportProblem,
} from "@/lib/foundationImportUpload";
import v2TemplateUrl from "@/documents/foundation/gabarito-escola-fundamentos-v2-vazio.xlsx?url";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const STAGE_NAMES = ["Leia", "Entenda", "Responda", "Aplique"];

function displayValue(value: unknown) {
  if (typeof value === "string" && value.trim()) return value;
  return "Não informado";
}

function problemLocation(problem: FoundationImportProblem) {
  return `${problem.sheet}${problem.row !== null ? `!${problem.row}` : ""}${problem.field ? ` · ${problem.field}` : ""} · ${problem.code}`;
}

function formatExpiry(expiresAt: FoundationImportPreview["expiresAt"]) {
  const date = new Date(expiresAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function FoundationImportDialog({
  courseId,
  courseName,
  onImported,
}: {
  courseId: number;
  courseName: string;
  onImported: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadAttemptRef = useRef(false);
  const confirmationAttemptRef = useRef(0);
  const activeConfirmationRef = useRef<{
    attempt: number;
    draftId: number;
  } | null>(null);
  const activeCancellationRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<FoundationImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [confirmingDraftId, setConfirmingDraftId] = useState<number | null>(
    null
  );

  const confirmMutation = trpc.foundationImport.confirm.useMutation({
    onSuccess: () => {
      const active = activeConfirmationRef.current;
      if (!active || active.draftId !== preview?.draftId) return;
      activeConfirmationRef.current = null;
      setConfirmingDraftId(null);
      toast.success(
        getFoundationImportTemplateVersion(preview) === 2
          ? "Estudo importado como rascunho. Revise e publique na gestão da Escola."
          : "Estudo importado. Revise a publicação na gestão da Escola."
      );
      onImported();
      reset();
      setOpen(false);
    },
    onError: mutationError => {
      if (!activeConfirmationRef.current) return;
      activeConfirmationRef.current = null;
      setConfirmingDraftId(null);
      setError(mutationError.message);
    },
  });

  const cancelMutation = trpc.foundationImport.cancel.useMutation({
    onSuccess: () => {
      if (activeCancellationRef.current === null) return;
      activeCancellationRef.current = null;
      reset();
      setOpen(false);
    },
    onError: mutationError => {
      if (activeCancellationRef.current === null) return;
      activeCancellationRef.current = null;
      setError(mutationError.message);
    },
  });

  function reset() {
    setFile(null);
    setPreview(null);
    setError(null);
    setConfirmingDraftId(null);
    uploadAttemptRef.current = false;
    if (inputRef.current) inputRef.current.value = "";
  }

  const problems = preview?.summary.problems ?? [];
  const hasErrors = Boolean(
    preview?.summary.errors ||
      problems.some(problem => problem.severity === "erro")
  );
  const isConfirmPending =
    confirmingDraftId !== null ||
    confirmMutation.isPending ||
    activeConfirmationRef.current !== null;
  const isBusy =
    isUploading ||
    isConfirmPending ||
    cancelMutation.isPending ||
    activeCancellationRef.current !== null;
  const detectedVersion = preview
    ? getFoundationImportTemplateVersion(preview)
    : null;
  const expiry = preview ? formatExpiry(preview.expiresAt) : null;

  async function handleUpload() {
    if (!file || isBusy || uploadAttemptRef.current) return;
    uploadAttemptRef.current = true;
    setError(null);
    setIsUploading(true);
    try {
      const result = await uploadFoundationImportPreview(file, courseId);
      setPreview(result);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Não foi possível validar o gabarito."
      );
    } finally {
      uploadAttemptRef.current = false;
      setIsUploading(false);
    }
  }

  function handleConfirm() {
    const currentPreview = preview;
    if (
      !currentPreview ||
      hasErrors ||
      isConfirmPending ||
      isBusy ||
      activeConfirmationRef.current !== null
    )
      return;

    // A ref é atualizada antes de chamar mutate: dois cliques no mesmo tick
    // compartilham o mesmo render, mas nunca o mesmo pedido de confirmação.
    const attempt = confirmationAttemptRef.current + 1;
    confirmationAttemptRef.current = attempt;
    activeConfirmationRef.current = {
      attempt,
      draftId: currentPreview.draftId,
    };
    setConfirmingDraftId(currentPreview.draftId);
    setError(null);
    try {
      confirmMutation.mutate({ draftId: currentPreview.draftId });
    } catch (mutationError) {
      if (activeConfirmationRef.current?.attempt !== attempt) return;
      activeConfirmationRef.current = null;
      setConfirmingDraftId(null);
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Não foi possível confirmar a importação."
      );
    }
  }

  function handleDiscard() {
    const currentPreview = preview;
    if (!currentPreview || isBusy) return;
    activeCancellationRef.current = currentPreview.draftId;
    setError(null);
    try {
      cancelMutation.mutate({
        draftId: currentPreview.draftId,
      });
    } catch (mutationError) {
      activeCancellationRef.current = null;
      setError(
        mutationError instanceof Error
          ? mutationError.message
          : "Não foi possível descartar a prévia."
      );
    }
  }

  function handleChooseAnother() {
    if (isBusy) return;
    setPreview(null);
    setFile(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <Dialog
      open={open}
      onOpenChange={nextOpen => {
        if (!nextOpen && isBusy) return;
        setOpen(nextOpen);
        if (!nextOpen) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={isBusy}
          className="border-[#c9a84c] text-[#1e3a5f]"
        >
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Importar gabarito Excel
        </Button>
      </DialogTrigger>
      <DialogContent
        className="max-h-[90vh] max-w-[calc(100%-1.5rem)] grid-cols-[minmax(0,1fr)] overflow-hidden p-0 sm:max-w-3xl"
        onPointerDownOutside={event => {
          if (isBusy) event.preventDefault();
        }}
        onInteractOutside={event => {
          if (isBusy) event.preventDefault();
        }}
      >
        <DialogHeader className="border-b bg-[#fdfaf1] px-5 py-4 sm:px-6">
          <DialogTitle className="flex items-center gap-2 text-[#1e3a5f]">
            <FileSpreadsheet className="h-5 w-5 text-[#c9a84c]" />
            Importar estudo para {courseName}
          </DialogTitle>
          <DialogDescription>
            Envie o gabarito, revise a prévia e confirme somente quando o
            conteúdo estiver correto. O upload não grava o estudo.
          </DialogDescription>
        </DialogHeader>

        <div className="min-w-0 max-h-[calc(90vh-5rem)] space-y-4 overflow-y-auto break-words px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Badge variant={!preview ? "default" : "secondary"}>
              1. Enviar
            </Badge>
            <span>→</span>
            <Badge variant={preview ? "default" : "secondary"}>
              2. Revisar
            </Badge>
            <span>→</span>
            <Badge variant={preview && !hasErrors ? "default" : "secondary"}>
              3. Confirmar
            </Badge>
          </div>

          {error ? (
            <div
              role="alert"
              className="flex gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          {!preview ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-[#c9a84c]/25 bg-[#fdfaf1] p-4">
                <p className="font-semibold text-[#1e3a5f]">
                  Preencha o modelo oficial
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  A v2 tem quatro etapas, reflexão opcional e de duas a seis
                  alternativas. O upload prepara apenas uma prévia.
                </p>
                <div className="mt-3 flex flex-col gap-2 text-sm font-semibold sm:flex-row sm:flex-wrap sm:gap-x-5">
                  <a
                    href={v2TemplateUrl}
                    download
                    className="inline-flex items-center text-[#1e3a5f] hover:text-[#c9a84c]"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Baixar modelo v2 (.xlsx)
                  </a>
                  <a
                    href="/gabarito-fundamentos-template.xlsx"
                    download
                    className="inline-flex items-center text-[#1e3a5f] hover:text-[#c9a84c]"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Baixar modelo legado (compatibilidade) (.xlsx)
                  </a>
                </div>
              </div>

              <label
                className={`flex min-h-28 flex-col items-center justify-center rounded-xl border-2 border-dashed bg-white px-4 text-center ${isBusy ? "cursor-not-allowed opacity-60" : "cursor-pointer border-[#1e3a5f]/20 hover:border-[#c9a84c]"}`}
                htmlFor="foundation-import-file"
              >
                <Upload className="mb-2 h-6 w-6 text-[#c9a84c]" />
                <span className="text-sm font-semibold text-[#1e3a5f]">
                  Escolher arquivo .xlsx
                </span>
                <span className="mt-1 text-xs text-muted-foreground">
                  Máximo de 2 MB, sem macros
                </span>
                <input
                  ref={inputRef}
                  id="foundation-import-file"
                  className="sr-only"
                  type="file"
                  accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                  disabled={isBusy}
                  onChange={event => {
                    if (isBusy) return;
                    setFile(event.target.files?.[0] ?? null);
                    setError(null);
                  }}
                />
              </label>
              {file ? (
                <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3 text-sm">
                  <span className="min-w-0 truncate font-medium text-[#1e3a5f]">
                    {file.name}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(0)} KB
                  </span>
                </div>
              ) : null}
              <Button
                type="button"
                className="w-full bg-[#1e3a5f] text-white"
                disabled={!file || isBusy}
                onClick={handleUpload}
              >
                {isUploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 h-4 w-4" />
                )}
                {isUploading ? "Validando…" : "Validar e gerar prévia"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#1e3a5f]/15 bg-[#fdfaf1] p-4">
                <div>
                  <p className="font-semibold text-[#1e3a5f]">
                    Modelo detectado:{" "}
                    {detectedVersion === 2 ? "v2" : "legado (v1)"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Arquivo: {preview.sourceFilename}
                  </p>
                  {expiry ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Prévia disponível até {expiry}.
                    </p>
                  ) : null}
                </div>
                <Badge
                  variant={detectedVersion === 2 ? "default" : "secondary"}
                >
                  {detectedVersion === 2 ? "Rascunho" : "Compatibilidade"}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-lg border bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">Blocos</p>
                  <p className="text-xl font-semibold text-[#1e3a5f]">
                    {preview.summary.counts.blocks}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">Perguntas</p>
                  <p className="text-xl font-semibold text-[#1e3a5f]">
                    {preview.summary.counts.questions}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">Materiais</p>
                  <p className="text-xl font-semibold text-[#1e3a5f]">
                    {preview.summary.counts.materials}
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/20 p-3">
                  <p className="text-xs text-muted-foreground">Aula</p>
                  <p className="text-xl font-semibold text-[#1e3a5f]">
                    {preview.summary.classIncluded ? "Sim" : "Não"}
                  </p>
                </div>
              </div>

              <section
                aria-labelledby="foundation-import-study-preview"
                className="rounded-xl border border-[#1e3a5f]/15 bg-white p-4"
              >
                <h3
                  id="foundation-import-study-preview"
                  className="font-semibold text-[#1e3a5f]"
                >
                  Prévia real do estudo
                </h3>
                <div className="mt-3 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Título
                    </p>
                    <p className="mt-1 break-words font-medium">
                      {displayValue(preview.payload.study.title)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Início da semana
                    </p>
                    <p className="mt-1 break-words">
                      {displayValue(preview.payload.study.weekStart)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Módulo
                    </p>
                    <p className="mt-1 break-words">
                      {displayValue(preview.payload.study.moduleTitle)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Turma
                    </p>
                    <p className="mt-1 break-words">
                      {displayValue(preview.payload.courseName || courseName)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Resumo / objetivo
                    </p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm">
                      {displayValue(preview.payload.study.summary)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Introdução / roteiro
                    </p>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm">
                      {displayValue(preview.payload.study.content)}
                    </p>
                  </div>
                </div>
                {detectedVersion === 1 ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    A confirmação criará somente o estudo e seus conteúdos.
                    Nenhuma presença ou progresso será alterado.
                  </p>
                ) : null}
                {detectedVersion === 2 ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Este estudo v2 será sempre importado como rascunho. As
                    etapas e perguntas só ficam ativas dentro desse rascunho,
                    para revisão antes da publicação.
                  </p>
                ) : null}
              </section>

              {detectedVersion === 2 ? (
                <section
                  aria-labelledby="foundation-import-stages"
                  className="space-y-3"
                >
                  <div>
                    <h3
                      id="foundation-import-stages"
                      className="font-semibold text-[#1e3a5f]"
                    >
                      Quatro etapas
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Conteúdo e reflexão são mostrados como vieram do Excel;
                      campos opcionais vazios não são inventados.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {STAGE_NAMES.map((stageName, index) => {
                      const block =
                        preview.payload.blocks.find(
                          item => item.position === index
                        ) ?? preview.payload.blocks[index];
                      const blockQuestions = preview.payload.questions.filter(
                        question =>
                          typeof question.blockPosition === "number"
                            ? question.blockPosition === index
                            : question.blockTitle === block?.title
                      );
                      return (
                        <article
                          key={`${stageName}-${block?.position ?? index}`}
                          className="rounded-xl border border-[#1e3a5f]/15 bg-white p-4"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-semibold text-[#1e3a5f]">
                              {stageName}
                            </h4>
                            <span className="text-xs text-muted-foreground">
                              Etapa {index + 1}
                            </span>
                          </div>
                          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Título
                          </p>
                          <p className="mt-1 break-words text-sm">
                            {displayValue(block?.title)}
                          </p>
                          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Conteúdo
                          </p>
                          <p className="mt-1 whitespace-pre-wrap break-words text-sm">
                            {displayValue(block?.content)}
                          </p>
                          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                            Para refletir
                          </p>
                          <p className="mt-1 whitespace-pre-wrap break-words text-sm">
                            {displayValue(block?.reflectionPrompt)}
                          </p>
                          {blockQuestions.length ? (
                            <div className="mt-4 space-y-3 border-t pt-3">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Perguntas e alternativas
                              </p>
                              {blockQuestions.map((question, questionIndex) => (
                                <div
                                  key={`${question.prompt}-${questionIndex}`}
                                  className="rounded-lg bg-slate-50 p-3 text-sm"
                                >
                                  <p className="font-medium">
                                    {displayValue(question.prompt)}
                                  </p>
                                  {question.options?.length ? (
                                    <ul className="mt-2 space-y-1 pl-4">
                                      {question.options.map(option => (
                                        <li
                                          key={option.id}
                                          className="break-words"
                                        >
                                          {option.id.toUpperCase()}.{" "}
                                          {displayValue(option.label)}
                                        </li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p className="mt-2 text-muted-foreground">
                                      Alternativas: Não informado
                                    </p>
                                  )}
                                  <p className="mt-2 font-semibold text-[#1e3a5f]">
                                    Resposta correta:{" "}
                                    {(() => {
                                      const correctOption =
                                        question.options?.find(
                                          option =>
                                            option.id ===
                                            question.correctOptionId
                                        );
                                      return correctOption
                                        ? `${correctOption.id.toUpperCase()} — ${correctOption.label}`
                                        : displayValue(undefined);
                                    })()}
                                  </p>
                                  <p className="mt-1 whitespace-pre-wrap break-words text-muted-foreground">
                                    Explicação:{" "}
                                    {displayValue(question.explanation)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>
                </section>
              ) : (
                <section
                  aria-labelledby="foundation-import-legacy-content"
                  className="space-y-3"
                >
                  <h3
                    id="foundation-import-legacy-content"
                    className="font-semibold text-[#1e3a5f]"
                  >
                    Conteúdo importado
                  </h3>
                  {preview.payload.blocks.length ? (
                    preview.payload.blocks.map(block => (
                      <div
                        key={`${block.position}-${block.title}`}
                        className="rounded-lg border bg-white p-3"
                      >
                        <p className="font-semibold text-[#1e3a5f]">
                          {displayValue(block.title)}
                        </p>
                        <p className="mt-1 whitespace-pre-wrap break-words text-sm">
                          {displayValue(block.content)}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-lg border bg-slate-50 p-3 text-sm text-muted-foreground">
                      Nenhum bloco informado.
                    </div>
                  )}
                </section>
              )}

              {problems.length ? (
                <section
                  aria-labelledby="foundation-import-problems"
                  className="space-y-2"
                >
                  <h3
                    id="foundation-import-problems"
                    className="font-semibold text-[#1e3a5f]"
                  >
                    Problemas encontrados
                  </h3>
                  {problems.map((problem, index) => (
                    <div
                      key={`${problem.code}-${problem.row}-${problem.field}-${index}`}
                      className={`rounded-lg border px-3 py-2 text-sm ${problem.severity === "erro" ? "border-rose-200 bg-rose-50 text-rose-900" : "border-amber-200 bg-amber-50 text-amber-900"}`}
                    >
                      <p className="font-semibold">
                        {problemLocation(problem)} · {problem.severity}
                      </p>
                      <p className="mt-1">{problem.message}</p>
                    </div>
                  ))}
                  {hasErrors ? (
                    <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-900">
                      Corrija os campos indicados no Excel e envie o arquivo
                      novamente. A prévia não oferece um editor paralelo e a
                      confirmação está bloqueada enquanto houver erro.
                    </p>
                  ) : null}
                </section>
              ) : (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                  Nenhum erro encontrado. A prévia está pronta para confirmação.
                </div>
              )}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isBusy}
                  onClick={handleDiscard}
                >
                  Descartar prévia
                </Button>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isBusy}
                    onClick={handleChooseAnother}
                  >
                    Escolher outro arquivo
                  </Button>
                  <Button
                    type="button"
                    className="bg-[#1e3a5f] text-white"
                    disabled={hasErrors || isBusy}
                    onClick={handleConfirm}
                  >
                    {isConfirmPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                    )}
                    {isConfirmPending
                      ? "Confirmando…"
                      : detectedVersion === 2
                        ? "Importar como rascunho"
                        : "Confirmar importação"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
