import { useEffect, useState } from "react";
import { CheckCircle2, CircleAlert, XCircle } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AdaptiveFormDialogBody,
  AdaptiveFormDialogContent,
  AdaptiveFormDialogFooter,
  adaptiveFormDialogHeaderClassName,
} from "@/components/AdaptiveFormDialog";

export type StudentRecordStudy = {
  id: number;
  title: string;
  weekStart: string | null;
  status: string | null;
  reviewStatus: string | null;
};

type ReviewStatus = "compreendeu" | "precisa_reforco" | "nao_participou";

const REVIEW_OPTIONS: Array<{ value: ReviewStatus; label: string }> = [
  { value: "compreendeu", label: "Compreendeu" },
  { value: "precisa_reforco", label: "Precisa de reforço" },
  { value: "nao_participou", label: "Não participou" },
];

function statusLabel(status: string | null) {
  return status === "concluida" ? "Concluído" : status === "em_andamento" ? "Em andamento" : "Não iniciado";
}

export function FoundationStudentRecord({
  churchId,
  courseId,
  enrollmentId,
  studentName,
  studies,
  initialStudyId,
  onClose,
}: {
  churchId: number;
  courseId: number;
  enrollmentId: number;
  studentName: string;
  studies: StudentRecordStudy[];
  initialStudyId?: number | null;
  onClose: () => void;
}) {
  const utils = trpc.useUtils();
  const [studyId, setStudyId] = useState<number>(initialStudyId ?? studies[0]?.id ?? 0);
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>("compreendeu");
  const [reviewNotes, setReviewNotes] = useState("");
  const detail = trpc.escolaFundamentos.studentStudyDetail.useQuery(
    { churchId, enrollmentId, studyId },
    { enabled: studyId > 0 }
  );
  const review = trpc.escolaFundamentos.reviewLesson.useMutation({
    onSuccess: async () => {
      toast.success("Avaliação registrada.");
      await Promise.all([
        utils.escolaFundamentos.courseProgress.invalidate({ churchId, courseId }),
        detail.refetch(),
      ]);
    },
    onError: (error) => toast.error(error.message),
  });
  const progress = detail.data?.progress ?? null;
  useEffect(() => {
    const saved = progress?.reviewStatus;
    setReviewStatus(saved && saved !== "pendente" ? (saved as ReviewStatus) : "compreendeu");
    setReviewNotes(progress?.reviewNotes ?? "");
  }, [studyId, progress?.id, progress?.reviewStatus, progress?.reviewNotes]);

  const blocks = detail.data?.blocks ?? [];
  const wrongQuestions = blocks.flatMap((block) => block.questions).filter((question) => question.attempts.length > 0 && question.attempts.some((attempt) => !attempt.isCorrect)).length;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <AdaptiveFormDialogContent className="sm:max-w-2xl">
        <div className={adaptiveFormDialogHeaderClassName}>
          <DialogTitle className="font-display text-[#1e3a5f]">{studentName}</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-muted-foreground">
            Veja o que o aluno respondeu e anotou em cada estudo e registre a sua avaliação.
          </DialogDescription>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Estudos">
            {studies.map((study) => (
              <button
                key={study.id}
                type="button"
                aria-current={study.id === studyId ? "true" : undefined}
                onClick={() => setStudyId(study.id)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${study.id === studyId ? "border-[#1e3a5f] bg-[#1e3a5f] text-white" : "border-border bg-white text-[#1e3a5f]"}`}
              >
                {study.title}
              </button>
            ))}
          </div>
        </div>
        <AdaptiveFormDialogBody className="space-y-4" style={{ backgroundColor: "#f8f8f5" }}>
          {detail.isLoading ? (
            <div className="h-40 animate-pulse rounded-xl bg-muted/30" />
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <Badge variant={progress?.status === "concluida" ? "default" : "secondary"}>{statusLabel(progress?.status ?? null)}</Badge>
                {wrongQuestions > 0 ? (
                  <span className="inline-flex items-center gap-1 font-medium text-amber-700"><CircleAlert className="h-4 w-4" />{wrongQuestions} {wrongQuestions === 1 ? "pergunta com erro" : "perguntas com erro"}</span>
                ) : null}
              </div>
              {progress?.reflection?.trim() ? (
                <div className="rounded-xl border border-black/5 bg-white p-4">
                  <p className="mb-1 text-sm font-semibold text-[#1e3a5f]">Anotação geral</p>
                  <p className="whitespace-pre-line text-sm leading-6 text-slate-700">{progress.reflection}</p>
                </div>
              ) : null}
              {blocks.length === 0 ? (
                <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Este estudo ainda não tem etapas cadastradas.</p>
              ) : (
                blocks.map((block) => (
                  <section key={block.id} className="rounded-xl border border-black/5 bg-white p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-display text-base text-[#1e3a5f]">{block.position + 1}. {block.title}</h3>
                      <Badge variant={block.status === "concluida" ? "default" : "outline"} className="shrink-0">{block.status === "concluida" ? "Concluída" : block.status === "em_andamento" ? "Em andamento" : "Não iniciada"}</Badge>
                    </div>
                    {block.reflection?.trim() ? (
                      <div className="mt-3 rounded-lg bg-[#fcfbf8] p-3">
                        {block.reflectionPrompt?.trim() ? <p className="mb-1 text-xs text-muted-foreground">{block.reflectionPrompt}</p> : null}
                        <p className="whitespace-pre-line text-sm leading-6 text-slate-700">{block.reflection}</p>
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">Sem anotação nesta etapa.</p>
                    )}
                    {block.questions.length > 0 ? (
                      <ul className="mt-3 space-y-2">
                        {block.questions.map((question) => {
                          const last = question.attempts[question.attempts.length - 1];
                          return (
                            <li key={question.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                              <p className="font-medium text-[#1e3a5f]">{question.prompt}</p>
                              {last ? (
                                <p className={`mt-1 flex items-start gap-1.5 ${last.isCorrect ? "text-emerald-700" : "text-rose-700"}`}>
                                  {last.isCorrect ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0" />}
                                  <span>{last.selectedText}{question.attempts.length > 1 ? ` · ${question.attempts.length} tentativas` : ""}</span>
                                </p>
                              ) : (
                                <p className="mt-1 text-muted-foreground">Ainda não respondeu.</p>
                              )}
                              {last && !last.isCorrect ? <p className="mt-1 text-xs text-muted-foreground">Resposta correta: {question.correctText}</p> : null}
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                  </section>
                ))
              )}
              <section className="rounded-xl border border-[#1e3a5f]/20 bg-white p-4">
                <Label className="text-sm font-semibold text-[#1e3a5f]">Avaliação do professor</Label>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {REVIEW_OPTIONS.map((option) => (
                    <Button key={option.value} type="button" variant={reviewStatus === option.value ? "default" : "outline"} onClick={() => setReviewStatus(option.value)}>{option.label}</Button>
                  ))}
                </div>
                <Label htmlFor="student-record-notes" className="mt-3 block text-sm">Observação</Label>
                <Textarea id="student-record-notes" className="mt-1" rows={3} maxLength={2000} value={reviewNotes} onChange={(event) => setReviewNotes(event.target.value)} placeholder="Registre uma observação sobre a conversa…" />
              </section>
            </>
          )}
        </AdaptiveFormDialogBody>
        <AdaptiveFormDialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Fechar</Button>
          <Button
            type="button"
            className="bg-[#1e3a5f] text-white"
            disabled={review.isPending || studyId <= 0}
            onClick={() => review.mutate({ churchId, enrollmentId, studyId, reviewStatus, reviewNotes: reviewNotes.trim() || null })}
          >
            {review.isPending ? "Salvando…" : "Salvar avaliação"}
          </Button>
        </AdaptiveFormDialogFooter>
      </AdaptiveFormDialogContent>
    </Dialog>
  );
}
