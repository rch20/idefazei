import { Badge } from "@/components/ui/badge";
import type { FoundationStudyPart } from "./StudyPartEditor";

type StudyQuestion = {
  id: number;
  prompt: string;
  options: Array<{ id: string; label: string }>;
  correctOptionId: string;
  explanation: string;
};

export function StudyPartQuestions({
  part,
  questions,
}: {
  part: FoundationStudyPart;
  questions: StudyQuestion[];
}) {
  return (
    <div
      className="mt-3 rounded-lg border border-[#1e3a5f]/10 bg-white p-3"
      aria-label={`Perguntas da parte ${part.title}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Perguntas desta parte
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            O aluno verá estas perguntas depois de ler este conteúdo.
          </p>
        </div>
        <Badge variant="outline">
          {questions.length} pergunta{questions.length === 1 ? "" : "s"}
        </Badge>
      </div>
      <ol className="mt-3 space-y-2">
        {questions.map((question, index) => {
          const correctOption = question.options.find(
            option => option.id === question.correctOptionId
          );
          return (
            <li
              key={question.id}
              className="rounded-lg border border-slate-200 bg-slate-50/70 p-3"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {index + 1}. Pergunta
              </p>
              <p className="mt-1 font-medium text-[#1e3a5f]">
                {question.prompt}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Resposta correta: {correctOption?.label ?? "não definida"}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
