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
  primaryColor = "#1e3a5f",
}: {
  part: FoundationStudyPart;
  questions: StudyQuestion[];
  primaryColor?: string;
}) {
  return (
    <div
      className="mt-3 min-w-0 rounded-lg border bg-background p-3 text-foreground"
      aria-label={`Perguntas da parte ${part.title}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          O aluno verá estas perguntas depois de ler este conteúdo.
        </p>
        <Badge variant="outline">
          {questions.length} pergunta{questions.length === 1 ? "" : "s"}
        </Badge>
      </div>
      <ol className="mt-3 space-y-3">
        {questions.map((question, index) => {
          const correctOption = question.options.find(
            option => option.id === question.correctOptionId
          );
          return (
            <li
              key={question.id}
              className="min-w-0 rounded-lg border bg-muted/20 p-3"
            >
              <p className="text-xs font-semibold text-muted-foreground">
                Pergunta {index + 1}
              </p>
              <p
                className="mt-1 whitespace-pre-line break-words font-medium"
                style={{ color: primaryColor }}
              >
                {question.prompt}
              </p>
              <ol
                className="mt-2 space-y-1 text-sm text-muted-foreground"
                aria-label={`Alternativas da pergunta ${index + 1}`}
              >
                {question.options.map((option, optionIndex) => (
                  <li key={option.id} className="break-words">
                    {String.fromCharCode(65 + optionIndex)}. {option.label}
                  </li>
                ))}
              </ol>
              <details className="mt-3 rounded-lg border bg-background p-3 text-foreground">
                <summary
                  className="min-h-11 cursor-pointer text-sm font-medium"
                  style={{ color: primaryColor }}
                >
                  Ver gabarito e explicação
                </summary>
                <p className="mt-2 break-words text-sm">
                  Resposta correta: {correctOption?.label ?? "não definida"}
                </p>
                <p className="mt-2 whitespace-pre-line break-words text-sm text-muted-foreground">
                  {question.explanation}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Conferência do professor. O aluno recebe a explicação somente
                  após responder.
                </p>
              </details>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
