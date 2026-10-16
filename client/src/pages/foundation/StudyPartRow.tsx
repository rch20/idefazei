import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp, Pencil, Plus } from "lucide-react";
import type { ReactNode } from "react";
import type { FoundationStudyPart } from "./StudyPartEditor";
import { getFoundationStageLabel } from "./studyStage";

export function StudyPartRow({
  part,
  index,
  total,
  questionCount,
  questionsLoading,
  questionsOpen,
  canManage,
  isMoving,
  onEdit,
  onAddQuestion,
  onToggleQuestions,
  onMove,
  children,
}: {
  part: FoundationStudyPart;
  index: number;
  total: number;
  questionCount: number;
  questionsLoading: boolean;
  questionsOpen: boolean;
  canManage: boolean;
  isMoving: boolean;
  onEdit: (part: FoundationStudyPart) => void;
  onAddQuestion: (part: FoundationStudyPart) => void;
  onToggleQuestions: () => void;
  onMove: (direction: "up" | "down") => void;
  children?: ReactNode;
}) {
  return (
    <li className="rounded-lg border border-[#1e3a5f]/10 bg-[#fdfaf1]/70 px-3 py-3">
      <div className="flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#1e3a5f] text-xs font-bold text-white">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="text-[10px] uppercase">
                  {getFoundationStageLabel(part.title, index)}
                </Badge>
                <p className="font-medium text-[#1e3a5f]">{part.title}</p>
              </div>
              <p className="mt-1 line-clamp-2 whitespace-pre-line text-sm text-muted-foreground">
                {part.content}
              </p>
            </div>
            {!part.active ? <Badge variant="secondary">Oculta</Badge> : null}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>
              {questionsLoading
                ? "Contando perguntas…"
                : `${questionCount} pergunta${questionCount === 1 ? "" : "s"}`}
            </span>
            <span aria-hidden="true">·</span>
            <span>{part.content.trim() ? "Com conteúdo" : "Sem conteúdo"}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {canManage ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-9 gap-1.5"
                onClick={() => onAddQuestion(part)}
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar pergunta
              </Button>
            ) : null}
            {!questionsLoading && questionCount > 0 ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-9 px-2 text-xs text-[#1e3a5f]"
                aria-expanded={questionsOpen}
                onClick={onToggleQuestions}
              >
                {questionsOpen
                  ? "Ocultar perguntas"
                  : "Ver perguntas desta etapa"}
              </Button>
            ) : null}
          </div>
          {canManage ? (
            <div className="mt-3 flex flex-wrap gap-2 border-t border-[#1e3a5f]/10 pt-3">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-9 gap-1.5"
                onClick={() => onEdit(part)}
              >
                <Pencil className="h-3.5 w-3.5" />
                Editar etapa
              </Button>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-9 w-9"
                disabled={index === 0 || isMoving}
                onClick={() => onMove("up")}
                aria-label={`Mover ${part.title} acima`}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-9 w-9"
                disabled={index === total - 1 || isMoving}
                onClick={() => onMove("down")}
                aria-label={`Mover ${part.title} abaixo`}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </div>
      </div>
      {children}
    </li>
  );
}
